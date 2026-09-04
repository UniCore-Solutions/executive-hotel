import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument } from '@/graphql/generated/graphql';
import { isSuperAdmin } from '@/lib/roles';
import { UsersListClient } from '@/components/modules/users/UsersListClient';

/**
 * Global (not hotel-scoped) route, same guard shape as
 * `platform/settings/page.tsx`: the nav hides this link from anyone but
 * `super_admin` (`nav-items.ts`), but that's a UX affordance only, so a
 * direct link still needs its own check here. The real security boundary is
 * the backend — every method on `IdentityAdminService` calls
 * `CurrentUserAccessor.requireSuperAdmin()` internally (`adminUsers`,
 * `adminRoles`, and all three REST writes alike) — confirmed by reading
 * `IdentityAdminServiceImpl` source, not inferred from the schema. This
 * redirect just avoids rendering a page that would 403 on every query.
 */
export default async function UsersPage() {
  const token = await getSessionToken();
  if (token) {
    const { me } = await serverRequest(MeDocument, {}, token);
    if (!isSuperAdmin(me.roles)) {
      redirect('/hotels');
    }
  }

  return <UsersListClient />;
}
