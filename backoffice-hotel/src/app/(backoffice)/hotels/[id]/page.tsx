'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import { AdminHotelWorkspaceDocument } from '@/graphql/generated/graphql';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page';
import { OverviewTab } from '@/components/hotels/overview-tab';
import { RoomTypesTab } from '@/components/hotels/room-types-tab';
import { RoomsTab } from '@/components/hotels/rooms-tab';
import { RatePlansTab } from '@/components/hotels/rate-plans-tab';
import { AvailabilityTab } from '@/components/hotels/availability-tab';

export default function HotelWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminHotel', id],
    queryFn: () => proxyRequest(AdminHotelWorkspaceDocument, { hotelId: id }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !data?.adminHotel) {
    return (
      <Card className="mx-auto mt-16 max-w-md items-center text-center">
        <CardContent>
          <p className="text-sm text-muted-foreground">Could not load this hotel.</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const workspace = data.adminHotel;

  return (
    <div>
      <PageHeader
        title={workspace.name}
        description={
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {workspace.hotel.city} · {workspace.hotel.countryCode} ·{' '}
            {workspace.hotel.defaultCurrency}
          </span>
        }
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="room-types">Room types</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="rate-plans">Rate plans & pricing</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab hotelId={id} />
        </TabsContent>
        <TabsContent value="room-types">
          <RoomTypesTab hotelId={id} />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomsTab hotelId={id} />
        </TabsContent>
        <TabsContent value="rate-plans">
          <RatePlansTab hotelId={id} />
        </TabsContent>
        <TabsContent value="availability">
          <AvailabilityTab hotelId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}