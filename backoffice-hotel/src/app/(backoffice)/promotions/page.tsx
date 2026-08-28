'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import { createPromotion, setPromotionStatus, updatePromotion } from '@/api/rest/endpoints';
import { useApollo } from '@/api/apollo/provider';
import { invalidateAfterWrite } from '@/api/invalidation';
import { formatDateTime, formatMoney } from '@/lib/format';
import {
  AdminPromotionsDocument,
  PromotionStatus,
  type AdminPromotionInput,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { PageHeader, StatusBadge } from '@/components/admin/page';
import { Form, FormError, MutationError } from '@/components/admin/forms';
import { useHotelScope } from '@/context/HotelScopeContext';

const EMPTY: AdminPromotionInput = {
  code: '',
  name: '',
  discountType: 'percentage',
  discountValue: 10,
  stackable: false,
  appliesToAllRoomTypes: true,
  appliesToAllRatePlans: true,
  status: PromotionStatus.Active,
};

export default function PromotionsPage() {
  const { hotels, activeHotelId } = useHotelScope();
  const [editing, setEditing] = useState<{ id: string | null; form: AdminPromotionInput; hotelId: string | null | undefined } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const apollo = useApollo();

  const { data, loading } = useQuery(AdminPromotionsDocument, {
    variables: { hotelId: activeHotelId ?? '' },
    skip: !activeHotelId,
  });

  const invalidate = () =>
    invalidateAfterWrite(apollo, queryClient, 'admin.promotions.create', [['adminPromotions']]);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.form.code?.trim()) throw new Error('Code is required.');
      if (!editing.form.name?.trim()) throw new Error('Name is required.');
      if (editing.id) {
        return updatePromotion(editing.id, editing.form);
      }
      return createPromotion(editing.hotelId ?? null, editing.form);
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save promotion.'),
  });

  const setStatus = useMutation({
    mutationFn: (args: { id: string; status: PromotionStatus }) =>
      setPromotionStatus(args.id, args.status),
    onSuccess: invalidate,
  });

  if (hotels.length === 0) {
    return (
      <Card className="mx-auto mt-16 max-w-md items-center text-center">
        <CardContent>
          <p className="text-sm text-muted-foreground">You are not a member of any hotel.</p>
        </CardContent>
      </Card>
    );
  }

  const promotions = data?.adminPromotions ?? [];

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Discount codes for the selected hotel"
        actions={
          <Button
            onClick={() =>
              setEditing({ id: null, form: { ...EMPTY }, hotelId: activeHotelId })
            }
          >
            <Plus className="mr-1" aria-hidden="true" /> New promotion
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No promotions yet. Create one to offer discounts to guests.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      {p.discountType === 'percentage'
                        ? `${p.discountValue}%`
                        : formatMoney(p.discountValue, 'MAD')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {p.status === PromotionStatus.Active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatus.mutate({ id: p.id, status: PromotionStatus.Inactive })}
                          >
                            Deactivate
                          </Button>
                        ) : p.status === PromotionStatus.Inactive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatus.mutate({ id: p.id, status: PromotionStatus.Active })}
                          >
                            Activate
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="iconSm"
                          aria-label={`Edit ${p.code}`}
                          onClick={() =>
                            setEditing({
                              id: p.id,
                              hotelId: p.hotelId,
                              form: {
                                code: p.code,
                                name: p.name,
                                description: p.description ?? undefined,
                                discountType: p.discountType,
                                discountValue: p.discountValue,
                                bookingWindowStart: p.bookingWindowStart ?? undefined,
                                bookingWindowEnd: p.bookingWindowEnd ?? undefined,
                                stayWindowStart: p.stayWindowStart ?? undefined,
                                stayWindowEnd: p.stayWindowEnd ?? undefined,
                                minNights: p.minNights ?? undefined,
                                maxUsageTotal: p.maxUsageTotal ?? undefined,
                                maxUsagePerGuest: p.maxUsagePerGuest ?? undefined,
                                stackable: p.stackable,
                                appliesToAllRoomTypes: p.appliesToAllRoomTypes,
                                appliesToAllRatePlans: p.appliesToAllRatePlans,
                                applicableDaysOfWeek: p.applicableDaysOfWeek ?? undefined,
                                status: p.status,
                              },
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit promotion' : 'New promotion'}</DialogTitle>
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
                  <Label htmlFor="pr-code">Code *</Label>
                  <Input id="pr-code" value={editing.form.code ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, code: e.target.value.toUpperCase() } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-name">Name *</Label>
                  <Input id="pr-name" value={editing.form.name ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-type">Discount type</Label>
                  <select
                    id="pr-type"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={editing.form.discountType ?? 'percentage'}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, discountType: e.target.value } })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-value">Discount value</Label>
                  <Input
                    id="pr-value"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editing.form.discountValue ?? 0}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, discountValue: Number(e.target.value) } })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-min-nights">Min nights</Label>
                  <Input
                    id="pr-min-nights"
                    type="number"
                    min={1}
                    value={editing.form.minNights ?? ''}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, minNights: e.target.value === '' ? undefined : Number(e.target.value) } })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-max-usage">Max usage total</Label>
                  <Input
                    id="pr-max-usage"
                    type="number"
                    min={1}
                    value={editing.form.maxUsageTotal ?? ''}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, maxUsageTotal: e.target.value === '' ? undefined : Number(e.target.value) } })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-stay-from">Stay window from</Label>
                  <Input
                    id="pr-stay-from"
                    type="date"
                    value={editing.form.stayWindowStart ?? ''}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, stayWindowStart: e.target.value || undefined } })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-stay-to">Stay window to</Label>
                  <Input
                    id="pr-stay-to"
                    type="date"
                    value={editing.form.stayWindowEnd ?? ''}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, stayWindowEnd: e.target.value || undefined } })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-description">Description</Label>
                <Input id="pr-description" value={editing.form.description ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} />
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