'use client';

/* Retry payment — for a reservation whose payment attempt failed (see
   ConfirmationFlow's "Try another card" CTA). The reservation already
   exists and still holds the room (BOOKING_PAYMENT_UX_PLAN §2: a decline
   leaves the hold in place so the guest can retry before it expires); this
   screen only ever starts a NEW payment attempt against that SAME
   reservation — it never creates another one. */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { reservations, type BackendReservation } from '@/services/reservations';
import { startPaymentAttempt } from '@/services/payment';
import { generateIdempotencyKey } from '@/services/reservations';
import { fmtPrice } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import { validCard, validExpiry, validCvc, fmtCardNumber, fmtExpiry } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PayErrors = Partial<Record<'pname' | 'pnumber' | 'pexp' | 'pcvc', string>>;

export default function RetryPaymentFlow({ reference, email }: { reference: string; email: string }) {
  const router = useRouter();
  const { fmt, currency } = useCurrency();
  // Lazy initial state: "no reference/email at all" is knowable from props
  // alone, so it never needs a round trip through the effect below — `null`
  // (not found) from the first render rather than a synchronous setState.
  const [res, setRes] = useState<BackendReservation | null | undefined>(() =>
    !reference || !email ? null : undefined
  );
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState<PayErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reference || !email) return;
    let alive = true;
    reservations
      .find(reference, email, { fresh: true })
      .then((found) => alive && setRes(found))
      .catch(() => alive && setRes(null));
    return () => {
      alive = false;
    };
  }, [reference, email]);

  if (res === undefined) {
    return (
      <div className="border-navy/10 rounded-3xl border bg-white p-12 text-center">
        <p className="text-navy/50 text-sm">Loading your reservation…</p>
      </div>
    );
  }

  if (!res) {
    return (
      <div className="border-navy/10 rounded-3xl border bg-white p-12 text-center">
        <p className="font-display text-navy text-2xl font-semibold">
          We couldn&apos;t find that reservation
        </p>
        <p className="text-navy/60 mt-2 text-sm">
          Check the link from your confirmation email, or look it up directly.
        </p>
        <Button asChild className="mt-6 shadow-none">
          <a href="/reservation">Find my reservation</a>
        </Button>
      </div>
    );
  }

  if (res.status === 'cancelled') {
    return (
      <div className="border-navy/10 rounded-3xl border bg-white p-12 text-center">
        <p className="font-display text-navy text-2xl font-semibold">This hold has expired</p>
        <p className="text-navy/60 mx-auto mt-2 max-w-sm text-sm">
          Reservation {res.reference} was released because payment wasn&apos;t completed in
          time. Please make a new booking — the room may still be available.
        </p>
        <Button asChild className="mt-6 shadow-none">
          <a href="/search">Search rooms</a>
        </Button>
      </div>
    );
  }

  if (res.paymentStatus === 'captured') {
    return (
      <div className="border-success/20 rounded-3xl border bg-white p-12 text-center">
        <p className="font-display text-navy text-2xl font-semibold">Already paid</p>
        <p className="text-navy/60 mt-2 text-sm">
          Reservation {res.reference} is already confirmed — no further payment is needed.
        </p>
        <Button asChild className="mt-6 shadow-none">
          <a href={`/confirmation?ref=${encodeURIComponent(res.reference)}&email=${encodeURIComponent(email)}`}>
            View confirmation
          </a>
        </Button>
      </div>
    );
  }

  const roomName = res.roomLines[0]?.roomTypeName ?? 'your room';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: PayErrors = {};
    if (!card.name.trim()) errs.pname = 'Enter the name on the card.';
    if (!validCard(card.number)) errs.pnumber = 'Enter a valid card number.';
    if (!validExpiry(card.expiry)) errs.pexp = 'Enter a valid future expiry.';
    if (!validCvc(card.cvc)) errs.pcvc = 'Enter a valid CVC.';
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      // No payment has captured for this reservation yet (the 'captured' and
      // 'cancelled' cases both return early above), so the full amount is due.
      await startPaymentAttempt({
        reservationId: res.id,
        amount: res.totalAmount,
        idempotencyKey: generateIdempotencyKey(),
        guestEmail: email,
      });
      router.push(
        `/confirmation?ref=${encodeURIComponent(res.reference)}&email=${encodeURIComponent(email)}&status=processing`
      );
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Could not start the payment. Please try again.');
    }
  };

  return (
    <section className="border-navy/10 mx-auto max-w-xl rounded-3xl border bg-white p-6 sm:p-8" aria-label="Retry payment">
      <h1 className="font-display text-navy text-2xl font-semibold">Try another card</h1>
      <p className="text-navy/55 mt-1 text-sm">
        {roomName} for reservation <strong>{res.reference}</strong> is still held. Amount due:{' '}
        <strong>{fmtPrice(res.totalAmount, currency)}</strong>.
      </p>

      {error ? (
        <div className="bg-clay/10 border-clay/25 text-clay mt-5 rounded-2xl border px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      ) : null}

      <form className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2" onSubmit={submit} noValidate>
        <div className="sm:col-span-2">
          <Label htmlFor="r-name">Name on card</Label>
          <Input
            size="sm"
            id="r-name"
            type="text"
            autoComplete="cc-name"
            placeholder="ADAM BENALI"
            value={card.name}
            onChange={(e) => {
              setCard({ ...card, name: e.target.value });
              setErrors({ ...errors, pname: undefined });
            }}
            className="uppercase"
            aria-invalid={!!errors.pname}
          />
          {errors.pname ? <p className="text-clay mt-1.5 text-[11px] font-medium">{errors.pname}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="r-number">Card number</Label>
          <Input
            size="sm"
            id="r-number"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4000 0000 0000 0000"
            value={card.number}
            onChange={(e) => {
              setCard({ ...card, number: fmtCardNumber(e.target.value) });
              setErrors({ ...errors, pnumber: undefined });
            }}
            className="tracking-wider"
            aria-invalid={!!errors.pnumber}
          />
          {errors.pnumber ? <p className="text-clay mt-1.5 text-[11px] font-medium">{errors.pnumber}</p> : null}
        </div>
        <div>
          <Label htmlFor="r-exp">Expiry</Label>
          <Input
            size="sm"
            id="r-exp"
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={card.expiry}
            onChange={(e) => {
              setCard({ ...card, expiry: fmtExpiry(e.target.value) });
              setErrors({ ...errors, pexp: undefined });
            }}
            aria-invalid={!!errors.pexp}
          />
          {errors.pexp ? <p className="text-clay mt-1.5 text-[11px] font-medium">{errors.pexp}</p> : null}
        </div>
        <div>
          <Label htmlFor="r-cvc">CVC</Label>
          <Input
            size="sm"
            id="r-cvc"
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={card.cvc}
            onChange={(e) => {
              setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) });
              setErrors({ ...errors, pcvc: undefined });
            }}
            aria-invalid={!!errors.pcvc}
          />
          {errors.pcvc ? <p className="text-clay mt-1.5 text-[11px] font-medium">{errors.pcvc}</p> : null}
        </div>
        <div className="border-navy/10 flex items-center justify-between gap-3 border-t pt-5 sm:col-span-2">
          <p className="text-navy/45 text-[11px]">No charge until this attempt is processed.</p>
          <Button type="submit" size="lg" disabled={submitting} className="rounded-2xl text-sm">
            {submitting ? 'Processing…' : `Pay ${fmt(res.totalAmount)}`}
          </Button>
        </div>
      </form>
    </section>
  );
}
