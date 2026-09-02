'use client';

import { Form, FormRow, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { SelectField } from '@/components/form/fields/SelectField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { updatePlatform } from '@/api/rest/endpoints/platform';
import { platformBrandSchema, PLATFORM_CURRENCIES, type PlatformBrandFormValues } from '@/schemas/platform';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

const CURRENCY_OPTIONS = PLATFORM_CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

export interface PlatformBrand {
  id: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  defaultCurrency?: string | null;
  status: string;
}

export function PlatformBrandForm({ platform, onSaved }: { platform: PlatformBrand; onSaved?: () => void }) {
  const { form, submit, isSubmitting } = useAdminForm({
    schema: platformBrandSchema,
    defaultValues: {
      name: platform.name,
      tagline: platform.tagline ?? '',
      description: platform.description ?? '',
      defaultCurrency: (platform.defaultCurrency as PlatformBrandFormValues['defaultCurrency']) ?? 'MAD',
      status: (platform.status as PlatformBrandFormValues['status']) ?? 'active',
    },
    mutationFn: (values) => updatePlatform(platform.id, values),
    invalidates: 'platform.update',
    successMessage: 'Brand settings updated',
    onSuccess: onSaved,
  });

  return (
    <Form form={form} onSubmit={submit} className="space-y-6">
      <FormRow>
        <TextField<PlatformBrandFormValues> name="name" label="Collection name" required placeholder="The Hotel Collection" />
        <TextField<PlatformBrandFormValues> name="tagline" label="Tagline" placeholder="Curated stays, independently run" />
      </FormRow>
      <TextareaField<PlatformBrandFormValues>
        name="description"
        label="Description"
        rows={4}
        placeholder="A short description of the collection, shown on the guest site."
      />
      <FormRow>
        <SelectField<PlatformBrandFormValues>
          name="defaultCurrency"
          label="Default currency"
          required
          options={CURRENCY_OPTIONS}
        />
        <SelectField<PlatformBrandFormValues> name="status" label="Status" required options={STATUS_OPTIONS} />
      </FormRow>

      <FormActions>
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </FormActions>
    </Form>
  );
}
