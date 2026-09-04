# AUTHENTICATION

Guest-site (`frontend-hotel`) authentication: email/password (existing, OTP-gated
registration since V37) plus Google OAuth2/OIDC SSO (since V38, 2026-09-04). Scope:
`frontend-hotel` + `backend-hotel` only — `admin-hotel`'s staff console and the retired
`backoffice-hotel` are untouched; staff accounts are admin-provisioned, not self-registered,
so SSO doesn't apply there.

## 1. Why a login-grant handoff exists

The backend (`backend-hotel`) is a stateless bearer-JWT API with no cookie mechanism of its
own (`SessionCreationPolicy.STATELESS`) — the frontend's Next.js BFF is the only thing that
ever holds a session, in an httpOnly `guest_session` cookie (see ARCHITECTURE.md §4).

Google's `redirect_uri` must be a **fixed backend URL** registered in Google Cloud Console
(`GOOGLE_REDIRECT_URI`, e.g. `http://localhost:8180/api/auth/google/callback`) — it can't
point at the frontend, and the backend can't set a cookie on the frontend's origin anyway.
So after the backend validates the Google identity, it can't hand the browser a JWT directly
without putting it in a URL (which would leak into browser history, server logs and Referer
headers). Instead it mints a random, short-lived, **single-use login grant**, redirects the
browser to a frontend page with `?grant=...`, and that page calls a same-origin BFF route
that redeems the grant for the real JWT server-side — via the *same* `setSessionCookie()`
helper `login`/`register/verify` already use. The raw JWT never appears in a URL.

```
Browser                Frontend BFF              Backend                      Google
  |  click "Continue     |                          |                            |
  |  with Google" (<a>)  |                          |                            |
  |--------------------->|                          |                            |
  |  GET /api/auth/google/start?redirect=/account    |                            |
  |                      |--302 to backend---------->|                            |
  |  GET /api/auth/google?redirect=...             |                           |
  |<-----------------------------------302 to Google--|                            |
  |------------------------------------------------------------------------------>|
  |                                    user consents                              |
  |<-------------------------------------------302 with code+state----------------|
  |  GET /api/auth/google/callback?code=...&state=...                          |
  |                      |                          |-- validate state (single-use)|
  |                      |                          |-- exchange code w/ Google   |
  |                      |                          |-- verify ID token (Nimbus)  |
  |                      |                          |-- find/link/create User     |
  |                      |                          |-- mint login_grant          |
  |<-----------------------------------302 to /account/oauth-callback?grant=...---|
  |  GET /account/oauth-callback?grant=...            |                           |
  |--------------------->|                          |                            |
  |                      |  POST /api/auth/google/session {grant}                 |
  |                      |------------------------->|                            |
  |                      |                          |-- redeem grant once --> JWT |
  |                      |<--------AuthPayload------|                            |
  |                      |-- setSessionCookie(token) (same helper as login) --    |
  |<--{ok:true}----------|                          |                            |
  |  session.refresh() -> GET /api/auth/me -> router.replace(redirect)            |
```

Two ephemeral, DB-backed tables support this (`V38__google_oauth_sso.sql`):

- **`oauth_states`** — exists *before* the user is known: the CSRF-defeating `state` sent to
  Google plus the OIDC `nonce` the returned ID token must echo, and the guest-site path to
  return to. Single-use (`consumed_at`), short TTL (`app.oauth.state-ttl-minutes`, default 10).
- **`login_grants`** — exists *after* the user is known: the backend→frontend handoff itself.
  Single-use, shorter TTL (`app.oauth.grant-ttl-minutes`, default 2 — the frontend redeems it
  immediately).

Both are DB-backed rather than an in-memory cache, matching this codebase's `otp_codes`
durability posture (testable, survives an app restart mid-flow).

## 2. The provider abstraction (`identity/`)

Mirrors the existing `EmailProvider`/`SimulatedEmailProvider`/`SmtpEmailProvider` pattern —
the established idiom here for "infrastructure port lives outside `service/`":

