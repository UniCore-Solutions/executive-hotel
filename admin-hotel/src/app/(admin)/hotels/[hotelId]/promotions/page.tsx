'use client';

import { use, useMemo, useState } from 'react';
import { BadgePercent, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { AdminPromotionsDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildPromotionColumns, type PromotionRow } from '@/components/modules/promotions/columns';
import { PromotionFormSheet } from '@/components/modules/promotions/PromotionFormSheet';
import { setPromotionStatus } from '@/api/rest/endpoints/promotions';

// `adminPromotions(hotelId)` returns the hotel's promotions plus every
// platform-wide one, unpaginated, no search/sort args — client-side
// search+sort over the full set is honest here, same reasoning as Rate
// Plans and the Hotels list (NEW-3, docs/ADMIN_REBUILD_PROGRESS.md).
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'status-asc', label: 'Status (A–Z)' },
];

function comparePromotions(a: PromotionRow, b: PromotionRow, field: string): number {
  switch (field) {
    case 'status':
      return a.status.localeCompare(b.status);
    case 'name':
      return a.name.localeCompare(b.name);
    case 'createdAt':
    default:
      return a.createdAt.localeCompare(b.createdAt);
  }
}

export default function PromotionsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminPromotionsDocument, { variables: { hotelId } });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const { search, setSearch, sort, setSort } = useTableState();
  const apollo = useApollo();
  const { toast } = useToast();

  const effectiveSort = sort || 'createdAt-desc';

  const promotions = useMemo(() => {
    const items = data?.adminPromotions ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((p) => [p.name, p.code, p.description].some((field) => field?.toLowerCase().includes(q)))
      : items;
    const [field = 'createdAt', dir] = effectiveSort.split('-');
    const sorted = [...filtered].sort((a, b) => comparePromotions(a, b, field));
    return dir === 'asc' ? sorted : sorted.reverse();
  }, [data, search, effectiveSort]);

  const toggleStatusMutation = useMutation({
    mutationFn: (row: PromotionRow) => setPromotionStatus(row.id, row.status === 'active' ? 'inactive' : 'active'),
    onSuccess: (_result, row) => {
      invalidateGraphql(apollo, 'promotions.status');
      toast({
        title: `${row.name} ${row.status === 'active' ? 'deactivated' : 'activated'}`,
        variant: 'success',
      });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not change status',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  const columns = buildPromotionColumns(
    (row) => setEditing(row),
    (row) => toggleStatusMutation.mutate(row),
  );

  const hasRestrictedEligibility = promotions.some((p) => !p.appliesToAllRoomTypes || !p.appliesToAllRatePlans);

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Promo codes guests can enter at checkout for a discount. Deactivating keeps the code's history — promotions are never deleted."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New promotion
          </Button>
        }
      />

      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search promotions…"
          filters={
            <div className="w-full max-w-56">
              <Select value={effectiveSort} onValueChange={setSort}>
                <SelectTrigger size="sm" aria-label="Sort promotions">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={promotions}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={BadgePercent}
        emptyTitle={search ? 'No promotions match your search' : 'No promotions yet'}
        emptyDescription={
          search ? 'Try a different name, code or description.' : 'Create a promo code guests can apply at checkout.'
        }
      />

      {hasRestrictedEligibility ? (
        <p className="mt-3 text-xs text-muted-foreground">
          * This backend has no admin API for picking specific room types or rate plans — only the all-or-nothing
          switch. A promotion marked &quot;Specific…&quot; was set that way outside this app (e.g. seed data);
          editing it here can only flip it back to &quot;all&quot;.
        </p>
      ) : null}

      <PromotionFormSheet hotelId={hotelId} open={createOpen} onOpenChange={setCreateOpen} onSaved={() => void refetch()} />
      <PromotionFormSheet
        hotelId={hotelId}
        promotion={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => void refetch()}
      />
    </>
  );
}
