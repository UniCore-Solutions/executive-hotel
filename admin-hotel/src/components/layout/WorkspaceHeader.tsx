import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { AdminHotelHeaderQuery } from '@/graphql/generated/graphql';

type Hotel = NonNullable<AdminHotelHeaderQuery['adminHotel']>;

/**
 * Keeps the selected hotel unmistakable everywhere inside its workspace
 * (multi-hotel-ready admin, §8: "the admin should always know which hotel
 * it is managing"). Sits above every page in hotels/[hotelId]/layout.tsx.
 */
export function WorkspaceHeader({ hotel }: { hotel: Hotel }) {
  const location = [hotel.hotel.city, hotel.hotel.countryCode].filter(Boolean).join(', ');

  return (
    <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-navy text-gold-light">
        <Building2 className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/hotels" className="hover:text-ink hover:underline">
            Hotels
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="truncate text-ink">{hotel.name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-lg font-semibold text-ink">{hotel.name}</h1>
          <StatusBadge domain="catalog" value={hotel.status} />
        </div>
        {location ? <p className="text-xs text-muted-foreground">{location}</p> : null}
      </div>
    </div>
  );
}
