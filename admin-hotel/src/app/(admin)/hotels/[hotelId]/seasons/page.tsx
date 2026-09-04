'use client';

import { use, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { AdminSeasonsDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { deleteSeason } from '@/api/rest/endpoints/seasons';
import { buildSeasonColumns, type SeasonRow } from '@/components/modules/seasons/columns';
import { SeasonFormSheet } from '@/components/modules/seasons/SeasonFormSheet';

/**
 * Hotel-scoped calendar of named date ranges — a definition module only,
 * deliberately not wired into rate-plan pricing (see `SeasonService`'s
 * class doc). `adminSeasons(hotelId)` returns the full, ordered list with
 * no search/sort args (a hotel's season count is small by nature), so no
 * client-side filtering is built here — same "don't fake what the backend
 * doesn't support" reasoning as the Reviews page.
 */
export default function SeasonsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminSeasonsDocument, { variables: { hotelId } });
  const apollo = useApollo();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SeasonRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeasonRow | null>(null);
  const deleteDialog = useConfirmDialog();

  const seasons = data?.adminSeasons ?? [];

  const deleteMutation = useMutation({
    mutationFn: (row: SeasonRow) => deleteSeason(row.id),
    onSuccess: (_result, row) => {
      invalidateGraphql(apollo, 'seasons.delete');
      toast({ title: `"${row.name}" deleted`, variant: 'success' });
      deleteDialog.hide();
      setDeleteTarget(null);
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not delete season',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  const columns = buildSeasonColumns(
    (row) => setEditing(row),
    (row) => {
      setDeleteTarget(row);
      deleteDialog.show();
    },
  );

  return (
    <>
      <PageHeader
        title="Seasons"
        description="Named date ranges for this hotel — high, low, shoulder, or custom. Informational: not wired into rate-plan pricing."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New season
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={seasons}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={CalendarDays}
        emptyTitle="No seasons yet"
        emptyDescription="Define the first date range for this hotel."
      />

      <SeasonFormSheet hotelId={hotelId} open={createOpen} onOpenChange={setCreateOpen} onSaved={() => void refetch()} />
      <SeasonFormSheet
        hotelId={hotelId}
        season={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => void refetch()}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        title="Delete this season?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" (${deleteTarget.startDate} – ${deleteTarget.endDate}) will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </>
  );
}
