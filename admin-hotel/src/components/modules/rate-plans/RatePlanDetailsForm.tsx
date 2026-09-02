'use client';

import { useRouter } from 'next/navigation';
import { Form, FormRow, FormActions, FormSection } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { NumberField } from '@/components/form/fields/NumberField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { SelectField } from '@/components/form/fields/SelectField';
import { SwitchField } from '@/components/form/fields/SwitchField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createRatePlan, updateRatePlan, type RatePlanInput } from '@/api/rest/endpoints/rates';
import { ratePlanSchema, type RatePlanFormValues } from '@/schemas/rates';
import type { RatePlanRow } from './columns';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const PAYMENT_TIMING_OPTIONS = [
  { value: 'pay_at_property', label: 'Pay at the property' },
  { value: 'prepay_full', label: 'Prepay in full' },
  { value: 'prepay_deposit', label: 'Prepay a deposit' },
];

const PENALTY_TYPE_OPTIONS = [
  { value: 'none', label: 'No penalty' },
  { value: 'percentage', label: 'Percentage of stay' },
  { value: 'fixed_amount', label: 'Fixed amount' },
  { value: 'first_night', label: 'First night' },
  { value: 'full_stay', label: 'Full stay' },
];

/** Strips the UI-only 'none' sentinel back to the nullable backend shape. */
function toRatePlanInput(values: RatePlanFormValues): RatePlanInput {
  return {
    ...values,
    cancellationPenaltyType: values.cancellationPenaltyType === 'none' ? undefined : values.cancellationPenaltyType,
  };
}

export function RatePlanDetailsForm({
  hotelId,
  ratePlan,
  onCreated,
  onCancel,
  onSaved,
}: {
  hotelId: string;
  ratePlan?: RatePlanRow;
  /** Called instead of navigating to the new plan's edit page — used when
      this form is embedded in the create drawer, so the caller can close
      the drawer before navigating. */
  onCreated?: (id: string) => void;
  /** Called instead of navigating back to the list on Cancel — used in the
      same drawer context, to just close it. */
  onCancel?: () => void;
  /** Called after a successful update (edit-page context only). */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(ratePlan);

  const { form, submit, isSubmitting } = useAdminForm({
    schema: ratePlanSchema,
    defaultValues: {
      name: ratePlan?.name ?? '',
      code: ratePlan?.code ?? '',
      currencyCode: ratePlan?.currencyCode ?? 'MAD',
      mealPlan: ratePlan?.mealPlan ?? '',
      cancellationPolicy: ratePlan?.cancellationPolicy ?? '',
      paymentPolicy: ratePlan?.paymentPolicy ?? '',
      isRefundable: ratePlan?.isRefundable ?? true,
      cancellationDeadlineDays: ratePlan?.cancellationDeadlineDays ?? undefined,
      cancellationPenaltyType:
        (ratePlan?.cancellationPenaltyType as RatePlanFormValues['cancellationPenaltyType']) ?? 'none',
      cancellationPenaltyValue: ratePlan?.cancellationPenaltyValue ?? undefined,
      paymentTiming: (ratePlan?.paymentTiming as RatePlanFormValues['paymentTiming']) ?? 'pay_at_property',
      depositPercentage: ratePlan?.depositPercentage ?? undefined,
      minStay: ratePlan?.minStay ?? undefined,
      maxStay: ratePlan?.maxStay ?? undefined,
      status: (ratePlan?.status as RatePlanFormValues['status']) ?? 'active',
    },
    mutationFn: (values) =>
      isEdit ? updateRatePlan(ratePlan!.id, toRatePlanInput(values)) : createRatePlan(hotelId, toRatePlanInput(values)),
    invalidates: isEdit ? 'ratePlans.update' : 'ratePlans.create',
    successMessage: isEdit ? 'Rate plan updated' : 'Rate plan created',
    onSuccess: (result) => {
      if (!isEdit) {
        const created = result as { id: string };
        if (onCreated) onCreated(created.id);
        else router.push(`/hotels/${hotelId}/rate-plans/${created.id}`);
      } else {
        onSaved?.();
      }
    },
  });

  const paymentTiming = form.watch('paymentTiming');
  const penaltyType = form.watch('cancellationPenaltyType');

  return (
    <Form form={form} onSubmit={submit} className="space-y-6">
      <FormRow>
        <TextField<RatePlanFormValues> name="name" label="Name" required placeholder="Deluxe Sea View — Bed & Breakfast" />
        <TextField<RatePlanFormValues> name="code" label="Code" required placeholder="DELUXE_BB" />
      </FormRow>
      <FormRow>
        <TextField<RatePlanFormValues> name="currencyCode" label="Currency" required placeholder="MAD" />
        <SelectField<RatePlanFormValues> name="status" label="Status" required options={STATUS_OPTIONS} />
      </FormRow>
      <TextField<RatePlanFormValues>
        name="mealPlan"
        label="Meal plan"
        placeholder="breakfast, half_board, room_only…"
        description="Free text — whatever this hotel calls it."
      />

      <FormSection title="Payment timing" description="When the guest is actually charged for a booking on this plan.">
        <SelectField<RatePlanFormValues>
          name="paymentTiming"
          label="Payment timing"
          required
          options={PAYMENT_TIMING_OPTIONS}
        />
        {paymentTiming === 'prepay_deposit' ? (
          <NumberField<RatePlanFormValues>
            name="depositPercentage"
            label="Deposit percentage"
            min={0}
            max={100}
            step={1}
            description="Share of the total taken at booking; the rest is due at the property."
          />
        ) : null}
        <TextareaField<RatePlanFormValues>
          name="paymentPolicy"
          label="Payment policy (guest-facing)"
          rows={2}
          placeholder="Full prepayment at booking"
        />
      </FormSection>

      <FormSection title="Cancellation" description="Display-only terms shown to the guest before booking.">
        <SwitchField<RatePlanFormValues> name="isRefundable" label="Refundable" description="Whether this plan allows cancellation at all." />
        <FormRow>
          <NumberField<RatePlanFormValues> name="cancellationDeadlineDays" label="Free-cancellation deadline (days)" min={0} max={365} />
          <SelectField<RatePlanFormValues>
            name="cancellationPenaltyType"
            label="Penalty type"
            required
            options={PENALTY_TYPE_OPTIONS}
          />
        </FormRow>
        {penaltyType !== 'none' ? (
          <NumberField<RatePlanFormValues>
            name="cancellationPenaltyValue"
            label={penaltyType === 'percentage' ? 'Penalty (%)' : 'Penalty amount'}
            min={0}
            step={penaltyType === 'percentage' ? 1 : 0.01}
          />
        ) : null}
        <TextareaField<RatePlanFormValues>
          name="cancellationPolicy"
          label="Cancellation policy (guest-facing)"
          rows={2}
          placeholder="Free cancellation up to 2 days before arrival; after that the first night is charged."
        />
      </FormSection>

      <FormSection title="Stay length">
        <FormRow>
          <NumberField<RatePlanFormValues> name="minStay" label="Min stay (nights)" min={1} max={365} />
          <NumberField<RatePlanFormValues> name="maxStay" label="Max stay (nights)" min={1} max={365} />
        </FormRow>
      </FormSection>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() => (onCancel ? onCancel() : router.push(`/hotels/${hotelId}/rate-plans`))}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Create rate plan'}
        </Button>
      </FormActions>
    </Form>
  );
}
