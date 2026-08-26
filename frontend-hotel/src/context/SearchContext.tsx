'use client';

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { CurrencyCode, SearchState } from '@/types';
import {
  dateLabel,
  getDefaultState,
  guestsLabel,
  nightsBetween,
  readStateFromURL,
  stateToParams,
  totalGuests,
  validateState,
} from '@/lib/dates';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface SearchContextValue {
  state: SearchState;
  update: (patch: Partial<SearchState>) => void;
  setDate: (checkin: Date | null, checkout: Date | null) => void;
  setGuests: (patch: { adults?: number; children?: number; rooms?: number }) => void;
  setChildrenAges: (ages: number[]) => void;
  setPromo: (promo: string, sync?: boolean) => void;
  setCurrency: (cur: CurrencyCode) => void;
  setDestination: (dest: string, name?: string) => void;
  reset: () => void;
  syncUrl: (extra?: Record<string, string>) => void;
  nights: () => number;
  dateLabel: () => string;
  guestsLabel: () => string;
  totalGuests: () => number;
  errors: () => string[];
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  /** Which search sheet step to open to (null = default). */
  sheetStep: string | null;
  openSheetTo: (step: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/* useSearchParams suspends during static prerendering — provide a default-state
   context under a fallback so every page can still prerender statically. */
export function SearchProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<SearchFallback>{children}</SearchFallback>}>
      <SearchUrlProvider>{children}</SearchUrlProvider>
    </Suspense>
  );
}

function SearchFallback({ children }: { children: ReactNode }) {
  const [state] = useState<SearchState>(() => getDefaultState());
  const value = useMemo<SearchContextValue>(
    () => ({
      state,
      update: () => {},
      setDate: () => {},
      setGuests: () => {},
      setChildrenAges: () => {},
      setPromo: () => {},
      setCurrency: () => {},
      setDestination: () => {},
      reset: () => {},
      syncUrl: () => {},
      nights: () => 0,
      dateLabel: () => 'Select dates',
      guestsLabel: () => guestsLabel(state),
      totalGuests: () => totalGuests(state),
      errors: () => [],
      sheetOpen: false,
      openSheet: () => {},
      closeSheet: () => {},
      sheetStep: null,
      openSheetTo: () => {},
    }),
    [state]
  );
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

function SearchUrlProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setStateInternal] = useState<SearchState>(() =>
    readStateFromURL(
      searchParams?.toString()
        ? new URLSearchParams(searchParams.toString())
        : new URLSearchParams()
    )
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<string | null>(null);
  const stateRef = useRef(state);

  /* keep the latest state available to sync helpers without extra renders */
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* keep context in sync with browser navigation (back/forward, deep links) */
  const paramsKey = searchParams?.toString() ?? '';
  useEffect(() => {
    const t = setTimeout(() => {
      setStateInternal(readStateFromURL(new URLSearchParams(paramsKey)));
    }, 0);
    return () => clearTimeout(t);
  }, [paramsKey]);

  /* Search-page facets (`f_*`) are owned by SearchResults; stay-state rewrites
     must keep them in the URL rather than dropping them silently. */
  const withFacets = useCallback(
    (p: URLSearchParams) => {
      if (!searchParams) return p;
      for (const k of Array.from(searchParams.keys())) {
        if (k.startsWith('f_')) p.set(k, searchParams.get(k)!);
      }
      return p;
    },
    [searchParams]
  );

  const syncUrl = useCallback(
    (extra?: Record<string, string>) => {
      const p = withFacets(stateToParams(stateRef.current, extra));
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [router, pathname, withFacets]
  );

  const setDate = useCallback((checkin: Date | null, checkout: Date | null) => {
    setStateInternal((s) => ({ ...s, checkin, checkout }));
  }, []);

  const setGuests = useCallback((patch: { adults?: number; children?: number; rooms?: number }) => {
    setStateInternal((s) => {
      let childrenAges = s.childrenAges;
      const nextChildren = patch.children ?? s.children;
      if (patch.children !== undefined) {
        while (childrenAges.length < nextChildren) childrenAges = [...childrenAges, 4];
        childrenAges = childrenAges.slice(0, nextChildren);
      }
      const adults = patch.adults ?? s.adults;
      const rooms = patch.rooms ?? s.rooms;
      return { ...s, ...patch, adults: rooms > adults ? rooms : adults, childrenAges };
    });
  }, []);

  const setChildrenAges = useCallback((ages: number[]) => {
    setStateInternal((s) => ({ ...s, childrenAges: ages.slice(0, s.children) }));
  }, []);

  const setPromo = useCallback(
    (promo: string, sync = false) => {
      const normalized = promo.trim().toUpperCase();
      setStateInternal((s) => ({ ...s, promo: normalized }));
      if (sync) {
        const p = withFacets(stateToParams({ ...stateRef.current, promo: normalized }));
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
      }
    },
    [pathname, router, withFacets]
  );

  const setCurrency = useCallback(
    (cur: CurrencyCode) => {
      setStateInternal((s) => ({ ...s, currency: cur }));
      const p = withFacets(stateToParams({ ...stateRef.current, currency: cur }));
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, withFacets]
  );

  const setDestination = useCallback(
    (dest: string, name?: string) => {
      setStateInternal((s) => ({ ...s, destination: dest, destinationName: name }));
    },
    []
  );

  const reset = useCallback(() => {
    setStateInternal(getDefaultState());
  }, []);

  const { update } = useMemo(
    () => ({
      update: (patch: Partial<SearchState>) => setStateInternal((s) => ({ ...s, ...patch })),
    }),
    []
  );

  const openSheetTo = useCallback((step: string) => {
    setSheetStep(step);
    setSheetOpen(true);
  }, []);

  const value = useMemo<SearchContextValue>(
    () => ({
      state,
      update,
      setDate,
      setGuests,
      setChildrenAges,
      setPromo,
      setCurrency,
      setDestination,
      reset,
      syncUrl,
      nights: () => nightsBetween(state.checkin, state.checkout),
      dateLabel: () => dateLabel(state),
      guestsLabel: () => guestsLabel(state),
      totalGuests: () => totalGuests(state),
      errors: () => validateState(state),
      sheetOpen,
      openSheet: () => {
        setSheetStep(null);
        setSheetOpen(true);
      },
      closeSheet: () => {
        setSheetOpen(false);
        setSheetStep(null);
      },
      sheetStep,
      openSheetTo,
    }),
    [
      state,
      update,
      setDate,
      setGuests,
      setChildrenAges,
      setPromo,
      setCurrency,
      setDestination,
      reset,
      syncUrl,
      sheetOpen,
      sheetStep,
      openSheetTo,
    ]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}
