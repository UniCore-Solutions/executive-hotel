'use client';

import { useQuery } from '@apollo/client/react';
import { formatDateTime, statusLabel } from '@/lib/format';
import { AdminAuditLogsDocument } from '@/graphql/generated/graphql';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, StatusBadge } from '@/components/admin/page';

export default function AuditLogPage() {
  const { data, loading } = useQuery(AdminAuditLogsDocument, {
    variables: { page: { page: 0, size: 100 } },
  });

  const entries = data?.adminAuditLogs.items ?? [];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Platform-wide administrative actions (super admin only)"
      />
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No audit entries yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>{entry.actorEmail ?? `user #${entry.actorUserId ?? '?'}`}</TableCell>
                    <TableCell className="font-medium">{statusLabel(entry.action)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.resourceType} #{entry.resourceId}
                    </TableCell>
                    <TableCell>{entry.hotelId ? `#${entry.hotelId}` : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={entry.result} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}