import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument } from '@/graphql/generated/graphql';
import { isSuperAdmin } from '@/lib/roles';
import { HotelsListClient } from '@/components/modules/hotels/HotelsListClient';

/**
 * A `super_admin` (or a staff member granted more than one hotel) lands on
 * the global Hotels list below. A staff member with exactly one hotel skips
 * it entirely and goes straight into that hotel's workspace — per the
 * user's request, only the platform-wide role ever "sees the full
 * application"; everyone else has access to one hotel and starts there.
 * Layered on top of `(admin)/layout.tsx`'s staff check, not replacing it.
 */
export default async function HotelsPage() {
  const token = await getSessionToken();
  if (token) {
    const { me } = await serverRequest(MeDocument, {}, token);
    if (!isSuperAdmin(me.roles) && me.hotelIds.length === 1) {
      redirect(`/hotels/${me.hotelIds[0]}/dashboard`);
    }
  }

  return <HotelsListClient />;
}
