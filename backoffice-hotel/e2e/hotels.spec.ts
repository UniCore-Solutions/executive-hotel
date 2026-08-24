import { test, expect } from '@playwright/test';

const EMAIL = 'admin@hotelcollection.test';
const PASSWORD = 'admin123';

async function signIn(page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard$/);
}

test('dashboard shows seeded stats and recent reservation', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText('BO-DEMO-0001')).toBeVisible();
  await expect(page.getByText('Maria Silva')).toBeVisible();
});

test('hotel list shows the seeded demo hotel', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /hotels/i }).first().click();
  await page.waitForURL(/\/hotels$/);
  await expect(page.getByText('Azure Bay Resort')).toBeVisible();
});

test('hotel workspace shows room types, rooms, rate plans and availability', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /hotels/i }).first().click();
  await page.waitForURL(/\/hotels$/);
  await page.getByRole('link', { name: /azure bay resort/i }).click();
  await page.waitForURL(/\/hotels\/\d+$/);

  await expect(page.getByRole('heading', { name: 'Azure Bay Resort' })).toBeVisible();

  await page.getByRole('tab', { name: /room types/i }).click();
  await expect(page.getByText('Deluxe Sea View')).toBeVisible();

  await page.getByRole('tab', { name: /^rooms/i }).click();
  await expect(page.getByText('101')).toBeVisible();

  await page.getByRole('tab', { name: /rate plans/i }).click();
  await expect(page.getByText('Standard Rate')).toBeVisible();
  await expect(page.getByText(/€189\.00/)).toBeVisible();

  await page.getByRole('tab', { name: /availability/i }).click();
  await expect(page.getByText(/inventory for the next/i)).toBeVisible();
});

test('creates a new hotel and a room type in it', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /hotels/i }).first().click();
  await page.waitForURL(/\/hotels$/);
  await page.getByRole('link', { name: /new hotel/i }).click();
  await page.waitForURL(/\/hotels\/new$/);

  await page.getByLabel('Name').fill('Coral Cliff Inn');
  await page.getByLabel('Brand').fill('Hotel Collection');
  await page.getByLabel('City').fill('Malaga');
  await page.getByLabel('Country').click();
  await page.getByRole('option', { name: 'Spain' }).click();
  await page.getByLabel('Default currency').click();
  await page.getByRole('option', { name: 'EUR' }).click();
  await page.getByRole('button', { name: /create hotel/i }).click();

  await page.waitForURL(/\/hotels\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Coral Cliff Inn' })).toBeVisible();

  await page.getByRole('tab', { name: /room types/i }).click();
  await page.getByRole('button', { name: /new room type/i }).click();
  await page.getByLabel('Name').fill('Garden View');
  await page.getByLabel('Max adults').fill('2');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Garden View')).toBeVisible();
});