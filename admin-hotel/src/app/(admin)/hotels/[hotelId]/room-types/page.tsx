'use client';

import { use, useMemo, useState } from 'react';
import { BedDouble, DoorOpen, Plus } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelInventoryDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildRoomTypeColumns, type RoomTypeRow } from '@/components/modules/room-types/columns';
import { RoomTypeCreateSheet } from '@/components/modules/room-types/RoomTypeCreateSheet';
import { buildRoomColumns, type RoomRow } from '@/components/modules/rooms/columns';
import { ROOM_SORT_OPTIONS, compareRooms } from '@/components/modules/rooms/sort';
import { RoomFormSheet } from '@/components/modules/rooms/RoomFormSheet';

// Both views come from the one `adminHotel(hotelId).roomTypes` query, fully
// fetched (no pagination) — client-side search+sort is honest here, same
// reasoning as the Hotels list (NEW-3, docs/ADMIN_REBUILD_PROGRESS.md).
const ROOM_TYPE_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'status-asc', label: 'Status (A–Z)' },
  { value: 'inventory-desc', label: 'Most inventory' },
  { value: 'inventory-asc', label: 'Fewest inventory' },
  { value: 'rooms-desc', label: 'Most physical rooms' },
  { value: 'rooms-asc', label: 'Fewest physical rooms' },
];

function compareRoomTypes(a: RoomTypeRow, b: RoomTypeRow, field: string): number {
  switch (field) {
    case 'status':
      return a.status.localeCompare(b.status);
    case 'inventory':
      return a.totalInventory - b.totalInventory;
    case 'rooms':
      return a.rooms.length - b.rooms.length;
    case 'name':
    default:
      return a.name.localeCompare(b.name);
  }
}

/**
 * Merged "Room Types" + old standalone "Rooms" page. Room Types (grouped by
 * type, the primary view) and All rooms (the former `/rooms` route's flat
 * cross-type operations table with a room-type filter) share the one
 * `AdminHotelInventory` query and the one `buildRoomColumns`/`RoomFormSheet`
 * pair that both views always used — merging just removes the second route
 * and its duplicated page shell.
 */
export default function RoomTypesPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminHotelInventoryDocument, { variables: { hotelId } });

  const [view, setView] = useState<'by-type' | 'all-rooms'>('by-type');
  const [createOpen, setCreateOpen] = useState(false);
  const { search, setSearch, sort, setSort } = useTableState();

  const roomTypes = useMemo(() => data?.adminHotel?.roomTypes ?? [], [data]);
  const roomTypeColumns = buildRoomTypeColumns(hotelId);

  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [editingRoom, setEditingRoom] = useState<RoomRow | null | undefined>(undefined);
  const [roomSheetOpen, setRoomSheetOpen] = useState(false);

  const roomTypeOptions = useMemo(() => roomTypes.map((rt) => ({ value: rt.id, label: rt.name })), [roomTypes]);

  // The two tabs share one page's `q`/`sort` URL params (§O — one hook, not
  // one per module) but have completely different sort vocabularies; fall
  // back to this view's own default whenever the URL's `sort` value belongs
  // to the other view instead of showing a blank Select.
  const roomTypeSort = ROOM_TYPE_SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'name-asc';
  const roomSort = ROOM_SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'roomNumber-asc';

  const visibleRoomTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? roomTypes.filter((rt) => rt.name.toLowerCase().includes(q)) : roomTypes;
    const [field = 'name', dir] = roomTypeSort.split('-');
    const sorted = [...filtered].sort((a, b) => compareRoomTypes(a, b, field));
    return dir === 'desc' ? sorted.reverse() : sorted;
  }, [roomTypes, search, roomTypeSort]);

  const allRooms: RoomRow[] = useMemo(() => {
    const all = roomTypes.flatMap((rt) =>
      rt.rooms.map((room) => ({ ...room, roomTypeId: rt.id, roomTypeName: rt.name })),
    );
    const scoped = roomTypeFilter === 'all' ? all : all.filter((r) => r.roomTypeId === roomTypeFilter);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? scoped.filter((r) => [r.roomNumber, r.roomTypeName, r.floor].some((f) => f?.toLowerCase().includes(q)))
      : scoped;
    const [field = 'roomNumber', dir] = roomSort.split('-');
    const sorted = [...filtered].sort((a, b) => compareRooms(a, b, field));
    return dir === 'desc' ? sorted.reverse() : sorted;
  }, [roomTypes, roomTypeFilter, search, roomSort]);

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
        title="Room Types"
        description="Sellable categories. Inventory is derived from physical rooms — add or retire rooms to change it."
        actions={
          view === 'by-type' ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New room type
            </Button>
          ) : (
            <Button size="sm" onClick={openCreateRoom} disabled={roomTypeOptions.length === 0}>
              <Plus className="size-4" />
              Add room
            </Button>
          )
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as 'by-type' | 'all-rooms')}>
        <TabsList>
          <TabsTrigger value="by-type">By type</TabsTrigger>
          <TabsTrigger value="all-rooms">All rooms</TabsTrigger>
        </TabsList>

        <TabsContent value="by-type" className="space-y-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search room types…"
            filters={
              <div className="w-full max-w-56">
                <Select value={roomTypeSort} onValueChange={setSort}>
                  <SelectTrigger size="sm" aria-label="Sort room types">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPE_SORT_OPTIONS.map((opt) => (
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
            columns={roomTypeColumns}
            data={visibleRoomTypes}
            loading={loading}
            error={error}
            onRetry={() => void refetch()}
            emptyIcon={BedDouble}
            emptyTitle={search ? 'No room types match your search' : 'No room types yet'}
            emptyDescription={search ? 'Try a different name.' : 'Create the first sellable category for this hotel.'}
          />
        </TabsContent>

        <TabsContent value="all-rooms" className="space-y-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search rooms…"
            filters={
              <>
                <div className="w-full max-w-56">
                  <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                    <SelectTrigger size="sm" aria-label="Filter by room type">
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
                <div className="w-full max-w-56">
                  <Select value={roomSort} onValueChange={setSort}>
                    <SelectTrigger size="sm" aria-label="Sort rooms">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_SORT_OPTIONS.map((opt) => (
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
          <DataTable
            columns={roomColumns}
            data={allRooms}
            loading={loading}
            error={error}
            onRetry={() => void refetch()}
            onRowClick={openEditRoom}
            emptyIcon={DoorOpen}
            emptyTitle={search ? 'No rooms match your search' : 'No rooms yet'}
            emptyDescription={search ? 'Try a different room number or room type.' : 'Add the first physical room to a room type to make it sellable.'}
          />
        </TabsContent>
      </Tabs>

      <RoomTypeCreateSheet hotelId={hotelId} open={createOpen} onOpenChange={setCreateOpen} />

      {editingRoom !== undefined ? (
        // Keyed by record identity so switching between "add" and editing a
        // different room remounts the form instead of reusing stale
        // react-hook-form defaultValues from whichever record opened it first.
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
    </>
  );
}
