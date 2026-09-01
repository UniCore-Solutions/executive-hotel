import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';
import { registerAccount, seedReservation } from './backend';

/**
 * Accounts are real rows behind /api/v1/auth/*, not a `rc_users_v1`
 * localStorage array, and `demo@hotelcollection.com` does not exist. Each
 * test registers what it needs.
 */
test.describe('auth & account', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/account');
    await dismissConsent(page);
  });

  test('signed out: sign-in form is offered', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
    await expect(page.locator('#a-email')).toBeVisible();
    await expect(page.locator('#a-pass')).toBeVisible();
  });

  test('sign in shows the account, then sign out', async ({ page }) => {
    const account = await registerAccount();
    await page.locator('#a-email').fill(account.email);
    await page.locator('#a-pass').fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByRole('heading', { name: `Welcome, ${account.firstName} ${account.lastName}` })
    ).toBeVisible();
    await expect(page.locator('#bk-title')).toContainText('Your bookings');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
  });

  test('wrong credentials show exact error', async ({ page }) => {
    const account = await registerAccount();
    await page.locator('#a-email').fill(account.email);
    await page.locator('#a-pass').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    /* The BFF forwards the backend's own wording ("invalid email or
       password") when it supplies one, and services/auth.ts only falls back
       to "Incorrect email or password." when it does not. */
    await expect(page.getByText(/[Ii]nvalid email or password|Incorrect email or password/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
  });

  test('login form validation', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Enter your password.')).toBeVisible();
  });

  test('register a new account end to end', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await page.getByRole('tab', { name: 'Create account' }).click();
    await page.locator('#r-first').fill('Ines');
    await page.locator('#r-last').fill('Test');
    await page.locator('#r-email').fill(email);
    await page.locator('#r-pass').fill('secret123');
    await page.locator('#r-pass2').fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome, Ines Test' })).toBeVisible();
    await expect(page.getByText('No bookings yet on this email')).toBeVisible();
  });

  test('register validation errors', async ({ page }) => {
    await page.getByRole('tab', { name: 'Create account' }).click();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter your first name.')).toBeVisible();
    await page.locator('#r-email').fill('bogus');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('bookings row renders the stay booked by that account', async ({ page }) => {
    /* Booked through the API as the account, so the reservation links to the
       user's guest row — which is what `myReservations` reads. */
    const account = await registerAccount();
    const reservation = await seedReservation({ account });

    await page.locator('#a-email').fill(account.email);
    await page.locator('#a-pass').fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(reservation.reference)).toBeVisible();
    await expect(page.locator('main')).toContainText('Confirmed');
    await expect(page.getByText(reservation.roomTypeName).first()).toBeVisible();
  });
});
