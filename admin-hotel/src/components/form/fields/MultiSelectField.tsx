'use client';

import type { FieldValues, FieldPath } from 'react-hook-form';
import { FormField } from '../Form';
import { Checkbox } from '@/components/ui/checkbox';

type Option = { value: string; label: string; hint?: string; group?: string };

/** Checkbox-list multi-select — used for amenity assignment, where the
    option set is small (a few dozen) and every value should be scannable
    at once rather than hidden behind a dropdown. When any option carries a
    `group`, options render as labeled sections (e.g. amenity category)
    instead of one flat grid — options without a `group` fall back to a
    single "Other" section, and a set with no grouped options at all keeps
    the original flat layout unchanged. */
export function MultiSelectField<TValues extends FieldValues>({
  name,
  label,
  description,
  options,
}: {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  options: Option[];
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
        const renderOption = (opt: Option) => (
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
        );

        const isGrouped = options.some((o) => o.group);
        if (!isGrouped) {
          return (
            <div className="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-border p-2.5 sm:grid-cols-2">
              {options.map(renderOption)}
            </div>
          );
        }

        const groups = new Map<string, Option[]>();
        for (const opt of options) {
          const key = opt.group ?? 'Other';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(opt);
        }

        return (
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-border p-2.5">
            {[...groups.entries()].map(([groupName, opts]) => (
              <div key={groupName}>
                <p className="mb-1 px-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {groupName}
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{opts.map(renderOption)}</div>
              </div>
            ))}
          </div>
        );
      }}
    </FormField>
  );
}
