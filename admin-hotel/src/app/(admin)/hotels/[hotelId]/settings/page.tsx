'use client';

import { use, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelSettingsDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MEDIA_CATEGORY_LOGO } from '@/api/rest/endpoints/catalog';
import { HotelProfileForm } from '@/components/modules/settings/HotelProfileForm';
import { HotelBrandingPanel } from '@/components/modules/settings/HotelBrandingPanel';
import { HotelPoliciesForm } from '@/components/modules/settings/HotelPoliciesForm';
import { HotelAmenitiesForm } from '@/components/modules/settings/HotelAmenitiesForm';
import { HotelGallery } from '@/components/modules/settings/HotelGallery';

export default function HotelSettingsPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminHotelSettingsDocument, { variables: { hotelId } });

  const adminHotel = data?.adminHotel;
  const policies = adminHotel?.policies ?? [];
  // The Media tab/gallery excludes the logo (it has its own home on the
  // Branding tab) — the tab's count badge must match what the gallery
  // actually shows, not the raw row count.
  const galleryCount = adminHotel?.media.filter((m) => m.category !== MEDIA_CATEGORY_LOGO).length ?? 0;

  // Controlled tab state, lifted above the loading/error/content ternary
  // below, so the active tab survives a `refetch()` (see `onSaved` below).
  const [activeTab, setActiveTab] = useState('profile');

  // Passed to every tab's form/gallery instead of relying on
  // `invalidateGraphql`: this page's `adminHotel` and the workspace layout's
  // own `AdminHotelHeader` query both read the same `adminHotel` cache
  // field, so a cache.evict('adminHotel') briefly makes *both* queries
  // `loading` again — and the layout unmounts `{children}` (this whole
  // page, resetting `activeTab`) while its own query re-fetches. A plain
  // `refetch()` on this query alone updates `data` without flipping
  // `loading`, so it avoids that cascade. Found + verified live
  // (2026-09-01) while testing the Media tab's upload/delete actions.
  const onSaved = () => void refetch();

  return (
    <>
      <PageHeader
        title="Hotel Profile"
        description="Identity, branding, policies, amenities, and media shown on this hotel's guest-facing page."
        actions={adminHotel ? <StatusBadge domain="catalog" value={adminHotel.status} /> : undefined}
      />

      {loading && !data ? (
        // `!data` matters here: `refetch()` (via `onSaved`) also reports
        // `loading: true` while it's in flight. Gating on `loading` alone
        // would swap this whole tree out for the skeleton — and back — on
        // every save, flashing the content and (were `activeTab` not
        // lifted above this ternary) resetting the active tab. Once the
        // first load has completed, keep showing the last-known `data`
        // through a background refetch instead.
        <div className="space-y-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !adminHotel ? (
        <ErrorState error={new Error('Hotel not found.')} />
      ) : (
        // Keyed by hotelId: these tab forms take their defaultValues from
        // `adminHotel` at mount only (react-hook-form / useAdminForm reads
        // defaultValues once — see docs/ADMIN_REBUILD_PROGRESS.md's
        // RoomFormSheet finding). Without this key, navigating from one
        // hotel's Settings straight to another's would reuse the mounted
        // forms with the previous hotel's stale values. `value`/`onValueChange`
        // are controlled (see the `activeTab` comment above).
        <Tabs key={hotelId} value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
            <TabsTrigger value="amenities">Amenities ({adminHotel.amenities.length})</TabsTrigger>
            <TabsTrigger value="media">Media ({galleryCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="max-w-2xl">
              <HotelProfileForm hotel={adminHotel.hotel} onSaved={onSaved} />
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card className="max-w-2xl">
              <HotelBrandingPanel
                hotelId={hotelId}
                media={adminHotel.media}
                onChanged={onSaved}
                onViewMedia={() => setActiveTab('media')}
              />
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card className="max-w-2xl">
              <HotelPoliciesForm hotelId={hotelId} policies={policies} onSaved={onSaved} />
            </Card>
          </TabsContent>

          <TabsContent value="amenities">
            <Card className="max-w-2xl">
              <HotelAmenitiesForm
                hotelId={hotelId}
                currentAmenityIds={adminHotel.amenities.map((a) => a.id)}
                onSaved={onSaved}
              />
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card>
              <HotelGallery hotelId={hotelId} media={adminHotel.media} onChanged={onSaved} />
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
