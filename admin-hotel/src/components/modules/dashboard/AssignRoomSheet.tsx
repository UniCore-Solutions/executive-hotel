'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/form/Form';
import { SelectField } from '@/components/form/fields/SelectField';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminForm } from '@/hooks/useAdminForm';
import { assignRoom, eligibleRooms } from '@/api/rest/endpoints/reservations';
import { assignRoomSchema, type AssignRoomInput } from '@/schemas/reservations';

/**
 * Small picker for assigning a physical room to one reservation room line.
 * `eligibleRooms` is a REST read with no GraphQL equivalent (it depends on
 * BookingService's occupancy check, not a catalog query) so it goes through
 * TanStack Query directly rather than Apollo — the read cache this app uses
 * everywhere else. It refetches every time the sheet opens since occupancy
 * can change between opens.
 */
export function AssignRoomSheet({
  reservationId,
  roomLineId,
  roomTypeId,
  roomTypeName,
  checkInDate,
  checkOutDate,
  currentRoomId,
  currentRoomNumber,
  open,
  onOpenChange,
  onAssigned,
}: {
  reservationId: string;
  roomLineId: string;
  roomTypeId: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  currentRoomId?: string | null;
  currentRoomNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['eligibleRooms', roomTypeId, checkInDate, checkOutDate],
    queryFn: () => eligibleRooms(roomTypeId, checkInDate, checkOutDate),
    enabled: open,
  });

  const options = useMemo(() => {
    const base = (data ?? []).map((r) => ({
      value: r.id,
      label: r.floor ? `Room ${r.roomNumber} · Floor ${r.floor}` : `Room ${r.roomNumber}`,
    }));
    if (currentRoomId && currentRoomNumber && !base.some((o) => o.value === currentRoomId)) {
      base.unshift({ value: currentRoomId, label: `Room ${currentRoomNumber} (currently assigned)` });
    }
    return base;
  }, [data, currentRoomId, currentRoomNumber]);

  const { form, submit, isSubmitting } = useAdminForm({
    schema: assignRoomSchema,
    defaultValues: { roomId: currentRoomId ?? '' },
    mutationFn: (values: AssignRoomInput) => assignRoom(reservationId, roomLineId, values.roomId),
    invalidates: 'reservations.assignRoom',
    successMessage: 'Room assigned',
    onSuccess: () => {
      onOpenChange(false);
      onAssigned();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Assign a room — {roomTypeName}</SheetTitle>
          <SheetDescription>
            Only active rooms of this room type with no conflicting stay for {checkInDate} →{' '}
            {checkOutDate} are offered.
          </SheetDescription>
        </SheetHeader>
        <Form form={form} onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : isError ? (
              <p className="text-sm text-critical">Could not load eligible rooms.</p>
            ) : options.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rooms of this type are free for these dates.
              </p>
            ) : (
              <SelectField<AssignRoomInput>
                name="roomId"
                label="Room"
                required
                placeholder="Select a room"
                options={options}
              />
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={options.length === 0}>
              Assign room
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
