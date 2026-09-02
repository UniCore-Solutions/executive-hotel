import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Money } from '@/components/shared/Money';
import { formatDateTime, humanizeEnum } from '@/lib/format';
import type { AdminPaymentsQuery } from '@/graphql/generated/graphql';

export type PaymentRow = AdminPaymentsQuery['adminPayments']['items'][number];

// Payment has a real `reservationId` (see J-9 correction in
// docs/ADMIN_REBUILD_PROGRESS.md — the field exists and is populated,
// confirmed live) but there is no `adminReservation(id)` query (NEW-2) to
// resolve it to a reservation record, so it's shown as plain reference
// text here rather than a link/drill-down — showing real data without
// inventing a join the schema can't actually serve.
export const paymentColumns: ColumnDef<PaymentRow, unknown>[] = [
  {
    id: 'reservationId',
    header: 'Reservation',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground" title={row.original.reservationId}>
        {row.original.reservationId.slice(0, 8)}…
      </span>
    ),
  },
  {
    id: 'provider',
    header: 'Provider',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-ink">{humanizeEnum(row.original.provider)}</p>
        {row.original.providerReference ? (
          <p className="font-mono text-xs text-muted-foreground">{row.original.providerReference}</p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge domain="payment" value={row.original.status} />,
  },
  {
    id: 'createdAt',
    header: 'Date',
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>,
  },
  {
    id: 'amount',
    header: () => <span className="block text-right">Amount</span>,
    cell: ({ row }) => <Money amount={row.original.amount} className="block text-right font-medium text-ink" />,
  },
];
