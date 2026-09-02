'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Ban, Download } from 'lucide-react';
import { adminCancelReservation, adminGetCreditNote } from '@/api/rest/endpoints';
import { useApollo } from '@/api/apollo/provider';
import { invalidateAfterWrite } from '@/api/invalidation';
import { buildCreditNoteHtml, downloadInvoiceHtml } from '@/lib/invoice';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import {
  AdminReservationsDocument,
  ReservationStatus,
  type AdminReservationsQuery,
  type ReservationStatus as ReservationStatusType,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const STATUS_FILTERS: { value: ReservationStatusType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: ReservationStatus.Pending, label: 'Pending' },
  { value: ReservationStatus.Confirmed, label: 'Confirmed' },
  { value: ReservationStatus.CheckedIn, label: 'Checked in' },
  { value: ReservationStatus.CheckedOut, label: 'Checked out' },
  { value: ReservationStatus.Cancelled, label: 'Cancelled' },
  { value: ReservationStatus.NoShow, label: 'No-show' },
];

const CANCEL_REASONS = ['guest_request', 'payment_failed', 'no_show', 'staff_correction'];

type ReservationItem = AdminReservationsQuery['adminReservations']['items'][number];

/**
 * Clarifies what "Refund X" actually means given the reservation's real
 * payment status — a nonzero refund figure alone doesn't say money has
 * moved (e.g. a pay-at-property booking cancelled before any charge). Same
 * wording as admin-hotel's ReservationDetailSheet and the guest-facing
 * cancellation view in frontend-hotel, so all three consoles/apps tell a
 * consistent story about the same reservation.
 */
function refundStatusNote(r: ReservationItem): string {
  const status = String(r.paymentStatus).toLowerCase();
  if (status === 'pending' || status === 'failed') {
    return 'No payment was ever collected — nothing to refund.';
  }
  if (status === 'refunded') {
    return 'Refunded in full.';
  }
  if (status === 'partially_refunded') {
    return 'Partially refunded — a cancellation fee applied.';
  }
  if (r.cancellation && r.cancellation.refundAmount <= 0) {
    return 'Non-refundable rate — no refund applies.';
  }
  return 'Refund not yet processed.';
}

