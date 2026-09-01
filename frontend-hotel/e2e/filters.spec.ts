import { test, expect } from '@playwright/test';
import { dismissConsent, pickDates } from './helpers';
import { getStayWindow, suiteRoom } from './backend';

const URL = async () => {
  const { checkin, checkout } = await getStayWindow();
  return `/search?checkin=${checkin}&checkout=${checkout}&adults=2&children=0&rooms=1`;
};

test.describe('search filters', () => {
  test('facets narrow results and round-trip through the URL', async ({ page }) => {
    await page.goto(await URL());
    await dismissConsent(page);
    const { rooms } = await getStayWindow();
    await expect(page.locator('main')).toContainText(`${rooms.length} rooms available`);

    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Suites' }).click();
    await expect(page).toHaveURL(/f_cat=suite/);
    await expect(page.locator('h2 a')).toHaveCount(1);
    const suite = suiteRoom(await getStayWindow());
    expect(suite, 'no suite room type in this window').toBeTruthy();
    await expect(page.locator('h2 a')).toContainText(suite!.name);
    await expect(page.locator('main')).toContainText('1 room available');

    await page.reload();
    await expect(page.locator('h2 a')).toHaveCount(1);

    await page.goBack();
    await expect(page).not.toHaveURL(/f_cat=/);
  });

  test('meal-plan facet narrows to rooms offering that board', async ({ page }) => {
    // Which board exists is a property of the seeded rate plans, so derive
    // the expected count from the rates the API returned for this window.
    const { rooms } = await getStayWindow();
    const withBreakfast = rooms.filter((r) =>
      r.rates.some((x) => (x.mealPlan ?? '').toLowerCase() === 'breakfast')
    );
    expect(withBreakfast.length, 'no breakfast rate in this window').toBeGreaterThan(0);

    await page.goto(await URL());
    await dismissConsent(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Bed & Breakfast' }).click();
    await expect(page.locator('h2 a')).toHaveCount(withBreakfast.length);
  });

  test('combined filters yielding no results show the filtered empty state', async ({ page }) => {
    await page.goto(await URL());
    await dismissConsent(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Suites' }).click();
    await page.getByRole('button', { name: 'Under MAD 1,000' }).click();
    await expect(page.getByText('No rooms match those filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear all filters' }).click();
    const { rooms } = await getStayWindow();
    await expect(page.locator('h2 a')).toHaveCount(rooms.length);
    await expect(page).not.toHaveURL(/f_/);
  });

  test('stay-state edit preserves active facets', async ({ page }) => {
    /* The SearchBar no longer has a promo segment (only seg-dest / seg-dates
       / seg-guests), so the stay edit here is a date change. */
    await page.goto(await URL());
    await dismissConsent(page);
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Suites' }).click();
    await expect(page.locator('h2 a')).toHaveCount(1);

    const later = await getStayWindow({ nights: 3 });
    await page.locator('#seg-dates').click();
    await pickDates(page, later.checkin, later.checkout);
    await expect(page).toHaveURL(new RegExp(`checkin=${later.checkin}`));
    await expect(page).toHaveURL(/f_cat=suite/);
    await expect(page.locator('h2 a')).toHaveCount(1);
  });
});

test.describe('search filters responsive', () => {
  for (const width of [390, 768, 1280]) {
    test(`no horizontal overflow with the filter panel open at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(await URL());
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
