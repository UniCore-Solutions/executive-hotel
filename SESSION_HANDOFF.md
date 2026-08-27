# SESSION HANDOFF

**Written:** 2026-08-27, immediately before `/clear`, at the user's explicit request.
**Rule followed:** no application code was modified while producing this document — every
action below was `git status`, `docker`/`psql` read-only queries, or `curl` against the
already-running stack. The one exception is this file itself and the verification
artifacts it's built from.

---

## 1. Original objective

This was a long, multi-phase session on the **Hotel Collection** platform
(`backend-hotel` = Spring Boot/Java 21/GraphQL, `frontend-hotel` = Next.js 16 guest site,
`backoffice-hotel` = Next.js 16 staff console, PostgreSQL 16, Kafka). The work progressed
through four distinct phases, each building on the last:

1. **Initial repo investigation** — produced `docs/PROJECT_CONTEXT.md`,
   `docs/ARCHITECTURE.md`, `docs/SERVICES.md`, `docs/DATA_FLOW.md`,
   `docs/CURRENT_STATE.md`, `docs/KNOWN_ISSUES.md`, `CLAUDE.md`, and seven Claude Code
   skills under `.claude/skills/`.
2. **Frontend-only deep investigation** — produced `docs/FRONTEND.md` (28 evidenced
   defects, F-1…F-28, real/mock matrix, fix plan).
3. **A 13-task implementation plan** synthesizing both — `docs/IMPLEMENTATION_PLAN.md`
   — covering currency correctness, booking/payment atomicity, availability params,
   confirmation handoff, promo/pricing, hotel details, room cleanup, extras UX,
   phone/country data, phone UI, country selector, error-code plumbing, plus auth/profile.
4. **Implementation**, in three sub-rounds, all in the **same uncommitted working tree**
   (no commits were made — see §4):
   - Round A: **Task 2 (currency) + Task 3 (booking/payment atomicity)** — fully
     implemented, tested, verified (documented in
     `docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md`).
   - **A strict, read-only audit** of Round A + a status check on all 13 tasks — found
     only Tasks 2 and 3 were actually done; everything else was untouched despite being
     "planned."
   - Round B (**this "go for it" round**, the one just interrupted): implementing the
     audit's recommended next actions **in priority order** — Task 5, Task 4, Task 1,
     Task 12, Task 11, Task 10 (in that exact order) were worked through; Tasks 6, 7, 8,
     9, 13 were **not started**.

**Expected final result** (not yet reached): all 13 tasks implemented, tested, and
deployed. **Current actual result:** Tasks 1–5, 10, 11, 12 are code-complete (with one
known failing test to fix — see §7); Tasks 6, 7, 8, 9, 13 are untouched.

---

## 2. Work completed this session (Round A + Round B)

### Round A — Task 2 (Currency) — ✅ fully implemented, tested, verified
- `frontend-hotel/src/services/graphqlClient.ts` — added exported
  `TRANSACTION_CURRENCY = 'MAD' as const`, the single source of truth for the
  transaction currency.
- `frontend-hotel/src/services/quote.ts`, `reservations.ts`, `payment.ts` — removed
  `currencyCode` from their public parameter types entirely; each hardcodes
  `TRANSACTION_CURRENCY` when building the GraphQL request. A caller can no longer pass a
  display currency through even by mistake (TypeScript rejects it — proven by a
  `@ts-expect-error` test).
- `frontend-hotel/src/components/booking/BookingFlow.tsx`,
  `src/components/room/RoomDetails.tsx` — stopped passing `currencyCode`/`currency` into
  `getQuote`/`create`/`charge`; removed `currency` from the affected `useEffect`
  dependency arrays (no longer relevant since price no longer varies with display
  currency).
- **No backend change** — verified `PricingServiceImpl.quote()` only ever echoes
  `currencyCode` into the response, never uses it for computation; every price in the DB
  is MAD. This was a deliberate, confirmed decision — see §5.
- Tests: `frontend-hotel/src/services/quote.test.ts` (new),
  `frontend-hotel/src/services/payment.test.ts` (new), `reservations.test.ts` (extended),
  `services.test.ts` (updated) — all assert the wire payload is always `'MAD'`.

### Round A — Task 3 (Booking/payment atomicity) — 🟡 the approved subset, fully done
Explicitly **not** the reservation-hold-reaper / pending-reservation-state work — the
user's own instructions excluded that ("Do NOT implement... yet").
- **Backend, new migration** `backend-hotel/src/main/resources/db/migration/V23__payment_idempotency_and_pending_uniqueness.sql`
  — adds `payments.idempotency_key VARCHAR(100)` (nullable) + two partial unique
  indexes: `uq_payments_idempotency_key` (WHERE NOT NULL) and
  `uq_payments_reservation_pending` (WHERE status='pending', enforcing **at most one
  in-flight payment per reservation** — this is the DB-enforced fix for a **live-
  reproduced double-charge bug** found during investigation).
- `Payment.java` (entity) — added `idempotencyKey` field.
- `PaymentRepository.java` — added `findByIdempotencyKey`.
- `CreatePaymentInput.java`, `CapturePaymentInput.java` (DTOs) — added `idempotencyKey`
  (Create only) and `guestEmail` (both) fields.
