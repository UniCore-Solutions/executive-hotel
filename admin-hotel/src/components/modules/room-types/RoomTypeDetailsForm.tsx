'use client';

import { useRouter } from 'next/navigation';
import { Form, FormRow, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { NumberField } from '@/components/form/fields/NumberField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { SelectField } from '@/components/form/fields/SelectField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createRoomType, updateRoomType } from '@/api/rest/endpoints/catalog';
import { roomTypeSchema, type RoomTypeFormValues } from '@/schemas/catalog';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

export function RoomTypeDetailsForm({
  hotelId,
  roomType,
  onCreated,
  onCancel,
}: {
  hotelId: string;
  roomType?: {
    id: string;
    name: string;
    description?: string | null;
    maxAdults: number;
    maxChildren: number;
    bedConfiguration?: string | null;
    sizeSqm?: number | null;
    viewType?: string | null;
    status: string;
  };
  /** Called instead of navigating to the new room type's edit page — used
      when this form is embedded in a drawer opened from the list, so the
      caller can close the drawer before navigating. */
  onCreated?: (id: string) => void;
  /** Called instead of navigating back to the room types list on Cancel —
      used in the same drawer context, to just close it. */
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(roomType);

  const { form, submit, isSubmitting } = useAdminForm({
    schema: roomTypeSchema,
    defaultValues: {
      name: roomType?.name ?? '',
      description: roomType?.description ?? '',
      maxAdults: roomType?.maxAdults ?? 2,
      maxChildren: roomType?.maxChildren ?? 0,
      bedConfiguration: roomType?.bedConfiguration ?? '',
      sizeSqm: roomType?.sizeSqm ?? undefined,
      viewType: roomType?.viewType ?? '',
      status: (roomType?.status as RoomTypeFormValues['status']) ?? 'draft',
    },
    mutationFn: (values) =>
      isEdit ? updateRoomType(roomType!.id, values) : createRoomType(hotelId, values),
    invalidates: isEdit ? 'roomTypes.update' : 'roomTypes.create',
    successMessage: isEdit ? 'Room type updated' : 'Room type created',
    onSuccess: (result) => {
      if (!isEdit) {
        const created = result as { id: string };
        if (onCreated) onCreated(created.id);
        else router.push(`/hotels/${hotelId}/room-types/${created.id}`);
      }
    },
  });

  return (
    <Form form={form} onSubmit={submit} className="space-y-6">
      <FormRow>
        <TextField<RoomTypeFormValues> name="name" label="Name" required placeholder="Deluxe Sea View" />
        <SelectField<RoomTypeFormValues> name="status" label="Status" required options={STATUS_OPTIONS} />
      </FormRow>
      <TextareaField<RoomTypeFormValues>
        name="description"
        label="Description"
        rows={4}
        placeholder="A short, guest-facing description of this room type."
      />
      <FormRow>
        <NumberField<RoomTypeFormValues> name="maxAdults" label="Max adults" required min={1} max={20} />
        <NumberField<RoomTypeFormValues> name="maxChildren" label="Max children" min={0} max={20} />
      </FormRow>
      <FormRow>
        <TextField<RoomTypeFormValues> name="bedConfiguration" label="Bed configuration" placeholder="1 King bed" />
        <NumberField<RoomTypeFormValues> name="sizeSqm" label="Size (m²)" min={1} step={0.5} />
      </FormRow>
      <TextField<RoomTypeFormValues> name="viewType" label="View" placeholder="Sea view" />

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() => (onCancel ? onCancel() : router.push(`/hotels/${hotelId}/room-types`))}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Create room type'}
        </Button>
      </FormActions>
    </Form>
  );
}
