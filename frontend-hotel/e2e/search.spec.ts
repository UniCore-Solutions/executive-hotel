import { test, expect } from '@playwright/test';
import {
  dismissConsent,
  attachNoPageErrors,
  pickDates,
  setGuests,
} from './helpers';
import { getStayWindow } from './backend';

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    await page.goto('/');
    await dismissConsent(page);
  });

  test('date selection through the calendar updates the segment', async ({ page }) => {
    const { checkin: ci, checkout: co } = await getStayWindow();
    await page.locator('#seg-dates').click();
    await pickDates(page, ci, co);
    await expect(page.locator('#seg-dates')).toContainText('2 nights');
  });

  test('full search flow: dates + guests + submit → results', async ({ page }) => {
    const { checkin: ci, checkout: co } = await getStayWindow({ nights: 3 });
    await page.locator('#seg-dates').click();
    await pickDates(page, ci, co);
    await page.locator('#seg-guests').click();
    // No child here: a child requires an age before results are returned,
    // which the "child without age" test covers on its own.
    await setGuests(page, { adults: 2, children: 0 });
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
    const { checkin: ci, checkout: co } = await getStayWindow();
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=1&rooms=1`);
    await expect(page.getByText('Please select an age for each child.')).toBeVisible();
  });

  test('deep link renders results with availability badges', async ({ page }) => {
    const { checkin: ci, checkout: co } = await getStayWindow();
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1`);
    const { rooms } = await getStayWindow();
    await expect(page.locator('main')).toContainText(`${rooms.length} rooms available`);
    await expect(page.locator('a[href*="roomId="]').first()).toBeVisible();
  });

  test('empty state for impossible party', async ({ page }) => {
    const { checkin: ci, checkout: co } = await getStayWindow();
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=9&children=6&rooms=5`);
    await expect(page.getByText('No rooms match that search')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adjust my search' })).toBeVisible();
  });

  test('price sort re-orders results', async ({ page }) => {
    const { checkin: ci, checkout: co } = await getStayWindow();
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1`);
    const { rooms } = await getStayWindow();
    await page.locator('#sort-select').selectOption({ label: 'Price: low to high' });
    // `rooms` is cheapest-first as priced by the backend for this window.
    const first = await page.locator('h2 a').first().innerText();
    expect(first).toContain(rooms[0]!.name);
    const last = await page.locator('h2 a').last().innerText();
    expect(last).toContain(rooms[rooms.length - 1]!.name);
  });
});
