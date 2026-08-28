# Authentication & account workflow

## Scope

Mocked client-side authentication (prototype), clearly isolated behind `src/services/auth.ts`. It is **not** production authentication: credentials are stored in localStorage, passwords are plaintext, sessions never expire. Copy across the UI keeps the "prototype" wording per the reference.

## Routes & states

| Route                | View                                                   | Entry                                            |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `/account`           | Sign-in / Create account tabs (auth view) or dashboard | header/utility `Account`, footer `Guest account` |
| `/account` (session) | Dashboard: profile, bookings, preferences              | auto after login/register                        |

## Flow details

**Sign in** — email + password; busy states (`Signing in…`, `Checking your details…`); errors per field (`Enter a valid email address.`, `Enter your password.`); status auth message on failure (`Incorrect email or password.`); success toast `Welcome back, {name}.` + `Signed in ✓`; session stored `rc_session_v1 {email, name, at}`.

**Create account** — first/last name (`^[A-Za-zÀ-ÿ' -]+$` required), email, password ≥ 6, confirm match (`Passwords do not match.`); duplicate email → `An account with this email already exists. Sign in instead.`; success auto-login + toast `Your account is ready — welcome to the Executive Boutique collection.`; demo hint box (`demo@hotelcollection.com` / `demo1234`) always seeds the demo user.

**Forgot password** — mock: `If an account exists for this email, a reset link has been sent (mock).` in emerald; no real email.

**Sign out** — removes session, returns to auth view, header label resets to `Account`.

## Dashboard

- Profile card: initials avatar, `Welcome, {full name}`, email, `Signed in · guest account`, Sign out.
- Your bookings: reservations filtered by session email (`byEmail`); empty state with `Start a booking` CTA; cards link to `/confirmation?ref=…` with room image, ref chip, dates, nights, plan, total; status pills Confirmed (navy) / Checked in (emerald) / Cancelled (clay); `New booking` CTA.
- Preferences & help: cookie settings (consent dialog), booking lookup, online check-in, FAQ; note `Currency, language and cookie choices are saved on this device.`

## Boundaries

- `auth` service: `login, register, reset, logout, session, subscribe(sessionChange)` — localStorage access only here (and `users`/`session` keys allowlisted in docs/SECURITY.md).
- Header booking-form prefill reads the session through the same service via a React hook; no direct `localStorage` in components.
- E2E: login/register flows assert storage writes and header rename, and assert mock-nature copy where required.

## Account → reservation linkage

Reservations are matched by the email used at booking (`byEmail`), which for the seeded demo user corresponds to `RC-DEMO1`. New bookings made while signed in store the session email in the guest email field (prefilled), so they appear on the dashboard automatically.
