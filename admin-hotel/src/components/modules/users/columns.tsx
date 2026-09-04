import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/format';
import type { AdminUsersQuery } from '@/graphql/generated/graphql';
import { RoleBadge } from './RoleBadge';

export type UserRow = AdminUsersQuery['adminUsers'][number];

export const userColumns: ColumnDef<UserRow, unknown>[] = [
  {
    id: 'user',
    header: 'User',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-ink">
          {[row.original.firstName, row.original.lastName].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    id: 'roles',
    header: 'Roles',
    cell: ({ row }) =>
      row.original.roles.length === 0 ? (
        <span className="text-xs text-muted-foreground">No roles</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <RoleBadge key={r.id} roleName={r.roleName} hotelName={r.hotelName} />
          ))}
        </div>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge domain="user" value={row.original.status} />,
  },
  {
    id: 'lastLoginAt',
    header: 'Last login',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : 'Never'}
      </span>
    ),
  },
];
