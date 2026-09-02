'use client';

import { useState } from 'react';
import { BedDouble, Ban, Download, Mail, Phone, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Money } from '@/components/shared/Money';
import { formatDate, formatDateTime, humanizeEnum } from '@/lib/format';
import { adminGetInvoice, adminGetCreditNote } from '@/api/rest/endpoints/reservations';
import { buildInvoiceHtml, buildCreditNoteHtml, downloadInvoiceHtml } from '@/lib/invoice';
import { ApiError } from '@/lib/api';
import { paymentStatusDisplay, refundStatusNote } from '@/lib/reservationStatus';
import { useToast } from '@/context/ToastContext';
import { CancelReservationDialog } from './CancelReservationDialog';
import type { AdminReservationsQuery } from '@/graphql/generated/graphql';

type Reservation = AdminReservationsQuery['adminReservations']['items'][number];

const CANCELLABLE = new Set(['pending', 'confirmed', 'modified']);

export function ReservationDetailSheet({
  reservation,
  open,
  onOpenChange,
  onCancelled,
}: {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [creditNoteBusy, setCreditNoteBusy] = useState(false);
  const { toast } = useToast();
  if (!reservation) return null;

  const paymentDisplay = paymentStatusDisplay(reservation);
  const canCancel = CANCELLABLE.has(reservation.status.toLowerCase());
  // An invoice only ever exists for a reservation that reached 'confirmed'
  // (auto-issued on confirmation) or one that was cancelled after having
  // one — never for a still-'pending' payment hold.
  const canDownloadInvoice = ['confirmed', 'cancelled'].includes(reservation.status.toLowerCase());
  // A credit note only exists once a cancelled reservation is confirmed to
  // have had an invoice to adjust — the sheet doesn't know that in advance,
  // so it offers the action whenever cancelled and lets a 404 explain the
  // "never invoiced" case.
  const canDownloadCreditNote = reservation.status.toLowerCase() === 'cancelled';

  const downloadInvoice = async () => {
    setInvoiceBusy(true);
    try {
      const invoice = await adminGetInvoice(reservation.id);
      const html = buildInvoiceHtml(invoice, invoice.items);
      downloadInvoiceHtml(html, `${invoice.invoiceNumber}.html`);
      toast({ title: 'Invoice ready', description: 'Downloaded — open it in your browser to view or print.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Invoice unavailable',
        description: err instanceof ApiError ? err.message : 'Could not generate the invoice right now.',
        variant: 'error',
      });
    } finally {
      setInvoiceBusy(false);
    }
  };

  const downloadCreditNote = async () => {
    setCreditNoteBusy(true);
    try {
      const note = await adminGetCreditNote(reservation.id);
      const html = buildCreditNoteHtml(note);
      downloadInvoiceHtml(html, `${note.creditNoteNumber}.html`);
      toast({ title: 'Credit note ready', description: 'Downloaded — open it in your browser to view or print.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Credit note unavailable',
        description:
          err instanceof ApiError && err.code === 'NOT_FOUND'
            ? 'This reservation was never invoiced, so there is nothing to adjust.'
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle className="font-mono">{reservation.reference}</SheetTitle>
              <StatusBadge domain="reservation" value={reservation.status} />
            </div>
            <SheetDescription>
              {formatDate(reservation.checkInDate)} – {formatDate(reservation.checkOutDate)} · Booked{' '}
              {formatDateTime(reservation.createdAt)}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-6">
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Guest</h3>
              <div className="rounded-lg border border-border p-3.5 text-sm">
                <p className="flex items-center gap-2 font-medium text-ink">
                  <User className="size-3.5 text-muted-foreground" />
                  {reservation.guest.firstName} {reservation.guest.lastName}
                </p>
                {reservation.guest.email ? (
                  <p className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5" />
                    {reservation.guest.email}
                  </p>
                ) : null}
                {reservation.guest.phone ? (
                  <p className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5" />
                    {reservation.guest.phone}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {reservation.adults} adult{reservation.adults === 1 ? '' : 's'}
                  {reservation.children > 0 ? `, ${reservation.children} children` : ''} · Source: {reservation.source}
                </p>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Rooms</h3>
              <div className="space-y-2">
                {reservation.roomLines.map((line) => (
                  <div key={line.id} className="rounded-lg border border-border p-3.5 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        <BedDouble className="size-3.5 text-muted-foreground" />
                        {line.roomTypeName}
                      </p>
                      <Money amount={line.subtotalAmount} className="font-medium" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.ratePlanName ?? 'Rate plan'} · {line.nights} night{line.nights === 1 ? '' : 's'} ·{' '}
                      <Money amount={line.ratePerNight} />/night
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={
                          line.isRefundable
                            ? 'rounded-full border border-success/25 bg-success-light px-2 py-0.5 text-[11px] font-medium text-success-dark'
                            : 'rounded-full border border-clay/25 bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay-dark'
                        }
                      >
                        {line.isRefundable ? 'Refundable' : 'Non-refundable'}
                      </span>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {humanizeEnum(line.paymentTiming)}
                      </span>
                      {line.freeCancellationUntil ? (
                        <span className="text-[11px] text-muted-foreground">
                          Free cancellation until {formatDate(line.freeCancellationUntil)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {reservation.extras.length > 0 ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Extras</h3>
                <div className="space-y-1.5 text-sm">
                  {reservation.extras.map((extra) => (
                    <div key={extra.id} className="flex items-center justify-between">
                      <span className="text-ink">
                        {extra.name} <span className="text-muted-foreground">×{extra.quantity}</span>
                      </span>
                      <Money amount={extra.totalPrice} />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Charges &amp; total</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <Money amount={reservation.subtotalAmount} />
                </div>
                {reservation.discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-success-dark">
                    <span>Discount</span>
                    <span>
                      -<Money amount={reservation.discountAmount} />
                    </span>
                  </div>
                ) : null}
                {reservation.charges.map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between text-muted-foreground">
                    <span>{charge.name}</span>
                    <Money amount={charge.amount} />
                  </div>
                ))}
                <Separator className="my-1.5" />
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>Total</span>
                  <Money amount={reservation.totalAmount} />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Payment status</span>
                  <StatusBadge domain="payment" value={paymentDisplay.value} label={paymentDisplay.label} />
                </div>
              </div>
            </section>

            {reservation.cancellation ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cancellation</h3>
                <div className="rounded-lg border border-clay/20 bg-clay/5 p-3.5 text-sm">
                  <p className="font-medium text-clay-dark">
                    {reservation.cancellation.reason ? humanizeEnum(reservation.cancellation.reason) : 'Cancelled'}
                  </p>
                  {reservation.cancellation.reasonNote ? (
                    <p className="mt-1 text-xs text-muted-foreground">{reservation.cancellation.reasonNote}</p>
                  ) : null}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Penalty</p>
                      <Money amount={reservation.cancellation.penaltyAmount} />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Refund</p>
                      <Money amount={reservation.cancellation.refundAmount} />
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs">
                    <StatusBadge domain="payment" value={paymentDisplay.value} label={paymentDisplay.label} />
                    <span className="text-muted-foreground">{refundStatusNote(reservation)}</span>
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Cancelled {formatDateTime(reservation.cancellation.cancelledAt)}
                  </p>
                </div>
              </section>
            ) : null}

            {reservation.notes ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes</h3>
                <p className="rounded-lg border border-border bg-muted/40 p-3.5 text-sm text-ink">{reservation.notes}</p>
              </section>
            ) : null}
          </SheetBody>

          {canDownloadInvoice || canDownloadCreditNote || canCancel ? (
            <SheetFooter>
              {canDownloadInvoice ? (
                <Button variant="outline" size="sm" onClick={downloadInvoice} disabled={invoiceBusy}>
                  <Download className="size-3.5" />
                  {invoiceBusy ? 'Preparing…' : 'Download invoice'}
                </Button>
              ) : null}
              {canDownloadCreditNote ? (
                <Button variant="outline" size="sm" onClick={downloadCreditNote} disabled={creditNoteBusy}>
                  <Download className="size-3.5" />
                  {creditNoteBusy ? 'Preparing…' : 'Download credit note'}
                </Button>
              ) : null}
              {canCancel ? (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                  <Ban className="size-3.5" />
                  Cancel reservation
                </Button>
              ) : null}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <CancelReservationDialog
        reservation={reservation}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => {
          onOpenChange(false);
          onCancelled();
        }}
      />
    </>
  );
}
