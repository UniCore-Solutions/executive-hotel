'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { uploadPlatformImage, setPlatformMedia } from '@/api/rest/endpoints/platform';
import { deleteMedia, type MediaInput } from '@/api/rest/endpoints/catalog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';

interface MediaItem {
  id: string;
  url: string;
  altText?: string | null;
  category?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

/**
 * Platform-level media library (logo/hero) — same shape as `HotelGallery`:
 * a single-call upload (`uploadPlatformImage`, ownerType "platform" is
 * natively accepted, same as "hotel" — see the comment on
 * `uploadPlatformImage`) plus the replace-list PUT (`setPlatformMedia`) for
 * "set as cover", since there is no PATCH endpoint to toggle `isPrimary` on
 * an existing row without resending the whole list.
 */
export function PlatformGallery({
  platformId,
  media,
  onChanged,
}: {
  platformId: string;
  media: MediaItem[];
  onChanged?: () => void;
}) {
  const apollo = useApollo();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const asInput = (list: MediaItem[]): MediaInput[] =>
    list.map((m) => ({
      url: m.url,
      altText: m.altText ?? undefined,
      category: m.category ?? undefined,
      isPrimary: m.isPrimary,
      sortOrder: m.sortOrder,
    }));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      invalidateGraphql(apollo, 'platform.media');
      toast({ title: 'Photo removed', variant: 'success' });
      onChanged?.();
    },
    onError: (err: unknown) =>
      toast({ title: 'Could not remove photo', description: err instanceof Error ? err.message : undefined, variant: 'error' }),
  });

  const primaryMutation = useMutation({
    mutationFn: (id: string) => {
      const next = media.map((m) => ({ ...m, isPrimary: m.id === id }));
      return setPlatformMedia(platformId, asInput(next));
    },
    onSuccess: () => {
      invalidateGraphql(apollo, 'platform.media');
      toast({ title: 'Cover photo updated', variant: 'success' });
      onChanged?.();
    },
    onError: (err: unknown) =>
      toast({ title: 'Could not set cover photo', description: err instanceof Error ? err.message : undefined, variant: 'error' }),
  });

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await uploadPlatformImage(platformId, file, { isPrimary: media.length === 0 });
      invalidateGraphql(apollo, 'platform.media');
      toast({ title: 'Photo uploaded', variant: 'success' });
      onChanged?.();
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {media.length} photo{media.length === 1 ? '' : 's'} — logo, hero, or brand imagery.
        </p>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => void onFileSelected(e)} />
        <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="size-3.5" />
          Upload photo
        </Button>
      </div>

      {media.length === 0 ? (
        <EmptyState icon={ImagePlus} title="No photos yet" description="Upload the collection's logo or hero image." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...media]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.altText ?? ''} className="aspect-[4/3] w-full object-cover" />
                {item.isPrimary ? (
                  <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-navy-dark shadow">
                    <Star className="size-2.5 fill-current" />
                    Cover
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-navy-dark/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {!item.isPrimary ? (
                    <Button
                      size="iconSm"
                      variant="secondary"
                      title="Set as cover"
                      onClick={() => primaryMutation.mutate(item.id)}
                      disabled={primaryMutation.isPending}
                    >
                      <Star className="size-3.5" />
                    </Button>
                  ) : null}
                  <Button
                    size="iconSm"
                    variant="destructive"
                    title="Remove"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
