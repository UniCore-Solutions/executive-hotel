import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { AdminAmenityCatalogQuery } from '@/graphql/generated/graphql';

export type AmenityRow = AdminAmenityCatalogQuery['adminAmenities'][number];

export const amenityColumns: ColumnDef<AmenityRow, unknown>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-ink">{row.original.name}</p>
        {row.original.icon ? <p className="text-xs text-muted-foreground">icon: {row.original.icon}</p> : null}
      </div>
    ),
  },
  {
    id: 'category',
    header: 'Category',
    cell: ({ row }) =>
      row.original.category ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
          {row.original.category}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge domain="catalog" value={row.original.isActive ? 'active' : 'inactive'} />,
  },
];
