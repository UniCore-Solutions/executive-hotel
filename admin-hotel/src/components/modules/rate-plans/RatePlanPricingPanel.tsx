'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  linkRoomTypeRatePlan,
  setRatePlanPrices,
  unlinkRoomTypeRatePlan,
  type RatePlanPriceResult,
} from '@/api/rest/endpoints/rates';
import type { RatePlanRow } from './columns';

type RatePlanLink = RatePlanRow['links'][number];

/**
 * Room-type link + nightly price editor for a rate plan. Ground-truthed
 * against the backend: there is no per-calendar-day price row — pricing is
 * a set of inclusive date RANGES per (room type, rate plan) link
 * (`rate_plan_prices`, `RatePlanPriceInput`, `V4__pricing_promotions.sql`).
 * Building a literal 365-cell calendar grid would misrepresent that model;
 * this is the honest editable primitive instead. `setRatePlanPrices`
 * replaces the whole range set for a link on every save (backend deletes
 * then re-inserts), so the "Save prices" button always sends the full
 * current row list, not a diff.
 */
export function RatePlanPricingPanel({
  ratePlanId,
  links,
  roomTypeOptions,
  onChanged,
}: {
  ratePlanId: string;
  links: RatePlanLink[];
  roomTypeOptions: { value: string; label: string }[];
  onChanged: () => void;
}) {
  const apollo = useApollo();
  const { toast } = useToast();
  const [selectedRoomType, setSelectedRoomType] = useState('');

  const linkedRoomTypeIds = useMemo(() => new Set(links.map((l) => l.roomTypeId)), [links]);
  const availableOptions = roomTypeOptions.filter((o) => !linkedRoomTypeIds.has(o.value));

  const linkMutation = useMutation({
    mutationFn: () => linkRoomTypeRatePlan(selectedRoomType, ratePlanId),
    onSuccess: () => {
      invalidateGraphql(apollo, 'ratePlans.link');
      toast({ title: 'Room type linked', variant: 'success' });
      setSelectedRoomType('');
      onChanged();
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not link room type',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Room types on this plan</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Convention: one rate plan per room type. Linking more than one is possible but not the usual shape here.
          </p>
        </div>
        {availableOptions.length > 0 ? (
          <div className="flex items-center gap-2">
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Room type…" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!selectedRoomType}
              loading={linkMutation.isPending}
              onClick={() => linkMutation.mutate()}
            >
              <Plus className="size-4" />
              Link
            </Button>
          </div>
        ) : null}
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No room type linked yet"
          description="Link a room type above to start setting nightly prices."
        />
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <RatePlanLinkCard key={link.id} link={link} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PriceRowState {
  /** Stable local row key — the server id for an existing range, a
      synthetic one for a row added and not yet saved. Never sent to the
      backend; `setRatePlanPrices` takes bare {validFrom, validTo,
      priceAmount} and replaces the link's whole price set. */
  key: string;
  validFrom: string;
  validTo: string;
  priceAmount: string;
}

function toRowState(prices: RatePlanPriceResult[]): PriceRowState[] {
  return [...prices]
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom))
    .map((p) => ({ key: p.id, validFrom: p.validFrom, validTo: p.validTo, priceAmount: String(p.priceAmount) }));
}

function RatePlanLinkCard({ link, onChanged }: { link: RatePlanLink; onChanged: () => void }) {
  const apollo = useApollo();
  const { toast } = useToast();
  // Seeded once from the link's server prices; kept in local state rather
  // than re-derived from props so an in-progress edit survives an
  // unrelated parent refetch. Re-synced from the mutation's own response
  // on save, not from a subsequent prop change (same discipline as
  // avoiding stale react-hook-form defaultValues elsewhere in this app —
  // here there's no remount to rely on, since every link's card is always
  // mounted at once, keyed by link.id).
  const [rows, setRows] = useState<PriceRowState[]>(() => toRowState(link.prices));
  const unlinkDialog = useConfirmDialog();

  const unlinkMutation = useMutation({
    mutationFn: () => unlinkRoomTypeRatePlan(link.id),
    onSuccess: () => {
      invalidateGraphql(apollo, 'ratePlans.unlink');
      toast({ title: 'Room type unlinked', variant: 'success' });
      unlinkDialog.hide();
      onChanged();
    },
    onError: (err: unknown) =>
      toast({ title: 'Could not unlink', description: err instanceof Error ? err.message : undefined, variant: 'error' }),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      setRatePlanPrices(
        link.id,
        rows.map((r) => ({ validFrom: r.validFrom, validTo: r.validTo, priceAmount: Number(r.priceAmount) })),
      ),
    onSuccess: (result) => {
      setRows(toRowState(result));
      invalidateGraphql(apollo, 'ratePlans.prices');
      toast({ title: 'Prices saved', variant: 'success' });
      onChanged();
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not save prices',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  function addRow() {
    setRows((prev) => [...prev, { key: `new-${Date.now()}-${prev.length}`, validFrom: '', validTo: '', priceAmount: '' }]);
  }
  function updateRow(key: string, patch: Partial<PriceRowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const canSave =
    !saveMutation.isPending && rows.length > 0 && rows.every((r) => r.validFrom && r.validTo && Number(r.priceAmount) > 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{link.roomTypeName}</CardTitle>
          <CardDescription>
            {link.currencyCode} · {rows.length} price range{rows.length === 1 ? '' : 's'}
          </CardDescription>
        </div>
        <Button type="button" size="sm" variant="destructive" onClick={unlinkDialog.show}>
          <Trash2 className="size-3.5" />
          Unlink
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No price ranges yet — add one below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-1.5 font-medium">Valid from</th>
                  <th className="pb-1.5 font-medium">Valid to</th>
                  <th className="pb-1.5 font-medium">Price / night ({link.currencyCode})</th>
                  <th className="pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-border">
                    <td className="py-1.5 pr-2">
                      <Input
                        type="date"
                        aria-label="Valid from"
                        value={row.validFrom}
                        onChange={(e) => updateRow(row.key, { validFrom: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="date"
                        aria-label="Valid to"
                        value={row.validTo}
                        onChange={(e) => updateRow(row.key, { validTo: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        aria-label="Price per night"
                        min={0}
                        step={0.01}
                        value={row.priceAmount}
                        onChange={(e) => updateRow(row.key, { priceAmount: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="py-1.5">
                      <Button
                        type="button"
                        size="iconSm"
                        variant="ghost"
                        onClick={() => removeRow(row.key)}
                        aria-label="Remove range"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <Button type="button" size="sm" variant="secondary" onClick={addRow}>
            <Plus className="size-3.5" />
            Add price range
          </Button>
          <Button type="button" size="sm" disabled={!canSave} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save prices
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={unlinkDialog.open}
        onOpenChange={unlinkDialog.onOpenChange}
        title={`Unlink ${link.roomTypeName}?`}
        description="This removes the room type from this rate plan and deletes its price ranges. There is no undo."
        confirmLabel="Unlink"
        loading={unlinkMutation.isPending}
        onConfirm={() => unlinkMutation.mutate()}
      />
    </Card>
  );
}
