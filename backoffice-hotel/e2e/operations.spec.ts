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

test('reservations list shows seeded reservation and its detail', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /reservations/i }).click();
  await page.waitForURL(/\/reservations$/);

  await expect(page.getByText('BO-DEMO-0001')).toBeVisible();
  await expect(page.getByText('Maria Silva')).toBeVisible();

  await page.getByRole('row', { name: /BO-DEMO-0001/i }).getByRole('button', { name: /view/i }).click();
  await expect(page.getByText(/Accommodation \(3 nights\)/)).toBeVisible();
  await expect(page.getByText('€680.40').last()).toBeVisible();
});

test('promotions page shows the seeded promotion', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /promotions/i }).click();
  await page.waitForURL(/\/promotions$/);
  await expect(page.getByText('Summer Escape')).toBeVisible();
});

test('users page lists the platform administrator', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /users & roles/i }).click();
  await page.waitForURL(/\/users$/);
  await expect(page.getByText('admin@hotelcollection.test')).toBeVisible();
  await expect(page.getByText('super_admin').first()).toBeVisible();
});

test('audit log page renders entries', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /audit log/i }).click();
  await page.waitForURL(/\/audit$/);
  await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
});