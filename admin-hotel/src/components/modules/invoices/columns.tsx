'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileMinus2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Money } from '@/components/shared/Money';
import { formatDate } from '@/lib/format';
import { adminDownloadInvoicePdf, adminDownloadCreditNotePdf } from '@/api/rest/endpoints/reservations';
import { downloadBytes } from '@/lib/download';
import { ApiError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import type { AdminInvoicesQuery } from '@/graphql/generated/graphql';

export type InvoiceRow = AdminInvoicesQuery['adminInvoices']['items'][number];

/**
 * The invoice/credit-note PDF download pair for one row. A separate
 * component (not an inline cell closure) so each row's busy state is its
 * own — `InvoicesPage`'s `DataTable` renders one of these per row.
 *
 * `adminInvoices` carries no reservation status and no "has a credit note"
 * flag (the schema doesn't expose either — see billing.graphqls), so unlike
 * `ReservationDetailSheet` — which only offers the credit-note action once
 * it already knows the reservation is cancelled — this row can't pre-filter
 * the button. It's offered on every row and a 404 explains the common "never
 * cancelled" case, the same graceful-degradation the reservation sheet uses
 * for its narrower "cancelled but never invoiced" case.
 */
function InvoiceActions({ invoice }: { invoice: InvoiceRow }) {
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [creditNoteBusy, setCreditNoteBusy] = useState(false);
  const { toast } = useToast();

  const downloadInvoice = async () => {
    setInvoiceBusy(true);
    try {
      const pdf = await adminDownloadInvoicePdf(invoice.reservationId);
      downloadBytes(pdf.content, pdf.filename, 'application/pdf');
      toast({ title: 'Invoice ready', description: 'Downloaded as a PDF.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Invoice unavailable',
        description: err instanceof ApiError ? err.message : 'Could not fetch the invoice right now.',
        variant: 'error',
      });
    } finally {
      setInvoiceBusy(false);
    }
  };

  const downloadCreditNote = async () => {
    setCreditNoteBusy(true);
    try {
      const pdf = await adminDownloadCreditNotePdf(invoice.reservationId);
      downloadBytes(pdf.content, pdf.filename, 'application/pdf');
      toast({ title: 'Credit note ready', description: 'Downloaded as a PDF.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Credit note unavailable',
        description:
          err instanceof ApiError && err.code === 'NOT_FOUND'
            ? 'This reservation was never cancelled, so no credit note was issued.'
            : err instanceof ApiError
              ? err.message
              : 'Could not fetch the credit note right now.',
        variant: 'error',
      });
    } finally {
      setCreditNoteBusy(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              loading={invoiceBusy}
              onClick={downloadInvoice}
              aria-label="Download invoice PDF"
            >
              {invoiceBusy ? null : <Receipt />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download invoice</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              loading={creditNoteBusy}
              onClick={downloadCreditNote}
              aria-label="Download credit note PDF"
            >
              {creditNoteBusy ? null : <FileMinus2 />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download credit note (if one was issued)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

// Read/download-only (§ Invoices in ADMIN_REBUILD_PROGRESS.md): invoices are
// auto-issued on reservation confirmation/cancellation, so there is no
// create/edit form here, only a list and the two PDF actions. `status` is
// always `"issued"` today (InvoiceServiceImpl never sets another value) so
// it isn't rendered as a column — a badge that never varies would just be
// noise (see StatusBadge's §O "one place a status is colored" rule; adding
// a domain for a constant isn't worth it).
export const invoiceColumns: ColumnDef<InvoiceRow, unknown>[] = [
  {
    id: 'invoiceNumber',
    header: 'Invoice',
    cell: ({ row }) => <span className="font-mono text-xs text-ink">{row.original.invoiceNumber}</span>,
  },
  {
    id: 'reservationId',
    header: 'Reservation',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground" title={row.original.reservationId}>
        {row.original.reservationId.slice(0, 8)}…
      </span>
    ),
  },
  {
    id: 'billingName',
    header: 'Guest',
    cell: ({ row }) => <span className="text-sm text-ink">{row.original.billingName}</span>,
  },
  {
    id: 'issuedAt',
    header: 'Issued',
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.issuedAt)}</span>,
  },
  {
    id: 'totalAmount',
    header: () => <span className="block text-right">Amount</span>,
    cell: ({ row }) => <Money amount={row.original.totalAmount} className="block text-right font-medium text-ink" />,
  },
  {
    id: 'actions',
    header: () => <span className="block text-right">Actions</span>,
    cell: ({ row }) => <InvoiceActions invoice={row.original} />,
  },
];
