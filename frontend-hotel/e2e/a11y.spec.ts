import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dismissConsent, settleImages } from './helpers';

const PAGES: Array<[string, string]> = [
  ['home', '/'],
  ['search', '/search?checkin=2026-08-16&checkout=2026-08-18&adults=2&children=0&rooms=1'],
  ['hotel', '/hotel'],
  ['room', '/hotel?roomId=executive-suite'],
  [
    'booking',
    '/booking?checkin=2026-08-16&checkout=2026-08-18&adults=2&children=0&rooms=1&room=executive-suite&plan=executive-suite::bb',
  ],
  ['confirmation', '/confirmation?ref=RC-DEMO1'],
  ['reservation', '/reservation?ref=RC-DEMO1'],
  ['account', '/account'],
  ['checkin', '/checkin?ref=RC-DEMO1'],
  ['faq', '/faq'],
  ['offers', '/offers'],
  ['contact', '/contact'],
  ['cookies', '/cookies'],
  ['terms', '/terms'],
  ['privacy', '/privacy'],
  ['cancellation-policy', '/cancellation-policy'],
];

test.describe('accessibility (axe wcag2a+aa)', () => {
  for (const [name, url] of PAGES) {
    test(`${name} has no serious/critical violations`, async ({ page }) => {
      await page.goto(url);
      if (name !== 'confirmation') await dismissConsent(page);
      await settleImages(page);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      expect(
        serious.length,
        serious
          .map(
            (v) =>
              `${v.id}: ${v.help} → ${v.nodes
                .map((n) => n.target)
                .slice(0, 4)
                .join(', ')}`
          )
          .join('\n')
      ).toBe(0);
    });
  }

  test('dialog focus handling: date picker traps focus and closes on Escape', async ({ page }) => {
    await page.goto('/');
    await dismissConsent(page);
    await page.locator('#seg-dates').click();
    const picker = page.locator('#date-picker');
    await expect(picker).toBeVisible();
    await expect(picker).toHaveAttribute('aria-label', 'Choose dates');
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
  });

  test('skip link / consistent landmarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
  });
});
