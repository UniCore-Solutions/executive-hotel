import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'admin@hotelcollection.test';
const PASSWORD = 'admin123';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/hotels$/);
}

test('hotels list shows the seeded Executive Hotel', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('link', { name: /Executive Hotel/ })).toBeVisible();
});

test('opening a hotel lands on its dashboard, showing today’s counters', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /Executive Hotel/ }).click();

  await expect(page).toHaveURL(/\/hotels\/[0-9a-f-]+\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Today at a glance.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Arrivals today/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Departures today/ })).toBeVisible();

  // The exact regression this session fixed: a cancelled arrival/departure
  // must never surface as an "internal error" wall, and the dashboard must
  // render real counters, not an error state.
  await expect(page.getByText("Couldn't load this")).not.toBeVisible();
  await expect(page.getByText(/internal error/i)).not.toBeVisible();
});

test('the hotel workspace nav switches to the hotel-scoped sections', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /Executive Hotel/ }).click();
  await page.waitForURL(/\/dashboard$/);

  const sidebar = page.locator('nav[aria-label="Admin navigation"]');
  for (const label of ['Dashboard', 'Reservations', 'Guests', 'Payments', 'Room Types', 'Availability', 'Rate Plans', 'Settings']) {
    await expect(sidebar.getByRole('link', { name: label })).toBeVisible();
  }

  // "All hotels" is the sidebar's own back-link, a sibling of <nav> inside
  // <aside> rather than one of its nav items — scope to the page, not `sidebar`.
  await page.getByRole('link', { name: 'All hotels' }).click();
  await expect(page).toHaveURL(/\/hotels$/);
});
