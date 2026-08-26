'use client';

/* Context-aware mobile bottom bar — fixed at the bottom on small screens,
   adapts its content to the current page context. On tap, opens the
   appropriate mobile sheet/panel. Only visible on screens < 768px (md). */

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { fmtShort, guestsLabel } from '@/lib/dates';
import { searchURL } from '@/lib/links';

/** Determine which bottom bar variant to show based on the current route. */
function useBottomBarVariant(): 'home' | 'hotel' | 'room' | 'booking' | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === '/') return 'home';
  if (pathname === '/booking') return 'booking';
  if (pathname === '/hotel') {
    return searchParams?.has('roomId') ? 'room' : 'hotel';
  }
  if (pathname === '/search') return 'hotel';
  return null;
}

export default function MobileBottomBar() {
  const variant = useBottomBarVariant();
  const { state, openSheet, openSheetTo } = useSearch();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 120);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!variant) return null;

  const hasDates = !!(state.checkin && state.checkout);
  const hasDest = !!state.destination;

  const handleClick = () => {
    if (variant === 'home') {
      openSheet();
    } else if (variant === 'hotel') {
      openSheetTo('dates');
    } else if (variant === 'room') {
      openSheetTo('dates');
    } else if (variant === 'booking') {
      openSheetTo('dates');
    }
  };

  const handleSearch = () => {
    if (variant === 'home') {
      if (!hasDates) {
        openSheetTo('dates');
        return;
      }
      router.push(searchURL(state));
    }
  };

  return (
    <div
      className="fixed right-0 bottom-0 left-0 z-[60] md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: visible || variant === 'home' ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div className="border-t border-navy/10 bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(20,38,57,0.1)] backdrop-blur-xl">
        {variant === 'home' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClick}
              className="min-w-0 flex-1"
            >
              <div className="border-navy/10 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm">
                <svg
                  className="text-navy/50 h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="m21 21-4.3-4.3M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-navy truncate text-sm font-semibold">
                    {hasDest ? (state.destinationName || 'Hotel selected') : 'Where to?'}
                  </p>
                  <p className="text-navy/50 truncate text-[11px]">
                    {hasDates
                      ? `${fmtShort(state.checkin)} – ${fmtShort(state.checkout)} · ${guestsLabel(state)}`
                      : 'Dates · Guests'}
                  </p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="bg-navy shrink-0 rounded-2xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg shadow-navy/15"
            >
              Search
            </button>
          </div>
        )}

        {variant === 'hotel' && (
          <button type="button" onClick={handleClick} className="w-full">
            <div className="border-navy/10 flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <div className="min-w-0 text-left">
                <p className="text-navy/45 text-[10px] font-semibold tracking-wider uppercase">
                  Availability
                </p>
                <p className="text-navy mt-0.5 truncate text-sm font-semibold">
                  {hasDates
                    ? `${fmtShort(state.checkin)} – ${fmtShort(state.checkout)}`
                    : 'Select dates to check'}
                </p>
                <p className="text-navy/50 mt-0.5 text-[11px]">
                  {guestsLabel(state)}
                </p>
              </div>
              <span className="bg-navy shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-bold tracking-wider text-white uppercase">
                Edit
              </span>
            </div>
          </button>
        )}

        {variant === 'room' && (
          <button type="button" onClick={handleClick} className="w-full">
            <div className="border-navy/10 flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm">
              <div className="min-w-0 text-left">
                <p className="text-navy/45 text-[10px] font-semibold tracking-wider uppercase">
                  Your stay
                </p>
                <p className="text-navy mt-0.5 truncate text-sm font-semibold">
                  {hasDates
                    ? `${fmtShort(state.checkin)} – ${fmtShort(state.checkout)}`
                    : 'Select dates & guests'}
                </p>
                <p className="text-navy/50 mt-0.5 text-[11px]">
                  {guestsLabel(state)}
                </p>
              </div>
              <span className="bg-navy shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-bold tracking-wider text-white uppercase">
                Edit
              </span>
            </div>
          </button>
        )}

        {variant === 'booking' && (
          <div className="flex items-center justify-between">
            <p className="text-navy/50 text-[11px]">Complete your details below</p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-navy/5 rounded-xl px-4 py-2 text-xs font-semibold text-navy hover:bg-navy/10"
            >
              Back to top
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
