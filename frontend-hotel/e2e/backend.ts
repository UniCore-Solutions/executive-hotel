/**
 * Backend data for the e2e suite.
 *
 * The suite used to assert against `src/data/` — the static fixture — whose
 * hotel ("Executive Boutique Hotel Rabat") and room slugs
 * ("executive-suite", …) no longer exist anywhere the app reads. Every route
 * now resolves through the backend: `/hotel` redirects to the canonical
 * hotel's UUID and `/room/<id>` 404s unless `<id>` is a real room-type UUID.
 *
 * So nothing here is hardcoded. Identifiers, names and bookable dates are
 * discovered from the running API at test time, and fixtures that need a
 * reservation create a real one. That keeps the suite correct across reseeds
 * and price/date changes, at the cost of requiring the stack to be up.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Mirrors next.config.ts's BACKEND_INTERNAL default. */
const API_URL = process.env.E2E_API_URL ?? process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180';

/** Mirrors app.payments.webhook-secret; see docker-compose.yml / .env. */
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? 'dev-webhook-secret-123';

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status} — is the backend up at ${API_URL}?`);
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors?.length)
    throw new Error(`GraphQL: ${body.errors.map((e) => e.message).join('; ')}`);
  if (!body.data) throw new Error('GraphQL returned no data');
  return body.data;
}

/**
 * POST to the backend, waiting out the rate limiter.
 *
 * RateLimitFilter allows 5 reservations and 10 payments per IP per minute
 * (and notes the integration suite disables it wholesale for this reason).
 * The e2e suite books real rooms, so it can brush that ceiling; rather than
 * turn the limiter off in a shared environment, back off and retry.
 */
async function rest<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_URL}/api${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as T;
    if (res.status !== 429 || attempt >= 4) {
      throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
    }
    // The limiter's window is one minute; wait out a slice of it.
    await new Promise((r) => setTimeout(r, 20_000));
  }
}

export interface Hotel {
  id: string;
  name: string;
  city: string | null;
}

export interface RoomType {
  id: string;
  name: string;
  slug: string;
  /** Cheapest nightly rate across this room's plans, for sort assertions. */
  pricePerNight: number;
  rates: Array<{
    ratePlanId: string;
    ratePlanCode: string;
    mealPlan: string | null;
    pricePerNight: number;
  }>;
}

export interface StayWindow {
  checkin: string;
  checkout: string;
  nights: number;
  /** Room types bookable in this window, cheapest first. */
  rooms: RoomType[];
}

/* Discovery is memoised: workers=1, and this reference data cannot change
   mid-run. Keeps a full suite to a handful of API calls. */
let hotelCache: Hotel | null = null;
const windowCache = new Map<string, StayWindow>();

export async function getHotel(): Promise<Hotel> {
  if (hotelCache) return hotelCache;
  const d = await gql<{ canonicalHotel: Hotel }>('{ canonicalHotel { id name city } }');
  if (!d.canonicalHotel) throw new Error('no canonical hotel — is the database seeded?');
  hotelCache = d.canonicalHotel;
  return hotelCache;
}

const STAY_SEARCH = `
  query($i: StaySearchInput!) {
    staySearch(input: $i) {
      status
      capacityFits
      roomType { id name slug pricePerNight }
      rates { ratePlanId ratePlanCode mealPlan pricePerNight paymentTiming }
    }
  }`;

interface StaySearchRow {
  status: string;
  capacityFits: boolean;
  roomType: { id: string; name: string; slug: string; pricePerNight: number | null };
  rates: RoomType['rates'];
}

function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** iso + n days. */
export function plusDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d! + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * First stay window (searching forward from `fromDays`) in which EVERY active
 * room type is available and fits the party. Asks the real availability
 * engine rather than replaying the fixture's hash, so the dates a test books
 * are dates the backend agrees are bookable.
 */
export async function getStayWindow(
  opts: {
    nights?: number;
    adults?: number;
    children?: number;
    rooms?: number;
    fromDays?: number;
    /** Skip the cache and re-probe. Seeding books real inventory, so a cached
        window goes stale — its rooms sell out under repeated seeding. */
    fresh?: boolean;
  } = {}
): Promise<StayWindow> {
  const { nights = 2, adults = 2, children = 0, rooms = 1, fromDays = 2, fresh = false } = opts;
  const key = JSON.stringify({ nights, adults, children, rooms, fromDays });
  const cached = fresh ? undefined : windowCache.get(key);
  if (cached) return cached;

  const hotel = await getHotel();
  for (let d = fromDays; d <= fromDays + 60; d++) {
    const checkin = iso(d);
    const checkout = plusDays(checkin, nights);
    const { staySearch } = await gql<{ staySearch: StaySearchRow[] }>(STAY_SEARCH, {
      i: {
        hotelId: hotel.id,
        checkInDate: checkin,
        checkOutDate: checkout,
        adults,
        children,
        rooms,
      },
    });
    const ok = staySearch.filter((r) => r.status === 'available' && r.capacityFits);
    if (ok.length === 0 || ok.length !== staySearch.length) continue;

    const window: StayWindow = {
      checkin,
      checkout,
      nights,
      rooms: ok
        .map((r) => ({
          id: r.roomType.id,
          name: r.roomType.name,
          slug: r.roomType.slug,
          pricePerNight: Math.min(...r.rates.map((x) => x.pricePerNight)),
          rates: r.rates,
        }))
        .sort((a, b) => a.pricePerNight - b.pricePerNight),
    };
    if (!fresh) windowCache.set(key, window);
    return window;
  }
  throw new Error(`no window with all rooms available in the 60 days after +${fromDays}d`);
}

/**
 * A window in which at least `count` room types are bookable, scanning a long
 * horizon. Seeding books real inventory and room types here have as few as
 * two physical rooms, so insisting every type is free (getStayWindow) runs
 * out of dates quickly. Never cached — the answer changes as tests book.
 */
export async function getBookableWindow(
  opts: { nights?: number; adults?: number; count?: number; fromDays?: number } = {}
): Promise<StayWindow> {
  const { nights = 2, adults = 2, count = 1, fromDays = 2 } = opts;
  const hotel = await getHotel();
  for (let d = fromDays; d <= fromDays + 240; d++) {
    const checkin = iso(d);
    const checkout = plusDays(checkin, nights);
    const { staySearch } = await gql<{ staySearch: StaySearchRow[] }>(STAY_SEARCH, {
      i: {
        hotelId: hotel.id,
        checkInDate: checkin,
        checkOutDate: checkout,
        adults,
        children: 0,
        rooms: 1,
      },
    });
    const ok = staySearch.filter((r) => r.status === 'available' && r.capacityFits);
    if (ok.length < count) continue;
    return {
      checkin,
      checkout,
      nights,
      rooms: ok
        .map((r) => ({
          id: r.roomType.id,
          name: r.roomType.name,
          slug: r.roomType.slug,
          pricePerNight: Math.min(...r.rates.map((x) => x.pricePerNight)),
          rates: r.rates,
        }))
        .sort((a, b) => a.pricePerNight - b.pricePerNight),
    };
  }
  throw new Error(`no window with ${count}+ rooms available within 240 days`);
}

/** Seeding books in its own date region so it never perturbs the near-term
    window the read-only specs assert against. */
export const SEED_FROM_DAYS = 150;

/** Booking through the UI also consumes inventory; keep it clear of both the
    read-only window and the seeding region. */
export const UI_BOOKING_FROM_DAYS = 90;

/** Cheapest bookable room in a window — the default subject for room tests. */
export function cheapestRoom(w: StayWindow): RoomType {
  return w.rooms[0]!;
}

/** The cheapest room type whose rate is charged in full at booking — the
    subject for anything exercising the card/payment path. */
export function prepaidRoom(w: StayWindow): RoomType | undefined {
  return w.rooms.find((r) => r.rates.every((x) => x.paymentTiming === 'prepay_full'));
}

/** The room type sold on a pay-at-property rate, if the hotel offers one. */
export function payAtPropertyRoom(w: StayWindow): RoomType | undefined {
  return w.rooms.find((r) => r.rates.some((x) => x.paymentTiming === 'pay_at_property'));
}

/** A room whose name marks it a suite, for the category facet. */
export function suiteRoom(w: StayWindow): RoomType | undefined {
  return w.rooms.find((r) => r.name.toLowerCase().includes('suite'));
}

/* Seeded reservations are logged so globalTeardown can cancel them, which
   returns their nights to inventory. Without that a few runs exhaust a
   two-room room type and later runs cannot find a bookable window. */
export const SEEDED_LOG = path.join(os.tmpdir(), 'hotel-e2e-seeded.jsonl');

function recordSeeded(reference: string, email: string, token?: string): void {
  try {
    fs.appendFileSync(SEEDED_LOG, `${JSON.stringify({ reference, email, token })}\n`);
  } catch {
    /* Cleanup is best-effort; never fail a test over it. */
  }
}

/** Record a reservation booked outside {@link seedReservation} (e.g. through
    the UI) so teardown releases its inventory too. */
export function trackForCleanup(reference: string, email: string): void {
  recordSeeded(reference, email);
}

/**
 * Cancels everything this machine's runs booked, releasing the inventory.
 *
 * Entries that cannot be cancelled right now (the cancel path shares the
 * reservations rate-limit budget) are kept in the log so the next run retries
 * them, rather than being dropped and leaking inventory forever.
 */
export async function releaseSeeded(): Promise<{ released: number; pending: number }> {
  let lines: string[];
  try {
    lines = fs.readFileSync(SEEDED_LOG, 'utf8').split('\n').filter(Boolean);
  } catch {
    return { released: 0, pending: 0 };
  }
  const unreleased: string[] = [];
  let released = 0;
  for (const line of lines) {
    const { reference, email, token } = JSON.parse(line) as {
      reference: string;
      email: string;
      token?: string;
    };
    try {
      /* An account-owned booking can only be cancelled by its owner, so the
         seeding token is replayed here. */
      await rest(
        `/v1/reservations/${encodeURIComponent(reference)}/cancel`,
        { email, reasonCode: 'guest_changed_plans', reasonNote: 'e2e cleanup' },
        token ? { authorization: `Bearer ${token}` } : {}
      );
      released++;
    } catch (err) {
      // Already cancelled/gone is fine; anything else is retried next run.
      if (!/\b(404|409)\b/.test(String(err))) unreleased.push(line);
    }
  }
  if (unreleased.length) fs.writeFileSync(SEEDED_LOG, unreleased.join('\n') + '\n');
  else fs.rmSync(SEEDED_LOG, { force: true });
  return { released, pending: unreleased.length };
}

let sharedReservation: Promise<SeededReservation> | null = null;

/**
 * One confirmed reservation shared by every test that only READS it.
 *
 * Booking is rate-limited and consumes real inventory, so tests should not
 * each mint their own. Anything that MUTATES the reservation (cancelling it)
 * must call {@link seedReservation} for a private one instead.
 */
export function getSharedReservation(): Promise<SeededReservation> {
  sharedReservation ??= seedReservation();
  return sharedReservation;
}

export interface TestAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  token: string;
}

/**
 * Registers a real guest account.
 *
 * The suite used to sign in as `demo@hotelcollection.com` and to push users
 * into a `rc_users_v1` localStorage array. Neither exists: accounts are rows
 * behind `/api/v1/auth/*`, so tests make their own.
 */
