'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { useMutation } from '@tanstack/react-query';
import { AdminRatePlansDocument } from '@/graphql/generated/graphql';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { humanizeEnum } from '@/lib/format';
import { linkRoomTypeRatePlan, unlinkRoomTypeRatePlan } from '@/api/rest/endpoints/rates';
import { RatePlanCreateSheet } from '@/components/modules/rate-plans/RatePlanCreateSheet';

/**
 * Rate-plan linking for one room type. Rate plans are not owned by a room
 * type in this schema (`rate_plans` has no `room_type_id`) — linking is a
 * many-to-many via `room_type_rate_plans`, the same link/unlink REST
 * endpoints and the same `AdminRatePlans` query already used by the rate
 * plan editor's own "Room type & pricing" tab (`RatePlanPricingPanel.tsx`),
 * just entered from the other side: filtered here to this one room type
 * instead of iterating one rate plan's links.
 */
export function RoomTypeRatePlansPanel({ hotelId, roomTypeId }: { hotelId: string; roomTypeId: string }) {
  const apollo = useApollo();
  const { toast } = useToast();
  const { data, loading, error, refetch } = useQuery(AdminRatePlansDocument, { variables: { hotelId } });

  const ratePlans = useMemo(() => data?.adminHotel?.ratePlans ?? [], [data]);

  const linkedEntries = useMemo(
    () =>
      ratePlans.flatMap((ratePlan) =>
        ratePlan.links.filter((link) => link.roomTypeId === roomTypeId).map((link) => ({ ratePlan, link })),
      ),
    [ratePlans, roomTypeId],
  );
  const linkedRatePlanIds = useMemo(() => new Set(linkedEntries.map((e) => e.ratePlan.id)), [linkedEntries]);
  const availableRatePlans = useMemo(
    () => ratePlans.filter((rp) => !linkedRatePlanIds.has(rp.id)),
    [ratePlans, linkedRatePlanIds],
  );

  const [selectedRatePlan, setSelectedRatePlan] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const unlinkDialog = useConfirmDialog();
  const [unlinkTarget, setUnlinkTarget] = useState<{ linkId: string; name: string } | null>(null);

  const linkMutation = useMutation({
    mutationFn: (ratePlanId: string) => linkRoomTypeRatePlan(roomTypeId, ratePlanId),
    onSuccess: () => {
      invalidateGraphql(apollo, 'ratePlans.link');
      toast({ title: 'Rate plan linked', variant: 'success' });
      setSelectedRatePlan('');
      void refetch();
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not link rate plan',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => unlinkRoomTypeRatePlan(linkId),
    onSuccess: () => {
      invalidateGraphql(apollo, 'ratePlans.unlink');
      toast({ title: 'Rate plan unlinked', variant: 'success' });
      unlinkDialog.hide();
      setUnlinkTarget(null);
      void refetch();
    },
    onError: (err: unknown) =>
      toast({ title: 'Could not unlink', description: err instanceof Error ? err.message : undefined, variant: 'error' }),
  });

  if (loading && ratePlans.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Rate plans on this room type</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Link an existing rate plan, or create a new one — it links to this room type automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableRatePlans.length > 0 ? (
            <>
              <Select value={selectedRatePlan} onValueChange={setSelectedRatePlan}>
                <SelectTrigger size="sm" className="w-48">
                  <SelectValue placeholder="Rate plan…" />
                </SelectTrigger>
                <SelectContent>
                  {availableRatePlans.map((rp) => (
                    <SelectItem key={rp.id} value={rp.id}>
                      {rp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!selectedRatePlan}
                loading={linkMutation.isPending}
                onClick={() => linkMutation.mutate(selectedRatePlan)}
              >
                <Plus className="size-4" />
                Link
              </Button>
            </>
          ) : null}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New rate plan
          </Button>
        </div>
      </div>

      {linkedEntries.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No rate plan linked yet"
          description="Link an existing rate plan above, or create a new one for this room type."
        />
      ) : (
        <div className="space-y-3">
          {linkedEntries.map(({ ratePlan, link }) => (
            <Card key={link.id}>
              <CardHeader>
                <div>
                  <CardTitle>
                    <Link
                      href={`/hotels/${hotelId}/rate-plans/${ratePlan.id}`}
                      className="hover:text-navy hover:underline"
                    >
                      {ratePlan.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {ratePlan.mealPlan ? humanizeEnum(ratePlan.mealPlan) : 'No meal plan set'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge domain="catalog" value={ratePlan.status} />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setUnlinkTarget({ linkId: link.id, name: ratePlan.name });
                      unlinkDialog.show();
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Unlink
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/hotels/${hotelId}/rate-plans/${ratePlan.id}`}
                  className="text-xs font-medium text-navy hover:underline"
                >
                  Manage pricing →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RatePlanCreateSheet
        hotelId={hotelId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => linkMutation.mutate(id)}
      />

      <ConfirmDialog
        open={unlinkDialog.open}
        onOpenChange={unlinkDialog.onOpenChange}
        title={unlinkTarget ? `Unlink ${unlinkTarget.name}?` : 'Unlink rate plan?'}
        description="This removes the rate plan from this room type and deletes its price ranges for this link. There is no undo."
        confirmLabel="Unlink"
        loading={unlinkMutation.isPending}
        onConfirm={() => {
          if (unlinkTarget) unlinkMutation.mutate(unlinkTarget.linkId);
        }}
      />
    </div>
  );
}
