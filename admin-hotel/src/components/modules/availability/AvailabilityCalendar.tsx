'use client';

import { useMemo } from 'react';
import { Lock, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDayHeader, isToday } from '@/lib/dates';
import type { DayCell, DayStatus } from './dayStatus';
import { buildAvailabilityLookup, type AvailabilityRowLike } from './grid';

const STATUS_CLASSES: Record<DayStatus, string> = {
  available: 'border-success/25 bg-success-light text-success-dark',
  few: 'border-warn/25 bg-warn-light text-warn-dark',
  soldout: 'border-clay/25 bg-clay/10 text-clay-dark',
};

export interface CalendarRoomType {
  id: string;
  name: string;
  status: string;
  totalInventory: number;
}

export function AvailabilityCalendar({
  roomTypes,
  days,
  rows,
  onCellClick,
}: {
  roomTypes: CalendarRoomType[];
  /** ISO dates, in order — the admin's fixed 30-day window (see J-10). */
  days: string[];
  /** Raw `AdminHotel.availability` rows. Sparse: a (roomType, day) with no
      matching row here is fully available — never inferred as missing data. */
  rows: AvailabilityRowLike[];
  onCellClick: (roomType: CalendarRoomType, date: string, cell: DayCell) => void;
}) {
  const cellFor = useMemo(() => buildAvailabilityLookup(rows), [rows]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-20 w-44 min-w-44 bg-muted/60">Room type</TableHead>
            {days.map((date) => {
              const h = formatDayHeader(date);
              return (
                <TableHead
                  key={date}
                  className={cn('w-14 min-w-14 text-center normal-case', isToday(date) && 'bg-gold/15')}
                >
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-[9px] font-normal text-muted-foreground">{h.weekday}</span>
                    <span className={cn('text-xs font-semibold', isToday(date) ? 'text-navy' : 'text-ink')}>
                      {h.day} {h.month}
                    </span>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {roomTypes.map((rt) => (
            <TableRow key={rt.id} className="hover:bg-transparent">
              <TableCell className="sticky left-0 z-10 w-44 min-w-44 bg-white">
                <p className="truncate text-sm font-medium text-ink">{rt.name}</p>
                <p className="text-xs text-muted-foreground">{rt.totalInventory} units</p>
              </TableCell>
              {days.map((date) => {
                const cell = cellFor(rt.id, rt.totalInventory, date);
                return (
                  <TableCell key={date} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onCellClick(rt, date, cell)}
                      title={`${rt.name} — ${date}: ${cell.free} of ${cell.total} free${
                        cell.blocked ? `, ${cell.blocked} blocked` : ''
                      }${cell.outOfOrder ? `, ${cell.outOfOrder} out of order` : ''}`}
                      className={cn(
                        'flex w-full flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-xs font-semibold transition-shadow hover:ring-2 hover:ring-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
                        STATUS_CLASSES[cell.status],
                      )}
                    >
                      <span>
                        {cell.free}/{cell.total}
                      </span>
                      {cell.blocked > 0 || cell.outOfOrder > 0 ? (
                        <span className="flex items-center gap-0.5 opacity-80">
                          {cell.blocked > 0 ? <Lock className="size-2.5" aria-hidden="true" /> : null}
                          {cell.outOfOrder > 0 ? <Wrench className="size-2.5" aria-hidden="true" /> : null}
                        </span>
                      ) : null}
                    </button>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
