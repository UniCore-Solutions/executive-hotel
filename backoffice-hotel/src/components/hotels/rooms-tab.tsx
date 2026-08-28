'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { createRoom, updateRoom } from '@/api/rest/endpoints';
import { useApollo } from '@/api/apollo/provider';
import { invalidateAfterWrite } from '@/api/invalidation';
import {
  AdminHotelWorkspaceDocument,
  type AdminRoomInput,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Form, FormError, MutationError } from '@/components/admin/forms';
import { StatusBadge } from '@/components/admin/page';

const EMPTY: AdminRoomInput = {
  roomTypeId: '',
  roomNumber: '',
  floor: '',
  status: 'available',
  housekeepingStatus: 'clean',
  maintenanceStatus: 'operational',
};

export function RoomsTab({ hotelId }: { hotelId: string }) {
  const { data } = useQuery(AdminHotelWorkspaceDocument, {
    variables: { hotelId },
    skip: !hotelId,
  });
  if (!data?.adminHotel) return null;
  return <RoomsContent hotelId={hotelId} />;
}

function RoomsContent({ hotelId }: { hotelId: string }) {
  const queryClient = useQueryClient();
  const apollo = useApollo();
  const [editing, setEditing] = useState<{ id: string | null; form: AdminRoomInput } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.form.roomTypeId) throw new Error('Room type is required.');
      if (!editing.form.roomNumber?.trim()) throw new Error('Room number is required.');
      if (editing.id) {
        return updateRoom(editing.id, editing.form);
      }
      return createRoom(hotelId, editing.form);
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidateAfterWrite(apollo, queryClient, 'admin.rooms.create', [['adminHotel', hotelId]]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save room.'),
  });

  const { data } = useQuery(AdminHotelWorkspaceDocument, {
    variables: { hotelId },
    skip: !hotelId,
  });
  if (!data?.adminHotel) return null;
  const roomTypes = data.adminHotel.roomTypes;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: null, form: { ...EMPTY } })}>
          <Plus className="mr-1" aria-hidden="true" /> New room
        </Button>
      </div>
      {roomTypes.map((rt) => (
        <Card key={rt.id}>
          <CardHeader>
            <CardTitle>{rt.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {rt.rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rooms in this room type yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Housekeeping</TableHead>
                    <TableHead>Maintenance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rt.rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.roomNumber}</TableCell>
                      <TableCell>{room.floor ?? '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={room.status} />
                      </TableCell>
                      <TableCell>{room.housekeepingStatus.replaceAll('_', ' ')}</TableCell>
                      <TableCell>{room.maintenanceStatus.replaceAll('_', ' ')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="iconSm"
                          aria-label={`Edit room ${room.roomNumber}`}
                          onClick={() =>
                            setEditing({
                              id: room.id,
                              form: {
                                roomTypeId: rt.id,
                                roomNumber: room.roomNumber,
                                floor: room.floor ?? undefined,
                                status: room.status,
                                housekeepingStatus: room.housekeepingStatus,
                                maintenanceStatus: room.maintenanceStatus,
                              },
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit room' : 'New room'}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <Form
              onSubmit={async () => {
                setError(null);
                await save.mutateAsync();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="r-type">Room type *</Label>
                  <select
                    id="r-type"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={editing.form.roomTypeId ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, roomTypeId: e.target.value } })
                    }
                  >
                    <option value="">Select…</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-number">Room number *</Label>
                  <Input
                    id="r-number"
                    value={editing.form.roomNumber ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, roomNumber: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-floor">Floor</Label>
                  <Input
                    id="r-floor"
                    value={editing.form.floor ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, floor: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-status">Status</Label>
                  <select
                    id="r-status"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={editing.form.status ?? 'available'}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, status: e.target.value } })
                    }
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="out_of_service">Out of service</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-housekeeping">Housekeeping</Label>
                  <select
                    id="r-housekeeping"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={editing.form.housekeepingStatus ?? 'clean'}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, housekeepingStatus: e.target.value } })
                    }
                  >
                    <option value="clean">Clean</option>
                    <option value="dirty">Dirty</option>
                    <option value="inspected">Inspected</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-maintenance">Maintenance</Label>
                  <select
                    id="r-maintenance"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={editing.form.maintenanceStatus ?? 'operational'}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, maintenanceStatus: e.target.value } })
                    }
                  >
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_order">Out of order</option>
                  </select>
                </div>
              </div>
              <FormError>{error}</FormError>
              <MutationError error={save.error} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </Form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}