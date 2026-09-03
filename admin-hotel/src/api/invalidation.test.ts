import { describe, expect, it, vi } from 'vitest';
import type { ApolloClient } from '@apollo/client';
import { REST_INVALIDATIONS, invalidateGraphql } from './invalidation';

function fakeApollo() {
  const evict = vi.fn();
  const gc = vi.fn();
  const apollo = { cache: { evict, gc } } as unknown as ApolloClient;
  return { apollo, evict, gc };
}

describe('REST_INVALIDATIONS', () => {
  // Regression lock for a real bug: this registry previously used PascalCase
  // keys (`AdminHotel`, `AdminRoomTypes`, …) that don't match any actual
  // GraphQL field name, so every `cache.evict` call was a silent no-op.
  // `cache.evict({ fieldName })` matches the normalized ROOT_QUERY key
  // case-sensitively, and real schema fields are camelCase.
  it('registers only camelCase GraphQL field names, never PascalCase', () => {
    const allFieldNames = Object.values(REST_INVALIDATIONS).flat();
    expect(allFieldNames.length).toBeGreaterThan(0);
    for (const name of allFieldNames) {
      expect(name[0]).toBe(name[0]?.toLowerCase());
    }
  });
});

describe('invalidateGraphql', () => {
  it('evicts every registered field for a known operation key, then garbage-collects once', () => {
    const { apollo, evict, gc } = fakeApollo();
    invalidateGraphql(apollo, 'reservations.cancel');
    expect(evict).toHaveBeenCalledWith({ fieldName: 'adminReservations' });
    expect(evict).toHaveBeenCalledWith({ fieldName: 'adminDashboard' });
    expect(evict).toHaveBeenCalledTimes(2);
    expect(gc).toHaveBeenCalledTimes(1);
  });

  it('still garbage-collects for an unregistered operation key, evicting nothing', () => {
    const { apollo, evict, gc } = fakeApollo();
    invalidateGraphql(apollo, 'some.unregistered.mutation');
    expect(evict).not.toHaveBeenCalled();
    expect(gc).toHaveBeenCalledTimes(1);
  });
});
