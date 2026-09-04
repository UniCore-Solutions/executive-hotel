'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RoomTypeDetailsForm } from './RoomTypeDetailsForm';
import { BulkRoomForm } from '@/components/modules/rooms/BulkRoomForm';

/**
 * Creating a room type only ever touches the Details form — Amenities and
 * Gallery need an id to attach to, so they're unavailable until after this
 * step. That makes creation itself light enough for a drawer; the resulting
 * edit page (Details/Amenities/Gallery/Rooms) stays a full page, since that
 * one genuinely has a lot going on.
 *
 * Once the room type exists, this sheet offers an optional second step —
 * add its physical rooms right away (`BulkRoomForm`, pattern or manual) —
 * before navigating to the edit page. Entirely skippable: a room type can
 * still be created with zero rooms and grown one at a time later, unchanged.
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
  const [createdId, setCreatedId] = useState<string | null>(null);

  function goToRoomType(id: string) {
    onOpenChange(false);
    setCreatedId(null);
    router.push(`/hotels/${hotelId}/room-types/${id}`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setCreatedId(null);
      }}
    >
      <SheetContent>
        {createdId ? (
          <>
            <SheetHeader>
              <SheetTitle>Add rooms now?</SheetTitle>
              <SheetDescription>
                Optional — you can always add rooms later from the room type&apos;s Rooms tab.
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <Button variant="secondary" size="sm" onClick={() => goToRoomType(createdId)}>
                Skip for now
              </Button>
              <BulkRoomForm
                hotelId={hotelId}
                roomTypeId={createdId}
                onCancel={() => goToRoomType(createdId)}
                onSaved={() => goToRoomType(createdId)}
              />
            </SheetBody>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>New room type</SheetTitle>
              <SheetDescription>Add amenities and photos after creating it.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <RoomTypeDetailsForm
                hotelId={hotelId}
                onCancel={() => onOpenChange(false)}
                onCreated={(id) => setCreatedId(id)}
              />
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
