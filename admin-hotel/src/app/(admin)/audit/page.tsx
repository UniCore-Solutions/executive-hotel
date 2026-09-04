import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument } from '@/graphql/generated/graphql';
import { isSuperAdmin } from '@/lib/roles';
import { AuditLogClient } from '@/components/modules/audit/AuditLogClient';

/**
 * Global (not hotel-scoped) route, same server-side guard shape as
 * `platform/settings/page.tsx`: the nav hides this link from anyone but
 * `super_admin` (`nav-items.ts`), which is a UX affordance only, so a
 * direct link still needs its own check here. The real security boundary
 * is the backend — `adminAuditLogs` calls `CurrentUserAccessor
 * .requireSuperAdmin()` inside `AuditServiceImpl.auditLogs` (confirmed by
 * reading the resolver → service, and live: a `hotel_admin` login gets a
 * real backend `FORBIDDEN`/"super_admin role required" on this query, not
 * a partial or hotel-scoped result). This check just avoids showing a
 * table that would 403 on load.
 */
export default async function AuditLogPage() {
  const token = await getSessionToken();
  if (token) {
    const { me } = await serverRequest(MeDocument, {}, token);
    if (!isSuperAdmin(me.roles)) {
      redirect('/hotels');
    }
  }

  return <AuditLogClient />;
}