export async function registerAccount(): Promise<TestAccount> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const account = {
    email: `e2e-${stamp}@example.com`,
    password: 'e2e-Passw0rd!',
    firstName: 'Ines',
    lastName: 'Testeur',
  };
  const payload = await rest<{ token: string }>('/v1/auth/register', account);
  return { ...account, token: payload.token };
}

/**
 * Settles a reservation's pending payment through the provider webhook.
 *
 * The guest client cannot mark its own payment successful (by design — see
 * PaymentRestController#webhook), and the dev stack has
 * `app.payments.auto-settle-enabled=false`, so a payment started from the UI
 * stays `pending` until something plays the PSP's part. A test that wants a
 * confirmed booking calls this instead of sleeping and hoping.
 */
export async function settlePayment(
  reference: string,
  event: 'payment.succeeded' | 'payment.failed' = 'payment.succeeded'
): Promise<void> {
  await rest(
    `/v1/payments/by-reservation/${encodeURIComponent(reference)}/webhook`,
    { event, providerReference: `e2e-${Date.now()}` },
    { 'X-Webhook-Secret': WEBHOOK_SECRET }
  );
}

export interface SeededReservation {
  reference: string;
  email: string;
  firstName: string;
  lastName: string;
  roomTypeName: string;
  checkin: string;
  checkout: string;
  totalAmount: number;
}

