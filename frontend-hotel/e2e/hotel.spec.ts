import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';

test.describe('hotel', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/hotel');
    await dismissConsent(page);
  });

  test('loads with property facts and sections', async ({ page }) => {
    await expect(page).toHaveTitle(/Executive Boutique Hotel Rabat/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Executive Boutique Hotel');
    for (const id of ['rooms', 'experiences', 'reviews']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('room cards link to live room pages', async ({ page }) => {
    const links = page.locator('a[href*="roomId="]');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < Math.min(n, 3); i++) {
      const href = await links.nth(i).getAttribute('href');
      const res = await page.request.get(href!.split('?')[0]);
      expect(res.status()).toBe(200);
    }
  });

  test('amenities and policies sections render', async ({ page }) => {
    await expect(page.locator('main')).toContainText('Free Wi-Fi');
    await expect(page.locator('main')).toContainText('Free private parking');
    await expect(page.locator('main')).toContainText('Check-in is from 15:00');
  });

  test('gallery and "Book" CTAs on a real room page', async ({ page }) => {
    await page.goto('/hotel?roomId=executive-suite');
    const gallery = page.locator('#gallery');
    await expect(gallery).toBeVisible();
    await page.getByRole('button', { name: 'Next photo' }).click();
    await expect(page.locator('#gallery')).toContainText('2 / 5');
    await expect(
      page.getByRole('button', { name: /Choose dates|Reserve room/ }).first()
    ).toBeVisible();
  });

  test('room page without dates shows stay strip with choose-dates flow', async ({ page }) => {
    await page.goto('/hotel?roomId=superior-double-or-twin');
    await expect(
      page.getByText('Choose dates, guests and rooms right here', { exact: false })
    ).toBeVisible();
    const dialog = page.locator('#room-dates-picker');
    await page.getByRole('button', { name: 'Choose dates' }).first().click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Select your dates');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });
});
