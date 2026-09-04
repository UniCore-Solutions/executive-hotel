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
import { Form, FormRow, FormSection } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { NumberField } from '@/components/form/fields/NumberField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { SelectField } from '@/components/form/fields/SelectField';
import { SwitchField } from '@/components/form/fields/SwitchField';
import { MultiSelectField } from '@/components/form/fields/MultiSelectField';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createPromotion, updatePromotion, type PromotionInput } from '@/api/rest/endpoints/promotions';
import { promotionSchema, DAY_OF_WEEK_OPTIONS, type PromotionFormValues } from '@/schemas/promotions';
import type { PromotionRow } from './columns';

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage off' },
  { value: 'fixed_amount', label: 'Fixed amount off (MAD)' },
  { value: 'stay_x_pay_y', label: 'Stay X, pay Y' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
];

/** Splits the comma-joined backend string ('MON,TUE') into the array shape
    `MultiSelectField` needs; empty/null means "no restriction". */
function parseDays(value?: string | null): PromotionFormValues['applicableDaysOfWeek'] {
  if (!value) return [];
  return value.split(',').filter(Boolean) as PromotionFormValues['applicableDaysOfWeek'];
}

/** Converts the form's array back to the backend's nullable comma-joined
    string, and drops the UI-only empty-array-means-null distinction. */
function toPromotionInput(values: PromotionFormValues): PromotionInput {
  return {
    ...values,
    applicableDaysOfWeek: values.applicableDaysOfWeek.length > 0 ? values.applicableDaysOfWeek.join(',') : undefined,
  };
}

/**
 * A promotion has no id-dependent follow-up step the way a rate plan does
 * (linking a room type, setting prices) — every field it takes is available
 * up front, and there is no admin surface at all for per-room-type/
 * per-rate-plan eligibility (see schemas/promotions.ts) — so create and edit
 * share one drawer form instead of splitting into a create-drawer +
 * full-page-editor like Rate Plans.
 */
