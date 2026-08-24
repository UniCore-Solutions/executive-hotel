import { test, expect } from '@playwright/test';

const EMAIL = 'admin@hotelcollection.test';
const PASSWORD = 'admin123';

test('guest is redirected to login and can sign in', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Azure Bay Resort' })).toBeVisible();
  await expect(page.getByText('admin@hotelcollection.test')).toBeVisible();
});

test('role-aware navigation shows admin sections for super_admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard$/);

  const sidebar = page.locator('aside');
  for (const label of ['Dashboard', 'Hotels', 'Reservations', 'Guests', 'Payments', 'Invoices',
    'Promotions', 'Reviews', 'Notifications', 'Users & roles', 'Audit log']) {
    await expect(sidebar.getByRole('link', { name: new RegExp(label, 'i') })).toBeVisible();
  }
});

test('logout returns to the login screen', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.locator('header').getByRole('button', { name: /admin@hotelcollection.test/i }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await page.waitForURL(/\/login$/);
  await expect(page.getByText('Back Office sign in')).toBeVisible();
});