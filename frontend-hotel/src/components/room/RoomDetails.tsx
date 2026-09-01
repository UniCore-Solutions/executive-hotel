'use client';

/* Room page — faithful port of room.js: gallery with thumbs, stay strip with
   contextual date/guest dialogs (desktop centered, mobile bottom sheet),
   booking card (rate plans, extras, promo, live quote), hotel card, siblings.
   All stay mutations flow through SearchContext so every panel stays in sync. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSearch } from '@/context/SearchContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/context/ToastContext';
import {
  fmtShort,
  guestsLabel,
  nightsBetween,
  startOfDay,
  stateToParams,
  toISODate,
  validateState,
} from '@/lib/dates';
import { image, IMG_FALLBACK } from '@/services/availability';
import { getStayRoom, refreshRoomStay } from '@/services/catalog';
import { GraphqlClientError } from '@/services/graphqlClient';
import { recordRoomView } from '@/services/activity';
import { bookingURL, hotelRoomURL, roomURL } from '@/lib/links';
import Calendar from '@/components/search/Calendar';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { ExtrasPicker } from '@/components/ui/ExtrasPicker';
import { PromoField } from '@/components/ui/PromoField';
import { QuoteTable } from '@/components/ui/QuoteTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { PhotoGallery } from '@/components/ui/PhotoGallery';
import { ReadMore } from '@/components/ui/ReadMore';
import { useExtrasSelection } from '@/hooks/useExtrasSelection';
import { useQuote } from '@/hooks/useQuote';
import type { Availability, RatePlan, Room, StayRoomResult } from '@/types';

/* Inline icon paths (24×24 stroke) matched to verified amenity names (room.js). */
const ICON: Record<string, string> = {
  snow: 'M12 2v20M22 12H2M18 6l-6 6 6 6M6 18l6-6-6-6',
  desk: 'M4 14.5 5.5 6.5h13L20 14.5M4 14.5v4M20 14.5v4M8.5 14.5l.5-2.5M15.5 14.5l-.5-2.5',
  kettle: 'M4 9h14.5L17 14.5a6 6 0 0 1-12 0L4 9ZM16 14.5a6 6 0 0 1-9.5 0M8.5 9V5h6v4M11.5 5v1.5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5v-9ZM12 14.5V17',
  tv: 'M4.5 7h15a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM8 21.5h8M12 18.5v3',
  shower: 'M12 3c3.5 0 3.5 4.5 0 4.5S8.5 3 12 3ZM12 7.5V12.5M12 12.5 7.5 21h9L12 12.5Z',
  wardrobe: 'M4.5 4h6.5v16h-6.5V4ZM13 4h6.5v16H13V4ZM7.5 8v2M17 8v2',
  wifi: 'M5 12.5a10.5 10.5 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 19.5h.01',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  car: 'M4 16.5V12l2-5h12l2 5v4.5M4 16.5h16M4 16.5v2M20 16.5v2M7 13.5h.01M17 13.5h.01',
  utensils: 'M7 3v5m0 0v13m0-13H4V3m3 5h3V3M17 3v18m-3-18c2.5 0 4 2 4 5h-4V3Z',
  coffee:
    'M5 10h11v5.5a5 5 0 0 1-5 5H9.5a4.5 4.5 0 0 1-4.5-4.5V10ZM16 12.5h1.5a2.5 2.5 0 0 1 0 5H16M3.5 4.5c1 .8 1 2.3 0 3.2M7.5 4.5c1 .8 1 2.3 0 3.2',
};

const AMENITY_ICONS: Array<[string, string]> = [
  ['air condition', 'snow'],
  ['work desk', 'desk'],
  ['kettle', 'kettle'],
  ['safe', 'lock'],
  ['tv', 'tv'],
  ['bathroom', 'shower'],
  ['wardrobe', 'wardrobe'],
  ['wi-fi', 'wifi'],
  ['terrace', 'sun'],
  ['coffee', 'coffee'],
];

const iconFor = (name: string) => {
  const k = AMENITY_ICONS.find(([re]) => name.toLowerCase().includes(re.toLowerCase()));
  return ICON[k ? k[1] : 'check'];
};

/* Two-bucket grouping of room amenities by keyword — real data (see
   catalog.ts's mapRoomTypeToRoom) is a flat string[] with no category, so
   this is a lightweight client-side classification, not a lost backend
   field. Anything unmatched goes to "Comfort" rather than a third bucket. */
const ESSENTIAL_AMENITY_KEYWORDS = [
  'wi-fi',
  'wifi',
  'air condition',
  'heating',
  'safe',
  'tv',
  'desk',
  'wardrobe',
];

function groupRoomAmenities(amenities: string[]) {
  const essentials = amenities.filter((a) =>
    ESSENTIAL_AMENITY_KEYWORDS.some((k) => a.toLowerCase().includes(k))
  );
  const comfort = amenities.filter((a) => !essentials.includes(a));
  return [
    ...(essentials.length ? [{ label: 'Room essentials', items: essentials }] : []),
    ...(comfort.length ? [{ label: 'Comfort', items: comfort }] : []),
  ];
}

const STAY_ICONS = {
  cal: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M8 7V5a4 4 0 0 1 8 0v2m-9 0h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
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
  rooms: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9.5 21v-5.5h5V21"
    />
  ),
};

const PANEL_LIMITS: Record<string, [number, number]> = {
  adults: [1, 9],
  children: [0, 6],
  rooms: [1, 5],
};