export default function ReservationsPage() {
  const { hotels, activeHotelId } = useHotelScope();
  const [status, setStatus] = useState<ReservationStatusType | 'ALL'>('ALL');
  const [selected, setSelected] = useState<ReservationItem | null>(null);

  const { data, loading } = useQuery(AdminReservationsDocument, {
    variables: {
      hotelId: activeHotelId ?? '',
      status: status === 'ALL' ? undefined : status,
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

  const reservations = data?.adminReservations.items ?? [];

  return (
    <div>
      <PageHeader
        title="Reservations"
        description={
          activeHotelId ? 'All reservations for the selected hotel' : 'Select a hotel to continue'
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              status === filter.value
                ? 'border-navy bg-navy text-white'
                : 'border-border bg-white text-muted-foreground hover:border-navy/30'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">No reservations.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Stay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <TableCell className="font-medium">{r.reference}</TableCell>
                    <TableCell>
                      {r.guest.firstName} {r.guest.lastName}
                    </TableCell>
                    <TableCell>
                      {formatDate(r.checkInDate)} → {formatDate(r.checkOutDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>{statusLabel(r.paymentStatus)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(r.totalAmount, r.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(r);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {selected ? (
        <ReservationDetail reservation={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function ReservationDetail({
  reservation: r,
  onClose,
}: {
  reservation: ReservationItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const apollo = useApollo();
  const [cancelling, setCancelling] = useState(false);
  const [reasonCode, setReasonCode] = useState(CANCEL_REASONS[0]);
  const [reasonNote, setReasonNote] = useState('');
  const [creditNoteBusy, setCreditNoteBusy] = useState(false);
  const [creditNoteError, setCreditNoteError] = useState('');

  const downloadCreditNote = async () => {
    setCreditNoteBusy(true);
    setCreditNoteError('');
    try {
      const note = await adminGetCreditNote(r.id);
      const html = buildCreditNoteHtml(note);
      downloadInvoiceHtml(html, `${note.creditNoteNumber}.html`);
    } catch (err) {
      setCreditNoteError(
        err instanceof ApiError && err.code === 'NOT_FOUND'
          ? 'This reservation was never invoiced, so there is nothing to adjust.'
          : err instanceof ApiError
            ? err.message
            : 'Could not fetch the credit note right now.'
      );
    } finally {
      setCreditNoteBusy(false);
    }
  };

  const cancel = useMutation({
    mutationFn: () =>
      adminCancelReservation(r.id, {
        reasonCode,
        reasonNote: reasonNote || undefined,
      }),
    onSuccess: () => {
      setCancelling(false);
      onClose();
      invalidateAfterWrite(apollo, queryClient, 'admin.reservations.cancel', [
        ['adminReservations'],
        ['adminDashboard'],
      ]);
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reservation {r.reference}</DialogTitle>
          <DialogDescription>
            Created {formatDateTime(r.createdAt)} · {r.source}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Guest</p>
              <p className="font-medium">
                {r.guest.firstName} {r.guest.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{r.guest.email}</p>
              {r.guest.phone ? <p className="text-xs">{r.guest.phone}</p> : null}
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Stay</p>
              <p className="font-medium">
                {formatDate(r.checkInDate)} → {formatDate(r.checkOutDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.adults} adults · {r.children} children
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <StatusBadge status={r.status} />
            <StatusBadge status={r.paymentStatus} />
          </div>

          {r.roomLines.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Room lines</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room type</TableHead>
                    <TableHead>Nights</TableHead>
                    <TableHead className="text-right">Rate/night</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.roomLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.roomTypeId}</TableCell>
                      <TableCell>{line.nights}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(line.ratePerNight, r.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(line.subtotalAmount, r.currencyCode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {r.extras.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Extras</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extra</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.extras.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="text-right">{e.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(e.totalPrice, r.currencyCode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
            {r.charges.map((c) => (
              <div key={c.id} className="flex justify-between">
                <span className="text-muted-foreground">{c.name}</span>
                <span>{formatMoney(c.amount, r.currencyCode)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Total</span>
              <span>{formatMoney(r.totalAmount, r.currencyCode)}</span>
            </div>
          </div>

          {r.cancellation ? (
            <div className="rounded-lg border border-clay/30 bg-clay/5 p-3">
              <p className="text-xs font-medium text-clay-dark">Cancelled</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(r.cancellation.cancelledAt)} ·{' '}
                {r.cancellation.reason ?? 'no reason'} · {r.cancellation.reasonNote}
              </p>
              <p className="text-xs">
                Refund {formatMoney(r.cancellation.refundAmount, r.currencyCode)} · penalty{' '}
                {formatMoney(r.cancellation.penaltyAmount, r.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{refundStatusNote(r)}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={downloadCreditNote}
                disabled={creditNoteBusy}
              >
                <Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {creditNoteBusy ? 'Preparing…' : 'Download credit note'}
              </Button>
              {creditNoteError ? (
                <p className="mt-1 text-xs text-clay">{creditNoteError}</p>
              ) : null}
            </div>
          ) : null}

          {!r.cancellation &&
          (r.status === ReservationStatus.Confirmed || r.status === ReservationStatus.Pending) ? (
            !cancelling ? (
              <Button variant="destructive" onClick={() => setCancelling(true)}>
                <Ban className="mr-1 h-4 w-4" aria-hidden="true" /> Cancel reservation
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-clay/30 bg-clay/5 p-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium">Reason</span>
                  <select
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                  >
                    {CANCEL_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {statusLabel(reason)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium">Note</span>
                  <input
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="Optional note"
                  />
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCancelling(false)}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate()}
                  >
                    {cancel.isPending ? 'Cancelling…' : 'Confirm cancellation'}
                  </Button>
                </div>
                {cancel.error ? (
                  <p role="alert" className="text-xs text-clay-dark">
                    {cancel.error.message}
                  </p>
                ) : null}
              </div>
            )
          ) : null}
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}