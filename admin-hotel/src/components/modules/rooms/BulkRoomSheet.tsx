'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { BulkRoomForm } from './BulkRoomForm';

/** Standalone entry point from the Room Type edit page's Rooms tab — see
    `BulkRoomForm` for the actual pattern/manual form (also reused inline as
    `RoomTypeCreateSheet`'s optional second step). */
export function BulkRoomSheet({
  hotelId,
  roomTypeId,
  open,
  onOpenChange,
  onSaved,
}: {
  hotelId: string;
  roomTypeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add rooms in bulk</SheetTitle>
          <SheetDescription>Create several physical rooms for this type at once.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <BulkRoomForm
            hotelId={hotelId}
            roomTypeId={roomTypeId}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved?.();
            }}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
