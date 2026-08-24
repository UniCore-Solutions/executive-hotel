'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import {
  AdminHotelWorkspaceDocument,
  AdminAmenitiesDocument,
  CreateRoomTypeDocument,
  RoomTypeStatus,
  SetRoomTypeAmenitiesDocument,
  UpdateRoomTypeDocument,
  type AdminRoomTypeInput,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Form, FormError, MutationError } from '@/components/admin/forms';
import { StatusBadge } from '@/components/admin/page';

const EMPTY: AdminRoomTypeInput = {
  name: '',
  description: '',
  maxAdults: 2,
  maxChildren: 1,
  bedConfiguration: '',
  sizeSqm: undefined,
  viewType: '',
  status: RoomTypeStatus.Draft,
};

export function RoomTypesTab({ hotelId }: { hotelId: string }) {
  const { data } = useQuery({
    queryKey: ['adminHotel', hotelId],
    queryFn: () => proxyRequest(AdminHotelWorkspaceDocument, { hotelId }),
  });
  if (!data?.adminHotel) return null;
  return <RoomTypesContent hotelId={hotelId} />;
}

function RoomTypesContent({ hotelId }: { hotelId: string }) {
  const queryClient = useQueryClient();
  const amenitiesQuery = useQuery({
    queryKey: ['adminAmenities'],
    queryFn: () => proxyRequest(AdminAmenitiesDocument, {}),
  });
  const [editing, setEditing] = useState<{ id: string | null; form: AdminRoomTypeInput } | null>(null);
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.form.name?.trim()) throw new Error('Name is required.');
      if (editing.id) {
        const result = await proxyRequest(UpdateRoomTypeDocument, {
          id: editing.id,
          input: editing.form,
        });
        if (amenityIds.length > 0) {
          await proxyRequest(SetRoomTypeAmenitiesDocument, {
            roomTypeId: editing.id,
            amenityIds,
          });
        }
        return result;
      }
      const result = await proxyRequest(CreateRoomTypeDocument, {
        hotelId,
        input: editing.form,
      });
      await proxyRequest(SetRoomTypeAmenitiesDocument, {
        roomTypeId: result.createRoomType.id,
        amenityIds,
      });
      return result;
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['adminHotel', hotelId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save room type.'),
  });

  const { data } = useQuery({
    queryKey: ['adminHotel', hotelId],
    queryFn: () => proxyRequest(AdminHotelWorkspaceDocument, { hotelId }),
  });
  if (!data?.adminHotel) return null;
  const roomTypes = data.adminHotel.roomTypes;

  function openCreate() {
    setEditing({ id: null, form: { ...EMPTY } });
    setAmenityIds([]);
  }

  function openEdit(id: string) {
    const rt = roomTypes.find((r) => r.id === id);
    if (!rt) return;
    setEditing({
      id,
      form: {
        name: rt.name,
        description: rt.description ?? undefined,
        maxAdults: rt.maxAdults,
        maxChildren: rt.maxChildren,
        bedConfiguration: rt.bedConfiguration ?? undefined,
        sizeSqm: rt.sizeSqm ?? undefined,
        viewType: rt.viewType ?? undefined,
        status: rt.status,
      },
    });
    setAmenityIds(rt.amenities.map((a) => a.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-1" aria-hidden="true" /> New room type
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roomTypes.map((rt) => (
          <Card key={rt.id} className="gap-3">
            <CardContent className="px-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-semibold text-navy">{rt.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {rt.maxAdults} adults · {rt.maxChildren} children
                    {rt.sizeSqm ? ` · ${rt.sizeSqm} m²` : ''}
                    {rt.viewType ? ` · ${rt.viewType}` : ''}
                  </p>
                </div>
                <StatusBadge status={rt.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {rt.amenities.slice(0, 6).map((a) => (
                  <span key={a.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {a.name}
                  </span>
                ))}
                {rt.amenities.length > 6 ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    +{rt.amenities.length - 6}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => openEdit(rt.id)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit room type' : 'New room type'}</DialogTitle>
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
                  <Label htmlFor="rt-name">Name *</Label>
                  <Input
                    id="rt-name"
                    value={editing.form.name ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-bed">Bed configuration</Label>
                  <Input
                    id="rt-bed"
                    value={editing.form.bedConfiguration ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, bedConfiguration: e.target.value } })
                    }
                    placeholder="1 king bed"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-adults">Max adults</Label>
                  <Input
                    id="rt-adults"
                    type="number"
                    min={1}
                    value={editing.form.maxAdults ?? 2}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, maxAdults: Number(e.target.value) } })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-children">Max children</Label>
                  <Input
                    id="rt-children"
                    type="number"
                    min={0}
                    value={editing.form.maxChildren ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, maxChildren: Number(e.target.value) } })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-size">Size (m²)</Label>
                  <Input
                    id="rt-size"
                    type="number"
                    min={0}
                    step="0.1"
                    value={editing.form.sizeSqm ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: {
                          ...editing.form,
                          sizeSqm: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-view">View</Label>
                  <Input
                    id="rt-view"
                    value={editing.form.viewType ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, viewType: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-status">Status</Label>
                  <select
                    id="rt-status"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={editing.form.status ?? 'draft'}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, status: e.target.value as AdminRoomTypeInput['status'] },
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rt-desc">Description</Label>
                  <Input
                    id="rt-desc"
                    value={editing.form.description ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Amenities</Label>
                <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {(amenitiesQuery.data?.adminAmenities ?? []).map((amenity) => {
                    const active = amenityIds.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() =>
                          setAmenityIds((ids) =>
                            active ? ids.filter((id) => id !== amenity.id) : [...ids, amenity.id],
                          )
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'border-gold bg-gold/10 text-gold-dark'
                            : 'border-border bg-white text-muted-foreground',
                        )}
                      >
                        {amenity.name}
                      </button>
                    );
                  })}
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