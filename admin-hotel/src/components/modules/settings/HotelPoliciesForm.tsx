'use client';

import { useFieldArray } from 'react-hook-form';
import { ArrowDown, ArrowUp, Plus, ScrollText, Trash2 } from 'lucide-react';
import { Form, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAdminForm } from '@/hooks/useAdminForm';
import { setHotelPolicies, type HotelPolicyInput } from '@/api/rest/endpoints/catalog';
import { hotelPoliciesSchema, type HotelPoliciesFormValues } from '@/schemas/settings';

export interface HotelPolicyRow {
  id: string;
  name: string;
  value: string;
  icon?: string | null;
  sortOrder: number;
}

export function HotelPoliciesForm({
  hotelId,
  policies,
  onSaved,
}: {
  hotelId: string;
  policies: HotelPolicyRow[];
  onSaved?: () => void;
}) {
  const sorted = [...policies].sort((a, b) => a.sortOrder - b.sortOrder);

  const { form, submit, isSubmitting } = useAdminForm({
    schema: hotelPoliciesSchema,
    defaultValues: {
      policies: sorted.map((p) => ({ name: p.name, value: p.value, icon: p.icon ?? '' })),
    },
    mutationFn: (values) => {
      const input: HotelPolicyInput[] = values.policies.map((p, i) => ({
        name: p.name,
        value: p.value,
        icon: p.icon || undefined,
        sortOrder: i,
      }));
      return setHotelPolicies(hotelId, input);
    },
    invalidates: 'hotels.policies',
    successMessage: 'Policies updated',
    onSuccess: onSaved,
  });

  const fields = useFieldArray<HotelPoliciesFormValues>({ control: form.control, name: 'policies' });

  return (
    <Form form={form} onSubmit={submit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Guest-facing policy statements (cancellation, children, pets, payment…), shown on the hotel&apos;s public
        page in this order. There is no separate &quot;type&quot; field — the name is whatever label makes sense
        (e.g. &quot;Cancellation&quot;).
      </p>

      {fields.fields.length === 0 ? (
        <EmptyState icon={ScrollText} title="No policies yet" description="Add the first policy statement." />
      ) : (
        <div className="space-y-4">
          {fields.fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-border p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Policy {index + 1}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="iconSm"
                    variant="secondary"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => fields.move(index, index - 1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="iconSm"
                    variant="secondary"
                    title="Move down"
                    disabled={index === fields.fields.length - 1}
                    onClick={() => fields.move(index, index + 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="iconSm"
                    variant="destructive"
                    title="Remove"
                    onClick={() => fields.remove(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                <TextField<HotelPoliciesFormValues>
                  name={`policies.${index}.name`}
                  label="Name"
                  required
                  placeholder="Cancellation"
                />
                <TextField<HotelPoliciesFormValues>
                  name={`policies.${index}.icon`}
                  label="Icon"
                  placeholder="calendar (optional)"
                />
              </div>
              <div className="mt-3">
                <TextareaField<HotelPoliciesFormValues>
                  name={`policies.${index}.value`}
                  label="Value"
                  required
                  rows={2}
                  placeholder="Free cancellation up to 48 hours before arrival."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => fields.append({ name: '', value: '', icon: '' })}
      >
        <Plus className="size-3.5" />
        Add policy
      </Button>

      <FormActions>
        <Button type="submit" loading={isSubmitting}>
          Save policies
        </Button>
      </FormActions>
    </Form>
  );
}
