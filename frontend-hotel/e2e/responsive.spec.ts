import { test, expect, type Page } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';
import { getStayWindow, cheapestRoom, getSharedReservation } from './backend';

async function noHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

test.describe('responsive — mobile 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/');
    await dismissConsent(page);
  });

  test('home has no horizontal overflow and loads', async ({ page }) => {
    await expect(page.locator('[data-hero]')).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('hamburger opens and closes the mobile menu', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Open menu' });
    await toggle.click();
    const menu = page.locator('nav[aria-label="Mobile"]');
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await menu.getByRole('link', { name: 'FAQ' }).click();
    await expect(page).toHaveURL(/\/faq$/);
    await expect(page.locator('nav[aria-label="Mobile"]')).toBeHidden();
  });

  test('mobile search sheet drives a full search', async ({ page }) => {
    const { checkin: ci, checkout: co } = await getStayWindow();
    await page.locator('[data-open-sheet]').click();
    const sheet = page.locator('#search-sheet');
    await expect(sheet).toBeVisible();
    await sheet.locator('#sheet-date-trigger').click();
    await sheet.locator(`#sheet-calendar [data-day="${ci}"]`).click();
    await sheet.locator(`#sheet-calendar [data-day="${co}"]`).click();
    /* With the calendar expanded the submit button sits ~1400px down the
       sheet's own scroll container, outside the 844px viewport, so it never
       becomes click-stable. Dispatch the click directly — the same approach
       helpers.ts already uses for the calendar's day cells and confirm. */
    await sheet.locator('#sheet-search').evaluate((el) => (el as HTMLElement).click());
    await expect(page).toHaveURL(/\/search\?.*checkin=/);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('booking form is usable at mobile width', async ({ page }) => {
    const window = await getStayWindow();
    const room = cheapestRoom(window);
    const plan = `${room.id}::${room.rates[0]!.ratePlanCode.toLowerCase()}`;
    await page.goto(
      `/booking?checkin=${window.checkin}&checkout=${window.checkout}` +
        `&adults=2&children=0&rooms=1&room=${room.id}&plan=${plan}`
    );
    await expect(page.locator('#f-email')).toBeVisible();
    await page.locator('#f-email').fill('m@example.com');
    await expect(page.locator('#f-email')).toHaveValue('m@example.com');
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('confirmation page stacks at mobile width', async ({ page }) => {
    const res = await getSharedReservation();
    await page.goto(
      `/confirmation?ref=${encodeURIComponent(res.reference)}&email=${encodeURIComponent(res.email)}`
    );
    await expect(page.locator('#conf-ref')).toHaveText(res.reference);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
});

test.describe('responsive — tablet 768×1024', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('desktop nav hidden, hamburger used; no overflow on key pages', async ({ page }) => {
    attachNoPageErrors(page);
    const room = cheapestRoom(await getStayWindow());
    for (const route of ['/', '/hotel', `/hotel?roomId=${room.id}`, '/account']) {
      await page.goto(route);
      await dismissConsent(page);
      await expect(page.locator('main')).toBeVisible();
      expect(await noHorizontalOverflow(page), route).toBe(true);
    }
    await expect(page.locator('nav[aria-label="Main"]')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  });
});
