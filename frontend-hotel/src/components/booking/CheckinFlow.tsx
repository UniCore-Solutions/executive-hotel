'use client';

/** Online check-in wizard — port of checkin.js (FORM-6 / KIOSK-2). */
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { reservations, type BackendReservation } from '@/services/reservations';
import { GraphqlClientError } from '@/services/graphqlClient';
import { image } from '@/services/availability';
import { fromISODate, fmtShort } from '@/lib/dates';
import { useToast } from '@/context/ToastContext';
import { ARRIVAL_SLOTS } from '@/constants/booking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CheckinFlow() {
  const params = useSearchParams();
  const { toast } = useToast();

  const refText = (params.get('ref') || '').trim().toUpperCase();
  const [view, setView] = useState<'missing' | 'already' | 'form'>(() =>
    refText ? 'form' : 'missing'
  );
  const [res, setRes] = useState<BackendReservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [arrival, setArrival] = useState(ARRIVAL_SLOTS[0]);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const lookupAndPopulate = async (ref: string, email: string) => {
    setBusy(true);
    try {
      const r = await reservations.find(ref, email);
      if (!r) {
        setMsg('No reservation found for those details.');
        setView('missing');
        return;
      }
      setRes(r);
      if (r.status === 'cancelled') {
        setView('missing');
        setMsg("This reservation was cancelled, so online check-in isn't available.");
        return;
      }
      if (r.status === 'checked_in') {
        setView('already');
        return;
      }
      setName(`${r.guest.firstName} ${r.guest.lastName}`.trim() || '');
      setPhone(r.guest.phone || '');
      setView('form');
    } catch (err) {
      // The lookup query throws NOT_FOUND rather than resolving to null (the
      // `if (!r)` branch above is unreachable for that case in practice) —
      // its message is already guest-appropriate, so surface it directly.
      if (err instanceof GraphqlClientError && err.code === 'NOT_FOUND') {
        setMsg(err.message);
        setView('missing');
      } else {
        setMsg('Could not look up your reservation. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const refText = (params.get('ref') || '').trim().toUpperCase();

    // If we haven't looked up the reservation yet, do that first
    if (!res) {
      const email = emailInput.trim();
      if (!refText || !email) {
        setMsg('Enter your reference and the email used at booking.');
        return;
      }
      lookupAndPopulate(refText, email);
      return;
    }

    const errs: string[] = [];
    if (name.trim().length < 2) errs.push('Enter the lead guest name.');
    if (doc.trim().length < 5) errs.push('Enter a valid ID / passport number.');
    if (!/^[+\d][\d\s.-]{6,}$/.test(phone.trim())) errs.push('Enter a valid mobile number.');
    if (errs.length) {
      setMsg(errs.join(' '));
      return;
    }
    setMsg('');
    setBusy(true);
    // Backend has no check-in mutation — mark as checked in client-side
    setTimeout(() => {
      toast({
        message: `Welcome, ${name.trim()} — your room is ready from 15:00.`,
        type: 'ok',
        title: 'Checked in',
      });
      setBusy(false);
      setView('already');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 900);
  };

  return (
    <div>
      {view === 'missing' ? (
        <div className="border-navy/10 mt-8 rounded-3xl border bg-white p-10 text-center">
          <p className="font-display text-navy text-xl font-semibold">
            {msg || 'Booking not found'}
          </p>
          <p className="text-navy/60 mt-2 text-sm">
            {msg
              ? "When a booking is cancelled, online check-in can't be completed."
              : 'Open this page from the "Online check-in" link on your confirmation.'}
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/reservation">Find my reservation</Link>
          </Button>
        </div>
      ) : null}

      {view === 'already' ? (
        <div className="mt-8 rounded-3xl border border-emerald-700/20 bg-white p-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-2xl text-white">
            ✓
          </span>
          <p className="font-display text-navy mt-4 text-2xl font-semibold">
            You&apos;re all checked in
          </p>
          <p className="text-navy/60 mt-2 text-sm">
            Welcome to Executive Hotel. Your room is ready from 15:00 — show your
            reference at reception.
          </p>
          <p className="font-display text-navy mt-4 text-xl font-semibold tracking-wider">
            {res?.reference}
          </p>
        </div>
      ) : null}

      {view === 'form' ? (
        <div className="border-navy/10 mt-8 rounded-3xl border bg-white p-6 lg:p-8">
          {res ? (
            <div className="border-navy/10 bg-paper flex items-center gap-3 rounded-2xl border p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image(res.roomLines[0]?.roomTypeId ?? '', 300)}
                alt="Room"
                className="h-14 w-14 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="text-navy text-sm font-semibold">Room</p>
                <p className="text-navy/55 text-xs">
                  {fmtShort(fromISODate(res.checkInDate))} → {fmtShort(fromISODate(res.checkOutDate))} ·{' '}
                  {res.reference}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-paper border-navy/10 rounded-2xl border p-4">
              <p className="text-navy/60 text-sm">
                Enter your booking reference and email to start check-in.
              </p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
            {!res ? (
              <>
                <div className="sm:col-span-2">
                  <Label htmlFor="ci-email">Email used at booking *</Label>
                  <Input
                    id="ci-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    size="sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <Label htmlFor="ci-name">Lead guest *</Label>
                  <Input
                    id="ci-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    size="sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="ci-doc">ID / passport number *</Label>
                  <Input
                    id="ci-doc"
                    type="text"
                    value={doc}
                    onChange={(e) => setDoc(e.target.value)}
                    placeholder="e.g. BE1234567"
                    autoComplete="off"
                    size="sm"
                    className="uppercase"
                  />
                  <p className="text-navy/45 mt-1 text-[11px]">
                    Required at arrival by Moroccan law.
                  </p>
                </div>
                <div>
                  <Label htmlFor="ci-arrival">Arrival time *</Label>
                  <select
                    id="ci-arrival"
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value)}
                    className="border-navy/15 bg-paper focus:ring-gold/40 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                  >
                    {ARRIVAL_SLOTS.map((slot) => (
                      <option key={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="ci-phone">Mobile (for arrival) *</Label>
                  <Input
                    id="ci-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    size="sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="ci-notes">
                    Anything we should know?{' '}
                    <span className="text-navy/40 font-normal">(optional)</span>
                  </Label>
                  <textarea
                    id="ci-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Late arrival, mobility, celebration…"
                    className="border-navy/15 bg-paper focus:ring-gold/40 w-full resize-none rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                  />
                </div>
              </>
            )}
            <div className="flex items-center justify-end gap-3 pt-1 sm:col-span-2">
              <p
                role="alert"
                className={`mr-auto text-xs ${msg ? 'text-clay font-medium' : 'text-navy/50'}`}
              >
                {msg}
              </p>
              <Button
                type="submit"
                disabled={busy}
                size="lg"
                className="shadow-navy/20 rounded-2xl"
              >
                {busy
                  ? 'Looking up…'
                  : res
                    ? 'Complete check-in'
                    : 'Find my booking'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
