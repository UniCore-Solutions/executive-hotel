'use client';

import { use, useState } from 'react';
import { CalendarRange, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminRatePlansDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { buildRatePlanColumns } from '@/components/modules/rate-plans/columns';
import { RatePlanCreateSheet } from '@/components/modules/rate-plans/RatePlanCreateSheet';

export default function RatePlansPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminRatePlansDocument, { variables: { hotelId } });
  const [createOpen, setCreateOpen] = useState(false);

  const ratePlans = data?.adminHotel?.ratePlans ?? [];
  const columns = buildRatePlanColumns(hotelId);

  return (
    <>
      <PageHeader
        title="Rate Plans"
        description="Sellable pricing terms — meal plan, payment timing and cancellation policy, one per room type."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New rate plan
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={ratePlans}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={CalendarRange}
        emptyTitle="No rate plans yet"
        emptyDescription="Create the first rate plan and link it to a room type to make it sellable."
      />

      <RatePlanCreateSheet hotelId={hotelId} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
