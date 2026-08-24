import { test, expect } from '@playwright/test';
import {
  dismissConsent,
  attachNoPageErrors,
  pickDates,
  setGuests,
  allAvailableCheckin,
  plusDays,
} from './helpers';

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/');
    await dismissConsent(page);
  });

  test('date selection through the calendar updates the segment', async ({ page }) => {
    const ci = allAvailableCheckin();
    const co = plusDays(ci, 2);
    await page.locator('#seg-dates').click();
    await pickDates(page, ci, co);
    await expect(page.locator('#seg-dates')).toContainText('2 nights');
  });

  test('full search flow: dates + guests + submit → results', async ({ page }) => {
    const ci = allAvailableCheckin();
    const co = plusDays(ci, 3);
    await page.locator('#seg-dates').click();
    await pickDates(page, ci, co);
    await page.locator('#seg-guests').click();
    await setGuests(page, { adults: 2, children: 1 });
    await page.locator('#search-submit').click();
    await expect(page).toHaveURL(/\/search\?.*checkin=/);
    await expect(page.locator('main')).toContainText('rooms available');
  });

  test('validation: submit without dates shows toast', async ({ page }) => {
    await page.locator('#search-submit').click();
    await expect(page.getByText('Please complete your search')).toBeVisible();
    await expect(page.getByText('Please choose your check-in and check-out dates.')).toBeVisible();
  });

  test('validation: child without age', async ({ page }) => {
    const ci = allAvailableCheckin();
    const co = plusDays(ci, 2);
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=1&rooms=1`);
    await expect(page.getByText('Please select an age for each child.')).toBeVisible();
  });

  test('deep link renders results with availability badges', async ({ page }) => {
    const ci = allAvailableCheckin();
    const co = plusDays(ci, 2);
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1`);
    await expect(page.locator('main')).toContainText(`${3} rooms available`);
    await expect(page.locator('a[href*="roomId="]').first()).toBeVisible();
  });

  test('empty state for impossible party', async ({ page }) => {
    const ci = allAvailableCheckin();
    const co = plusDays(ci, 2);
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=9&children=6&rooms=5`);
    await expect(page.getByText('No rooms match that search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adjust my search' })).toBeVisible();
  });

  test('price sort re-orders results', async ({ page }) => {
    const ci = allAvailableCheckin();
    const co = plusDays(ci, 2);
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1`);
    await page.locator('#sort-select').selectOption({ label: 'Price: low to high' });
    const first = await page.locator('h2 a').first().innerText();
    expect(first).toContain('Double or Twin');
    const last = await page.locator('h2 a').last().innerText();
    expect(last).toContain('Executive Suite');
  });
});
