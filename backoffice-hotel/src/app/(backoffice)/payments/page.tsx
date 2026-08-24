'use client';

import { useQuery } from '@tanstack/react-query';
import { proxyRequest } from '@/lib/api';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { AdminPaymentsDocument } from '@/graphql/generated/graphql';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, StatusBadge } from '@/components/admin/page';
import { useHotelScope } from '@/context/HotelScopeContext';

export default function PaymentsPage() {
  const { hotels, activeHotelId } = useHotelScope();

  const { data, isLoading } = useQuery({
    queryKey: ['adminPayments', activeHotelId],
    queryFn: () =>
      proxyRequest(AdminPaymentsDocument, {
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

  const payments = data?.adminPayments.items ?? [];

  return (
    <div>
      <PageHeader title="Payments" description="Payments collected for the selected hotel" />
      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">No payments yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reservation</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">#{p.reservationId}</TableCell>
                    <TableCell>{statusLabel(p.provider)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.providerReference ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(p.amount, p.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}