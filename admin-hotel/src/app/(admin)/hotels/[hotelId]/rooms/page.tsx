'use client';

import { use, useMemo, useState } from 'react';
import { DoorOpen, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelInventoryDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildRoomColumns, type RoomRow } from '@/components/modules/rooms/columns';
import { RoomFormSheet } from '@/components/modules/rooms/RoomFormSheet';

export default function RoomsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminHotelInventoryDocument, { variables: { hotelId } });

  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [editing, setEditing] = useState<RoomRow | null | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);

  const roomTypes = useMemo(() => data?.adminHotel?.roomTypes ?? [], [data]);
  const roomTypeOptions = useMemo(() => roomTypes.map((rt) => ({ value: rt.id, label: rt.name })), [roomTypes]);

  const rows: RoomRow[] = useMemo(() => {
    const all = roomTypes.flatMap((rt) =>
      rt.rooms.map((room) => ({ ...room, roomTypeId: rt.id, roomTypeName: rt.name })),
    );
    return roomTypeFilter === 'all' ? all : all.filter((r) => r.roomTypeId === roomTypeFilter);
  }, [roomTypes, roomTypeFilter]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(row: RoomRow) {
    setEditing(row);
    setSheetOpen(true);
  }

  const columns = useMemo(() => buildRoomColumns(openEdit), []);

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Physical inventory. Each active room adds one unit to its room type's sellable inventory."
        actions={
          <Button size="sm" onClick={openCreate} disabled={roomTypeOptions.length === 0}>
            <Plus className="size-4" />
            Add room
          </Button>
        }
      />

      <div className="mb-4 w-full max-w-56">
        <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Room type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All room types</SelectItem>
            {roomTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={openEdit}
        emptyIcon={DoorOpen}
        emptyTitle="No rooms yet"
        emptyDescription="Add the first physical room to a room type to make it sellable."
      />

      {editing !== undefined ? (
        // Keyed by record identity so switching between "add" and editing a
        // different room remounts the form instead of reusing stale
        // react-hook-form defaultValues from whichever record opened it first.
        <RoomFormSheet
          key={editing?.id ?? 'new'}
          hotelId={hotelId}
          roomTypeOptions={roomTypeOptions}
          room={editing}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSaved={() => void refetch()}
        />
      ) : null}
    </>
  );
}
