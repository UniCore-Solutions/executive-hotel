import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors, madAmount, quoteTotal, shortDate } from './helpers';
import {
  getStayWindow,
  cheapestRoom,
  payAtPropertyRoom,
  prepaidRoom,
  registerAccount,
  settlePayment,
  trackForCleanup,
  UI_BOOKING_FROM_DAYS,
  type RoomType,
} from './backend';

/* Room resolution + the server-side quote are two sequential backend round
   trips, which can exceed the default 5 s expect timeout on a cold page. */
const QUOTE_TIMEOUT = 25_000;

test.describe('booking journey', () => {
  let ci = '';
  let co = '';
  let room: RoomType;

  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
    // Books for real, so it works in its own date region (see backend.ts).
    const window = await getStayWindow({ fromDays: UI_BOOKING_FROM_DAYS });
    ci = window.checkin;
    co = window.checkout;
    /* This journey walks the card/payment path, so it needs a rate that is
       actually charged at booking — the cheapest room may well be sold on a
       pay-at-property rate, which has no card step at all. */
    room = prepaidRoom(window) ?? cheapestRoom(window);
    await page.goto(`/search?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1`);
    await dismissConsent(page);
  });

  test('room → plan → booking → payment → confirmation, prices consistent', async ({ page }) => {
    await page.locator(`a[href*="roomId=${room.id}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`roomId=${room.id}`));

    const card = page.locator('aside[aria-label="Booking card"]');
    await expect(card).toContainText(shortDate(ci));

    // Which rate plans exist is seeded data, so book whichever plan the card
    // has selected by default rather than naming one.
    /* The card prices via a live server quote, so wait for a real total
       rather than reading a still-empty node. */
    await expect(card).toContainText('MAD', { timeout: QUOTE_TIMEOUT });
    const roomAmount = await quoteTotal(card);
    expect(roomAmount).not.toBeNull();

    await card.getByRole('button', { name: 'Select room & continue' }).click();
    await expect(page).toHaveURL(new RegExp(`/booking\\?.*room=${room.id}`));

    const summary = page.locator('aside[aria-label="Booking summary"]');
    await expect(summary).toContainText(room.name, { timeout: QUOTE_TIMEOUT });
    await expect(summary).toContainText(shortDate(ci));
    await expect(summary).toContainText(shortDate(co));
    await expect(summary).toContainText('2 nights');

    await expect(summary.locator('#quote-host')).toContainText('Total', {
      timeout: QUOTE_TIMEOUT,
    });
    const summaryTotal = await quoteTotal(summary.locator('#quote-host'));
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
    await page.locator('#p-number').fill('4000000000004242');
    await page.locator('#p-exp').fill(futureExpiry());
    await page.locator('#p-cvc').fill('123');
    await page.locator('#p-terms').check();
    await page.locator('#pay-submit').click();

    /* Payment is asynchronous and backend-authoritative: the client only
       STARTS an attempt and is redirected with status=processing, then polls.
       The card number never reaches the backend, so it cannot decide the
       outcome — the provider does. We play the provider. */
    await expect(page).toHaveURL(/\/confirmation\?ref=RC-/);

    /* Take the reference from the URL, not from the page: while the payment
       is unsettled the confirmation shows its processing state and #conf-ref
       has not rendered yet. */
    const ref = new URL(page.url()).searchParams.get('ref')!;
    expect(ref).toMatch(/^RC-[A-Z2-9]{6}$/);

    trackForCleanup(ref, 'e2e@example.com');
    await settlePayment(ref);

    await expect(page.locator('#conf-ref')).toHaveText(ref, { timeout: QUOTE_TIMEOUT });

    await expect(page.locator('#conf-email-line')).toContainText('Adam Benali');
    const confTotal = await quoteTotal(page.locator('#conf-price'));
    expect(confTotal).toBe(payTotal);
    await expect(page.locator('#timeline')).toContainText('Payment');
  });

  test('booking page without params shows missing state', async ({ page }) => {
    await page.goto('/booking');
    await expect(page.locator('#missing')).toContainText('Nothing to book yet');
    await page.getByRole('link', { name: 'Search rooms' }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test('a signed-in guest has their details pre-filled', async ({ page }) => {
    /* Sessions are httpOnly cookies issued by /api/auth/login, not the old
       `rc_session_v1` localStorage blob — so sign in for real. */
    const account = await registerAccount();
    await page.goto('/account');
    await dismissConsent(page);
    await page.locator('#a-email').first().fill(account.email);
    await page.locator('#a-pass').first().fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('heading', { name: `Welcome, ${account.firstName} ${account.lastName}` })
    ).toBeVisible();

    await page.goto(
      `/booking?checkin=${ci}&checkout=${co}&adults=2&children=0&rooms=1` +
        `&room=${room.id}&plan=${bookingPlanId(room)}`
    );
    await expect(page.locator('#f-first')).toHaveValue(account.firstName, {
      timeout: QUOTE_TIMEOUT,
    });
    await expect(page.locator('#f-email')).toHaveValue(account.email);
  });

  /* A pay-at-property rate takes nothing at booking: no card is asked for,
     the reservation is confirmed outright, and — because it carries no
     payment hold — the expiry job never cancels it. */
  test('a pay-at-property rate confirms without taking a card', async ({ page }) => {
    const window = await getStayWindow({ fromDays: UI_BOOKING_FROM_DAYS });
    const papRoom = payAtPropertyRoom(window);
    test.skip(!papRoom, 'no pay-at-property rate configured');
    const plan = `${papRoom!.id}::${papRoom!.rates[0]!.ratePlanCode.toLowerCase()}`;

    await page.goto(
      `/booking?checkin=${window.checkin}&checkout=${window.checkout}` +
        `&adults=2&children=0&rooms=1&room=${papRoom!.id}&plan=${plan}`
    );
    await dismissConsent(page);

    await page.locator('#f-first').fill('Nadia');
    await page.locator('#f-last').fill('Cherkaoui');
    await page.locator('#f-email').fill('pap-e2e@example.com');
    await page.locator('#f-phone').fill('+212 6 61 23 45 67');
    await page.locator('#details-submit').click();

    // No card form at all — asking for one would contradict the rate.
    await expect(page.locator('#pay-at-property')).toBeVisible({ timeout: QUOTE_TIMEOUT });
    await expect(page.locator('#p-number')).toHaveCount(0);
    await expect(page.locator('#pay-label')).toHaveText('Confirm booking');

    await page.locator('#p-terms').check();
    await page.locator('#pay-submit').click();

    // Straight to a settled confirmation: no status=processing, no polling.
    await expect(page).toHaveURL(/\/confirmation\?ref=RC-/);
    await expect(page).not.toHaveURL(/status=processing/);
    const ref = new URL(page.url()).searchParams.get('ref')!;
    trackForCleanup(ref, 'pap-e2e@example.com');

    await expect(page.locator('#conf-ref')).toHaveText(ref, { timeout: QUOTE_TIMEOUT });
    await expect(page.locator('#conf-price')).toContainText('Nothing charged');
  });
});

/** Plan id as the app builds it: `${roomTypeId}::${ratePlanCode.toLowerCase()}`
    (catalog.ts `ratePlansForRoom`). Derived, never written down, because the
    codes are seeded data. */
function bookingPlanId(room: RoomType): string {
  return `${room.id}::${room.rates[0]!.ratePlanCode.toLowerCase()}`;
}

function futureExpiry(): string {
  const d = new Date(Date.now() + 730 * 86400000);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
}