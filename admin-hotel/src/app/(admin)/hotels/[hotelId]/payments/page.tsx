'use client';

import { use } from 'react';
import { Receipt } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminPaymentsDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { paymentColumns } from '@/components/modules/payments/columns';

const PAGE_SIZE = 20;

// Read-only by design: `adminPayments` has no search/filter args (unlike
// `adminGuests`), and there is no admin write endpoint for payments in
// this console — captures/refunds happen through the booking flow, not
// here. See J-9 in docs/ADMIN_REBUILD_PROGRESS.md for why a payment row
// doesn't link through to its reservation.
export default function PaymentsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { page, setPage } = useTableState();

  const { data, loading, error, refetch } = useQuery(AdminPaymentsDocument, {
    variables: {
      hotelId,
      page: { page, size: PAGE_SIZE },
    },
  });

  const items = data?.adminPayments.items ?? [];
  const total = data?.adminPayments.total ?? 0;

  return (
    <>
      <PageHeader title="Payments" description="Every payment recorded against this hotel's reservations." />

      <DataTable
        columns={paymentColumns}
        data={items}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={Receipt}
        emptyTitle="No payments yet"
        emptyDescription="Payments appear here once a reservation is paid for."
      />

      {!loading && !error && total > 0 ? (
        <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} loading={loading} />
      ) : null}
    </>
  );
}
