---
name: guest-frontend
description: Conventions for frontend-hotel, the public guest booking site (Next.js 16 App Router). Use when adding or changing a page, component, context or service there, and to know which parts are backed by the live API versus the static fixture.
---

# guest-frontend

`frontend-hotel/` — Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4,
Radix primitives, lucide icons. Port 3000. `output: 'standalone'`.

## Layout

```
src/app/          18 routes. Server Components for shell/metadata,
                  client components (`'use client'`) for interactive flows.
src/components/   ui/ · layout/ · home/ · hotel/ · room/ · search/ · booking/
                  · account/ · auth/ · offers/ · chatbot/
src/services/     the data seam — every backend call goes through here
src/graphql/      *.graphql operations + generated/ (codegen client preset)
src/context/      SearchContext · SessionContext · ToastContext · ModalContext
src/lib/          dates · format · filters · validation · ics · qr · links
src/constants/    booking · i18n · icons · navigation · search
src/types/        domain types — single source of truth
src/data/         static fixture (641 lines) — see the split below
e2e/              12 Playwright specs
```

`src/app/api/*`, `src/features/*` and `src/config/` are **empty leftover directories**
from an abandoned BFF/feature-module plan. There are **no route handlers** in this app.

## The most important thing to know: fixture vs backend

This app is **mid-migration**. Some routes render live API data, some render
`src/data/index.ts`, and a few switch between the two on a query param.

**Backend-backed (real):** search, hotel/room detail when given a `hotelid` UUID,
quote/pricing, reservation create/lookup/cancel, payment, confirmation, account bookings,
homepage featured sections.

**Fixture-backed (`import … from '@/data'`, 17 call sites):** `app/page.tsx` (home),
`app/hotel/page.tsx` legacy branch, `app/index-2/page.tsx`, `app/faq/faq-client.tsx`,
`components/layout/{Header,Footer,SearchSheet}.tsx`,
`components/home/{RoomsGrid,DiscoverSection,RecentActivity}.tsx`,
`components/offers/OffersGrid.tsx`, `components/room/RoomDetails.tsx` (EXTRAS),
`services/{siteSearch,availability}.ts`.

The dual-mode pattern:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-.../i;
const hotelId = firstParam(sp.hotelid);
if (hotelId && UUID_RE.test(hotelId)) { /* backend */ } else { /* legacy fixture */ }
```

> The fixture describes **Executive Hotel, Rabat**. The database contains **Azure Bay
> Resort, Dar Zellij, Villa Aurelia**. When adding a feature, prefer the backend path and
> do not deepen the fixture's reach.

## Service layer rules

Components never call `fetch` and never touch `localStorage` — everything goes through
`src/services/`.

| Service | Backing |
|---|---|
| `graphqlClient.ts` | the transport for everything below |
| `catalog.ts` · `quote.ts` · `reservations.ts` · `payment.ts` · `homepage.ts` · `platform.ts` · `hotelList.ts` · `extras.ts` | **real GraphQL** |
| `auth.ts` | **real REST** `:8180/api/v1/auth/*` |
| `pricing.ts` | promo *validation hints only* — hydrated from the backend by `pricingHydration.ts` |
| `newsletter.ts` · `consent.ts` · `activity.ts` | `localStorage` |
| `siteSearch.ts` · `availability.ts` (`demandFor`) | fixture / deterministic hash |

`graphqlClient.gqlRequest` picks its URL by environment: browser → same-origin
`/graphql` (rewritten in `next.config.ts` to `API_INTERNAL_URL`, **baked at build
time**); server → the backend directly. Always `cache: 'no-store'`. It attaches
`Authorization: Bearer` from the in-memory token.

**Error policy is deliberately inconsistent and you must pick one on purpose:**
`catalog.ts` documents *"no silent mock fallbacks"* and lets errors propagate;
`homepage.ts` swallows everything and returns `EMPTY_HOMEPAGE`. Prefer `catalog.ts`'s
behaviour for anything new — a silent fallback makes an outage look like content.

## Auth caveat

`services/auth.ts` stores the JWT in `let _token` / `let _session` — **module memory**.
A page reload signs the user out. `restoreSession()` exists but is never called.
`reset()` fakes a password reset with no backend call. If you touch auth, read
KNOWN_ISSUES §F2 first; `backoffice-hotel`'s httpOnly-cookie BFF is the pattern to copy.

## Conventions worth keeping

1. **The URL is the state** for stay parameters. `SearchContext` mirrors the query string;
   never add a second copy (no `localStorage` for search state).
2. **Types once** in `src/types/`; map backend shapes to them in the service, not in the
   component (`mapRoomTypeToRoom`, `mapHotelToProperty`, `mapOfferToOffer`).
3. **Strict TS, no `any`.**
4. Money arrives in MAD. `toBaseMad()` in `catalog.ts` converts using build-time
   `NEXT_PUBLIC_FX_*` values — the same constants are duplicated in `lib/format.ts`.
5. Accessibility: semantic HTML, labels, `aria-live` for dynamic messages, keyboard-
   operable calendar/steppers/modals. `e2e/a11y.spec.ts` uses axe.
6. Adding an external image host means updating **both** `images.remotePatterns` and the
   CSP `img-src` in `next.config.ts`.

> `frontend-hotel/AGENTS.md` is stale: it references `src/components/cards/` and
> `src/services/cancellation.ts` (neither exists), describes `pricing.ts` as the quote
> engine (the math moved to the backend), and its rule 8 tells you to preserve
> "prototype/simulated" copy — which the in-progress integration work is removing.

## Verify

```bash
npm run typecheck && npm run lint && npm test    # tsc --noEmit · eslint · vitest
npm run test:e2e                                 # Playwright; needs the stack running
```

Baseline as of 2026-08-27: typecheck clean, **63/63 vitest green**.
