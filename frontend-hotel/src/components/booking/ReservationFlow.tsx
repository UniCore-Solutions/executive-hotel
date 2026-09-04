'use client';

/* My reservation — lookup by ref+email, status banner, stay details, price,
   cancellation via backend GraphQL, check-in CTA. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useModal } from '@/context/ModalContext';
import { useSession } from '@/context/SessionContext';
import { useApollo } from '@/api/apollo/provider';
import { REST_INVALIDATIONS, invalidateGraphql } from '@/api/invalidation';
import { reservations, type BackendReservation } from '@/services/reservations';
import { getExtras } from '@/services/extras';
import {
  downloadCreditNotePdf,
  downloadInvoicePdf,
  requestReservationLookupOtp,
  verifyReservationLookupOtp,
} from '@/api/rest/endpoints';
import { ApiError } from '@/api/rest/client';
import { downloadBytes } from '@/lib/download';
import { buildIcs } from '@/lib/ics';
import { fmt, fromISODate, inStayWindow } from '@/lib/dates';
import { fmtPrice } from '@/lib/format';
import { image, IMG_FALLBACK } from '@/services/availability';
import { getHotelById } from '@/services/catalog';
import { QuoteTable } from '@/components/ui/QuoteTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QR } from '@/components/ui/QR';
import type { CurrencyCode, Extra, PriceBreakdown } from '@/types';

const STATUS_META: Record<string, string> = {
  confirmed: 'Confirmed — your stay is locked in. We look forward to welcoming you.',
  checked_in: 'Checked in — welcome to the hotel! Your room is ready from 15:00.',
  cancelled: 'Cancelled — this reservation is no longer active.',
};

function derivePrice(br: BackendReservation): PriceBreakdown {
  const firstLine = br.roomLines[0];
  const perNight = firstLine?.ratePerNight ?? 0;
  const nights = firstLine?.nights ?? 1;
  const rooms = br.roomLines.length;
  const roomSubtotal = br.roomLines.reduce((sum, l) => sum + l.subtotalAmount, 0);
  const extrasTotal = br.extras.reduce((sum, x) => sum + x.totalPrice, 0);
  return {
    perNight,
    nights,
    rooms,
    roomSubtotal,
    discount: br.discountAmount,
    taxedBase: Math.max(0, br.subtotalAmount - br.discountAmount),
    taxes: br.taxAmount + br.feeAmount,
    extrasTotal,
    total: br.totalAmount,
    originalTotal: roomSubtotal + br.taxAmount + br.feeAmount + extrasTotal,
    extras: br.extras,
  };
}

/**
 * Cancellation estimate for a NOT-yet-cancelled reservation. Deliberately
 * never invents a penalty amount client-side — only the actual cancel
 * action (backend) knows a rate plan's penalty type/value, so a plan that's
 * refundable but past its free-cancellation window (or has no free window
 * at all) reports 'fee_may_apply' rather than guessing $0 or a wrong number.
 * ('settled' covers the historical case — a reservation that's already been
 * cancelled — using the real, backend-computed figures from that point.)
 */
type CancellationEstimate =
  | { status: 'settled'; fee: number; refund: number; label: string }
  | { status: 'non_refundable'; fee: number }
  | { status: 'free'; freeUntil?: string }
  | { status: 'fee_may_apply' };

/**
 * Post-cancellation summary — what actually happened to the guest's money,
 * not an estimate. Reads `paymentStatus` (not just `refundAmount`) because a
 * nonzero `refundAmount` alone doesn't mean anything was ever returned: a
 * pay-at-property booking that's cancelled before any charge sits at
 * `paymentStatus: 'pending'` with nothing to refund, and this must never be
 * shown as if money is coming back. Mirrors the backend's own distinction —
 * see `PaymentStatus.refunded`/`partially_refunded` on the backend.
 */
