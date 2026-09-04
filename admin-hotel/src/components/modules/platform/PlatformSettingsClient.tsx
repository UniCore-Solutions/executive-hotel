'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { AdminPlatformSettingsDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MEDIA_CATEGORY_LOGO } from '@/api/rest/endpoints/catalog';
import { PlatformIdentityCard } from './PlatformIdentityCard';
import { PlatformBrandForm } from './PlatformBrandForm';
import { PlatformContactForm } from './PlatformContactForm';
import { PlatformGallery } from './PlatformGallery';

// Same fallback convention as frontend-hotel's `services/platform.ts`
// (`PLATFORM_SLUG`): a single-tenant deployment has exactly one platform
// row, seeded once, so its slug is effectively fixed config rather than
// something the admin ever picks from a list.
const PLATFORM_SLUG = process.env.NEXT_PUBLIC_PLATFORM_SLUG ?? 'executive-hotel';

/**
 * Redesigned around a persistent brand-identity preview (`PlatformIdentityCard`
 * — logo, name, tagline, status, currency, contact, all at a glance) instead
 * of a flat tab row with the logo buried in its own disconnected "Branding"
 * tab. The preview stays visible across every tab and updates live as each
 * form saves, so an admin always sees what the collection's identity
 * actually looks like while editing it.
 */
export function PlatformSettingsClient() {
  const { data, loading, error, refetch } = useQuery(AdminPlatformSettingsDocument, {
    variables: { slug: PLATFORM_SLUG },
  });

  const platform = data?.platform;
  const onSaved = () => void refetch();
  const [activeTab, setActiveTab] = useState('details');
  // The Media tab/gallery excludes the logo (it has its own home in the
  // identity card) — the tab's count badge must match what the gallery
  // actually shows, not the raw row count.
  const galleryCount = platform?.media.filter((m) => m.category !== MEDIA_CATEGORY_LOGO).length ?? 0;

  return (
    <>
      <PageHeader
        title="Platform Settings"
        description="The collection's brand identity, contact details, and media shown across the guest site — platform-wide, not scoped to any one hotel."
      />

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 w-full lg:col-span-1" />
          <Skeleton className="h-80 w-full lg:col-span-2" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !platform ? (
        <ErrorState error={new Error('Platform not found.')} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <PlatformIdentityCard platform={platform} media={platform.media} onChanged={onSaved} />
          </div>

          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="media">Media ({galleryCount})</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <Card>
                  <PlatformBrandForm platform={platform} onSaved={onSaved} />
                </Card>
              </TabsContent>

              <TabsContent value="contact">
                <Card>
                  <PlatformContactForm platform={platform} onSaved={onSaved} />
                </Card>
              </TabsContent>

              <TabsContent value="media">
                <Card>
                  <PlatformGallery platformId={platform.id} media={platform.media} onChanged={onSaved} />
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </>
  );
}
