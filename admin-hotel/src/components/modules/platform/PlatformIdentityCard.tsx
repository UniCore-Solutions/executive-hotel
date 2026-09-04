'use client';

import { Mail, Phone } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LogoUploadField } from '@/components/shared/LogoUploadField';
import { MEDIA_CATEGORY_LOGO } from '@/api/rest/endpoints/catalog';

interface MediaItem {
  id: string;
  url: string;
  altText?: string | null;
  category?: string | null;
}

export interface PlatformIdentity {
  id: string;
  name: string;
  tagline?: string | null;
  status: string;
  defaultCurrency?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

/**
 * A live "letterhead" preview of the collection's brand identity — logo,
 * name, tagline, status, currency, contact — always visible alongside
 * whichever settings tab is active, rather than the logo living in its own
 * disconnected tab. This is where the platform logo lives now (folded in
 * from the old standalone Branding tab): uploading here is exactly the same
 * governed `category="logo"` write (`LogoUploadField`) as before, just
 * surfaced as part of the preview instead of a form row.
 */
export function PlatformIdentityCard({
  platform,
  media,
  onChanged,
}: {
  platform: PlatformIdentity;
  media: MediaItem[];
  onChanged?: () => void;
}) {
  const logo = media.find((m) => m.category === MEDIA_CATEGORY_LOGO) ?? null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:sticky lg:top-6">
      <div className="bg-gradient-to-b from-navy-dark to-navy px-6 py-8">
        <LogoUploadField
          ownerType="platform"
          ownerId={platform.id}
          logo={logo}
          invalidationKey="platform.media"
          onChanged={onChanged}
          variant="hero"
        />
        <div className="mt-5 space-y-1 text-center">
          <p className="font-display text-xl font-semibold text-white text-balance">{platform.name}</p>
          {platform.tagline ? <p className="text-sm text-gold-light text-balance">{platform.tagline}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border px-5 py-3">
        <StatusBadge domain="catalog" value={platform.status} />
        {platform.defaultCurrency ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {platform.defaultCurrency}
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 px-5 py-4">
        <div className="flex items-center gap-2 text-xs">
          <Mail className="size-3.5 shrink-0 text-muted-foreground" />
          {platform.contactEmail ? (
            <span className="truncate text-ink">{platform.contactEmail}</span>
          ) : (
            <span className="text-muted-foreground italic">No contact email set</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Phone className="size-3.5 shrink-0 text-muted-foreground" />
          {platform.contactPhone ? (
            <span className="text-ink">{platform.contactPhone}</span>
          ) : (
            <span className="text-muted-foreground italic">No contact phone set</span>
          )}
        </div>
      </div>
    </div>
  );
}
