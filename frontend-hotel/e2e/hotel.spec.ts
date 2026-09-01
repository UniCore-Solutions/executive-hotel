import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';
import { getHotel, getStayWindow, suiteRoom, cheapestRoom, payAtPropertyRoom } from './backend';

test.describe('hotel', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/hotel');
    await dismissConsent(page);
  });

  test('loads with property facts and sections', async ({ page }) => {
    // /hotel redirects to the canonical hotel's UUID; its name is the brand.
    const hotel = await getHotel();
    await expect(page).toHaveTitle(new RegExp(hotel.name));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(hotel.name);
    // Section ids on the backend-rendered hotel page (HotelDetail.tsx).
    for (const id of ['amenities', 'rooms', 'faq']) {
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
    // Amenity names and policy values are seeded rows, so assert the section
    // renders populated rather than pinning particular copy.
    await expect(page.locator('#amenities')).toContainText('Amenities & services');
    const amenityCount = await page.locator('#amenities [class*="rounded-full"]').count();
    expect(amenityCount).toBeGreaterThan(0);
    await expect(page.locator('main')).toContainText('Check-in');
    await expect(page.locator('main')).toContainText('Check-out');
  });

  test('photo lightbox opens, advances and closes', async ({ page }) => {
    // Photos are a PhotoGallery grid plus a lightbox (PhotoGallery.tsx /
    // PhotoLightbox.tsx) — there is no inline carousel counter. The button
    // only renders for a gallery with more than one photo, which today is
    // true of the hotel gallery but not of a room type's single image.
    await page.getByRole('button', { name: /View all \d+ photos/ }).first().click();
    /* Radix sets aria-labelledby from the sr-only DialogTitle (the photo's
       alt text), which overrides the container's aria-label — so the dialog
       is matched by role and identified by its counter. */
    const lightbox = page.getByRole('dialog');
    await expect(lightbox).toBeVisible();
    await expect(lightbox).toContainText('1 / ');
    await lightbox.getByRole('button', { name: 'Next photo' }).click();
    await expect(lightbox).toContainText('2 / ');
    await lightbox.getByRole('button', { name: 'Close photo viewer' }).click();
    await expect(lightbox).toBeHidden();
  });

  test('room view shows the room and its booking CTA', async ({ page }) => {
    const window = await getStayWindow();
    const room = suiteRoom(window) ?? cheapestRoom(window);
    await page.goto(`/hotel?roomId=${room.id}`);
    await expect(page.locator('#room-name')).toContainText(room.name);
    await expect(
      page.getByRole('button', { name: /Choose dates|Reserve room/ }).first()
    ).toBeVisible();
  });

  test('room page without dates shows stay strip with choose-dates flow', async ({ page }) => {
    const room = cheapestRoom(await getStayWindow());
    await page.goto(`/hotel?roomId=${room.id}`);
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

  /* Payment timing is a rate-plan property the guest must be able to see
     before choosing. With one plan per room type the card drops the radio
     chooser and states the terms instead. */
  test('a pay-at-property room states that the stay is settled at the hotel', async ({ page }) => {
    const window = await getStayWindow();
    const room = payAtPropertyRoom(window);
    test.skip(!room, 'no pay-at-property rate configured');

    await page.goto(`/hotel?roomId=${room!.id}`);
    const card = page.locator('aside[aria-label="Booking card"]');
    await expect(card).toContainText('Your rate');
    await expect(card).not.toContainText('Select rate');
    await expect(card.getByText('Pay at the hotel')).toBeVisible();
    await expect(card).toContainText('Nothing is charged now');
  });

  test('a prepaid room says the full amount is charged at booking', async ({ page }) => {
    const window = await getStayWindow();
    const room = window.rooms.find((r) =>
      r.rates.every((x) => x.paymentTiming === 'prepay_full')
    );
    test.skip(!room, 'no prepay_full rate configured');

    await page.goto(`/hotel?roomId=${room!.id}`);
    const card = page.locator('aside[aria-label="Booking card"]');
    await expect(card.getByText('Pay now')).toBeVisible();
    await expect(card).toContainText('charged when you confirm');
  });
});
