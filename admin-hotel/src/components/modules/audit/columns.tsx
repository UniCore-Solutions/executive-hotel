import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime, humanizeEnum } from '@/lib/format';
import { MetadataCell } from '@/components/modules/audit/MetadataCell';
import type { AdminAuditLogsQuery } from '@/graphql/generated/graphql';

export type AuditLogRow = AdminAuditLogsQuery['adminAuditLogs']['items'][number];

export function buildAuditColumns(hotelNameById: Map<string, string>): ColumnDef<AuditLogRow, unknown>[] {
  return [
    {
      id: 'createdAt',
      header: 'When',
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.original.actorEmail ?? 'System'}</p>
          {row.original.actorUserId ? (
            <p className="font-mono text-xs text-muted-foreground" title={row.original.actorUserId}>
              {row.original.actorUserId.slice(0, 8)}…
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => <span className="font-mono text-xs text-ink">{row.original.action}</span>,
    },
    {
      id: 'resource',
      header: 'Resource',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-ink">{humanizeEnum(row.original.resourceType)}</p>
          <p className="font-mono text-xs text-muted-foreground" title={row.original.resourceId}>
            {row.original.resourceId.slice(0, 8)}…
          </p>
        </div>
      ),
    },
    {
      id: 'hotel',
      header: 'Hotel',
      cell: ({ row }) => {
        const hotelId = row.original.hotelId;
        if (!hotelId) return <span className="text-xs text-muted-foreground">Platform-wide</span>;
        return <span className="text-sm text-ink">{hotelNameById.get(hotelId) ?? `${hotelId.slice(0, 8)}…`}</span>;
      },
    },
    {
      id: 'result',
      header: 'Result',
      cell: ({ row }) => <StatusBadge domain="audit" value={row.original.result} />,
    },
    {
      id: 'metadata',
      header: 'Metadata',
      cell: ({ row }) => <MetadataCell metadata={row.original.metadata} />,
    },
  ];
}
