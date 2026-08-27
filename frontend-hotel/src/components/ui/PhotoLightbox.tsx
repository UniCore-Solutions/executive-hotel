'use client';

/** Full-screen photo viewer shared by the hotel gallery and room gallery.
    Built directly on the Radix Dialog primitives (not the shared <Dialog>,
    whose DialogContent is a centered white card sized for forms) so it can
    be a full-bleed, dark, image-first surface instead. */
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface LightboxPhoto {
  url: string;
  alt: string;
}

const ChevronIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
    />
  </svg>
);

export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: LightboxPhoto[];
  /** null (or undefined) keeps the lightbox closed. */
  initialIndex: number | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex ?? 0);
  const open = initialIndex !== null;

  // Reset the shown index whenever the gallery opens on a new photo — adjusted
  // during render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect to avoid a redundant
  // extra render pass.
  const [syncedIndex, setSyncedIndex] = useState(initialIndex);
  if (initialIndex !== syncedIndex) {
    setSyncedIndex(initialIndex);
    if (initialIndex !== null) setIndex(initialIndex);
  }

  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photos.length]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-fade fixed inset-0 z-[95] bg-black/95" />
        <DialogPrimitive.Content
          aria-label="Photo viewer"
          className="fixed inset-0 z-[95] flex flex-col outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{photo.alt}</DialogPrimitive.Title>
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <span className="font-display text-sm font-medium text-white/70">
              {index + 1} / {photos.length}
            </span>
            <DialogPrimitive.Close
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close photo viewer"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.alt}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:left-6"
                >
                  <ChevronIcon dir="left" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:right-6"
                >
                  <ChevronIcon dir="right" />
                </button>
              </>
            ) : null}
          </div>

          {photos.length > 1 ? (
            <div className="no-scrollbar shrink-0 overflow-x-auto px-4 pb-5 sm:px-6">
              <div className="flex gap-2">
                {photos.map((p, i) => (
                  <button
                    key={p.url + i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`View photo ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      'h-14 w-20 shrink-0 overflow-hidden rounded-lg opacity-50 transition-opacity hover:opacity-80',
                      i === index && 'opacity-100 ring-2 ring-white'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
