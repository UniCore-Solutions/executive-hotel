import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, TriangleAlert } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/lib/format';
import type { AdminPromotionsQuery } from '@/graphql/generated/graphql';

export type PromotionRow = AdminPromotionsQuery['adminPromotions'][number];

function formatDiscount(row: PromotionRow): string {
  if (row.discountType === 'percentage') return `${row.discountValue}% off`;
  if (row.discountType === 'fixed_amount') return `${formatMoney(row.discountValue)} off`;
  return 'Stay X, pay Y';
}

function formatWindow(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Any time';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  return `Until ${formatDate(end!)}`;
}

export function buildPromotionColumns(
  onEdit: (row: PromotionRow) => void,
  onToggleStatus: (row: PromotionRow) => void,
): ColumnDef<PromotionRow, unknown>[] {
  return [
    {
      id: 'code',
      header: 'Promotion',
      cell: ({ row }) => (
        <div>
          <button
            type="button"
            onClick={() => onEdit(row.original)}
            className="font-medium text-ink hover:text-navy hover:underline"
          >
            {row.original.name}
          </button>
          <p className="font-mono text-xs text-muted-foreground">{row.original.code}</p>
        </div>
      ),
    },
    {
      id: 'scope',
      header: 'Scope',
      cell: ({ row }) =>
        row.original.hotelId ? (
          <span className="text-xs text-muted-foreground">This hotel</span>
        ) : (
          <Badge variant="navy">Platform-wide</Badge>
        ),
    },
    {
      id: 'discount',
      header: 'Discount',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-ink">{formatDiscount(row.original)}</span>
          {row.original.discountType === 'stay_x_pay_y' ? (
            <span title="Pricing for this discount type is not yet computed at quote time — bookings using it will be flagged invalid until implemented.">
              <TriangleAlert className="size-3.5 text-warn" />
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'stayWindow',
      header: 'Stay window',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatWindow(row.original.stayWindowStart, row.original.stayWindowEnd)}
        </span>
      ),
    },
    {
      id: 'bookingWindow',
      header: 'Booking window',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatWindow(row.original.bookingWindowStart, row.original.bookingWindowEnd)}
        </span>
      ),
    },
    {
      id: 'appliesTo',
      header: 'Applies to',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.original.appliesToAllRoomTypes ? 'neutral' : 'gold'}>
            {row.original.appliesToAllRoomTypes ? 'All room types' : 'Specific room types*'}
          </Badge>
          <Badge variant={row.original.appliesToAllRatePlans ? 'neutral' : 'gold'}>
            {row.original.appliesToAllRatePlans ? 'All rate plans' : 'Specific rate plans*'}
          </Badge>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge domain="promotion" value={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(row.original);
            }}
          >
            {row.original.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="iconSm"
            variant="ghost"
            aria-label={`Edit ${row.original.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
