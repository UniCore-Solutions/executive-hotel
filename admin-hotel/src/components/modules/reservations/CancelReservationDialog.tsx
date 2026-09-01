'use client';

import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/form/Form';
import { SelectField } from '@/components/form/fields/SelectField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { useAdminForm } from '@/hooks/useAdminForm';
import { adminCancelReservation } from '@/api/rest/endpoints/reservations';
import { cancelReservationSchema, CANCELLATION_REASONS } from '@/schemas/reservations';
import type { AdminReservationsQuery } from '@/graphql/generated/graphql';

type Reservation = AdminReservationsQuery['adminReservations']['items'][number];

export function CancelReservationDialog({
  reservation,
  open,
  onOpenChange,
  onCancelled,
}: {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}) {
  const { form, submit, isSubmitting } = useAdminForm({
    schema: cancelReservationSchema,
    defaultValues: { reasonCode: '', reasonNote: '' },
    mutationFn: (values) => adminCancelReservation(reservation.id, values),
    invalidates: 'reservations.cancel',
    successMessage: `Reservation ${reservation.reference} cancelled`,
    onSuccess: () => {
      onOpenChange(false);
      onCancelled();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel reservation {reservation.reference}</DialogTitle>
          <DialogDescription>
            The refund or penalty amount is calculated by the backend from the rate plan&apos;s
            cancellation policy — it is not computed here.
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={submit} className="mt-2 space-y-4">
          <SelectField<z.infer<typeof cancelReservationSchema>>
            name="reasonCode"
            label="Reason"
            required
            placeholder="Select a reason"
            options={CANCELLATION_REASONS.map((r) => ({ value: r.value, label: r.label }))}
          />
          <TextareaField<z.infer<typeof cancelReservationSchema>>
            name="reasonNote"
            label="Note (optional)"
            rows={3}
            placeholder="Any additional context for this cancellation"
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Keep reservation
            </Button>
            <Button type="submit" variant="destructive" loading={isSubmitting}>
              Cancel reservation
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
