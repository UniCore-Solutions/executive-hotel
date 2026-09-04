'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { Form, FormRow, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { SelectField } from '@/components/form/fields/SelectField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { SwitchField } from '@/components/form/fields/SwitchField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createSeason, updateSeason } from '@/api/rest/endpoints/seasons';
import { seasonSchema, SEASON_TYPES, type SeasonFormValues } from '@/schemas/seasons';
import type { SeasonRow } from './columns';

const COLOR_PRESETS = ['#c9a15a', '#4a7c8c', '#8c5a4a', '#5a8c5f', '#8c4a7c'];

export function SeasonFormSheet({
  hotelId,
  season,
  open,
  onOpenChange,
  onSaved,
}: {
  hotelId: string;
  /** Omitted for create. */
  season?: SeasonRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const isEdit = Boolean(season);
  const { form, submit, isSubmitting } = useAdminForm({
    schema: seasonSchema,
    defaultValues: {
      name: season?.name ?? '',
      seasonType: season?.seasonType ?? 'custom',
      startDate: season?.startDate ?? '',
      endDate: season?.endDate ?? '',
      isActive: season?.isActive ?? true,
      color: season?.color ?? '',
      notes: season?.notes ?? '',
    },
    mutationFn: (values) => (isEdit ? updateSeason(season!.id, values) : createSeason(hotelId, values)),
    invalidates: isEdit ? 'seasons.update' : 'seasons.create',
    successMessage: isEdit ? 'Season updated' : 'Season created',
    onSuccess: () => {
      onOpenChange(false);
      onSaved?.();
    },
  });

  const color = form.watch('color');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit season' : 'New season'}</SheetTitle>
          <SheetDescription>
            A named date range for this hotel — informational, not wired into rate-plan pricing.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form key={season?.id ?? 'new'} form={form} onSubmit={submit} className="space-y-4">
            <TextField<SeasonFormValues> name="name" label="Name" required placeholder="Summer High Season" />
            <SelectField<SeasonFormValues>
              name="seasonType"
              label="Type"
              required
              options={SEASON_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <FormRow>
              <TextField<SeasonFormValues> name="startDate" label="Start date" type="date" required />
              <TextField<SeasonFormValues> name="endDate" label="End date" type="date" required />
            </FormRow>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Color</p>
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => form.setValue('color', c, { shouldDirty: true })}
                    className="size-6 rounded-full ring-offset-2 transition-shadow"
                    style={{ backgroundColor: c, boxShadow: color === c ? '0 0 0 2px var(--color-navy)' : undefined }}
                    aria-label={`Use color ${c}`}
                  />
                ))}
                {color ? (
                  <button
                    type="button"
                    onClick={() => form.setValue('color', '', { shouldDirty: true })}
                    className="text-xs text-muted-foreground underline underline-offset-2"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <TextareaField<SeasonFormValues> name="notes" label="Notes" rows={3} placeholder="Optional internal notes." />
            <SwitchField<SeasonFormValues>
              name="isActive"
              label="Active"
              description="Inactive seasons don't block a new one over the same dates."
            />
            <FormActions>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEdit ? 'Save changes' : 'Create season'}
              </Button>
            </FormActions>
          </Form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
