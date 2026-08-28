---
name: backoffice-frontend
description: Conventions for backoffice-hotel, the staff admin console (Next.js 16 App Router with a BFF). Use when adding or changing an admin page, GraphQL operation, or anything touching its cookie-based session and /api/graphql proxy.
---

# backoffice-frontend

`backoffice-hotel/` — Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4,
`@tanstack/react-query`, `graphql-request`. Port **3101**.

**This is the most completely wired client in the repo.** All 14 pages talk to real
GraphQL. When you need a reference implementation of a pattern, look here first.

## Layout

```
src/app/(auth)/login/                 sign-in
src/app/(backoffice)/                 dashboard · hotels (+[id], +new) · reservations
                                      guests · payments · invoices · promotions
                                      reviews · users · notifications · audit
src/app/api/auth/{login,logout,me}/   BFF route handlers
src/app/api/graphql/                  the authenticated proxy — every backend call
src/components/{admin,hotels,layout,ui}/
src/graphql/                          16 *.graphql operation files + generated/
src/lib/{api,session,format,utils}.ts
e2e/                                  3 Playwright specs
```

## Architecture: a real BFF, and you must not bypass it

```
browser ──► /api/graphql (route handler)
              getSessionToken()          ← httpOnly `bo_session` cookie
              Authorization: Bearer …    ← injected server-side
              fetch(HOTEL_API_URL)       ← the backend URL never reaches the browser
```

- **`src/lib/session.ts`** — `bo_session` cookie: `httpOnly`, `sameSite: 'lax'`,
  `secure` in production, `maxAge` 7 days. Set on login, deleted on logout.
- **`src/lib/api.ts`** — `serverRequest(doc, vars, token?)` for server components and
  route handlers; `proxyRequest(doc, vars)` for client components (posts to
  `/api/graphql`). Both parse `errors[0]` into an `ApiError` carrying
  `extensions.code`.
- Unauthenticated requests to `/api/graphql` get a `401` before anything is forwarded.

**Never** call the backend directly from a client component, and never put the token
anywhere the browser can read it. The whole point of this layer is that it doesn't.

## Adding an admin page

1. Write the operation in `src/graphql/<area>.graphql`.
2. Regenerate types — **but note `codegen.ts` is currently broken**: it points at
   `../backend-hotel/src/main/resources/graphql/schema.graphqls`, which is only the empty
   skeleton. Fix it to `graphql/**/*.graphqls` (the glob `frontend-hotel` uses) before
   running `npm run graphql:generate`. See KNOWN_ISSUES §D1.
3. Add the page under `src/app/(backoffice)/<area>/page.tsx`.
4. Fetch with `useQuery`/`useMutation` + `proxyRequest` (client) or `serverRequest`
   (server component).
5. Surface `ApiError.code` in the UI — the backend returns `FORBIDDEN` for cross-hotel
   access, and staff scoping is real, so a manager of one hotel *will* hit it.

## Backend expectations

Admin resolvers are hotel-scoped: the backend checks
`hasRole("super_admin") || inHotel(hotelId)` inside the service. Most admin queries
therefore require an explicit `hotelId` argument. Pagination uses
`page: PageInput { page, size }` and returns `total · page · size · items`.

`updateAvailability` is `@deprecated` in the schema in favour of
`updateAvailabilityRange`; this app still calls the deprecated one.

## Running it

The `backoffice` Docker service is **profile-gated** (`profiles: ["backoffice"]`), so
`docker compose up` does not start it:

```bash
docker compose --profile backoffice up -d backoffice   # containerised
# or, locally:
cd backoffice-hotel && npm run dev                      # :3101
```

It needs `HOTEL_API_URL` (default `http://localhost:8180/graphql`) and a running backend.

Sign in with `admin@hotelcollection.test` / **`admin123`** (the root README's
`password123` is wrong — see KNOWN_ISSUES §DOC4).

## Housekeeping

`debug2.mjs … debug6.mjs` and `debug-e2e.mjs` sit committed at the project root. They are
scratch scripts, not part of the app — don't extend them, and don't take them as
examples.

## Verify

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e     # Playwright; needs the stack running
```