/**
 * Creates a real confirmed reservation and returns its lookup details.
 *
 * The suite previously deep-linked to `RC-DEMO1`/`RC-DEMO2`, rows that only
 * ever existed in the fixture. Rather than depend on seed data that may be
 * reseeded or cancelled, each run books its own.
 *
 * Settlement is explicit: `app.payments.auto-settle-enabled` is false in the
 * dev stack, so a created payment would otherwise sit `pending` forever. We
 * drive the provider webhook — the same entry point a real PSP callback uses
 * — which keeps the test deterministic instead of racing a timer.
 */
export async function seedReservation(
  opts: { nights?: number; adults?: number; account?: TestAccount } = {}
): Promise<SeededReservation> {
  const { nights = 2, adults = 2, account } = opts;
  const hotel = await getHotel();
  /* Never cached: every seed sells a real room, so a window reused across
     seeds eventually returns "no availability left". Book the MOST expensive
     available room rather than the cheapest — the cheapest room type has the
     fewest physical rooms here, and draining it strands the read-only tests
     that need several room types on one date. */
  /* Seed far from SEED_FROM_DAYS' worth of near-term dates: read-only specs
     assert counts like "3 rooms available" against the earliest window, and
     selling a room there would change what they see. */
  const window = await getBookableWindow({ nights, adults, fromDays: SEED_FROM_DAYS });
  const room = window.rooms[window.rooms.length - 1]!;
  const rate = room.rates[0]!;

  const stamp = Date.now();
  /* With an account, book AS that account: the reservation is then linked to
     the user's guest row, which is what `myReservations` reads. */
  const email = account?.email ?? `e2e-${stamp}@example.com`;
  const firstName = account?.firstName ?? 'E2e';
  const lastName = account?.lastName ?? 'Guest';
  const auth = account ? { authorization: `Bearer ${account.token}` } : {};
  const idempotencyKey = `e2e-${stamp}-${Math.random().toString(36).slice(2, 10)}`;

  const created = await rest<{ id: string; reference: string; totalAmount: number }>(
    '/v1/reservations',
    {
      hotelId: hotel.id,
      checkInDate: window.checkin,
      checkOutDate: window.checkout,
      adults,
      children: 0,
      currencyCode: 'MAD',
      guest: { firstName, lastName, email, countryCode: 'MA' },
      rooms: [{ roomTypeId: room.id, ratePlanId: rate.ratePlanId }],
      extras: [],
      idempotencyKey,
    },
    { 'Idempotency-Key': idempotencyKey, ...auth }
  );

  /* An account-owned reservation requires the owner's token; an accountless
     one is authorised by the guest email it was booked with. */
  await rest(
    '/v1/payments',
    {
      reservationId: created.id,
      amount: created.totalAmount,
      currencyCode: 'MAD',
      provider: 'card',
      idempotencyKey: `${idempotencyKey}-pay`,
      guestEmail: email,
    },
    auth
  );

  await rest(
    `/v1/payments/by-reservation/${encodeURIComponent(created.reference)}/webhook`,
    { event: 'payment.succeeded', providerReference: `e2e-${stamp}` },
    { 'X-Webhook-Secret': WEBHOOK_SECRET }
  );

  recordSeeded(created.reference, email, account?.token);
  return {
    reference: created.reference,
    email,
    firstName,
    lastName,
    roomTypeName: room.name,
    checkin: window.checkin,
    checkout: window.checkout,
    totalAmount: created.totalAmount,
  };
}
