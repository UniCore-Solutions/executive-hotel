'use client';

import { LogoUploadField } from '@/components/shared/LogoUploadField';
import { MEDIA_CATEGORY_LOGO } from '@/api/rest/endpoints/catalog';

interface MediaItem {
  id: string;
  url: string;
  altText?: string | null;
  category?: string | null;
}

/**
 * The hotel's brand identity — currently just the logo. Deliberately its own
 * tab, separate from Profile (identity/contact/location facts) and Media
 * (the guest-facing photo gallery) — the logo has explicit ownership/role,
 * not an anonymous position in a photo list (task-driven redesign, see
 * docs/ADMIN_REBUILD_PROGRESS.md Epic E-REDESIGN workstream 3).
 */
export function HotelBrandingPanel({
  hotelId,
  media,
  onChanged,
  onViewMedia,
}: {
  hotelId: string;
  media: MediaItem[];
  onChanged?: () => void;
  /** Switches the Settings page to the Media tab — the logo lives here, but
      the rest of the hotel's gallery/hero imagery is managed there. */
  onViewMedia?: () => void;
}) {
  const logo = media.find((m) => m.category === MEDIA_CATEGORY_LOGO) ?? null;

  return (
    <div className="space-y-4">
      <LogoUploadField
        ownerType="hotel"
        ownerId={hotelId}
        logo={logo}
        invalidationKey="hotels.media"
        onChanged={onChanged}
      />
      <p className="text-xs text-muted-foreground">
        Looking for gallery or hero photos instead?{' '}
        {onViewMedia ? (
          <button type="button" onClick={onViewMedia} className="font-medium text-ink underline underline-offset-2">
            Go to Media
          </button>
        ) : (
          'See the Media tab.'
        )}
      </p>
    </div>
  );
}