- `billing.graphqls` — schema additions matching the DTOs.
- `PaymentServiceImpl.java` — **rewrote `createPayment()`**: idempotency-key
  short-circuit first, then a pending-payment pre-check (in addition to the pre-existing
  captured-only balance check), then `saveAndFlush` + catch `DataIntegrityViolationException`
  for the race case (mirrors the codebase's own `doCancel()` idiom, chosen deliberately
  over the `create()`-reservation idiom's plain `save()` — see §5 for why).
  **Rewrote `ensurePaymentAccess()`**: added an accountless-reservation escape hatch —
  when `bookedByUserId == null` and a `guestEmail` matching `reservation.getGuest().getEmail()`
  (case-insensitive) is supplied, access is granted with no authentication at all;
  otherwise behavior is unchanged (owner/staff, or 401/403 as before). This fixed a
  **live-reproduced bug**: anonymous guests could not pay for their own booking at all
  before this change.
- `PaymentRestController.java` — updated the manual `CapturePaymentInput` constructor
  call for the new 3rd arg.
- Frontend: `BookingFlow.tsx` — added `reservationIdempotencyKeyRef` (lazy `useRef`,
  set once per mount, reused across retries — the fix for "new key every submit").
  `services/payment.ts`'s `charge()` now requires `idempotencyKey` and accepts
  `guestEmail`, derived in `BookingFlow.tsx` as `` `${idempotencyKey}:payment` `` and
  `details.email.trim().toLowerCase()` respectively.
- Tests: 7 new methods in `BookingFlowIntegrationTest.java` (payment idempotency,
  pending-uniqueness conflict, capture-reference idempotency, 4 accountless-access
  scenarios); existing tests in `AdminGraphqlIntegrationTest.java`, `GraphqlApiIntegrationTest.java`,
  `RestApiIntegrationTest.java` fixed to supply the now-required `idempotencyKey`;
  `DatabaseIntegrityIntegrationTest.java`'s migration-count assertion bumped 22→23.
  New `BookingFlow.test.tsx` (frontend) proves the stable-key behavior.
- **Full backend suite result at the time**: 141 tests, 2 failures — both the
  **pre-existing, unrelated** `ModuleArchitectureTest` violations (documented before this
  session even started — `StaySearchGraphQLController` bypassing the service layer).
  Zero failures attributable to this work.

### The strict audit (read-only, no code changes)
Verified via direct source inspection + live queries that **only Tasks 2 and 3** were
implemented; Tasks 1, 4–13 were **all** at 0%, byte-identical to the pre-plan state. Full
evidence table is in the conversation transcript (not re-saved to a file) — the headline
findings were folded into Round B below as its worklist.

### Round B — Task 5 (Confirmation handoff) — ✅ done
- `BookingFlow.tsx` — success redirect now
  `` `/confirmation?ref=${ref}&email=${encodeURIComponent(guestEmail)}` `` (was:
  ref only).
- `ConfirmationFlow.tsx` — added `emailParam` from the URL; the initial lookup effect now
  prefers `reservations.find(ref, emailParam)` when an email is present (the normal
  post-booking case), falling back to the old auth-gated `reservations.list()` only for a
  bare `?ref=` deep link with no email. `emailInput`'s initial state is also seeded from
  `emailParam` so the manual fallback form is pre-filled if needed.

### Round B — Task 4 (Wrong-stay availability) — ✅ done
All three `getStayRoom` call sites now pass `checkout` and `rooms` (previously omitted,
silently defaulting to a 1-night/1-room stay):
- `BookingFlow.tsx` (one call site, plus its `useEffect` deps updated).
- `RoomDetails.tsx` — **two** call sites: the `refreshStay` callback (deps updated too)
  and the initial-load effect (deps deliberately left as `[roomId]` only, per its
  pre-existing `eslint-disable-next-line react-hooks/exhaustive-deps` — only the
  **call's arguments** were changed there, not its trigger condition).

### Round B — Task 1 (Auth/Profile + session persistence) — ✅ code-complete, backend verified live, frontend not smoke-tested
This was the largest single piece of work. **Backend:**
- `identity.graphqls` — `Me` gained `firstName`, `lastName`, `phone` (all nullable);
  added `input UpdateProfileInput { firstName lastName phone }` and
  `updateMyProfile(input: UpdateProfileInput!): Me!` mutation.
- `AuthGraphQLController.java` — added the `updateMyProfile` mutation resolver and three
  `@SchemaMapping(typeName = "Me")` methods (`firstName`/`lastName`/`phone`) that resolve
  via `auth.findUser(me.userId())` — **deliberately not** a direct repository call from
  the controller (that would repeat the exact pre-existing `StaySearchGraphQLController`
  ArchUnit violation already flagged as a known issue — see §5).
- `AuthService.java` (interface) + `AuthServiceImpl.java` — added `findUser(UUID): User`
  and `updateProfile(UUID, UpdateProfileInput): void`. The latter updates `users` and
  calls `guestProvisioning.updateContactInfo(...)` to propagate the edit to the caller's
  linked `Guest` row, if one exists.
- `GuestProvisioningService.java` (interface) + `GuestProvisioningServiceImpl.java` —
  added `updateContactInfo(UUID userId, String firstName, String lastName, String phone)`.
- New DTO `dto/identity/UpdateProfileInput.java`.
- New backend test `GraphqlApiIntegrationTest.meExposesNamePhoneAndUpdateMyProfilePersistsThem`
  — registers, checks `firstName/lastName/phone` on the `register` response, calls
  `updateMyProfile`, re-reads via `me` to confirm persistence (not just echo), and checks
  anonymous `updateMyProfile` is rejected (`UNAUTHORIZED`).
- **Backend compiles clean** (`./mvnw compile` and `test-compile` both verified after
  these changes). **Live-verified** (see §9): the running `hotel-backend` container's
  GraphQL schema now genuinely exposes `Me.firstName/lastName/phone` via a live
  introspection query — the code IS deployed and active, not just compiled.

**Frontend — full BFF/session rewrite**, mirroring `backoffice-hotel`'s proven pattern:
- New `frontend-hotel/src/lib/session.ts` — httpOnly cookie helpers (`guest_session`
  cookie, 30-day maxAge).
- New route handlers, all under `frontend-hotel/src/app/api/`:
  - `auth/login/route.ts`, `auth/register/route.ts` — call the backend's existing REST
    `/api/v1/auth/{login,register}`, set the httpOnly cookie, return `{ok:true}` only
    (deliberately **not** passing through the REST response's `me` shape — see §5 for
    why).
  - `auth/logout/route.ts` — clears the cookie.
  - `auth/me/route.ts` — GET, reads the cookie, calls the backend GraphQL `me` query
    (full profile incl. firstName/lastName/phone), returns `{me: null}` (200, not 401)
    when signed out.
  - `auth/profile/route.ts` — POST, calls the backend `updateMyProfile` mutation with the
    cookie's token.
  - `graphql/route.ts` — the **general browser-side GraphQL proxy**: reads the cookie,
    injects `Authorization: Bearer` if present, forwards to the backend; auth is
    **optional** here (unlike backoffice's equivalent, since most of this site's traffic
    is anonymous).
- `services/graphqlClient.ts` — browser requests now default to `/api/graphql` (was
  `/graphql`, via a `next.config.ts` rewrite that is now unused by this app but was
  deliberately **left in place**, not removed — see §5). Removed the `getToken()`
  import/usage entirely (the browser can no longer read the token — that's the point).
- `services/auth.ts` — **fully rewritten**. No more module-level `_token`/`_session`
  singletons. New shape: `fetchSession()` (calls `/api/auth/me`), `login()`/`register()`
  (call the respective route, then call `fetchSession()` to get the full profile —
  avoids reconciling the REST login response's `userId` field vs GraphQL's `id`),
  `updateProfile()`, `logout()` (now `async`). `restoreSession()`, `getToken()`,
  `isLoggedIn()`, `session()` (sync getter) — all **removed** (confirmed zero remaining
  callers before removal).
- `context/SessionContext.tsx` — the session is now populated by an async
  `useEffect(() => { auth.fetchSession().then(setSessionState) }, [])` on mount (this
  is literally the fix for "session lost on reload" — the httpOnly cookie survives a
  reload; a JS-memory variable never could). `login`/`register`/`updateProfile` now use
  the `session` object returned directly in the `AuthResult` rather than a second sync
  call. Added `updateProfile` to the context's public interface. `logout`/`refresh` are
  now `async`.
- `components/layout/Header.tsx` — replaced the old `setTimeout(() => setSess(readSession()), 0)`
  polling-on-pathname-change pattern with `const { session: sess } = useSession();` —
  Header now reflects real, live session state instead of a stale poll.
- `components/account/AccountFlow.tsx` — added a full **"Profile" section** (new UI,
  visible only when signed in): editable first name / last name / phone form, wired to
  `updateProfile()` from the session context, with its own busy/message state, synced
  from `session` via a `useEffect` (so it populates once the async `fetchSession()`
  resolves, not just at first render).
- `types/index.ts` — `Session` interface gained `firstName: string | null`,
  `lastName: string | null`, `phone: string | null`. `token` field is kept (type-shape
  compatibility, nothing external reads it) but is now always set to `''` — the httpOnly
  cookie IS the token; JS never has it.
- `.env.example` — updated the stale comment describing the old `/graphql` rewrite
  mechanism to describe the new `/api/graphql` proxy instead (this is documentation, not
  code, but it's a config file so listed here for completeness).

**Known gap in this round:** `frontend-hotel/src/graphql/generated/{gql,graphql}.ts` was
**not regenerated** after the `identity.graphqls` schema change (I never ran
`npx graphql-codegen` again after this edit). **This does not block compilation** —
the new BFF routes (`me/route.ts`, `profile/route.ts`) deliberately use raw template-
string GraphQL queries, not the generated `TypedDocumentNode`s — but the generated file
is now slightly stale relative to the schema (missing `Me.firstName/lastName/phone` and
`UpdateProfileInput` types) if anything else ever needs them. **Not yet a problem, but
flagged.**

### Round B — Task 12 (Country selector) — ✅ done
- **New backend migration** `V24__widen_country_reference_list.sql` — widens
  `countries` from 9 rows to the **full ISO 3166-1 set (245 rows)**. Generated
  programmatically from `libphonenumber-js`'s `getCountries()` +
  `Intl.DisplayNames(['en'], {type:'region'})` — deliberately **the same source the
  frontend selector reads live**, so the two can never drift apart. Additive only
  (`ON CONFLICT (code) DO NOTHING`), no column/type changes. **Live-verified**: `select
  count(*) from countries` on the running database returns **245** (see §9) — this
  migration has actually run successfully against real Postgres, not just been written.
- New `frontend-hotel/src/components/ui/CountrySelect.tsx` — a native `<select>`
  (deliberate choice — searchable-by-typing, keyboard-operable, mobile-friendly for free,
  far lower risk than a custom combobox) populated by `getCountries()` +
  `Intl.DisplayNames`, sorted alphabetically, options memoized/cached at module level.
- `BookingFlow.tsx` — replaced the 11-item hardcoded `COUNTRIES` array (which included
  Germany/Netherlands/Belgium/Canada — **4 of 11 entries that would have violated the
  `guests.country_code` FK** against the old 9-row table) with `<CountrySelect>`. The
  selected code is now sent as `guest.countryCode` in the `reservations.create()` call
  (previously **never sent at all**, despite the field having existed in both the
  GraphQL schema and the frontend service's TypeScript type the whole time — confirmed:
  `BookingServiceImpl.findOrCreateGuest()` **already** correctly calls
  `guest.setCountryCode(in.countryCode())` for a newly-created guest — this was
  pre-existing, dead code waiting for the frontend to actually populate the field).

### Round B — Task 11 (Phone number library) — ✅ done
- Installed `react-phone-number-input` (^3.4.18) and `libphonenumber-js` (^1.13.12) as
  **direct** dependencies (confirmed reachable npm registry, installed cleanly, 0
  vulnerabilities). `package.json`/`package-lock.json` updated.
- New `frontend-hotel/src/components/ui/PhoneField.tsx` — thin wrapper around the
  library's `PhoneInput`, `international` mode, `defaultCountry` prop, E.164 output.
- `lib/validation.ts` — `validPhone()` **rewritten** to call the library's
  `isValidPhoneNumber()` (real, country-aware validation) instead of the old bare regex
  `PHONE_RE` (which is now **removed** — confirmed no other references before removal).
- `lib/validation.test.ts` — updated: removed the `PHONE_RE` regex test, added a new
  `validPhone` test block with Moroccan/French numbers **verified against the real
  library via a direct `node -e` check** before writing the assertions (`+212661234567`
  → true, `+33612345678` → true, `123` → false, `+212123` → false — all confirmed).
- `app/globals.css` — added scoped CSS (`.hotel-phone-input...`) to make the library's
  default look match the app's existing `Input` styling (border-navy/15, bg-paper,
  rounded-xl, gold focus ring).
- **Wired into both required surfaces**: `BookingFlow.tsx`'s phone field, **and**
  `AccountFlow.tsx`'s new profile-edit phone field (the plan explicitly required both).
  `AccountFlow.tsx`'s `doSaveProfile` also gained a `validPhone()` pre-submit check
  (matching `BookingFlow`'s existing validation pattern).

### Round B — Task 10 (Booking user data / phone+country persistence) — ✅ done, as a consequence of Tasks 1 + 12
This task's actual work turned out to be almost entirely a byproduct of Tasks 1 and 12,
not separate new code:
- `BookingFlow.tsx`'s `details` initial state now reads `session?.phone ?? ''` and
  `session.firstName ?? session.name.split(' ')[0]` etc. — a signed-in guest's saved
  phone/name **prefill** the booking form.
- A `prefilledFromSession` ref + `useEffect` handles the case where `session` resolves
  **after** first render (the async `fetchSession()` on mount) — prefills once, without
  clobbering anything the guest has already started typing.
- The `guest` object sent to `reservations.create()` now includes
  `countryCode: details.country || undefined` (Task 12's field, now actually
  transmitted).
- **Confirmed via source inspection** (not assumed) that `BookingServiceImpl.findOrCreateGuest()`
  on the backend already correctly persists both `phone` and `countryCode` onto a
  **newly-created** `Guest` row — this code path was already correct and simply unused
  until now. **Known, deliberate non-change**: for a **returning** guest (matched by
  email via `findByEmailIgnoreCase`), the existing guest row's phone/countryCode are
  **not** updated by a later booking — this is pre-existing behavior, not something this
  task was asked to change, and was left as-is.

---

## 3. Work NOT completed

### Task 6 — Pricing soft-failure + promo — ❌ not started
- `PricingServiceImpl.applyPromo()` still `throw`s on an unknown/inapplicable promo code
  instead of returning `Quote{valid:false, message}`; `Quote.valid` is still hardcoded
  `true` unconditionally.
- `rate.graphqls` still has no `promoMessage` field (the Java DTO has it, the schema
  doesn't expose it).
- `OffersGrid.tsx` still imports the fixture `OFFERS` array (5 codes that don't exist in
  the live database — `SUMMER2026, STAY4PAY3, BESTRATE, CORP10, WELCOME5` vs the real
  `SPRING25, MADINA15, SUMMER10`).
- `ensurePricingSources()` is still only called from `RoomDetails.tsx`/`PromoField.tsx`,
  not `SearchResults.tsx`/`OffersGrid.tsx`.
- `GraphqlClientError` still has no `.code` field (blocks Task 13 too).

### Task 7 — Hotel details — ❌ not started
- `HotelDetail.tsx` still calls `getStay`/`getExperiences`/`getReviews`/`getRoomTypes`
  separately, never the existing `hotelDetails` aggregation query.
- No `hotel_policies` migration, no `HotelPolicy` GraphQL type, no
  `HotelDetails.policies` field, no `setHotelPolicies` mutation — none of this exists
  anywhere in the backend. FAQ/restaurants/policies are still rendered **only** on the
  legacy fixture `/hotel` page (`P.faq`, `P.restaurants`, `P.policies`); the real
  `HotelDetail.tsx` component never rendered these sections at all, before or after this
  session.

### Task 8 — Room details fixture cleanup — ❌ not started
`RoomDetails.tsx` still `import { EXTRAS } from '@/data'` and
`useState<Extra[]>(EXTRAS)` as the extras-picker's initial state (fixture slug IDs like
`airport-shuttle` can still leak into a quote request before the real backend extras
load).

### Task 9 — Extras/services UX — ❌ not started
`ExtrasPicker.tsx` still has `truncate` classes on the extra-name spans (both layouts).
`QuoteTable.tsx` still shows one aggregate `"Extras & services"` line, never itemized by
name/quantity/unit price.

### Task 13 — Error-code plumbing — ❌ not started
Direct consequence of Task 6 not being done. `CheckinFlow.tsx`, `ReservationFlow.tsx`,
`ConfirmationFlow.tsx`, `RoomDetails.tsx` all still have bare `catch {}` blocks with
generic "check your connection" messaging instead of branching on
`extensions.code` (`NOT_FOUND` vs `VALIDATION` vs other).

### Task 3's deliberately-deferred half
No `ReservationStatus` change, no hold-expiry `@Scheduled` reaper, no cancel-on-decline
flow — a payment decline still leaves the reservation `confirmed` with inventory held
indefinitely. **This was explicit user instruction, not an oversight.**

### The one thing left mid-fix when this session ended
See §7 — a single failing frontend test, not yet fixed.

---

## 4. Current project state (only what's verified)

- **Git**: `main` branch, HEAD is still `82c4414` — **zero commits made this entire
  session** (across all four phases). Everything described above is in the uncommitted
  working tree, on top of an already-large pre-existing uncommitted baseline (a prior,
  unrelated pricing-unification effort — see `docs/CURRENT_STATE.md` from phase 1 for
  that baseline's own description). `git status --short` currently shows ~96
  modified/new paths total (baseline + all of this session's work combined).
- **Deployment — genuinely surprising, verified fact**: both `hotel-backend` and
  `hotel-frontend` Docker containers were **created at `2026-08-27T11:57:3x`**, i.e.
  **rebuilt and redeployed with this entire session's source changes** (confirmed: live
  GraphQL introspection on the running backend shows `Me.firstName/lastName/phone`;
  `createPayment` live-rejects a request missing `idempotencyKey`; `/api/auth/me` and
  `/api/graphql` on the running frontend both return `200`). **I did not run this
  rebuild myself** — no `docker compose build`/`up` command appears anywhere in my own
  tool-call history for this session. It must have been done by the user (or an
  automated process) outside my visibility, sometime after V24 was written (the very
  last file created before this handoff request). **This means the live stack is
  materially ahead of what I assumed** when I described "recommended action #1: redeploy
  at the end" earlier in the plan — that redeploy has already happened.
- **Live database** (`hotel-platform-postgres`, verified via direct `psql`):
  Flyway at **V24**, all 24 migrations `success=true`. `payments` table structurally
  confirmed to have `idempotency_key` + both new unique indexes. `countries` table
  confirmed at **245 rows**.
- **Backend build**: `./mvnw compile` and `./mvnw test-compile` both verified clean
  **as of the last change to Java sources** (the Task 1 additions). The **full**
  `./mvnw test` (Testcontainers) was last run **before** Task 1/4/5/10/11/12 — at that
  point: 141 tests, 2 failures (both pre-existing `ModuleArchitectureTest`, unrelated).
  **Not re-run since** — Task 1's new backend test
  (`meExposesNamePhoneAndUpdateMyProfilePersistsThem`) has never actually been executed,
  only compiled.
- **Frontend build**: `npx tsc --noEmit` clean as of the last check (after all Round B
  UI wiring, including PhoneField/CountrySelect/AccountFlow). `npx vitest run` **has 1
  failing test** as of the last run (see §7) — 69 passed, 1 failed, out of 70. `npx
  eslint .` and `npx next build` have **not** been re-run since the Task 11/12 UI
  changes (PhoneField, CountrySelect, AccountFlow profile section) — last known-clean
  state predates those.
- **Dependencies**: `react-phone-number-input` and `libphonenumber-js` newly added to
  `frontend-hotel/package.json` (both direct dependencies), installed successfully,
  0 vulnerabilities reported by npm.

---

## 5. Important decisions made this session (with reasoning)

1. **Task 2: no backend/DB change, ever.** Confirmed by rereading `PricingServiceImpl`
   that `currencyCode` is genuinely never used for computation — the fix is 100%
   frontend-boundary. Matches the user's explicit instruction not to build FX logic.
2. **Task 3: `saveAndFlush` chosen over plain `save()`** for the new payment insert,
   specifically because the codebase's OWN comment on `BookingServiceImpl#doCancel`
   explains `saveAndFlush` is needed to surface a unique-constraint violation
   synchronously inside a `try/catch`, whereas plain `save()` (used in the analogous
   reservation-creation path) may not flush in time for the same pattern to work
   reliably. This was a deliberate deviation from "just copy `create()`'s exact idiom" in
   favor of "copy the idiom this codebase itself proved correct for exactly this
   problem."
3. **Task 3: `ensurePaymentAccess`'s guest-email escape hatch is scoped to
   `bookedByUserId == null` only** — an authenticated stranger, or a correct guest email
   presented against an **account-backed** reservation, is still rejected. This
   symmetric design was deliberately tested (4 distinct test scenarios) to make sure
   "accountless guests can pay" did not accidentally become "anyone who knows an email
   can pay anyone's booking."
4. **Task 1: `Me`'s new fields are schema-mapped from `auth.findUser()`, never from a
   repository accessed directly in the controller.** This was a deliberate correction
   mid-design: the first instinct (inject `UserRepository` into the controller) would
   have **repeated** the exact ArchUnit violation already flagged as a known,
   pre-existing issue (`StaySearchGraphQLController` bypassing the service layer) —
   caught and avoided before writing the code, not after.
5. **Task 1: `/api/auth/login` and `/api/auth/register` deliberately do NOT pass through
   the backend's REST response's `me` object.** The backend REST endpoint returns
   `{userId, email, roles, hotelIds}`; the GraphQL `me` query returns
   `{id, email, firstName, lastName, phone, roles, hotelIds}` — different field name for
   the id, and the REST shape lacks the new profile fields entirely. Rather than
   reconciling two shapes, the login/register routes only set the cookie and return
   `{ok:true}`; the client always calls `fetchSession()` (GraphQL-backed, one consistent
   shape) right after. This trades one extra round-trip for correctness/simplicity.
6. **Task 1: `next.config.ts`'s old `/graphql` rewrite was deliberately left in place**,
   even though nothing in the app uses it anymore — removing infrastructure config that
   might have an external dependency I can't see was judged riskier than leaving a
   harmless unused rewrite.
7. **Task 12: the country list is generated from `libphonenumber-js`, not hand-typed**,
   specifically so the backend migration and the frontend selector can never drift apart
   — both read the same upstream data.
8. **Task 12: a native `<select>` was chosen over a custom searchable combobox** for
   `CountrySelect` — deliberately the lower-risk, lower-effort option that still
   satisfies "searchable" (native type-ahead), "keyboard accessible," and "mobile
   friendly" without building bespoke UI.
9. **Task 10's "persist countryCode" requirement turned out to already be implemented on
   the backend** (`BookingServiceImpl.findOrCreateGuest` already had the
   `guest.setCountryCode(...)` line) — this was discovered by reading the code, not
   assumed; the actual missing piece was purely "the frontend never sent it."
10. **Returning-guest phone/countryCode are deliberately NOT overwritten on a later
    booking** — this is pre-existing backend behavior (only new-guest creation sets these
    fields) and was explicitly left unchanged since it wasn't part of what Task 10 asked
    for.
11. **The redeploy step was deliberately sequenced to happen once, at the very end,
    after all code changes** — per the user's own "go for it" approval of the
    recommended-actions order. (As it turns out, per §4, a redeploy already happened
    outside my own actions — but this was the plan going in.)

---

## 6. Problems found this session

| Problem | Location | Status | Remaining |
|---|---|---|---|
| Live double-charge (two pending payments, both capturable) | `PaymentServiceImpl` (pre-existing bug, found via investigation, reproduced live with real curl calls against the running DB) | **Fixed** (V23 + code) | none — closed |
| Anonymous guests could not pay their own accountless booking | `PaymentServiceImpl.ensurePaymentAccess` (pre-existing) | **Fixed** | none — closed |
| Reservation idempotency key regenerated on every submit | `BookingFlow.tsx` (pre-existing) | **Fixed** (frontend, stable ref) | Backend reservation-level idempotency itself was already correct — only the frontend never gave it a stable key to work with |
| Currency selector could silently mislabel the charged amount | Frontend-wide (pre-existing) | **Fixed** | none — closed |
| `getStayRoom` checked a fabricated 1-night/1-room stay | `BookingFlow.tsx`, `RoomDetails.tsx` ×2 (pre-existing) | **Fixed** | none — closed |
| Confirmation page re-prompted for email right after payment | `ConfirmationFlow.tsx` (pre-existing) | **Fixed** | none — closed |
| Session lost on every page reload | `services/auth.ts` module-variable pattern (pre-existing) | **Fixed** | Not yet smoke-tested live (see §9) |
| `guests.country_code` FK trap — 4/11 hardcoded countries would violate it | `BookingFlow.tsx` + `countries` table (pre-existing) | **Fixed** | none — closed |
| Phone field required manual `+countrycode` typing, weak regex validation | `BookingFlow.tsx`, `lib/validation.ts` (pre-existing) | **Fixed** | none — closed |
| `graphql/generated/*.ts` not regenerated after `identity.graphqls` schema change | codegen output (this session) | **Not fixed** | Run `npx graphql-codegen --config codegen.ts` in `frontend-hotel/` — low urgency, nothing currently depends on the stale types |
| **`BookingFlow.test.tsx` fails**: `getByLabelText(/^Phone/i)` matches multiple elements | test file (this session, caused by introducing `PhoneField`) | **Not fixed — in progress when interrupted** | See §7, exact next step below |
| Promo codes advertised on `/offers` don't exist in the DB; backend throws (not soft-fails) on bad promo | pre-existing (Task 6 scope) | **Not started** | Full Task 6 work |
| No hotel-level policies model anywhere in the backend | pre-existing (Task 7 scope) | **Not started** | Full Task 7 work |
| `EXTRAS` fixture still seeds the room-detail picker | pre-existing (Task 8 scope) | **Not started** | One-line fix: `useState<Extra[]>([])` |
| Extras UI truncates names, no line-item breakdown | pre-existing (Task 9 scope) | **Not started** | Full Task 9 work |
| `GraphqlClientError` has no `.code`, so NOT_FOUND/VALIDATION are indistinguishable client-side | pre-existing (Task 13 scope, blocked on Task 6) | **Not started** | Full Task 6 + 13 work |

---

## 7. Exact point where this session stopped

**Last thing changed:** nothing was changed after the audit + Round B work described in
§2 — the very last file write was `frontend-hotel/src/components/account/AccountFlow.tsx`'s
`validPhone` import/check (Task 11 wiring into the profile form), followed by a
`tsc --noEmit` (clean) and then `npx vitest run`.

**Last thing investigated:** that `vitest run` came back with **69 passed, 1 failed**.
The failure is in `frontend-hotel/src/components/booking/BookingFlow.test.tsx`, inside
the `fillDetailsAndAdvance()` helper, at this line:

```ts
fireEvent.change(screen.getByLabelText(/^Phone/i), { target: { value: '+212600000000' } });
```

**Root cause (diagnosed, not yet fixed):** introducing `PhoneField` (which wraps
`react-phone-number-input`'s `PhoneInput`) means the DOM now has **more than one**
element whose accessible name matches `/^Phone/i` — almost certainly the library's own
internal country-select button/combobox has an accessible name that also starts with or
contains "Phone" (e.g. "Phone number country"), in addition to the actual `<Label
htmlFor="f-phone">Phone</Label>` + the library's number `<input>`. `getByLabelText`
throws when more than one match is found. I was in the middle of reading
`BookingFlow.test.tsx` (had just re-opened it, lines 163–172) to decide the fix when this
handoff request arrived — **no fix has been applied yet.**

**What I was about to do next:** switch that one line (and check the two other affected
call sites in the same helper if any — only this one references "Phone") from
`screen.getByLabelText(/^Phone/i)` to a more specific query — most likely
`document.getElementById('f-phone')` via `fireEvent.change`, since `id="f-phone"` is
passed straight through to `PhoneField`, or alternatively inspect the actual rendered DOM
(e.g. via `screen.debug()` or checking `react-phone-number-input`'s source/docs for its
exact `numberInputProps` id-forwarding behavior) to confirm exactly which element carries
`id="f-phone"` before writing the fix, since I had not yet confirmed that precisely.

**What still needs verification after that fix:**
- Re-run `npx vitest run` — full 14/14 file, all tests green.
- Re-run `npx eslint .` — confirm still 0 errors (only the same 5 pre-existing warnings).
- Re-run `npx next build` — confirm still succeeds with all of today's frontend changes.
- Re-run the **full** `./mvnw test` (not just compile) to confirm Task 1's new backend
  test actually passes, and that nothing regressed — this has not been done since before
  Task 1/4/5/10/11/12.
- A real, live smoke test of the login/register/reload flow against the running stack
  (`curl` or browser) — the live checks done for this handoff only proved the backend
  schema and BFF routes exist and respond; they did **not** prove a full login →
  reload → still-signed-in round trip actually works end to end.
- Regenerate `frontend-hotel/src/graphql/generated/*.ts` (`npx graphql-codegen`) —
  currently stale relative to `identity.graphqls` (harmless today, but should be closed
  out).

---

## 8. Important files (this session's own changes only — see §2 for the exhaustive per-file description)

| File | Purpose | This session |
|---|---|---|
| `backend-hotel/src/main/resources/db/migration/V23__payment_idempotency_and_pending_uniqueness.sql` | Payment idempotency + pending-uniqueness | **New**, Task 3, live-verified applied |
| `backend-hotel/src/main/resources/db/migration/V24__widen_country_reference_list.sql` | 245-row ISO-3166-1 country seed | **New**, Task 12, live-verified applied (245 rows) |
| `backend-hotel/.../service/impl/PaymentServiceImpl.java` | Payment use cases | Rewrote `createPayment`/`ensurePaymentAccess`, Task 3 |
| `backend-hotel/.../entity/Payment.java`, `repository/PaymentRepository.java`, `dto/billing/{Create,Capture}PaymentInput.java` | Payment idempotency plumbing | Task 3 |
| `backend-hotel/.../graphql/billing/billing.graphqls` | Payment schema | Task 3 fields |
| `backend-hotel/.../controller/AuthGraphQLController.java` | Identity resolver | `updateMyProfile` + `Me` field mappings, Task 1 |
| `backend-hotel/.../service/AuthService.java` + `impl/AuthServiceImpl.java` | Auth use cases | `findUser`, `updateProfile`, Task 1 |
| `backend-hotel/.../service/GuestProvisioningService.java` + `impl/...Impl.java` | Guest linkage | `updateContactInfo`, Task 1 |
| `backend-hotel/.../dto/identity/UpdateProfileInput.java` | New DTO | Task 1 |
| `backend-hotel/.../graphql/identity/identity.graphqls` | Identity schema | `Me` fields + `updateMyProfile`, Task 1 |
| `backend-hotel/.../controller/PaymentRestController.java` | REST payment endpoints | Constructor-arity fix, Task 3 |
| `backend-hotel/src/test/.../BookingFlowIntegrationTest.java` | Payment/booking integration tests | 7 new methods (Task 3), constructor fixes |
| `backend-hotel/src/test/.../GraphqlApiIntegrationTest.java` | GraphQL integration tests | 1 new method (Task 1), idempotencyKey fixes (Task 3) |
| `backend-hotel/src/test/.../{AdminGraphqlIntegrationTest,DatabaseIntegrityIntegrationTest,RestApiIntegrationTest}.java` | Various | Test fixes for Task 3's new required fields |
| `frontend-hotel/src/services/graphqlClient.ts` | GraphQL transport | `TRANSACTION_CURRENCY` (Task 2), `/api/graphql` proxy routing (Task 1) |
| `frontend-hotel/src/services/{quote,reservations,payment}.ts` | GraphQL service functions | Currency boundary (Task 2), idempotency/guestEmail (Task 3) |
| `frontend-hotel/src/services/auth.ts` | Auth service | **Fully rewritten**, Task 1 |
| `frontend-hotel/src/lib/session.ts` | httpOnly cookie helpers | **New**, Task 1 |
| `frontend-hotel/src/app/api/auth/{login,register,logout,me,profile}/route.ts` | BFF route handlers | **All new**, Task 1 |
| `frontend-hotel/src/app/api/graphql/route.ts` | Browser GraphQL proxy | **New**, Task 1 |
| `frontend-hotel/src/context/SessionContext.tsx` | Session state | Async restore, `updateProfile`, Task 1 |
| `frontend-hotel/src/components/layout/Header.tsx` | Site header | Real `useSession()`, Task 1 |
| `frontend-hotel/src/components/account/AccountFlow.tsx` | Guest account page | New profile-edit section, Task 1 + 11 |
| `frontend-hotel/src/components/booking/BookingFlow.tsx` | Booking form | Email redirect (5), checkout/rooms (4), phone/country prefill+persist (1/10), PhoneField/CountrySelect (11/12), stable idempotency ref (3) |
| `frontend-hotel/src/components/booking/ConfirmationFlow.tsx` | Confirmation page | Prefer email-based lookup, Task 5 |
| `frontend-hotel/src/components/room/RoomDetails.tsx` | Room detail page | checkout/rooms in both `getStayRoom` calls, Task 4 |
| `frontend-hotel/src/components/ui/PhoneField.tsx`, `CountrySelect.tsx` | New form components | **New**, Task 11 + 12 |
| `frontend-hotel/src/lib/validation.ts` + `.test.ts` | Field validators | `validPhone` rewritten, Task 11 |
| `frontend-hotel/src/types/index.ts` | Shared types | `Session` gained firstName/lastName/phone, Task 1 |
| `frontend-hotel/src/app/globals.css` | Global styles | PhoneField CSS, Task 11 |
| `frontend-hotel/package.json` / `package-lock.json` | Dependencies | `react-phone-number-input`, `libphonenumber-js`, Task 11 |
| `frontend-hotel/.env.example` | Env doc | Comment fix for the new proxy, Task 1 |
| `frontend-hotel/src/services/{quote,payment}.test.ts`, `reservations.test.ts`, `services.test.ts` | Tests | New/updated, Task 2 + 3 |
| `frontend-hotel/src/components/booking/BookingFlow.test.tsx` | Test | **New**, Task 3 — **currently has 1 failing assertion**, see §7 |
| `docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md` | Investigation record | From an earlier phase, unchanged this round |
| `docs/IMPLEMENTATION_PLAN.md` | The 13-task plan | From an earlier phase, unchanged this round |

---

## 9. Verification status

**Verified working (direct evidence, this session):**
- Live double-charge bug reproduction and fix (curl'd the actual GraphQL API against the
  running backend before AND after the fix, in the earlier investigation phase).
- Anonymous-payment-blocked bug reproduction and fix (same method).
- Backend compiles clean after every Java change (`./mvnw compile`/`test-compile`,
  checked repeatedly).
- Live backend schema **currently** exposes `Me.firstName/lastName/phone` (introspection
  query against the running container, this handoff).
- Live backend **currently** requires `idempotencyKey` on `createPayment` (direct
  mutation call against the running container, this handoff).
- Live database **currently** has the V23 schema changes (`payments.idempotency_key` +
  both indexes, confirmed via `\d payments`) and V24's 245-row `countries` table
  (`select count(*)`).
- Both containers were recreated at the same timestamp, after V24 was written (`docker
  inspect ... Created`) — the whole stack, not just parts of it, was redeployed.
- `/api/auth/me` and `/api/graphql` respond `200` on the live frontend container.
- Frontend `tsc --noEmit` clean as of the last source change.
- 69/70 frontend tests pass (single failure diagnosed, not yet fixed).

**Partially verified:**
- Task 1's session-persistence claim ("survives reload") is verified **structurally**
  (httpOnly cookie set server-side, `fetchSession()` called on mount) and the BFF routes
  respond live — but **no actual login → reload → still-signed-in round trip was
  performed**, live or in a test. This is the single most important thing to verify
  first after resuming.
- Task 3's new backend test methods compile and are syntactically sound but have **never
  actually been executed** (only `test-compile`, not `test`, run since they were added).

**Not verified:**
- Full `./mvnw test` (Testcontainers) since Task 1/4/5/10/11/12 — unknown whether
  anything regressed structurally (compilation success does not guarantee integration
  test success).
- `npx eslint .` and `npx next build` since the Task 11/12 UI additions.
- Whether the PhoneField/CountrySelect UI actually **renders and behaves correctly in a
  real browser** — only typechecked and unit-tested (and the unit test that exercises it
  end-to-end is the one currently failing).
- Whether `AccountFlow.tsx`'s new profile section actually persists a phone-number edit
  through to the database when clicked in a real browser — code-reviewed and traced, not
  executed.

**Needs testing (explicit next steps):**
1. Fix `BookingFlow.test.tsx`'s phone-field selector (see §7).
2. `npx vitest run` → expect 70/70.
3. `npx eslint .` → expect 0 errors.
4. `npx next build` → expect success.
5. `./mvnw test` (full, Testcontainers) → expect 141+ (now more, with the new
   `meExposes...` test) with only the 2 pre-existing `ModuleArchitectureTest` failures.
6. A real login/register/reload smoke test against the live stack.
7. A real click-through of the booking form's new phone/country fields + profile edit
   in `AccountFlow`.

---

## 10. Context/memory/skills mechanisms — what's available and what was used

**Inspected before writing this handoff:**
- `CLAUDE.md` (repo root) — exists, from phase 1 of this session. Points to the `docs/`
  files below as the canonical persistent context and lists the 7 skills. **This file
  was NOT updated this session** to reflect Round A/B's changes (Tasks 1–5, 10–12) —
  it still describes the state as of the initial investigation. **This is a real gap**:
  a future session reading `CLAUDE.md` + `docs/CURRENT_STATE.md` alone would not know
  about any of this session's implementation work unless it also reads this handoff file.
- `docs/{PROJECT_CONTEXT,ARCHITECTURE,SERVICES,DATA_FLOW,CURRENT_STATE,KNOWN_ISSUES,FRONTEND}.md`
  — all exist, all from phase 1/2, **none updated this session**. They describe the
  pre-implementation state (e.g. `KNOWN_ISSUES.md` still lists the currency/atomicity/
  availability bugs as open — they are now fixed).
- `docs/IMPLEMENTATION_PLAN.md` — the 13-task plan, unchanged (it's the plan, not a
  progress tracker).
- `docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md` — the Round A investigation
  record, unchanged, still accurate for Tasks 2/3.
- `.claude/skills/` — 7 skills exist (`backend-spring`, `backoffice-frontend`,
  `database-flyway`, `graphql-contract`, `guest-frontend`, `platform-ops`,
  `platform-testing`), all from phase 1, **not updated this session**. Worth noting from
  an earlier turn: the `Skill` tool did not recognize these by name when invoked
  mid-session (returned "Unknown skill") even though the files are present and correctly
  formatted — suspected to need a session restart to re-index. **Not re-tested this
  turn** — worth checking again after `/clear`, since a fresh session may pick them up
  correctly.
- No MCP tools, no plugins, no other persistent-context mechanism found beyond the
  above files.

**What was used for this handoff:** none of the above were edited — this task is
explicitly to preserve context via a **new** file, not to update the existing
persistent-context docs (that update is itself unfinished work — see §11 and the
continuation instructions).

**What cannot survive `/clear`:** the live reasoning/discovery trail in this
conversation — e.g. *why* `saveAndFlush` was chosen over `save()` (decision 2 in §5), the
exact sequence of live curl-based bug reproduction, the exact moment-by-moment diagnosis
of the failing test (§7) — none of that is recoverable from the code alone. This document
is the only place it now lives. **Read it before touching this codebase again.**

---

## 11. CRITICAL CONTEXT — DO NOT LOSE

1. **The live stack has already been redeployed with everything through V24, by someone
   other than me, at `2026-08-27T11:57:3x` — verify this is still true (`docker inspect`,
   `docker ps`) before assuming otherwise in a future session.** Do not "redeploy" again
   reflexively without checking current state first — it may already be current.
2. **Zero commits exist for any of this work.** Everything is uncommitted, on top of an
   already-large pre-existing uncommitted baseline from before this session even started.
   `git status` will look enormous and undifferentiated — this handoff's §2/§8 are the
   only reliable map of what belongs to *this* work vs. the pre-existing baseline.
3. **The persistent-context docs (`CLAUDE.md`, `docs/*.md`) are now stale** relative to
   the actual code — they describe the pre-implementation state and do not know Tasks
   1–5, 10–12 are done. Do not trust them for "is X implemented" without cross-checking
   against this handoff and the actual source.
4. **One test is failing right now, mid-diagnosis, with a clear next step already
   identified** (§7) — this is the very first thing to finish, before anything else,
   since it's a two-minute fix sitting half-done.
5. **The backend's authorization pattern for `Me`'s new fields was a deliberate,
   considered choice** (schema-map via a service method, not a controller-level
   repository call) specifically to avoid duplicating a known pre-existing architecture
   violation. If continuing this pattern for future GraphQL fields, follow the same rule.
6. **`saveAndFlush` vs `save()` for new-row-with-unique-constraint inserts**: this
   codebase has TWO idioms for this (reservation creation uses plain `save()`; cancellation
   uses `saveAndFlush()`, per its own comment, because it's the one proven to work
   reliably). Task 3's new payment-insert code deliberately used `saveAndFlush()`. If this
   pattern comes up again, prefer `saveAndFlush()` per the existing precedent in
   `BookingServiceImpl#doCancel`.
7. **Task 12's country list and the frontend's `CountrySelect` are generated from /
   read the SAME upstream library (`libphonenumber-js`)** — if either needs to change in
   the future (e.g. a country gets added/renamed upstream), regenerate the migration
   using the exact same method documented in the migration file's header comment, don't
   hand-edit either side independently.
8. **Returning guests' phone/countryCode are intentionally not overwritten by a later
   booking** — if a future task wants this changed, that's new scope, not a bug fix.
9. **The `next.config.ts` `/graphql` rewrite is now dead code, left in place
   deliberately** — don't be surprised it's unused; don't remove it reflexively either
   without checking nothing external depends on it.
10. **`graphql/generated/*.ts` is stale relative to `identity.graphqls`** — cheap to fix
    (`npx graphql-codegen`), just wasn't done. Do it early in the next session to avoid
    it becoming a bigger surprise later.
11. **Tasks 6 and 13 are coupled — 13 cannot be meaningfully done without 6** (the
    `GraphqlClientError.code` plumbing Task 13 needs is pointless without Task 6 first
    making the backend actually return soft-failure promo errors instead of throwing).
    If picking up remaining work, do 6 before 13, not in isolation.

---

## 12. Continuation instructions for the next session

**Do this, in order, without re-deriving any of the above from scratch:**

1. **Read this file first** (`SESSION_HANDOFF.md`), then verify its two most
   perishable claims before trusting anything else in it:
   - `docker ps --format '{{.Names}}\t{{.Status}}\t{{.Image}}'` and `docker inspect
     hotel-backend --format '{{.Created}}'` — confirm the stack is still the
     redeployed-at-`11:57` state (or note if it's changed).
   - `cd frontend-hotel && npx vitest run` — confirm still 69/70 with the same failure,
     or that it's already been fixed by someone else.
2. **Fix the one failing test** (§7): open `frontend-hotel/src/components/booking/BookingFlow.test.tsx`,
   locate the `fillDetailsAndAdvance()` helper, replace the ambiguous
   `screen.getByLabelText(/^Phone/i)` query with a query scoped to `id="f-phone"`
   specifically (confirm first, by rendering and inspecting, exactly which DOM element
   `PhoneField` puts that id on — don't guess). Re-run `vitest` to confirm 70/70.
3. **Re-run the full verification suite** in the order listed in §9's "needs testing":
   vitest → eslint → next build → full `mvnw test` (needs Docker for Testcontainers,
   confirm it's still running) → live smoke test of login/reload.
4. **Do not redo any of the Round A/B work described in §2** — it is done, verified
   compiling, and (per §4) apparently already deployed. Do not "reimplement Task 1" or
   similar from scratch.
5. **Do not revert or "clean up" the large pre-existing uncommitted baseline** that
   predates this session (the pricing-unification work, ADR-009, etc.) — it is someone
   else's in-progress work, not this session's, and was explicitly left untouched
   throughout.
6. Once verification (step 3) is fully green, **update the stale persistent-context
   docs** (`CLAUDE.md`, `docs/CURRENT_STATE.md`, `docs/KNOWN_ISSUES.md` at minimum) to
   reflect that Tasks 1–5, 10–12 are now done — this was identified as a real gap (§10)
   and is itself unfinished work, not optional cleanup.
7. **Then, and only then**, resume the original priority order for the remaining work:
   **Task 6 → Task 13 → Task 7 → Task 8 → Task 9** (per critical-context point 11, 6
   must precede 13; 7/8/9 are independent of everything else and of each other, and can
   be done in any order or in parallel).
8. Regenerate `frontend-hotel/src/graphql/generated/*.ts` (`npx graphql-codegen`) at
   some point before it causes confusion — low priority, cheap, currently harmless.
9. **When in doubt about whether something is "done," don't trust file existence —
   trace it the way this whole session did**: read the actual implementation, run the
   actual test, or query the actual live system. This session's own biggest lesson (the
   strict audit phase) was that a prior round's "implementation plan" looked complete on
   paper but was 0% done in code for 11 of 13 tasks — don't repeat that mistake in
   reverse by assuming everything in §2 above is bulletproof just because it's written
   down here. Verify.
