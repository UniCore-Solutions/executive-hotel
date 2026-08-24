import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/search',
  '/hotel',
  '/offers',
  '/faq',
  '/contact',
  '/terms',
  '/privacy',
  '/cookies',
  '/cancellation-policy',
  '/account',
  '/reservation',
  '/checkin',
  '/booking',
  '/room/superior-double-or-twin',
  '/room/double-or-twin',
  '/room/executive-suite',
  '/hotel?roomId=executive-suite',
];

test.describe('route smoke & console hygiene', () => {
  for (const route of ROUTES) {
    test(`${route} loads with no uncaught errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (
          m.type() === 'error' &&
          !/net::ERR_|404.*favicon|Failed to load resource/i.test(m.text())
        ) {
          errors.push(m.text());
        }
      });
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res!.status(), route).toBeLessThan(400);
      await expect(page.locator('main').first()).toBeVisible();
      await expect(page.getByRole('main')).toHaveCount(1);
      expect(errors, `${route} console errors`).toEqual([]);
    });
  }

  test('unknown room id yields 404 page', async ({ page }) => {
    const res = await page.goto('/room/not-a-room');
    expect(res!.status()).toBe(404);
    await expect(page.locator('main')).toBeVisible();
  });
});
