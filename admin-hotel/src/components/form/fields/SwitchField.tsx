'use client';

import type { FieldValues, FieldPath } from 'react-hook-form';
import { FormField } from '../Form';
import { Switch } from '@/components/ui/switch';

export function SwitchField<TValues extends FieldValues>({
  name,
  label,
  description,
}: {
  name: FieldPath<TValues>;
  label: string;
  description?: string;
}) {
  return (
    <FormField<TValues> name={name}>
      {(field) => (
        <label htmlFor={name} className="flex cursor-pointer items-start justify-between gap-3 py-1">
          <span>
            <span className="block text-sm font-medium text-ink">{label}</span>
            {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
          </span>
          <Switch id={name} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </label>
      )}
    </FormField>
  );
}
