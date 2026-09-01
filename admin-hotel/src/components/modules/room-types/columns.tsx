import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, DoorOpen } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { AdminHotelInventoryQuery } from '@/graphql/generated/graphql';

export type RoomTypeRow = NonNullable<AdminHotelInventoryQuery['adminHotel']>['roomTypes'][number];

export function buildRoomTypeColumns(hotelId: string): ColumnDef<RoomTypeRow, unknown>[] {
  return [
  {
    id: 'name',
    header: 'Room type',
    cell: ({ row }) => (
      <Link
        href={`/hotels/${hotelId}/room-types/${row.original.id}`}
        className="font-medium text-ink hover:text-navy hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    id: 'capacity',
    header: 'Capacity',
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5" />
        {row.original.maxAdults} adult{row.original.maxAdults === 1 ? '' : 's'}
        {row.original.maxChildren > 0 ? ` + ${row.original.maxChildren} children` : ''}
      </span>
    ),
  },
  {
    id: 'beds',
    header: 'Beds',
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.bedConfiguration ?? '—'}</span>,
  },
  {
    id: 'rooms',
    header: 'Physical rooms',
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <DoorOpen className="size-3.5" />
        {row.original.rooms.length}
      </span>
    ),
  },
  {
    id: 'inventory',
    header: () => <span className="block text-right">Sellable inventory</span>,
    cell: ({ row }) => (
      <span className="block text-right text-sm font-medium tabular-nums text-ink">{row.original.totalInventory}</span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge domain="catalog" value={row.original.status} />,
  },
  ];
}
