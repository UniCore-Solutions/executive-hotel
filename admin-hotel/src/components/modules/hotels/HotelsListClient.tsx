'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Search } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelsDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Input } from '@/components/ui/input';
import { hotelColumns, type HotelRow } from '@/components/modules/hotels/columns';

// `adminHotels` takes only a page cursor today — no search/sort/filter args
// (unlike the public `hotels(input: HotelSearchInput)` query, which has
// both). Fine at the platform's current scale: fetch one generous page and
// filter it client-side, which stays honest about what's really happening.
// If the hotel collection outgrows a single page, this is the point to add
// those args to `adminHotels` rather than keep raising this page size.
const PAGE_SIZE = 100;

/**
 * Only ever reached by a `super_admin`, or a staff member with more than
 * one hotel — the server-side page (`hotels/page.tsx`) sends a
 * single-hotel staff member straight to their hotel's workspace instead of
 * rendering this list.
 */
export function HotelsListClient() {
  const router = useRouter();
  const { search, setSearch } = useTableState();
  const { data, loading, error, refetch } = useQuery(AdminHotelsDocument, {
    variables: { page: { page: 0, size: PAGE_SIZE } },
  });

  const filtered = useMemo(() => {
    const items = data?.adminHotels.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((h) =>
      [h.name, h.brand, h.city].some((field) => field?.toLowerCase().includes(q)),
    );
  }, [data, search]);

  return (
    <>
      <PageHeader title="Hotels" description="Every property you have access to. Open one to manage it." />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hotels…"
            className="pl-9"
            aria-label="Search hotels"
          />
        </div>
      </div>

      <DataTable
        columns={hotelColumns}
        data={filtered}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={(row: HotelRow) => router.push(`/hotels/${row.id}/dashboard`)}
        emptyIcon={Building2}
        emptyTitle={search ? 'No hotels match your search' : 'No hotels yet'}
        emptyDescription={search ? 'Try a different name, brand or city.' : 'No hotel is assigned to your account yet — ask an admin to grant access.'}
      />
    </>
  );
}
