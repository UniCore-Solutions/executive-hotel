'use client';

import { use } from 'react';
import { FileText } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminInvoicesDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { invoiceColumns } from '@/components/modules/invoices/columns';

const PAGE_SIZE = 20;

// `adminInvoices` takes only `hotelId`/`page` (no `search`/`sort` args exist
// on the schema — billing.graphqls), so this page skips the
// DataTableToolbar search/sort bar every other list uses and is a plain
// paginated table, same reasoning as why Hotels' list stayed client-side
// until NEW-3 landed real server args. Read/download-only: invoices are
// auto-issued on reservation confirmation/cancellation, there is no admin
// write path here.
export default function InvoicesPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { page, setPage } = useTableState();

  const { data, loading, error, refetch } = useQuery(AdminInvoicesDocument, {
    variables: { hotelId, page: { page, size: PAGE_SIZE } },
  });

  const items = data?.adminInvoices.items ?? [];
  const total = data?.adminInvoices.total ?? 0;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Invoices auto-issued for this hotel's reservations, with their credit notes when a stay was cancelled after invoicing."
      />

      <DataTable
        columns={invoiceColumns}
        data={items}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={FileText}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices appear here once a reservation at this hotel is confirmed."
      />

      {!loading && !error && total > 0 ? (
        <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} loading={loading} />
      ) : null}
    </>
  );
}
