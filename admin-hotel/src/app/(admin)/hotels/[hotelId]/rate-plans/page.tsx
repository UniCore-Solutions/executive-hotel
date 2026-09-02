'use client';

import { use, useMemo, useState } from 'react';
import { CalendarRange, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminRatePlansDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildRatePlanColumns, type RatePlanRow } from '@/components/modules/rate-plans/columns';
import { RatePlanCreateSheet } from '@/components/modules/rate-plans/RatePlanCreateSheet';

// `adminHotel.ratePlans` returns every rate plan for the hotel in one shot —
// no pagination, no server search/sort args. Client-side search+sort over
// the full set is honest here (nothing hidden on another page), same
// reasoning as the Hotels list (NEW-3, docs/ADMIN_REBUILD_PROGRESS.md).
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'status-asc', label: 'Status (A–Z)' },
  { value: 'mealPlan-asc', label: 'Meal plan (A–Z)' },
  { value: 'paymentTiming-asc', label: 'Payment timing (A–Z)' },
];

function compareRatePlans(a: RatePlanRow, b: RatePlanRow, field: string): number {
  switch (field) {
    case 'status':
      return a.status.localeCompare(b.status);
    case 'mealPlan':
      return (a.mealPlan ?? '').localeCompare(b.mealPlan ?? '');
    case 'paymentTiming':
      return a.paymentTiming.localeCompare(b.paymentTiming);
    case 'name':
    default:
      return a.name.localeCompare(b.name);
  }
}

export default function RatePlansPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminRatePlansDocument, { variables: { hotelId } });
  const [createOpen, setCreateOpen] = useState(false);
  const { search, setSearch, sort, setSort } = useTableState();

  const effectiveSort = sort || 'name-asc';

  const ratePlans = useMemo(() => {
    const items = data?.adminHotel?.ratePlans ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((r) => [r.name, r.code, r.mealPlan].some((field) => field?.toLowerCase().includes(q)))
      : items;
    const [field = 'name', dir] = effectiveSort.split('-');
    const sorted = [...filtered].sort((a, b) => compareRatePlans(a, b, field));
    return dir === 'desc' ? sorted.reverse() : sorted;
  }, [data, search, effectiveSort]);

  const columns = buildRatePlanColumns(hotelId);

  return (
    <>
      <PageHeader
        title="Rate Plans"
        description="Sellable pricing terms — meal plan, payment timing and cancellation policy, one per room type."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New rate plan
          </Button>
        }
      />

      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search rate plans…"
          filters={
            <div className="w-full max-w-56">
              <Select value={effectiveSort} onValueChange={setSort}>
                <SelectTrigger size="sm" aria-label="Sort rate plans">
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
        data={ratePlans}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={CalendarRange}
        emptyTitle={search ? 'No rate plans match your search' : 'No rate plans yet'}
        emptyDescription={
          search ? 'Try a different name, code or meal plan.' : 'Create the first rate plan and link it to a room type to make it sellable.'
        }
      />

      <RatePlanCreateSheet hotelId={hotelId} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
