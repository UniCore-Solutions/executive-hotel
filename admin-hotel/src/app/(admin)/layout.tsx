import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument, type MeQuery } from '@/graphql/generated/graphql';
import { isStaff } from '@/lib/roles';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

/**
 * Route protection lives here, server-side, exactly like the existing
 * back-office (§B): no cookie or a failing `me` call redirects before any
 * client code runs. Role-based nav filtering elsewhere is a UX affordance
 * only — the backend service layer is the actual security boundary
 * (investigation report §Q-1).
 *
 * This is the ONE shell shared by the global admin (/hotels, and future
 * platform-level pages) and every hotel's workspace
 * (/hotels/[hotelId]/...): Sidebar and Topbar switch their own nav and
 * branding based on the current route (see nav-items.ts), so there is no
 * separate "global layout" vs "workspace layout" duplicating this chrome.
 * Per-hotel resolution and access validation live one level down, in
 * hotels/[hotelId]/layout.tsx.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  let me: MeQuery['me'];
  try {
    me = (await serverRequest(MeDocument, {}, token)).me;
  } catch {
    redirect('/login');
  }
  // `me.roles.length === 0` used to be the only gate here, which let a
  // roles-but-not-staff account (e.g. a `guest`-only login, if one ever
  // reaches this endpoint) sit inside the admin shell hitting FORBIDDEN on
  // every query instead of being told plainly this isn't for them.
  if (!isStaff(me.roles)) redirect('/login?error=not_staff');

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
