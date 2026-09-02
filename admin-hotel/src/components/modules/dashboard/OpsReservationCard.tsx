'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { checkIn, checkOut } from '@/api/rest/endpoints/reservations';
import { AssignRoomSheet } from './AssignRoomSheet';
import type { AdminDashboardQuery } from '@/graphql/generated/graphql';

type OpsReservation = AdminDashboardQuery['adminDashboard']['arrivalsTodayList'][number];

/**
 * One reservation row in the arrivals/departures ops lists: guest, dates,
 * status, each room line's room-type + nights + assigned-room-or-
 * "unassigned", and (when `showActions`) an Assign-room action per
 * unassigned line plus a single Check-in (arrivals) or Check-out
 * (departures) action for the whole reservation. Read-only for roles that
 * can see the list but shouldn't act on it (finance_staff) — pass
 * `showActions={false}`.
 */
export function OpsReservationCard({
  hotelId,
  reservation,
  kind,
  showActions,
}: {
  hotelId: string;
  reservation: OpsReservation;
  kind: 'arrival' | 'departure';
  showActions: boolean;
}) {
  const apollo = useApollo();
  const { toast } = useToast();
  const [assignSheet, setAssignSheet] = useState<{ roomLineId: string; roomTypeId: string; roomTypeName: string } | null>(
    null,
  );

  const allAssigned = reservation.roomLines.every((l) => l.roomId);
  const canCheckIn = kind === 'arrival' && reservation.status === 'confirmed';
  const canCheckOut = kind === 'departure' && reservation.status === 'checked_in';

  const checkInMutation = useMutation({
    mutationFn: () => checkIn(reservation.id),
    onSuccess: () => {
      invalidateGraphql(apollo, 'reservations.checkIn');
      toast({ title: `${reservation.reference} checked in`, variant: 'success' });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not check in',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(reservation.id),
    onSuccess: () => {
      invalidateGraphql(apollo, 'reservations.checkOut');
      toast({ title: `${reservation.reference} checked out`, variant: 'success' });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not check out',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  const checkInDisabledReason = !canCheckIn
    ? reservation.status !== 'confirmed'
      ? `Only a confirmed reservation can be checked in (currently ${reservation.status}).`
      : undefined
    : !allAssigned
      ? 'Assign a room to every line before check-in.'
      : undefined;
  const checkInDisabled = Boolean(checkInDisabledReason);

  const checkOutDisabledReason = !canCheckOut
    ? `Only a checked-in reservation can be checked out (currently ${reservation.status}).`
    : undefined;

  return (
    <TooltipProvider>
      <li className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {reservation.guest.firstName} {reservation.guest.lastName}
              <span className="ml-2 font-mono text-xs text-muted-foreground">{reservation.reference}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {reservation.checkInDate} → {reservation.checkOutDate}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge domain="reservation" value={reservation.status} />
            <Link
              href={`/hotels/${hotelId}/reservations?ref=${reservation.reference}`}
              className="text-xs font-medium text-info hover:underline"
            >
              Details
            </Link>
          </div>
        </div>

        <ul className="mt-2 space-y-1.5">
          {reservation.roomLines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {line.roomTypeName} · {line.nights} night{line.nights === 1 ? '' : 's'} ·{' '}
                <span className={line.roomId ? 'font-medium text-ink' : 'font-medium text-warn'}>
                  {line.roomId ? `Room ${line.roomNumber}` : 'Unassigned'}
                </span>
              </span>
              {showActions ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() =>
                    setAssignSheet({ roomLineId: line.id, roomTypeId: line.roomTypeId, roomTypeName: line.roomTypeName })
                  }
                >
                  {line.roomId ? 'Reassign' : 'Assign room'}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>

        {showActions ? (
          <div className="mt-3 flex justify-end">
            {kind === 'arrival' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={checkInDisabled ? 'inline-block' : undefined}>
                    <Button
                      type="button"
                      size="sm"
                      loading={checkInMutation.isPending}
                      disabled={checkInDisabled}
                      onClick={() => checkInMutation.mutate()}
                    >
                      Check in
                    </Button>
                  </span>
                </TooltipTrigger>
                {checkInDisabledReason ? <TooltipContent>{checkInDisabledReason}</TooltipContent> : null}
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={!canCheckOut ? 'inline-block' : undefined}>
                    <Button
                      type="button"
                      size="sm"
                      loading={checkOutMutation.isPending}
                      disabled={!canCheckOut}
                      onClick={() => checkOutMutation.mutate()}
                    >
                      Check out
                    </Button>
                  </span>
                </TooltipTrigger>
                {checkOutDisabledReason ? <TooltipContent>{checkOutDisabledReason}</TooltipContent> : null}
              </Tooltip>
            )}
          </div>
        ) : null}

        {assignSheet ? (
          <AssignRoomSheet
            reservationId={reservation.id}
            roomLineId={assignSheet.roomLineId}
            roomTypeId={assignSheet.roomTypeId}
            roomTypeName={assignSheet.roomTypeName}
            checkInDate={reservation.checkInDate}
            checkOutDate={reservation.checkOutDate}
            currentRoomId={reservation.roomLines.find((l) => l.id === assignSheet.roomLineId)?.roomId}
            currentRoomNumber={reservation.roomLines.find((l) => l.id === assignSheet.roomLineId)?.roomNumber}
            open={Boolean(assignSheet)}
            onOpenChange={(open) => !open && setAssignSheet(null)}
            onAssigned={() => setAssignSheet(null)}
          />
        ) : null}
      </li>
    </TooltipProvider>
  );
}
