'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Lock, Wrench } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminAvailabilityDocument } from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityCalendar, type CalendarRoomType } from '@/components/modules/availability/AvailabilityCalendar';
import {
  AvailabilityBlockSheet,
  type AvailabilityBlockTarget,
} from '@/components/modules/availability/AvailabilityBlockSheet';
import { buildAvailabilityLookup } from '@/components/modules/availability/grid';
import { availabilityWindowDays, todayIso } from '@/lib/dates';

/**
 * Room-type-scoped Availability tab. Reuses the exact same
 * `AdminAvailability` query as the hotel-wide `/availability` page — its
 * rows already carry `roomTypeId` per day, so this is a client-side filter
 * to this one room type, not a new query or backend work (same pattern as
 * the merged Room Types page's "All rooms" `roomTypeFilter`).
 */
export function RoomTypeAvailabilityPanel({ hotelId, roomTypeId }: { hotelId: string; roomTypeId: string }) {
  const { data, loading, error, refetch } = useQuery(AdminAvailabilityDocument, { variables: { hotelId } });

  const days = useMemo(() => availabilityWindowDays(), []);
  const roomType = useMemo(
    () => data?.adminHotel?.roomTypes.find((rt) => rt.id === roomTypeId),
    [data, roomTypeId],
  );
  const roomTypes: CalendarRoomType[] = useMemo(() => (roomType ? [roomType] : []), [roomType]);
  const rows = useMemo(
    () => (data?.adminHotel?.availability ?? []).filter((r) => r.roomTypeId === roomTypeId),
    [data, roomTypeId],
  );
  const cellFor = useMemo(() => buildAvailabilityLookup(rows), [rows]);

  const roomTypeOptions = useMemo(() => (roomType ? [{ value: roomType.id, label: roomType.name }] : []), [roomType]);

  const [target, setTarget] = useState<AvailabilityBlockTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openCell(rt: CalendarRoomType, date: string) {
    const cell = cellFor(rt.id, rt.totalInventory, date);
    setTarget({ roomTypeId: rt.id, fromDate: date, toDate: date, blocked: cell.blocked, outOfOrder: cell.outOfOrder });
    setSheetOpen(true);
  }

  function openGeneric() {
    if (!roomType) return;
    const today = todayIso();
    const cell = cellFor(roomType.id, roomType.totalInventory, today);
    setTarget({
      roomTypeId: roomType.id,
      fromDate: today,
      toDate: today,
      blocked: cell.blocked,
      outOfOrder: cell.outOfOrder,
    });
    setSheetOpen(true);
  }

  if (loading && !roomType) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!roomType) {
    return <ErrorState error={new Error('Room type not found in the availability calendar.')} />;
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Legend swatch="bg-success-light border-success/25" label="Available" />
          <Legend swatch="bg-warn-light border-warn/25" label="Few left" />
          <Legend swatch="bg-clay/10 border-clay/25" label="Sold out" />
          <span className="flex items-center gap-1">
            <Lock className="size-3" aria-hidden="true" /> Blocked
          </span>
          <span className="flex items-center gap-1">
            <Wrench className="size-3" aria-hidden="true" /> Out of order
          </span>
        </div>
        <Button size="sm" onClick={openGeneric}>
          <CalendarClock className="size-4" />
          Block dates
        </Button>
      </div>

      <AvailabilityCalendar roomTypes={roomTypes} days={days} rows={rows} onCellClick={(rt, date) => openCell(rt, date)} />

      {target ? (
        <AvailabilityBlockSheet
          key={`${target.roomTypeId}-${target.fromDate}-${target.toDate}`}
          hotelId={hotelId}
          roomTypeOptions={roomTypeOptions}
          target={target}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSaved={() => void refetch()}
        />
      ) : null}
    </>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded border ${swatch}`} aria-hidden="true" />
      {label}
    </span>
  );
}
