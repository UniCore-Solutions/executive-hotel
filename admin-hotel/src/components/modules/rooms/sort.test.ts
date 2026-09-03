import { describe, expect, it } from 'vitest';
import type { RoomRow } from './columns';
import { compareRooms } from './sort';

function room(overrides: Partial<RoomRow>): RoomRow {
  return {
    id: 'r1',
    roomNumber: '1',
    status: 'active',
    housekeepingStatus: 'clean',
    maintenanceStatus: 'ok',
    createdAt: '2026-01-01T00:00:00Z',
    roomTypeId: 'rt-1',
    roomTypeName: 'Deluxe',
    ...overrides,
  };
}

describe('compareRooms', () => {
  it('sorts room numbers numerically, not lexicographically ("9" before "10")', () => {
    const rooms = [room({ roomNumber: '10' }), room({ roomNumber: '9' }), room({ roomNumber: '2' })];
    const sorted = [...rooms].sort((a, b) => compareRooms(a, b, 'roomNumber'));
    expect(sorted.map((r) => r.roomNumber)).toEqual(['2', '9', '10']);
  });

  it('falls back to numeric room-number sort for an unrecognized field', () => {
    const rooms = [room({ roomNumber: '10' }), room({ roomNumber: '9' })];
    const sorted = [...rooms].sort((a, b) => compareRooms(a, b, 'unknown-field'));
    expect(sorted.map((r) => r.roomNumber)).toEqual(['9', '10']);
  });

  it('sorts by room type name', () => {
    const rooms = [room({ roomTypeName: 'Suite' }), room({ roomTypeName: 'Deluxe' })];
    const sorted = [...rooms].sort((a, b) => compareRooms(a, b, 'roomType'));
    expect(sorted.map((r) => r.roomTypeName)).toEqual(['Deluxe', 'Suite']);
  });

  it('sorts by status', () => {
    const rooms = [room({ status: 'out_of_order' }), room({ status: 'active' })];
    const sorted = [...rooms].sort((a, b) => compareRooms(a, b, 'status'));
    expect(sorted.map((r) => r.status)).toEqual(['active', 'out_of_order']);
  });

  it('sorts by createdAt', () => {
    const rooms = [
      room({ createdAt: '2026-03-01T00:00:00Z' }),
      room({ createdAt: '2026-01-01T00:00:00Z' }),
    ];
    const sorted = [...rooms].sort((a, b) => compareRooms(a, b, 'createdAt'));
    expect(sorted.map((r) => r.createdAt)).toEqual(['2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z']);
  });
});
