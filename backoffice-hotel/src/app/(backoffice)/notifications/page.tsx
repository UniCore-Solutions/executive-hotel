'use client';

import { useQuery } from '@tanstack/react-query';
import { proxyRequest } from '@/lib/api';
import { formatDateTime, statusLabel } from '@/lib/format';
import { AdminNotificationsDocument } from '@/graphql/generated/graphql';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/admin/page';
import { useHotelScope } from '@/context/HotelScopeContext';

export default function NotificationsPage() {
  const { hotels, activeHotelId } = useHotelScope();

  const { data, isLoading } = useQuery({
    queryKey: ['adminNotifications', activeHotelId],
    queryFn: () =>
      proxyRequest(AdminNotificationsDocument, {
        hotelId: activeHotelId ?? '',
        page: { page: 0, size: 50 },
      }),
    enabled: !!activeHotelId,
  });

  if (hotels.length === 0) {
    return (
      <Card className="mx-auto mt-16 max-w-md items-center text-center">
        <CardContent>
          <p className="text-sm text-muted-foreground">You are not a member of any hotel.</p>
        </CardContent>
      </Card>
    );
  }

  const notifications = data?.adminNotifications.items ?? [];

  return (
    <div>
      <PageHeader title="Notifications" description="Messages sent for the selected hotel" />
      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="gap-2 py-4">
              <CardContent className="px-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{n.subject ?? n.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(n.channel)} · {statusLabel(n.type)} · to{' '}
                      {n.recipientType} #{n.recipientId}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={n.status === 'sent' ? 'available' : n.status === 'failed' ? 'soldout' : 'few'}>
                      {n.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                </div>
                {n.body ? <p className="mt-2 text-sm text-muted-foreground">{n.body}</p> : null}
                {n.attempts > 1 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Attempts: {n.attempts} · provider: {n.provider ?? '—'}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}