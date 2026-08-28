'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Pencil, Plus, Unlink } from 'lucide-react';
import {
  createRatePlan,
  linkRoomTypeRatePlan,
  setRatePlanPrices,
  unlinkRoomTypeRatePlan,
  updateRatePlan,
} from '@/api/rest/endpoints';
import { useApollo } from '@/api/apollo/provider';
import { invalidateAfterWrite } from '@/api/invalidation';
import {
  AdminHotelWorkspaceDocument,
  RatePlanStatus,
  type AdminRatePlanInput,
  type RatePlanPriceInput,
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
import { formatMoney } from '@/lib/format';
import { Form, FormError, MutationError } from '@/components/admin/forms';
import { StatusBadge } from '@/components/admin/page';

const EMPTY: AdminRatePlanInput = {
  name: '',
  code: '',
  currencyCode: 'MAD',
  isRefundable: true,
  paymentTiming: 'full_at_booking',
  minStay: 1,
  maxStay: 30,
  status: RatePlanStatus.Active,
};

interface PriceDraft {
  validFrom: string;
  validTo: string;
  priceAmount: string;
}

export function RatePlansTab({ hotelId }: { hotelId: string }) {
  const { data } = useQuery(AdminHotelWorkspaceDocument, {
    variables: { hotelId },
    skip: !hotelId,
  });
  if (!data?.adminHotel) return null;
  return <RatePlansContent hotelId={hotelId} />;
}

function RatePlansContent({ hotelId }: { hotelId: string }) {
  const queryClient = useQueryClient();
  const apollo = useApollo();
  const [editing, setEditing] = useState<{ id: string | null; form: AdminRatePlanInput } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceEditor, setPriceEditor] = useState<{ linkId: string; roomTypeName: string; prices: PriceDraft[] } | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);

  const invalidate = () =>
    invalidateAfterWrite(apollo, queryClient, 'admin.ratePlans.create', [['adminHotel', hotelId]]);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.form.name?.trim()) throw new Error('Name is required.');
      if (!editing.form.code?.trim()) throw new Error('Code is required.');
      if (editing.id) {
        return updateRatePlan(editing.id, editing.form);
      }
      return createRatePlan(hotelId, editing.form);
    },
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save rate plan.'),
  });

  const link = useMutation({
    mutationFn: (roomTypeId: string) =>
      linkRoomTypeRatePlan(roomTypeId, linkTarget!),
    onSuccess: () => {
      setLinkTarget(null);
      invalidate();
    },
  });

  const unlink = useMutation({
    mutationFn: (linkId: string) => unlinkRoomTypeRatePlan(linkId),
    onSuccess: invalidate,
  });

  const savePrices = useMutation({
    mutationFn: () => {
      if (!priceEditor) return Promise.resolve(undefined as unknown);
      const prices: RatePlanPriceInput[] = priceEditor.prices.map((p) => ({
        validFrom: p.validFrom,
        validTo: p.validTo,
        priceAmount: Number(p.priceAmount),
      }));
      return setRatePlanPrices(priceEditor.linkId, prices);
    },
    onSuccess: () => {
      setPriceEditor(null);
      invalidate();
    },
  });

  const { data } = useQuery(AdminHotelWorkspaceDocument, {
    variables: { hotelId },
    skip: !hotelId,
  });
  if (!data?.adminHotel) return null;
  const ratePlans = data.adminHotel.ratePlans;
  const roomTypes = data.adminHotel.roomTypes;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: null, form: { ...EMPTY } })}>
          <Plus className="mr-1" aria-hidden="true" /> New rate plan
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {ratePlans.map((rp) => (
          <Card key={rp.id} className="gap-3">
            <CardContent className="px-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-semibold text-navy">{rp.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {rp.code} · {rp.currencyCode}
                    {rp.isRefundable ? ' · refundable' : ' · non-refundable'}
                    {rp.minStay ? ` · min ${rp.minStay} night(s)` : ''}
                  </p>
                </div>
                <StatusBadge status={rp.status} />
              </div>
              <div className="mt-3 space-y-2">
                {rp.links.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not linked to any room type.</p>
                ) : (
                  rp.links.map((link) => (
                    <div key={link.id} className="rounded-lg border border-border bg-paper px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-navy">{link.roomTypeName}</p>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setPriceEditor({ linkId: link.id, roomTypeName: link.roomTypeName, prices: link.prices.map((p) => ({ validFrom: p.validFrom, validTo: p.validTo, priceAmount: String(p.priceAmount) })) })}>
                            <Pencil className="mr-1 h-3 w-3" aria-hidden="true" /> Prices
                          </Button>
                          <Button variant="ghost" size="iconSm" aria-label={`Unlink ${link.roomTypeName}`} onClick={() => unlink.mutate(link.id)}>
                            <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      {link.prices.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {link.prices
                            .slice(0, 3)
                            .map((p) => `${formatMoney(p.priceAmount, rp.currencyCode)} (${p.validFrom} → ${p.validTo})`)
                            .join(' · ')}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No prices set.</p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {roomTypes.length > 0 ? (
                  <select
                    aria-label={`Link room type to ${rp.name}`}
                    className="min-w-0 flex-1 rounded-lg border border-input bg-white px-2 py-1.5 text-xs"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setLinkTarget(rp.id);
                        link.mutate(e.target.value);
                      }
                    }}
                  >
                    <option value="">Link a room type…</option>
                    {roomTypes
                      .filter((rt) => !rp.links.some((l) => l.roomTypeId === rt.id))
                      .map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name}
                        </option>
                      ))}
                  </select>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => setEditing({ id: rp.id, form: { name: rp.name, code: rp.code, currencyCode: rp.currencyCode, mealPlan: rp.mealPlan ?? undefined, cancellationPolicy: rp.cancellationPolicy ?? undefined, paymentPolicy: rp.paymentPolicy ?? undefined, isRefundable: rp.isRefundable, cancellationDeadlineDays: rp.cancellationDeadlineDays ?? undefined, cancellationPenaltyType: rp.cancellationPenaltyType ?? undefined, cancellationPenaltyValue: rp.cancellationPenaltyValue ?? undefined, paymentTiming: rp.paymentTiming, depositPercentage: rp.depositPercentage ?? undefined, minStay: rp.minStay ?? undefined, maxStay: rp.maxStay ?? undefined, status: rp.status } })}>
                  <Pencil className="mr-1 h-3 w-3" aria-hidden="true" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <MutationError error={link.error} />

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit rate plan' : 'New rate plan'}</DialogTitle>
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
                  <Label htmlFor="rp-name">Name *</Label>
                  <Input id="rp-name" value={editing.form.name ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-code">Code *</Label>
                  <Input id="rp-code" value={editing.form.code ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, code: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-currency">Currency</Label>
                  <Input id="rp-currency" value={editing.form.currencyCode ?? 'MAD'} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, currencyCode: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-meal">Meal plan</Label>
                  <Input id="rp-meal" value={editing.form.mealPlan ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, mealPlan: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-refund">Refundable</Label>
                  <select
                    id="rp-refund"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={String(editing.form.isRefundable ?? true)}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, isRefundable: e.target.value === 'true' } })}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-timing">Payment timing</Label>
                  <Input id="rp-timing" value={editing.form.paymentTiming ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, paymentTiming: e.target.value } })} placeholder="full_at_booking" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-deadline">Cancellation deadline (days)</Label>
                  <Input id="rp-deadline" type="number" min={0} value={editing.form.cancellationDeadlineDays ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, cancellationDeadlineDays: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-penalty-type">Cancellation penalty type</Label>
                  <Input id="rp-penalty-type" value={editing.form.cancellationPenaltyType ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, cancellationPenaltyType: e.target.value } })} placeholder="percentage / fixed" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-penalty-value">Cancellation penalty value</Label>
                  <Input id="rp-penalty-value" type="number" min={0} step="0.01" value={editing.form.cancellationPenaltyValue ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, cancellationPenaltyValue: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-min">Min stay</Label>
                  <Input id="rp-min" type="number" min={1} value={editing.form.minStay ?? 1} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, minStay: Number(e.target.value) } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-max">Max stay</Label>
                  <Input id="rp-max" type="number" min={1} value={editing.form.maxStay ?? 30} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, maxStay: Number(e.target.value) } })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-status">Status</Label>
                  <select
                    id="rp-status"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={editing.form.status ?? RatePlanStatus.Active}
                    onChange={(e) => setEditing({ ...editing, form: { ...editing.form, status: e.target.value as AdminRatePlanInput['status'] } })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rp-cancel-policy">Cancellation policy</Label>
                  <Input id="rp-cancel-policy" value={editing.form.cancellationPolicy ?? ''} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, cancellationPolicy: e.target.value } })} />
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

      <Dialog open={priceEditor !== null} onOpenChange={(open) => !open && setPriceEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Prices — {priceEditor?.roomTypeName}</DialogTitle>
          </DialogHeader>
          {priceEditor ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Price periods must not overlap. Each period defines the nightly rate in MAD.
              </p>
              <div className="space-y-3">
                {priceEditor.prices.map((price, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`p-from-${index}`}>From</Label>
                      <Input
                        id={`p-from-${index}`}
                        type="date"
                        value={price.validFrom}
                        onChange={(e) => {
                          const next = [...priceEditor.prices];
                          next[index] = { ...price, validFrom: e.target.value };
                          setPriceEditor({ ...priceEditor, prices: next });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`p-to-${index}`}>To</Label>
                      <Input
                        id={`p-to-${index}`}
                        type="date"
                        value={price.validTo}
                        onChange={(e) => {
                          const next = [...priceEditor.prices];
                          next[index] = { ...price, validTo: e.target.value };
                          setPriceEditor({ ...priceEditor, prices: next });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`p-amount-${index}`}>Nightly rate</Label>
                      <Input
                        id={`p-amount-${index}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={price.priceAmount}
                        onChange={(e) => {
                          const next = [...priceEditor.prices];
                          next[index] = { ...price, priceAmount: e.target.value };
                          setPriceEditor({ ...priceEditor, prices: next });
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="Remove price period"
                      onClick={() => {
                        const next = priceEditor.prices.filter((_, i) => i !== index);
                        setPriceEditor({ ...priceEditor, prices: next });
                      }}
                    >
                      <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPriceEditor({
                    ...priceEditor,
                    prices: [...priceEditor.prices, { validFrom: '', validTo: '', priceAmount: '' }],
                  })
                }
              >
                <Plus className="mr-1 h-3 w-3" aria-hidden="true" /> Add period
              </Button>
              <MutationError error={savePrices.error} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setPriceEditor(null)}>
                  Cancel
                </Button>
                <Button disabled={savePrices.isPending} onClick={() => savePrices.mutate()}>
                  {savePrices.isPending ? 'Saving…' : 'Save prices'}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}