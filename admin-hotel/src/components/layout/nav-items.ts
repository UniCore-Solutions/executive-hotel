import { BedDouble, Building2, CalendarRange, DoorOpen, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { SUPER_ADMIN } from '@/lib/roles';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that should see this link. Omitted = every staff role sees it;
      `super_admin` always sees everything regardless of this list. This is
      the same UX-only convention as the rest of this file — the backend
      doesn't gate any of these modules by role name today, only by hotel
      access, so getting this list wrong costs a confusing nav, not a
      security hole. Adjust freely as real per-role needs surface. */
  roles?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

function visibleTo(item: NavItem, roles: string[]): boolean {
  if (!item.roles || roles.includes(SUPER_ADMIN)) return true;
  return item.roles.some((r) => roles.includes(r));
}

/** Platform-level navigation — outside any hotel. Add a group/item here as
    each global module ships (Users & Roles, Audit); a link only appears
    once its page exists, so the nav never points at a 404. */
export const GLOBAL_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Platform',
    items: [{ href: '/hotels', label: 'Hotels', icon: Building2 }],
  },
];

/** Hotel-workspace navigation — everything scoped to the hotel whose id
    prefixes each href, filtered to what `roles` would plausibly use (see
    `NavItem.roles`). Same "ship it, then link it" rule as the global nav. */
export function hotelNavGroups(hotelId: string, roles: string[]): NavGroup[] {
  const base = `/hotels/${hotelId}`;
  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [{ href: `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Operations',
      items: [{ href: `${base}/reservations`, label: 'Reservations', icon: CalendarRange }],
    },
    {
      label: 'Inventory',
      items: [
        {
          href: `${base}/room-types`,
          label: 'Room Types',
          icon: BedDouble,
          roles: ['hotel_admin', 'revenue_manager', 'content_manager'],
        },
        {
          href: `${base}/rooms`,
          label: 'Rooms',
          icon: DoorOpen,
          roles: ['hotel_admin', 'revenue_manager', 'content_manager', 'reception_staff'],
        },
      ],
    },
  ];

  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => visibleTo(item, roles)) }))
    .filter((group) => group.items.length > 0);
}
