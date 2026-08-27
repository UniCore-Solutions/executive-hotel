'use client';

/* Home rooms grid — port of index.html rooms section. Availability badges come
   from the static demo data (r.availability); prices re-render with the current
   currency and every card link carries the live stay state. */

import { PROPERTY } from '@/data';
import { useSearch } from '@/context/SearchContext';
import { useCurrency } from '@/hooks/useCurrency';
import { roomURL } from '@/lib/links';
import { image, IMG_FALLBACK } from '@/services/availability';
import type { Availability, Room } from '@/types';

function badge(availability: Availability) {
  if (availability === 'soldout') {
    return (
      <span className="text-clay bg-clay/10 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
        Sold out
      </span>
    );
  }
  if (availability === 'few') {
    return (
      <span className="text-gold-dark bg-gold/10 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
        Few rooms left
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-700/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
      Available
    </span>
  );
}

function RoomCard({ room, variant = 'home' }: { room: Room; variant?: 'home' | 'hotel' }) {
  const { state } = useSearch();
  const { fmt } = useCurrency();
  const href = roomURL(state, room.id);
  return (
    <article className="group border-navy/10 hover:shadow-navy/10 flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-2xl">
      <a href={href} className="relative block aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image(room.images[0] ?? IMG_FALLBACK, 800)}
          alt={`${room.name} — Executive Hotel`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3">{badge(room.availability)}</span>
        {variant === 'home' && room.view ? (
          <span className="bg-navy-dark/70 absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {room.view}
          </span>
        ) : null}
      </a>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="font-display text-navy text-lg leading-snug font-semibold">
          <a href={href} className="hover:text-gold-dark transition-colors">
            {room.name}
          </a>
        </h3>
        <p className="text-navy/55 text-xs">
          {variant === 'hotel'
            ? `${room.bed}${room.size ? ` · ${room.size}` : ''}${room.view ? ` · ${room.view}` : ''}`
            : `${room.bed} · ${room.size ? `${room.size} · ` : ''}up to ${room.capacity.adults} adults${room.capacity.children ? ` + ${room.capacity.children} child` : ''}`}
        </p>
        <p className="text-navy/70 mt-1 line-clamp-2 text-sm">{room.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="text-navy/70 text-sm">
            from{' '}
            <strong className="font-display text-navy text-lg">{fmt(room.pricePerNight)}</strong>
            <span className="text-navy/45 text-xs"> /night</span>
          </p>
          <a
            href={href}
            className="text-navy hover:text-gold-dark inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors"
          >
            View room →
          </a>
        </div>
      </div>
    </article>
  );
}

export default function RoomsGrid({ variant = 'home' }: { variant?: 'home' | 'hotel' }) {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {PROPERTY.rooms.map((r) => (
        <RoomCard key={r.id} room={r} variant={variant} />
      ))}
    </div>
  );
}
