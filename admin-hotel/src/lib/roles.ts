/**
 * Mirrors `CurrentUserAccessor.STAFF_ROLES` (ADR-012 taxonomy) on the
 * backend. The backend's per-hotel authorization check (`requireHotelAccess`)
 * doesn't care which of these a user holds — any of them, plus a matching
 * `hotelId`, is enough. Nothing here is a real security boundary: the
 * backend service layer is (CLAUDE.md, and this file's `docs` link).
 * What this module gives the UI:
 *   1. A real gate — is this account staff at all, or a guest that
 *      shouldn't be inside the admin shell in the first place.
 *   2. A UX-only convenience — which modules a given role would plausibly
 *      want to see, so a reception agent isn't staring at a "Rate plans"
 *      link that's not their job. Hiding a link here never substitutes for
 *      the backend check; a direct URL still goes through the real guard.
 */
export const SUPER_ADMIN = 'super_admin';

export const STAFF_ROLES = [
  'hotel_admin',
  'revenue_manager',
  'reservation_agent',
  'reception_staff',
  'content_manager',
  'finance_staff',
] as const;

export function isStaff(roles: string[]): boolean {
  return roles.includes(SUPER_ADMIN) || roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
}

export function isSuperAdmin(roles: string[]): boolean {
  return roles.includes(SUPER_ADMIN);
}
