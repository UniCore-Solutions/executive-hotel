import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { BedDouble } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { humanizeEnum } from '@/lib/format';
import type { AdminRatePlansQuery } from '@/graphql/generated/graphql';

export type RatePlanRow = NonNullable<AdminRatePlansQuery['adminHotel']>['ratePlans'][number];

const PAYMENT_TIMING_TONE: Record<string, 'success' | 'gold' | 'info'> = {
  pay_at_property: 'success',
  prepay_full: 'gold',
  prepay_deposit: 'info',
};

export function buildRatePlanColumns(hotelId: string): ColumnDef<RatePlanRow, unknown>[] {
  return [
    {
      id: 'name',
      header: 'Rate plan',
      cell: ({ row }) => (
        <Link
          href={`/hotels/${hotelId}/rate-plans/${row.original.id}`}
          className="font-medium text-ink hover:text-navy hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'code',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
    },
    {
      id: 'roomType',
      header: 'Room type',
      cell: ({ row }) => {
        const links = row.original.links;
        if (links.length === 0) {
          return <span className="text-xs text-muted-foreground italic">Not linked</span>;
        }
        return (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BedDouble className="size-3.5 shrink-0" />
            {links.map((l) => l.roomTypeName).join(', ')}
          </span>
        );
      },
    },
    {
      id: 'mealPlan',
      header: 'Meal plan',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.mealPlan ? humanizeEnum(row.original.mealPlan) : '—'}
        </span>
      ),
    },
    {
      id: 'paymentTiming',
      header: 'Payment timing',
      cell: ({ row }) => (
        <Badge variant={PAYMENT_TIMING_TONE[row.original.paymentTiming] ?? 'neutral'}>
          {humanizeEnum(row.original.paymentTiming)}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge domain="catalog" value={row.original.status} />,
    },
  ];
}
