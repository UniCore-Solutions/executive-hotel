'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { HotelProfileForm } from '@/components/modules/settings/HotelProfileForm';

/**
 * E-NAV-2: "New hotel" drawer off the global Hotels list. Reuses
 * `HotelProfileForm` (identity/location/operational fields — ~12 fields
 * across two groups, the same form the hotel-level Settings page's Profile
 * tab uses to edit) in create mode: no id-dependent sub-resource (media,
 * amenities, policies) is available until after creation, so — same
 * reasoning as `RoomTypeCreateSheet` — a drawer is enough here; the
 * resulting hotel's full Settings page covers everything else.
 */
export function HotelCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New hotel</SheetTitle>
          <SheetDescription>Add amenities, policies and photos after creating it.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <HotelProfileForm
            onCancel={() => onOpenChange(false)}
            onCreated={(id) => {
              onOpenChange(false);
              router.push(`/hotels/${id}/dashboard`);
            }}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
