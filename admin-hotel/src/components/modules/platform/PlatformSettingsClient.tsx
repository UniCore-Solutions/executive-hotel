'use client';

import { useQuery } from '@apollo/client/react';
import { AdminPlatformSettingsDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PlatformBrandForm } from './PlatformBrandForm';
import { PlatformContactForm } from './PlatformContactForm';
import { PlatformGallery } from './PlatformGallery';

// Same fallback convention as frontend-hotel's `services/platform.ts`
// (`PLATFORM_SLUG`): a single-tenant deployment has exactly one platform
// row, seeded once, so its slug is effectively fixed config rather than
// something the admin ever picks from a list.
const PLATFORM_SLUG = process.env.NEXT_PUBLIC_PLATFORM_SLUG ?? 'executive-hotel';

export function PlatformSettingsClient() {
  const { data, loading, error, refetch } = useQuery(AdminPlatformSettingsDocument, {
    variables: { slug: PLATFORM_SLUG },
  });

  const platform = data?.platform;
  const onSaved = () => void refetch();

  return (
    <>
      <PageHeader
        title="Platform Settings"
        description="Brand identity, contact details, and media shown across the guest site — platform-wide, not hotel-scoped."
        actions={platform ? <StatusBadge domain="catalog" value={platform.status} /> : undefined}
      />

      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !platform ? (
        <ErrorState error={new Error('Platform not found.')} />
      ) : (
        <Tabs defaultValue="brand">
          <TabsList>
            <TabsTrigger value="brand">Brand</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="media">Media ({platform.media.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="brand">
            <Card className="max-w-2xl">
              <PlatformBrandForm platform={platform} onSaved={onSaved} />
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card className="max-w-2xl">
              <PlatformContactForm platform={platform} onSaved={onSaved} />
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card>
              <PlatformGallery platformId={platform.id} media={platform.media} onChanged={onSaved} />
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
