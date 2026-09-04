'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { Form, FormRow, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { SelectField } from '@/components/form/fields/SelectField';
import { SwitchField } from '@/components/form/fields/SwitchField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createAmenity, updateAmenity } from '@/api/rest/endpoints/amenities';
import { amenitySchema, AMENITY_CATEGORIES, type AmenityFormValues } from '@/schemas/amenities';
import type { AmenityRow } from './columns';

/**
 * Create or edit a catalog-level amenity definition — distinct from
 * assigning amenities to a hotel/room type (`HotelAmenitiesForm`/
 * `RoomTypeAmenitiesForm`), which pick from this catalog rather than
 * managing it. `isActive` is included as a plain checkbox here (not a
 * separate activate/deactivate action) since edit is otherwise a single
 * PUT anyway — same "one form, no extra endpoint" reasoning as the rest of
 * this app's `applyIfPresent`-shaped admin writes.
 */
export function AmenityFormSheet({
  open,
  onOpenChange,
  amenity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omitted for create — every field starts blank/active. */
  amenity?: AmenityRow | null;
}) {
  const isEdit = Boolean(amenity);
  const { form, submit, isSubmitting } = useAdminForm({
    schema: amenitySchema,
    defaultValues: {
      name: amenity?.name ?? '',
      icon: amenity?.icon ?? '',
      category: amenity?.category ?? '',
      isActive: amenity?.isActive ?? true,
    },
    mutationFn: (values) => (isEdit ? updateAmenity(amenity!.id, values) : createAmenity(values)),
    invalidates: isEdit ? 'amenities.update' : 'amenities.create',
    successMessage: isEdit ? 'Amenity updated' : 'Amenity created',
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit amenity' : 'New amenity'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Changes apply everywhere this amenity is already assigned.'
              : 'Added to the shared catalog every hotel and room type picks from.'}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form key={amenity?.id ?? 'new'} form={form} onSubmit={submit} className="space-y-4">
            <TextField<AmenityFormValues> name="name" label="Name" required placeholder="Rooftop Terrace" />
            <FormRow>
              <TextField<AmenityFormValues> name="icon" label="Icon" placeholder="sun (optional)" />
              <SelectField<AmenityFormValues>
                name="category"
                label="Category"
                placeholder="Select a category"
                options={AMENITY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </FormRow>
            <SwitchField<AmenityFormValues>
              name="isActive"
              label="Active"
              description="Assignable to hotels and room types while active."
            />
            <FormActions>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEdit ? 'Save changes' : 'Create amenity'}
              </Button>
            </FormActions>
          </Form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
