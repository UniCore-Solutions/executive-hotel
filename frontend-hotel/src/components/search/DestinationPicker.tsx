'use client';

/* Destination picker — fetches hotel list from the backend catalog and
   presents a searchable list. Used inside SearchSheet (mobile) and the
   desktop SearchBar on the homepage. */

import { useCallback, useEffect, useState } from 'react';
import { getHotelList, type HotelListItem } from '@/services/hotelList';
import { useSearch } from '@/context/SearchContext';
import { cn } from '@/lib/utils';

export default function DestinationPicker({ onSelect }: { onSelect?: () => void }) {
  const { state, setDestination } = useSearch();
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    getHotelList().then((h) => {
      if (alive) {
        setHotels(h);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const selected = hotels.find((h) => h.id === state.destination);

  const filtered = query.trim()
    ? hotels.filter(
        (h) =>
          h.name.toLowerCase().includes(query.toLowerCase()) ||
          (h.city ?? '').toLowerCase().includes(query.toLowerCase()) ||
          (h.brand ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : hotels;

  const pick = useCallback(
    (hotel: HotelListItem) => {
      setDestination(hotel.id, hotel.name);
      onSelect?.();
    },
    [setDestination, onSelect]
  );

  const clearDestination = useCallback(() => {
    setDestination('', '');
    setQuery('');
  }, [setDestination]);

  return (
    <div className="relative">
      <p className="text-navy/45 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
        Hotel
      </p>
      <div className="bg-navy-dark flex items-center gap-3 rounded-2xl px-4 py-3 text-white">
        <span className="bg-gold/15 border-gold/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border">
          <svg
            className="text-gold-light h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M17.7 8.5a5.7 5.7 0 1 0-11.4 0c0 4.6 5.7 10.5 5.7 10.5s5.7-5.9 5.7-10.5ZM12 10.7a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
            />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selected ? selected.name : 'Search hotels…'}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white placeholder-white/50 focus:outline-none"
          aria-label="Search destination"
        />
        {selected && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearDestination}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/60 hover:bg-white/20"
            aria-label="Clear destination"
          >
            ✕
          </button>
        )}
      </div>

      <div className="border-navy/10 mt-2 max-h-60 overflow-y-auto rounded-2xl border bg-white shadow-lg">
        {loading ? (
          <div className="p-4 text-center text-sm text-navy/50">Loading hotels…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-navy/50">No hotels found</div>
        ) : (
          <>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                clearDestination();
                onSelect?.();
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper',
                !state.destination && 'bg-paper'
              )}
            >
              <span className="bg-navy flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white">
                ALL
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">All hotels</p>
                <p className="text-xs text-navy/50">Browse all available hotels</p>
              </div>
              {!state.destination && (
                <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
            {filtered.map((hotel) => (
              <button
                key={hotel.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(hotel)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper',
                  state.destination === hotel.id && 'bg-paper'
                )}
              >
                {hotel.media[0]?.url ? (
                  <img
                    src={hotel.media[0].url}
                    alt={hotel.name}
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="bg-gold/15 border-gold/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold text-gold-dark">
                    {(hotel.name[0] ?? 'H').toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">{hotel.name}</p>
                  <p className="text-xs text-navy/50">
                    {hotel.city ?? ''}
                    {hotel.starRating ? ` · ${hotel.starRating}-star` : ''}
                  </p>
                </div>
                {state.destination === hotel.id && (
                  <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
