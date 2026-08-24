'use client';

import { useQuery } from '@tanstack/react-query';
import { BedDouble, CalendarCheck, CalendarX, CircleDollarSign, DoorOpen, Receipt, Timer } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { useHotelScope } from '@/context/HotelScopeContext';
import { AdminDashboardDocument } from '@/graphql/generated/graphql';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const { hotels, loading, activeHotelId } = useHotelScope();

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (hotels.length === 0) {
    return (
      <Card className="mx-auto mt-16 max-w-md items-center text-center">
        <CardHeader>
          <CardTitle>No hotels yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are not a member of any hotel. Ask a platform administrator to assign you to a
            hotel.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <DashboardContent hotelId={activeHotelId ?? ''} />;
}

function DashboardContent({ hotelId }: { hotelId: string }) {
  const { hotels, selectHotel } = useHotelScope();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminDashboard', hotelId],
    queryFn: () => proxyRequest(AdminDashboardDocument, { hotelId }),
    enabled: !!hotelId,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) {
    return (
      <Card className="mx-auto mt-16 max-w-md items-center text-center">
        <CardContent>
          <p className="text-sm text-muted-foreground">Could not load the dashboard.</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const dash = data.adminDashboard;

  const stats = [
    { label: 'Arrivals today', value: dash.arrivalsToday, icon: CalendarCheck },
    { label: 'Departures today', value: dash.departuresToday, icon: CalendarX },
    { label: 'In-house', value: dash.inHouseToday, icon: BedDouble },
    { label: 'Sold out tonight', value: dash.soldOutTonight, icon: DoorOpen },
    { label: 'Occupancy', value: `${dash.occupancyPct.toFixed(1)}%`, icon: Timer },
    { label: 'Revenue total', value: formatMoney(dash.revenueTotal, 'MAD'), icon: CircleDollarSign },
    { label: 'Pending payments', value: dash.pendingPayments, icon: Receipt },
    { label: 'Pending invoices', value: dash.pendingInvoices, icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{dash.hotelName}</h1>
          <p className="text-sm text-muted-foreground">
            {dash.availableTonight} rooms available tonight
          </p>
        </div>
        {hotels.length > 1 ? (
          <select
            aria-label="Switch hotel"
            className="rounded-lg border border-input bg-white px-3 py-2 text-sm"
            value={hotelId}
            onChange={(e) => selectHotel(e.target.value)}
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-2 py-4">
            <CardContent className="flex items-center gap-3 px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-gold-light">
                <stat.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold text-navy">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent reservations</CardTitle>
        </CardHeader>
        <CardContent>
          {dash.recentReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reservations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Stay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dash.recentReservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.reference}</TableCell>
                    <TableCell>
                      {r.guest.firstName} {r.guest.lastName}
                    </TableCell>
                    <TableCell>
                      {formatDate(r.checkInDate)} → {formatDate(r.checkOutDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel(r.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(r.totalAmount, r.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}