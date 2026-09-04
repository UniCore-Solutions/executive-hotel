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
  list,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date';
  placeholder?: string;
  disabled?: boolean;
  /** Id of a `<datalist>` element to attach — a native, dependency-free
      autocomplete for a large reference list (countries, timezones) that
      doesn't warrant a dedicated combobox component. */
  list?: string;
}) {
  return (
    <FormField<TValues> name={name} label={label} description={description} required={required}>
      {(field) => (
        <Input
          id={name}
          type={type}
          list={list}
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
