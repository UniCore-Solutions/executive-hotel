'use client';

/* My reservation — port of reservation.js: lookup by ref+email (deep-link
   ?ref= jumps straight in), status banner, stay details, price, demo QR,
   cancellation with fee evaluation, post-booking extras (RES-4), the D-5
   modify dates/occupants dialog, and the check-in CTA when today falls in
   the stay window. State is always re-read from the store after mutations. */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROPERTY, EXTRAS } from '@/data';
import { useToast } from '@/context/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useModal } from '@/context/ModalContext';
import { reservations } from '@/services/reservations';
import { evaluate } from '@/services/cancellation';
import { compute } from '@/services/pricing';
import { fmt, fromISODate, inStayWindow, nightsBetween, toISODate } from '@/lib/dates';
import { fmtPrice, planLabel } from '@/lib/format';
import { image } from '@/services/availability';
import { QuoteTable } from '@/components/ui/QuoteTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QR } from '@/components/ui/QR';
import type { CurrencyCode, PriceBreakdown, Reservation } from '@/types';

const STATUS_META: Record<string, string> = {
  confirmed: 'Confirmed — your stay is locked in. We look forward to welcoming you.',
  'checked-in': 'Checked in — welcome to the hotel! Your room is ready from 15:00.',
  cancelled: 'Cancelled — this reservation is no longer active.',
};

