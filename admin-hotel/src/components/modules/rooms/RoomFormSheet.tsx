'use client';

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
import { Form, FormRow } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { SelectField } from '@/components/form/fields/SelectField';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createRoom, updateRoom } from '@/api/rest/endpoints/catalog';
import { roomSchema, type RoomFormValues } from '@/schemas/catalog';
import type { RoomRow } from './columns';

const ROOM_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'out_of_order', label: 'Out of order' },
];
const HOUSEKEEPING_STATUS = [
  { value: 'clean', label: 'Clean' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'inspected', label: 'Inspected' },
  { value: 'out_of_service', label: 'Out of service' },
];
const MAINTENANCE_STATUS = [
  { value: 'ok', label: 'OK' },
  { value: 'needs_repair', label: 'Needs repair' },
  { value: 'under_repair', label: 'Under repair' },
];

/**
 * A room has few enough fields (number, floor, three statuses, and which
 * room type it belongs to) that a full page for it would be overkill — a
 * side drawer keeps the room list in view while you add or edit one.
 * Compare RoomTypeDetailsForm's full page: that entity carries description,
 * capacity, bed config, plus Amenities/Gallery tabs, which is worth leaving
 * the list for.
 */
export function RoomFormSheet({
  hotelId,
  roomTypeOptions,
  room,
  open,
  onOpenChange,
  onSaved,
}: {
  hotelId: string;
  roomTypeOptions: { value: string; label: string }[];
  room?: RoomRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(room);
  // Opened from a room type's own "Rooms" tab, there's only one sensible
  // room type to assign — no point asking. Opened from the hotel-wide
  // /rooms page, roomTypeOptions has the full list and the field shows.
  const lockedRoomType = roomTypeOptions.length === 1 ? roomTypeOptions[0] : null;

  const { form, submit, isSubmitting } = useAdminForm({
    schema: roomSchema,
    defaultValues: {
      roomTypeId: room?.roomTypeId ?? roomTypeOptions[0]?.value ?? '',
      roomNumber: room?.roomNumber ?? '',
      floor: room?.floor ?? '',
      status: (room?.status as RoomFormValues['status']) ?? 'active',
      housekeepingStatus: (room?.housekeepingStatus as RoomFormValues['housekeepingStatus']) ?? 'clean',
      maintenanceStatus: (room?.maintenanceStatus as RoomFormValues['maintenanceStatus']) ?? 'ok',
    },
    mutationFn: (values) => (isEdit ? updateRoom(room!.id, values) : createRoom(hotelId, values)),
    invalidates: isEdit ? 'rooms.update' : 'rooms.create',
    successMessage: isEdit ? 'Room updated' : 'Room added',
    onSuccess: () => {
      onOpenChange(false);
      onSaved();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? `Edit room ${room?.roomNumber}` : 'Add a room'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Changes here affect this physical room only.'
              : 'Adding an active room increases its room type’s sellable inventory.'}
          </SheetDescription>
        </SheetHeader>
        <Form form={form} onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
            {lockedRoomType ? (
              <p className="text-sm text-muted-foreground">
                Room type: <span className="font-medium text-ink">{lockedRoomType.label}</span>
              </p>
            ) : (
              <SelectField<RoomFormValues> name="roomTypeId" label="Room type" required options={roomTypeOptions} />
            )}
            <FormRow>
              <TextField<RoomFormValues> name="roomNumber" label="Room number" required placeholder="204" />
              <TextField<RoomFormValues> name="floor" label="Floor" placeholder="2" />
            </FormRow>
            <FormRow>
              <SelectField<RoomFormValues> name="status" label="Status" required options={ROOM_STATUS} />
              <SelectField<RoomFormValues>
                name="housekeepingStatus"
                label="Housekeeping"
                required
                options={HOUSEKEEPING_STATUS}
              />
            </FormRow>
            <SelectField<RoomFormValues> name="maintenanceStatus" label="Maintenance" required options={MAINTENANCE_STATUS} />
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add room'}
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
