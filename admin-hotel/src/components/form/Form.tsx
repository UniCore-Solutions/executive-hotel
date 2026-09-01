'use client';

import type { BaseSyntheticEvent, ReactNode } from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * The one form architecture (§O): a react-hook-form context bridge with
 * accessible label/description/error wiring. Every admin form composes
 * these primitives rather than hand-rolling label/error markup per field.
 */
export function Form<TValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: {
  form: UseFormReturn<TValues>;
  /** The already-built react-hook-form submit handler, i.e.
      `form.handleSubmit((values) => ...)` — build it at the call site (as
      `useAdminForm` does) so validation runs before this component sees
      anything. */
  onSubmit: (event?: BaseSyntheticEvent) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(e) => {
          void onSubmit(e);
        }}
        className={className}
      >
        {children}
      </form>
    </FormProvider>
  );
}

export function FormRow({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)} {...props} />;
}

export function FormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {title ? (
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface FormFieldProps<TValues extends FieldValues> {
  name: FieldPath<TValues>;
  label?: string;
  description?: string;
  required?: boolean;
  control?: Control<TValues>;
  children: (field: { value: unknown; onChange: (value: unknown) => void; onBlur: () => void; name: string }) => ReactNode;
}

export function FormField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  control,
  children,
}: FormFieldProps<TValues>) {
  const ctx = useFormContext<TValues>();
  const resolvedControl = control ?? ctx.control;
  const error = ctx.formState.errors[name as keyof typeof ctx.formState.errors];
  const message = typeof error?.message === 'string' ? error.message : undefined;

  return (
    <Controller
      name={name}
      control={resolvedControl}
      render={({ field }) => (
        <div>
          {label ? (
            <Label htmlFor={name}>
              {label}
              {required ? <span className="text-clay"> *</span> : null}
            </Label>
          ) : null}
          {children({ ...field, name })}
          {description && !message ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
          {message ? (
            <p role="alert" className="mt-1 text-xs font-medium text-clay-dark">
              {message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-2 border-t border-border pt-4">{children}</div>;
}
