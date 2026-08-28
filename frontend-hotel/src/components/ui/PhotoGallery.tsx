'use client';

/* Hero photo gallery shared by the hotel page and room page.
   Desktop/tablet: one large photo on the left with exactly two smaller ones
   stacked on the right. Mobile: the same main photo plus a horizontal
   snap-scroll strip of every photo. Photos fill their tiles with
   object-cover (never stretched); the main composite has one rounded
   container so rounding applies to the outer corners only. The "View all N
   photos" button sits over the bottom-right tile and opens the full-screen
   PhotoLightbox with the real photo count. */
import { useState } from 'react';
import { PhotoLightbox, type LightboxPhoto } from './PhotoLightbox';

const EXPAND_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"
    />
  </svg>
);

// Right-column row count for the "main + stacked secondary" layout (1-2
// secondary photos; anything beyond 2 lives in the lightbox).
const ROW_CLASS: Record<number, string> = {
  1: 'sm:grid-rows-1',
  2: 'sm:grid-rows-2',
};
const SPAN_CLASS: Record<number, string> = {
  1: 'sm:row-span-1',
  2: 'sm:row-span-2',
};

function Tile({
  photo,
  onOpen,
  className = '',
}: {
  photo: LightboxPhoto;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative overflow-hidden bg-navy/5 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.alt}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </button>
  );
}

export function PhotoGallery({
  photos,
  className = '',
}: {
  photos: LightboxPhoto[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (photos.length === 0) return null;

  const secondary = photos.slice(1, 3);
  const rows = secondary.length || 1;

  return (
    <div className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
        {photos.length === 1 ? (
          <Tile
            photo={photos[0]!}
            onOpen={() => setOpenIndex(0)}
            className="aspect-[16/10] w-full sm:aspect-[4/3]"
          />
        ) : (
          <div
            className={`grid aspect-[4/3] grid-cols-1 gap-1.5 sm:aspect-[16/9] sm:grid-cols-2 sm:gap-2 ${ROW_CLASS[rows]}`}
          >
            <Tile
              photo={photos[0]!}
              onOpen={() => setOpenIndex(0)}
              className={`h-full w-full ${SPAN_CLASS[rows]}`}
            />
            {secondary.map((p, i) => (
              <Tile
                key={p.url + i}
                photo={p}
                onOpen={() => setOpenIndex(i + 1)}
                className="hidden h-full w-full sm:block"
              />
            ))}
          </div>
        )}

        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => setOpenIndex(0)}
            className="text-navy bg-white/95 border-navy/10 absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:right-4 sm:bottom-4"
          >
            {EXPAND_ICON}
            View all {photos.length} photos
          </button>
        ) : null}
      </div>

      {/* mobile: horizontal snap carousel of every photo */}
      {photos.length > 1 ? (
        <div className="mt-1.5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 sm:hidden">
          {photos.map((p, i) => (
            <Tile
              key={p.url + i}
              photo={p}
              onOpen={() => setOpenIndex(i)}
              className="aspect-[4/3] w-[72%] shrink-0 snap-center rounded-xl"
            />
          ))}
        </div>
      ) : null}

      <PhotoLightbox photos={photos} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
    </div>
  );
}
