/**
 * Shared DOM helpers for the e2e suite.
 *
 * Test DATA (hotel, room types, bookable dates, reservations) is discovered
 * from the running backend — see ./backend.ts. This file holds only helpers
 * that drive the page.
 */
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export { plusDays } from './backend';

/**
 * The grand total from a QuoteTable inside `scope`.
 *
 * Matched structurally — the total is the last row of the `<dl>` — because
 * the label is caller-supplied ("Total" in the tunnel, "Paid total" on the
 * confirmation), and because an unanchored "Total" text match also hits the
 * per-night rows above it.
 */
export async function quoteTotal(scope: Locator): Promise<string | null> {
  const row = scope.locator('dl').last().locator('> div').last();
  return madAmount(await row.innerText());
}

/** ISO date rendered as the app's `fmtShort` does, e.g. "Nov 1" (no
    zero-padding) — for asserting dates shown in stay summaries. */
export function shortDate(isoDate: string): string {
  const SM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return `${SM[dt.getMonth()]} ${dt.getDate()}`;
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

/**
 * Extract the first MAD amount from a string, normalised for comparison:
 * "Total due MAD 7,312" → "MAD 7,312".
 *
 * `fmtPrice` renders a separator between the code and the number (a regular
 * or non-breaking space), so the separator is matched and then collapsed —
 * otherwise amounts from two different components never compare equal.
 */
export function madAmount(text: string): string | null {
  const m = text.match(/MAD[\s\u00a0]*[\d,]+/);
  return m ? m[0].replace(/[\s\u00a0]+/g, ' ') : null;
}
