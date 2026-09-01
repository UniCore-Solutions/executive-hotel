import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getExtras = vi.fn();
const ensurePricingSources = vi.fn();
vi.mock('@/services/extras', () => ({
  getExtras: (...args: unknown[]) => getExtras(...args),
}));
vi.mock('@/services/pricingHydration', () => ({
  ensurePricingSources: (...args: unknown[]) => ensurePricingSources(...args),
}));

const { useExtrasSelection } = await import('@/hooks/useExtrasSelection');

describe('useExtrasSelection', () => {
  it('parses the initial extras param into the selection', () => {
    getExtras.mockResolvedValue([]);
    const { result } = renderHook(() => useExtrasSelection('hotel-1', 'airport-shuttle:2,late-checkout:1'));
    expect(result.current.extrasSel).toEqual([
      { id: 'airport-shuttle', qty: 2 },
      { id: 'late-checkout', qty: 1 },
    ]);
  });

  it('loads the hotel extras catalog and hydrates pricing sources once hotelId is known', async () => {
    const catalog = [{ id: 'airport-shuttle', name: 'Airport shuttle', desc: '', price: 250, unit: 'per stay' as const, icon: 'car' }];
    getExtras.mockResolvedValue(catalog);

    const { result } = renderHook(() => useExtrasSelection('hotel-1', ''));

    await waitFor(() => expect(result.current.extrasList).toEqual(catalog));
    expect(getExtras).toHaveBeenCalledWith('hotel-1');
    expect(ensurePricingSources).toHaveBeenCalled();
  });

  it('does not fetch extras when hotelId is undefined', () => {
    getExtras.mockClear();
    renderHook(() => useExtrasSelection(undefined, ''));
    expect(getExtras).not.toHaveBeenCalled();
  });

  it('setExtrasSel updates the selection', () => {
    getExtras.mockResolvedValue([]);
    const { result } = renderHook(() => useExtrasSelection('hotel-1', ''));
    act(() => {
      result.current.setExtrasSel([{ id: 'baby-cot', qty: 1 }]);
    });
    expect(result.current.extrasSel).toEqual([{ id: 'baby-cot', qty: 1 }]);
  });
});
