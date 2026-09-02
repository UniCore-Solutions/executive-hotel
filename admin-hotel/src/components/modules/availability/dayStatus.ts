export type DayStatus = 'available' | 'few' | 'soldout';

/**
 * Mirrors the backend's per-night scarcity rule exactly
 * (`AvailabilityServiceImpl.check`, javadoc: "few" when at most 2 units are
 * free AND some inventory has already gone) so the calendar's colouring
 * matches what the guest-facing `few`/`soldout` labels would say about the
 * same night. Untouched inventory (`free === total`) is always "available"
 * even for a 1- or 2-unit room type.
 */
export function computeDayStatus(free: number, total: number): DayStatus {
  if (free <= 0) return 'soldout';
  if (free <= 2 && free < total) return 'few';
  return 'available';
}

export interface DayCell {
  date: string;
  total: number;
  roomsSold: number;
  outOfOrder: number;
  blocked: number;
  free: number;
  status: DayStatus;
}

/** A day with no `Availability` row is fully available (sparse model, see
    `Availability`'s javadoc) — this builds that default cell. */
export function emptyDayCell(date: string, total: number): DayCell {
  return { date, total, roomsSold: 0, outOfOrder: 0, blocked: 0, free: total, status: computeDayStatus(total, total) };
}
