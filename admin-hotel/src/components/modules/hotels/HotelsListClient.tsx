'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelsDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hotelColumns, type HotelRow } from '@/components/modules/hotels/columns';
import { HotelCreateSheet } from '@/components/modules/hotels/HotelCreateSheet';

// `adminHotels` takes only a page cursor today — no search/sort/filter args
// (unlike the public `hotels(input: HotelSearchInput)` query, which has
// both). Fine at the platform's current scale: fetch one generous page and
// filter/sort it client-side, which stays honest about what's really
// happening. If the hotel collection outgrows a single page, this is the
// point to add those args to `adminHotels` rather than keep raising this
// page size (NEW-3, docs/ADMIN_REBUILD_PROGRESS.md).
const PAGE_SIZE = 100;

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'city-asc', label: 'City (A–Z)' },
  { value: 'city-desc', label: 'City (Z–A)' },
  { value: 'status-asc', label: 'Status (A–Z)' },
  { value: 'roomTypeCount-desc', label: 'Most room types' },
  { value: 'roomTypeCount-asc', label: 'Fewest room types' },
  { value: 'activeReservations-desc', label: 'Most active reservations' },
  { value: 'activeReservations-asc', label: 'Fewest active reservations' },
];

function compareHotels(a: HotelRow, b: HotelRow, field: string): number {
  switch (field) {
    case 'city':
      return (a.city ?? '').localeCompare(b.city ?? '');
    case 'status':
      return a.status.localeCompare(b.status);
    case 'roomTypeCount':
      return a.roomTypeCount - b.roomTypeCount;
    case 'activeReservations':
      return a.activeReservations - b.activeReservations;
    case 'name':
    default:
      return a.name.localeCompare(b.name);
  }
}

/**
 * Only ever reached by a `super_admin`, or a staff member with more than
 * one hotel — the server-side page (`hotels/page.tsx`) sends a
 * single-hotel staff member straight to their hotel's workspace instead of
 * rendering this list.
 */
export function HotelsListClient() {
  const router = useRouter();
  const { search, setSearch, sort, setSort } = useTableState();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery(AdminHotelsDocument, {
    variables: { page: { page: 0, size: PAGE_SIZE } },
  });

  // Defaults to name-asc rather than raw server order — the Select below
  // always shows an active sort, so the data should match what it displays.
  const effectiveSort = sort || 'name-asc';

  const rows = useMemo(() => {
    const items = data?.adminHotels.items ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((h) => [h.name, h.brand, h.city].some((field) => field?.toLowerCase().includes(q)))
      : items;
    const [field = 'name', dir] = effectiveSort.split('-');
    const sorted = [...filtered].sort((a, b) => compareHotels(a, b, field));
    return dir === 'desc' ? sorted.reverse() : sorted;
  }, [data, search, effectiveSort]);

  return (
    <>
      <PageHeader
        title="Hotels"
        description="Every property you have access to. Open one to manage it."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New hotel
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hotels…"
            className="pl-9"
            aria-label="Search hotels"
          />
        </div>
        <div className="w-full max-w-56">
          <Select value={effectiveSort} onValueChange={setSort}>
            <SelectTrigger size="sm" aria-label="Sort hotels">
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
      </div>

      <DataTable
        columns={hotelColumns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={(row: HotelRow) => router.push(`/hotels/${row.id}/dashboard`)}
        emptyIcon={Building2}
        emptyTitle={search ? 'No hotels match your search' : 'No hotels yet'}
        emptyDescription={search ? 'Try a different name, brand or city.' : 'No hotel is assigned to your account yet — ask an admin to grant access.'}
      />

      <HotelCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
