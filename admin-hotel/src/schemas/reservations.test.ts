import { describe, expect, it } from 'vitest';
import {
  CANCELLATION_REASONS,
  assignRoomSchema,
  cancelReservationSchema,
} from './reservations';

describe('cancelReservationSchema', () => {
  it('accepts a reason code with no note', () => {
    expect(cancelReservationSchema.safeParse({ reasonCode: 'guest_changed_plans' }).success).toBe(
      true
    );
  });

  it('rejects a missing reason code', () => {
    expect(cancelReservationSchema.safeParse({ reasonCode: '' }).success).toBe(false);
  });

  it('rejects a note over 500 characters', () => {
    expect(
      cancelReservationSchema.safeParse({
        reasonCode: 'property_issue',
        reasonNote: 'x'.repeat(501),
      }).success
    ).toBe(false);
  });
});

describe('assignRoomSchema', () => {
  it('accepts a chosen room id', () => {
    expect(assignRoomSchema.safeParse({ roomId: 'room-1' }).success).toBe(true);
  });

  it('rejects an empty room id', () => {
    expect(assignRoomSchema.safeParse({ roomId: '' }).success).toBe(false);
  });
});

describe('CANCELLATION_REASONS', () => {
  // Hardcoded because no GraphQL query exposes the backend's
  // cancellation_reasons table (6 active rows, verified live 2026-09-01).
  // If the backend list changes this constant has to be updated by hand —
  // this test at least keeps the constant itself well-formed.
  it('has one entry per known backend reason, each with a value and a label', () => {
    expect(CANCELLATION_REASONS).toHaveLength(6);
    for (const reason of CANCELLATION_REASONS) {
      expect(reason.value.length).toBeGreaterThan(0);
      expect(reason.label.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate values', () => {
    const values = CANCELLATION_REASONS.map((r) => r.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
