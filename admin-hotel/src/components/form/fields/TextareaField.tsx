'use client';

import type { FieldValues, FieldPath } from 'react-hook-form';
import { FormField } from '../Form';
import { Textarea } from '@/components/ui/textarea';

export function TextareaField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  rows = 4,
  placeholder,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <FormField<TValues> name={name} label={label} description={description} required={required}>
      {(field) => (
        <Textarea
          id={name}
          rows={rows}
          placeholder={placeholder}
          value={(field.value as string | undefined) ?? ''}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
        />
      )}
    </FormField>
  );
}
