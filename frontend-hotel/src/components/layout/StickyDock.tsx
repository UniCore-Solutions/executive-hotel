'use client';

/* Sticky stay dock — reference port of mountStickyDock (common.js). Not rendered
   on the current homepage: replaced by the single hero search bar that pins below
   the header on scroll (StickySearchBar, D-32). Kept as the faithful bottom-dock
   port in case the reference behaviour is needed again. */

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { dateLabel, guestsLabel } from '@/lib/dates';
import { searchURL } from '@/lib/links';

export default function StickyDock() {
  const router = useRouter();
  const { state, openSheet } = useSearch();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector('[data-hero]');
      const limit = hero ? hero.getBoundingClientRect().height * 0.55 : 380;
      setShow(window.scrollY > limit);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const edit = () => {
    if (window.innerWidth < 1024) {
      openSheet();
      return;
    }
    router.push(searchURL(state));
  };

  return (
    <div
      id="sticky-dock"
      className="fixed right-4 bottom-4 left-4 z-40 transition-all duration-300 lg:right-auto lg:left-1/2 lg:w-[640px] lg:-translate-x-1/2"
      style={{ transform: show ? '' : 'translateY(300%)' }}
    >
      <div className="shadow-navy/15 border-navy/10 flex items-center gap-3 rounded-full border bg-white p-2 pl-4 shadow-xl">
        <span className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <span id="dock-dates" className="text-navy truncate text-sm font-semibold">
            {state.checkin && state.checkout ? dateLabel(state) : 'Select dates'}
          </span>
          <span className="text-navy/30 hidden sm:inline">·</span>
          <span id="dock-guests" className="text-navy/60 hidden truncate text-sm sm:inline">
            {guestsLabel(state)}
          </span>
        </span>
        <Button
          type="button"
          id="dock-edit"
          onClick={edit}
          size="sm"
          className="shrink-0 rounded-full"
        >
          Edit stay
        </Button>
      </div>
    </div>
  );
}