function cancellationSummary(
  res: BackendReservation,
  currency: CurrencyCode
): { headline: string; detail?: string } {
  const c = res.cancellation;
  if (!c) {
    return { headline: 'This reservation was already cancelled.' };
  }
  if (res.paymentStatus === 'pending' || res.paymentStatus === 'failed') {
    return {
      headline: 'Your booking hold has been released.',
      detail: 'No payment was ever collected for this reservation, so there is nothing to refund.',
    };
  }
  if (res.paymentStatus === 'refunded') {
    return { headline: `Refunded in full: ${fmtPrice(c.refundAmount, currency)}` };
  }
  if (res.paymentStatus === 'partially_refunded') {
    return {
      headline: `Partially refunded: ${fmtPrice(c.refundAmount, currency)}`,
      detail: `A ${fmtPrice(c.penaltyAmount, currency)} cancellation fee applied under this rate's policy.`,
    };
  }
  // Captured but not (yet) reflected as refunded/partially_refunded — e.g. a
  // fully non-refundable rate, where the penalty consumes the whole amount.
  if (c.refundAmount <= 0) {
    return { headline: 'This rate was non-refundable — no refund applies.' };
  }
  return { headline: `Refund pending: ${fmtPrice(c.refundAmount, currency)}` };
}

function deriveCancellation(br: BackendReservation): CancellationEstimate {
  const c = br.cancellation;
  if (c) {
    return {
      status: 'settled',
      fee: c.penaltyAmount,
      refund: c.refundAmount,
      label: c.isRefundable ? 'Free cancellation' : 'Cancellation fee',
    };
  }
  const line = br.roomLines[0];
  if (!line || !line.isRefundable) {
    // Non-refundable — the full room subtotal is forfeited regardless of
    // timing (matches CancellationPolicy.evaluate's !isRefundable branch
    // exactly: no plan-specific penalty-type math needed for this case).
    return { status: 'non_refundable', fee: derivePrice(br).total };
  }
  const freeUntil = line.freeCancellationUntil;
  if (freeUntil) {
    const freeUntilDate = fromISODate(freeUntil);
    if (freeUntilDate && new Date() < freeUntilDate) {
      return { status: 'free', freeUntil };
    }
  }
  return { status: 'fee_may_apply' };
}

