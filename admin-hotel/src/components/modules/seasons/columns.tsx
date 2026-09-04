import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { AdminSeasonsQuery } from '@/graphql/generated/graphql';

export type SeasonRow = AdminSeasonsQuery['adminSeasons'][number];

const SEASON_TYPE_LABEL: Record<string, string> = {
  high: 'High',
  low: 'Low',
  shoulder: 'Shoulder',
  custom: 'Custom',
};

export function buildSeasonColumns(
  onEdit: (row: SeasonRow) => void,
  onDelete: (row: SeasonRow) => void,
): ColumnDef<SeasonRow, unknown>[] {
  return [
    {
      id: 'name',
      header: 'Season',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onEdit(row.original)}
          className="flex items-center gap-2 font-medium text-ink hover:text-navy hover:underline"
        >
          {row.original.color ? (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.original.color }} />
          ) : null}
          {row.original.name}
        </button>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {SEASON_TYPE_LABEL[row.original.seasonType] ?? row.original.seasonType}
        </span>
      ),
    },
    {
      id: 'range',
      header: 'Date range',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge domain="catalog" value={row.original.isActive ? 'active' : 'inactive'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="iconSm"
          variant="ghost"
          title="Delete season"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original);
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
    },
  ];
}
