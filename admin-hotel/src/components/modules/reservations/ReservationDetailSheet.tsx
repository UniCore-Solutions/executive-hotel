'use client';

import { useState } from 'react';
import { BedDouble, Ban, Mail, Phone, User } from 'lucide-react';
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
  if (!reservation) return null;

  const canCancel = CANCELLABLE.has(reservation.status.toLowerCase());

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
                  <StatusBadge domain="payment" value={reservation.paymentStatus} />
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

          {canCancel ? (
            <SheetFooter>
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <Ban className="size-3.5" />
                Cancel reservation
              </Button>
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
