'use client';

import { useQuery } from '@apollo/client/react';
import { Download } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/lib/format';
import { AdminInvoicesDocument } from '@/graphql/generated/graphql';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
import { buildInvoiceHtml, downloadInvoiceHtml } from '@/lib/invoice';

export default function InvoicesPage() {
  const { hotels, activeHotelId } = useHotelScope();

  const { data, loading } = useQuery(AdminInvoicesDocument, {
    variables: {
      hotelId: activeHotelId ?? '',
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

  const invoices = data?.adminInvoices.items ?? [];

  const downloadInvoice = (inv: (typeof invoices)[number]) => {
    // All fields already come from the AdminInvoices query above — no extra
    // round trip needed to build the download.
    const html = buildInvoiceHtml(inv, inv.items);
    downloadInvoiceHtml(html, `${inv.invoiceNumber}.html`);
  };

  return (
    <div>
      <PageHeader title="Invoices" description="Invoices issued for the selected hotel" />
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">No invoices yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Billing name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.billingName}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(inv.issuedAt)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(inv.totalAmount, inv.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => downloadInvoice(inv)}>
                        <Download className="size-3.5" />
                        Download
                      </Button>
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