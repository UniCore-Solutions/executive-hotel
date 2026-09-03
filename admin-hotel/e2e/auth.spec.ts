import { test, expect } from '@playwright/test';

const EMAIL = 'admin@hotelcollection.test';
const PASSWORD = 'admin123';

test('an unauthenticated visitor is redirected to login', async ({ page }) => {
  await page.goto('/hotels');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('a staff account can sign in and reaches the hotels list', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/hotels$/);
  await expect(page.getByRole('heading', { name: 'Hotels' })).toBeVisible();
});

test('rejects a wrong password with an inline error, without navigating away', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill('definitely-wrong');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('the global nav shows every super_admin section', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/hotels$/);

  const sidebar = page.locator('nav[aria-label="Admin navigation"]');
  await expect(sidebar.getByRole('link', { name: 'Hotels' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Platform Settings' })).toBeVisible();
});

test('sign out clears the session and returns to login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/hotels$/);

  await page.getByRole('button', { name: EMAIL }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  // Confirms the session cookie is actually gone, not just a client-side
  // route change — reloading a protected page must bounce to login again.
  await page.goto('/hotels');
  await expect(page).toHaveURL(/\/login$/);
});
