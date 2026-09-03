import { describe, expect, it } from 'vitest';
import { SUPER_ADMIN } from '@/lib/roles';
import { GLOBAL_NAV_GROUPS, hotelNavGroups, visibleTo } from './nav-items';

describe('visibleTo', () => {
  it('is visible to everyone when the item declares no roles', () => {
    expect(visibleTo({}, ['reception_staff'])).toBe(true);
    expect(visibleTo({}, [])).toBe(true);
  });

  it('is visible to super_admin regardless of the item roles list', () => {
    expect(visibleTo({ roles: ['finance_staff'] }, [SUPER_ADMIN])).toBe(true);
  });

  it('is visible when the user holds at least one of the declared roles', () => {
    expect(visibleTo({ roles: ['hotel_admin', 'finance_staff'] }, ['finance_staff'])).toBe(true);
  });

  it('is hidden when the user holds none of the declared roles', () => {
    expect(visibleTo({ roles: ['finance_staff'] }, ['reception_staff'])).toBe(false);
  });

  it('is hidden for a user with no roles at all when the item is gated', () => {
    expect(visibleTo({ roles: ['hotel_admin'] }, [])).toBe(false);
  });
});

describe('GLOBAL_NAV_GROUPS', () => {
  it('gates Platform Settings to super_admin but leaves Hotels open to any staff', () => {
    const platform = GLOBAL_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === 'Platform Settings');
    const hotels = GLOBAL_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === 'Hotels');
    expect(platform?.roles).toEqual([SUPER_ADMIN]);
    expect(hotels?.roles).toBeUndefined();
  });
});

describe('hotelNavGroups', () => {
  it('prefixes every item href with the given hotel id', () => {
    const groups = hotelNavGroups('h1', [SUPER_ADMIN]);
    for (const item of groups.flatMap((g) => g.items)) {
      expect(item.href.startsWith('/hotels/h1/')).toBe(true);
    }
  });

  it('shows every group and item to a super_admin', () => {
    const groups = hotelNavGroups('h1', [SUPER_ADMIN]);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual([
      'Dashboard',
      'Reservations',
      'Guests',
      'Payments',
      'Room Types',
      'Availability',
      'Rate Plans',
      'Settings',
    ]);
  });

  it('narrows reception_staff to what the role list actually grants', () => {
    const groups = hotelNavGroups('h1', ['reception_staff']);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    // Dashboard/Reservations have no roles gate, so always visible; Guests,
    // Room Types and Availability include reception_staff; Payments, Rate
    // Plans and Settings do not.
    expect(labels).toEqual(['Dashboard', 'Reservations', 'Guests', 'Room Types', 'Availability']);
  });

  it('excludes content_manager from Availability but includes it in Room Types (deliberate asymmetry)', () => {
    const groups = hotelNavGroups('h1', ['content_manager']);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toContain('Room Types');
    expect(labels).not.toContain('Availability');
  });

  it('drops an entire group when every item in it is filtered out', () => {
    // finance_staff sees only Dashboard, Reservations and Payments — every
    // Inventory/Rates/Configuration item is gated away, so those groups
    // must not appear at all (not appear empty).
    const groups = hotelNavGroups('h1', ['finance_staff']);
    expect(groups.map((g) => g.label)).toEqual(['Overview', 'Operations']);
  });

  it('shows nothing beyond the ungated items for a role with no matches', () => {
    const groups = hotelNavGroups('h1', ['some_future_role']);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(['Dashboard', 'Reservations']);
  });
});
