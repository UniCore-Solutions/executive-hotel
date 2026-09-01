'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Syncs a list view's page, page size, status filter and search term to URL
 * search params, so filtered/paged views are shareable and survive reload
 * (§O DataTable). Every admin list uses this same hook rather than local
 * `useState` — one pattern, not one per module.
 */
export function useTableState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '0') || 0;
  const pageSize = Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE;
  const search = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';

  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  const setSearch = useCallback((next: string) => setParams({ q: next, page: 0 }), [setParams]);
  const setStatus = useCallback((next: string) => setParams({ status: next, page: 0 }), [setParams]);

  return useMemo(
    () => ({ page, pageSize, search, status, setPage, setSearch, setStatus }),
    [page, pageSize, search, status, setPage, setSearch, setStatus],
  );
}
