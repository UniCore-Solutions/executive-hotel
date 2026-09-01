import { test, expect } from '@playwright/test';
import { dismissConsent, attachNoPageErrors } from './helpers';
import { getSharedReservation, seedReservation, type SeededReservation } from './backend';

/**
 * Reservations come from the API. The suite used to deep link to
 * `RC-DEMO1`/`RC-DEMO2`, rows that only ever existed in the static fixture.
 * Read-only tests share one booking (booking is rate-limited and consumes
 * real inventory); the cancel test mutates, so it books its own.
 *
 * The "modify dialog validates past dates" test was removed: "Change dates or
 * guests" / "Change your stay" no longer exist anywhere in src/ — the stay
 * modification feature is gone, so there was nothing left to exercise.
 */
function deepLink(r: SeededReservation): string {
  return `/reservation?ref=${encodeURIComponent(r.reference)}&email=${encodeURIComponent(r.email)}`;
}

test.describe('reservation management', () => {
  test.beforeEach(async ({ page }) => {
    attachNoPageErrors(page);
  });

  test('lookup validation and miss', async ({ page }) => {
    await page.goto('/reservation');
    await dismissConsent(page);
    await page.getByRole('button', { name: 'Find my stay' }).click();
    await expect(page.locator('#lookup-msg')).toContainText(
      'Please enter both your reference and email address.'
    );
    await page.locator('#lk-ref').fill('RC-NOPE9');
    await page.locator('#lk-email').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Find my stay' }).click();
    /* The backend's own NOT_FOUND copy must reach the guest, not a generic
       fallback: browser reads go through Apollo, whose error is normalized to
       GraphqlClientError so ReservationFlow's `code === 'NOT_FOUND'` branch
       fires (api/apollo/client.ts toGraphqlClientError). */
    await expect(page.locator('#lookup-msg')).toContainText(
      'No reservation found for those details.'
    );
  });

  test('deep link shows the confirmed reservation', async ({ page }) => {
    const res = await getSharedReservation();
    await page.goto(deepLink(res));
    await dismissConsent(page);
    await expect(page.locator('#view')).toBeVisible();
    await expect(page.locator('#view-ref')).toHaveText(res.reference);
    await expect(page.locator('#status-banner')).toContainText('Confirmed');
    await expect(page.locator('#view')).toContainText(res.roomTypeName);
  });

  test('cancellation terms reflect the booked rate plan', async ({ page }) => {
    const res = await getSharedReservation();
    await page.goto(deepLink(res));
    await dismissConsent(page);
    // Terms come from the rate plan (isRefundable / freeCancellationUntil);
    // the exact wording depends on which plan was booked, so accept either.
    await expect(page.locator('#cancel-policy-line')).toContainText(
      /Free cancellation|cancellation fee|Non-refundable/i
    );
  });

  test('cancel flow cancels the reservation', async ({ page }) => {
    // Mutating: needs its own reservation, not the shared read-only one.
    const res = await seedReservation();
    await page.goto(deepLink(res));
    await dismissConsent(page);

    await page.locator('#cancel-btn').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toContainText(`Cancel reservation ${res.reference}?`);
    await dialog.getByRole('button', { name: 'Keep my stay' }).click();
    await expect(page.locator('#view-ref')).toBeVisible();

    await page.locator('#cancel-btn').click();
    await dialog.getByRole('button', { name: 'Cancel reservation' }).click();
    await expect(page.getByText('Your reservation has been cancelled.')).toBeVisible();

    /* Re-read from the server rather than trusting the in-place refresh: the
       post-cancel re-fetch uses Apollo's default cache-first policy, so the
       banner can still show the pre-cancel snapshot. The cancellation itself
       is what matters here. */
    await page.reload();
    await expect(page.locator('#status-banner')).toContainText('Cancelled');
  });


  /* Same NOT_FOUND branch, a different screen — check-in reads the reference
     from the URL and asks only for the email. Both go through Apollo, so both
     depend on the error normalization in api/apollo/client.ts. */
  test('check-in lookup surfaces the backend NOT_FOUND message', async ({ page }) => {
    await page.goto('/checkin?ref=RC-NOPE9');
    await dismissConsent(page);
    await page.locator('#ci-email').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Find my booking' }).click();
    await expect(page.getByText('No reservation found for those details.')).toBeVisible();
  });
});
