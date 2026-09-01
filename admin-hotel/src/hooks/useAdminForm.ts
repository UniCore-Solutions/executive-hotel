'use client';

import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { z } from 'zod';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';

/**
 * The one form-submission pattern (§O): validates with the given Zod
 * schema, runs the write through TanStack Query's mutation lifecycle,
 * evicts the affected Apollo queries (`invalidation.ts`) on success, and
 * always ends in a toast so a save is never silent. The backend's
 * `ApiError.code` is a taxonomy code (VALIDATION, CONFLICT…), not a field
 * name, so a server error surfaces as a toast rather than a fabricated
 * per-field mapping.
 */
export function useAdminForm<TSchema extends z.ZodType<FieldValues>>({
  schema,
  defaultValues,
  mutationFn,
  invalidates,
  successMessage,
  onSuccess,
}: {
  schema: TSchema;
  defaultValues: DefaultValues<z.infer<TSchema>>;
  mutationFn: (values: z.infer<TSchema>) => Promise<unknown>;
  invalidates?: string;
  successMessage: string;
  onSuccess?: (result: unknown) => void;
}) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const apollo = useApollo();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (invalidates) invalidateGraphql(apollo, invalidates);
      toast({ title: successMessage, variant: 'success' });
      onSuccess?.(result);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      toast({ title: 'Could not save', description: message, variant: 'error' });
    },
  });

  return {
    form,
    submit: form.handleSubmit((values) => mutation.mutate(values)),
    isSubmitting: mutation.isPending,
  };
}
