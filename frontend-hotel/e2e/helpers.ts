/** Shared helpers for the e2e suite. */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const ROOM_IDS = ['superior-double-or-twin', 'double-or-twin', 'executive-suite'];

/** FNV-1a replica of lib/dates.hashStr — mirrors availabilityFor determinism. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function availabilityOf(roomId: string, ciIso: string): 'soldout' | 'few' | 'available' {
  const r = (hashStr(`${roomId}|${ciIso}`) % 10000) / 100;
  if (r < 24) return 'soldout';
  if (r < 42) return 'few';
  return 'available';
}

export function iso(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** First check-in (>= offsetDays ahead) where every room is available. */
export function allAvailableCheckin(fromDays = 2): string {
  for (let d = fromDays; d <= 60; d++) {
    const ci = iso(d);
    if (ROOM_IDS.every((id) => availabilityOf(id, ci) === 'available')) return ci;
  }
  throw new Error('no all-available window within 60 days');
}

/** Day-cell accessible name, e.g. "Aug 16, 2026". */
export function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** iso + n days. */
export function plusDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Dismiss the consent banner if it appears. */
export async function dismissConsent(page: Page): Promise<void> {
  const banner = page.locator('#consent-banner');
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: 'Essential only' }).click();
  }
}

/** Fail the test on any uncaught page error. */
export function attachNoPageErrors(page: Page): void {
  page.on('pageerror', (err) => {
    throw new Error(`pageerror: ${err.message}`);
  });
}

/**
 * Wait until every <img> has settled (loaded or failed), capped at a few
 * seconds. Hero/photo assets come from remote CDNs; scans (axe, overflow)
 * must run against the fully-painted page, not a partially-rendered one.
 */
export async function settleImages(page: Page, capMs = 8000): Promise<void> {
  await page.evaluate(async (cap) => {
    const started = Date.now();
    const pending = [...document.images].filter((i) => !i.complete);
    await Promise.all(
      pending.map(
        (i) =>
          new Promise<void>((resolve) => {
            const done = () => resolve();
            i.addEventListener('load', done, { once: true });
            i.addEventListener('error', done, { once: true });
            setTimeout(done, cap - (Date.now() - started));
          })
      )
    );
  }, capMs);
}

/** Pick check-in/check-out in the SearchBar calendar and confirm. */
export async function pickDates(page: Page, ci: string, co: string): Promise<void> {
  const clickDay = async (isoDate: string) => {
    await page
      .locator(`#date-picker [data-day="${isoDate}"]`)
      .evaluate((el) => (el as HTMLElement).click());
  };
  await clickDay(ci);
  await expect(page.locator('[data-cal-status]')).toContainText('now select your check-out');
  await clickDay(co);
  await expect(page.locator('[data-cal-status]')).toContainText('Range set — confirm or adjust');
  await page.locator('#cal-confirm-btn').evaluate((el) => (el as HTMLElement).click());
}

/** Set a guest count via sheet/panel steppers (adults, children, rooms). */
export async function setGuests(
  page: Page,
  opts: { adults?: number; children?: number; rooms?: number } = {}
): Promise<void> {
  const panel = page.locator('#guests-panel');
  for (const [label, target] of [
    ['adults', opts.adults ?? 2],
    ['children', opts.children ?? 0],
    ['rooms', opts.rooms ?? 1],
  ] as const) {
    const cur = Number(await panel.locator(`[data-val="${label}"]`).innerText());
    const step = target - cur;
    const btn = step > 0 ? `Increase ${label}` : `Decrease ${label}`;
    for (let i = 0; i < Math.abs(step); i++)
      await panel.getByRole('button', { name: btn }).click({ force: true });
  }
  await expect(panel.locator('#guests-done')).toBeVisible();
  await panel.locator('#guests-done').click({ force: true });
}

/** Extract the first MAD amount from a string, e.g. "Total due MAD7,312" → "MAD7,312". */
export function madAmount(text: string): string | null {
  return text.match(/MAD[\d,]+/)?.[0] ?? null;
}
