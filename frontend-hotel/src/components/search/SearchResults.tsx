'use client';

/* Search page results — port of search.js: availability list, promo analysis
   + banner, stay-summary chips, sort, skeleton, empty state. The shared
   SearchBar above handles editing; "Adjust my search" opens the mobile sheet
   or scrolls to #searchbar, exactly like the reference. Facets (f_* params)
   are added on top — Phase 3. */

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { useCurrency } from '@/hooks/useCurrency';
import { dateLabel, guestsLabel, nightsBetween, readStateFromURL, validateState } from '@/lib/dates';
import { image, IMG_FALLBACK, filterEntries } from '@/services/availability';
import { searchStay } from '@/services/catalog';
import { getCanonicalHotel } from '@/services/canonicalHotel';
import { validatePromo } from '@/services/pricing';
import { ensurePricingSources } from '@/services/pricingHydration';
import { hotelRoomURL, roomURL } from '@/lib/links';
import {
  amenityOptions,
  CAT_OPTIONS,
  emptyFilters,
  FILTER_PARAMS,
  filterCount,
  filtersActive,
  filtersToParams,
  parseFilters,
  PLAN_OPTIONS,
  PRICE_OPTIONS,
  REFUND_OPTIONS,
} from '@/lib/filters';
import type { SearchFilters } from '@/lib/filters';
import { Badge } from '@/components/ui/Badge';
import type { PromoResult, SearchResultEntry } from '@/types';

type SortMode = 'recommended' | 'price-asc' | 'price-desc';

const SKELETON = Array.from({ length: 4 }, (_, i) => (
  <div key={i} className="border-navy/10 overflow-hidden rounded-3xl border bg-white">
    <Skeleton className="aspect-[4/3] rounded-none" />
    <div className="space-y-2.5 p-5">
      <Skeleton className="h-4 w-2/3 rounded-full" />
      <Skeleton className="h-3 w-1/2 rounded-full" />
      <Skeleton className="h-3 w-full rounded-full" />
      <Skeleton className="mt-4 h-9 w-full rounded-2xl" />
    </div>
  </div>
));

const FACETS: Array<{
  key: keyof SearchFilters;
  label: string;
  options: readonly { key: string; label: string }[];
}> = [
  { key: 'price', label: 'Price per night', options: PRICE_OPTIONS },
  { key: 'plans', label: 'Meal plan', options: PLAN_OPTIONS },
  { key: 'refund', label: 'Cancellation', options: REFUND_OPTIONS },
  { key: 'cat', label: 'Room type', options: CAT_OPTIONS },
];

