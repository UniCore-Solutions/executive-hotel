import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument } from '@/graphql/generated/graphql';
import { isHotelAdminOfAnyHotel } from '@/lib/roles';
import { AmenitiesListClient } from '@/components/modules/amenities/AmenitiesListClient';

/**
 * Global (not hotel-scoped) route — the amenity catalog isn't owned by any
 * one hotel, an addition from inside any hotel's context is immediately
 * usable by every other hotel too — but reached from within a hotel's
 * workspace nav (Inventory group, `nav-items.ts`), not the top-level
 * "Platform" section, since that's genuinely where staff go looking for it
 * (task-driven; see docs/ADMIN_REBUILD_PROGRESS.md).
 *
 * The nav hides this link from anyone who isn't `hotel_admin` (of at least
 * one hotel) or `super_admin`, but that's a UX affordance only, so a direct
 * link still needs its own check here. The real security boundary is the
 * backend — both `AmenityAdminService.createAmenity`/`updateAmenity` call
 * `CurrentUserAccessor.requireHotelAdminOrSuperAdmin()` internally (confirmed
 * by reading `AmenityAdminServiceImpl` source, not inferred). This redirect
 * just avoids rendering a management page whose writes would all 403.
 */
export default async function AmenitiesPage() {
  const token = await getSessionToken();
  if (token) {
    const { me } = await serverRequest(MeDocument, {}, token);
    if (!isHotelAdminOfAnyHotel(me.roles, me.hotelIds)) {
      redirect('/hotels');
    }
  }

  return <AmenitiesListClient />;
}
