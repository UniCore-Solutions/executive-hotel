import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';
import { getHotel } from './backend';

test.describe('home', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/');
    await dismissConsent(page);
  });

  test('loads with brand, hero facts and sections', async ({ page }) => {
    const hotel = await getHotel();
    await expect(page).toHaveTitle(new RegExp(hotel.name));
    const hero = page.locator('[data-hero]');
    await expect(hero).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Rating is computed from seeded reviews; assert the shape, not a value.
    await expect(page.locator('[data-hero-facts]')).toContainText(/\d\.\d/);
    await expect(page.locator('#rooms')).toBeVisible();
    await expect(page.locator('#experiences')).toBeVisible();
    await expect(page.locator('#offers')).toBeVisible();
    await expect(page.locator('#reviews')).toBeVisible();
  });

  test('desktop nav links work (anchor + pages)', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Main"]');
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Rooms' }).click();
    await expect(page.locator('#rooms')).toBeVisible();
    await nav.getByRole('link', { name: 'FAQ' }).click();
    await expect(page).toHaveURL(/\/faq$/);
  });

  test('header CTA routes to search', async ({ page }) => {
    await page.locator('.hdr-cta').first().click();
    await expect(page).toHaveURL(/#search/);
  });

  test('footer navigation has no broken links', async ({ page }) => {
    const links = page.locator('footer a');
    const n = await links.count();
    expect(n).toBeGreaterThan(10);
    for (let i = 0; i < n; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href || href.startsWith('#') || !href.startsWith('http')) continue;
      const res = await page.request.get(href);
      expect(res.status(), `footer link ${href}`).toBeLessThan(400);
    }
  });

  test('newsletter validates, then reports it is unavailable', async ({ page }) => {
    await page.locator('#newsletter').scrollIntoViewIfNeeded();
    await expect(page.locator('#nl-submit')).toBeDisabled();
    await page.locator('#nl-consent').check();
    await page.locator('#nl-email').fill('not-an-email');
    await page.locator('#nl-submit').click();
    await expect(page.locator('#nl-status')).toContainText('Enter a valid email address.');
    await page.locator('#nl-email').fill('guest@example.com');
    await page.locator('#nl-submit').click();
    // There is no newsletter backend; the service says so explicitly rather
    // than faking a subscription (services/newsletter.ts).
    await expect(page.locator('#nl-status')).toContainText(
      'Newsletter sign-up is not available yet'
    );
  });

  test('currency dropdown switches prices', async ({ page }) => {
    await page.getByRole('button', { name: 'Currency' }).click();
    await page.getByRole('menuitem', { name: /US Dollar/ }).click();
    await expect(page.getByRole('button', { name: 'Currency' })).toContainText('$ USD');
  });

  test('hero search bar pins below the header on scroll — single bar', async ({ page }) => {
    const form = page.locator('[role="search"]');
    await expect(form).toHaveCount(1);
    const initial = await form.boundingBox();
    expect(initial!.y).toBeGreaterThan(300);
    await page.locator('#rooms').scrollIntoViewIfNeeded();
    await expect(form).toHaveCount(1);
    await expect
      .poll(async () => Math.round((await form.boundingBox())?.y ?? -1), {
        timeout: 4000,
        message: 'search bar settles in the pinned dock',
      })
      .toBeGreaterThanOrEqual(105);
    await expect
      .poll(async () => Math.round((await form.boundingBox())?.y ?? -1))
      .toBeLessThanOrEqual(132);
  });
});
