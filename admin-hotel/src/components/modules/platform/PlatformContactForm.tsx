'use client';

import { Form, FormRow, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { updatePlatform } from '@/api/rest/endpoints/platform';
import { platformContactSchema, type PlatformContactFormValues } from '@/schemas/platform';

export interface PlatformContact {
  id: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function PlatformContactForm({ platform, onSaved }: { platform: PlatformContact; onSaved?: () => void }) {
  const { form, submit, isSubmitting } = useAdminForm({
    schema: platformContactSchema,
    defaultValues: {
      contactEmail: platform.contactEmail ?? '',
      contactPhone: platform.contactPhone ?? '',
    },
    mutationFn: (values) => updatePlatform(platform.id, values),
    invalidates: 'platform.update',
    successMessage: 'Contact details updated',
    onSuccess: onSaved,
  });

  return (
    <Form form={form} onSubmit={submit} className="space-y-6">
      <FormRow>
        <TextField<PlatformContactFormValues> name="contactEmail" label="Contact email" type="email" placeholder="hello@hotelcollection.test" />
        <TextField<PlatformContactFormValues> name="contactPhone" label="Contact phone" type="tel" placeholder="+212 600 000 000" />
      </FormRow>

      <FormActions>
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </FormActions>
    </Form>
  );
}
