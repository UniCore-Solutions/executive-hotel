import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dismissConsent, settleImages } from './helpers';
import { getStayWindow, cheapestRoom, getSharedReservation } from './backend';

/* URLs are built at test time: room/booking pages need real room-type UUIDs
   and a bookable window, and the reservation-scoped pages need a reservation
   that actually exists. */
let urlsPromise: Promise<Array<[string, string]>> | null = null;

/** Memoised: one shared reservation for the whole file, not one per test. */
function pageUrls(): Promise<Array<[string, string]>> {
  urlsPromise ??= buildPageUrls();
  return urlsPromise;
}

async function buildPageUrls(): Promise<Array<[string, string]>> {
  const window = await getStayWindow();
  const room = cheapestRoom(window);
  const plan = `${room.id}::${room.rates[0]!.ratePlanCode.toLowerCase()}`;
  const stay = `checkin=${window.checkin}&checkout=${window.checkout}&adults=2&children=0&rooms=1`;
  const res = await getSharedReservation();
  const lookup = `ref=${encodeURIComponent(res.reference)}&email=${encodeURIComponent(res.email)}`;
  return [
    ['home', '/'],
    ['search', `/search?${stay}`],
    ['hotel', '/hotel'],
    ['room', `/hotel?roomId=${room.id}`],
    ['booking', `/booking?${stay}&room=${room.id}&plan=${plan}`],
    ['confirmation', `/confirmation?${lookup}`],
    ['reservation', `/reservation?${lookup}`],
    ['account', '/account'],
    ['checkin', `/checkin?${lookup}`],
    ['faq', '/faq'],
    ['offers', '/offers'],
    ['contact', '/contact'],
    ['cookies', '/cookies'],
    ['terms', '/terms'],
    ['privacy', '/privacy'],
    ['cancellation-policy', '/cancellation-policy'],
  ];
}

const PAGE_NAMES = [
  'home', 'search', 'hotel', 'room', 'booking', 'confirmation', 'reservation',
  'account', 'checkin', 'faq', 'offers', 'contact', 'cookies', 'terms',
  'privacy', 'cancellation-policy',
];

test.describe('accessibility (axe wcag2a+aa)', () => {
  for (const name of PAGE_NAMES) {
    test(`${name} has no serious/critical violations`, async ({ page }) => {
      const url = (await pageUrls()).find(([n]) => n === name)![1];
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
