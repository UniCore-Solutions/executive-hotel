'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Save } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import {
  AdminHotelWorkspaceDocument,
  UpdateAvailabilityDocument,
  type AvailabilityUpdateInput,
} from '@/graphql/generated/graphql';
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
  const { data } = useQuery({
    queryKey: ['adminHotel', hotelId],
    queryFn: () => proxyRequest(AdminHotelWorkspaceDocument, { hotelId }),
  });
  if (!data?.adminHotel) return null;
  return <AvailabilityContent hotelId={hotelId} />;
}

function AvailabilityContent({ hotelId }: { hotelId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const rows = workspace.availability.filter((r) => r.stayDate >= todayIso());
      const updates: AvailabilityUpdateInput[] = rows
        .map((r) => ({
          roomTypeId: r.roomTypeId,
          stayDate: r.stayDate,
          totalInventory: Number(current(r.id, 'totalInventory')),
          outOfOrder: Number(current(r.id, 'outOfOrder')),
          blocked: Number(current(r.id, 'blocked')),
        }));
      return proxyRequest(UpdateAvailabilityDocument, { hotelId, rows: updates });
    },
    onSuccess: () => {
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['adminHotel', hotelId] });
    },
  });

  const { data } = useQuery({
    queryKey: ['adminHotel', hotelId],
    queryFn: () => proxyRequest(AdminHotelWorkspaceDocument, { hotelId }),
  });
  if (!data?.adminHotel) return null;
  const workspace = data.adminHotel;
  const roomTypeNames = new Map(workspace.roomTypes.map((rt) => [rt.id, rt.name]));
  const rows = workspace.availability.filter((r) => r.stayDate >= todayIso());

  const current = (rowId: string, key: 'totalInventory' | 'outOfOrder' | 'blocked') =>
    draft?.[`${rowId}:${key}`] ?? String(rows.find((r) => r.id === rowId)?.[key] ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Inventory for the next {rows.length} days, starting {todayIso()}.
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
                    <Input
                      type="number"
                      min={0}
                      aria-label={`Inventory on ${row.stayDate}`}
                      className="ml-auto h-8 w-20 text-right"
                      value={current(row.id, 'totalInventory')}
                      onChange={(e) =>
                        setDraft((d) => ({ ...(d ?? {}), [`${row.id}:totalInventory`]: e.target.value }))
                      }
                    />
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