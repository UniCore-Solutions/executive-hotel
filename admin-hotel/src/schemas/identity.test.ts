import { describe, expect, it } from 'vitest';
import { assignRoleSchema, createUserSchema, isHotelScopedRole } from './identity';

describe('isHotelScopedRole', () => {
  it('treats the 6 staff roles as hotel-scoped', () => {
    for (const r of ['hotel_admin', 'revenue_manager', 'reservation_agent', 'reception_staff', 'content_manager', 'finance_staff']) {
      expect(isHotelScopedRole(r)).toBe(true);
    }
  });

  it('treats super_admin and guest as platform-level', () => {
    expect(isHotelScopedRole('super_admin')).toBe(false);
    expect(isHotelScopedRole('guest')).toBe(false);
  });
});

describe('createUserSchema', () => {
  const base = { email: 'staff@example.com', password: 'secret1' };

  it('accepts a hotel-scoped role with a hotelId', () => {
    expect(createUserSchema.safeParse({ ...base, roleName: 'hotel_admin', hotelId: 'h1' }).success).toBe(true);
  });

  it('rejects a hotel-scoped role missing a hotelId', () => {
    const result = createUserSchema.safeParse({ ...base, roleName: 'hotel_admin' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('hotelId'))).toBe(true);
    }
  });

  it('accepts a platform-level role with no hotelId', () => {
    expect(createUserSchema.safeParse({ ...base, roleName: 'super_admin' }).success).toBe(true);
  });

  it('rejects a platform-level role carrying a hotelId', () => {
    const result = createUserSchema.safeParse({ ...base, roleName: 'super_admin', hotelId: 'h1' });
    expect(result.success).toBe(false);
  });

  it('rejects a short password', () => {
    expect(createUserSchema.safeParse({ ...base, password: '123', roleName: 'super_admin' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(createUserSchema.safeParse({ ...base, email: 'nope', roleName: 'super_admin' }).success).toBe(false);
  });
});

describe('assignRoleSchema', () => {
  it('accepts a hotel-scoped role with a hotelId', () => {
    expect(assignRoleSchema.safeParse({ roleName: 'reception_staff', hotelId: 'h1' }).success).toBe(true);
  });

  it('rejects a hotel-scoped role missing a hotelId', () => {
    expect(assignRoleSchema.safeParse({ roleName: 'reception_staff' }).success).toBe(false);
  });

  it('accepts a platform-level role with no hotelId', () => {
    expect(assignRoleSchema.safeParse({ roleName: 'guest' }).success).toBe(true);
  });
});