export default function SearchResults() {
  const { state, setPromo, openSheet } = useSearch();
  const { fmt } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<SearchResultEntry[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [searchError, setSearchError] = useState('');
  const [mode, setMode] = useState<SortMode>('recommended');
  const [noMatchMsg, setNoMatchMsg] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(() =>
    parseFilters(searchParams ?? new URLSearchParams())
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const nights = nightsBetween(state.checkin, state.checkout);
  const validationMsg = validateState(state).join(' ');
  const invalid = validationMsg.length > 0;

  /* Fetch ONLY the committed search (URL), never live edits: the Search bar
     writes context immediately while typing, but only "Search" pushes to the
     URL — so this effect fires exactly once per click. Facet/promo/currency
     params are excluded so they never re-trigger a search. The stay is
     always searched against the platform's single canonical hotel. */
  const stayKey = ['checkin', 'checkout', 'adults', 'children', 'rooms']
    .map((k) => searchParams?.get(k) ?? '')
    .join('|');
  /* Loading is derived: any committed-search change immediately re-renders the
     skeleton without touching state inside the effect. */
  const loading = stayKey !== loadedKey;

  /* Backend promo catalog for promoAnalysis below (a ?promo= deep link, e.g.
     from OffersGrid's "Apply this offer", must be validatable on arrival). */
  useEffect(() => {
    ensurePricingSources();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    stayKey
      .split('|')
      .forEach((v, i) => v && p.set(['checkin', 'checkout', 'adults', 'children', 'rooms'][i]!, v));
    const committed = readStateFromURL(p);
    if (validateState(committed).length) return;
    let alive = true;
    Promise.all([
      getCanonicalHotel(),
      searchStay(undefined, {
        checkin: committed.checkin,
        checkout: committed.checkout,
        adults: committed.adults,
        children: committed.children,
        rooms: committed.rooms,
      }),
    ]).then(([canonical, list]) => {
      if (!alive) return;
      // backend staySearch scopes to the single active hotel; keep the
      // canonical id on entries for links
      setEntries(list.map((e) => ({ ...e, hotelId: e.hotelId ?? canonical.id })));
      setLoadedKey(stayKey);
      setSearchError('');
      if (!list.length)
        setNoMatchMsg(
          'We have no rooms matching those dates at the moment. Try adjusting your dates or guest numbers.'
        );
    }).catch(() => {
      if (!alive) return;
      setEntries([]);
      setLoadedKey(stayKey);
      setSearchError('Could not load rooms — please check your connection and try again.');
    });
    return () => {
      alive = false;
    };
  }, [stayKey]);

  /* keep facets in sync with the URL (refresh, back/forward, deep links) */
  const paramsKey = searchParams?.toString() ?? '';
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(parseFilters(new URLSearchParams(paramsKey)));
    }, 0);
    return () => clearTimeout(t);
  }, [paramsKey]);

  const emptyMsg = searchError || validationMsg || noMatchMsg;

  const promoAnalysis = useMemo(() => {
    const out: { any: boolean; first: PromoResult | null; result: PromoResult | null } = {
      any: false,
      first: null,
      result: null,
    };
    if (!state.promo || !entries) return out;
    for (const e of entries) {
      for (const p of e.plans) {
        const res = validatePromo(state.promo, { nights, checkin: state.checkin, planId: p.id });
        if (res.valid) {
          out.any = true;
          out.result = res;
          return out;
        }
        if (!out.first) out.first = res;
      }
    }
    return out;
  }, [entries, state.promo, nights, state.checkin]);

  const filtered = useMemo(() => filterEntries(entries ?? [], filters), [entries, filters]);

  const sorted = useMemo(() => {
    const list = filtered.slice();
    if (mode === 'price-asc')
      list.sort(
        (a, b) =>
          Math.min(...a.plans.map((p) => p.price)) - Math.min(...b.plans.map((p) => p.price))
      );
    else if (mode === 'price-desc')
      list.sort(
        (a, b) =>
          Math.min(...b.plans.map((p) => p.price)) - Math.min(...a.plans.map((p) => p.price))
      );
    else
      list.sort((a, b) =>
        a.availability === b.availability
          ? b.demand - a.demand
          : a.availability === 'available'
            ? -1
            : 1
      );
    return list;
  }, [filtered, mode]);

  const amenityOptionsForResults = useMemo(
    () => amenityOptions((entries ?? []).map((e) => e.room)),
    [entries]
  );

  const facetOptions = useMemo(
    () => [
      ...FACETS,
      ...(amenityOptionsForResults.length
        ? [
            {
              key: 'amenities' as const,
              label: 'Amenities',
              options: amenityOptionsForResults.map((a) => ({ key: a, label: a })),
            },
          ]
        : []),
    ],
    [amenityOptionsForResults]
  );

  const replaceUrlWithFilters = (next: SearchFilters) => {
    const sp = new URLSearchParams((searchParams ?? new URLSearchParams()).toString());
    const fp = filtersToParams(next);
    for (const key of Object.values(FILTER_PARAMS)) {
      const v = fp.get(key);
      if (v) sp.set(key, v);
      else sp.delete(key);
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const toggleFilter = (key: keyof SearchFilters, value: string) => {
    const next = {
      ...filters,
      [key]: filters[key].includes(value)
        ? filters[key].filter((v) => v !== value)
        : [...filters[key], value],
    };
    setFilters(next);
    replaceUrlWithFilters(next);
  };

  const clearFilters = () => {
    const next = emptyFilters();
    setFilters(next);
    replaceUrlWithFilters(next);
  };

  const removePromo = () => setPromo('', true);

  const adjustSearch = () => {
    if (window.innerWidth < 1024) {
      openSheet();
      return;
    }
    document.getElementById('searchbar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const ready = !loading && entries !== null;
  const filteredEmpty =
    ready && entries!.length > 0 && sorted.length === 0 && filtersActive(filters);
  const activeCount = filterCount(filters);

  return (
    <>
      {/* promo banner */}
      <div
        id="promo-banner"
        className={state.promo && ready && entries!.length ? 'mt-4' : 'mt-4 hidden'}
        role="status"
      >
        {state.promo && ready && entries!.length ? (
          promoAnalysis.any ? (
            <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-700/20 bg-emerald-700/8 px-4 py-3 text-sm text-emerald-700">
              <strong>{state.promo}</strong> applies — {promoAnalysis.result!.offer!.title} (
              {promoAnalysis.result!.offer!.badge}). Shown on every eligible rate below.
            </span>
          ) : (
            <span className="text-clay bg-clay/8 border-clay/25 inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm">
              {promoAnalysis.first
                ? promoAnalysis.first.message
                : `“${state.promo}” doesn't apply to any available rate for your dates.`}
            </span>
          )
        ) : null}
      </div>

      {/* stay summary */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        {state.checkin && state.checkout ? (
          <span className="text-navy border-navy/10 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold">
            {dateLabel(state)}
          </span>
        ) : null}
        <span className="text-navy border-navy/10 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold">
          {guestsLabel(state)}
        </span>
        {state.promo ? (
          <span className="text-gold-dark bg-gold/10 border-gold/30 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold">
            Code {state.promo}
            <Button
              type="button"
              onClick={removePromo}
              variant="ghost"
              className="hover:text-clay"
              aria-label="Remove promo code"
            >
              ✕
            </Button>
          </span>
        ) : null}
      </div>

      {/* toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-navy/60 text-sm" aria-live="polite">
          {ready && !emptyMsg
            ? `${sorted.length} ${sorted.length === 1 ? 'room' : 'rooms'} available · ${nights} ${nights === 1 ? 'night' : 'nights'}`
            : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {ready && entries!.length > 0 ? (
            <>
              <Button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                variant={activeCount ? 'default' : 'outline'}
                size="sm"
                aria-expanded={filtersOpen}
                aria-controls="filter-panel"
                className="gap-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M4 6h16M7 12h10M10 18h4"
                  />
                </svg>
                Filters
                {activeCount > 0 ? (
                  <span className="bg-gold text-navy-dark inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                    {activeCount}
                  </span>
                ) : null}
              </Button>
              {activeCount > 0 ? (
                <Button
                  type="button"
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-navy/60 hover:text-clay"
                >
                  Clear all
                </Button>
              ) : null}
            </>
          ) : null}
          <label
            htmlFor="sort-select"
            className="text-navy/55 hidden text-xs font-semibold tracking-wider uppercase sm:inline"
          >
            Sort by
          </label>
          <select
            id="sort-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as SortMode)}
            className="border-navy/15 text-navy focus:ring-gold/40 rounded-xl border bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none"
            aria-label="Sort results"
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>

      {/* filter panel */}
      {ready && entries!.length > 0 && filtersOpen ? (
        <div
          id="filter-panel"
          className="border-navy/10 shadow-navy/5 mt-4 grid gap-x-8 gap-y-5 rounded-3xl border bg-white p-5 shadow-md sm:grid-cols-2 lg:grid-cols-4"
        >
          {facetOptions.map((facet) => (
            <fieldset key={facet.key}>
              <legend className="text-navy/55 text-xs font-semibold tracking-wider uppercase">
                {facet.label}
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {facet.options.map((opt) => {
                  const on = filters[facet.key].includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleFilter(facet.key, opt.key)}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        on
                          ? 'border-navy bg-navy text-white'
                          : 'text-navy border-navy/15 bg-paper hover:border-navy/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      {/* results */}
      <div
        className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        role="region"
        aria-label="Room results"
        aria-busy={loading}
      >
        {loading && !invalid ? SKELETON : null}
        {ready && !emptyMsg && !filteredEmpty
          ? sorted.map((e) => {
              const { room, availability, plans } = e;
              const fromPrice = Math.min(...plans.map((p) => p.price));
              const minPlan = plans.find((p) => p.price === fromPrice) ?? plans[0]!;
              const promoOk =
                state.promo && promoAnalysis.any
                  ? validatePromo(state.promo, {
                      nights,
                      checkin: state.checkin,
                      planId: minPlan.id,
                    }).valid
                  : false;
              const href = e.hotelId
                ? hotelRoomURL(state, e.hotelId, room.id)
                : roomURL(state, room.id);
              return (
                <article
                  key={`${e.hotelId ?? ''}-${room.id}`}
                  className="group border-navy/10 hover:shadow-navy/10 flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-2xl"
                >
                  <a href={href} className="relative block aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image(room.images[0] ?? IMG_FALLBACK, 800)}
                      alt={`${room.name}${e.hotelName ? ` — ${e.hotelName}` : ''}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3">
                      <Badge variant={availability}>
                        {availability === 'available'
                          ? 'Available'
                          : availability === 'few'
                            ? 'Few rooms left'
                            : 'Sold out'}
                      </Badge>
                    </span>
                  </a>
                  <div className="flex flex-1 flex-col gap-1.5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-navy text-lg leading-snug font-semibold">
                          <a href={href} className="hover:text-gold-dark transition-colors">
                            {room.name}
                          </a>
                        </h2>
                        <p className="text-navy/55 mt-0.5 text-xs">
                          {e.hotelName ? <span className="font-medium">{e.hotelName} · </span> : null}
                          {room.bed}
                          {room.size ? ` · ${room.size}` : ''}
                          {room.view ? ` · ${room.view}` : ''}
                        </p>
                      </div>
                      {promoOk ? (
                        <span className="text-gold-dark bg-gold/10 border-gold/30 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
                          {promoAnalysis.result!.offer!.badge} with {state.promo}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-navy/70 mt-1.5 line-clamp-2 text-sm">{room.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {plans.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className="text-navy/60 bg-paper border-navy/8 rounded-full border px-2.5 py-1 text-[11px]"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <p className="text-navy/70 text-sm">
                        from{' '}
                        <strong className="font-display text-navy text-lg">{fmt(fromPrice)}</strong>
                        <span className="text-navy/45 text-xs"> /night</span>
                      </p>
                      <a
                        href={href}
                        className="bg-navy hover:bg-navy-light shadow-navy/15 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase shadow-lg transition-colors"
                      >
                        View room
                      </a>
                    </div>
                    <p className="text-navy/40 text-[11px]">
                      Free cancellation on most plans · No payment needed to check
                    </p>
                  </div>
                </article>
              );
            })
          : null}
      </div>

      {/* filter-only empty state */}
      {filteredEmpty ? (
        <div className="border-navy/10 mx-auto mt-10 max-w-xl rounded-3xl border bg-white p-10 text-center">
          <p className="font-display text-navy text-xl font-semibold">
            No rooms match those filters
          </p>
          <p className="text-navy/60 mt-2 text-sm">
            Try removing one or two filters — every room below is available for your dates.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" onClick={clearFilters} size="sm">
              Clear all filters
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(true)} variant="outline" size="sm">
              Edit filters
            </Button>
          </div>
        </div>
      ) : null}

      {/* empty state */}
      <div
        className={`${(ready && emptyMsg) || invalid ? '' : 'hidden'} border-navy/10 mx-auto mt-10 max-w-xl rounded-3xl border bg-white p-10 text-center`}
      >
        <p className="font-display text-navy text-xl font-semibold">No rooms match that search</p>
        <p className="text-navy/60 mt-2 text-sm">{emptyMsg}</p>
        <Button type="button" onClick={adjustSearch} size="sm" className="mt-5 shadow-none">
          Adjust my search
        </Button>
      </div>
    </>
  );
}
