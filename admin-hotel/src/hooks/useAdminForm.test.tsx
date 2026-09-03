import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { z } from 'zod';
import { useAdminForm } from './useAdminForm';

const toast = vi.fn();
const invalidateGraphql = vi.fn();
const fakeApollo = { name: 'fake-apollo-client' };

vi.mock('@/api/apollo/provider', () => ({ useApollo: () => fakeApollo }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/api/invalidation', () => ({ invalidateGraphql: (...args: unknown[]) => invalidateGraphql(...args) }));

const schema = z.object({ name: z.string().min(2, 'Name is required') });

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  toast.mockClear();
  invalidateGraphql.mockClear();
});

describe('useAdminForm', () => {
  it('runs the mutation, invalidates the given queries, and toasts success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1' });
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () =>
        useAdminForm({
          schema,
          defaultValues: { name: 'Executive Hotel' },
          mutationFn,
          invalidates: 'adminHotels',
          successMessage: 'Hotel saved',
          onSuccess,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(mutationFn.mock.calls[0]?.[0]).toEqual({ name: 'Executive Hotel' });
    expect(invalidateGraphql).toHaveBeenCalledWith(fakeApollo, 'adminHotels');
    expect(toast).toHaveBeenCalledWith({ title: 'Hotel saved', variant: 'success' });
    expect(onSuccess).toHaveBeenCalledWith({ id: '1' });
  });

  it('never invalidates Apollo when no `invalidates` key is given', async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(
      () =>
        useAdminForm({
          schema,
          defaultValues: { name: 'Executive Hotel' },
          mutationFn,
          successMessage: 'Saved',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(invalidateGraphql).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ title: 'Saved', variant: 'success' });
  });

  it('blocks the mutation entirely when the form fails Zod validation', async () => {
    const mutationFn = vi.fn();
    const { result } = renderHook(
      () =>
        useAdminForm({
          schema,
          defaultValues: { name: 'A' }, // fails min(2)
          mutationFn,
          successMessage: 'Saved',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(mutationFn).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('toasts the server error message on a rejected mutation, without invalidating', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Rate plan not found'));
    const { result } = renderHook(
      () =>
        useAdminForm({
          schema,
          defaultValues: { name: 'Executive Hotel' },
          mutationFn,
          invalidates: 'adminHotels',
          successMessage: 'Saved',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(toast).toHaveBeenCalledWith({
      title: 'Could not save',
      description: 'Rate plan not found',
      variant: 'error',
    });
    expect(invalidateGraphql).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the mutation rejects with a non-Error value', async () => {
    const mutationFn = vi.fn().mockRejectedValue('boom');
    const { result } = renderHook(
      () =>
        useAdminForm({
          schema,
          defaultValues: { name: 'Executive Hotel' },
          mutationFn,
          successMessage: 'Saved',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(toast).toHaveBeenCalledWith({
      title: 'Could not save',
      description: 'Something went wrong.',
      variant: 'error',
    });
  });

  it('reflects isSubmitting while the mutation is in flight', async () => {
    let resolveMutation!: () => void;
    const mutationFn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve;
        })
    );
    const { result } = renderHook(
      () =>
        useAdminForm({
          schema,
          defaultValues: { name: 'Executive Hotel' },
          mutationFn,
          successMessage: 'Saved',
        }),
      { wrapper }
    );

    expect(result.current.isSubmitting).toBe(false);

    act(() => {
      void result.current.submit();
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    await act(async () => {
      resolveMutation();
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });
});
