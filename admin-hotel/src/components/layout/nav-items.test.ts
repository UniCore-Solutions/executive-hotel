import { describe, expect, it } from 'vitest';
import { SUPER_ADMIN } from '@/lib/roles';
import { GLOBAL_NAV_GROUPS, visibleGlobalNavGroups, hotelNavGroups, visibleTo } from './nav-items';

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

  it('gates Users & Roles to super_admin, matching every method on IdentityAdminService', () => {
    const users = GLOBAL_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === 'Users & Roles');
    expect(users?.roles).toEqual([SUPER_ADMIN]);
    expect(visibleTo(users!, ['reception_staff'])).toBe(false);
    expect(visibleTo(users!, [SUPER_ADMIN])).toBe(true);
  });
});

describe('visibleGlobalNavGroups', () => {
  it('shows everything to a super_admin', () => {
    const labels = visibleGlobalNavGroups([SUPER_ADMIN]).flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(['Hotels', 'Platform Settings', 'Users & Roles', 'Audit Log']);
  });

  it('hides every super_admin-gated item from a hotel_admin, keeping only Hotels', () => {
    // Regression coverage: Sidebar/Topbar/MobileNav used to render
    // GLOBAL_NAV_GROUPS directly, unfiltered — a hotel_admin (or any
    // non-super_admin staff) saw "Platform Settings"/"Users & Roles"/
    // "Audit Log" in the nav despite being declared super_admin-only, on
    // every global page (found live on /amenities, 2026-09-04).
    const labels = visibleGlobalNavGroups(['hotel_admin']).flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(['Hotels']);
  });

  it('still shows the ungated Hotels link to a role with no other matches', () => {
    // Hotels declares no `roles` gate, so it's unconditionally visible (see
    // visibleTo) — the "Platform" group is therefore never empty, whatever
    // the role list, unlike a fully-gated hotel-workspace group.
    const labels = visibleGlobalNavGroups(['guest']).flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(['Hotels']);
  });
});

describe('hotelNavGroups', () => {
  it('prefixes every item href with the given hotel id, except Amenities (a global resource)', () => {
    const groups = hotelNavGroups('h1', [SUPER_ADMIN]);
    for (const item of groups.flatMap((g) => g.items)) {
      if (item.label === 'Amenities') {
        expect(item.href).toBe('/amenities');
      } else {
        expect(item.href.startsWith('/hotels/h1/')).toBe(true);
      }
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
      'Invoices',
      'Room Types',
      'Availability',
      'Seasons',
      'Amenities',
      'Rate Plans',
      'Promotions',
      'Reviews',
      'Hotel Profile',
    ]);
  });

  it('shows Amenities to hotel_admin but not to other hotel-scoped roles', () => {
    const hotelAdminLabels = hotelNavGroups('h1', ['hotel_admin']).flatMap((g) => g.items.map((i) => i.label));
    expect(hotelAdminLabels).toContain('Amenities');

    const revenueManagerLabels = hotelNavGroups('h1', ['revenue_manager']).flatMap((g) =>
      g.items.map((i) => i.label),
    );
    expect(revenueManagerLabels).not.toContain('Amenities');
  });

  it('narrows reception_staff to what the role list actually grants', () => {
    const groups = hotelNavGroups('h1', ['reception_staff']);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    // Dashboard/Reservations have no roles gate, so always visible; Guests,
    // Room Types, Availability and Seasons include reception_staff; Payments,
    // Amenities, Rate Plans, Reviews and Hotel Profile do not.
    expect(labels).toEqual([
      'Dashboard',
      'Reservations',
      'Guests',
      'Room Types',
      'Availability',
      'Seasons',
    ]);
  });

  it('excludes content_manager from Availability but includes it in Room Types (deliberate asymmetry)', () => {
    const groups = hotelNavGroups('h1', ['content_manager']);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toContain('Room Types');
    expect(labels).not.toContain('Availability');
  });

  it('drops an entire group when every item in it is filtered out', () => {
    // finance_staff sees only Dashboard, Reservations and Payments — every
    // Inventory/Rates/Reviews/Settings item is gated away, so those groups
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
