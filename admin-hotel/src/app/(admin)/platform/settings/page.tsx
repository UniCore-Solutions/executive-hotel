import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument } from '@/graphql/generated/graphql';
import { isSuperAdmin } from '@/lib/roles';
import { PlatformSettingsClient } from '@/components/modules/platform/PlatformSettingsClient';

/**
 * Global (not hotel-scoped) route, mirroring `hotels/page.tsx`'s own
 * server-side guard: nav hides this link from anyone but `super_admin`
 * (`nav-items.ts`), but that's a UX affordance only, so a direct link
 * still needs its own check here — same layered-on-top-of-`(admin)/layout.tsx`
 * pattern. The real security boundary is still the backend
 * (`CurrentUserAccessor.requireSuperAdmin()` inside `PlatformAdminServiceImpl`),
 * this just avoids showing a form that would 403 on every save.
 */
export default async function PlatformSettingsPage() {
  const token = await getSessionToken();
  if (token) {
    const { me } = await serverRequest(MeDocument, {}, token);
    if (!isSuperAdmin(me.roles)) {
      redirect('/hotels');
    }
  }

  return <PlatformSettingsClient />;
}
