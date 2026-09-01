import { test, expect } from '@playwright/test';
import { getStayWindow } from './backend';

/** Static routes — no backend identifiers involved. */
const STATIC_ROUTES = [
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
];

async function expectClean(page: import('@playwright/test').Page, route: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/net::ERR_|404.*favicon|Failed to load resource/i.test(m.text())) {
      errors.push(m.text());
    }
  });
  const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(res!.status(), route).toBeLessThan(400);
  await expect(page.locator('main').first()).toBeVisible();
  await expect(page.getByRole('main')).toHaveCount(1);
  expect(errors, `${route} console errors`).toEqual([]);
}

test.describe('route smoke & console hygiene', () => {
  for (const route of STATIC_ROUTES) {
    test(`${route} loads with no uncaught errors`, async ({ page }) => {
      await expectClean(page, route);
    });
  }

  /* Room routes take real room-type UUIDs: /room/<id> resolves the owning
     hotel through the catalog gateway and 404s on anything else, so the ids
     are discovered rather than written down. */
  test('room routes load for every bookable room type', async ({ page }) => {
    const { rooms } = await getStayWindow();
    expect(rooms.length).toBeGreaterThan(0);
    for (const room of rooms) {
      await expectClean(page, `/room/${room.id}`);
      await expect(page).toHaveURL(new RegExp(`roomId=${room.id}`));
    }
  });

  test('hotel page with a room selected loads', async ({ page }) => {
    const { rooms } = await getStayWindow();
    await expectClean(page, `/hotel?roomId=${rooms[0]!.id}`);
  });

  test('unknown room id yields 404 page', async ({ page }) => {
    const res = await page.goto('/room/not-a-room');
    expect(res!.status()).toBe(404);
    await expect(page.locator('main')).toBeVisible();
  });
});
