'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import {
  uploadHotelImage,
  deleteMedia,
  setHotelMedia,
  MEDIA_CATEGORY_LOGO,
  type MediaInput,
} from '@/api/rest/endpoints/catalog';
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
 * Hotel-level media library. Unlike `RoomTypeGallery`, uploading a new photo
 * is a single call — `uploadHotelImage` (ownerType "hotel") is natively
 * accepted by the backend, so no upload-then-attach dance is needed (see
 * J-6 for why room types need one). The replace-list PUT (`setHotelMedia`)
 * is still used here for "set as cover", since there is no PATCH endpoint
 * to toggle `isPrimary` on an existing row without resending the whole list.
 *
 * The logo is deliberately not part of this gallery grid — it has its own
 * ownership/role and dedicated home (`LogoUploadField`, on the Settings
 * page's Branding tab, `category="logo"`) and is excluded from both the
 * display and the `setHotelMedia` payload built here. The backend
 * independently guarantees this replace-all write can neither drop nor
 * duplicate the logo either way (`MediaAdminServiceImpl`), so this
 * exclusion is a display/scope choice, not a correctness requirement.
 */
export function HotelGallery({
  hotelId,
  media: allMedia,
  onChanged,
}: {
  hotelId: string;
  media: MediaItem[];
  /** Called after any successful upload/delete/set-cover. `invalidateGraphql`
      alone leaves this tab showing stale data until a manual reload — see
      the Settings page's `onSaved` comment for why (the workspace layout
      shares the same `adminHotel` cache field, so evicting it cascades into
      the layout's own loading state and unmounts this whole page). */
  onChanged?: () => void;
}) {
  const apollo = useApollo();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const media = allMedia.filter((m) => m.category !== MEDIA_CATEGORY_LOGO);

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
      invalidateGraphql(apollo, 'hotels.media');
      toast({ title: 'Photo removed', variant: 'success' });
      onChanged?.();
    },
    onError: (err: unknown) =>
      toast({ title: 'Could not remove photo', description: err instanceof Error ? err.message : undefined, variant: 'error' }),
  });

  const primaryMutation = useMutation({
    mutationFn: (id: string) => {
      const next = media.map((m) => ({ ...m, isPrimary: m.id === id }));
      return setHotelMedia(hotelId, asInput(next));
    },
    onSuccess: () => {
      invalidateGraphql(apollo, 'hotels.media');
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
      await uploadHotelImage(hotelId, file, { isPrimary: media.length === 0 });
      invalidateGraphql(apollo, 'hotels.media');
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
          {media.length} photo{media.length === 1 ? '' : 's'}
        </p>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => void onFileSelected(e)} />
        <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="size-3.5" />
          Upload photo
        </Button>
      </div>

      {media.length === 0 ? (
        <EmptyState icon={ImagePlus} title="No photos yet" description="Upload the first photo for this hotel." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...media]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.altText ?? ''} className="aspect-[4/3] w-full object-cover" />
                <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                  {item.isPrimary ? (
                    <span className="flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-navy-dark shadow">
                      <Star className="size-2.5 fill-current" />
                      Cover
                    </span>
                  ) : null}
                  {item.category ? (
                    <span className="rounded-full bg-navy-dark/80 px-2 py-0.5 text-[10px] font-medium text-white capitalize shadow">
                      {item.category}
                    </span>
                  ) : null}
                </div>
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
