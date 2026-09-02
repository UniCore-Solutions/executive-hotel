import type { ColumnDef } from '@tanstack/react-table';
import { Mail, Phone } from 'lucide-react';
import { Money } from '@/components/shared/Money';
import { formatDate } from '@/lib/format';
import type { AdminGuestsQuery } from '@/graphql/generated/graphql';

export type GuestRow = AdminGuestsQuery['adminGuests']['items'][number];

export const guestColumns: ColumnDef<GuestRow, unknown>[] = [
  {
    id: 'guest',
    header: 'Guest',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-ink">
          {row.original.firstName} {row.original.lastName}
        </p>
        {row.original.countryCode ? (
          <p className="text-xs text-muted-foreground">{row.original.countryCode}</p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => (
      <div className="space-y-1 text-xs text-muted-foreground">
        {row.original.email ? (
          <p className="flex items-center gap-1.5">
            <Mail className="size-3.5" />
            {row.original.email}
          </p>
        ) : null}
        {row.original.phone ? (
          <p className="flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {row.original.phone}
          </p>
        ) : null}
        {!row.original.email && !row.original.phone ? '—' : null}
      </div>
    ),
  },
  {
    id: 'reservationsCount',
    header: () => <span className="block text-right">Stays</span>,
    cell: ({ row }) => (
      <span className="block text-right text-ink tabular-nums">{row.original.reservationsCount}</span>
    ),
  },
  {
    id: 'lastStayDate',
    header: 'Last stay',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.lastStayDate ? formatDate(row.original.lastStayDate) : 'Never stayed'}
      </span>
    ),
  },
  {
    id: 'totalSpent',
    header: () => <span className="block text-right">Total spent</span>,
    cell: ({ row }) => <Money amount={row.original.totalSpent} className="block text-right font-medium text-ink" />,
  },
];