export default function ReservationFlow() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { open } = useModal();

  const deepRef = useMemo(
    () =>
      String(searchParams?.get('ref') ?? '')
        .trim()
        .toUpperCase(),
    [searchParams]
  );
  const [status, setStatus] = useState<'lookup' | 'view'>('lookup');
  const [res, setRes] = useState<Reservation | null>(null);
  const [refInput, setRefInput] = useState(deepRef);
  const [emailInput, setEmailInput] = useState('');
  const [lookupMsg, setLookupMsg] = useState<{ text: string; ok: boolean | null }>({
    text: 'Enter your details below.',
    ok: null,
  });
  const [extrasDraft, setExtrasDraft] = useState<Array<{ id: string; qty: number }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!deepRef) return;
    const t = setTimeout(() => {
      const r = reservations.byRef(deepRef);
      if (r) {
        setRes(r);
        setStatus('view');
      }
    }, 0);
    return () => clearTimeout(t);
  }, [deepRef]);

  const extraDefs = useMemo(() => EXTRAS, []);

  const nights = res
    ? Math.max(1, nightsBetween(fromISODate(res.checkin), fromISODate(res.checkout)))
    : 0;
  const checkingIn = !!res && res.status === 'confirmed' && inStayWindow(res.checkin, res.checkout);

  const doLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const ref = refInput.trim();
      const email = emailInput.trim();
      if (!ref || !email) {
        setLookupMsg({ text: 'Please enter both your reference and email address.', ok: false });
        return;
      }
      const r = reservations.find(ref, email);
      if (!r) {
        setLookupMsg({
          text: 'No reservation found for those details. Check the reference and the email used at booking.',
          ok: false,
        });
        return;
      }
      setLookupMsg({ text: '', ok: null });
      setRes(r);
      setStatus('view');
      setExtrasDraft((r.extras || []).map((x) => ({ id: x.id, qty: x.qty || 1 })));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 350);
  };

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
          className={`mt-3 min-h-5 text-sm font-medium ${lookupMsg.ok === false ? 'text-clay' : lookupMsg.ok === true ? 'text-emerald-700' : 'text-navy/45'}`}
          role="status"
        >
          {lookupMsg.text}
        </p>
        <div className="bg-gold/[0.08] border-gold/25 text-navy/65 mt-5 rounded-2xl border px-4 py-3 text-xs leading-relaxed">
          <strong className="text-gold-dark">Try the demo:</strong> reference{' '}
          <code className="font-mono">RC-DEMO1</code> with email{' '}
          <code className="font-mono">demo@hotelcollection.com</code> (or{' '}
          <code className="font-mono">RC-DEMO2</code> /{' '}
          <code className="font-mono">guest@demo.com</code>, already checked in).
        </div>
      </div>
    );
  }

  const roomStore = PROPERTY.rooms.find((r) => r.id === res.roomId);
  const price = res.price || {};
  const extras = (res.extras || [])
    .map((x) => {
      const def = extraDefs.find((e) => e.id === x.id);
      return def ? { ...def, qty: x.qty || 1 } : null;
    })
    .filter(Boolean) as Array<{
    name: string;
    price: number;
    qty: number;
    unit: string;
    id: string;
  }>;
  const cancelled = res.status === 'cancelled';
  const est = evaluate(res, currency);

  const reload = () => {
    const r = reservations.byRef(res.ref);
    if (r) {
      setRes(r);
      setExtrasDraft((r.extras || []).map((x) => ({ id: x.id, qty: x.qty || 1 })));
    }
  };

  /* ---------- RES-4 extras delta ---------- */
  const extraBase = () =>
    compute({
      perNight: price.perNight || roomStore?.pricePerNight || 0,
      nights,
      rooms: res.rooms || 1,
      extras: res.extras || [],
      promo: res.promo || '',
      planId: res.planId,
      checkin: res.checkin,
    });
  const extraWithDraft = () =>
    compute({
      perNight: price.perNight || roomStore?.pricePerNight || 0,
      nights,
      rooms: res.rooms || 1,
      extras: extrasDraft,
      promo: res.promo || '',
      planId: res.planId,
      checkin: res.checkin,
    });
  const delta = extraWithDraft().total - extraBase().total;
  const sameExtras =
    JSON.stringify((res.extras || []).map((x) => `${x.id}:${x.qty}`).sort()) ===
    JSON.stringify(extrasDraft.map((x) => `${x.id}:${x.qty}`).sort());

  const saveExtras = () => {
    const q = extraWithDraft();
    reservations.update(res.ref, {
      extras: extrasDraft.map((x) => ({ id: x.id, qty: x.qty })),
      price: fullPrice(q),
    });
    toast({
      message: 'Your extras were added — settle them at the hotel.',
      type: 'ok',
      title: 'Updated',
    });
    reload();
  };

  /* ---------- cancellation ---------- */
  const openCancel = () => {
    open(
      <CancelContent
        res={res}
        est={est}
        currency={currency}
        onConfirm={(reason) => {
          reservations.update(res.ref, {
            status: 'cancelled',
            cancelReason: reason,
            cancelledAt: toISODate(new Date()),
          });
          toast({
            message: 'Your reservation has been cancelled.',
            type: 'ok',
            title: 'Cancelled',
          });
          reload();
        }}
      />
    );
  };

  /* ---------- D-5 modify ---------- */
  const openModify = () => {
    open(
      <ModifyDialog
        res={res}
        currency={currency}
        onApply={(patch) => {
          reservations.update(res.ref, patch);
          toast({
            message: 'Your stay was updated — check the new balance below.',
            type: 'ok',
            title: 'Updated',
          });
          reload();
        }}
      />
    );
  };

  const statusText = STATUS_META[res.status] || STATUS_META.confirmed!;
  const statusCls =
    res.status === 'checked-in'
      ? 'bg-emerald-700/8 border border-emerald-700/20 text-emerald-800'
      : res.status === 'cancelled'
        ? 'bg-clay/8 border border-clay/25 text-clay'
        : 'bg-white border border-navy/10';

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
            href={`/checkin?ref=${encodeURIComponent(res.ref)}`}
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
                {res.ref}
              </span>
            </div>
            <div id="view-room" className="mt-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image(roomStore?.images[0] ?? '', 400)}
                alt={roomStore?.name || 'Room'}
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="font-display text-navy text-xl font-semibold">
                  {roomStore?.name || ''}
                </p>
                <p className="text-navy/55 mt-0.5 text-xs">
                  {roomStore?.bed || ''} · {roomStore?.size || ''} · {roomStore?.view || ''}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Check-in
                </dt>
                <dd className="text-navy mt-1 font-semibold">
                  {fmt(fromISODate(res.checkin))} · from 15:00
                </dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Check-out
                </dt>
                <dd className="text-navy mt-1 font-semibold">
                  {fmt(fromISODate(res.checkout))} · by 11:00
                </dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Guests
                </dt>
                <dd className="text-navy mt-1">{`${res.adults} adults${res.children ? `, ${res.children} child${res.children > 1 ? 'ren' : ''}` : ''}${res.childrenAges && res.children ? ` (ages ${res.childrenAges.join(', ')})` : ''}`}</dd>
              </div>
              <div>
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Rate
                </dt>
                <dd className="text-navy mt-1">
                  {planLabel(res.planId)}
                  {res.promo ? ` · promo ${res.promo}` : ''}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Extras &amp; services
                </dt>
                <dd className="text-navy mt-1">
                  {extras.length
                    ? extras.map((x) => `${x.name} × ${x.qty}`).join(' · ')
                    : 'None booked'}
                </dd>
              </div>
            </dl>
            {!cancelled ? (
              <Button
                type="button"
                onClick={openModify}
                variant="ghost"
                className="mt-5 font-bold tracking-widest uppercase"
              >
                Change dates or guests <span aria-hidden="true">→</span>
              </Button>
            ) : null}
          </div>

          <div className="border-navy/10 rounded-3xl border bg-white p-6 lg:p-7" id="extra-panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Add extras before arrival
              </h2>
              <span className="text-navy/45 text-[11px]">
                Charged &amp; settled on the spot (mock)
              </span>
            </div>
            <div id="extra-list" className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ExtrasList
                  extras={extraDefs}
                  selected={extrasDraft}
                  onChange={setExtrasDraft}
                  adults={res.adults}
                  childCount={res.children}
                  currency={currency}
                />
              </div>
            </div>
            <div
              id="extra-delta"
              className={sameExtras || cancelled ? 'hidden' : 'mt-4'}
              aria-live="polite"
            >
              {delta >= 0 ? (
                <div className="bg-paper border-navy/10 rounded-2xl border px-4 py-3 text-sm">
                  <span className="text-navy/60">New balance with extras:</span>{' '}
                  <strong className="text-navy">
                    {fmtPrice(extraWithDraft().total, currency)}
                  </strong>{' '}
                  <span className="text-navy/45 text-xs">(+{fmtPrice(delta, currency)})</span>
                </div>
              ) : (
                <div className="bg-paper border-navy/10 rounded-2xl border px-4 py-3 text-sm">
                  <span className="text-navy/60">Extras removed — new balance:</span>{' '}
                  <strong className="text-navy">
                    {fmtPrice(extraWithDraft().total, currency)}
                  </strong>
                </div>
              )}
            </div>
            <Button
              type="button"
              id="extra-add"
              onClick={saveExtras}
              disabled={sameExtras || cancelled}
              size="sm"
              className="mt-4 py-3"
            >
              Add to my stay
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-navy/10 rounded-3xl border bg-white p-6">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Price summary
            </h2>
            <div id="view-price" className="mt-4">
              <QuoteTable
                quote={fullPrice(price)}
                currency={currency}
                note={
                  cancelled ? 'cancelled — no further charges' : 'settled (simulated) at booking'
                }
              />
            </div>
          </div>
          <div className="border-navy/10 rounded-3xl border bg-white p-6">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Mobile key
            </h2>
            <div className="mt-4 flex justify-center" id="view-qr">
              <QR value={res.ref} size={120} />
            </div>
            <p className="text-navy/45 mt-2 text-center text-[11px]">
              Demo QR — the production version would open your mobile key.
            </p>
          </div>
          <div className="bg-navy-dark rounded-3xl p-6 text-white">
            <h2 className="text-gold-light text-xs font-semibold tracking-widest uppercase">
              Need to cancel?
            </h2>
            <p className="mt-2 text-sm text-white/70" id="cancel-policy-line">
              {cancelled
                ? 'This reservation was already cancelled.'
                : est.freeUntilIso
                  ? `Free cancellation until ${fmt(fromISODate(est.freeUntilIso))}.`
                  : 'Non-refundable rate — the full stay is due.'}
            </p>
            <p className="mt-1 text-xs text-white/50" id="cancel-due-line">
              {!cancelled && res.status === 'confirmed'
                ? est.fee === 0
                  ? 'No fee applies today.'
                  : `Cancelling today would charge ${fmtPrice(est.fee, currency)} (${est.label}).`
                : ''}
            </p>
            <Button
              type="button"
              id="cancel-btn"
              onClick={openCancel}
              disabled={cancelled}
              variant="onDark"
              size="sm"
              className="mt-4 w-full py-3 text-white"
            >
              {cancelled ? 'Already cancelled' : 'Cancel this reservation'}
            </Button>
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

