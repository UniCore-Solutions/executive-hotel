import {
  BadgePercent,
  BedDouble,
  Building2,
  CalendarClock,
  CalendarRange,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Palette,
  Receipt,
  ScrollText,
  Settings,
  Tag,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
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

/** Exported so other role-filtered UI (e.g. the dashboard's section
    visibility) can reuse the exact same "declare roles?, missing = everyone,
    super_admin = everyone" rule instead of re-implementing it. */
export function visibleTo(item: { roles?: string[] }, roles: string[]): boolean {
  if (!item.roles || roles.includes(SUPER_ADMIN)) return true;
  return item.roles.some((r) => roles.includes(r));
}

/** Platform-level navigation — outside any hotel. Add a group/item here as
    each global module ships (Users & Roles, Audit); a link only appears
    once its page exists, so the nav never points at a 404. */
export const GLOBAL_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { href: '/hotels', label: 'Hotels', icon: Building2 },
      // Brand identity is platform-wide (write side gated to super_admin —
      // AdminPlatformRestController), not hotel-scoped, so this stays
      // super_admin-only same as the write it fronts. UX-only gate, same
      // caveat as every other `roles` entry in this file.
      { href: '/platform/settings', label: 'Platform Settings', icon: Palette, roles: [SUPER_ADMIN] },
      // Every method on IdentityAdminService calls
      // CurrentUserAccessor.requireSuperAdmin() internally (adminUsers,
      // adminRoles, createUser, assignRole, revokeRole alike) — this is the
      // one nav gate in this file backed by a real backend check on every
      // path it fronts, not just a plausibility guess like the hotel-nav
      // `roles` entries below.
      { href: '/users', label: 'Users & Roles', icon: UsersRound, roles: [SUPER_ADMIN] },
      // `adminAuditLogs` has no `hotelId` argument — it's a platform-wide
      // read, backend-gated to `requireSuperAdmin()` inside
      // `AuditServiceImpl.auditLogs` (confirmed live: a `hotel_admin`
      // login gets a real FORBIDDEN, not a partial result). This nav gate
      // matches that real boundary rather than just following the usual
      // UX-only convention.
      { href: '/audit', label: 'Audit Log', icon: ScrollText, roles: [SUPER_ADMIN] },
    ],
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
      items: [
        { href: `${base}/reservations`, label: 'Reservations', icon: CalendarRange },
        {
          href: `${base}/guests`,
          label: 'Guests',
          icon: Users,
          roles: ['hotel_admin', 'reservation_agent', 'reception_staff'],
        },
        {
          href: `${base}/payments`,
          label: 'Payments',
          icon: Receipt,
          roles: ['hotel_admin', 'finance_staff'],
        },
        {
          href: `${base}/invoices`,
          label: 'Invoices',
          icon: FileText,
          // Same audience as Payments — invoice/credit-note PDFs are a
          // finance-adjacent, read-only concern.
          roles: ['hotel_admin', 'finance_staff'],
        },
      ],
    },
    {
      label: 'Inventory',
      items: [
        {
          href: `${base}/room-types`,
          label: 'Room Types',
          icon: BedDouble,
          roles: ['hotel_admin', 'revenue_manager', 'content_manager', 'reception_staff'],
        },
        {
          href: `${base}/availability`,
          label: 'Availability',
          icon: CalendarClock,
          // Blocking dates and marking units out of order is a revenue/ops
          // call, not a content one — deliberately excludes content_manager,
          // unlike Room Types/Rooms above. Same judgement-call caveat as the
          // rest of this file (see NavItem.roles doc): no backend permission
          // data behind this, only a plausibility guess.
          roles: ['hotel_admin', 'revenue_manager', 'reception_staff'],
        },
      ],
    },
    {
      label: 'Rates',
      items: [
        {
          href: `${base}/rate-plans`,
          label: 'Rate Plans',
          icon: Tag,
          roles: ['hotel_admin', 'revenue_manager'],
        },
        {
          href: `${base}/promotions`,
          label: 'Promotions',
          icon: BadgePercent,
          // Same revenue-side judgement call as Rate Plans just above — a
          // promo code discounts pricing, so it's a pricing/revenue
          // decision, not ops or content. UX-only gate, same caveat as the
          // rest of this file (see NavItem.roles doc).
          roles: ['hotel_admin', 'revenue_manager'],
        },
      ],
    },
    {
      label: 'Configuration',
      items: [
        {
          href: `${base}/settings`,
          label: 'Settings',
          icon: Settings,
          roles: ['hotel_admin', 'content_manager'],
        },
        {
          href: `${base}/reviews`,
          label: 'Reviews',
          icon: MessageSquareText,
          // Review moderation decides what appears on the hotel's public
          // page — the same "guest-facing content" plausibility bucket as
          // Settings above, not a front-desk/finance/revenue task. Same
          // UX-only judgement-call caveat as every other `roles` entry in
          // this file (see NavItem.roles doc) — a direct URL still goes
          // through the real `requireHotelAccess` check in
          // ReviewService#adminReviews/#moderate, unchanged.
          roles: ['hotel_admin', 'content_manager'],
        },
      ],
    },
  ];

  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => visibleTo(item, roles)) }))
    .filter((group) => group.items.length > 0);
}
