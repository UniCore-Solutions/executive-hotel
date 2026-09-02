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
import { NumberField } from '@/components/form/fields/NumberField';
import { SelectField } from '@/components/form/fields/SelectField';
import { useAdminForm } from '@/hooks/useAdminForm';
import { updateAvailabilityRange } from '@/api/rest/endpoints/availability';
import { availabilityRangeSchema, type AvailabilityRangeFormValues } from '@/schemas/availability';

export interface AvailabilityBlockTarget {
  roomTypeId: string;
  fromDate: string;
  toDate: string;
  /** The counts that already apply to this range today, so opening the
      drawer shows reality rather than a blank/zeroed form — the backend
      SETS these for every day in the range, it doesn't add to them (see
      schemas/availability.ts). */
  blocked: number;
  outOfOrder: number;
}

/**
 * Block a date range, or mark units out of order, for one room type. A
 * lightweight range + two counters — not enough going on to justify losing
 * the calendar behind a full page, so this follows the same side-drawer
 * convention as `RoomFormSheet` (ADMIN_REBUILD_PROGRESS "drawer vs. full
 * page"). Callers MUST key this component on the target's identity (e.g.
 * `${roomTypeId}-${fromDate}-${toDate}`) so switching cells remounts the
 * form instead of reusing stale react-hook-form defaultValues — the exact
 * bug found and fixed in RoomFormSheet this session.
 */
export function AvailabilityBlockSheet({
  hotelId,
  roomTypeOptions,
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  hotelId: string;
  roomTypeOptions: { value: string; label: string }[];
  target: AvailabilityBlockTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { form, submit, isSubmitting } = useAdminForm({
    schema: availabilityRangeSchema,
    defaultValues: {
      roomTypeId: target.roomTypeId,
      fromDate: target.fromDate,
      toDate: target.toDate,
      blocked: target.blocked,
      outOfOrder: target.outOfOrder,
    },
    mutationFn: (values: AvailabilityRangeFormValues) =>
      updateAvailabilityRange(hotelId, {
        roomTypeId: values.roomTypeId,
        fromDate: values.fromDate,
        toDate: values.toDate,
        blocked: values.blocked,
        outOfOrder: values.outOfOrder,
      }),
    invalidates: 'availability.range',
    successMessage: 'Availability updated',
    onSuccess: () => {
      onOpenChange(false);
      onSaved();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Block dates / mark out of order</SheetTitle>
          <SheetDescription>
            Sets the blocked and out-of-order counts for every night in this range — it replaces
            whatever is there today, it doesn&apos;t add to it.
          </SheetDescription>
        </SheetHeader>
        <Form form={form} onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4">
            <SelectField<AvailabilityRangeFormValues>
              name="roomTypeId"
              label="Room type"
              required
              options={roomTypeOptions}
            />
            <FormRow>
              <TextField<AvailabilityRangeFormValues> name="fromDate" label="From" required type="date" />
              <TextField<AvailabilityRangeFormValues> name="toDate" label="To" required type="date" />
            </FormRow>
            <FormRow>
              <NumberField<AvailabilityRangeFormValues>
                name="blocked"
                label="Blocked units"
                required
                min={0}
                description="Held back from sale (e.g. a manual hold)."
              />
              <NumberField<AvailabilityRangeFormValues>
                name="outOfOrder"
                label="Out-of-order units"
                required
                min={0}
                description="Physically unsellable (e.g. under repair)."
              />
            </FormRow>
            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              The backend rejects a night where blocked + out of order + rooms already sold would
              exceed this room type&apos;s total inventory.
            </p>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
