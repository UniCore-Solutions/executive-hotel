'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { uploadHotelImage, deleteMedia, MEDIA_CATEGORY_LOGO } from '@/api/rest/endpoints/catalog';
import { uploadPlatformImage } from '@/api/rest/endpoints/platform';
import { Button } from '@/components/ui/button';

// Mirrors LocalFilesystemMediaStorageProvider's real limits (backend-hotel) —
// checked client-side to fail fast, but the server remains authoritative.
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface LogoMediaItem {
  id: string;
  url: string;
  altText?: string | null;
}

/**
 * Governed logo upload/replace/remove, shared by the hotel and platform
 * Branding tabs. Uploading with `category="logo"` (`MediaStorageServiceImpl`)
 * replaces any existing logo for the owner server-side — this component
 * never has to reconcile "was there already one" itself, and the replace-all
 * gallery write (`HotelGallery`/`PlatformGallery`) is backend-guaranteed to
 * never touch this row (see `MediaAdminServiceImpl`'s class javadoc). The
 * logo is intentionally not part of any gallery grid — it has its own
 * ownership/role, not an anonymous position in a photo list.
 */
export function LogoUploadField({
  ownerType,
  ownerId,
  logo,
  invalidationKey,
  onChanged,
  variant = 'horizontal',
}: {
  ownerType: 'hotel' | 'platform';
  ownerId: string;
  logo: LogoMediaItem | null;
  /** `invalidation.ts` key for this owner's media, e.g. `'hotels.media'` /
      `'platform.media'` — same registry every other media write already
      uses. */
  invalidationKey: string;
  onChanged?: () => void;
  /** `horizontal` (default): the compact form-row layout used on the Hotel
      Profile Branding tab. `hero`: a large, centered display for an
      identity-preview card (e.g. Platform Settings) — same upload/replace/
      remove logic, just a different arrangement. */
  variant?: 'horizontal' | 'hero';
}) {
  const apollo = useApollo();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Tracks the id of a logo whose image failed to load (a broken/expired
  // URL — e.g. this platform's own seed fixture, https://example.com/logo.png,
  // which by design never resolves) so the icon placeholder shows instead of
  // a browser's broken-image glyph. Naturally resets when `logo` changes
  // (a new id) since it's compared against `logo?.id` below, not stored
  // against "is broken" alone.
  const [brokenLogoId, setBrokenLogoId] = useState<string | null>(null);
  const showImage = logo && logo.id !== brokenLogoId;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      invalidateGraphql(apollo, invalidationKey);
      toast({ title: 'Logo removed', variant: 'success' });
      onChanged?.();
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not remove logo',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Use JPEG, PNG, WEBP, or GIF.', variant: 'error' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({ title: 'File too large', description: 'Logos must be 5 MB or smaller.', variant: 'error' });
      return;
    }
    setUploading(true);
    try {
      if (ownerType === 'hotel') {
        await uploadHotelImage(ownerId, file, { category: MEDIA_CATEGORY_LOGO, isPrimary: false });
      } else {
        await uploadPlatformImage(ownerId, file, { category: MEDIA_CATEGORY_LOGO, isPrimary: false });
      }
      invalidateGraphql(apollo, invalidationKey);
      toast({ title: logo ? 'Logo replaced' : 'Logo uploaded', variant: 'success' });
      onChanged?.();
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setUploading(false);
    }
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      hidden
      onChange={(e) => void onFileSelected(e)}
    />
  );

  if (variant === 'hero') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.url}
              alt={logo.altText ?? 'Logo'}
              className="size-full object-contain p-2"
              onError={() => setBrokenLogoId(logo.id)}
            />
          ) : (
            <ImageIcon className="size-8 text-white/50" aria-hidden="true" />
          )}
        </div>
        {fileInput}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            {logo ? <RefreshCw className="size-3.5" /> : <Upload className="size-3.5" />}
            {logo ? 'Replace logo' : 'Upload logo'}
          </Button>
          {logo ? (
            <Button
              size="iconSm"
              variant="ghost"
              title="Remove logo"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => deleteMutation.mutate(logo.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-white/50">JPEG, PNG, WEBP or GIF, up to 5 MB.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo.url}
            alt={logo.altText ?? 'Logo'}
            className="size-full object-contain p-1"
            onError={() => setBrokenLogoId(logo.id)}
          />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-ink">Logo</p>
        <p className="text-xs text-muted-foreground">
          {logo
            ? 'Shown across the admin, guest site, and outbound emails.'
            : 'No logo uploaded yet. JPEG, PNG, WEBP or GIF, up to 5 MB.'}
        </p>
      </div>
      {fileInput}
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()}>
          {logo ? <RefreshCw className="size-3.5" /> : <Upload className="size-3.5" />}
          {logo ? 'Replace' : 'Upload'}
        </Button>
        {logo ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteMutation.mutate(logo.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
