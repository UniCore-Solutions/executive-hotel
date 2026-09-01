import { test, expect } from '@playwright/test';
import { dismissConsent } from './helpers';
import { getStayWindow } from './backend';

test.describe('homepage recent activity (D-26)', () => {
  test('seeded history renders recent searches + viewed rooms and links work', async ({ page }) => {
    const { checkin: ci, checkout: co, rooms: roomTypes } = await getStayWindow();
    const at = Date.now();
    const searches = [{ checkin: ci, checkout: co, adults: 2, children: 0, rooms: 1, at }];
    // Recently-viewed rooms are resolved by backend UUID (getRoomTypeById).
    const rooms = roomTypes.slice(0, 2).map((r) => ({ roomId: r.id, at }));
    await page.addInitScript(
      ({ s, r }) => {
        localStorage.setItem('rc_recent_searches_v1', JSON.stringify(s));
        localStorage.setItem('rc_recent_rooms_v1', JSON.stringify(r));
      },
      { s: searches, r: rooms }
    );

    await page.goto('/');
    await dismissConsent(page);

    const recent = page.locator('section[aria-labelledby="recent-title"]');
    await expect(recent).toBeVisible();
    await expect(recent.getByRole('heading', { name: 'Recent searches' })).toBeVisible();
    await expect(recent.getByRole('heading', { name: 'Recently viewed rooms' })).toBeVisible();

    const searchLink = recent.locator(`a[href*="/search?checkin=${ci}"]`).first();
    await searchLink.click();
    await expect(page).toHaveURL(new RegExp(`/search\\?checkin=${ci}`));

    await page.goto('/');
    await dismissConsent(page);
    const roomLink = page
      .locator('section[aria-labelledby="recent-title"]')
      .locator(`a[href*="roomId=${roomTypes[0]!.id}"]`)
      .first();
    await roomLink.click();
    await expect(page).toHaveURL(new RegExp(`roomId=${roomTypes[0]!.id}`));
    await expect(page.locator('#room-name')).toContainText(roomTypes[0]!.name);
  });

  test('no history: recent activity section is hidden', async ({ page }) => {
    await page.goto('/');
    await dismissConsent(page);
    await expect(page.getByRole('heading', { name: 'Pick up your stay' })).toHaveCount(0);
  });
});
