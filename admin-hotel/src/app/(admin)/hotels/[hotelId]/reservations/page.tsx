'use client';

import { use, useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { AdminReservationsDocument, ReservationStatus } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reservationColumns, type ReservationRow } from '@/components/modules/reservations/columns';
import { ReservationDetailSheet } from '@/components/modules/reservations/ReservationDetailSheet';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: ReservationStatus.Pending, label: 'Pending' },
  { value: ReservationStatus.Confirmed, label: 'Confirmed' },
  { value: ReservationStatus.Modified, label: 'Modified' },
  { value: ReservationStatus.CheckedIn, label: 'Checked in' },
  { value: ReservationStatus.CheckedOut, label: 'Checked out' },
  { value: ReservationStatus.Cancelled, label: 'Cancelled' },
  { value: ReservationStatus.NoShow, label: 'No-show' },
];

// Real server-side search+sort — `adminReservations` gained `search`/`sort`
// args (closing J-1, docs/ADMIN_REBUILD_PROGRESS.md) specifically so this
// stays honest across every page, not just the currently-loaded 20 rows.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'checkInDate-asc', label: 'Check-in (earliest)' },
  { value: 'checkInDate-desc', label: 'Check-in (latest)' },
  { value: 'checkOutDate-asc', label: 'Check-out (earliest)' },
  { value: 'checkOutDate-desc', label: 'Check-out (latest)' },
  { value: 'totalAmount-desc', label: 'Highest total' },
  { value: 'totalAmount-asc', label: 'Lowest total' },
  { value: 'status-asc', label: 'Status (A–Z)' },
];

const PAGE_SIZE = 20;

export default function ReservationsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { page, status, search, sort, setPage, setStatus, setSearch, setSort } = useTableState();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');

  const effectiveSort = sort || 'createdAt-desc';

  const { data, loading, error, refetch } = useQuery(AdminReservationsDocument, {
    variables: {
      hotelId,
      status: status && status !== 'all' ? (status as ReservationStatus) : undefined,
      search: search || undefined,
      sort: effectiveSort,
      page: { page, size: PAGE_SIZE },
    },
  });

  const items = useMemo(() => data?.adminReservations.items ?? [], [data]);
  const total = data?.adminReservations.total ?? 0;

  // The URL is the single source of truth for which row is open, so
  // opening a reservation is just navigation — no effect, no local state
  // that could fall out of sync with a deep link.
  const selected = refParam ? (items.find((r) => r.reference === refParam) ?? null) : null;
  const notFoundRef = refParam && !loading && items.length > 0 && !selected ? refParam : null;

  function setRefParam(ref: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (ref) params.set('ref', ref);
    else params.delete('ref');
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  return (
    <>
      <PageHeader title="Reservations" description="Every booking against this hotel." />

      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference, guest name or email…"
          filters={
            <>
              <div className="w-full max-w-56">
                <Select value={status || 'all'} onValueChange={setStatus}>
                  <SelectTrigger size="sm" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-56">
                <Select value={effectiveSort} onValueChange={setSort}>
                  <SelectTrigger size="sm" aria-label="Sort reservations">
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
            </>
          }
        />
      </div>

      {notFoundRef ? (
        <p className="mb-3 rounded-lg border border-info/25 bg-info-light px-3.5 py-2 text-xs text-info-dark">
          Reservation <span className="font-mono font-medium">{notFoundRef}</span> isn&apos;t in the current view —
          try clearing the status filter or checking another page.
        </p>
      ) : null}

      <DataTable
        columns={reservationColumns}
        data={items}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={(row: ReservationRow) => setRefParam(row.reference)}
        emptyIcon={CalendarRange}
        emptyTitle="No reservations found"
        emptyDescription={search ? 'Try a different reference, name or email.' : 'No bookings match the current filter.'}
      />

      {!loading && !error && total > 0 ? (
        <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} loading={loading} />
      ) : null}

      <ReservationDetailSheet
        reservation={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setRefParam(null);
        }}
        onCancelled={() => void refetch()}
      />
    </>
  );
}
