import { describe, expect, it } from 'vitest';
import { roomSchema, roomTypeSchema } from './catalog';

describe('roomTypeSchema', () => {
  const base = {
    name: 'Deluxe Sea View',
    maxAdults: 2,
    maxChildren: 0,
    status: 'active' as const,
  };

  it('accepts the minimal valid shape (optional fields omitted)', () => {
    expect(roomTypeSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a one-character name', () => {
    expect(roomTypeSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('rejects zero adults', () => {
    expect(roomTypeSchema.safeParse({ ...base, maxAdults: 0 }).success).toBe(false);
  });

  it('rejects more than 20 adults', () => {
    expect(roomTypeSchema.safeParse({ ...base, maxAdults: 21 }).success).toBe(false);
  });

  it('rejects negative children', () => {
    expect(roomTypeSchema.safeParse({ ...base, maxChildren: -1 }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(roomTypeSchema.safeParse({ ...base, status: 'archived' }).success).toBe(false);
  });

  it('accepts every declared status', () => {
    for (const status of ['active', 'inactive', 'draft']) {
      expect(roomTypeSchema.safeParse({ ...base, status }).success).toBe(true);
    }
  });

  it('rejects a non-positive room size', () => {
    expect(roomTypeSchema.safeParse({ ...base, sizeSqm: 0 }).success).toBe(false);
  });
});

describe('roomSchema', () => {
  const base = {
    roomTypeId: 'rt-1',
    roomNumber: '204',
    status: 'active' as const,
    housekeepingStatus: 'clean' as const,
    maintenanceStatus: 'ok' as const,
  };

  it('accepts the minimal valid shape', () => {
    expect(roomSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a missing room type', () => {
    expect(roomSchema.safeParse({ ...base, roomTypeId: '' }).success).toBe(false);
  });

  it('rejects an empty room number', () => {
    expect(roomSchema.safeParse({ ...base, roomNumber: '' }).success).toBe(false);
  });

  it('rejects a room number over 20 characters', () => {
    expect(roomSchema.safeParse({ ...base, roomNumber: '1'.repeat(21) }).success).toBe(false);
  });

  it('rejects an unknown housekeeping status', () => {
    expect(roomSchema.safeParse({ ...base, housekeepingStatus: 'sparkling' }).success).toBe(false);
  });

  it('rejects an unknown maintenance status', () => {
    expect(roomSchema.safeParse({ ...base, maintenanceStatus: 'broken' }).success).toBe(false);
  });

  it('accepts every declared room status, including out_of_order (no draft, unlike room types)', () => {
    for (const status of ['active', 'inactive', 'out_of_order']) {
      expect(roomSchema.safeParse({ ...base, status }).success).toBe(true);
    }
    expect(roomSchema.safeParse({ ...base, status: 'draft' }).success).toBe(false);
  });
});
