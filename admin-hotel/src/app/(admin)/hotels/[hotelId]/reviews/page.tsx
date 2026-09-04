'use client';

import { use, useMemo, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminReviewsDocument, ReviewModerationStatus } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildReviewColumns, type ReviewRow } from '@/components/modules/reviews/columns';
import { ModerateReviewDialog } from '@/components/modules/reviews/ModerateReviewDialog';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: ReviewModerationStatus.Pending, label: 'Pending' },
  { value: ReviewModerationStatus.Approved, label: 'Approved' },
  { value: ReviewModerationStatus.Rejected, label: 'Rejected' },
];

const PAGE_SIZE = 20;

// `adminReviews` has no search args in the schema (only `hotelId`/`status`/
// `page` — review/review.graphqls) — this page filters by moderation status
// only, matching what the backend actually supports, rather than adding a
// client-side search box over an unpaginated fetch.
export default function ReviewsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { page, status, setPage, setStatus } = useTableState();
  const [moderating, setModerating] = useState<{ review: ReviewRow; action: 'approve' | 'reject' } | null>(null);

  const { data, loading, error, refetch } = useQuery(AdminReviewsDocument, {
    variables: {
      hotelId,
      status: status && status !== 'all' ? (status as ReviewModerationStatus) : undefined,
      page: { page, size: PAGE_SIZE },
    },
  });

  const items = useMemo(() => data?.adminReviews.items ?? [], [data]);
  const total = data?.adminReviews.total ?? 0;

  const columns = useMemo(
    () =>
      buildReviewColumns(
        (row) => setModerating({ review: row, action: 'approve' }),
        (row) => setModerating({ review: row, action: 'reject' }),
      ),
    [],
  );

  return (
    <>
      <PageHeader title="Reviews" description="Moderate guest reviews submitted for this hotel." />

      <div className="mb-4">
        <DataTableToolbar
          filters={
            <div className="w-full max-w-56">
              <Select value={status || 'all'} onValueChange={setStatus}>
                <SelectTrigger size="sm" aria-label="Filter by moderation status">
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
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={MessageSquareText}
        emptyTitle="No reviews found"
        emptyDescription={
          status && status !== 'all'
            ? 'No reviews with this status yet.'
            : 'Reviews appear here once a guest who completed a stay leaves one.'
        }
      />

      {!loading && !error && total > 0 ? (
        <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} loading={loading} />
      ) : null}

      <ModerateReviewDialog
        review={moderating?.review ?? null}
        action={moderating?.action ?? 'approve'}
        open={Boolean(moderating)}
        onOpenChange={(open) => {
          if (!open) setModerating(null);
        }}
        onModerated={() => void refetch()}
      />
    </>
  );
}
