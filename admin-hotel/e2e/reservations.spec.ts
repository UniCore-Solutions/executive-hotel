import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'admin@hotelcollection.test';
const PASSWORD = 'admin123';
const HOTEL_ID = '00000000-0000-0000-0000-000000000001'; // seeded Executive Hotel

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

test('reservations list loads with real bookings, not an error state', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/reservations`);

  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
  await expectsNoError(page);
  // Every reservation reference in this app follows the backend's RC-xxxxxx
  // format (BookingService), so at least one should be on the seeded data.
  await expect(page.getByText(/^RC-/).first()).toBeVisible();
});

test('cancelled reservations never appear in "Arrivals today" (regression: this session’s fix)', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/dashboard`);
  await expectsNoError(page);

  // The arrivals heading's grandparent div wraps both the "Arrivals today
  // (N)" header row and the list/empty-state block below it (see
  // DashboardPage's OpsList) — scoping there instead of the whole page
  // means this doesn't get confused by a "Cancelled" badge legitimately
  // shown elsewhere, e.g. in Recent reservations.
  const arrivalsHeading = page.getByRole('heading', { name: /Arrivals today/ });
  const arrivalsBlock = arrivalsHeading.locator('xpath=../..');
  await expect(arrivalsBlock.getByText('Cancelled', { exact: true })).toHaveCount(0);
});

test('guests list loads without error', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/guests`);
  await expect(page.getByRole('heading', { name: 'Guests' })).toBeVisible();
  await expectsNoError(page);
});

test('payments list loads without error', async ({ page }) => {
  await signIn(page);
  await page.goto(`/hotels/${HOTEL_ID}/payments`);
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
  await expectsNoError(page);
});
