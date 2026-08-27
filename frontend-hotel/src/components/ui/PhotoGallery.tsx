'use client';

/** Hero photo gallery shared by the hotel page and room page. Composes a
    layout from however many photos actually exist — never leaves an empty
    grid cell (real data: hotels have exactly 3 photos, rooms exactly 1;
    this also degrades gracefully for 2 or 4+). Clicking any tile opens the
    full-screen PhotoLightbox. */
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

// Right-column row count for the "main + stacked secondary" layout (2-4 photos).
const ROW_CLASS: Record<number, string> = { 1: 'grid-rows-1', 2: 'grid-rows-2', 3: 'grid-rows-3' };
const SPAN_CLASS: Record<number, string> = { 1: 'row-span-1', 2: 'row-span-2', 3: 'row-span-3' };

function Tile({
  photo,
  onOpen,
  className = '',
  overlay,
}: {
  photo: LightboxPhoto;
  onOpen: () => void;
  className?: string;
  overlay?: React.ReactNode;
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
      {overlay}
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

  const secondary = photos.slice(1, 4);
  const extra = photos.length - 1 - secondary.length;
  const rows = secondary.length || 1;

  return (
    <div className={`relative ${className}`}>
      {photos.length === 1 ? (
        <Tile
          photo={photos[0]!}
          onOpen={() => setOpenIndex(0)}
          className="aspect-[16/10] w-full rounded-2xl sm:aspect-[21/10] sm:rounded-3xl"
        />
      ) : (
        <div
          className={`grid aspect-[4/3] grid-cols-1 gap-1.5 overflow-hidden rounded-2xl sm:aspect-[16/9] sm:grid-cols-2 sm:gap-2 sm:rounded-3xl ${ROW_CLASS[rows]}`}
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
              overlay={
                i === secondary.length - 1 && extra > 0 ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 font-display text-lg font-semibold text-white">
                    +{extra}
                  </span>
                ) : undefined
              }
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

      <PhotoLightbox photos={photos} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
    </div>
  );
}
