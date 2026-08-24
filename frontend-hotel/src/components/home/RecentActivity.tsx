'use client';

/* Anonymous browsing activity — "Continue where you left off" (D-26). Reads the
   client-side activity store (recent searches + recently viewed rooms) and renders
   nothing when there is no history, so the homepage is unchanged for fresh visitors.
   History loads only after mount (useEffect) so the server and first client render
   agree (empty) — fixing a hydration mismatch caused by reading localStorage
   during render (D-32). */

import { useEffect, useState } from 'react';
import { PROPERTY } from '@/data';
import { useSearch } from '@/context/SearchContext';
import { useCurrency } from '@/hooks/useCurrency';
import { fmtShort } from '@/lib/dates';
import { recentRoomIds, recentSearches } from '@/services/activity';
import { image, IMG_FALLBACK } from '@/services/availability';
import { roomURL } from '@/lib/links';
import type { RecentSearch } from '@/services/activity';

function searchHref(s: RecentSearch): string {
  return `/search?checkin=${s.checkin}&checkout=${s.checkout}&adults=${s.adults}&children=${s.children}&rooms=${s.rooms}`;
}

function searchLabel(s: RecentSearch): string {
  return `${fmtShort(new Date(s.checkin))} – ${fmtShort(new Date(s.checkout))} · ${s.adults + s.children} guest${s.adults + s.children === 1 ? '' : 's'}${s.rooms > 1 ? ` · ${s.rooms} rooms` : ''}`;
}

type RecentRoom = (typeof PROPERTY.rooms)[number];

export default function RecentActivity() {
  const { state } = useSearch();
  const { fmt } = useCurrency();
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const [rooms, setRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearches(recentSearches(3));
      setRooms(
        recentRoomIds(3)
          .map((id) => PROPERTY.rooms.find((r) => r.id === id))
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
      );
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!searches.length && !rooms.length) return null;

  return (
    <section className="bg-gold/[0.05] border-navy/10 border-b" aria-labelledby="recent-title">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Continue where you left off
        </p>
        <h2
          id="recent-title"
          className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
        >
          Pick up your stay
        </h2>
        <div className="mt-8 space-y-8">
          {searches.length ? (
            <div>
              <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Recent searches
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {searches.map((s) => (
                  <a
                    key={searchHref(s)}
                    href={searchHref(s)}
                    className="text-navy bg-paper border-navy/10 hover:border-gold hover:text-gold-dark inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    <span className="text-gold-dark" aria-hidden="true">
                      ✦
                    </span>
                    {searchLabel(s)}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          {rooms.length ? (
            <div>
              <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Recently viewed rooms
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((r) => (
                  <a
                    key={r.id}
                    href={roomURL(state, r.id)}
                    className="group border-navy/10 hover:shadow-navy/10 flex items-center gap-4 overflow-hidden rounded-2xl border bg-white p-2.5 pr-4 shadow-sm transition-shadow hover:shadow-xl"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image(r.images[0] ?? IMG_FALLBACK, 300)}
                      alt={r.name}
                      loading="lazy"
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-display text-navy group-hover:text-gold-dark block truncate font-semibold transition-colors">
                        {r.name}
                      </span>
                      <span className="text-navy/50 mt-0.5 block truncate text-xs">
                        {r.bed}
                        {r.size ? ` · ${r.size}` : ''}
                        {r.view ? ` · ${r.view}` : ''}
                      </span>
                      <span className="text-navy/70 mt-1 block text-sm">
                        from{' '}
                        <strong className="font-display text-navy">{fmt(r.pricePerNight)}</strong>
                        <span className="text-navy/45 text-xs"> /night</span>
                      </span>
                    </span>
                    <span className="text-gold-dark shrink-0 text-lg" aria-hidden="true">
                      →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
