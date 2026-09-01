'use client';

/* Confirmation — success header with reference + copy, stay timeline,
   action links (manage / check-in / share), stay details, price summary,
   mobile-key QR, and the D-3 .ics download. */

import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { reservations, type BackendReservation } from '@/services/reservations';
import { GraphqlClientError } from '@/services/graphqlClient';
import { getExtras } from '@/services/extras';
import { getHotelById } from '@/services/catalog';
import { buildIcs } from '@/lib/ics';
import { fmt, fmtShort, fromISODate, nightsBetween } from '@/lib/dates';
import { image, IMG_FALLBACK } from '@/services/availability';
import { QR } from '@/components/ui/QR';
import { QuoteTable } from '@/components/ui/QuoteTable';
import type { Extra, PriceBreakdown, QuoteExtraLine } from '@/types';

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

export default function ConfirmationFlow() {
  const searchParams = useSearchParams();
  const ref = useMemo(
    () =>
      String(searchParams?.get('ref') ?? '')
        .trim()
        .toUpperCase(),
    [searchParams]
  );
  const emailParam = useMemo(
    () => String(searchParams?.get('email') ?? '').trim().toLowerCase(),
    [searchParams]
  );
  /* BookingFlow redirects here with status=processing the instant a payment
     attempt starts — before the backend's async simulated settlement (or a
     real gateway's webhook) has resolved it. We never assume success:
     usePaymentStatus polls the reservation's real paymentStatus until it
     settles or the 2-minute ceiling is reached. */
  const isProcessing = searchParams?.get('status') === 'processing';
  const [res, setRes] = useState<BackendReservation | null>(null);
  const poll = usePaymentStatus(ref, emailParam, isProcessing && !res);

  useEffect(() => {
    if (poll.phase !== 'confirmed' && poll.phase !== 'failed') return;
    // Deferred a tick: syncing another hook's settled state into local state
    // reads as "external system changed" rather than a same-render derive,
    // so it belongs in a callback, not the effect body directly.
    const reservation = poll.reservation;
    queueMicrotask(() => setRes(reservation));
  }, [poll]);
  const [copied, setCopied] = useState('');
  const [emailInput, setEmailInput] = useState(emailParam);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const { toast } = useToast();
  const { currency } = useCurrency();

  const [extrasDefs, setExtrasDefs] = useState<Extra[]>([]);
  useEffect(() => {
    if (res?.hotelId) {
      getExtras(res.hotelId).then(setExtrasDefs).catch(() => {});
    }
  }, [res?.hotelId]);

  /* The booking's hotel identity — resolved from the backend so the
     confirmation, JSON-LD and calendar file carry the real property name
     and location instead of a hardcoded brand string. */
  const [hotelMeta, setHotelMeta] = useState<{ name: string; city?: string; countryCode?: string } | null>(null);
  useEffect(() => {
    if (!res?.hotelId) return;
    let alive = true;
    getHotelById(res.hotelId)
      .then((h) => alive && h && setHotelMeta({ name: h.name, city: h.city ?? '', countryCode: h.countryCode ?? '' }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [res?.hotelId]);

  useEffect(() => {
    // While a payment is being polled, usePaymentStatus is the sole source
    // of `res` — this plain one-shot lookup would otherwise race it and could
    // set a stale still-pending snapshot after the poll already resolved.
    if (!ref || res || isProcessing) return;
    // BookingFlow carries the guest email straight into the confirmation
    // link, so an anonymous booker's own confirmation resolves without
    // asking them to re-identify themselves seconds after paying (see
    // docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md). Only fall
    // back to the auth-gated myReservations lookup for a deep link that
    // never carried an email (e.g. an older bookmark).
    if (emailParam) {
      reservations
        .find(ref, emailParam)
        .then(setRes)
        // Best-effort prefill: the lookup form below is the recoverable path
        // if this misses, so a failure here needs no message of its own.
        .catch(() => {});
      return;
    }
    reservations
      .list()
      .then((list) => {
        const found = list.find((r) => r.reference === ref);
        if (found) setRes(found);
      })
      .catch(() => {});
  }, [ref, res, emailParam, isProcessing]);

  useEffect(() => {
    if (!res) return;
    const roomName = res.roomLines[0]?.roomTypeName ?? 'Room';
    const hotel = hotelMeta?.name || 'the hotel';
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Reservation',
      reservationNumber: res.reference,
      reservationStatus: 'https://schema.org/Confirmed',
      underName: { '@type': 'Person', name: `${res.guest.firstName} ${res.guest.lastName}` },
      reservationFor: {
        '@type': 'HotelRoom',
        name: roomName,
        hotel: {
          '@type': 'Hotel',
          name: hotel,
          address: {
            '@type': 'PostalAddress',
            addressLocality: hotelMeta?.city ?? '',
            addressCountry: hotelMeta?.countryCode ?? '',
          },
        },
      },
      checkinTime: res.checkInDate,
      checkoutTime: res.checkOutDate,
      totalPrice: {
        '@type': 'MonetaryAmount',
        price: res.totalAmount,
        currency: res.currencyCode,
      },
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(el);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, [res, hotelMeta]);

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!ref || !email) {
      setLookupMsg('Please enter the email used at booking.');
      return;
    }
    setLookupBusy(true);
    try {
      setRes(await reservations.find(ref, email));
      setLookupMsg('');
    } catch (err) {
      // A miss throws NOT_FOUND (reservations.find never resolves to null);
      // its message is already guest-appropriate, so surface it directly.
      if (err instanceof GraphqlClientError && err.code === 'NOT_FOUND') {
        setLookupMsg(err.message);
      } else {
        setLookupMsg('Something went wrong. Please try again.');
      }
    } finally {
      setLookupBusy(false);
    }
  };

  if (isProcessing && !res) {
    if (poll.phase === 'timeout') {
      return (
        <div
          id="payment-timeout"
          className="border-info/30 bg-info/5 rounded-3xl border p-12 text-center"
        >
          <span
            className="bg-info/15 text-info-dark mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            aria-hidden="true"
          >
            ⏱
          </span>
          <p className="font-display text-navy mt-4 text-2xl font-semibold">
            Still confirming your payment
          </p>
          <p className="text-navy/60 mx-auto mt-2 max-w-sm text-sm">
            This is taking longer than usual. Your room is still held — we&apos;ll finish
            confirming it shortly. You don&apos;t need to pay again.
          </p>
          <Button asChild className="mt-6 shadow-none">
            <a href={`/reservation?ref=${encodeURIComponent(ref)}`}>Check my reservation</a>
          </Button>
        </div>
      );
    }
    if (poll.phase === 'error') {
      return (
        <div id="payment-status-error" className="border-navy/10 rounded-3xl border bg-white p-12 text-center">
          <p className="font-display text-navy text-2xl font-semibold">Something went wrong</p>
          <p className="text-navy/60 mx-auto mt-2 max-w-sm text-sm">{poll.message}</p>
          <Button asChild className="mt-6 shadow-none">
            <a href={`/reservation?ref=${encodeURIComponent(ref)}`}>Check my reservation</a>
          </Button>
        </div>
      );
    }
    // 'processing', or a settled outcome not yet reflected in `res` (a single
    // render's gap before the effect above calls setRes) — same UI either way.
    return (
      <div id="payment-processing" className="border-navy/10 rounded-3xl border bg-white p-12 text-center">
        <span
          className="border-gold/30 border-t-gold mx-auto block h-12 w-12 animate-spin rounded-full border-4"
          aria-hidden="true"
        />
        <p className="font-display text-navy mt-5 text-2xl font-semibold" role="status" aria-live="polite">
          Processing your payment…
        </p>
        <p className="text-navy/60 mx-auto mt-2 max-w-sm text-sm">
          Your room is held — this usually takes a few seconds. Please don&apos;t close this page.
        </p>
      </div>
    );
  }

  if (!res) {
    return (
      <div id="ref-missing" className="border-navy/10 rounded-3xl border bg-white p-12 text-center">
        <p className="font-display text-navy text-2xl font-semibold">
          We couldn&apos;t find that booking
        </p>
        <p className="text-navy/60 mt-2 text-sm">
          Enter your reference and email to view your confirmation.
        </p>
        <form onSubmit={doLookup} className="mt-5 mx-auto max-w-sm space-y-3" noValidate>
          <input
            type="text"
            value={ref}
            readOnly
            className="bg-paper border-navy/15 w-full rounded-xl border px-3 py-2.5 text-sm font-medium"
          />
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email used at booking"
            className="bg-paper border-navy/15 focus:ring-gold/40 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
          />
          {lookupMsg ? <p className="text-clay text-xs font-medium">{lookupMsg}</p> : null}
          <Button type="submit" disabled={lookupBusy} className="w-full">
            {lookupBusy ? 'Looking up…' : 'Find my booking'}
          </Button>
        </form>
        <a
          href="/reservation"
          className="text-navy/55 hover:text-navy mt-4 inline-block text-xs font-bold tracking-widest uppercase"
        >
          My reservation
        </a>
      </div>
    );
  }

  const roomLine = res.roomLines[0];
  const roomName = roomLine?.roomTypeName ?? 'Room';
  const planName = roomLine?.ratePlanName ?? '';
  const price = derivePrice(res);
  /* Payment timeline + summary reflect the real payment status from the
     backend (pending/authorized/captured/failed), never a hardcoded state. */
  const paymentDone = res.paymentStatus === 'captured';
  const paymentLabel =
    res.paymentStatus === 'captured'
      ? 'Processed'
      : res.paymentStatus === 'failed'
        ? 'Failed'
        : 'Pending';
  /* Booked extras, with the catalog's display name preferred over whatever
     was persisted on the reservation line. Fed to QuoteTable so the price
     summary itemizes them — the single place extras are presented here. */
  const extraLines: QuoteExtraLine[] = res.extras.map((x) => {
    const def = extrasDefs.find((e) => e.id === x.extraId);
    return {
      extraId: x.extraId,
      name: def?.name || x.name,
      quantity: x.quantity,
      unitPrice: def?.price ?? x.unitPrice,
      totalPrice: x.totalPrice,
    };
  });
  const checkinD = fromISODate(res.checkInDate);
  const checkoutD = fromISODate(res.checkOutDate);
  const n = Math.max(1, nightsBetween(checkinD, checkoutD));

  const downloadIcs = () => {
    const roomName = res.roomLines[0]?.roomTypeName ?? 'Room';
    const hotel = hotelMeta?.name || 'the hotel';
    const city = hotelMeta?.city || '';
    const ics = buildIcs({
      summary: `${roomName} — ${hotel}`,
      location: city,
      description: `Booking ${res.reference} · Check-in from 15:00 — check-out by 11:00.`,
      dtStart: res.checkInDate,
      dtEnd: res.checkOutDate,
      uid: `${res.reference}@${(hotelMeta?.name ?? 'hotel').toLowerCase().replace(/\s+/g, '')}.example`,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${res.reference}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      message: 'Calendar file downloaded — add it to your calendar.',
      type: 'ok',
      title: 'Added to calendar',
    });
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(res.reference);
      setCopied('ref');
      toast({ message: 'Reference copied.', type: 'ok' });
    } catch {
      toast({ message: res.reference, type: 'info' });
    }
  };

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        message: 'Confirmation link copied — share it with your travel partner.',
        type: 'ok',
        title: 'Link copied',
      });
    } catch {
      toast({
        message: 'Email is not available — your details are on screen.',
        type: 'info',
        title: 'Share unavailable',
      });
    }
  };

  const paymentFailed = res.paymentStatus === 'failed';

  return (
    <div id="confirmation">
      {/* header: success, or a payment-failed variant with a retry path —
          the room is still held (see BOOKING_PAYMENT_UX_PLAN §2/§5) so this
          is a recoverable state, not a dead end. */}
      {paymentFailed ? (
        <div
          id="payment-failed"
          className="border-clay/25 bg-clay/5 rounded-3xl border p-8 text-center"
        >
          <span
            className="bg-clay inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
            aria-hidden="true"
          >
            !
          </span>
          <h1 className="font-display text-navy mt-4 text-3xl font-semibold lg:text-4xl">
            Payment didn&apos;t go through
          </h1>
          <p className="text-navy/60 mx-auto mt-2 max-w-md text-sm">
            Your room is still held under reference <strong>{res.reference}</strong> — no
            charge was made. Try another card to complete your booking.
          </p>
          <Button asChild className="mt-6 shadow-none" variant="destructive">
            <a
              href={`/booking/retry?ref=${encodeURIComponent(res.reference)}&email=${encodeURIComponent(res.guest.email ?? '')}`}
            >
              Try another card
            </a>
          </Button>
        </div>
      ) : (
      <div className="rounded-3xl border border-success/20 bg-white p-8 text-center shadow-lg shadow-success/5">
        <span
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl text-white"
          aria-hidden="true"
        >
          ✓
        </span>
        <h1 className="font-display text-navy mt-4 text-3xl font-semibold lg:text-4xl">
          You&apos;re booked{hotelMeta?.city ? ` — see you in ${hotelMeta.city}` : ''}
        </h1>
        <p className="text-navy/60 mt-2 text-sm" id="conf-email-line">
          Confirmation for {res.guest.firstName} {res.guest.lastName} · booked under{' '}
          {res.guest.email}
        </p>
        <div className="bg-paper border-navy/10 mt-5 inline-flex items-center gap-3 rounded-2xl border px-5 py-3">
          <span className="text-navy/50 text-xs font-semibold tracking-widest uppercase">
            Reference
          </span>
          <strong id="conf-ref" className="font-display text-navy text-xl tracking-wider">
            {res.reference}
          </strong>
          <Button
            type="button"
            id="conf-copy"
            onClick={copyRef}
            variant="ghost"
            className="text-navy/45 hover:text-navy"
            aria-label="Copy reference"
          >
            {copied === 'ref' ? <span className="text-success">✓</span> : '⧉'}
          </Button>
        </div>
        <p className="text-navy/45 mt-3 text-xs">
          Keep this reference — you&apos;ll need it to manage your stay.
        </p>
      </div>
      )}

      {/* actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild className="shadow-navy/15 rounded-2xl px-4 py-3.5">
          <a href={`/reservation?ref=${encodeURIComponent(res.reference)}`}>Manage booking</a>
        </Button>
        <Button asChild variant="outline" className="rounded-2xl px-4 py-3.5">
          <a href={`/checkin?ref=${encodeURIComponent(res.reference)}`}>Online check-in</a>
        </Button>
        <Button
          type="button"
          onClick={shareLink}
          variant="outline"
          className="rounded-2xl px-4 py-3.5"
        >
          Share confirmation
        </Button>
        <Button
          type="button"
          onClick={downloadIcs}
          variant="outline"
          className="rounded-2xl px-4 py-3.5"
        >
          Add to calendar
        </Button>
      </div>

      {/* stay details — timeline lives at the top of the same card instead of
          its own full-width one above: one document, not a stack of cards
          for what's really a single "your stay" story. */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-8">
          <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
            Your stay at a glance
          </h2>
          <ol id="timeline" className="mt-4 grid gap-4 sm:grid-cols-4">
            {[
              [
                res.status === 'confirmed' ? 'Booking confirmed' : 'Booking received',
                `Today · ${res.reference}`,
                true,
              ],
              ['Payment', paymentLabel, paymentDone],
              ['Check-in', `${fmtShort(checkinD)} · 15:00`, true],
              [
                'Check-out',
                `${fmtShort(checkoutD)} · 11:00 · ${n} ${n === 1 ? 'night' : 'nights'}`,
                false,
              ],
            ].map(([t, sub, on]) => (
              <li key={t as string} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 rounded-full ${on ? 'bg-gold' : 'bg-navy/20'}`}
                />
                <span>
                  <span className="text-navy block text-sm font-semibold">{t}</span>
                  <span className="text-navy/55 mt-0.5 block text-xs">{sub}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="border-navy/10 mt-6 border-t pt-6">
          <div id="conf-room" className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image(roomLine?.roomTypeImageUrl || IMG_FALLBACK, 400)}
              alt={roomName}
              className="h-20 w-20 rounded-2xl object-cover"
            />
            <div className="min-w-0">
              <p className="font-display text-navy text-xl font-semibold">{roomName}</p>
              <p className="text-navy/55 mt-0.5 text-xs">
                {planName || 'Room'}
                {roomLine?.nights ? ` · ${roomLine.nights} night${roomLine.nights !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Check-in
              </dt>
              <dd className="text-navy mt-1 font-semibold">{fmt(checkinD)} · from 15:00</dd>
            </div>
            <div>
              <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Check-out
              </dt>
              <dd className="text-navy mt-1 font-semibold">{fmt(checkoutD)} · by 11:00</dd>
            </div>
            <div>
              <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Guests
              </dt>
              <dd className="text-navy mt-1">{`${res.adults} adults${res.children ? `, ${res.children} child${res.children > 1 ? 'ren' : ''}` : ''}`}</dd>
            </div>
            <div>
              <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">Rate</dt>
              <dd className="text-navy mt-1">
                {planName || 'Standard rate'}
                {res.discountAmount > 0 ? ' · promo applied' : ''}
              </dd>
            </div>
          </dl>
          {/* Extras are itemized once, in the price summary — repeating them
              as their own list here duplicated the same rows and the same
              money. `extras` still resolves the catalog names that the
              summary renders. */}
          <div className="border-navy/10 mt-6 border-t pt-5">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Contact &amp; arrival
            </h2>
            <p
              className="text-navy/80 mt-2 text-sm"
              id="c-contact"
            >{`${res.guest.firstName} ${res.guest.lastName} · ${res.guest.email}${res.guest.phone ? ` · ${res.guest.phone}` : ''}`}</p>
          </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-navy/10 rounded-3xl border bg-white p-6">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Price summary
            </h2>
            <div id="conf-price" className="mt-4">
              <QuoteTable
                quote={{
                  perNight: price.perNight,
                  nights: price.nights,
                  rooms: price.rooms,
                  roomSubtotal: price.roomSubtotal,
                  discount: price.discount,
                  taxedBase: price.taxedBase,
                  taxes: price.taxes,
                  extrasTotal: price.extrasTotal,
                  total: price.total,
                  originalTotal: price.originalTotal,
                  extras: extraLines,
                }}
                currency={currency}
                totalLabel="Paid total"
                highlight
                note={
                  paymentDone
                    ? 'Payment processed.'
                    : res.paymentStatus === 'failed'
                      ? 'Payment failed — retry from Manage booking.'
                      : 'Payment pending — complete it from Manage booking.'
                }
              />
            </div>
          </div>
          <div className="bg-navy-dark rounded-3xl p-6 text-white">
            <h2 className="text-gold-light text-xs font-semibold tracking-widest uppercase">
              Mobile key
            </h2>
            <div className="mt-4 flex justify-center rounded-2xl bg-white p-4" id="conf-qr">
              <QR value={res.reference} size={120} />
            </div>
            <p className="mt-3 text-xs text-white/60">
              Show this at arrivals to check in faster.
            </p>
          </div>
        </div>
      </div>

      <p className="text-navy/40 mt-10 text-center text-[11px]">
        Keep your reference handy — you can manage or cancel your booking anytime.
      </p>
    </div>
  );
}
