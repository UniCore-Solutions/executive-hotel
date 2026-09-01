'use client';

import type { FieldValues, FieldPath } from 'react-hook-form';
import { FormField } from '../Form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SelectField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  placeholder = 'Select…',
  options,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <FormField<TValues> name={name} label={label} description={description} required={required}>
      {(field) => (
        <Select value={(field.value as string | undefined) ?? undefined} onValueChange={field.onChange}>
          <SelectTrigger id={name} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
