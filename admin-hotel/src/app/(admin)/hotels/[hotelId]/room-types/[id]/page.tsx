'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { DoorOpen, Info, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelInventoryDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoomTypeDetailsForm } from '@/components/modules/room-types/RoomTypeDetailsForm';
import { RoomTypeAmenitiesForm } from '@/components/modules/room-types/RoomTypeAmenitiesForm';
import { RoomTypeGallery } from '@/components/modules/room-types/RoomTypeGallery';
import { RoomTypeRatePlansPanel } from '@/components/modules/room-types/RoomTypeRatePlansPanel';
import { RoomTypeAvailabilityPanel } from '@/components/modules/room-types/RoomTypeAvailabilityPanel';
import { buildRoomColumns, type RoomRow } from '@/components/modules/rooms/columns';
import { ROOM_SORT_OPTIONS, compareRooms } from '@/components/modules/rooms/sort';
import { RoomFormSheet } from '@/components/modules/rooms/RoomFormSheet';
import { BulkRoomSheet } from '@/components/modules/rooms/BulkRoomSheet';
import { useTableState } from '@/hooks/useTableState';

export default function RoomTypeEditPage({ params }: { params: Promise<{ hotelId: string; id: string }> }) {
  const { hotelId, id } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminHotelInventoryDocument, { variables: { hotelId } });

  const liveRoomType = data?.adminHotel?.roomTypes.find((rt) => rt.id === id);
  // Buffered against `adminHotel` transiently disappearing from the cache
  // during a background refetch (adding/editing a room, or this room
  // type's own details/amenities/media, all evict `adminHotel` —
  // api/invalidation.ts). Gating the Tabs below on live `data` alone
  // unmounted them on every such write, throwing an open Rooms/Amenities/
  // Gallery tab back to Details on every save (confirmed with Playwright:
  // adding a room here reset the active tab every time). "Adjusting state
  // during render", not an effect: https://react.dev/learn/you-might-not-need-an-effect
  const [roomType, setRoomType] = useState(liveRoomType);
  const [prevLiveRoomType, setPrevLiveRoomType] = useState(liveRoomType);
  if (liveRoomType !== prevLiveRoomType) {
    setPrevLiveRoomType(liveRoomType);
    if (liveRoomType) setRoomType(liveRoomType);
  }

  const [editingRoom, setEditingRoom] = useState<RoomRow | null | undefined>(undefined);
  const [roomSheetOpen, setRoomSheetOpen] = useState(false);
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
  const { search, setSearch, sort, setSort } = useTableState();
  const roomSort = ROOM_SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'roomNumber-asc';

  const rows: RoomRow[] = useMemo(() => {
    const all = roomType ? roomType.rooms.map((r) => ({ ...r, roomTypeName: roomType.name })) : [];
    const q = search.trim().toLowerCase();
    const filtered = q ? all.filter((r) => [r.roomNumber, r.floor].some((f) => f?.toLowerCase().includes(q))) : all;
    const [field = 'roomNumber', dir] = roomSort.split('-');
    const sorted = [...filtered].sort((a, b) => compareRooms(a, b, field));
    return dir === 'desc' ? sorted.reverse() : sorted;
  }, [roomType, search, roomSort]);
  const roomTypeOptions = useMemo(
    () => (roomType ? [{ value: roomType.id, label: roomType.name }] : []),
    [roomType],
  );

  function openCreateRoom() {
    setEditingRoom(null);
    setRoomSheetOpen(true);
  }
  function openEditRoom(row: RoomRow) {
    setEditingRoom(row);
    setRoomSheetOpen(true);
  }
  const roomColumns = useMemo(() => buildRoomColumns(openEditRoom), []);

  return (
    <>
      <PageHeader
        title={roomType?.name ?? 'Room type'}
        breadcrumb={
          <Link href={`/hotels/${hotelId}/room-types`} className="hover:text-ink hover:underline">
            Room Types
          </Link>
        }
        actions={roomType ? <StatusBadge domain="catalog" value={roomType.status} /> : undefined}
      />

      {!roomType && loading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !roomType && error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !roomType ? (
        <ErrorState error={new Error('Room type not found.')} />
      ) : (
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="rooms">Rooms ({roomType.rooms.length})</TabsTrigger>
            <TabsTrigger value="rate-plan">Rate Plan</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <p className="flex items-start gap-2 rounded-lg border border-info/25 bg-info-light px-3.5 py-2.5 text-xs text-info-dark">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Sellable inventory (<strong className="font-semibold">{roomType.totalInventory}</strong>) is derived
              from this room type&apos;s {roomType.rooms.length} physical room{roomType.rooms.length === 1 ? '' : 's'}
              — manage it from the Rooms tab, not here.
            </p>
            <Card className="max-w-2xl">
              <RoomTypeDetailsForm hotelId={hotelId} roomType={roomType} />
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Every physical room of this type. Room numbers and floors are whatever this hotel actually uses —
                there&apos;s no fixed numbering scheme.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setBulkSheetOpen(true)}>
                  <Plus className="size-4" />
                  Add rooms in bulk
                </Button>
                <Button size="sm" onClick={openCreateRoom}>
                  <Plus className="size-4" />
                  Add room
                </Button>
              </div>
            </div>
            <DataTableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search rooms…"
              filters={
                <div className="w-full max-w-56">
                  <Select value={roomSort} onValueChange={setSort}>
                    <SelectTrigger size="sm" aria-label="Sort rooms">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_SORT_OPTIONS.filter((opt) => !opt.value.startsWith('roomType-')).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            />
            <DataTable
              columns={roomColumns}
              data={rows}
              onRowClick={openEditRoom}
              emptyIcon={DoorOpen}
              emptyTitle={search ? 'No rooms match your search' : 'No rooms yet'}
              emptyDescription={search ? 'Try a different room number.' : 'Add the first physical room to make this type sellable.'}
            />
          </TabsContent>

          <TabsContent value="rate-plan">
            <RoomTypeRatePlansPanel hotelId={hotelId} roomTypeId={roomType.id} />
          </TabsContent>

          <TabsContent value="availability">
            <RoomTypeAvailabilityPanel hotelId={hotelId} roomTypeId={roomType.id} />
          </TabsContent>

          <TabsContent value="amenities">
            <Card className="max-w-2xl">
              <RoomTypeAmenitiesForm
                roomTypeId={roomType.id}
                currentAmenityIds={roomType.amenities.map((a) => a.id)}
              />
            </Card>
          </TabsContent>

          <TabsContent value="gallery">
            <Card>
              <RoomTypeGallery
                hotelId={hotelId}
                roomTypeId={roomType.id}
                roomTypeName={roomType.name}
                media={roomType.media}
              />
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {editingRoom !== undefined ? (
        // See room-types/page.tsx's "All rooms" view — keyed by record
        // identity to avoid reusing a previously-mounted form's stale
        // defaultValues.
        <RoomFormSheet
          key={editingRoom?.id ?? 'new'}
          hotelId={hotelId}
          roomTypeOptions={roomTypeOptions}
          room={editingRoom}
          open={roomSheetOpen}
          onOpenChange={setRoomSheetOpen}
          onSaved={() => void refetch()}
        />
      ) : null}

      {roomType ? (
        <BulkRoomSheet
          hotelId={hotelId}
          roomTypeId={roomType.id}
          open={bulkSheetOpen}
          onOpenChange={setBulkSheetOpen}
          onSaved={() => void refetch()}
        />
      ) : null}
    </>
  );
}
