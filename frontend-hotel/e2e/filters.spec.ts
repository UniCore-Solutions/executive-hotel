import { test, expect } from '@playwright/test';
import { dismissConsent, allAvailableCheckin, plusDays } from './helpers';

const URL = () => {
  const ci = allAvailableCheckin();
  const co = plusDays(ci, 2);
  return `/search?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1`;
};

test.describe('search filters', () => {
  test('facets narrow results and round-trip through the URL', async ({ page }) => {
    await page.goto(URL());
    await dismissConsent(page);
    await expect(page.locator('main')).toContainText('3 rooms available');

    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Suites' }).click();
    await expect(page).toHaveURL(/f_cat=suite/);
    await expect(page.locator('h2 a')).toHaveCount(1);
    await expect(page.locator('h2 a')).toContainText('Executive Suite');
    await expect(page.locator('main')).toContainText('1 room available');

    await page.reload();
    await expect(page.locator('h2 a')).toHaveCount(1);

    await page.goBack();
    await expect(page).not.toHaveURL(/f_cat=/);
  });

  test('meal-plan facet (Half board) narrows to eligible rooms', async ({ page }) => {
    await page.goto(URL());
    await dismissConsent(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Half board' }).click();
    await expect(page.locator('h2 a')).toHaveCount(2);
  });

  test('combined filters yielding no results show the filtered empty state', async ({ page }) => {
    await page.goto(URL());
    await dismissConsent(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Suites' }).click();
    await page.getByRole('button', { name: 'Under MAD 1,000' }).click();
    await expect(page.getByText('No rooms match those filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear all filters' }).click();
    await expect(page.locator('h2 a')).toHaveCount(3);
    await expect(page).not.toHaveURL(/f_/);
  });

  test('stay-state edit preserves active facets', async ({ page }) => {
    await page.goto(URL());
    await dismissConsent(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Suites' }).click();
    await expect(page.locator('h2 a')).toHaveCount(1);
    await page.locator('#seg-promo').click();
    await page.locator('#promo-input').fill('WELCOME5');
    await page.locator('#promo-apply').click();
    await expect(page).toHaveURL(/f_cat=suite/);
    await expect(page.locator('h2 a')).toHaveCount(1);
  });
});

test.describe('search filters responsive', () => {
  for (const width of [390, 768, 1280]) {
    test(`no horizontal overflow with the filter panel open at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(URL());
      await dismissConsent(page);
      await page.getByRole('button', { name: /Filters/ }).click();
      await page.getByRole('button', { name: 'Suites' }).click();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