export function PromotionFormSheet({
  hotelId,
  promotion,
  open,
  onOpenChange,
  onSaved,
}: {
  hotelId: string;
  promotion?: PromotionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(promotion);
  // A platform-wide promotion (hotelId: null) takes super_admin server-side
  // (RateAdminServiceImpl#requirePromotionScope) — this hotel-scoped page
  // still lets any staff member with hotel access open one to look, but a
  // save from a non-super_admin surfaces the backend's own 403 as a toast
  // (useAdminForm's generic error handling) rather than duplicating that
  // check client-side with no permission data to base it on (see
  // docs/ADMIN_REBUILD_PROGRESS.md's E-ROLES section on this exact tradeoff).
  const isPlatformWide = isEdit && !promotion!.hotelId;

  const { form, submit, isSubmitting } = useAdminForm({
    schema: promotionSchema,
    defaultValues: {
      code: promotion?.code ?? '',
      name: promotion?.name ?? '',
      description: promotion?.description ?? '',
      discountType: (promotion?.discountType as PromotionFormValues['discountType']) ?? 'percentage',
      discountValue: promotion?.discountValue ?? undefined,
      bookingWindowStart: promotion?.bookingWindowStart ?? undefined,
      bookingWindowEnd: promotion?.bookingWindowEnd ?? undefined,
      stayWindowStart: promotion?.stayWindowStart ?? undefined,
      stayWindowEnd: promotion?.stayWindowEnd ?? undefined,
      minNights: promotion?.minNights ?? undefined,
      maxUsageTotal: promotion?.maxUsageTotal ?? undefined,
      maxUsagePerGuest: promotion?.maxUsagePerGuest ?? undefined,
      stackable: promotion?.stackable ?? false,
      appliesToAllRoomTypes: promotion?.appliesToAllRoomTypes ?? true,
      appliesToAllRatePlans: promotion?.appliesToAllRatePlans ?? true,
      applicableDaysOfWeek: parseDays(promotion?.applicableDaysOfWeek),
      status: (promotion?.status as PromotionFormValues['status']) ?? 'active',
    },
    mutationFn: (values) =>
      isEdit
        ? updatePromotion(promotion!.id, toPromotionInput(values))
        : createPromotion(hotelId, toPromotionInput(values)),
    invalidates: isEdit ? 'promotions.update' : 'promotions.create',
    successMessage: isEdit ? 'Promotion updated' : 'Promotion created',
    onSuccess: () => {
      onOpenChange(false);
      onSaved();
    },
  });

  const discountType = form.watch('discountType');
  const appliesToAllRoomTypes = form.watch('appliesToAllRoomTypes');
  const appliesToAllRatePlans = form.watch('appliesToAllRatePlans');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? `Edit ${promotion?.name}` : 'New promotion'}</SheetTitle>
          <SheetDescription>
            {isPlatformWide
              ? 'Platform-wide promotion — applies to every hotel. Saving requires the super_admin role.'
              : 'A promo code guests can enter at checkout to discount their stay.'}
          </SheetDescription>
        </SheetHeader>
        <Form form={form} onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-6">
            <FormRow>
              <TextField<PromotionFormValues> name="name" label="Name" required placeholder="Spring Escape 15%" />
              <TextField<PromotionFormValues> name="code" label="Promo code" required placeholder="SPRING25" />
            </FormRow>
            <TextareaField<PromotionFormValues>
              name="description"
              label="Description"
              rows={2}
              placeholder="Guest-facing explanation of the offer."
            />

            <FormSection title="Discount">
              <FormRow>
                <SelectField<PromotionFormValues>
                  name="discountType"
                  label="Discount type"
                  required
                  options={DISCOUNT_TYPE_OPTIONS}
                />
                <NumberField<PromotionFormValues>
                  name="discountValue"
                  label={discountType === 'percentage' ? 'Discount (%)' : 'Discount amount (MAD)'}
                  required
                  min={0}
                  max={discountType === 'percentage' ? 100 : undefined}
                  step={discountType === 'percentage' ? 1 : 0.01}
                />
              </FormRow>
              {discountType === 'stay_x_pay_y' ? (
                <p className="rounded-md border border-warn/25 bg-warn-light px-3 py-2 text-xs text-warn-dark">
                  Stay-X-pay-Y pricing is not yet computed by the backend at quote time — a booking using this promo
                  will come back invalid until that logic is implemented. Safe to create and hold in reserve, not
                  safe to advertise to guests yet.
                </p>
              ) : null}
            </FormSection>

            <FormSection title="Booking window" description="When the guest must book, to qualify (leave blank for no limit).">
              <FormRow>
                <TextField<PromotionFormValues> name="bookingWindowStart" label="From" type="date" />
                <TextField<PromotionFormValues> name="bookingWindowEnd" label="To" type="date" />
              </FormRow>
            </FormSection>

            <FormSection title="Stay window" description="When the stay itself must fall, to qualify (leave blank for no limit).">
              <FormRow>
                <TextField<PromotionFormValues> name="stayWindowStart" label="From" type="date" />
                <TextField<PromotionFormValues> name="stayWindowEnd" label="To" type="date" />
              </FormRow>
              <NumberField<PromotionFormValues> name="minNights" label="Minimum nights" min={1} max={365} />
            </FormSection>

            <FormSection title="Usage limits">
              <FormRow>
                <NumberField<PromotionFormValues>
                  name="maxUsageTotal"
                  label="Total uses (all guests)"
                  min={1}
                  description="Leave blank for unlimited."
                />
                <NumberField<PromotionFormValues>
                  name="maxUsagePerGuest"
                  label="Uses per guest"
                  min={1}
                  description="Leave blank for unlimited."
                />
              </FormRow>
              <SwitchField<PromotionFormValues>
                name="stackable"
                label="Stackable"
                description="Can be combined with other active promotions on the same booking."
              />
            </FormSection>

            <FormSection
              title="Eligibility"
              description="This backend only exposes all-or-nothing eligibility — picking specific room types or rate plans isn't available yet."
            >
              <SwitchField<PromotionFormValues>
                name="appliesToAllRoomTypes"
                label="Applies to all room types"
              />
              <SwitchField<PromotionFormValues>
                name="appliesToAllRatePlans"
                label="Applies to all rate plans"
              />
              {!appliesToAllRoomTypes || !appliesToAllRatePlans ? (
                <p className="rounded-md border border-clay/25 bg-clay/10 px-3 py-2 text-xs text-clay-dark">
                  With this switched off, the promotion has no eligible {!appliesToAllRoomTypes ? 'room types' : ''}
                  {!appliesToAllRoomTypes && !appliesToAllRatePlans ? ' or ' : ''}
                  {!appliesToAllRatePlans ? 'rate plans' : ''} — there&apos;s no way in this admin to whitelist
                  specific ones, so it will never apply to any booking until switched back on.
                </p>
              ) : null}
            </FormSection>

            <MultiSelectField<PromotionFormValues>
              name="applicableDaysOfWeek"
              label="Applicable days of week"
              description="Leave every box unchecked to allow all days."
              options={DAY_OF_WEEK_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
            />

            <SelectField<PromotionFormValues> name="status" label="Status" required options={STATUS_OPTIONS} />
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create promotion'}
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
