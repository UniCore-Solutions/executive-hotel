'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { RatePlanDetailsForm } from './RatePlanDetailsForm';

/**
 * Creating a rate plan only ever touches its own fields — linking a room
 * type and setting nightly prices both need the plan's id first, so
 * they're unavailable until after this step. That keeps creation itself
 * light enough for a drawer; the resulting edit page (Details / Room type
 * & pricing) stays a full page, the same split as Room Type create vs.
 * edit.
 */
export function RatePlanCreateSheet({
  hotelId,
  open,
  onOpenChange,
  onCreated,
}: {
  hotelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new plan's id instead of navigating to its edit page —
      used when creating from a room type's Rate Plan tab, so the caller can
      immediately link the new plan to that room type and stay put. Defaults
      to the original navigate-to-editor behavior. */
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New rate plan</SheetTitle>
          <SheetDescription>Link a room type and set nightly prices after creating it.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <RatePlanDetailsForm
            hotelId={hotelId}
            onCancel={() => onOpenChange(false)}
            onCreated={(id) => {
              onOpenChange(false);
              if (onCreated) onCreated(id);
              else router.push(`/hotels/${hotelId}/rate-plans/${id}`);
            }}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
