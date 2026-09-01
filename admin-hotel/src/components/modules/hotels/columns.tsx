import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { BedDouble, CalendarRange, Star } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { AdminHotelsQuery } from '@/graphql/generated/graphql';

export type HotelRow = AdminHotelsQuery['adminHotels']['items'][number];

export const hotelColumns: ColumnDef<HotelRow, unknown>[] = [
  {
    id: 'name',
    header: 'Hotel',
    cell: ({ row }) => (
      <Link
        href={`/hotels/${row.original.id}/dashboard`}
        className="font-medium text-ink hover:text-navy hover:underline"
      >
        {row.original.name}
        {row.original.brand && row.original.brand !== row.original.name ? (
          <span className="ml-1.5 font-normal text-muted-foreground">— {row.original.brand}</span>
        ) : null}
      </Link>
    ),
  },
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {[row.original.city, row.original.countryCode].filter(Boolean).join(', ') || '—'}
      </span>
    ),
  },
  {
    id: 'rating',
    header: 'Rating',
    cell: ({ row }) =>
      row.original.starRating ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-gold text-gold" />
          {row.original.starRating}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: 'roomTypes',
    header: 'Room types',
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BedDouble className="size-3.5" />
        {row.original.roomTypeCount}
      </span>
    ),
  },
  {
    id: 'activeReservations',
    header: 'Active reservations',
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarRange className="size-3.5" />
        {row.original.activeReservations}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge domain="catalog" value={row.original.status} />,
  },
];
