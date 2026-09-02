'use client';

import type { FieldValues, FieldPath } from 'react-hook-form';
import { FormField } from '../Form';
import { Input } from '@/components/ui/input';

export function TextField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  type = 'text',
  placeholder,
  disabled,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date';
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <FormField<TValues> name={name} label={label} description={description} required={required}>
      {(field) => (
        <Input
          id={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          value={(field.value as string | number | undefined) ?? ''}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
        />
      )}
    </FormField>
  );
}
