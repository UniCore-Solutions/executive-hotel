'use client';

/** Online check-in wizard — lookup is real; the backend has no check-in
    mutation yet, so completion is an honest "not available" state instead
    of a client-side simulation (no fake success). */
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { reservations, type BackendReservation } from '@/services/reservations';
import { GraphqlClientError } from '@/services/graphqlClient';
import { fromISODate, fmtShort } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CheckinFlow() {
  const params = useSearchParams();

  const refText = (params.get('ref') || '').trim().toUpperCase();
  const [view, setView] = useState<'missing' | 'already' | 'unavailable'>(() =>
    refText ? 'unavailable' : 'missing'
  );
  const [res, setRes] = useState<BackendReservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const lookup = async (ref: string, email: string) => {
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
      setView('unavailable');
    } catch (err) {
      // The lookup query throws NOT_FOUND rather than resolving to null —
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
    const ref = (params.get('ref') || '').trim().toUpperCase();
    const email = emailInput.trim();
    if (!ref || !email) {
      setMsg('Enter your reference and the email used at booking.');
      return;
    }
    lookup(ref, email);
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
            Welcome to {res?.roomLines[0]?.roomTypeName ?? 'the hotel'}. Your room is ready from
            15:00 — show your reference at reception.
          </p>
          <p className="font-display text-navy mt-4 text-xl font-semibold tracking-wider">
            {res?.reference}
          </p>
        </div>
      ) : null}

      {view === 'unavailable' ? (
        <div className="mt-8 rounded-3xl border border-navy/10 bg-white p-6 lg:p-8">
          {!res ? (
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <p className="text-navy/60 text-sm">
                Enter your booking reference and email to look up your check-in.
              </p>
              <div>
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
              <div className="flex items-center justify-end gap-3">
                <p
                  role="alert"
                  className={`mr-auto text-xs ${msg ? 'text-clay font-medium' : 'text-navy/50'}`}
                >
                  {msg}
                </p>
                <Button type="submit" disabled={busy} size="lg" className="shadow-navy/20 rounded-2xl">
                  {busy ? 'Looking up…' : 'Find my booking'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <p className="font-display text-navy text-xl font-semibold">
                Online check-in is not available yet
              </p>
              <p className="text-navy/60 mx-auto mt-2 max-w-md text-sm">
                Your booking is confirmed. Online check-in will be available soon —
                until then, show your reference at reception on arrival.
              </p>
              <p className="font-display text-navy mt-4 text-xl font-semibold tracking-wider">
                {res.reference}
              </p>
              <p className="text-navy/50 mt-1 text-sm">
                {res.guest.firstName} {res.guest.lastName} ·{' '}
                {fmtShort(fromISODate(res.checkInDate))} →{' '}
                {fmtShort(fromISODate(res.checkOutDate))}
              </p>
              <Button asChild size="sm" className="mt-5">
                <Link href="/reservation">View my reservation</Link>
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
