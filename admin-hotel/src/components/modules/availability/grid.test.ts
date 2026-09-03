import { describe, expect, it } from 'vitest';
import { buildAvailabilityLookup } from './grid';

describe('buildAvailabilityLookup', () => {
  it('returns a fully-available default cell for a date with no row', () => {
    const cellFor = buildAvailabilityLookup([]);
    expect(cellFor('rt-1', 10, '2026-09-05')).toEqual({
      date: '2026-09-05',
      total: 10,
      roomsSold: 0,
      outOfOrder: 0,
      blocked: 0,
      free: 10,
      status: 'available',
    });
  });

  it('computes free as total minus sold, out-of-order and blocked', () => {
    const cellFor = buildAvailabilityLookup([
      { roomTypeId: 'rt-1', stayDate: '2026-09-05', roomsSold: 3, outOfOrder: 1, blocked: 2 },
    ]);
    const cell = cellFor('rt-1', 10, '2026-09-05');
    expect(cell.free).toBe(4);
    expect(cell.roomsSold).toBe(3);
    expect(cell.status).toBe('available');
  });

  it('keeps rows for different room types and dates independent', () => {
    const cellFor = buildAvailabilityLookup([
      { roomTypeId: 'rt-1', stayDate: '2026-09-05', roomsSold: 10, outOfOrder: 0, blocked: 0 },
      { roomTypeId: 'rt-2', stayDate: '2026-09-05', roomsSold: 0, outOfOrder: 0, blocked: 0 },
    ]);
    expect(cellFor('rt-1', 10, '2026-09-05').status).toBe('soldout');
    expect(cellFor('rt-2', 10, '2026-09-05').status).toBe('available');
    // A different date for rt-1 with no row falls back to the default.
    expect(cellFor('rt-1', 10, '2026-09-06').status).toBe('available');
  });

  it('flows the computed free count through the same status thresholds as computeDayStatus', () => {
    const cellFor = buildAvailabilityLookup([
      { roomTypeId: 'rt-1', stayDate: '2026-09-05', roomsSold: 9, outOfOrder: 0, blocked: 0 },
    ]);
    expect(cellFor('rt-1', 10, '2026-09-05').status).toBe('few');
  });
});
