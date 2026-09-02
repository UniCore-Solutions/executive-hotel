'use client';

import { use, useMemo, useState } from 'react';
import { CalendarClock, Lock, Wrench } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminAvailabilityDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityCalendar, type CalendarRoomType } from '@/components/modules/availability/AvailabilityCalendar';
import { AvailabilityBlockSheet, type AvailabilityBlockTarget } from '@/components/modules/availability/AvailabilityBlockSheet';
import { buildAvailabilityLookup } from '@/components/modules/availability/grid';
import { availabilityWindowDays, todayIso } from '@/lib/dates';

export default function AvailabilityPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminAvailabilityDocument, { variables: { hotelId } });

  const days = useMemo(() => availabilityWindowDays(), []);
  const roomTypes: CalendarRoomType[] = useMemo(() => data?.adminHotel?.roomTypes ?? [], [data]);
  const activeRoomTypes = useMemo(() => roomTypes.filter((rt) => rt.status === 'active'), [roomTypes]);
  const rows = useMemo(() => data?.adminHotel?.availability ?? [], [data]);
  const cellFor = useMemo(() => buildAvailabilityLookup(rows), [rows]);

  const roomTypeOptions = useMemo(
    () => roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
    [roomTypes],
  );

  const [target, setTarget] = useState<AvailabilityBlockTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openCell(roomType: CalendarRoomType, date: string) {
    const cell = cellFor(roomType.id, roomType.totalInventory, date);
    setTarget({ roomTypeId: roomType.id, fromDate: date, toDate: date, blocked: cell.blocked, outOfOrder: cell.outOfOrder });
    setSheetOpen(true);
  }

  function openGeneric() {
    const first = activeRoomTypes[0] ?? roomTypes[0];
    if (!first) return;
    const today = todayIso();
    const cell = cellFor(first.id, first.totalInventory, today);
    setTarget({ roomTypeId: first.id, fromDate: today, toDate: today, blocked: cell.blocked, outOfOrder: cell.outOfOrder });
    setSheetOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Availability"
        description="30-day inventory calendar. Click a day to block it or mark units out of order for a room type."
        actions={
          <Button size="sm" onClick={openGeneric} disabled={roomTypeOptions.length === 0}>
            <CalendarClock className="size-4" />
            Block dates
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : roomTypes.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No room types yet"
          description="Add a room type before there is any inventory to schedule."
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
          <AvailabilityCalendar
            roomTypes={roomTypes}
            days={days}
            rows={rows}
            onCellClick={(roomType, date) => openCell(roomType, date)}
          />
        </>
      )}

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
