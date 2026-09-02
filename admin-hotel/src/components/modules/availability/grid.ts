import type { AvailabilityRow } from '@/graphql/generated/graphql';
import { computeDayStatus, emptyDayCell, type DayCell } from './dayStatus';

export type AvailabilityRowLike = Pick<
  AvailabilityRow,
  'roomTypeId' | 'stayDate' | 'roomsSold' | 'outOfOrder' | 'blocked'
>;

/**
 * Indexes the sparse `AdminHotel.availability` rows by (roomTypeId, date)
 * once, and returns a lookup that fills in the "fully available, no row"
 * default for any day not present — shared by the calendar grid and by the
 * page's "Block dates" button, which seeds the drawer with today's real
 * counts rather than a blind zero.
 */
export function buildAvailabilityLookup(rows: AvailabilityRowLike[]) {
  const map = new Map<string, Map<string, AvailabilityRowLike>>();
  for (const row of rows) {
    if (!map.has(row.roomTypeId)) map.set(row.roomTypeId, new Map());
    map.get(row.roomTypeId)!.set(row.stayDate, row);
  }
  return function cellFor(roomTypeId: string, totalInventory: number, date: string): DayCell {
    const row = map.get(roomTypeId)?.get(date);
    if (!row) return emptyDayCell(date, totalInventory);
    const free = totalInventory - row.roomsSold - row.outOfOrder - row.blocked;
    return {
      date,
      total: totalInventory,
      roomsSold: row.roomsSold,
      outOfOrder: row.outOfOrder,
      blocked: row.blocked,
      free,
      status: computeDayStatus(free, totalInventory),
    };
  };
}
