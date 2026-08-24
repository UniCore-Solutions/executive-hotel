import { expect, test } from '@playwright/test';

/* Second homepage variant — hero, upper search bar, discover section, cards. */
test.describe('index-2 variant', () => {
  test('loads with hero, search and discover sections', async ({ page }) => {
    await page.goto('/index-2');
    await expect(page.locator('[data-hero]')).toBeVisible();
    await expect(
      page
        .locator('[data-hero-search] [role="search"], [data-hero-search] [data-open-sheet]')
        .first()
    ).toBeVisible();
    await expect(page.locator('#discover-title')).toHaveText('Discover new ways to stay');
    await expect(page.locator('#searchbar')).toBeVisible();
    await expect(page.locator('#plan-title')).toBeVisible();
  });

  test('search bar sits in the upper portion of the hero', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/index-2');
    const hero = await page.locator('[data-hero]').boundingBox();
    const search = await page.locator('[data-hero-search]').boundingBox();
    expect(hero).not.toBeNull();
    expect(search).not.toBeNull();
    expect(search!.y - hero!.y).toBeLessThan(hero!.height * 0.65);
  });

  test('responsive: no overflow, single visible search field, cards stack', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index-2');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBe(0);
    await expect(page.locator('[data-open-sheet]')).toHaveCount(1);
    const cards = page
      .locator('section')
      .filter({ has: page.getByText('Discover new ways to stay') })
      .locator('li');
    await expect(cards).toHaveCount(6);
    const cols = new Set(
      await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)))
    );
    expect(cols.size).toBe(1);
  });
});
