import { test, expect } from '@playwright/test';
import {
  dismissConsent,
  attachNoPageErrors,
  allAvailableCheckin,
  plusDays,
  madAmount,
} from './helpers';

const ROOM = 'executive-suite';

test.describe('booking journey', () => {
  let ci = '';
  let co = '';

  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    ci = allAvailableCheckin();
    co = plusDays(ci, 2);
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1`);
    await dismissConsent(page);
  });

  test('room → plan → booking → payment → confirmation, prices consistent', async ({ page }) => {
    await page.locator(`a[href*="roomId=${ROOM}"]`).first().click();
    await expect(page).toHaveURL(/roomId=executive-suite/);

    const card = page.locator('aside[aria-label="Booking card"]');
    await expect(card).toContainText(`${ci.slice(8, 10)}`);

    await card.locator('label').filter({ hasText: 'Breakfast included' }).click();
    await expect(card).toContainText('Recommended');

    const roomTotal = await card.locator('text=Total').last().locator('..').innerText();
    const roomAmount = madAmount(roomTotal);

    await card.getByRole('button', { name: 'Select room & continue' }).click();
    await expect(page).toHaveURL(/\/booking\?.*room=executive-suite/);

    const summary = page.locator('aside[aria-label="Booking summary"]');
    await expect(summary).toContainText('Executive Suite');
    await expect(summary).toContainText(`${co.slice(8, 10)}`);
    await expect(summary).toContainText('2 nights');

    const summaryTotal = madAmount(await summary.locator('#quote-host').innerText());
    expect(summaryTotal).toBe(roomAmount);

    await page.locator('#details-submit').click();
    for (const msg of [
      'Enter your first name.',
      'Enter your last name.',
      'Enter a valid email address.',
      'Enter a valid phone number.',
    ]) {
      await expect(page.locator(`[role="alert"]`).first()).toBeVisible();
      await expect(page.getByText(msg)).toBeVisible();
    }

    await page.locator('#f-first').fill('Adam');
    await page.locator('#f-last').fill('Benali');
    await page.locator('#f-email').fill('e2e@example.com');
    await page.locator('#f-phone').fill('+212 6 61 23 45 67');
    await page.locator('#details-submit').click();
    await expect(page.locator('#step-payment')).toBeVisible();

    const payTotal = madAmount(await page.locator('#pay-total').innerText());
    expect(payTotal).toBe(roomAmount);

    await page.locator('#p-name').fill('ADAM BENALI');
    await page.locator('#p-number').fill('4000000000000001');
    await page.locator('#p-exp').fill(futureExpiry());
    await page.locator('#p-cvc').fill('123');
    await page.locator('#p-terms').check();
    await page.locator('#pay-submit').click();
    await expect(page.locator('#declined')).toBeVisible();
    await expect(page.locator('#declined')).toContainText('declined');

    await page.locator('#p-number').fill('4000000000004242');
    await page.locator('#pay-submit').click();
    await expect(page).toHaveURL(/\/confirmation\?ref=RC-/);

    const ref = await page.locator('#conf-ref').innerText();
    expect(ref).toMatch(/^RC-[A-Z2-9]{6}$/);
    await expect(page.locator('#conf-email-line')).toContainText('Adam Benali');

    const confTotal = madAmount(await page.locator('#conf-price').innerText());
    expect(confTotal).toBe(payTotal);

    await expect(page.locator('#timeline')).toContainText('Payment');
  });

  test('booking page without params shows missing state', async ({ page }) => {
    await page.goto('/booking');
    await expect(page.locator('#missing')).toContainText('Nothing to book yet');
    await page.getByRole('link', { name: 'Search rooms' }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test('guest session pre-fills details form', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'rc_session_v1',
        JSON.stringify({ email: 'demo@hotelcollection.com', name: 'Adam Benali', at: Date.now() })
      );
    });
    await page.goto(
      `/booking?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1&room=${ROOM}&plan=${ROOM}::bb`
    );
    await expect(page.locator('#f-first')).toHaveValue('Adam');
    await expect(page.locator('#f-email')).toHaveValue('demo@hotelcollection.com');
  });
});

function futureExpiry(): string {
  const d = new Date(Date.now() + 730 * 86400000);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
}
