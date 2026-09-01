'use client';

import { use, useState } from 'react';
import { BedDouble, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelInventoryDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { buildRoomTypeColumns } from '@/components/modules/room-types/columns';
import { RoomTypeCreateSheet } from '@/components/modules/room-types/RoomTypeCreateSheet';

export default function RoomTypesPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminHotelInventoryDocument, { variables: { hotelId } });
  const [createOpen, setCreateOpen] = useState(false);

  const roomTypes = data?.adminHotel?.roomTypes ?? [];
  const columns = buildRoomTypeColumns(hotelId);

  return (
    <>
      <PageHeader
        title="Room Types"
        description="Sellable categories. Inventory is derived from physical rooms — add or retire rooms to change it."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New room type
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={roomTypes}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={BedDouble}
        emptyTitle="No room types yet"
        emptyDescription="Create the first sellable category for this hotel."
      />

      <RoomTypeCreateSheet hotelId={hotelId} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
