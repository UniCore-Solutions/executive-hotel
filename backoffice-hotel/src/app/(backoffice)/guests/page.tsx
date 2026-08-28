'use client';

import { useQuery } from '@apollo/client/react';
import { useDeferredValue, useState } from 'react';
import { Search } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/format';
import { AdminGuestsDocument } from '@/graphql/generated/graphql';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/admin/page';
import { useHotelScope } from '@/context/HotelScopeContext';

export default function GuestsPage() {
  const { hotels, activeHotelId } = useHotelScope();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const { data, loading } = useQuery(AdminGuestsDocument, {
    variables: {
      hotelId: activeHotelId ?? '',
      query: deferredQuery || undefined,
      page: { page: 0, size: 50 },
    },
    skip: !activeHotelId,
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

  const guests = data?.adminGuests.items ?? [];

  return (
    <div>
      <PageHeader
        title="Guests"
        description="Guest profiles for the selected hotel"
      />
      <div className="mb-4 max-w-sm">
        <label className="relative block">
          <span className="sr-only">Search guests</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            {deferredQuery ? 'No guests match your search.' : 'No guests yet.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Reservations</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead>Last stay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {g.firstName} {g.lastName}
                    </TableCell>
                    <TableCell>{g.email ?? '—'}</TableCell>
                    <TableCell>{g.phone ?? '—'}</TableCell>
                    <TableCell className="text-right">{g.reservationsCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(g.totalSpent, 'MAD')}
                    </TableCell>
                    <TableCell>{g.lastStayDate ? formatDate(g.lastStayDate) : '—'}</TableCell>
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