function fullPrice(p: Partial<PriceBreakdown>): PriceBreakdown {
  return {
    perNight: p.perNight || 0,
    nights: p.nights || 1,
    rooms: p.rooms || 1,
    roomSubtotal: p.roomSubtotal || 0,
    discount: p.discount || 0,
    taxedBase: p.taxedBase || 0,
    taxes: p.taxes || 0,
    extrasTotal: p.extrasTotal || 0,
    total: p.total || 0,
    originalTotal: p.originalTotal || 0,
    promo: p.promo ?? undefined,
  };
}

function CancelContent({
  res,
  est,
  currency,
  onConfirm,
}: {
  res: Reservation;
  est: ReturnType<typeof evaluate>;
  currency: CurrencyCode;
  onConfirm: (reason: string) => void;
}) {
  const { close } = useModal();
  const [reason, setReason] = useState('Plans changed');
  const roomStore = PROPERTY.rooms.find((r) => r.id === res.roomId);
  return (
    <>
      <h2 className="font-display text-navy text-xl font-semibold">
        Cancel reservation {res.ref}?
      </h2>
      <p className="text-navy/60 mt-2 text-sm">
        {res.ref} · {roomStore?.name || res.roomId} · {fmt(fromISODate(res.checkin))} →{' '}
        {fmt(fromISODate(res.checkout))}
      </p>
      {est.fee > 0 ? (
        <div className="bg-clay/10 border-clay/25 text-clay mt-4 rounded-2xl border px-4 py-3 text-sm">
          Cancelling now charges <strong>{fmtPrice(est.fee, currency)}</strong> ({est.label}).
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-700/20 bg-emerald-700/8 px-4 py-3 text-sm text-emerald-700">
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

/* ---------- D-5 modify dialog ---------- */
function ModifyDialog({
  res,
  currency,
  onApply,
}: {
  res: Reservation;
  currency: CurrencyCode;
  onApply: (patch: Partial<Reservation>) => void;
}) {
  const { close } = useModal();
  const roomStore = PROPERTY.rooms.find((r) => r.id === res.roomId);
  const perNight = res.price?.perNight || roomStore?.pricePerNight || 0;
  const [checkin, setCheckin] = useState(res.checkin);
  const [checkout, setCheckout] = useState(res.checkout);
  const [adults, setAdults] = useState(res.adults);
  const [children, setChildren] = useState(res.children);
  const [childrenAges, setChildrenAges] = useState<number[]>(
    (res.childrenAges || []).slice(0, res.children)
  );
  const [rooms, setRooms] = useState(res.rooms || 1);
  const [err, setErr] = useState('');

  const n = nightsBetween(fromISODate(checkin), fromISODate(checkout));
  const ci = fromISODate(checkin);
  const co = fromISODate(checkout);
  const todayIso = toISODate(new Date());

  const quote = useMemo(() => {
    if (!n || n < 1) return null;
    let ages = childrenAges;
    while (ages.length < children) ages = [...ages, 4];
    ages = ages.slice(0, children);
    return compute({
      perNight,
      nights: n,
      rooms,
      extras: res.extras || [],
      promo: res.promo || '',
      planId: res.planId,
      checkin,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkin, checkout, adults, children, rooms, perNight, res.extras, res.promo, res.planId]);

  const diff = quote && res.price?.total ? quote.total - res.price.total : 0;

  const apply = () => {
    if (!ci || !co || co <= ci) {
      setErr('Check-out must be after check-in.');
      return;
    }
    if (checkin < todayIso) {
      setErr('Check-in cannot be in the past.');
      return;
    }
    if (rooms > adults) {
      setErr('At least one adult per room.');
      return;
    }
    let ages = childrenAges;
    while (ages.length < children) ages = [...ages, 4];
    ages = ages.slice(0, children);
    if (!quote) return;
    close();
    onApply({
      checkin,
      checkout,
      adults,
      children,
      childrenAges: ages,
      rooms,
      price: {
        perNight: quote.perNight,
        nights: quote.nights,
        rooms: quote.rooms,
        roomSubtotal: quote.roomSubtotal,
        discount: quote.discount,
        taxedBase: quote.taxedBase,
        taxes: quote.taxes,
        extrasTotal: quote.extrasTotal,
        total: quote.total,
        originalTotal: quote.originalTotal,
        currency: 'MAD',
      },
    });
  };

  const step = (
    setter: (v: number) => void,
    cur: number,
    delta: number,
    min: number,
    max: number
  ) => {
    setter(Math.min(max, Math.max(min, cur + delta)));
  };

  return (
    <>
      <h2 className="font-display text-navy text-xl font-semibold">Change your stay</h2>
      <p className="text-navy/60 mt-2 text-sm">
        {res.ref} · {roomStore?.name || res.roomId} — the new balance is quoted before you apply.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="m-checkin">Check-in</Label>
          <Input
            id="m-checkin"
            size="sm"
            type="date"
            value={checkin}
            min={todayIso}
            onChange={(e) => setCheckin(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="m-checkout">Check-out</Label>
          <Input
            id="m-checkout"
            size="sm"
            type="date"
            value={checkout}
            min={checkin}
            onChange={(e) => setCheckout(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-paper border-navy/10 mt-4 space-y-3 rounded-2xl border px-4 py-3">
        <ModStepper
          label="Adults"
          sub="Age 18+"
          value={adults}
          min={1}
          max={9}
          onStep={(d) => step(setAdults, adults, d, 1, 9)}
        />
        <ModStepper
          label="Children"
          sub="Choose an age for each"
          value={children}
          min={0}
          max={6}
          onStep={(d) => step(setChildren, children, d, 0, 6)}
        />
        {children > 0 ? (
          <div className="border-navy/8 space-y-2.5 border-t py-2.5">
            {Array.from({ length: children }, (_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <p className="text-navy text-sm font-medium">Child {i + 1}</p>
                <select
                  value={childrenAges[i] ?? 4}
                  onChange={(e) => {
                    const ages = [...childrenAges];
                    ages[i] = parseInt(e.target.value, 10);
                    setChildrenAges(ages);
                  }}
                  className="border-navy/15 text-navy focus:ring-gold/40 appearance-none rounded-xl border bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none"
                  aria-label={`Age of child ${i + 1}`}
                >
                  {Array.from({ length: 18 }, (_, a) => (
                    <option key={a} value={a}>
                      {a} years
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : null}
        <ModStepper
          label="Rooms"
          sub="1–5 rooms of this type"
          value={rooms}
          min={1}
          max={5}
          onStep={(d) => step(setRooms, rooms, d, 1, 5)}
        />
      </div>

      {err ? (
        <p className="text-clay mt-3 text-sm" role="alert">
          {err}
        </p>
      ) : null}

      <div className="border-navy/10 mt-4 rounded-2xl border bg-white px-4 py-3">
        {quote ? (
          <p className="text-sm">
            <span className="text-navy/60">New balance:</span>{' '}
            <strong className="text-navy">{fmtPrice(quote.total, currency)}</strong>{' '}
            <span className="text-navy/45 text-xs">
              · {n} {n === 1 ? 'night' : 'nights'} · {adults + children}{' '}
              {adults + children === 1 ? 'guest' : 'guests'} · {rooms}{' '}
              {rooms === 1 ? 'room' : 'rooms'}
            </span>
            {res.price?.total && diff !== 0 ? (
              <span
                className={`ml-2 text-xs font-bold ${diff > 0 ? 'text-emerald-700' : 'text-clay'}`}
              >
                {diff > 0
                  ? `+${fmtPrice(diff, currency)}`
                  : `−${fmtPrice(Math.abs(diff), currency)}`}{' '}
                vs current
              </span>
            ) : null}
          </p>
        ) : (
          <p className="text-navy/50 text-sm">Pick valid dates to see the new balance.</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button type="button" onClick={close} variant="ghost" size="sm" className="px-4">
          Keep current stay
        </Button>
        <Button type="button" onClick={apply} disabled={!quote} size="sm">
          Apply changes
        </Button>
      </div>
    </>
  );
}

function ModStepper({
  label,
  sub,
  value,
  min,
  max,
  onStep,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  max: number;
  onStep: (d: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-navy text-sm font-semibold">{label}</p>
        <p className="text-navy/50 text-xs">{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          onClick={() => onStep(-1)}
          disabled={value <= min}
          variant="outline"
          size="icon"
          className="rounded-full text-lg leading-none"
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </Button>
        <span className="text-navy w-9 text-center text-sm font-bold">{value}</span>
        <Button
          type="button"
          onClick={() => onStep(1)}
          disabled={value >= max}
          variant="outline"
          size="icon"
          className="rounded-full text-lg leading-none"
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </Button>
      </div>
    </div>
  );
}

/* Compact full-catalog extras list for the reservation dashboard (mirrors reference renderExtras). */
function ExtrasList({
  extras,
  selected,
  onChange,
  adults,
  childCount: children,
  currency,
}: {
  extras: typeof EXTRAS;
  selected: Array<{ id: string; qty: number }>;
  onChange: (s: Array<{ id: string; qty: number }>) => void;
  adults: number;
  childCount: number;
  currency: CurrencyCode;
}) {
  const guests = adults + children;
  const sel = (id: string) => selected.find((x) => x.id === id) || null;

  const toggle = (id: string) => {
    const s = sel(id);
    const extra = extras.find((e) => e.id === id);
    onChange(
      s
        ? selected.filter((x) => x.id !== id)
        : [...selected, { id, qty: extra?.unit === 'per person' ? guests : 1 }]
    );
  };

  const stepQty = (id: string, delta: number) => {
    const s = sel(id);
    if (!s) return;
    const extra = extras.find((e) => e.id === id);
    const max =
      extra?.unit === 'per person'
        ? Math.max(8, guests)
        : id === 'late-checkout' || id === 'airport-shuttle'
          ? 1
          : 6;
    const qty = Math.min(max, Math.max(1, s.qty + delta));
    onChange(selected.map((x) => (x.id === id ? { ...x, qty } : x)));
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {extras.map((e) => {
        const s = sel(e.id);
        return (
          <label
            key={e.id}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors ${s ? 'border-gold/50 bg-gold/[0.06]' : 'border-navy/12 bg-white'}`}
          >
            <input
              type="checkbox"
              checked={!!s}
              onChange={() => toggle(e.id)}
              className="accent-navy mt-1"
              aria-label={e.name}
            />
            <span className="min-w-0">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-navy text-sm font-semibold">{e.name}</span>
                <span className="text-gold-dark text-xs font-bold">
                  {fmtPrice(e.price, currency)}
                  <span className="text-navy/45 font-medium">
                    {' '}
                    /{e.unit === 'per person' ? 'pp' : 'stay'}
                  </span>
                </span>
              </span>
              <span className="text-navy/55 mt-0.5 block text-[11px]">{e.desc}</span>
              {s ? (
                <span className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => stepQty(e.id, -1)}
                    variant="outline"
                    size="iconSm"
                    className="rounded-full text-sm"
                    aria-label={`Decrease ${e.name}`}
                  >
                    −
                  </Button>
                  <span className="text-navy w-6 text-center text-sm font-bold">{s.qty}</span>
                  <Button
                    type="button"
                    onClick={() => stepQty(e.id, 1)}
                    variant="outline"
                    size="iconSm"
                    className="rounded-full text-sm"
                    aria-label={`Increase ${e.name}`}
                  >
                    +
                  </Button>
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
