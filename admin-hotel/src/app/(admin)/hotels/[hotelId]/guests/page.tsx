'use client';

import { use } from 'react';
import { Users } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminGuestsDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { guestColumns } from '@/components/modules/guests/columns';

const PAGE_SIZE = 20;

// `reservationsCount`/`totalSpent`/`lastStayDate` are computed in memory
// from a second query over just the current page's guest ids (see
// ReservationAdminServiceImpl.guests) — sorting by them would only be
// correct within one page, which would silently mislead, so only the two
// real DB-level-sortable Guest columns are offered here.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'email-asc', label: 'Email (A–Z)' },
  { value: 'email-desc', label: 'Email (Z–A)' },
];

export default function GuestsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { page, search, sort, setPage, setSearch, setSort } = useTableState();
  const effectiveSort = sort || 'name-asc';

  // `adminGuests` takes a real server-side `query` arg, searched against
  // first name, last name and email (not phone) on the backend
  // (GuestRepository.findDistinctByHotelAndPattern) — verified live. `sort`
  // is likewise real server-side ordering, not a current-page reshuffle.
  const { data, loading, error, refetch } = useQuery(AdminGuestsDocument, {
    variables: {
      hotelId,
      query: search || undefined,
      sort: effectiveSort,
      page: { page, size: PAGE_SIZE },
    },
  });

  const items = data?.adminGuests.items ?? [];
  const total = data?.adminGuests.total ?? 0;

  return (
    <>
      <PageHeader title="Guests" description="Everyone who has booked at this hotel." />

      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name or email…"
          filters={
            <div className="w-full max-w-56">
              <Select value={effectiveSort} onValueChange={setSort}>
                <SelectTrigger size="sm" aria-label="Sort guests">
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
        columns={guestColumns}
        data={items}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={Users}
        emptyTitle={search ? 'No guests match your search' : 'No guests yet'}
        emptyDescription={search ? 'Try a different name or email.' : 'Guests appear here once they have a reservation at this hotel.'}
      />

      {!loading && !error && total > 0 ? (
        <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} loading={loading} />
      ) : null}
    </>
  );
}