export default function RoomDetails({
  roomId,
  initialPlan,
  initialExtras,
  hasGuestParams,
  hotelId,
  hotelName,
}: {
  roomId: string;
  initialPlan: string;
  initialExtras: string;
  hasGuestParams: boolean;
  hotelId?: string;
  hotelName?: string;
}) {
  const router = useRouter();
  const { state, setDate, setGuests, setChildrenAges, setPromo } = useSearch();
  const { fmt, currency } = useCurrency();
  const { toast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [availability, setAvailability] = useState<Availability>('available');
  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [siblings, setSiblings] = useState<StayRoomResult['siblingRooms']>([]);
  const [fits, setFits] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlan);
  /* initialPlan is a snapshot (the URL rewrites itself on this page; the hotel
     gate re-renders with the synced plan, which must not change the badge). */
  const [initialPlanOnce] = useState(initialPlan);
  // Real backend extras load async (inside useExtrasSelection, keyed on
  // hotelId); an empty list until then means a fixture slug id (e.g.
  // "airport-shuttle") can never leak into a quote request (see Task 8 in
  // docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md).
  const { extrasSel, setExtrasSel, extrasList } = useExtrasSelection(hotelId, initialExtras);
  const [dialog, setDialog] = useState<null | 'dates' | 'guests'>(null);
  const [guestTouched, setGuestTouched] = useState(false);
  const [availForCheckin, setAvailForCheckin] = useState('');
  const [pickerSnapshot, setPickerSnapshot] = useState<{
    checkin: Date | null;
    checkout: Date | null;
  } | null>(null);
  const [panelSnapshot, setPanelSnapshot] = useState<{
    adults: number;
    children: number;
    childrenAges: number[];
    rooms: number;
  } | null>(null);
  const seqRef = useRef(0);
  const firstRender = useRef(true);
  const roomsStepRef = useRef<HTMLButtonElement>(null);

  const hasDates = !!(state.checkin && state.checkout);
  const ciOnly = !!state.checkin && !state.checkout;
  const nights = nightsBetween(state.checkin, state.checkout);
  const plan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];
  const guestKnown = guestTouched || hasGuestParams;

  /* ---------- data ---------- */

  const refreshStay = useCallback(async () => {
    if (!room) return;
    const seq = ++seqRef.current;
    try {
      // Only the availability/rates of the stay change on date edits — the
      // room and hotel entities are already on screen, so re-run just the
      // staySearch read (no hotel/room re-fetch).
      const res = await refreshRoomStay(room.hotelId ?? '', roomId, {
        checkin: state.checkin,
        checkout: state.checkout,
        adults: state.adults || 2,
        children: state.children || 0,
        rooms: state.rooms,
      });
      if (seq !== seqRef.current || !res) return;
      setAvailability(res.availability);
      setFits(res.fits !== false);
      setAvailForCheckin(state.checkin ? toISODate(state.checkin) : '');
      setSiblings(res.siblings || []);
    } catch {
      if (seq !== seqRef.current) return;
      setLoadError('Could not refresh availability — please check your connection.');
    }
  }, [room, roomId, state.checkin, state.checkout, state.adults, state.children, state.rooms]);

  useEffect(() => {
    let alive = true;
    getStayRoom(undefined, roomId, {
      checkin: state.checkin,
      checkout: state.checkout,
      adults: state.adults || 2,
      children: state.children || 0,
      rooms: state.rooms,
    }).then((res) => {
      if (!alive) return;
      if (!res || !res.room) {
        setNotFound(true);
        return;
      }
      setRoom(res.room);
      setAvailability(res.availability);
      setFits(res.fits !== false);
      setAvailForCheckin(state.checkin ? toISODate(state.checkin) : '');
      setPlans(res.plans || []);
      setSiblings(res.siblingRooms || []);
      if (res.plans && res.plans.length) {
        setSelectedPlanId((cur) => {
          if (cur && res.plans!.some((p) => p.id === cur)) return cur;
          return (res.plans!.find((p) => p.id.endsWith('::bb')) ?? res.plans![0])!.id;
        });
      }
      setLoaded(true);
    }).catch((err) => {
      if (!alive) return;
      // roomType() throws rather than resolving to null for a missing room
      // (VALIDATION for a bad UUID lookup, NOT_FOUND for a bad slug lookup —
      // both mean "not found" here), so the `!res.room` branch above never
      // actually sees that case; catch it here instead of showing a
      // misleading "check your connection" message.
      if (
        err instanceof GraphqlClientError &&
        (err.code === 'NOT_FOUND' || err.code === 'VALIDATION')
      ) {
        setNotFound(true);
        return;
      }
      setLoadError('Could not load room details — please check your connection and try again.');
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* Record this room as "recently viewed" for the anonymous-activity section. */
  useEffect(() => {
    recordRoomView(roomId);
  }, [roomId]);

  /* Re-check availability whenever the stay changes on this page (or via the global sheet). */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    refreshStay();
  }, [state.checkin, state.checkout, state.adults, state.children, state.rooms, refreshStay]);

  /* Keep the URL query in sync (plan / extras / stay) — reference updateQuoteURL.
     Preserves the roomId param so the hotel page keeps the room selected. */
  useEffect(() => {
    if (!loaded) return;
    const p = new URLSearchParams(window.location.search);
    for (const k of ['id', 'plan', 'extras']) p.delete(k);
    if (selectedPlanId) p.set('plan', selectedPlanId);
    const stay = stateToParams(state);
    for (const [k, v] of stay) p.set(k, v);
    if (extrasSel.length) p.set('extras', extrasSel.map((x) => `${x.id}:${x.qty}`).join(','));
    p.set('roomId', roomId);
    history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
  }, [loaded, state, roomId, selectedPlanId, extrasSel]);

  /* Server-priced quote — the booking card uses the same backend engine as the
     booking page, so room and checkout totals always agree. The local
     fixture-based engine (`pricing/compute`) has been retired. */
  const {
    quote,
    quoteError,
    loading: quoteLoading,
  } = useQuote({
    room,
    hotelId,
    plan,
    hasDates,
    checkin: state.checkin,
    checkout: state.checkout,
    adults: state.adults,
    children: state.children,
    rooms: state.rooms,
    promo: state.promo,
    extrasSel,
    extrasList,
  });

  /* ---------- dialogs ---------- */

  const pick = (day: Date) => {
    const d = startOfDay(day);
    if (!state.checkin || (state.checkin && state.checkout && +d <= +state.checkin)) {
      setDate(d, null);
    } else if (!state.checkout) {
      setDate(+d <= +state.checkin ? d : state.checkin, +d <= +state.checkin ? state.checkin : d);
    } else if (+d < +state.checkout) {
      setDate(state.checkin, d);
    } else {
      setDate(state.checkin, d);
    }
  };

  const openDialog = (which: 'dates' | 'guests') => {
    if (!room) return;
    if (which === 'guests') {
      setGuestTouched(true);
      setPanelSnapshot({
        adults: state.adults,
        children: state.children,
        childrenAges: state.childrenAges.slice(),
        rooms: state.rooms,
      });
    } else {
      setPickerSnapshot({ checkin: state.checkin, checkout: state.checkout });
    }
    setDialog(which);
  };

  const closeDialog = (cancel: boolean) => {
    if (cancel) {
      if (dialog === 'dates' && pickerSnapshot) {
        setDate(pickerSnapshot.checkin, pickerSnapshot.checkout);
      }
      if (dialog === 'guests' && panelSnapshot) {
        setGuests({
          adults: panelSnapshot.adults,
          children: panelSnapshot.children,
          rooms: panelSnapshot.rooms,
        });
        setChildrenAges(panelSnapshot.childrenAges);
      }
    }
    setDialog(null);
    setPickerSnapshot(null);
    setPanelSnapshot(null);
  };

  const applyDialog = () => {
    setDialog(null);
    setPickerSnapshot(null);
    setPanelSnapshot(null);
    // URL sync happens via the stateToParams effect.
  };

  /* Dialog: Escape cancels, body scroll locked. */
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog(true);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  /* ---------- shared bits ---------- */

  const pickerAvail = () => (availForCheckin === checkinIso ? availability : 'checking');
  const checkinIso = state.checkin ? toISODate(state.checkin) : '';

  const availabilityNote = () => {
    const avail = pickerAvail();
    if (avail === 'available')
      return (
        <span className="text-xs font-medium text-emerald-700">Available for these dates</span>
      );
    if (avail === 'few')
      return (
        <span className="text-gold-dark text-xs font-semibold">
          Only a few rooms left for these dates
        </span>
      );
    if (avail === 'soldout')
      return (
        <span className="text-clay text-xs font-semibold">
          Not available for these dates — pick different dates
        </span>
      );
    return <span className="text-navy/45 text-xs">Checking availability…</span>;
  };

  const ctaState = () => {
    if (!hasDates)
      return {
        label: 'Choose dates',
        disabled: false,
        hint: 'Availability & price appear in the booking card',
      };
    if (availability === 'soldout')
      return { label: 'Room unavailable', disabled: true, hint: 'Try different dates' };
    if (!fits)
      return { label: 'Reserve room', disabled: false, hint: "This room doesn't fit your party" };
    return { label: 'Reserve room', disabled: false, hint: 'Live price is in the booking card' };
  };

  const step = (key: string, delta: number) => {
    const [min, max] = PANEL_LIMITS[key] ?? [1, 9];
    const cur = key === 'adults' ? state.adults : key === 'children' ? state.children : state.rooms;
    const next = Math.min(max, Math.max(min, cur + delta));
    if (next === cur) return;
    if (key === 'adults') setGuests({ adults: next });
    else if (key === 'children') setGuests({ children: next });
    else setGuests({ rooms: next });
  };

  const bookFlow = () => {
    if (!hasDates) {
      openDialog('dates');
      return;
    }
    const errs = validateState(state);
    if (errs.length) {
      toast({
        message: 'Please choose check-in and check-out dates first.',
        type: 'error',
        title: 'Dates needed',
      });
      return;
    }
    if (availability === 'soldout') {
      toast({ message: 'This room is sold out for those dates.', type: 'error' });
      return;
    }
    if (!fits) {
      toast({ message: "Your party doesn't fit this room — try another.", type: 'error' });
      return;
    }
    const extras = extrasSel.map((x) => `${x.id}:${x.qty}`).join(',');
    router.push(bookingURL(state, roomId, plan?.id ?? '', { extras }));
  };

  if (notFound) {
    return (
      <div className="border-navy/10 mx-auto mt-8 max-w-xl rounded-3xl border bg-white p-10 text-center">
        <p className="font-display text-navy text-xl font-semibold">Room not found</p>
        <p className="text-navy/60 mt-2 text-sm">
          This room is no longer available. Browse the other rooms of this hotel instead.
        </p>
        <a
          href={hotelId ? `/hotel?hotelid=${hotelId}#rooms` : '/hotel#rooms'}
          className="bg-navy hover:bg-navy-light mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-colors"
        >
          View rooms
        </a>
      </div>
    );
  }

  if (!room || !loaded) {
    if (loadError) {
      return (
        <div className="border-navy/10 mx-auto mt-8 max-w-xl rounded-3xl border bg-white p-10 text-center">
          <p className="font-display text-navy text-xl font-semibold">Unable to load room</p>
          <p className="text-navy/60 mt-2 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-navy hover:bg-navy-light mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return (
      <div className="mt-8 space-y-6 animate-pulse">
        {/* Skeleton mirrors the real layout: photo + room info + details in
            the left column, booking card on the right — no jump when data
            lands. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <div className="min-w-0 space-y-10">
            <div className="border-navy/10 overflow-hidden rounded-3xl border bg-white">
              <div className="bg-navy/5 aspect-[16/10] sm:aspect-[4/3]" />
              <div className="p-6">
                <div className="bg-navy/8 h-3 w-1/4 rounded-full" />
                <div className="bg-navy/10 mt-3 h-5 w-1/3 rounded-full" />
                <div className="mt-4 flex gap-2">
                  <div className="bg-navy/5 h-7 w-20 rounded-full" />
                  <div className="bg-navy/5 h-7 w-24 rounded-full" />
                  <div className="bg-navy/5 h-7 w-16 rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="bg-navy/5 h-3 w-full rounded-full" />
                  <div className="bg-navy/5 h-3 w-5/6 rounded-full" />
                  <div className="bg-navy/5 h-3 w-2/3 rounded-full" />
                </div>
              </div>
            </div>
            <div className="border-navy/10 rounded-3xl border bg-white p-6">
              <div className="bg-navy/8 h-3 w-1/4 rounded-full" />
              <div className="bg-navy/10 mt-3 h-5 w-1/3 rounded-full" />
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="bg-navy/5 h-9 w-9 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="bg-navy/5 h-3 w-3/4 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-navy/10 rounded-3xl border bg-white p-6">
            <div className="bg-navy-dark h-20 rounded-2xl" />
            <div className="mt-4 space-y-3">
              <div className="bg-navy/5 h-3 w-1/3 rounded-full" />
              <div className="bg-navy/10 h-8 w-1/2 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="bg-navy/5 h-12 rounded-2xl" />
              <div className="bg-navy/5 h-12 rounded-2xl" />
            </div>
            <div className="bg-navy mt-4 h-12 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const fromPrice = Math.min(...plans.map((p) => p.price));
  const blocked = availability === 'soldout';
  const unfit = !fits;
  const blockedEtc = blocked || (unfit && !hasDates);

  return (
    <>
      {/* ===== Context bar: breadcrumb + stay strip, offset below the fixed
          header (pt-28). The room content itself (photo, info, details) lives
          in the left column of the grid below — the booking card stays fixed
          on the right for the whole page. */}
      <div className="pt-28">
        {/* Back-to-hotel + breadcrumb */}
        {hotelId && (
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/hotel?hotelid=${hotelId}#rooms`}
              className="text-navy hover:text-gold-dark inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            >
              <span aria-hidden="true">←</span> Back to hotel
            </Link>
            <Breadcrumb
              items={[
                { label: 'Home', href: '/' },
                ...(hotelName ? [{ label: hotelName, href: `/hotel?hotelid=${hotelId}` }] : []),
                { label: room?.name ?? 'Room details' },
              ]}
            />
          </div>
        )}

        {/* ===== Stay strip (contextual bar) ===== */}
        <div className="border-navy/10 mt-2 mb-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          {!hasDates && !ciOnly ? (
            <div className="bg-gold/[0.06] border-navy/8 flex items-start gap-2.5 border-b px-5 py-3">
              <svg
                className="text-gold-dark mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {STAY_ICONS.cal}
              </svg>
              <p className="text-navy/65 text-xs leading-relaxed">
                Choose dates, guests and rooms right here to see live availability and the exact price
                for this room — no need to leave this page.
              </p>
            </div>
          ) : ciOnly ? (
            <div className="bg-gold/[0.06] border-navy/8 flex items-start gap-2.5 border-b px-5 py-3">
              <svg
                className="text-gold-dark mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {STAY_ICONS.cal}
              </svg>
              <p className="text-navy/65 text-xs leading-relaxed">
                Check-in <strong className="text-navy">{fmtShort(state.checkin)}</strong> selected —
                now pick your check-out date to see prices.
              </p>
            </div>
          ) : null}
          <div className="bg-navy/8 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <StaySegment
              icon={STAY_ICONS.cal}
              label="Dates"
              value={
                hasDates
                  ? `${fmtShort(state.checkin)} – ${fmtShort(state.checkout)}`
                  : ciOnly
                    ? 'Select check-out'
                    : 'Choose dates'
              }
              sub={
                hasDates
                  ? `${nights} ${nights === 1 ? 'night' : 'nights'} total`
                  : ciOnly
                    ? 'select your check-out date'
                    : 'pick your check-in and check-out'
              }
              onClick={() => openDialog('dates')}
            />
            <StaySegment
              icon={STAY_ICONS.users}
              label="Guests"
              value={
                guestKnown
                  ? `${state.adults + state.children} ${state.adults + state.children === 1 ? 'Guest' : 'Guests'}`
                  : 'Select guests'
              }
              sub={
                guestKnown
                  ? `${state.adults} ${state.adults === 1 ? 'adult' : 'adults'}${state.children ? ` · ${state.children} ${state.children === 1 ? 'child' : 'children'}` : ''}`
                  : 'adults & children'
              }
              onClick={() => openDialog('guests')}
            />
            <StaySegment
              icon={STAY_ICONS.rooms}
              label="Rooms"
              value={
                guestKnown ? `${state.rooms} ${state.rooms === 1 ? 'Room' : 'Rooms'}` : 'Select room'
              }
              sub="1–5 rooms of this type"
              onClick={() => {
                openDialog('guests');
                setTimeout(() => roomsStepRef.current?.scrollIntoView({ block: 'nearest' }), 60);
              }}
            />
            <div className="flex flex-col items-stretch justify-center gap-1.5 bg-white px-5 py-4 sm:col-span-2 sm:flex-row lg:col-span-1 lg:min-w-[210px] lg:flex-col lg:items-center lg:gap-2 lg:py-3.5">
              <Button
                type="button"
                onClick={bookFlow}
                disabled={ctaState().disabled}
                size="sm"
                className="shadow-navy/20 w-full"
              >
                {ctaState().label}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 12h14m-6-6 6 6-6 6"
                  />
                </svg>
              </Button>
              <p className="text-navy/40 text-center text-[10px] leading-relaxed">
                {ctaState().hint}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Room content: photo + room info + details & amenities stacked
          tightly in the left column, booking card fixed on the right. */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        <div className="min-w-0">
          {/* Photo gallery */}
          <section aria-label="Room photos">
            <PhotoGallery
              photos={(room.images.length ? room.images : [IMG_FALLBACK]).map((src) => ({
                url: image(src, 1400),
                alt: room.name,
              }))}
            />
          </section>

          {/* ===== Room info — right after the photo, in the same column */}
          <div className="mt-8">
            <section aria-labelledby="room-name">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={availability}>
                  {availability === 'available'
                    ? 'Available'
                    : availability === 'few'
                      ? 'Few rooms left'
                      : 'Sold out'}
                </Badge>
                {!fits ? (
                  <span className="text-clay bg-clay/10 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
                    Party doesn&apos;t fit
                  </span>
                ) : null}
              </div>
              <h1
                id="room-name"
                className="font-display text-navy mt-3 text-3xl leading-tight font-semibold sm:text-4xl"
              >
                {room.name}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  room.bed,
                  room.size ? room.size.trim() : '',
                  room.view ?? '',
                  `Up to ${room.capacity.adults} adults${room.capacity.children ? ` + ${room.capacity.children} child` : ''}`,
                ]
                  .filter(Boolean)
                  .map((c) => (
                    <span
                      key={c}
                      className="text-navy border-navy/10 inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[12px] font-medium"
                    >
                      <span className="text-gold-dark" aria-hidden="true">
                        ✦
                      </span>
                      {c}
                    </span>
                  ))}
              </div>
              {room.description ? (
                <ReadMore
                  text={room.description}
                  lines={3}
                  className="text-navy/70 mt-5 max-w-2xl text-[15px] leading-relaxed"
                />
              ) : null}
            </section>
          </div>

          {/* ===== Room details & amenities — same left column as the photo
              and the room info, so the page reads as one continuous block
              (photo → info → details) with the booking card fixed on the
              right, and no dead space between the image and the details. */}
          <div className="mt-12">
            <section aria-labelledby="room-details-title">
              <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                The room
              </p>
              <h2
                id="room-details-title"
                className="font-display text-navy mt-3 text-2xl font-semibold"
              >
                Room details &amp; amenities
              </h2>
              <div className="border-navy/10 mt-5 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
                <div className="space-y-8">
                  <div className="space-y-7">
                    {groupRoomAmenities(room.amenities).map((group) => (
                      <div key={group.label}>
                        <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                          {group.label}
                        </h3>
                        <ul className="text-navy/75 mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                          {group.items.map((a) => (
                            <li key={a} className="flex min-w-0 items-start gap-3">
                              <span className="bg-gold/10 border-gold/25 text-gold-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full border">
                                <svg
                                  className="h-[18px] w-[18px]"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d={iconFor(a)} />
                                </svg>
                              </span>
                              <span className="pt-1.5">{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {plan?.cancellationPolicy ? (
                  <div className="border-navy/10 border-t pt-7">
                    <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                      Good to know
                    </h3>
                    <ul className="text-navy/75 mt-5 space-y-3.5 text-sm">
                      <li className="flex items-start gap-2.5">
                          <svg
                            className="text-gold-dark mt-0.5 h-4 w-4 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d={ICON.check} />
                          </svg>
                          {/* Cancellation policy for the currently-selected rate — real,
                              plan-specific text from the backend (see RatePlan.cancellationPolicy
                              in catalog.ts), not the room-level field, which is unpopulated
                              for every real room today. */}
                          <span className="pt-0.5">{plan.cancellationPolicy}</span>
                      </li>
                    </ul>
                  </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Booking card */}
        <aside
          className="min-w-0 lg:sticky lg:top-28"
          aria-label="Booking card"
        >
          <div className="border-navy/10 shadow-navy/10 rounded-3xl border bg-white p-5 shadow-xl sm:p-6">
            <div className="bg-navy-dark flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-gold-light text-[9px] font-semibold tracking-[0.22em] uppercase">
                  Your stay
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {hasDates
                    ? `${fmtShort(state.checkin)} – ${fmtShort(state.checkout)}`
                    : 'Select dates to book'}
                </p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  {guestsLabel(state)}
                  {hasDates ? ` · ${nights} ${nights === 1 ? 'night' : 'nights'}` : ''}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => openDialog('dates')}
                variant="navyLink"
                className="shrink-0 text-[10px]"
              >
                {hasDates ? 'Edit' : 'Choose dates'}
              </Button>
            </div>

            <div className="mt-3.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-navy/45 text-[11px] font-semibold tracking-[0.18em] uppercase">
                  From
                </p>
                <p className="font-display text-navy mt-1 text-3xl leading-none font-bold">
                  {fmt(fromPrice)}
                  <span className="text-navy/45 font-sans text-sm font-medium"> /night</span>
                </p>
              </div>
              <div className="pb-0.5">
                <Badge variant={availability}>
                  {availability === 'available'
                    ? 'Available'
                    : availability === 'few'
                      ? 'Few rooms left'
                      : 'Sold out'}
                </Badge>
              </div>
            </div>
            {unfit ? (
              <div
                className="bg-clay/10 border-clay/25 text-clay mt-2.5 rounded-2xl border px-4 py-3 text-xs"
                role="alert"
              >
                This room fits {room.capacity.adults} adults
                {room.capacity.children ? ` + ${room.capacity.children} child` : ''}. Your party of{' '}
                {state.adults} adults{state.children ? ` + ${state.children} children` : ''}{' '}
                doesn&apos;t fit — try another room.
              </div>
            ) : null}
            {blocked ? (
              <div
                className="bg-clay/10 border-clay/25 text-clay mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs"
                role="alert"
              >
                <span>
                  This room is not available for {hasDates ? 'your dates' : 'these dates'}. Try a
                  different range.
                </span>
                <Button
                  type="button"
                  onClick={() => openDialog('dates')}
                  variant="navyLink"
                  className="hover:text-clay-light shrink-0 text-[11px] underline underline-offset-2"
                >
                  Change dates
                </Button>
              </div>
            ) : null}

            <div className="mt-3.5">
              <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Select rate
              </p>
              <div className="mt-2 space-y-2">
                {plans.map((p) => {
                  const isSel = p.id === selectedPlanId;
                  const rec = p.id.endsWith('::bb') && !initialPlanOnce;
                  const title = p.mealPlan || p.name;
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${isSel ? 'border-navy bg-navy/[0.04]' : 'border-navy/12 hover:border-navy/30 bg-white'}`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={p.id}
                        checked={isSel}
                        onChange={() => setSelectedPlanId(p.id)}
                        className="accent-navy mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-navy truncate text-sm font-semibold">
                            {title}{' '}
                            {rec ? (
                              <span className="text-gold-dark bg-gold/10 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold tracking-wider uppercase">
                                Recommended
                              </span>
                            ) : null}
                          </span>
                          <span className="font-display text-navy font-semibold whitespace-nowrap">
                            {fmt(p.price)}
                            <span className="text-navy/45 text-xs font-normal"> /night</span>
                          </span>
                        </span>
                        <span className="text-navy/50 mt-0.5 block truncate text-[11px]">
                          {p.name}
                        </span>
                        <span className="mt-1.5 inline-flex items-center gap-2">
                          <Badge variant={p.freeCancellation ? 'plan' : 'soldout'}>
                            {p.freeCancellation ? 'Free cancellation' : 'Non-refundable'}
                          </Badge>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-3.5">
              <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Extras &amp; services
              </p>
              <div className="mt-2">
                <ExtrasPicker
                  extras={extrasList}
                  selected={extrasSel}
                  onChange={setExtrasSel}
                  adults={state.adults || 2}
                  childCount={state.children || 0}
                  compact
                  currency={currency}
                />
              </div>
            </div>

            <div className="mt-3.5">
              <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Promo code
              </p>
              <div className="mt-1.5">
                <PromoField
                  promo={state.promo}
                  onChange={(code) => setPromo(code)}
                  onValidate={() => {}}
                  nights={nights}
                  checkin={state.checkin ? toISODate(state.checkin) : undefined}
                  planId={plan?.id ?? ''}
                  compact
                />
              </div>
            </div>

            <div className="border-navy/10 mt-3.5 border-t pt-3.5">
              {quote ? (
                <QuoteTable
                  quote={quote}
                  currency={currency}
                  highlight
                  note={
                    hasDates
                      ? `Includes ${nights} night${nights === 1 ? '' : 's'}, ${state.rooms} room${state.rooms === 1 ? '' : 's'}.`
                      : ''
                  }
                />
              ) : !hasDates ? (
                <div className="text-navy/55 bg-paper border-navy/10 rounded-2xl border px-4 py-3 text-xs leading-relaxed">
                  Choose your dates to see the exact price for this room — taxes &amp; fees are
                  included in the total.
                </div>
              ) : quoteLoading ? (
                <p className="text-navy/50 py-2 text-sm">Calculating price…</p>
              ) : quoteError ? (
                <p className="text-clay-dark py-2 text-sm" role="alert">
                  {quoteError}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={bookFlow}
              disabled={blockedEtc}
              size="lg"
              className="shadow-navy/20 mt-3.5 w-full rounded-2xl text-sm"
            >
              {blocked ? 'Sold out' : 'Select room & continue'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 12h14m-6-6 6 6-6 6"
                />
              </svg>
            </Button>
            <p className="text-navy/40 mt-2.5 text-center text-[11px]">
              Free cancellation on most plans · No payment needed to check
            </p>
          </div>
        </aside>
      </div>

      {/* Similar rooms — generous breathing room before the footer */}
      <section aria-label="Similar rooms" className="mt-16 mb-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-navy text-2xl font-semibold">You might also like</h2>
          <a
            href="/search"
            className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
          >
            Check availability <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {siblings.length ? (
            siblings.map((x) => {
              const sFrom = Math.min(...x.plans.map((p) => p.price));
              const sHref = x.room.hotelId
                ? hotelRoomURL(state, x.room.hotelId, x.room.id)
                : roomURL(state, x.room.id);
              return (
                <a
                  key={x.room.id}
                  href={sHref}
                  className="group border-navy/10 hover:shadow-navy/10 overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image(x.room.images[0] ?? IMG_FALLBACK, 700)}
                      alt={x.room.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3">
                      <Badge variant={x.availability}>
                        {x.availability === 'available'
                          ? 'Available'
                          : x.availability === 'few'
                            ? 'Few rooms left'
                            : 'Sold out'}
                      </Badge>
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-navy group-hover:text-gold-dark font-semibold transition-colors">
                      {x.room.name}
                    </h3>
                    <p className="text-navy/50 mt-0.5 text-xs">
                      {x.room.bed}
                      {x.room.size ? ` · ${x.room.size}` : ''}
                      {x.room.view ? ` · ${x.room.view}` : ''}
                    </p>
                    <p className="text-navy/70 mt-2 text-sm">
                      from <strong className="font-display text-navy">{fmt(sFrom)}</strong>
                      <span className="text-navy/45 text-xs"> /night</span>
                    </p>
                  </div>
                </a>
              );
            })
          ) : (
            <p className="text-navy/55 text-sm">No other rooms to show.</p>
          )}
        </div>
      </section>

      {/* ===== Dates dialog ===== */}
      {dialog === 'dates' ? (
        <div
          id="room-dates-picker"
          className="fixed inset-0 z-[85]"
          role="dialog"
          aria-modal="true"
          aria-label="Select your dates"
        >
          <div
            className="bg-navy-dark/70 absolute inset-0 backdrop-blur-sm"
            onClick={() => closeDialog(true)}
          ></div>
          <div className="shadow-navy/25 absolute inset-x-0 bottom-0 max-h-[92vh] max-w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[88vh] sm:w-[780px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow text-gold-dark text-[10px] font-semibold tracking-[0.3em] uppercase">
                  Your stay
                </p>
                <h3 className="font-display text-navy mt-1 text-xl leading-tight font-semibold sm:text-2xl">
                  Select your dates
                </h3>
                <p className="text-navy/50 mt-1 truncate text-xs">{room.name}</p>
              </div>
              <Button
                type="button"
                onClick={() => closeDialog(true)}
                variant="outline"
                size="iconLg"
                className="border-navy/12 hover:bg-paper shrink-0 rounded-full"
                aria-label="Close date picker"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div
                className={`min-w-0 rounded-2xl border px-4 py-3 ${ciOnly ? 'border-gold bg-gold/[0.07]' : 'border-navy/15 bg-paper'}`}
              >
                <p
                  className={`text-[10px] font-semibold tracking-[0.16em] uppercase ${ciOnly ? 'text-gold-dark' : 'text-navy/45'}`}
                >
                  Check-in
                </p>
                <p className="text-navy mt-1 truncate text-sm font-bold">
                  {state.checkin ? fmtShort(state.checkin) : 'Select'}
                </p>
              </div>
              <div
                className={`min-w-0 rounded-2xl border px-4 py-3 ${ciOnly ? 'border-gold bg-gold/[0.07]' : 'border-navy/15 bg-paper'}`}
              >
                <p
                  className={`text-[10px] font-semibold tracking-[0.16em] uppercase ${ciOnly ? 'text-gold-dark' : 'text-navy/45'}`}
                >
                  Check-out
                </p>
                <p className="text-navy mt-1 truncate text-sm font-bold">
                  {state.checkout ? fmtShort(state.checkout) : ciOnly ? 'Select now' : 'Select'}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {hasDates ? (
                <span className="text-navy bg-gold/10 border-gold/30 rounded-full border px-3 py-1 text-xs font-semibold">
                  {fmtShort(state.checkin)} → {fmtShort(state.checkout)} · {nights}{' '}
                  {nights === 1 ? 'night' : 'nights'}
                </span>
              ) : state.checkin ? (
                <span className="text-clay bg-clay/10 border-clay/25 rounded-full border px-3 py-1 text-xs font-semibold">
                  Now select your check-out date
                </span>
              ) : null}
            </div>
            <div className="mt-4">
              <Calendar
                checkin={state.checkin}
                checkout={state.checkout}
                onPick={pick}
                confirm={false}
              />
            </div>
            <div className="border-navy/10 mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <div className="min-w-0 flex-1">
                {hasDates ? (
                  <>
                    <p className="text-navy/70 text-sm">
                      {nights} {nights === 1 ? 'night' : 'nights'}
                      {quote && nights ? (
                        <>
                          {' '}
                          · <strong className="font-display text-navy">{fmt(quote.total)}</strong>
                          &nbsp;total
                        </>
                      ) : null}
                    </p>
                    <p className="mt-0.5">{availabilityNote()}</p>
                  </>
                ) : (
                  <p className="text-navy/50 text-xs">
                    Choose check-in and check-out to see availability and the price for this room.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  onClick={() => closeDialog(true)}
                  variant="ghost"
                  className="px-3.5 py-3"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => applyDialog()}
                  disabled={
                    !hasDates || pickerAvail() === 'soldout' || pickerAvail() === 'checking'
                  }
                  className="bg-navy hover:bg-navy-light shadow-navy/20 disabled:hover:bg-navy rounded-xl px-6 py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply dates
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Guests & rooms dialog ===== */}
      {dialog === 'guests' ? (
        <div
          id="room-stay-panel"
          className="fixed inset-0 z-[85]"
          role="dialog"
          aria-modal="true"
          aria-label="Guests and rooms"
        >
          <div
            className="bg-navy-dark/70 absolute inset-0 backdrop-blur-sm"
            onClick={() => closeDialog(true)}
          ></div>
          <div className="shadow-navy/25 absolute inset-x-0 bottom-0 max-h-[92vh] max-w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[88vh] sm:w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow text-gold-dark text-[10px] font-semibold tracking-[0.3em] uppercase">
                  Your stay
                </p>
                <h3 className="font-display text-navy mt-1 text-xl leading-tight font-semibold sm:text-2xl">
                  Guests &amp; rooms
                </h3>
                <p className="text-navy/50 mt-1 truncate text-xs">{room.name}</p>
              </div>
              <Button
                type="button"
                onClick={() => closeDialog(true)}
                variant="outline"
                size="iconLg"
                className="border-navy/12 hover:bg-paper shrink-0 rounded-full"
                aria-label="Close guests &amp; rooms"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-navy/45 text-[10px] font-semibold tracking-[0.16em] uppercase">
                Guests
              </p>
              <div className="bg-paper border-navy/10 divide-navy/8 mt-1 divide-y rounded-2xl border px-4">
                {state.children > 0 ? (
                  <div className="space-y-2.5 py-2.5">
                    {Array.from({ length: state.children }, (_, i) => {
                      const age = state.childrenAges[i] ?? 4;
                      return (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <p className="text-navy text-sm font-medium">Child {i + 1}</p>
                          <select
                            value={age}
                            onChange={(e) => {
                              const ages = [...state.childrenAges];
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
                      );
                    })}
                  </div>
                ) : null}
                <StepperRow
                  label="Adults"
                  sub="Age 18+"
                  value={state.adults}
                  onStep={(d) => step('adults', d)}
                />
                <StepperRow
                  label="Children"
                  sub="Choose an age for each"
                  value={state.children}
                  onStep={(d) => step('children', d)}
                />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-navy/45 text-[10px] font-semibold tracking-[0.16em] uppercase">
                Rooms
              </p>
              <div className="bg-paper border-navy/10 mt-1 rounded-2xl border px-4">
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-navy text-sm font-semibold">Rooms</p>
                    <p className="text-navy/50 text-xs">1–5 rooms of this type</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <StepBtn label="Decrease rooms" onClick={() => step('rooms', -1)}>
                      −
                    </StepBtn>
                    <span className="text-navy w-9 text-center text-sm font-bold">
                      {state.rooms}
                    </span>
                    <StepBtn
                      label="Increase rooms"
                      onClick={() => step('rooms', 1)}
                      ref={roomsStepRef}
                    >
                      +
                    </StepBtn>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-navy/55 mt-3 text-xs">
              Ages help us find rooms that fit your family. At least one adult per room.
            </p>
            <div className="border-navy/10 mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-navy/70 min-w-0 flex-1 truncate text-sm">
                {`${state.adults} ${state.adults === 1 ? 'adult' : 'adults'}${state.children ? ` · ${state.children} ${state.children === 1 ? 'child' : 'children'}` : ''} · ${state.rooms} ${state.rooms === 1 ? 'room' : 'rooms'}`}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => closeDialog(true)}
                  className="text-navy/60 hover:text-navy rounded-xl px-3.5 py-3 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <Button type="button" onClick={() => applyDialog()} className="shadow-navy/20">
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StepperRow({
  label,
  sub,
  value,
  onStep,
}: {
  label: string;
  sub: string;
  value: number;
  onStep: (d: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-navy text-sm font-semibold">{label}</p>
        <p className="text-navy/50 text-xs">{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StepBtn label={`Decrease ${label.toLowerCase()}`} onClick={() => onStep(-1)}>
          −
        </StepBtn>
        <span className="text-navy w-9 text-center text-sm font-bold">{value}</span>
        <StepBtn label={`Increase ${label.toLowerCase()}`} onClick={() => onStep(1)}>
          +
        </StepBtn>
      </div>
    </div>
  );
}

function StepBtn({
  label,
  onClick,
  children,
  ref,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      type="button"
      ref={ref}
      onClick={onClick}
      variant="outline"
      size="icon"
      className="rounded-full text-lg leading-none"
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function StaySegment({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group hover:bg-gold/[0.04] focus-visible:ring-gold/60 flex items-center gap-3 bg-white px-5 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:py-3.5"
      aria-haspopup="dialog"
    >
      <span className="bg-gold/10 border-gold/25 text-gold-dark group-hover:bg-gold/15 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors sm:inline-flex">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-navy/45 block text-[10px] font-semibold tracking-[0.16em] uppercase">
          {label}
        </span>
        <span className="text-navy mt-0.5 block truncate text-sm font-bold">{value}</span>
        <span className="text-navy/50 mt-0.5 block truncate text-[11px]">{sub}</span>
      </span>
      <svg
        className="text-navy/30 group-hover:text-navy/60 h-4 w-4 shrink-0 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}
