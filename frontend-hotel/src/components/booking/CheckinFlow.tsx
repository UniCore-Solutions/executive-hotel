'use client';

/** Online check-in wizard — port of checkin.js (FORM-6 / KIOSK-2). */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { reservations } from '@/services/reservations';
import { image } from '@/services/availability';
import { PROPERTY } from '@/data';
import { fromISODate, fmtShort, toISODate } from '@/lib/dates';
import { useToast } from '@/context/ToastContext';
import { ARRIVAL_SLOTS } from '@/constants/booking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Reservation } from '@/types';

export default function CheckinFlow() {
  const params = useSearchParams();
  const { toast } = useToast();

  const [view, setView] = useState<'loading' | 'missing' | 'already' | 'form'>('loading');
  const [res, setRes] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [arrival, setArrival] = useState(ARRIVAL_SLOTS[0]);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const refText = (params.get('ref') || '').trim().toUpperCase();
    const t = setTimeout(() => {
      if (!refText) {
        setView('missing');
        return;
      }
      const r = reservations.byRef(refText);
      if (!r) {
        setView('missing');
        return;
      }
      setRes(r);
      if (r.status === 'cancelled') {
        setView('missing');
        setMsg("This reservation was cancelled, so online check-in isn't available.");
        return;
      }
      if (r.checkedIn || r.status === 'checked-in') {
        setView('already');
        return;
      }
      setName(`${r.guest.firstName} ${r.guest.lastName}`.trim() || '');
      setArrival(
        r.guest.arrival && r.guest.arrival.includes('–') ? r.guest.arrival : ARRIVAL_SLOTS[0]
      );
      setPhone(r.guest.phone || '');
      setNotes(r.guest.requests || '');
      setView('form');
    }, 0);
    return () => clearTimeout(t);
  }, [params]);

  const stayRoom: { name: string; images?: string[] } | null = res
    ? PROPERTY.rooms.find((x) => x.id === res.roomId) ??
      (res.roomName ? { name: res.roomName } : null)
    : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!res) return;
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
    setTimeout(() => {
      reservations.update(res.ref, {
        checkedIn: true,
        status: 'checked-in',
        checkedInAt: toISODate(new Date()),
        arrivalDoc: doc.trim(),
        arrival,
        checkedInByName: name.trim(),
        notes: notes.trim(),
      });
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

  if (view === 'loading') return null;

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
              : 'Open this page from the “Online check-in” link on your confirmation.'}
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
            Welcome to Executive Boutique Hotel Rabat. Your room is ready from 15:00 — show your
            reference at reception.
          </p>
          <p className="font-display text-navy mt-4 text-xl font-semibold tracking-wider">
            {res?.ref}
          </p>
        </div>
      ) : null}

      {view === 'form' && res && stayRoom ? (
        <div className="border-navy/10 mt-8 rounded-3xl border bg-white p-6 lg:p-8">
          <div className="border-navy/10 bg-paper flex items-center gap-3 rounded-2xl border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image(stayRoom.images?.[0] ?? '', 300)}
              alt={stayRoom.name}
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="text-navy text-sm font-semibold">{stayRoom.name}</p>
              <p className="text-navy/55 text-xs">
                {fmtShort(fromISODate(res.checkin))} → {fmtShort(fromISODate(res.checkout))} ·{' '}
                {res.ref}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
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
                Required at arrival by Moroccan law. Stored only for this demo.
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
                {busy ? 'Checking you in…' : 'Complete check-in'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