```
ExternalIdentityProvider  (port: type() / buildAuthorizationUrl() / exchangeCode())
        ^
        |
  GoogleIdentityProvider   <- the only Google-specific class in the backend
        |
IdentityProviderRegistry   <- resolves a provider by name; absent = disabled
```

`GoogleIdentityProvider` is `@ConditionalOnProperty(prefix="app.oauth.google", name="client-id")`
— when `GOOGLE_CLIENT_ID` is blank, its bean never registers, so `IdentityProviderRegistry` has
no `GOOGLE` entry and `GET /api/auth/google` 404s cleanly. No other code branches on "is
Google enabled?".

ID-token validation (signature, issuer, audience, expiry, subject) uses `com.nimbusds:oauth2-oidc-sdk`
— Google's own recommended library class for server-side Java, not hand-rolled crypto, and not
`spring-boot-starter-oauth2-client` (which assumes a session-based `ClientRegistrationRepository`
model this stateless-bearer-JWT app doesn't have). No access/refresh token is ever requested,
stored, or returned by `ExternalUserInfo` — only `subject`/`email`/`emailVerified`/`displayName`.

### Adding another provider (Apple, Microsoft, GitHub, …)

1. Add a value to `identity/IdentityProviderType`.
2. Write a new `ExternalIdentityProvider` implementation (its own package-private class, like
   `GoogleIdentityProvider` — the only place that provider's SDK/HTTP calls live).
3. Add an `app.oauth.<provider>.*` config block (client id/secret/redirect URI) mirroring
   `app.oauth.google.*`.

Nothing else changes: not `ExternalAuthService`, not the controller, not the database schema,
not the frontend (the same `GoogleButton`-shaped component works for any provider — a future
multi-provider UI would just render one such button per configured provider).

## 3. Account-linking policy

Implemented in `service/impl/ExternalIdentityLinker.findOrLinkOrCreate`, run once per callback
inside a single transaction (`user.registered`/`user.external_identity_linked` events, both the
`(GOOGLE, subject)` link and any user-status change, all commit atomically):

| Local account state by email | `(provider, subject)` already linked? | Outcome | Password touched? | `user.registered` published? |
|---|---|---|---|---|
| any | Yes | Log in as that user | No | No |
| none | No | Create `active`, `emailVerifiedAt=now`, `passwordHash=null`, `guest` role | No | Yes |
| `provisioned` (silent accountless-booking account) | No | Complete it — fill blank profile fields, → `active` | No (stays null) | Yes |
| `pending_verification` (password-registered, OTP not yet confirmed) | No | The provider's verified email supersedes the pending OTP → `active` | No | Yes |
| `active`, provider reports `email_verified=true` | No | **Link only** — no profile/password change | No | No |
| `active`, provider reports `email_verified=false` | No | Reject (`ACCOUNT_CONFLICT`) — defensive; Google always verifies in practice | — | — |
| `locked` / `inactive` | No | Reject (`ACCOUNT_CONFLICT`) | — | — |

This is deliberately not "merge on unverified email" — auto-linking to an existing `active`
account only happens because Google itself has proven ownership of that email
(`email_verified=true` in the ID token), never on the email string alone. A brand-new local
user created this way needs no separate email-verification step for the same reason —
`passwordHash` stays `null` (already nullable since V27, the same shape passwordless
`provisioned` accounts use), so the account is Google-sign-in-only until the guest optionally
sets a password later via profile settings.

A concurrent duplicate sign-up (two devices completing the same brand-new Google account at
once) is handled the same way `GuestProvisioningServiceImpl.ensureAccount` already handles the
analogous accountless-booking race: catch the `users.email` unique-constraint violation on
save, re-query, and continue with the winner — never two users, never a 500.

## 4. Backend REST contract

| Endpoint | Method | Auth | Notes |
|---|---|---|---|
| `/api/auth/{provider}` | GET | `permitAll` | `?redirect=` optional (validated safe relative path). 302 → provider consent screen, or 404 if `{provider}` is unknown/disabled. |
| `/api/auth/{provider}/callback` | GET | `permitAll` | Always a 302 back to the guest site — success carries `?grant=...`, failure carries one of the closed error codes below. Never a JSON error (this is a browser navigation, not an XHR). |
| `/api/auth/oauth/session` | POST | `permitAll` | Body `{"grant":"..."}` → `AuthPayload` (same shape `login`/`register/verify` return), or `404`/`409` for an invalid/expired/already-used grant. Called by the frontend's BFF only, never the browser directly. |

Closed error codes on the callback's failure redirect (`?oauthError=<code>`) — deliberately
coarse; the specific cause is logged server-side, never distinguished to the browser:

| Code | Meaning |
|---|---|
| `access_denied` | The user cancelled/denied consent at the provider. |
| `state_invalid` | `state` missing, unknown, expired, or already used — one code for all four. |
| `provider_error` | Unknown/disabled provider, code-exchange failure, or ID-token validation failure. |
| `account_conflict` | The resolved local account can't be signed into this way (locked/inactive, or active+unverified). |

## 5. Configuration

`backend-hotel` (`application.yaml` under `app.oauth`, mirrors the `app.email`/`app.otp`
commenting style — see `.env.example`):

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8180/api/auth/google/callback
OAUTH_STATE_TTL_MINUTES=10
OAUTH_GRANT_TTL_MINUTES=2
OAUTH_CLEANUP_INTERVAL_MS=300000
```

A blank `GOOGLE_CLIENT_ID` disables Google sign-in entirely (§2) — the same "blank = disabled"
convention as `EMAIL_PROVIDER`/the payment webhook secret. `docker-compose.yml`'s `backend`
service forwards these three env vars through explicitly (compose does not forward arbitrary
host env vars). `frontend-hotel` needs one new variable:

```env
# The backend's host-reachable address, used only by /api/auth/google/start.
BACKEND_PUBLIC_URL=http://localhost:8180
```

This is **not** the same thing as the existing `API_INTERNAL_URL` (the Docker-internal
`http://backend:8180/graphql` used for server-to-server fetches). `/api/auth/google/start` is
the one route in this app that redirects the **browser itself** to the backend — a real
top-level navigation, not a server-side fetch — so it needs an address the browser can
actually resolve. Sending the browser the internal `backend` hostname produces
`DNS_PROBE_FINISHED_NXDOMAIN` (caught live during this feature's own rollout — see the
`docker-compose.yml` frontend service's `environment:` block). Every other `/api/auth/*` route
(including `/api/auth/google/session`) is an ordinary server-side BFF fetch and correctly
keeps using `API_INTERNAL_URL`.

**Google Cloud Console**: create an OAuth 2.0 Client ID (Web application), add the exact
`GOOGLE_REDIRECT_URI` value as an authorized redirect URI. For a production deployment, add
that environment's own callback URL (`https://<backend-host>/api/auth/google/callback`) —
the redirect URI is provider-side configuration, not something this app derives automatically.

## 6. Security notes

- **Client secret**: only ever read server-side (`GoogleIdentityProvider`'s constructor); never
  logged, never returned by any endpoint, never reaches the frontend.
- **State/nonce**: `state` is single-use and consumed *before* any network call, closing the
  replay window regardless of what happens afterward; the OIDC `nonce` is checked against the
  ID token's own `nonce` claim during validation, defeating token replay across sessions.
- **Redirect targets**: `?redirect=` is validated as a safe relative path on both sides — the
  frontend's `lib/safeRedirect.ts` before sending it, and the backend's `util/SafeRedirect`
  again before persisting it — never a full URL, so this can't become an open redirect.
- **No access/refresh tokens stored** — `ExternalUserInfo`/`user_external_identities` carry
  only `subject`/`email`/`emailVerified`/`displayName`; this app never calls a Google API on
  the user's behalf.
- **Minimum scopes**: `openid email profile` only.
- **Rate limiting**: `POST /api/auth/oauth/session` shares the same 20/min budget as
  login/register (`RateLimitFilter`); the GET start/callback legs are safe methods and are
  never rate-limited, consistent with every other GET in this app — the real anti-abuse
  control there is the single-use `state` row plus Google's own consent screen.
