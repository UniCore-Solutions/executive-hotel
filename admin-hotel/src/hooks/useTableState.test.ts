import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTableState } from './useTableState';

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/hotels/h1/reservations',
  useSearchParams: () => searchParams,
}));

function paramsFromLastCall(): URLSearchParams {
  const url = replace.mock.calls.at(-1)?.[0] as string;
  return new URLSearchParams(url.split('?')[1] ?? '');
}

beforeEach(() => {
  replace.mockClear();
  searchParams = new URLSearchParams();
});

describe('useTableState — reading from the URL', () => {
  it('defaults page to 0, size to 20, and search/status/sort to empty', () => {
    const { result } = renderHook(() => useTableState());
    expect(result.current.page).toBe(0);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.search).toBe('');
    expect(result.current.status).toBe('');
    expect(result.current.sort).toBe('');
  });

  it('reads page, size, q, status and sort from existing URL params', () => {
    searchParams = new URLSearchParams('page=2&size=50&q=ines&status=confirmed&sort=NAME_ASC');
    const { result } = renderHook(() => useTableState());
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(50);
    expect(result.current.search).toBe('ines');
    expect(result.current.status).toBe('confirmed');
    expect(result.current.sort).toBe('NAME_ASC');
  });

  it('falls back to defaults for a non-numeric page or size', () => {
    searchParams = new URLSearchParams('page=abc&size=xyz');
    const { result } = renderHook(() => useTableState());
    expect(result.current.page).toBe(0);
    expect(result.current.pageSize).toBe(20);
  });
});

describe('useTableState — writing to the URL', () => {
  it('setPage writes the new page and preserves other params', () => {
    searchParams = new URLSearchParams('q=ines');
    const { result } = renderHook(() => useTableState());
    act(() => result.current.setPage(3));
    const params = paramsFromLastCall();
    expect(params.get('page')).toBe('3');
    expect(params.get('q')).toBe('ines');
    expect(replace.mock.calls[0]?.[1]).toEqual({ scroll: false });
  });

  it('setSearch resets the page to 0 alongside the new query', () => {
    searchParams = new URLSearchParams('page=4');
    const { result } = renderHook(() => useTableState());
    act(() => result.current.setSearch('ines'));
    const params = paramsFromLastCall();
    expect(params.get('q')).toBe('ines');
    expect(params.get('page')).toBe('0');
  });

  it('setStatus resets the page to 0 alongside the new status', () => {
    searchParams = new URLSearchParams('page=2&status=confirmed');
    const { result } = renderHook(() => useTableState());
    act(() => result.current.setStatus('cancelled'));
    const params = paramsFromLastCall();
    expect(params.get('status')).toBe('cancelled');
    expect(params.get('page')).toBe('0');
  });

  it('setSort resets the page to 0 alongside the new sort', () => {
    searchParams = new URLSearchParams('page=2');
    const { result } = renderHook(() => useTableState());
    act(() => result.current.setSort('PRICE_ASC'));
    const params = paramsFromLastCall();
    expect(params.get('sort')).toBe('PRICE_ASC');
    expect(params.get('page')).toBe('0');
  });

  it('setStatus with an empty string clears the filter from the URL rather than writing status=', () => {
    searchParams = new URLSearchParams('status=confirmed');
    const { result } = renderHook(() => useTableState());
    act(() => result.current.setStatus(''));
    const params = paramsFromLastCall();
    expect(params.has('status')).toBe(false);
  });
});
