'use client';

/* Booking tunnel — stay/summary sidebar with live server-side quote + promo +
   extras, a two-step details→payment form with per-field validation,
   real backend reservation creation and payment capture. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from '@/context/SessionContext';
import { useApollo } from '@/api/apollo/provider';
import { REST_INVALIDATIONS, invalidateGraphql } from '@/api/invalidation';
import { getStayRoom } from '@/services/catalog';
import { getExtras } from '@/services/extras';
import { getQuote, mapQuoteExtraLines } from '@/services/quote';
import { startPaymentAttempt } from '@/services/payment';
import type { Extra, PriceBreakdown } from '@/types';
import { reservations, generateIdempotencyKey } from '@/services/reservations';
import { fmtShort, nightsBetween, stateToParams, toISODate } from '@/lib/dates';
import { hotelRoomURL, roomURL } from '@/lib/links';
import {
  validEmail,
  validExpiry,
  validName,
  validPhone,
  fmtCardNumber,
  fmtExpiry,
} from '@/lib/validation';
import { extrasToParam, parseExtrasParam, type ExtraSelection } from '@/lib/extras';
import { ARRIVAL_SLOTS, TITLES, HOLDS_SECONDS } from '@/constants/booking';
import { Steps } from '@/components/ui/Steps';
import { QuoteTable } from '@/components/ui/QuoteTable';
import { PromoField } from '@/components/ui/PromoField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { PaymentTimingBadge, paymentTimingCopy } from '@/components/ui/PaymentTiming';
import { PhoneField } from '@/components/ui/PhoneField';
import { CountrySelect } from '@/components/ui/CountrySelect';
import Breadcrumb from '@/components/ui/Breadcrumb';
import type { Country } from 'react-phone-number-input';
import { image } from '@/services/availability';

type Title = (typeof TITLES)[number];

const STAY_ICONS = {
  cal: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M8 7V5a4 4 0 0 1 8 0v2m-9 0h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
    />
  ),
  moon: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M21 13.5A8.5 8.5 0 0 1 10.5 3 8.5 8.5 0 1 0 21 13.5Z"
    />
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m9-13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm7 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm2 6.5v-1a3.5 3.5 0 0 0-3-3.45"
    />
  ),
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9.5 21v-5.5h5V21"
    />
  ),
  tag: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M3 6v6l10.5 10.5a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8L12.5 3H6a3 3 0 0 0-3 3Zm13.5-.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
    />
  ),
  clock: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2"
    />
  ),
};

type DetailsErrors = Partial<Record<'first' | 'last' | 'email' | 'phone', string>>;
type PayErrors = Partial<Record<'pname' | 'pnumber' | 'pexp' | 'pcvc' | 'pterms', string>>;

export default function BookingFlow({
  roomId,
  planId,
  initialExtras,
}: {
  roomId: string;
  planId: string;
  initialExtras: string;
}) {
  const router = useRouter();
  const { state, setPromo } = useSearch();
  const { fmt, currency } = useCurrency();
  const { session } = useSession();
  const apollo = useApollo();

  /* Backend-first stay resolution: real room-type UUIDs are resolved via the catalog gateway. */
  const [resolvedFor, setResolvedFor] = useState<{
    id: string;
    data: Awaited<ReturnType<typeof getStayRoom>> | null;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    getStayRoom(undefined, roomId, {
      checkin: state.checkin,
      checkout: state.checkout,
      adults: state.adults,
      children: state.children,
      rooms: state.rooms,
    })
      .then((r) => alive && setResolvedFor({ id: roomId, data: r }))
      .catch(() => alive && setResolvedFor({ id: roomId, data: null }));
    return () => {
      alive = false;
    };
  }, [roomId, state.checkin, state.checkout, state.adults, state.children, state.rooms]);
  const resolved = resolvedFor?.id === roomId ? resolvedFor.data : undefined;

  const room = resolved ? resolved.room : null;
  const plans = useMemo(
    () => (resolved ? resolved.plans : []),
    [resolved]
  );
  const plan = plans.find((p) => p.id === planId) ?? plans[0] ?? null;

  /* Extras catalog follows the resolved hotel; empty until known so backend
     ids never render fixture rows. */
  const [extrasList, setExtrasList] = useState<Extra[]>([]);
  useEffect(() => {
    if (!resolved) return;
    let alive = true;
    getExtras(resolved.property.id)
      .then((list) => alive && setExtrasList(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [resolved]);

  const extraSelInitial = useMemo(() => parseExtrasParam(initialExtras), [initialExtras]);
  /* Selection is fixed for the tunnel — it is made on the room page and
     arrives in the `extras=` URL parameter. */
  const [extrasSel] = useState<ExtraSelection>(extraSelInitial);
  const [step, setStep] = useState<1 | 2>(1);
  const [holdSecs, setHoldSecs] = useState(HOLDS_SECONDS);
  const [declined, setDeclined] = useState('');
  const [paying, setPaying] = useState(false);
  const [details, setDetails] = useState({
    title: 'Mr' as Title,
    first: session ? String(session.firstName ?? session.name.split(' ')[0] ?? '') : '',
    last: session ? String(session.lastName ?? session.name.split(' ').slice(1).join(' ')) : '',
    email: session ? session.email : '',
    phone: session?.phone ?? '',
    country: 'MA' as Country,
    arrival: '15:00 – 18:00',
    requests: '',
  });
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [terms, setTerms] = useState(false);
  const [dErrors, setDErrors] = useState<DetailsErrors>({});
  const [pErrors, setPErrors] = useState<PayErrors>({});

  // Session resolves asynchronously (httpOnly-cookie restore, see
  // SessionContext) — prefill from it once it's known, without clobbering
  // anything the guest has already typed.
  const prefilledFromSession = useRef(false);
  useEffect(() => {
    if (!session || prefilledFromSession.current) return;
    prefilledFromSession.current = true;
    setDetails((d) => ({
      ...d,
      first: d.first || String(session.firstName ?? session.name.split(' ')[0] ?? ''),
      last: d.last || String(session.lastName ?? session.name.split(' ').slice(1).join(' ')),
      email: d.email || session.email,
      phone: d.phone || session.phone || '',
    }));
  }, [session]);

  const hasDates = !!(state.checkin && state.checkout);
  const nights = nightsBetween(state.checkin, state.checkout);
  const validStay = !!room && !!plan && hasDates && nights >= 1;

  const [quoteState, setQuoteState] = useState<{
    quote: PriceBreakdown | null;
    loading: boolean;
    error: string;
  }>({ quote: null, loading: false, error: '' });
  const quoteReqId = useRef(0);

  useEffect(() => {
    if (!plan || !validStay || !state.checkin || !state.checkout) return;
    const reqId = ++quoteReqId.current;
    getQuote({
      hotelId: resolved?.property.id ?? '',
      checkInDate: state.checkin,
      checkOutDate: state.checkout,
      adults: state.adults || 2,
      children: state.children || 0,
      rooms: [{ roomTypeId: room!.id, ratePlanId: plan.backendRatePlanId }],
      extras: extrasSel.map((x) => ({ extraId: x.id, quantity: x.qty })),
      promoCode: state.promo || undefined,
    })
      .then((result) => {
        if (reqId !== quoteReqId.current) return;
        if (result.raw.valid) {
          setQuoteState({
            quote: { ...result.quote, extras: mapQuoteExtraLines(result.raw.extras, extrasList) },
            loading: false,
            error: '',
          });
        } else {
          setQuoteState({
            quote: null,
            loading: false,
            error: result.raw.message || 'Invalid request — try adjusting dates or extras.',
          });
        }
      })
      .catch(() => {
        if (reqId !== quoteReqId.current) return;
        setQuoteState({
          quote: null,
          loading: false,
          error: 'Could not calculate price — please try again.',
        });
      });
  }, [plan, validStay, state.checkin, state.checkout, state.adults, state.children, room, state.rooms, state.promo, extrasSel, extrasList, resolved?.property.id]);

  const quote = quoteState.quote;
  const quoteLoading = !quote && !quoteState.error;
  const quoteError = quoteState.error;

  /* Hold timer — shows how long the quoted rate is valid. */
  useEffect(() => {
    if (!validStay || !state.checkin || !state.checkout) return;
    const t = setInterval(() => {
      setHoldSecs((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Keep the URL in sync with the editable stay (promo/extras) — same pattern as RoomDetails. */
  useEffect(() => {
    if (!validStay) return;
    const extra: Record<string, string> = { room: roomId };
    if (plan?.id) extra.plan = plan.id;
    const p = stateToParams(state, extra);
    if (extrasSel.length) p.set('extras', extrasToParam(extrasSel));
    history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
  }, [validStay, state, roomId, plan, extrasSel]);

  /* Missing pieces → "Nothing to book yet" panel. */
  let missing = false;
  if (!roomId || !planId || !hasDates || nights < 1) missing = true;
  else if (room && plan) missing = false;
  else missing = true;

  const wait = useRef(false);

  /* One idempotency key per checkout attempt for this exact room/dates,
     generated lazily on first render and reused for every retry (double-
     click, decline-then-retry, AND a page reload/tab-reopen) instead of a
     fresh key per submit. The backend's unique constraint on
     reservations.idempotency_key then resolves a retried submit to the SAME
     reservation rather than creating a duplicate.
     Persisted to sessionStorage — not just a useRef — because a plain
     component-mount-scoped ref does NOT survive a reload: a guest who
     reloads (or closes and reopens the tab) after the reservation was
     created but before payment resolved would otherwise mint a fresh key on
     remount and create a SECOND sold reservation for what they experience as
     one attempt (see docs/investigations/BOOKING_PAYMENT_UX_PLAN_2026-08-31.md
     §1's "reload gap" correction). A new key is only produced for a
     genuinely different room/dates — a real new booking. */
  const idemStorageKey = `bk-idem:${roomId}:${planId}:${state.checkin ? toISODate(state.checkin) : ''}:${state.checkout ? toISODate(state.checkout) : ''}`;
  const reservationIdempotencyKeyRef = useRef<string | null>(null);
  if (reservationIdempotencyKeyRef.current === null) {
    let stored: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        stored = window.sessionStorage.getItem(idemStorageKey);
      } catch {
        stored = null;
      }
    }
    const key = stored ?? generateIdempotencyKey();
    reservationIdempotencyKeyRef.current = key;
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(idemStorageKey, key);
      } catch {
        // Private-browsing/storage-disabled — the in-memory ref still works
        // for this mount, it just won't survive a reload.
      }
    }
  }

  const detailsError = (id: keyof DetailsErrors) => dErrors[id] ?? '';
  const payError = (id: keyof PayErrors) => pErrors[id] ?? '';

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: DetailsErrors = {};
    if (!details.first.trim() || !validName(details.first.trim()))
      errs.first = 'Enter your first name.';
    if (!details.last.trim() || !validName(details.last.trim()))
      errs.last = 'Enter your last name.';
    if (!validEmail(details.email.trim())) errs.email = 'Enter a valid email address.';
    if (!validPhone(details.phone.trim())) errs.phone = 'Enter a valid phone number.';
    setDErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: PayErrors = {};
    if (!card.name.trim()) errs.pname = 'Enter the name on the card.';
    if (!validCardNumber(card.number)) errs.pnumber = 'Enter a valid card number.';
    if (!validExpiry(card.expiry)) errs.pexp = 'Enter a valid future expiry.';
    if (!validCvc(card.cvc)) errs.pcvc = 'Enter a valid CVC.';
    if (!terms) errs.pterms = 'Please accept the Terms and Cancellation policy.';
    setPErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    if (!quote || !plan || wait.current) return;
    if (!resolved?.property.id) return;
    wait.current = true;
    setDeclined('');
    setPaying(true);

    try {
      // Step 1: Create reservation via backend. idempotencyKey is stable
      // across retries within this mounted attempt (see
      // reservationIdempotencyKeyRef above) — a retried submit resolves to
      // the same reservation instead of creating a duplicate.
      const idempotencyKey = reservationIdempotencyKeyRef.current!;
      const guestEmail = details.email.trim().toLowerCase();
      const result = await reservations.create({
        hotelId: resolved.property.id,
        checkInDate: toISODate(state.checkin!),
        checkOutDate: toISODate(state.checkout!),
        adults: state.adults || 2,
        children: state.children || 0,
        guest: {
          firstName: details.first.trim(),
          lastName: details.last.trim(),
          email: guestEmail,
          phone: details.phone.trim() || undefined,
          countryCode: details.country || undefined,
        },
        rooms: [{ roomTypeId: room!.id, ratePlanId: plan.backendRatePlanId }],
        extras: extrasSel.length
          ? extrasSel.map((x) => ({ extraId: x.id, quantity: x.qty }))
          : undefined,
        promoCode: state.promo || undefined,
        arrivalSlot: details.arrival,
        specialRequests: details.requests.trim() || undefined,
        idempotencyKey,
      });

      // Step 2: START the payment via backend — this only creates the
      // attempt and returns 'pending'; it never tells us the outcome. The
      // backend settles it asynchronously (a simulated provider today, a
      // real gateway's webhook eventually) and the outcome is discovered by
      // polling from the processing screen we redirect to below — this
      // component never waits for, or decides, success/failure itself. The
      // payment idempotency key is deterministically derived from the
      // reservation key (stable for the same reason); guestEmail is the
      // accountless-checkout proof of possession the backend accepts in
      // place of a signed-in session.
      await startPaymentAttempt({
        reservationId: result.reservation.id,
        amount: quote.total,
        idempotencyKey: `${idempotencyKey}:payment`,
        guestEmail,
      });

      if (apollo) {
        invalidateGraphql(apollo, REST_INVALIDATIONS['reservations.create']);
      }

      // Clear the reload-survival key now that the reservation exists and a
      // payment attempt is in flight for it — a later booking of the same
      // room/dates (e.g. after this one completes) must get a fresh key.
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(idemStorageKey);
        } catch {
          // ignore
        }
      }

      router.push(
        `/confirmation?ref=${encodeURIComponent(result.reservation.reference)}&email=${encodeURIComponent(guestEmail)}&status=processing`
      );
    } catch (err) {
      setPaying(false);
      const msg = err instanceof Error ? err.message : 'Booking failed. Please try again.';
      setDeclined(msg);
      wait.current = false;
    }
  };

  const holdLabel = () => {
    const m = Math.floor(holdSecs / 60);
    const s = String(holdSecs % 60).padStart(2, '0');
    return `Rate held for ${m}:${s}`;
  };

  return (
    <>
      {/* Context breadcrumb — the guest is booking a specific room of a
          specific hotel, so the trail preserves that context instead of
          pointing back at the generic search. */}
      {!missing && room && resolved ? (
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: resolved.property.name, href: `/hotel?hotelid=${resolved.property.id}` },
              {
                label: room.name,
                href: hotelRoomURL(state, resolved.property.id, room.id, plan?.id),
              },
              { label: 'Booking' },
            ]}
          />
        </div>
      ) : null}

      <div id="steps" className={`mb-8 ${missing ? 'hidden' : ''}`} aria-label="Booking progress">
        <Steps steps={['Guest details', 'Payment & confirm']} current={step - 1} />
      </div>

      {missing ? (
        <div
          id="missing"
          className="border-navy/10 mx-auto max-w-xl rounded-3xl border bg-white p-12 text-center"
        >
          <p className="font-display text-navy text-2xl font-semibold">Nothing to book yet</p>
          <p className="text-navy/60 mt-2 text-sm">
            Choose a room and dates to start your booking.
          </p>
          <Button asChild className="mt-6 shadow-none">
            <a href="/search">Search rooms</a>
          </Button>
        </div>
      ) : (
        <div
          id="booking-app"
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8"
        >
          {/* summary sidebar (first on mobile so the stay + total are visible before the form) */}
          <aside className="min-w-0 lg:sticky lg:top-28 lg:order-2" aria-label="Booking summary">
            <div className="border-navy/10 shadow-navy/10 rounded-3xl border bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                    Your stay
                  </p>
                  <p className="text-navy/65 mt-0.5 truncate text-[11px]">
                    {resolved?.property.name}
                    {resolved?.property.city ? ` · ${resolved.property.city}` : ''}
                  </p>
                </div>
                <span className="text-gold-dark bg-gold/10 border-gold/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2"
                    />
                  </svg>
                  {holdLabel()}
                </span>
              </div>
              <div id="summary-room" className="mt-3">
                <div className="flex items-start gap-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image(room!.images[0] ?? '', 400)}
                    alt={room!.name}
                    className="border-navy/10 h-20 w-20 shrink-0 rounded-2xl border object-cover sm:h-24 sm:w-24"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-navy leading-snug font-semibold">
                      {room!.name}
                    </p>
                    <p className="text-navy/55 mt-1 text-xs">
                      {plan!.name} · {fmt(plan!.price)}/night
                    </p>
                    <p className="text-navy/50 mt-1 text-[11px]">
                      {room!.bed}
                      {room!.size ? ` · ${room!.size}` : ''}
                    </p>
                    <a
                      href={roomURL(state, room!.id, plan!.id, {
                        extras: extrasToParam(extrasSel),
                      })}
                      className="text-navy/55 hover:text-navy mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold tracking-widest uppercase transition-colors"
                    >
                      Edit room, dates or extras <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
              </div>
              {/* Check-in and check-out are a pair, so they sit side by side
                  wherever there is room for two columns and stack below that. */}
              {/* Two <dl>s rather than one wrapped in extra <div>s: a <dt>/<dd>
                  may sit at most one <div> deep inside its <dl>, and nesting
                  them further trips axe's dlitem/definition-list rules. */}
              <div id="summary-stay" className="mt-4 text-sm">
                <dl className="border-navy/10 bg-paper/60 grid grid-cols-2 gap-3 rounded-2xl border p-3.5">
                  <StayDate label="Check-in" value={fmtShort(state.checkin)} />
                  <StayDate label="Check-out" value={fmtShort(state.checkout)} />
                </dl>
                <dl className="mt-3 space-y-2.5">
                <StayRow
                  icon={STAY_ICONS.moon}
                  label="Length of stay"
                  value={`${nights} ${nights === 1 ? 'night' : 'nights'}`}
                />
                <StayRow
                  icon={STAY_ICONS.users}
                  label="Guests"
                  value={`${state.adults + state.children}`}
                />
                <StayRow
                  icon={STAY_ICONS.home}
                  label="Rooms"
                  value={`${state.rooms} ${state.rooms === 1 ? 'room' : 'rooms'}`}
                />
                <StayRow icon={STAY_ICONS.tag} label="Rate" value={plan!.name.toLowerCase()} />
                {/* Echoed back so the guest can check what they picked on the
                    details step while they are on the payment step — the
                    reservation stores it (reservations.arrival_slot, V29) but
                    no read path exposes it yet. */}
                <StayRow
                  icon={STAY_ICONS.clock}
                  label="Estimated arrival"
                  value={details.arrival}
                />
                </dl>
              </div>

              <div className="border-navy/10 mt-4 border-t pt-4">
                <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Price summary
                </p>
                <div id="quote-host" className="mt-3">
                  {quote ? (
                    <QuoteTable
                      quote={quote}
                      currency={currency}
                      highlight
                      note="Billed in MAD at your bank's exchange rate."
                    />
                  ) : quoteLoading ? (
                    <QuoteSkeleton />
                  ) : quoteError ? (
                    <p className="text-clay text-xs" role="alert">
                      {quoteError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="border-navy/10 mt-4 border-t pt-4">
                <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Promo code
                </p>
                <div id="promo-host" className="mt-2">
                  <PromoField
                    promo={state.promo}
                    onChange={(code) => setPromo(code)}
                    onValidate={() => {}}
                    nights={nights}
                    checkin={state.checkin ? toISODate(state.checkin) : undefined}
                    planId={plan!.id}
                    compact
                  />
                </div>
              </div>

              {/* Extras are chosen on the room page and travel here in the
                  `extras=` URL parameter; they are itemized by QuoteTable in
                  the price summary above. The picker is deliberately NOT
                  repeated in the tunnel — `extrasSel` still drives the quote
                  and the reservation payload, and "Edit room, dates or extras"
                  above returns to the picker with the selection intact. */}

              {/* Settlement terms of the booked rate, stated where the guest
                  is about to pay rather than only back on the room page. */}
              <div className="border-navy/10 mt-4 border-t pt-4">
                <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Payment
                </p>
                <div className="mt-2.5">
                  <PaymentTimingBadge
                    timing={plan!.paymentTiming}
                    depositPercentage={plan!.depositPercentage}
                  />
                  <p className="text-navy/60 mt-2 text-[11px] leading-relaxed">
                    {paymentTimingCopy(plan!.paymentTiming, plan!.depositPercentage).detail}
                  </p>
                </div>
              </div>

              <div className="bg-paper border-navy/10 text-navy/55 mt-5 rounded-2xl border px-4 py-3 text-[11px] leading-relaxed">
                Free cancellation on most plans · Secure payment processing
              </div>
            </div>
          </aside>

          {/* steps + forms */}
          <div className="min-w-0 space-y-6 lg:order-1">
            {step === 1 ? (
              <section
                id="step-details"
                className="border-navy/10 rounded-3xl border bg-white p-5 sm:p-6 lg:p-8"
                aria-label="Guest details"
              >
                <h2 className="font-display text-navy text-2xl font-semibold">Guest details</h2>
                <p className="text-navy/55 mt-1 text-sm">
                  Confirm who the room is for — this is the contact for your confirmation.
                </p>

                <form id="details-form" onSubmit={submitDetails} noValidate>
                <fieldset className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <legend className="text-navy/45 col-span-full mb-1 text-xs font-semibold tracking-widest uppercase">
                    Guest information
                  </legend>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:col-span-2 sm:grid-cols-[7.5rem_1fr_1fr]">
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor="f-title">Title</Label>
                      <NativeSelect
                        id="f-title"
                        value={details.title}
                        onChange={(e) => setDetails({ ...details, title: e.target.value as Title })}
                      >
                        {TITLES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div>
                      <Label htmlFor="f-first">
                        First name <Star />
                      </Label>
                      <Input
                        size="sm"
                        id="f-first"
                        type="text"
                        autoComplete="given-name"
                        value={details.first}
                        onChange={(e) => {
                          setDetails({ ...details, first: e.target.value });
                          setDErrors({ ...dErrors, first: undefined });
                        }}
                        aria-invalid={!!detailsError('first')}
                        aria-describedby={detailsError('first') ? 'err-first' : undefined}
                      />
                      <FieldErr id="err-first" msg={detailsError('first')} />
                    </div>
                    <div>
                      <Label htmlFor="f-last">
                        Last name <Star />
                      </Label>
                      <Input
                        size="sm"
                        id="f-last"
                        type="text"
                        autoComplete="family-name"
                        value={details.last}
                        onChange={(e) => {
                          setDetails({ ...details, last: e.target.value });
                          setDErrors({ ...dErrors, last: undefined });
                        }}
                        aria-invalid={!!detailsError('last')}
                        aria-describedby={detailsError('last') ? 'err-last' : undefined}
                      />
                      <FieldErr id="err-last" msg={detailsError('last')} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="f-email">
                      Email <Star />
                    </Label>
                    <Input
                      size="sm"
                      id="f-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={details.email}
                      onChange={(e) => {
                        setDetails({ ...details, email: e.target.value });
                        setDErrors({ ...dErrors, email: undefined });
                      }}
                      aria-invalid={!!detailsError('email')}
                      aria-describedby={detailsError('email') ? 'err-email' : undefined}
                    />
                    <p className="text-navy/45 mt-1 text-[11px]">
                      Your confirmation and any updates go here.
                    </p>
                    <FieldErr id="err-email" msg={detailsError('email')} />
                  </div>
                  <div>
                    <Label htmlFor="f-country">Country of residence</Label>
                    <CountrySelect
                      id="f-country"
                      value={details.country}
                      onChange={(country) => setDetails({ ...details, country })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="f-phone">
                      Phone <Star />
                    </Label>
                    <PhoneField
                      id="f-phone"
                      value={details.phone}
                      defaultCountry={details.country}
                      onChange={(phone) => {
                        setDetails({ ...details, phone });
                        setDErrors({ ...dErrors, phone: undefined });
                      }}
                      ariaInvalid={!!detailsError('phone')}
                      ariaDescribedby={detailsError('phone') ? 'err-phone' : undefined}
                    />
                    {detailsError('phone') ? (
                      <FieldErr id="err-phone" msg={detailsError('phone')} />
                    ) : (
                      <p className="text-navy/45 mt-1.5 text-[11px]">
                        For arrival updates only.
                      </p>
                    )}
                  </div>
                </fieldset>

                <div className="border-navy/10 mt-7 border-t pt-6">
                  <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                    Arrival &amp; requests{' '}
                    <span className="text-navy/35 font-normal normal-case tracking-normal">
                      (optional)
                    </span>
                  </p>
                  <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="f-arrival">Estimated arrival time</Label>
                      <NativeSelect
                        id="f-arrival"
                        value={details.arrival}
                        onChange={(e) => setDetails({ ...details, arrival: e.target.value })}
                        aria-describedby="hint-arrival"
                      >
                        {ARRIVAL_SLOTS.map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </NativeSelect>
                      <p id="hint-arrival" className="text-navy/45 mt-1.5 text-[11px]">
                        Check-in opens at 15:00 — later arrivals are always welcome.
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="f-requests">Special requests</Label>
                      <textarea
                        id="f-requests"
                        rows={2}
                        placeholder="Allergies, celebrations, extra pillows…"
                        value={details.requests}
                        onChange={(e) => setDetails({ ...details, requests: e.target.value })}
                        className="bg-paper border-navy/15 focus:ring-gold/40 w-full resize-none rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-navy/10 mt-7 flex flex-col items-stretch justify-between gap-3 border-t pt-6 sm:flex-row sm:items-center">
                  <p className="text-navy/45 text-[11px]">
                    Free cancellation on most plans · No charge until you confirm
                  </p>
                  <Button
                    type="submit"
                    id="details-submit"
                    size="lg"
                    className="rounded-2xl text-sm"
                  >
                    Continue to payment →
                  </Button>
                </div>
                </form>
              </section>
            ) : (
              <section
                id="step-payment"
                className="border-navy/10 rounded-3xl border bg-white p-5 sm:p-6 lg:p-8"
                aria-label="Payment"
              >
                <h2 className="font-display text-navy text-2xl font-semibold">Payment</h2>
                <p className="text-navy/55 mt-1 text-sm">
                  Enter your card details to complete the booking.
                </p>

                {declined ? (
                  <div
                    id="declined"
                    className="bg-clay/10 border-clay/25 text-clay mt-5 rounded-2xl border px-4 py-3 text-sm"
                    role="alert"
                  >
                    {declined}
                  </div>
                ) : null}

                <form id="pay-form" onSubmit={submitPayment} noValidate>
                  <fieldset className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <legend className="text-navy/45 col-span-full mb-1 text-xs font-semibold tracking-widest uppercase">
                    Card details
                  </legend>
                  <div className="sm:col-span-2">
                    <Label htmlFor="p-name">
                      Name on card <Star />
                    </Label>
                    <Input
                      size="sm"
                      id="p-name"
                      type="text"
                      autoComplete="cc-name"
                      placeholder="ADAM BENALI"
                      value={card.name}
                      onChange={(e) => {
                        setCard({ ...card, name: e.target.value });
                        setPErrors({ ...pErrors, pname: undefined });
                      }}
                      className="uppercase"
                      aria-invalid={!!payError('pname')}
                      aria-describedby={payError('pname') ? 'err-pname' : undefined}
                    />
                    <FieldErr id="err-pname" msg={payError('pname')} />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="p-number" className="mb-0">
                        Card number <Star />
                      </Label>
                      <span className="text-navy/40 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide">
                        <span className="bg-gold-dark inline-block h-2.5 w-2.5 rounded-full" aria-hidden="true" />
                        <span className="-ml-1.5 inline-block h-2.5 w-2.5 rounded-full bg-navy" aria-hidden="true" />
                        Visa · Mastercard
                      </span>
                    </div>
                    <Input
                      size="sm"
                      id="p-number"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4000 0000 0000 0000"
                      value={card.number}
                      onChange={(e) => {
                        setCard({ ...card, number: fmtCardNumber(e.target.value) });
                        setPErrors({ ...pErrors, pnumber: undefined });
                      }}
                      className="tracking-wider"
                      aria-invalid={!!payError('pnumber')}
                      aria-describedby={payError('pnumber') ? 'err-pnumber' : undefined}
                    />
                    <p className="text-navy/45 mt-1 flex items-center gap-1.5 text-[11px]">
                      <svg
                        className="h-3 w-3 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M8 11V7a4 4 0 1 1 8 0v4m-9 0h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
                        />
                      </svg>
                      Your payment is processed securely via the backend.
                    </p>
                    <FieldErr id="err-pnumber" msg={payError('pnumber')} />
                  </div>
                  <div>
                    <Label htmlFor="p-exp">
                      Expiry <Star />
                    </Label>
                    <Input
                      size="sm"
                      id="p-exp"
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={(e) => {
                        setCard({ ...card, expiry: fmtExpiry(e.target.value) });
                        setPErrors({ ...pErrors, pexp: undefined });
                      }}
                      aria-invalid={!!payError('pexp')}
                      aria-describedby={payError('pexp') ? 'err-pexp' : undefined}
                    />
                    <FieldErr id="err-pexp" msg={payError('pexp')} />
                  </div>
                  <div>
                    <Label htmlFor="p-cvc">
                      CVC <Star />
                    </Label>
                    <Input
                      size="sm"
                      id="p-cvc"
                      type="text"
                      inputMode="numeric"
                      placeholder="123"
                      value={card.cvc}
                      onChange={(e) => {
                        setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) });
                        setPErrors({ ...pErrors, pcvc: undefined });
                      }}
                      aria-invalid={!!payError('pcvc')}
                      aria-describedby={payError('pcvc') ? 'err-pcvc' : undefined}
                    />
                    <FieldErr id="err-pcvc" msg={payError('pcvc')} />
                  </div>
                  <label className="text-navy/65 mt-1 flex cursor-pointer items-start gap-2.5 text-xs sm:col-span-2">
                    <input
                      type="checkbox"
                      id="p-terms"
                      checked={terms}
                      onChange={(e) => {
                        setTerms(e.target.checked);
                        setPErrors({ ...pErrors, pterms: undefined });
                      }}
                      className="accent-navy mt-0.5"
                    />
                    <span>
                      I agree to the{' '}
                      <a href="/terms" className="underline">
                        Terms &amp; Conditions
                      </a>{' '}
                      and the{' '}
                      <a href="/cancellation-policy" className="underline">
                        Cancellation policy
                      </a>{' '}
                      of this rate. <Star />
                    </span>
                  </label>
                  {payError('pterms') ? (
                    <p
                      id="err-pterms"
                      className="text-clay -mt-2 text-[11px] font-medium sm:col-span-2"
                      role="alert"
                    >
                      {payError('pterms')}
                    </p>
                  ) : null}
                  </fieldset>

                  {/* Footer mirrors the details step: same top rule, same
                      rhythm, and on mobile the primary action is full-width
                      and last rather than squeezed beside the total. */}
                  <div className="border-navy/10 mt-7 border-t pt-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="order-2 sm:order-1">
                      <p className="text-navy/45 text-[11px] font-semibold tracking-widest uppercase">
                        Total due
                      </p>
                      <strong id="pay-total" className="font-display text-navy text-2xl">
                        {quote ? fmt(quote.total) : '—'}
                      </strong>
                    </div>
                    <Button
                      type="submit"
                      id="pay-submit"
                      disabled={paying}
                      size="xl"
                      className="order-1 w-full rounded-2xl text-sm sm:order-2 sm:w-auto"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M12 11V6m0 0v0m0 0a3 3 0 1 0 0-6m8 8.5-1.5 12h-13L4 8.5M2 8.5h20"
                        />
                      </svg>
                      <span id="pay-label">{paying ? 'Processing…' : 'Confirm & pay'}</span>
                    </Button>
                    </div>
                    <div className="mt-4">
                      <Button type="button" id="pay-back" onClick={() => setStep(1)} variant="ghost">
                        ← Back to details
                      </Button>
                    </div>
                  </div>
                </form>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Loading placeholder shaped like QuoteTable's rows — the price summary is
    the most commercially important number on the page, so it gets a real
    skeleton instead of a plain "Calculating…" line. */
function QuoteSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true" role="status" aria-label="Calculating price">
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="bg-navy/10 h-3 w-24 rounded-full" />
            <div className="bg-navy/10 h-3 w-14 rounded-full" />
          </div>
        ))}
      </div>
      <div className="bg-navy/[0.06] mt-3 flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="bg-navy/10 h-3.5 w-16 rounded-full" />
        <div className="bg-navy/10 h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

function StayRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-navy/60 flex min-w-0 items-center gap-2">
        <svg
          className="text-gold-dark h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {icon}
        </svg>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="text-navy text-right font-semibold whitespace-nowrap">{value}</dd>
    </div>
  );
}

/** Check-in / check-out cell — the pair reads as a range, so the two share a
    row and are given more weight than the rest of the stay facts. */
function StayDate({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-navy/45 text-[10px] font-semibold tracking-widest uppercase">{label}</dt>
      <dd className="font-display text-navy mt-1 truncate text-[15px] font-semibold">{value}</dd>
    </div>
  );
}

function Star() {
  return (
    <span className="text-gold-dark" aria-hidden="true">
      *
    </span>
  );
}

function FieldErr({ id, msg }: { id: string; msg: string }) {
  return msg ? (
    <p id={id} className="text-clay mt-1.5 text-[11px] font-medium" role="alert">
      {msg}
    </p>
  ) : null;
}

function validCardNumber(v: string): boolean {
  const digits = String(v).replace(/\D/g, '');
  return /^\d{13,19}$/.test(digits);
}

function validCvc(v: string): boolean {
  return /^\d{3,4}$/.test(v.trim());
}
