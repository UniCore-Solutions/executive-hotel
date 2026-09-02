'use client';

/* My reservation — lookup by ref+email, status banner, stay details, price,
   cancellation via backend GraphQL, check-in CTA. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useModal } from '@/context/ModalContext';
import { useApollo } from '@/api/apollo/provider';
import { REST_INVALIDATIONS, invalidateGraphql } from '@/api/invalidation';
import { reservations, type BackendReservation } from '@/services/reservations';
import { GraphqlClientError } from '@/services/graphqlClient';
import { getExtras } from '@/services/extras';
import { getCreditNote } from '@/api/rest/endpoints';
import { ApiError } from '@/api/rest/client';
import { buildCreditNoteHtml, downloadInvoiceHtml } from '@/lib/invoice';
import { fmt, fromISODate, inStayWindow } from '@/lib/dates';
import { fmtPrice } from '@/lib/format';
import { image, IMG_FALLBACK } from '@/services/availability';
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
  const [status, setStatus] = useState<'lookup' | 'view'>('lookup');
  const [res, setRes] = useState<BackendReservation | null>(null);
  const [refInput, setRefInput] = useState(deepRef);
  const [emailInput, setEmailInput] = useState(deepEmail);
  const [lookupMsg, setLookupMsg] = useState<{ text: string; ok: boolean | null }>({
    text: 'Enter your details below.',
    ok: null,
  });
  const [busy, setBusy] = useState(false);
  const [creditNoteBusy, setCreditNoteBusy] = useState(false);

  const [extrasDefs, setExtrasDefs] = useState<Extra[]>([]);
  useEffect(() => {
    if (res?.hotelId) {
      getExtras(res.hotelId).then(setExtrasDefs).catch(() => {});
    }
  }, [res?.hotelId]);

  const checkingIn =
    !!res && res.status === 'confirmed' && inStayWindow(res.checkInDate, res.checkOutDate);

  const performLookup = async (ref: string, email: string, opts?: { scroll?: boolean }) => {
    setBusy(true);
    try {
      const r = await reservations.find(ref, email);
      setLookupMsg({ text: '', ok: null });
      setRes(r);
      setStatus('view');
      if (opts?.scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // A miss throws NOT_FOUND (reservations.find never resolves to null);
      // its message is already guest-appropriate, so surface it directly.
      if (err instanceof GraphqlClientError && err.code === 'NOT_FOUND') {
        setLookupMsg({ text: err.message, ok: false });
      } else {
        setLookupMsg({
          text: 'Something went wrong looking up your reservation. Please try again.',
          ok: false,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = refInput.trim();
    const email = emailInput.trim();
    if (!ref || !email) {
      setLookupMsg({ text: 'Please enter both your reference and email address.', ok: false });
      return;
    }
    await performLookup(ref, email, { scroll: true });
  };

  // Deep link carries both ref + email (e.g. from the confirmation page's
  // "Manage booking" button) — resolve it automatically, once, instead of
  // making the guest re-enter what the link already told us.
  const autoLookedUp = useRef(false);
  useEffect(() => {
    if (autoLookedUp.current || !deepRef || !deepEmail || res) return;
    autoLookedUp.current = true;
    performLookup(deepRef, deepEmail);
  }, [deepRef, deepEmail, res]);

  const showOther = () => {
    setStatus('lookup');
    setLookupMsg({ text: 'Enter your details below.', ok: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (status === 'lookup' || !res) {
    return (
      <div id="lookup" className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-8">
        <h2 className="font-display text-navy text-xl font-semibold">Find your stay</h2>
        <p className="text-navy/55 mt-1 text-sm">
          Enter the reference from your confirmation and the email used at booking. No account
          needed.
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
            {busy ? 'Looking…' : 'Find my stay'}
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

  const statusText = STATUS_META[res.status] || STATUS_META.confirmed!;
  const statusCls =
    res.status === 'checked_in'
      ? 'bg-success/8 border border-success/20 text-success-dark'
      : res.status === 'cancelled'
        ? 'bg-clay/8 border border-clay/25 text-clay'
        : 'bg-white border border-navy/10';

  const downloadCreditNote = async () => {
    setCreditNoteBusy(true);
    try {
      const note = await getCreditNote(res.reference, res.guest.email ?? '');
      const html = buildCreditNoteHtml(note, { name: 'Executive Hotel' });
      downloadInvoiceHtml(html, `${note.creditNoteNumber}.html`);
      toast({ message: 'Credit note downloaded.', type: 'ok', title: 'Ready' });
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Your stay
              </h2>
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
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-navy/10 rounded-3xl border bg-white p-6">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Price summary
            </h2>
            <div id="view-price" className="mt-4">
              <QuoteTable
                quote={price}
                currency={currency}
                note={
                  cancelled ? 'cancelled — no further charges' : 'settled at booking'
                }
              />
            </div>
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
