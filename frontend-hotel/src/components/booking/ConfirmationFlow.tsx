'use client';

/* Confirmation — port of confirmation.js: success header with reference +
   copy, stay timeline, action links (manage / check-in / share), stay details,
   price summary, demo mobile-key QR, the D-3 .ics download, and a
   Reservation JSON-LD injected the same way the reference does (RC.jsonld). */

import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROPERTY, EXTRAS } from '@/data';
import { useToast } from '@/context/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { reservations } from '@/services/reservations';
import { buildIcs } from '@/lib/ics';
import { fmt, fmtShort, fromISODate, nightsBetween } from '@/lib/dates';
import { fmtPrice, planLabel } from '@/lib/format';
import { image } from '@/services/availability';
import { QR } from '@/components/ui/QR';
import { QuoteTable } from '@/components/ui/QuoteTable';
import type { Reservation } from '@/types';

export default function ConfirmationFlow() {
  const searchParams = useSearchParams();
  const ref = useMemo(
    () =>
      String(searchParams?.get('ref') ?? '')
        .trim()
        .toUpperCase(),
    [searchParams]
  );
  const [res, setRes] = useState<Reservation | null>(null);
  const [copied, setCopied] = useState('');
  const { toast } = useToast();
  const { currency } = useCurrency();

  useEffect(() => {
    if (!ref) return;
    const t = setTimeout(() => setRes(reservations.byRef(ref)), 0);
    return () => clearTimeout(t);
  }, [ref]);

  useEffect(() => {
    if (!res) return;
    const roomStore = PROPERTY.rooms.find((r) => r.id === res.roomId);
    const roomName = res.roomName ?? roomStore?.name ?? 'Room';
    const hotelName = res.hotelName ?? PROPERTY.name;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Reservation',
      reservationNumber: res.ref,
      reservationStatus: 'https://schema.org/Confirmed',
      underName: { '@type': 'Person', name: `${res.guest.firstName} ${res.guest.lastName}` },
      reservationFor: {
        '@type': 'HotelRoom',
        name: roomName,
        hotel: {
          '@type': 'Hotel',
          name: hotelName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: PROPERTY.city,
            addressCountry: 'MA',
          },
        },
      },
      checkinTime: res.checkin,
      checkoutTime: res.checkout,
      totalPrice: {
        '@type': 'MonetaryAmount',
        price: res.price?.total || 0,
        currency: res.price?.currency || 'MAD',
      },
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(el);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, [res]);

  if (!res) {
    return (
      <div id="ref-missing" className="border-navy/10 rounded-3xl border bg-white p-12 text-center">
        <p className="font-display text-navy text-2xl font-semibold">
          We couldn&apos;t find that booking
        </p>
        <p className="text-navy/60 mt-2 text-sm">
          Check the reference in the link, or look up your reservation with your email instead.
        </p>
        <a
          href="/reservation"
          className="bg-navy hover:bg-navy-light mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase transition-colors"
        >
          My reservation
        </a>
      </div>
    );
  }

  const roomStore = PROPERTY.rooms.find((r) => r.id === res.roomId);
  const roomName = res.roomName ?? roomStore?.name ?? 'Room';
  const hotelName = res.hotelName ?? PROPERTY.name;
  const price = res.price || {};
  const extras = (res.extras || [])
    .map((x) => {
      const snap = (res.extrasSnapshot ?? []).find((e) => e.id === x.id);
      if (snap) return { name: snap.name, price: snap.price, qty: x.qty || 1, unit: snap.unit };
      const def = EXTRAS.find((e) => e.id === x.id);
      return def ? { ...def, qty: x.qty || 1 } : null;
    })
    .filter(Boolean) as Array<{ name: string; price: number; qty: number; unit: string }>;
  const checkinD = fromISODate(res.checkin);
  const checkoutD = fromISODate(res.checkout);
  const n = Math.max(1, nightsBetween(checkinD, checkoutD));

  const downloadIcs = () => {
    const ics = buildIcs({
      summary: `${roomName} — ${hotelName}`,
      location: PROPERTY.location.address,
      description: `Booking ${res.ref} · ${planLabel(res.planId)}${res.promo ? ` · promo ${res.promo}` : ''}\nCheck-in from 15:00 — check-out by 11:00.`,
      dtStart: res.checkin,
      dtEnd: res.checkout,
      uid: `${res.ref}@executivehotel.example`,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${res.ref}.ics`;
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
      await navigator.clipboard.writeText(res.ref);
      setCopied('ref');
      toast({ message: 'Reference copied.', type: 'ok' });
    } catch {
      toast({ message: res.ref, type: 'info' });
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
        message: 'Email is not available in this prototype — your details are on screen.',
        type: 'info',
        title: 'Share unavailable',
      });
    }
  };

  return (
    <div id="confirmation">
      {/* success header */}
      <div className="rounded-3xl border border-emerald-700/20 bg-white p-8 text-center shadow-lg shadow-emerald-900/5">
        <span
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-2xl text-white"
          aria-hidden="true"
        >
          ✓
        </span>
        <h1 className="font-display text-navy mt-4 text-3xl font-semibold lg:text-4xl">
          You&apos;re booked — see you in Rabat
        </h1>
        <p className="text-navy/60 mt-2 text-sm" id="conf-email-line">
          Confirmation for {res.guest.firstName} {res.guest.lastName} sent to {res.guest.email}
        </p>
        <div className="bg-paper border-navy/10 mt-5 inline-flex items-center gap-3 rounded-2xl border px-5 py-3">
          <span className="text-navy/50 text-xs font-semibold tracking-widest uppercase">
            Reference
          </span>
          <strong id="conf-ref" className="font-display text-navy text-xl tracking-wider">
            {res.ref}
          </strong>
          <Button
            type="button"
            id="conf-copy"
            onClick={copyRef}
            variant="ghost"
            className="text-navy/45 hover:text-navy"
            aria-label="Copy reference"
          >
            {copied === 'ref' ? <span className="text-emerald-700">✓</span> : '⧉'}
          </Button>
        </div>
        <p className="text-navy/45 mt-3 text-xs">
          Keep this reference — you&apos;ll need it to manage your stay.
        </p>
      </div>

      {/* timeline */}
      <div className="border-navy/10 mt-6 rounded-3xl border bg-white p-6 lg:p-8">
        <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
          Your stay at a glance
        </h2>
        <ol id="timeline" className="mt-5 grid gap-4 sm:grid-cols-4">
          {[
            ['Booking confirmed', `Today · ${res.ref}`, true],
            ['Payment', 'Simulated & settled', true],
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
      </div>

      {/* actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild className="shadow-navy/15 rounded-2xl px-4 py-3.5">
          <a href={`/reservation?ref=${encodeURIComponent(res.ref)}`}>Manage booking</a>
        </Button>
        <Button asChild variant="outline" className="rounded-2xl px-4 py-3.5">
          <a href={`/checkin?ref=${encodeURIComponent(res.ref)}`}>Online check-in</a>
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

      {/* stay details */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-8">
          <div id="conf-room" className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image(roomStore?.images[0] ?? '', 400)}
              alt={roomName}
              className="h-20 w-20 rounded-2xl object-cover"
            />
            <div className="min-w-0">
              <p className="font-display text-navy text-xl font-semibold">{roomName}</p>
              <p className="text-navy/55 mt-0.5 text-xs">
                {planLabel(res.planId)}
                {roomStore?.bed ? ` · ${roomStore.bed}` : ''}
                {roomStore?.size ? ` · ${roomStore.size}` : ''}
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
              <dd className="text-navy mt-1">{`${res.adults} adults${res.children ? `, ${res.children} child${res.children > 1 ? 'ren' : ''}` : ''}${res.childrenAges && res.children ? ` (ages ${res.childrenAges.join(', ')})` : ''}`}</dd>
            </div>
            <div>
              <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">Rate</dt>
              <dd className="text-navy mt-1">
                {planLabel(res.planId)}
                {res.promo ? ` · code ${res.promo}` : ''}
              </dd>
            </div>
          </dl>
          <div className="border-navy/10 mt-6 border-t pt-5">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Extras &amp; services
            </h2>
            {extras.length ? (
              <ul id="conf-extras" className="text-navy/80 mt-3 space-y-2 text-sm">
                {extras.map((x) => (
                  <li key={x.name} className="flex items-center justify-between gap-3">
                    <span>
                      {x.name} × {x.qty}
                      {x.unit === 'per person' ? ' (per person)' : ''}
                    </span>
                    <strong className="text-navy">{fmtPrice(x.price * x.qty, currency)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p id="conf-no-extras" className="text-navy/50 mt-3 text-sm">
                None booked — you can add extras any time before arrival.
              </p>
            )}
          </div>
          <div className="border-navy/10 mt-6 border-t pt-5">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Contact &amp; arrival
            </h2>
            <p
              className="text-navy/80 mt-2 text-sm"
              id="c-contact"
            >{`${res.guest.title} ${res.guest.firstName} ${res.guest.lastName} · ${res.guest.email} · ${res.guest.phone}`}</p>
            <p
              className="text-navy/55 mt-1 text-xs"
              id="c-arrival"
            >{`Arrival ${res.guest.arrival || '15:00 – 18:00'}${res.guest.requests ? ` · Requests: ${res.guest.requests}` : ''}`}</p>
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
                  perNight: price.perNight || 0,
                  nights: price.nights || n,
                  rooms: res.rooms || 1,
                  roomSubtotal: price.roomSubtotal || 0,
                  discount: price.discount || 0,
                  taxedBase: 0,
                  taxes: price.taxes || 0,
                  extrasTotal: price.extrasTotal || 0,
                  total: price.total || 0,
                  originalTotal: price.originalTotal || 0,
                  promo: { valid: !!res.promo, code: res.promo || '', offer: null, message: '' },
                }}
                currency={currency}
                totalLabel="Paid total"
                highlight
                note="simulated payment, no card stored."
              />
            </div>
          </div>
          <div className="bg-navy-dark rounded-3xl p-6 text-white">
            <h2 className="text-gold-light text-xs font-semibold tracking-widest uppercase">
              Mobile key
            </h2>
            <div className="mt-4 flex justify-center rounded-2xl bg-white p-4" id="conf-qr">
              <QR value={res.ref} size={120} />
            </div>
            <p className="mt-3 text-xs text-white/60">
              Show this at arrivals to check in faster. In production this QR would open your mobile
              room key (demo).
            </p>
          </div>
        </div>
      </div>

      <p className="text-navy/40 mt-10 text-center text-[11px]">
        Payment simulated in this prototype — no card details are stored. A confirmation email would
        be sent to the address above.
      </p>
    </div>
  );
}
