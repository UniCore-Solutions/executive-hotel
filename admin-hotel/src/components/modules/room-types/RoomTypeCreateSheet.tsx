'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { RoomTypeDetailsForm } from './RoomTypeDetailsForm';

/**
 * Creating a room type only ever touches the Details form — Amenities and
 * Gallery need an id to attach to, so they're unavailable until after this
 * step. That makes creation itself light enough for a drawer; the resulting
 * edit page (Details/Amenities/Gallery/Rooms) stays a full page, since that
 * one genuinely has a lot going on.
 */
export function RoomTypeCreateSheet({
  hotelId,
  open,
  onOpenChange,
}: {
  hotelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New room type</SheetTitle>
          <SheetDescription>Add amenities and photos after creating it.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <RoomTypeDetailsForm
            hotelId={hotelId}
            onCancel={() => onOpenChange(false)}
            onCreated={(id) => {
              onOpenChange(false);
              router.push(`/hotels/${hotelId}/room-types/${id}`);
            }}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
