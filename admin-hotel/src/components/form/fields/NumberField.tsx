'use client';

import type { FieldValues, FieldPath } from 'react-hook-form';
import { FormField } from '../Form';
import { Input } from '@/components/ui/input';

export function NumberField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  min,
  max,
  step,
  disabled,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <FormField<TValues> name={name} label={label} description={description} required={required}>
      {(field) => (
        <Input
          id={name}
          type="number"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={(field.value as number | string | undefined) ?? ''}
          onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          onBlur={field.onBlur}
        />
      )}
    </FormField>
  );
}
