'use client';

/* Booking tunnel — faithful port of booking.js: stay/summary sidebar with live
   quote + promo + extras, a two-step details→payment form with per-field
   validation, the D-4 hold chip, the BOOK-7 idempotency banner, simulated
   payment (cards ending in 1 decline) and redirect to /confirmation. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROPERTY, EXTRAS } from '@/data';
import { useSearch } from '@/context/SearchContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/context/ToastContext';
import { useSession } from '@/context/SessionContext';
import { compute } from '@/services/pricing';
import { ensurePricingSources } from '@/services/pricingHydration';
import { plansFor } from '@/services/availability';
import { getStayRoom } from '@/services/catalog';
import { getExtras } from '@/services/extras';
import { charge } from '@/services/payment';
import type { Extra } from '@/types';
import { bookingKey, reservations } from '@/services/reservations';
import { fmtShort, nightsBetween, stateToParams, toISODate } from '@/lib/dates';
import { roomURL } from '@/lib/links';
import {
  validEmail,
  validExpiry,
  validName,
  validPhone,
  fmtCardNumber,
  fmtExpiry,
} from '@/lib/validation';
import { extrasToParam, parseExtrasParam, type ExtraSelection } from '@/lib/extras';
import { Steps } from '@/components/ui/Steps';
import { QuoteTable } from '@/components/ui/QuoteTable';
import { PromoField } from '@/components/ui/PromoField';
import { ExtrasPicker } from '@/components/ui/ExtrasPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { image } from '@/services/availability';

const TITLES = ['Mr', 'Ms', 'Mrs', 'Mx', 'Dr'] as const;
type Title = (typeof TITLES)[number];

const HOLDS_SECONDS = 15 * 60;

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
};

type DetailsErrors = Partial<Record<'first' | 'last' | 'email' | 'phone', string>>;
type PayErrors = Partial<Record<'pname' | 'pnumber' | 'pexp' | 'pcvc' | 'pterms', string>>;

const COUNTRIES = [
  'Morocco',
  'France',
  'United Kingdom',
  'Spain',
  'Germany',
  'United States',
  'United Arab Emirates',
  'Netherlands',
  'Italy',
  'Belgium',
  'Canada',
];
const ARRIVALS = ['15:00 – 18:00', '18:00 – 21:00', '21:00 – 23:00', 'After 23:00'];

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
  const { toast } = useToast();
  const { session } = useSession();

  /* Backend-first stay resolution: real room-type UUIDs never match the static
     fixture, so the fixture path only serves legacy demo deep-links. */
  const fixtureRoom = PROPERTY.rooms.find((r) => r.id === roomId) ?? null;
  const [resolvedFor, setResolvedFor] = useState<{
    id: string;
    data: Awaited<ReturnType<typeof getStayRoom>> | null;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    getStayRoom(undefined, roomId, {
      checkin: state.checkin,
      adults: state.adults,
      children: state.children,
    })
      .then((r) => alive && setResolvedFor({ id: roomId, data: r }))
      .catch(() => alive && setResolvedFor({ id: roomId, data: null }));
    return () => {
      alive = false;
    };
  }, [roomId, state.checkin, state.adults, state.children]);
  const resolved = resolvedFor?.id === roomId ? resolvedFor.data : undefined;

  const room = resolved ? resolved.room : fixtureRoom;
  const plans = useMemo(
    () => (resolved ? resolved.plans : fixtureRoom ? plansFor(fixtureRoom) : []),
    [resolved, fixtureRoom]
  );
  const plan = plans.find((p) => p.id === planId) ?? plans[0] ?? null;

  /* Extras catalog follows the resolved hotel; empty until known so backend
     ids never render fixture rows. */
  const [extrasList, setExtrasList] = useState<Extra[]>(fixtureRoom ? EXTRAS : []);
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
  const [extrasSel, setExtrasSel] = useState<ExtraSelection>(extraSelInitial);
  const [step, setStep] = useState<1 | 2>(1);
  const [exitRef, setExitRef] = useState<string | null>(null);
  const [holdSecs, setHoldSecs] = useState(HOLDS_SECONDS);
  const [declined, setDeclined] = useState('');
  const [paying, setPaying] = useState(false);
  const [details, setDetails] = useState({
    title: 'Mr' as Title,
    first: session ? String(session.name.split(' ')[0] ?? '') : '',
    last: session ? String(session.name.split(' ').slice(1).join(' ')) : '',
    email: session ? session.email : '',
    phone: '',
    country: 'Morocco',
    arrival: '15:00 – 18:00',
    requests: '',
  });
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [terms, setTerms] = useState(false);
  const [dErrors, setDErrors] = useState<DetailsErrors>({});
  const [pErrors, setPErrors] = useState<PayErrors>({});

  const hasDates = !!(state.checkin && state.checkout);
  const nights = nightsBetween(state.checkin, state.checkout);
  const validStay = !!room && !!plan && hasDates && nights >= 1;

  /* Re-run the quote once backend promo/extras catalogs have hydrated. */
  const [sourcesReady, setSourcesReady] = useState(false);
  useEffect(() => {
    let alive = true;
    ensurePricingSources().then(() => alive && setSourcesReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const quote = useMemo(() => {
    if (!plan || !validStay) return null;
    return compute({
      perNight: plan.price,
      nights,
      rooms: state.rooms || 1,
      extras: extrasSel,
      extraPrices: Object.fromEntries(extrasList.map((x) => [x.id, x.price])),
      promo: state.promo,
      planId: plan.id,
      checkin: state.checkin,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sourcesReady only triggers a refresh
  }, [plan, validStay, nights, state.rooms, state.promo, state.checkin, extrasSel, extrasList, sourcesReady]);

  /* BOOK-7 idempotency key + D-4 hold chip; both once per mount. */
  useEffect(() => {
    if (!validStay || !state.checkin || !state.checkout) return;
    const item = `room:${roomId}:${planId}:${toISODate(state.checkin)}:${toISODate(state.checkout)}`;
    const bk = bookingKey.begin(item);
    const t = setInterval(() => {
      setHoldSecs((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    if (bk.exitRef) {
      const t0 = setTimeout(() => setExitRef(bk.exitRef), 0);
      return () => {
        clearInterval(t);
        clearTimeout(t0);
      };
    }
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
    wait.current = true;
    setDeclined('');
    setPaying(true);
    const res = await charge({ card: card.number, amount: quote.total });
    setPaying(false);
    if (!res.ok) {
      setDeclined(
        `Payment declined — ${res.message} Your details are still here; try another card.`
      );
      wait.current = false;
      return;
    }
    const reservation = reservations.create({
      hotelId: resolved?.property.id ?? PROPERTY.id,
      hotelName: resolved?.property.name ?? PROPERTY.name,
      roomName: resolved?.room.name ?? fixtureRoom?.name,
      extrasSnapshot: extrasSel.flatMap((x) => {
        const def = extrasList.find((e) => e.id === x.id);
        return def ? [{ id: def.id, name: def.name, price: def.price, unit: def.unit, qty: x.qty }] : [];
      }),
      roomId,
      planId: plan.id,
      checkin: state.checkin ? toISODate(state.checkin) : '',
      checkout: state.checkout ? toISODate(state.checkout) : '',
      adults: state.adults,
      children: state.children,
      childrenAges: state.childrenAges.slice(0, state.children),
      rooms: state.rooms || 1,
      extras: extrasSel.map((x) => ({ id: x.id, qty: x.qty })),
      promo: state.promo,
      price: {
        perNight: plan.price,
        nights,
        roomSubtotal: quote.roomSubtotal,
        discount: quote.discount,
        taxes: quote.taxes,
        extrasTotal: quote.extrasTotal,
        total: quote.total,
        originalTotal: quote.originalTotal,
        currency: 'MAD',
      },
      guest: {
        title: details.title,
        firstName: details.first.trim(),
        lastName: details.last.trim(),
        email: details.email.trim().toLowerCase(),
        phone: details.phone.trim(),
        country: details.country,
        arrival: details.arrival,
        requests: details.requests.trim(),
      },
      email: details.email.trim().toLowerCase(),
    });
    bookingKey.finish(reservation.ref);
    toast({
      message: 'Your room is confirmed — see you in Rabat.',
      type: 'ok',
      title: 'Booking confirmed',
    });
    router.push(`/confirmation?ref=${encodeURIComponent(reservation.ref)}`);
  };

  const holdLabel = () => {
    const m = Math.floor(holdSecs / 60);
    const s = String(holdSecs % 60).padStart(2, '0');
    return `Rate held for ${m}:${s} (mock hold)`;
  };

  return (
    <>
      {exitRef ? (
        <div id="idem-banner" className="mb-6">
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-700/20 bg-emerald-700/8 px-5 py-4 text-sm text-emerald-700"
            role="status"
          >
            <span>
              <strong>You already confirmed this booking</strong> — a reservation for these exact
              dates and room exists under your reference.
            </span>
            <a
              href={`/confirmation?ref=${encodeURIComponent(exitRef)}`}
              className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase hover:bg-emerald-800"
            >
              View confirmation
            </a>
          </div>
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
                <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Your stay
                </p>
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
                      Edit room or dates <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
              </div>
              <dl id="summary-stay" className="mt-4 space-y-2.5 text-sm">
                <StayRow icon={STAY_ICONS.cal} label="Check-in" value={fmtShort(state.checkin)} />
                <StayRow icon={STAY_ICONS.cal} label="Check-out" value={fmtShort(state.checkout)} />
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
              </dl>

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

              <div className="border-navy/10 mt-4 border-t pt-4">
                <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  Extras &amp; services
                </p>
                <div id="extras-host" className="mt-3">
                  <ExtrasPicker
                    extras={extrasList}
                    selected={extrasSel}
                    onChange={setExtrasSel}
                    adults={state.adults || 2}
                    childCount={state.children || 0}
                    compact
                    sidebar
                    currency={currency}
                  />
                </div>
              </div>

              <div className="bg-paper border-navy/10 text-navy/55 mt-5 rounded-2xl border px-4 py-3 text-[11px] leading-relaxed">
                Free cancellation on most plans · Payment is simulated in this prototype — no card
                data is stored or sent.
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

                <form
                  id="details-form"
                  className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2"
                  onSubmit={submitDetails}
                  noValidate
                >
                  <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-[120px_1fr_1fr] sm:gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label
                        htmlFor="f-title"
                        className="text-navy/60 mb-1.5 block text-xs font-semibold"
                      >
                        Title
                      </label>
                      <select
                        id="f-title"
                        value={details.title}
                        onChange={(e) => setDetails({ ...details, title: e.target.value as Title })}
                        className="bg-paper border-navy/15 focus:ring-gold/40 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                      >
                        {TITLES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
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
                    <Label htmlFor="f-phone">
                      Phone <Star />
                    </Label>
                    <Input
                      size="sm"
                      id="f-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+212 6 00 00 00 00"
                      value={details.phone}
                      onChange={(e) => {
                        setDetails({ ...details, phone: e.target.value });
                        setDErrors({ ...dErrors, phone: undefined });
                      }}
                      aria-invalid={!!detailsError('phone')}
                      aria-describedby={detailsError('phone') ? 'err-phone' : undefined}
                    />
                    <FieldErr id="err-phone" msg={detailsError('phone')} />
                  </div>
                  <div>
                    <Label htmlFor="f-country">Country</Label>
                    <select
                      id="f-country"
                      value={details.country}
                      onChange={(e) => setDetails({ ...details, country: e.target.value })}
                      className="bg-paper border-navy/15 focus:ring-gold/40 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="f-arrival">Arrival time</Label>
                    <select
                      id="f-arrival"
                      value={details.arrival}
                      onChange={(e) => setDetails({ ...details, arrival: e.target.value })}
                      className="bg-paper border-navy/15 focus:ring-gold/40 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                    >
                      {ARRIVALS.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="f-requests">
                      Special requests <span className="text-navy/40 font-normal">(optional)</span>
                    </Label>
                    <textarea
                      id="f-requests"
                      rows={2}
                      placeholder="Allergies, celebrations, extra pillows…"
                      value={details.requests}
                      onChange={(e) => setDetails({ ...details, requests: e.target.value })}
                      className="bg-paper border-navy/15 focus:ring-gold/40 w-full resize-none rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col items-stretch justify-between gap-3 pt-1 sm:col-span-2 sm:flex-row sm:items-center">
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
                  This is a prototype — payment is simulated and no card data leaves your browser.
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

                <form
                  id="pay-form"
                  className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2"
                  onSubmit={submitPayment}
                  noValidate
                >
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
                    <Label htmlFor="p-number">
                      Card number <Star />
                    </Label>
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
                    <p className="text-navy/45 mt-1 text-[11px]">
                      Demo rule: any card works — except numbers ending in <strong>1</strong>, which
                      the bank (mock) declines.
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
                  <div className="border-navy/10 flex flex-col justify-between gap-3 border-t pt-2 sm:col-span-2 sm:flex-row sm:items-center">
                    <Button type="button" id="pay-back" onClick={() => setStep(1)} variant="ghost">
                      ← Back to details
                    </Button>
                    <p className="text-navy/70 text-sm">
                      Total due{' '}
                      <strong id="pay-total" className="font-display text-navy text-xl">
                        {quote ? fmt(quote.total) : ''}
                      </strong>
                    </p>
                    <Button
                      type="submit"
                      id="pay-submit"
                      disabled={paying}
                      size="xl"
                      className="rounded-2xl text-sm"
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
                </form>
              </section>
            )}
          </div>
        </div>
      )}
    </>
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
