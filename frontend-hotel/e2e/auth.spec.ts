import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';

test.describe('auth & account', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/account');
    await dismissConsent(page);
  });

  test('signed out: login form with demo hint', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
    await expect(page.getByText('demo@hotelcollection.com / demo1234')).toBeVisible();
  });

  test('login with demo account shows bookings, then sign out', async ({ page }) => {
    await page.locator('#a-email').fill('demo@hotelcollection.com');
    await page.locator('#a-pass').fill('demo1234');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome, Adam Benali' })).toBeVisible();
    await expect(page.locator('#bk-title')).toContainText('Your bookings');
    await expect(page.getByText('RC-DEMO1')).toBeVisible();
    await expect(page.locator('main')).toContainText('Confirmed');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
  });

  test('wrong credentials show exact error', async ({ page }) => {
    await page.locator('#a-email').fill('demo@hotelcollection.com');
    await page.locator('#a-pass').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Incorrect email or password.')).toBeVisible();
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

  test('bookings row renders stay details', async ({ page }) => {
    await page.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('rc_users_v1') ?? '[]');
      users.push({ email: 'guest@demo.com', name: 'Claire Marchetti', password: 'demo1234' });
      localStorage.setItem('rc_users_v1', JSON.stringify(users));
    });
    await page.locator('#a-email').fill('guest@demo.com');
    await page.locator('#a-pass').fill('demo1234');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('RC-DEMO2')).toBeVisible();
    await expect(page.locator('main')).toContainText('Checked in');
    await expect(page.getByText('Superior Double or Twin')).toBeVisible();
  });
});
