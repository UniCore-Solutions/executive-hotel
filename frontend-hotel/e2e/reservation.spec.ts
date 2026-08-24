import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';

test.describe('reservation management', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/reservation');
    await dismissConsent(page);
  });

  test('lookup validation and miss', async ({ page }) => {
    await page.getByRole('button', { name: 'Find my stay' }).click();
    await expect(page.locator('#lookup-msg')).toContainText(
      'Please enter both your reference and email address.'
    );
    await page.locator('#lk-ref').fill('RC-NOPE9');
    await page.locator('#lk-email').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Find my stay' }).click();
    await expect(page.locator('#lookup-msg')).toContainText(
      'No reservation found for those details.'
    );
  });

  test('deep link shows confirmed reservation with extras panel', async ({ page }) => {
    await page.goto('/reservation?ref=RC-DEMO1');
    await expect(page.locator('#view')).toBeVisible();
    await expect(page.locator('#view-ref')).toHaveText('RC-DEMO1');
    await expect(page.locator('#status-banner')).toContainText('Confirmed');
    await expect(page.locator('#cancel-policy-line')).toContainText('Free cancellation until');
    await page
      .locator('#extra-panel')
      .getByRole('checkbox', { name: 'Late check-out (14:00)' })
      .check();
    await expect(page.locator('#extra-delta')).toContainText('New balance with extras');
    await page.locator('#extra-add').click();
    await expect(page.getByText('Your extras were added')).toBeVisible();
  });

  test('cancel flow with fee context', async ({ page }) => {
    await page.goto('/reservation?ref=RC-DEMO1');
    await page.locator('#cancel-btn').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toContainText('Cancel reservation RC-DEMO1?');
    await dialog.getByRole('button', { name: 'Keep my stay' }).click();
    await expect(page.locator('#view-ref')).toBeVisible();
    await page.locator('#cancel-btn').click();
    await dialog.getByRole('button', { name: 'Cancel reservation' }).click();
    await expect(page.getByText('Your reservation has been cancelled.')).toBeVisible();
    await expect(page.locator('#status-banner')).toContainText('Cancelled');
  });

  test('modify dialog validates past dates', async ({ page }) => {
    await page.goto('/reservation?ref=RC-DEMO1');
    await page.getByRole('button', { name: /Change dates or guests/ }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toContainText('Change your stay');
    await dialog.locator('#m-checkin').fill('2020-01-01');
    await dialog.getByRole('button', { name: 'Apply changes' }).click();
    await expect(dialog).toContainText('Check-in cannot be in the past.');
    await dialog.getByRole('button', { name: 'Keep current stay' }).click();
  });

  test('checked-in seed shows checked-in copy', async ({ page }) => {
    await page.goto('/reservation?ref=RC-DEMO2');
    await expect(page.locator('#status-banner')).toContainText('Confirmed');
    await expect(page.locator('#view')).toContainText('3,631');
  });
});