export default function ReservationFlow() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { open } = useModal();
  const apollo = useApollo();
  const { session } = useSession();

  const deepRef = useMemo(
    () =>
      String(searchParams?.get('ref') ?? '')
        .trim()
        .toUpperCase(),
    [searchParams]
  );
  // Same deep-link pattern ConfirmationFlow already uses (?ref=...&email=...)
  // — when both are present the lookup runs automatically below instead of
  // making the guest re-type what a link they clicked already carried.
  const deepEmail = useMemo(
    () => String(searchParams?.get('email') ?? '').trim().toLowerCase(),
    [searchParams]
  );
  const [status, setStatus] = useState<'lookup' | 'otp' | 'view'>('lookup');
  const [res, setRes] = useState<BackendReservation | null>(null);
  const [refInput, setRefInput] = useState(deepRef);
  const [emailInput, setEmailInput] = useState(deepEmail);
  const [lookupMsg, setLookupMsg] = useState<{ text: string; ok: boolean | null }>({
    text: 'Enter your details below.',
    ok: null,
  });
  const [busy, setBusy] = useState(false);
  const [creditNoteBusy, setCreditNoteBusy] = useState(false);

  // OTP-gated lookup: reference+email alone only earns a code emailed to
  // that address — pendingLookup holds the pair the code was requested for,
  // reused when the guest submits it.
  const [pendingLookup, setPendingLookup] = useState<{ reference: string; email: string } | null>(
    null
  );
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ text: string; ok: boolean | null }>({
    text: '',
    ok: null,
  });

  const [extrasDefs, setExtrasDefs] = useState<Extra[]>([]);
  useEffect(() => {
    if (res?.hotelId) {
      getExtras(res.hotelId).then(setExtrasDefs).catch(() => {});
    }
  }, [res?.hotelId]);

  // Hotel name/address/phone — the guest needs to know where they're
  // actually going and how to reach the property, neither of which the
  // reservation record itself carries.
  const [hotelMeta, setHotelMeta] = useState<{
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    countryCode?: string | null;
    phone?: string | null;
  } | null>(null);
  useEffect(() => {
    if (!res?.hotelId) return;
    let alive = true;
    getHotelById(res.hotelId)
      .then(
        (h) =>
          alive &&
          h &&
          setHotelMeta({
            name: h.name,
            addressLine1: h.addressLine1,
            addressLine2: h.addressLine2,
            city: h.city,
            countryCode: h.countryCode,
            phone: h.phone,
          })
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [res?.hotelId]);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const checkingIn =
    !!res && res.status === 'confirmed' && inStayWindow(res.checkInDate, res.checkOutDate);

  /** Step 1: reference+email earns a code emailed to that address — never a
   * direct read. Always the same outcome whether or not they actually
   * match anything (the backend responds identically either way), so the
   * message here must never imply a match/no-match distinction. */
  const requestOtp = async (ref: string, email: string, opts?: { scroll?: boolean }) => {
    setBusy(true);
    try {
      await requestReservationLookupOtp(ref, email);
      setPendingLookup({ reference: ref, email });
      setOtpCode('');
      setOtpMsg({
        text: `If ${ref} and that email match a reservation, we've sent a 6-digit code to ${email}.`,
        ok: null,
      });
      setStatus('otp');
      if (opts?.scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setLookupMsg({
        text: 'Something went wrong. Please try again.',
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  };

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = refInput.trim().toUpperCase();
    const email = emailInput.trim().toLowerCase();
    if (!ref || !email) {
      setLookupMsg({ text: 'Please enter both your reference and email address.', ok: false });
      return;
    }
    await requestOtp(ref, email, { scroll: true });
  };

  /** Step 2: confirms the code, then performs the actual (now OTP-gated) read. */
  const doVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLookup) return;
    const code = otpCode.trim();
    if (!code) {
      setOtpMsg({ text: 'Enter the 6-digit code from your email.', ok: false });
      return;
    }
    setOtpBusy(true);
    try {
      const { lookupToken } = await verifyReservationLookupOtp(
        pendingLookup.reference,
        pendingLookup.email,
        code
      );
      const r = await reservations.findVerified(pendingLookup.reference, pendingLookup.email, lookupToken);
      setRes(r);
      setLookupMsg({ text: '', ok: null });
      setOtpMsg({ text: '', ok: null });
      setStatus('view');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const text =
        err instanceof ApiError && err.code === 'CONFLICT'
          ? 'Too many incorrect attempts for this code — request a new one below.'
          : 'Incorrect or expired code. Please try again.';
      setOtpMsg({ text, ok: false });
    } finally {
      setOtpBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!pendingLookup) return;
    setOtpBusy(true);
    try {
      await requestReservationLookupOtp(pendingLookup.reference, pendingLookup.email);
      setOtpMsg({ text: 'A new code is on its way.', ok: true });
    } catch (err) {
      const text =
        err instanceof ApiError && err.code === 'CONFLICT'
          ? 'Please wait a little longer before requesting another code.'
          : 'Could not resend the code. Please try again.';
      setOtpMsg({ text, ok: false });
    } finally {
      setOtpBusy(false);
    }
  };

  // Deep link carries both ref + email (e.g. from the confirmation page's
  // "Manage booking" button) — still OTP-gated (a bookmarked/forwarded link
  // is no stronger a proof than typing the same two values manually), but
  // pre-filling + auto-requesting the code saves the guest re-entering them.
  const autoLookedUp = useRef(false);
  useEffect(() => {
    if (autoLookedUp.current || !deepRef || !deepEmail || res) return;
    autoLookedUp.current = true;
    requestOtp(deepRef, deepEmail);
  }, [deepRef, deepEmail, res]);

  // A signed-in guest clicking their own booking from "Your bookings"
  // (?ref=... only, no email) already proved who they are via the session
  // cookie — the OTP step above exists to prove email ownership for an
  // anonymous self-service lookup, which is redundant here. Read the same
  // non-OTP `reservation(reference, email)` lookup ConfirmationFlow already
  // uses, scoped to the signed-in account's own email; the backend still
  // enforces the reference+email match, so a mismatch (not this account's
  // reservation) just falls through to the ordinary manual lookup form
  // instead of leaking anything.
  const sessionLookedUp = useRef(false);
  useEffect(() => {
    if (sessionLookedUp.current || !deepRef || deepEmail || res || !session?.email) return;
    sessionLookedUp.current = true;
    reservations
      .find(deepRef, session.email)
      .then((r) => {
        setRes(r);
        setStatus('view');
      })
      .catch(() => {
        setRefInput(deepRef);
      });
  }, [deepRef, deepEmail, res, session?.email]);

  // Next.js keeps this page component mounted across a client-side
  // navigation that only changes the query string (e.g. the header's bare
  // "/reservation" link, or switching from one booking's ?ref= to
  // another's) — component state does not reset on its own. Without this,
  // a reservation already loaded into `res` keeps rendering (cancel button
  // and all) even after the URL no longer carries that reservation's ref,
  // or shows the wrong reservation's details after the ref changes.
  const prevDeepRef = useRef(deepRef);
  useEffect(() => {
    if (deepRef === prevDeepRef.current) return;
    prevDeepRef.current = deepRef;
    setRes(null);
    setStatus('lookup');
    setPendingLookup(null);
    autoLookedUp.current = false;
    sessionLookedUp.current = false;
  }, [deepRef]);

  const showOther = () => {
    setStatus('lookup');
    setPendingLookup(null);
    setLookupMsg({ text: 'Enter your details below.', ok: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (status === 'otp' && pendingLookup) {
    return (
      <div id="lookup-otp" className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-8">
        <h2 className="font-display text-navy text-xl font-semibold">Check your email</h2>
        <p className="text-navy/55 mt-1 text-sm">
          Enter the 6-digit code we sent to <span className="text-navy font-medium">{pendingLookup.email}</span> to
          view this reservation.
        </p>
        <form id="lookup-otp-form" className="mt-5 flex flex-wrap items-end gap-3" onSubmit={doVerifyOtp} noValidate>
          <div>
            <Label htmlFor="lk-otp-code">Verification code</Label>
            <Input
              id="lk-otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-40 tracking-[0.3em]"
            />
          </div>
          <Button type="submit" disabled={otpBusy} className="py-3.5">
            {otpBusy ? 'Verifying…' : 'Verify'}
          </Button>
          <Button type="button" variant="ghost" disabled={otpBusy} onClick={resendOtp} className="py-3.5">
            Resend code
          </Button>
        </form>
        <p
          id="lookup-otp-msg"
          className={`mt-3 min-h-5 text-sm font-medium ${otpMsg.ok === false ? 'text-clay' : otpMsg.ok === true ? 'text-success' : 'text-navy/45'}`}
          role="status"
        >
          {otpMsg.text}
        </p>
        <button
          type="button"
          onClick={showOther}
          className="text-navy/45 hover:text-navy mt-4 text-xs font-medium underline underline-offset-2"
        >
          Use a different reference or email
        </button>
      </div>
    );
  }

  if (status === 'lookup' || !res) {
    return (
      <div id="lookup" className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-8">
        <h2 className="font-display text-navy text-xl font-semibold">Find your stay</h2>
        <p className="text-navy/55 mt-1 text-sm">
          Enter the reference from your confirmation and the email used at booking. We&apos;ll
          email you a code to confirm it&apos;s you — no account needed.
        </p>
        <form
          id="lookup-form"
          className="mt-5 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={doLookup}
          noValidate
        >
          <div>
            <Label htmlFor="lk-ref">Reference</Label>
            <Input
              id="lk-ref"
              type="text"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="e.g. RC-8F3K2Q"
              className="tracking-wide uppercase"
            />
          </div>
          <div>
            <Label htmlFor="lk-email">Email</Label>
            <Input
              id="lk-email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" disabled={busy} className="py-3.5">
            {busy ? 'Sending code…' : 'Find my stay'}
          </Button>
        </form>
        <p
          id="lookup-msg"
          className={`mt-3 min-h-5 text-sm font-medium ${lookupMsg.ok === false ? 'text-clay' : lookupMsg.ok === true ? 'text-success' : 'text-navy/45'}`}
          role="status"
        >
          {lookupMsg.text}
        </p>
      </div>
    );
  }

  const roomLine = res.roomLines[0];
  const extras = res.extras.map((x) => {
    const def = extrasDefs.find((e) => e.id === x.extraId);
    return {
      name: def?.name || x.name,
      price: def?.price ?? x.unitPrice,
      qty: x.quantity,
      unit: def?.unit || 'per stay',
      id: x.extraId,
    };
  });
  const cancelled = res.status === 'cancelled';
  const est = deriveCancellation(res);
  const price = derivePrice(res);
  const cancelSummary = cancelled ? cancellationSummary(res, currency) : null;

  /* Real payment status from the backend (pending/captured/failed/refunded),
     never a hardcoded "settled at booking" — a pay-at-property stay sits at
     'pending' by design (nothing charged online), so its own rate wording
     wins over a generic pending label. */
  const settlesAtProperty = res.roomLines.every((l) => l.paymentTiming === 'pay_at_property');
  const paymentLabel = settlesAtProperty
    ? 'Due at the hotel'
    : res.paymentStatus === 'captured'
      ? 'Paid'
      : res.paymentStatus === 'failed'
        ? 'Payment failed'
        : res.paymentStatus === 'refunded'
          ? 'Refunded'
          : res.paymentStatus === 'partially_refunded'
            ? 'Partially refunded'
            : 'Pending';

  const statusText = STATUS_META[res.status] || STATUS_META.confirmed!;
  const statusCls =
    res.status === 'checked_in'
      ? 'bg-success/8 border border-success/20 text-success-dark'
      : res.status === 'cancelled'
        ? 'bg-clay/8 border border-clay/25 text-clay'
        : 'bg-white border border-navy/10';

  const downloadInvoice = async () => {
    setInvoiceBusy(true);
    try {
      const pdf = await downloadInvoicePdf(res.reference, res.guest.email ?? '');
      downloadBytes(pdf.content, pdf.filename, 'application/pdf');
      toast({ message: 'Invoice downloaded as a PDF.', type: 'ok', title: 'Invoice ready' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not generate the invoice right now.';
      toast({ message, type: 'error', title: 'Invoice unavailable' });
    } finally {
      setInvoiceBusy(false);
    }
  };

  const downloadIcs = () => {
    const roomName = roomLine?.roomTypeName ?? 'Room';
    const hotelName = hotelMeta?.name || 'the hotel';
    const ics = buildIcs({
      summary: `${roomName} — ${hotelName}`,
      location: hotelMeta?.city || '',
      description: `Booking ${res.reference} · Check-in from 15:00 — check-out by 11:00.`,
      dtStart: res.checkInDate,
      dtEnd: res.checkOutDate,
      uid: `${res.reference}@${hotelName.toLowerCase().replace(/\s+/g, '')}.example`,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${res.reference}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ message: 'Calendar file downloaded — add it to your calendar.', type: 'ok', title: 'Added to calendar' });
  };

  const downloadCreditNote = async () => {
    setCreditNoteBusy(true);
    try {
      const pdf = await downloadCreditNotePdf(res.reference, res.guest.email ?? '');
      downloadBytes(pdf.content, pdf.filename, 'application/pdf');
      toast({ message: 'Credit note downloaded as a PDF.', type: 'ok', title: 'Ready' });
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === 'NOT_FOUND'
          ? 'No credit note exists for this reservation — it was never invoiced.'
          : 'Could not fetch the credit note right now.';
      toast({ message, type: 'error', title: 'Unavailable' });
    } finally {
      setCreditNoteBusy(false);
    }
  };

  const doCancel = () => {
    open(
      <CancelContent
        res={res}
        est={est}
        currency={currency}
        onConfirm={async (reason) => {
          try {
            await reservations.cancel(res.reference, res.guest.email || '', 'guest_requested', reason);
            if (apollo) {
              invalidateGraphql(apollo, REST_INVALIDATIONS['reservations.cancel']);
            }
            setRes(await reservations.find(res.reference, res.guest.email || ''));
            toast({
              message: 'Your reservation has been cancelled.',
              type: 'ok',
              title: 'Cancelled',
            });
          } catch {
            toast({
              message: 'Could not cancel your reservation. Please try again.',
              type: 'error',
              title: 'Error',
            });
          }
        }}
      />
    );
  };

  return (
    <div id="view" className="mt-8 space-y-6">
      <div id="status-banner" className={`rounded-3xl p-6 lg:p-7 ${statusCls}`}>
        <p className="text-sm">{statusText}</p>
      </div>

      {checkingIn ? (
        <div
          id="checkin-cta"
          className="border-gold/40 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-dashed bg-white p-6"
        >
          <div>
            <p className="font-display text-navy text-lg font-semibold">Arriving soon?</p>
            <p className="text-navy/60 text-sm">
              Skip the desk — complete your online check-in in two minutes.
            </p>
          </div>
          <a
            href={`/checkin?ref=${encodeURIComponent(res.reference)}`}
            className="bg-navy hover:bg-navy-light rounded-xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase transition-colors"
          >
            Online check-in
          </a>
        </div>
      ) : null}

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={downloadIcs}
          variant="outline"
          className="rounded-2xl px-4 py-3.5"
        >
          Add to calendar
        </Button>
        <Button
          type="button"
          onClick={downloadInvoice}
          disabled={invoiceBusy}
          variant="outline"
          className="rounded-2xl px-4 py-3.5"
        >
          {invoiceBusy ? 'Preparing…' : 'Download invoice'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Your stay
                </h2>
                {hotelMeta ? (
                  <p className="text-navy mt-0.5 text-sm font-semibold">
                    {hotelMeta.name}
                    {hotelMeta.city ? ` · ${hotelMeta.city}` : ''}
                  </p>
                ) : null}
              </div>
              <span
                id="view-ref"
                className="font-display text-navy text-lg font-semibold tracking-wider"
              >
                {res.reference}
              </span>
            </div>
            <div id="view-room" className="mt-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  roomLine?.roomTypeImageUrl
                    ? image(roomLine.roomTypeImageUrl, 400)
                    : IMG_FALLBACK
                }
                alt={roomLine?.roomTypeName ?? 'Room'}
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="font-display text-navy text-xl font-semibold">
                  {roomLine?.roomTypeName ?? 'Room'}
                </p>
                <p className="text-navy/55 mt-0.5 text-xs">
                  {roomLine ? `${roomLine.nights} night${roomLine.nights !== 1 ? 's' : ''}` : ''}
                  {roomLine?.ratePerNight ? ` · ${fmtPrice(roomLine.ratePerNight, currency)}/night` : ''}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Check-in
                </dt>
                <dd className="text-navy mt-1 font-semibold">
                  {fmt(fromISODate(res.checkInDate))} · from 15:00
                </dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Check-out
                </dt>
                <dd className="text-navy mt-1 font-semibold">
                  {fmt(fromISODate(res.checkOutDate))} · by 11:00
                </dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Guests
                </dt>
                <dd className="text-navy mt-1">{`${res.adults} adults${res.children ? `, ${res.children} child${res.children > 1 ? 'ren' : ''}` : ''}`}</dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Rate
                </dt>
                <dd className="text-navy mt-1">
                  {roomLine?.ratePlanName || 'Standard rate'}
                  {res.discountAmount > 0 ? ` · promo applied` : ''}
                </dd>
              </div>
              {extras.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                    Extras &amp; services
                  </dt>
                  <dd className="text-navy mt-1">
                    {extras.map((x) => `${x.name} × ${x.qty}`).join(' · ')}
                  </dd>
                </div>
              ) : null}
              {res.notes && res.notes !== 'Standard reservation' ? (
                <div className="sm:col-span-2">
                  <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                    Special requests
                  </dt>
                  <dd className="text-navy mt-1">{res.notes}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {hotelMeta ? (
            <div className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-7">
              <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                The hotel
              </h2>
              <p className="text-navy mt-2 text-sm font-semibold">{hotelMeta.name}</p>
              <p className="text-navy/60 mt-1 text-sm">
                {[hotelMeta.addressLine1, hotelMeta.addressLine2, hotelMeta.city, hotelMeta.countryCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {hotelMeta.phone ? (
                <p className="text-navy/60 mt-1 text-sm">
                  <a href={`tel:${hotelMeta.phone}`} className="hover:text-navy underline underline-offset-2">
                    {hotelMeta.phone}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-7">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Guest details
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">Name</dt>
                <dd className="text-navy mt-1 font-semibold">
                  {res.guest.firstName} {res.guest.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">Email</dt>
                <dd className="text-navy mt-1">{res.guest.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">Phone</dt>
                <dd className="text-navy mt-1">{res.guest.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Estimated arrival
                </dt>
                <dd className="text-navy mt-1">{res.arrivalSlot || 'Not specified'}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-navy/10 rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Price summary
              </h2>
              {!cancelled ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase ${
                    paymentLabel === 'Paid'
                      ? 'bg-success/10 text-success-dark'
                      : paymentLabel === 'Payment failed'
                        ? 'bg-clay/10 text-clay'
                        : 'bg-navy/8 text-navy'
                  }`}
                >
                  {paymentLabel}
                </span>
              ) : null}
            </div>
            <div id="view-price" className="mt-4">
              <QuoteTable
                quote={price}
                currency={currency}
                note={cancelled ? 'cancelled — no further charges' : paymentLabel.toLowerCase()}
              />
            </div>
            {res.charges.length > 0 ? (
              <div className="border-navy/10 mt-4 border-t pt-4">
                <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Additional charges
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {res.charges.map((c) => (
                    <li key={c.id} className="text-navy flex items-center justify-between gap-4">
                      <span>{c.name}</span>
                      <span className="font-semibold">{fmtPrice(c.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="border-navy/10 rounded-3xl border bg-white p-6">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Mobile key
            </h2>
            <div className="mt-4 flex justify-center" id="view-qr">
              <QR value={res.reference} size={120} />
            </div>
            <p className="text-navy/45 mt-2 text-center text-[11px]">
              Show this at the front desk for quick check-in.
            </p>
          </div>
          <div className="bg-navy-dark rounded-3xl p-6 text-white">
            <h2 className="text-gold-light text-xs font-semibold tracking-widest uppercase">
              Need to cancel?
            </h2>
            <p className="mt-2 text-sm text-white/70" id="cancel-policy-line">
              {cancelSummary
                ? cancelSummary.headline
                : est.status === 'free'
                  ? est.freeUntil
                    ? `Free cancellation until ${fmt(fromISODate(est.freeUntil))}.`
                    : 'Free cancellation.'
                  : est.status === 'non_refundable'
                    ? 'Non-refundable rate — the full stay is due.'
                    : 'A cancellation fee may apply.'}
            </p>
            <p className="mt-1 text-xs text-white/50" id="cancel-due-line">
              {cancelSummary
                ? (cancelSummary.detail ?? '')
                : res.status !== 'confirmed'
                  ? ''
                  : est.status === 'free'
                    ? 'No fee applies today.'
                    : est.status === 'non_refundable'
                      ? `Cancelling today would charge ${fmtPrice(est.fee, currency)} (full stay).`
                      : 'The exact amount is shown before you confirm.'}
            </p>
            <Button
              type="button"
              id="cancel-btn"
              onClick={doCancel}
              disabled={cancelled}
              variant="onDark"
              size="sm"
              className="mt-4 w-full py-3 text-white"
            >
              {cancelled ? 'Already cancelled' : 'Cancel this reservation'}
            </Button>
            {cancelled ? (
              <Button
                type="button"
                id="download-credit-note-btn"
                onClick={downloadCreditNote}
                disabled={creditNoteBusy}
                variant="onDark"
                size="sm"
                className="mt-2 w-full py-3 text-white"
              >
                {creditNoteBusy ? 'Preparing…' : 'Download credit note'}
              </Button>
            ) : null}
          </div>
          <div className="text-center">
            <Button type="button" id="view-other" onClick={showOther} variant="ghost">
              Look up a different reservation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CancelContent({
  res,
  est,
  currency,
  onConfirm,
}: {
  res: BackendReservation;
  est: ReturnType<typeof deriveCancellation>;
  currency: CurrencyCode;
  onConfirm: (reason: string) => void;
}) {
  const { close } = useModal();
  const [reason, setReason] = useState('Plans changed');
  return (
    <>
      <h2 className="font-display text-navy text-xl font-semibold">
        Cancel reservation {res.reference}?
      </h2>
      <p className="text-navy/60 mt-2 text-sm">
        {res.reference} · {fmt(fromISODate(res.checkInDate))} →{' '}
        {fmt(fromISODate(res.checkOutDate))}
      </p>
      {est.status === 'non_refundable' ? (
        <div className="bg-clay/10 border-clay/25 text-clay mt-4 rounded-2xl border px-4 py-3 text-sm">
          Cancelling now charges <strong>{fmtPrice(est.fee, currency)}</strong> (full stay, non-refundable rate).
        </div>
      ) : est.status === 'fee_may_apply' ? (
        <div className="bg-gold/10 border-gold/30 text-gold-dark mt-4 rounded-2xl border px-4 py-3 text-sm">
          A cancellation fee may apply — you&apos;ll see the exact amount once you confirm.
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-success/20 bg-success/8 px-4 py-3 text-sm text-success">
          Free cancellation — nothing will be charged.
        </div>
      )}
      <label className="mt-4 block">
        <span className="text-navy/60 text-xs font-semibold">
          Reason <span className="text-navy/40 font-normal">(optional)</span>
        </span>
        <select
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="bg-paper border-navy/15 focus:ring-gold/40 mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
        >
          <option>Plans changed</option>
          <option>Found another option</option>
          <option>Budget reasons</option>
          <option>Dates no longer work</option>
          <option>Other</option>
        </select>
      </label>
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button type="button" onClick={close} variant="ghost" size="sm" className="px-4">
          Keep my stay
        </Button>
        <Button
          type="button"
          onClick={() => {
            close();
            onConfirm(reason);
          }}
          variant="destructive"
          size="sm"
        >
          Cancel reservation
        </Button>
      </div>
    </>
  );
}
