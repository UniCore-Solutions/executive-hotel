/**
 * ISO ('YYYY-MM-DD') date helpers for the availability calendar. Kept
 * separate from `format.ts` (which formats a date/money value for
 * display) — these build and walk plain LocalDate strings, the shape the
 * backend's `LocalDate` scalar sends and expects.
 */

export function todayIso(): string {
  return toIso(new Date());
}

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromIso(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const [y = 1970, m = 1, d = 1] = parts;
  return new Date(y, m - 1, d);
}

export function addDaysIso(iso: string, days: number): string {
  const date = fromIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/**
 * The admin's inventory calendar window — `now .. now+30 days` inclusive
 * (31 days), matching `AdminDashboardServiceImpl.hotelWorkspace`'s
 * `availability.range(hotelId, LocalDate.now(), LocalDate.now().plusDays(30))`
 * and the repository's `stayDate between :from and :to` (both ends
 * inclusive). This is a real backend constraint (see ADMIN_REBUILD_PROGRESS
 * J-10), not a value to widen from the frontend.
 */
export function availabilityWindowDays(): string[] {
  const start = todayIso();
  return Array.from({ length: 31 }, (_, i) => addDaysIso(start, i));
}

export function formatDayHeader(iso: string): { weekday: string; day: string; month: string } {
  const date = fromIso(iso);
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date),
  };
}

export function isToday(iso: string): boolean {
  return iso === todayIso();
}
