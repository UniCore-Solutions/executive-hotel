import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'admin@hotelcollection.test';
const PASSWORD = 'admin123';
const HOTEL_ID = '00000000-0000-0000-0000-000000000001'; // seeded Executive Hotel (active)
const INACTIVE_HOTEL_ID = '00000000-0000-0000-0000-000000000002'; // seeded Dar Zellij (inactive)

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/hotels$/);
}

async function expectsNoError(page: Page) {
  await expect(page.getByText("Couldn't load this")).not.toBeVisible();
  await expect(page.getByText(/internal error/i)).not.toBeVisible();
}

test('room types list shows the seeded room types', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/room-types`);

  await expect(page.getByRole('heading', { name: 'Room Types' })).toBeVisible();
  await expectsNoError(page);
  await expect(page.getByText('Deluxe Sea View')).toBeVisible();
  await expect(page.getByText('Family Suite')).toBeVisible();
});

test('rate plans list shows the seeded rate plan and its linked room types', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/rate-plans`);

  await expect(page.getByRole('heading', { name: 'Rate Plans' })).toBeVisible();
  await expectsNoError(page);
  await expect(page.getByText('Bed & Breakfast Flex')).toBeVisible();
});

test('availability calendar loads the inventory grid without error', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/availability`);

  await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible();
  await expectsNoError(page);
  await expect(page.getByText('Deluxe Sea View')).toBeVisible();
});

test('hotel settings page loads the profile form pre-filled with real data', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/settings`);

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expectsNoError(page);
  await expect(page.getByLabel('Name')).toHaveValue('Executive Hotel');
});

test('settings page loads for an inactive hotel too (regression: this session’s "hotel not found" fix)', async ({ page }) => {
  // Settings used to fetch policies through the guest-facing `hotelDetails`
  // query, which 404s on any non-active hotel by design (guests shouldn't
  // see draft/inactive properties) — that made staff unable to open
  // Settings at all for a hotel that wasn't currently active. Fixed by
  // moving `policies` onto the admin-only `adminHotel` query instead.
  await signIn(page);
  await page.goto(`/hotels/${INACTIVE_HOTEL_ID}/settings`);

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expectsNoError(page);
  await expect(page.getByText('hotel not found')).not.toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('Dar Zellij');
});
