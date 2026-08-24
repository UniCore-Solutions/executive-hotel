'use client';

/* Persistent segmented search bar — port of RC.searchBarHTML / mountSearchBar +
   togglePromoInput (common.js). Dates · Guests · Promo · Search, with floating
   popover panels and a mobile pill that opens the global bottom sheet. */
import { Button } from '@/components/ui/button';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/hooks/useLang';
import { dateLabel, guestsLabel, stateToQuery, startOfDay } from '@/lib/dates';
import { recordSearch } from '@/services/activity';
import Calendar from '@/components/search/Calendar';
import GuestsPanel from '@/components/search/GuestsPanel';

const SEG_ICONS = {
  dates: (
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
        d="M8 7V5a4 4 0 0 1 8 0v2m-9 0h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
      />
    </svg>
  ),
  guests: (
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
        d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m9-13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm7 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm2 6.5v-1a3.5 3.5 0 0 0-3-3.45"
      />
    </svg>
  ),
  promo: (
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
        d="m6 7 4 4 8-5-1 7-3 6-3-1-1 3-7-7 3-1-1 3-1-3Zm2-4 3 3m-1 3 3-3"
      />
    </svg>
  ),
};

export default function SearchBar({
  className = '',
  showMobileTrigger = true,
}: {
  className?: string;
  showMobileTrigger?: boolean;
}) {
  const router = useRouter();
  const { state, setDate, setPromo, syncUrl, errors, openSheet } = useSearch();
  const { toast } = useToast();
  const { t } = useLang();
  const [panel, setPanel] = useState<'' | 'dates' | 'guests' | 'promo'>('');
  const [panelDir, setPanelDir] = useState<'down' | 'up'>('down');
  const panelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  /* One popover at a time; close on outside click, scroll or resize (reference). */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setPanel('');
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanel('');
    }
    function onScroll() {
      setPanel('');
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* Popovers open downward; flip upward when they would run past the viewport
     bottom (the hero search bar sits low on the page). */
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top - r.height - 16;
    setPanelDir(spaceBelow < 8 && spaceAbove >= 8 ? 'up' : 'down');
  }, [panel]);

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

  const applyDates = () => {
    syncUrl();
    setPanel('');
  };

  const applyPromo = () => {
    setPromo(promoInput, true);
    toast({
      message: `Code ${promoInput.trim() ? promoInput.trim().toUpperCase() : '(none)'} will be checked with your search.`,
      type: 'info',
      title: 'Promo code saved',
    });
    setPanel('');
  };

  const submitSearch = () => {
    const errs = errors();
    if (errs.length) {
      toast({ message: errs.join(' '), type: 'error', title: 'Please complete your search' });
      return;
    }
    recordSearch(state);
    router.push(`/search${stateToQuery(state)}`);
  };

  const segButton = (
    id: string,
    icon: React.ReactNode,
    label: string,
    sub: string,
    open: boolean
  ) => (
    <button
      type="button"
      id={id}
      onClick={() => {
        setPanelDir('down');
        setPanel(open ? '' : (id.replace('seg-', '') as '' | 'dates' | 'guests' | 'promo'));
      }}
      className="group hover:bg-navy/[0.04] flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors lg:gap-3 lg:py-3 lg:pr-3 lg:pl-4"
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <span className="bg-navy/[0.06] group-hover:bg-gold/15 group-hover:text-gold-dark hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors sm:inline-flex lg:h-9 lg:w-9">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-navy/45 block text-[10px] font-semibold tracking-[0.14em] uppercase lg:text-[11px]">
          {label}
        </span>
        <span
          id={`${id}-value`}
          className="text-navy block truncate text-[13px] font-semibold lg:text-sm"
        >
          {sub}
        </span>
      </span>
    </button>
  );

  const [promoInput, setPromoInput] = useState(state.promo);

  return (
    <div ref={barRef} className={`searchbar-wrap relative ${className || ''}`}>
      <div className="hidden md:block">
        <div
          className="shadow-navy/10 border-navy/10 flex items-stretch gap-1 rounded-2xl border bg-white p-2 shadow-xl lg:rounded-full lg:pr-2 lg:pl-3"
          role="search"
          aria-label="Search availability"
        >
          <div className="relative min-w-0 flex-1">
            {segButton(
              'seg-dates',
              SEG_ICONS.dates,
              t('dates').toUpperCase(),
              dateLabel(state),
              panel === 'dates'
            )}
            {panel === 'dates' && (
              <div
                id="date-picker"
                ref={panelRef}
                className={`shadow-navy/15 border-navy/10 absolute left-0 z-50 w-[720px] max-w-[calc(100vw-2rem)] rounded-3xl border bg-white p-5 shadow-2xl ${panelDir === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                role="dialog"
                aria-label="Choose dates"
              >
                <Calendar
                  checkin={state.checkin}
                  checkout={state.checkout}
                  onPick={pick}
                  onConfirm={applyDates}
                />
              </div>
            )}
          </div>
          <div className="bg-navy/10 my-2 hidden w-px lg:block" aria-hidden="true" />
          <div className="relative min-w-0 flex-1">
            {segButton(
              'seg-guests',
              SEG_ICONS.guests,
              t('guests').toUpperCase(),
              guestsLabel(state),
              panel === 'guests'
            )}
            {panel === 'guests' && (
              <div
                id="guests-panel"
                ref={panelRef}
                className={`shadow-navy/15 border-navy/10 absolute left-0 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-3xl border bg-white p-5 shadow-2xl ${panelDir === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                role="dialog"
                aria-label="Guests"
              >
                <GuestsPanel onDone={() => setPanel('')} />
              </div>
            )}
          </div>
          <div className="bg-navy/10 my-2 hidden w-px xl:block" aria-hidden="true" />
          <div className="relative min-w-0 flex-1">
            {segButton(
              'seg-promo',
              SEG_ICONS.promo,
              t('promo').toUpperCase(),
              state.promo || t('promo'),
              panel === 'promo'
            )}
            {panel === 'promo' && (
              <div
                className={`promo-editor shadow-navy/15 border-navy/10 absolute right-0 z-50 flex items-center gap-2 rounded-2xl border bg-white p-3 shadow-xl ${panelDir === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
              >
                <input
                  id="promo-input"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyPromo();
                  }}
                  placeholder="Code, e.g. SUMMER2026"
                  autoFocus
                  className="bg-paper border-navy/15 text-navy focus:ring-gold/40 w-44 rounded-xl border px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none"
                  aria-label="Promo code"
                />
                <Button
                  type="button"
                  id="promo-apply"
                  onClick={applyPromo}
                  size="sm"
                  className="px-3.5 py-2"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
          <Button
            type="button"
            id="search-submit"
            onClick={submitSearch}
            size="sm"
            className="shadow-navy/25 rounded-xl px-5 py-3 text-sm lg:rounded-full lg:px-7 lg:py-0"
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
                strokeWidth="2"
                d="m21 21-4.3-4.3M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
            <span className="hidden md:inline">{t('searchRooms')}</span>
          </Button>
        </div>
      </div>

      {showMobileTrigger && (
        <div className="md:hidden">
          <button
            type="button"
            data-open-sheet
            onClick={openSheet}
            className="shadow-navy/10 border-navy/10 flex w-full items-center gap-3 rounded-full border bg-white px-5 py-3.5 text-left shadow-xl"
            aria-haspopup="dialog"
            aria-label="Open search"
          >
            <span className="bg-navy flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white">
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
                  strokeWidth="2"
                  d="m21 21-4.3-4.3M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-navy/45 block text-[10px] font-semibold tracking-[0.14em] uppercase">
                {t('dates')} · {t('guests')}
              </span>
              <span
                id="mobile-search-value"
                className="text-navy block truncate text-sm font-semibold"
              >
                {dateLabel(state)} · {guestsLabel(state)}
              </span>
            </span>
            <span className="bg-navy shrink-0 rounded-full px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase">
              {t('search')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
