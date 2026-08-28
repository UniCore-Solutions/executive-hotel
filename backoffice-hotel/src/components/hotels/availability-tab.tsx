'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Save } from 'lucide-react';
import { updateAvailabilityRange } from '@/api/rest/endpoints';
import { useApollo } from '@/api/apollo/provider';
import { invalidateAfterWrite } from '@/api/invalidation';
import { AdminHotelWorkspaceDocument } from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { todayIso } from '@/lib/format';
import { MutationError } from '@/components/admin/forms';
import { Badge } from '@/components/ui/Badge';

export function AvailabilityTab({ hotelId }: { hotelId: string }) {
  const { data } = useQuery(AdminHotelWorkspaceDocument, {
    variables: { hotelId },
    skip: !hotelId,
  });
  if (!data?.adminHotel) return null;
  return <AvailabilityContent hotelId={hotelId} />;
}

function AvailabilityContent({ hotelId }: { hotelId: string }) {
  const queryClient = useQueryClient();
  const apollo = useApollo();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const rows = workspace.availability.filter((r) => r.stayDate >= todayIso());
      const byRoomType = new Map<string, typeof rows>();
      for (const r of rows) {
        const list = byRoomType.get(r.roomTypeId) ?? [];
        list.push(r);
        byRoomType.set(r.roomTypeId, list);
      }
      const outOfOrder = (r: (typeof rows)[number]) => Number(current(r.id, 'outOfOrder'));
      const blocked = (r: (typeof rows)[number]) => Number(current(r.id, 'blocked'));
      const calls: Promise<unknown>[] = [];
      for (const [roomTypeId, unsorted] of byRoomType) {
        const roomRows = [...unsorted].sort((a, b) => a.stayDate.localeCompare(b.stayDate));
        const first = roomRows[0]!;
        const uniform =
          roomRows.every((r) => outOfOrder(r) === outOfOrder(first)) &&
          roomRows.every((r) => blocked(r) === blocked(first));
        if (uniform) {
          calls.push(
            updateAvailabilityRange(hotelId, {
              roomTypeId,
              fromDate: first.stayDate,
              toDate: roomRows[roomRows.length - 1]!.stayDate,
              outOfOrder: outOfOrder(first),
              blocked: blocked(first),
            })
          );
        } else {
          // Mixed values within the room type: one single-day range call per row.
          for (const r of roomRows) {
            calls.push(
              updateAvailabilityRange(hotelId, {
                roomTypeId,
                fromDate: r.stayDate,
                toDate: r.stayDate,
                outOfOrder: outOfOrder(r),
                blocked: blocked(r),
              })
            );
          }
        }
      }
      await Promise.all(calls);
    },
    onSuccess: () => {
      setDraft(null);
      invalidateAfterWrite(apollo, queryClient, 'admin.availability.range', [
        ['adminHotel', hotelId],
      ]);
    },
  });

  const { data } = useQuery(AdminHotelWorkspaceDocument, {
    variables: { hotelId },
    skip: !hotelId,
  });
  if (!data?.adminHotel) return null;
  const workspace = data.adminHotel;
  const roomTypeNames = new Map(workspace.roomTypes.map((rt) => [rt.id, rt.name]));
  const rows = workspace.availability.filter((r) => r.stayDate >= todayIso());

  const current = (rowId: string, key: 'outOfOrder' | 'blocked') =>
    draft?.[`${rowId}:${key}`] ?? String(rows.find((r) => r.id === rowId)?.[key] ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Inventory is derived from physical rooms — the room-type&apos;s active rooms. Manage
          out-of-order and blocked units for the next {rows.length} days, starting {todayIso()}.
        </p>
        <Button variant="gold" disabled={!draft || save.isPending} onClick={() => save.mutate()}>
          <Save className="mr-1 h-4 w-4" aria-hidden="true" /> {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
      <MutationError error={save.error} />
      <Card>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Room type</TableHead>
                <TableHead className="text-right">Inventory</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Out of order</TableHead>
                <TableHead className="text-right">Blocked</TableHead>
                <TableHead className="text-right">Free</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.stayDate}</TableCell>
                  <TableCell>{roomTypeNames.get(row.roomTypeId) ?? row.roomTypeId}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.free === 0 ? 'soldout' : row.free <= 2 ? 'few' : 'available'}>
                      {row.totalInventory} rooms
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.roomsSold}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      aria-label={`Out of order on ${row.stayDate}`}
                      className="ml-auto h-8 w-20 text-right"
                      value={current(row.id, 'outOfOrder')}
                      onChange={(e) =>
                        setDraft((d) => ({ ...(d ?? {}), [`${row.id}:outOfOrder`]: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      aria-label={`Blocked on ${row.stayDate}`}
                      className="ml-auto h-8 w-20 text-right"
                      value={current(row.id, 'blocked')}
                      onChange={(e) =>
                        setDraft((d) => ({ ...(d ?? {}), [`${row.id}:blocked`]: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.free === 0 ? 'soldout' : row.free <= 2 ? 'few' : 'available'}>
                      {row.free}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}