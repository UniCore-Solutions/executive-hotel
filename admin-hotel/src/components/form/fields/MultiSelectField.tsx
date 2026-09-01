'use client';

import type { FieldValues, FieldPath } from 'react-hook-form';
import { FormField } from '../Form';
import { Checkbox } from '@/components/ui/checkbox';

/** Checkbox-list multi-select — used for amenity assignment, where the
    option set is small (a few dozen) and every value should be scannable
    at once rather than hidden behind a dropdown. */
export function MultiSelectField<TValues extends FieldValues>({
  name,
  label,
  description,
  options,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  options: { value: string; label: string; hint?: string }[];
}) {
  return (
    <FormField<TValues> name={name} label={label} description={description}>
      {(field) => {
        const selected = new Set((field.value as string[] | undefined) ?? []);
        function toggle(value: string) {
          const next = new Set(selected);
          if (next.has(value)) next.delete(value);
          else next.add(value);
          field.onChange(Array.from(next));
        }
        return (
          <div className="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-border p-2.5 sm:grid-cols-2">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
              >
                <Checkbox checked={selected.has(opt.value)} onCheckedChange={() => toggle(opt.value)} />
                <span>
                  {opt.label}
                  {opt.hint ? <span className="ml-1 text-xs text-muted-foreground">{opt.hint}</span> : null}
                </span>
              </label>
            ))}
          </div>
        );
      }}
    </FormField>
  );
}
