'use client';

import { use } from 'react';
import { Receipt } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminPaymentsDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { paymentColumns } from '@/components/modules/payments/columns';

const PAGE_SIZE = 20;

// `adminPayments` gained real server-side `search` (reservation reference
// or guest name/email, via a nested subquery — `Payment` has no direct
// guest relation, only a bare `reservationId`) and `sort` args. Still
// read-only otherwise: there is no admin write endpoint for payments in
// this console — captures/refunds happen through the booking flow, not
// here. See J-9 in docs/ADMIN_REBUILD_PROGRESS.md for why a payment row
// still doesn't link through to its reservation.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Highest amount' },
  { value: 'amount-asc', label: 'Lowest amount' },
  { value: 'status-asc', label: 'Status (A–Z)' },
];

export default function PaymentsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { page, search, sort, setPage, setSearch, setSort } = useTableState();
  const effectiveSort = sort || 'createdAt-desc';

  const { data, loading, error, refetch } = useQuery(AdminPaymentsDocument, {
    variables: {
      hotelId,
      search: search || undefined,
      sort: effectiveSort,
      page: { page, size: PAGE_SIZE },
    },
  });

  const items = data?.adminPayments.items ?? [];
  const total = data?.adminPayments.total ?? 0;

  return (
    <>
      <PageHeader title="Payments" description="Every payment recorded against this hotel's reservations." />

      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reference, guest name or email…"
          filters={
            <div className="w-full max-w-56">
              <Select value={effectiveSort} onValueChange={setSort}>
                <SelectTrigger size="sm" aria-label="Sort payments">
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
        columns={paymentColumns}
        data={items}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={Receipt}
        emptyTitle={search ? 'No payments match your search' : 'No payments yet'}
        emptyDescription={search ? 'Try a different reference, name or email.' : 'Payments appear here once a reservation is paid for.'}
      />

      {!loading && !error && total > 0 ? (
        <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} loading={loading} />
      ) : null}
    </>
  );
}
