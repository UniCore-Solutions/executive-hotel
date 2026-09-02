import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Money } from '@/components/shared/Money';
import { formatDate, formatRelativeToToday } from '@/lib/format';
import { paymentStatusDisplay } from '@/lib/reservationStatus';
import type { AdminReservationsQuery } from '@/graphql/generated/graphql';

export type ReservationRow = AdminReservationsQuery['adminReservations']['items'][number];

export const reservationColumns: ColumnDef<ReservationRow, unknown>[] = [
  {
    id: 'reference',
    header: 'Reference',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-ink">{row.original.reference}</span>,
  },
  {
    id: 'guest',
    header: 'Guest',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-ink">
          {row.original.guest.firstName} {row.original.guest.lastName}
        </p>
        {row.original.guest.email ? <p className="text-xs text-muted-foreground">{row.original.guest.email}</p> : null}
      </div>
    ),
  },
  {
    id: 'stay',
    header: 'Stay',
    cell: ({ row }) => (
      <div className="text-xs">
        <p className="font-medium text-ink">
          {formatDate(row.original.checkInDate)} → {formatDate(row.original.checkOutDate)}
        </p>
        <p className="mt-0.5 text-muted-foreground">{formatRelativeToToday(row.original.checkInDate)}</p>
      </div>
    ),
  },
  {
    id: 'rooms',
    header: 'Rooms',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.roomLines.length} room{row.original.roomLines.length === 1 ? '' : 's'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge domain="reservation" value={row.original.status} />,
  },
  {
    id: 'payment',
    header: 'Payment',
    cell: ({ row }) => {
      const { value, label } = paymentStatusDisplay(row.original);
      return <StatusBadge domain="payment" value={value} label={label} />;
    },
  },
  {
    id: 'total',
    header: () => <span className="block text-right">Total</span>,
    cell: ({ row }) => (
      <Money amount={row.original.totalAmount} className="block text-right font-medium text-ink" />
    ),
  },
];
