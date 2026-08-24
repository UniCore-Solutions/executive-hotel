'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Star } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import { statusLabel } from '@/lib/format';
import { AdminHotelsDocument } from '@/graphql/generated/graphql';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, PageHeader } from '@/components/admin/page';
import { useSession } from '@/context/SessionContext';

export default function HotelsPage() {
  const { me } = useSession();
  const isSuperAdmin = me?.roles.includes('super_admin') ?? false;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminHotels'],
    queryFn: () => proxyRequest(AdminHotelsDocument, { page: { page: 0, size: 100 } }),
  });

  return (
    <div>
      <PageHeader
        title="Hotels"
        description="All hotels in your portfolio"
        actions={
          isSuperAdmin ? (
            <Button asChild>
              <Link href="/hotels/new">
                <Plus className="mr-1" aria-hidden="true" /> New hotel
              </Link>
            </Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Could not load hotels.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.adminHotels.items.map((hotel) => (
            <Link key={hotel.id} href={`/hotels/${hotel.id}`} className="group">
              <Card className="h-full gap-3 transition-shadow group-hover:shadow-md">
                <CardContent className="px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-semibold text-navy group-hover:text-gold-dark">
                        {hotel.name}
                      </h2>
                      {hotel.brand ? (
                        <p className="text-sm text-muted-foreground">{hotel.brand}</p>
                      ) : null}
                    </div>
                    <StatusBadge status={hotel.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    {hotel.city ? <span>{hotel.city}</span> : null}
                    {hotel.countryCode ? <span>{hotel.countryCode}</span> : null}
                    {hotel.starRating ? (
                      <span className="flex items-center gap-1 text-gold-dark">
                        <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        {hotel.starRating}
                      </span>
                    ) : null}
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Room types</dt>
                      <dd className="font-semibold text-navy">{hotel.roomTypeCount}</dd>
                    </div>
                    <div className="rounded-lg bg-muted px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Active reservations</dt>
                      <dd className="font-semibold text-navy">{hotel.activeReservations}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <Badge variant="outline">{statusLabel(hotel.status)}</Badge>
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}