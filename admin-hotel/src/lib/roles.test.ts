import { describe, expect, it } from 'vitest';
import { isStaff, isSuperAdmin, isHotelAdminOfAnyHotel, SUPER_ADMIN, STAFF_ROLES } from './roles';

describe('isStaff', () => {
  it('is true for a super_admin', () => {
    expect(isStaff([SUPER_ADMIN])).toBe(true);
  });

  it('is true for any one recognized staff role', () => {
    for (const role of STAFF_ROLES) {
      expect(isStaff([role])).toBe(true);
    }
  });

  it('is false for a guest with no staff role', () => {
    expect(isStaff(['guest'])).toBe(false);
  });

  it('is false for an empty role list', () => {
    expect(isStaff([])).toBe(false);
  });

  it('is true when a staff role is mixed in among unrecognized ones', () => {
    expect(isStaff(['some_future_role', 'reception_staff'])).toBe(true);
  });
});

describe('isSuperAdmin', () => {
  it('is true only when super_admin is present', () => {
    expect(isSuperAdmin([SUPER_ADMIN])).toBe(true);
  });

  it('is false for a regular staff role, even hotel_admin', () => {
    expect(isSuperAdmin(['hotel_admin'])).toBe(false);
  });

  it('is false for an empty role list', () => {
    expect(isSuperAdmin([])).toBe(false);
  });
});

describe('isHotelAdminOfAnyHotel', () => {
  it('is true for super_admin regardless of hotelIds', () => {
    expect(isHotelAdminOfAnyHotel([SUPER_ADMIN], [])).toBe(true);
  });

  it('is true for hotel_admin with at least one hotel', () => {
    expect(isHotelAdminOfAnyHotel(['hotel_admin'], ['h1'])).toBe(true);
  });

  it('is false for hotel_admin with no hotel membership', () => {
    expect(isHotelAdminOfAnyHotel(['hotel_admin'], [])).toBe(false);
  });

  it('is false for a different staff role, even with hotels', () => {
    expect(isHotelAdminOfAnyHotel(['reception_staff'], ['h1'])).toBe(false);
  });
});
