'use client';

/* Hero search bar that pins below the fixed header on scroll (D-32). A single
   SearchBar instance: the same element switches from in-flow (hero, left-aligned)
   to fixed below the header, so there is exactly one search bar on the page and
   never duplicate ids. While pinned, a measured spacer preserves the hero layout
   and the bar glides from its hero position into the centered dock with padding
   around it (D-33). */

import { useEffect, useRef, useState } from 'react';
import SearchBar from '@/components/search/SearchBar';

export default function StickySearchBar() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [spacerH, setSpacerH] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0, o: 1, s: 1 });
  const pinnedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const anchor = anchorRef.current;
      const bar = barRef.current;
      if (!anchor || !bar) return;
      const dockTop = window.innerWidth >= 1024 ? 116 : 100;
      const shouldPin = window.scrollY > 0 && anchor.getBoundingClientRect().top <= dockTop;
      if (shouldPin && !pinnedRef.current) {
        const r = bar.getBoundingClientRect();
        const dockLeft = (window.innerWidth - r.width) / 2;
        setOffset({ x: r.left - dockLeft, y: r.top - (dockTop + 10), o: 0.25, s: 0.96 });
        setPinned(true);
        pinnedRef.current = true;
        setSpacerH(r.height);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setOffset({ x: 0, y: 0, o: 1, s: 1 }));
        });
      } else if (!shouldPin && pinnedRef.current) {
        pinnedRef.current = false;
        setPinned(false);
        setOffset({ x: 0, y: 0, o: 1, s: 1 });
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      ref={anchorRef}
      id="searchbar"
      data-hero-search
      className={`w-full max-w-4xl ${pinned ? '' : 'mt-6 lg:mt-8'}`}
      style={pinned ? { height: spacerH } : undefined}
    >
      <div
        ref={barRef}
        className={
          pinned ? 'fixed inset-x-0 top-[100px] z-[90] px-4 py-2.5 sm:px-6 lg:top-[116px]' : ''
        }
      >
        <div
          className={pinned ? 'mx-auto w-full max-w-4xl will-change-transform' : 'w-full'}
          style={pinned ? {
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${offset.s})`,
            opacity: offset.o,
            transition:
              'transform 750ms cubic-bezier(0.16, 1, 0.3, 1), opacity 750ms cubic-bezier(0.16, 1, 0.3, 1)',
          } : undefined}
        >
          <SearchBar className="w-full" />
        </div>
      </div>
    </div>
  );
}
