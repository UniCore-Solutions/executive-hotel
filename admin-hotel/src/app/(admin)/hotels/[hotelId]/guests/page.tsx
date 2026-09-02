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
import { guestColumns } from '@/components/modules/guests/columns';

const PAGE_SIZE = 20;

export default function GuestsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { page, search, setPage, setSearch } = useTableState();

  // `adminGuests` takes a real server-side `query` arg (unlike
  // `adminReservations` — see J-1), searched against first name, last
  // name and email (not phone) on the backend
  // (GuestRepository.findDistinctByHotelAndPattern) — verified live.
  const { data, loading, error, refetch } = useQuery(AdminGuestsDocument, {
    variables: {
      hotelId,
      query: search || undefined,
      page: { page, size: PAGE_SIZE },
    },
  });

  const items = data?.adminGuests.items ?? [];
  const total = data?.adminGuests.total ?? 0;

  return (
    <>
      <PageHeader title="Guests" description="Everyone who has booked at this hotel." />

      <div className="mb-4">
        <DataTableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search name or email…" />
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
