# Plan — HTML product → Next.js application

## Goal

Reimplement the complete Executive Boutique Hotel Rabat guest frontend from `hotel-html/` as a production-quality **Next.js (App Router, TypeScript, Tailwind v4)** application with clean architecture, tests, documentation, OpenCode tooling, and verification. The HTML app is the product reference; the Next.js app is a new engineering (no mechanical copy, no runtime dependency on `hotel-html/`).

## What already exists

- Reference product: 16 pages, full booking/search/check-in/account flows, deterministic mock business layer, e2e suite, PRD + tracking docs.
- Partial Next.js scaffold at project root (from earlier session): Next 16, Vitest, Playwright, ESLint, Prettier+tailwind plugin installed; foundation files exist but diverge from reference specs in places (URL semantics, exact strings, header anatomy, missing routes, utilities, tests, docs, Docker, OpenCode config).

## What must be recreated (Next.js)

1. All 16 routes with identical content, copy, design tokens and behavior.
2. The search widget (calendar, guests, promo panels, mobile sheet, sticky dock) as client components driven by one URL-state provider.
3. Services: pricing/promo/availability/reservations/auth/consent/newsletter/cancellation/payment — deterministic, localStorage-backed, API-ready.
4. Mock auth + account dashboard; reservation lookup/modify/cancel; online check-in wizard.

## What must be improved (documented decisions — see docs/DECISIONS.md)

- `.ics` add-to-calendar on confirmation (documented, unimplemented upstream) — implemented.
- 15-minute booking hold countdown chip (documented, unimplemented upstream) — implemented client-side.
- Modify dates/occupants with price differential on My Reservation (documented, unimplemented upstream) — implemented.
- Booking-side promo field now applies a valid code to the quote (upstream: status line only) — fixed.
- Check-in notes persisted on the reservation — fixed.
- SSR-first content (no blank-flash fill-ins), per-page metadata/JSON-LD on the server.
- Sticky/visual-parity fixes (home header "Book now" anchor, checkout time text `by 11:00` kept as shipped).

## What must NOT be invented

Filters (`f_*`), alternate-date suggestions, long-stay dashboard pagination, real payments, real auth. Kept at shipped reference scope; documented in PRD-level docs as future.

## Implementation phases

| Phase | Content                                                                         | Gates                 |
| ----- | ------------------------------------------------------------------------------- | --------------------- |
| 0–1   | Environment, OpenCode project system, discovery                                 | —                     |
| 2     | Docs (DISCOVERY, PLAN, workflows, roadmap)                                      | reviewed for accuracy |
| 3     | Foundation: types, data, lib (dates/url/fmt/hash/qr/ics), services + unit tests | typecheck+tests       |
| 4     | Contexts (Search/Toast/Modal/Auth) + UI kit + layout (header/footer/consent)    | typecheck+tests       |
| 5     | Search widget (calendar/guests/promo/sheet/dock)                                | tests                 |
| 6     | Pages: home, search, hotel, room                                                | build+inspect         |
| 7     | Pages: booking, confirmation; reservation, checkin, account                     | build+inspect         |
| 8     | Pages: offers, faq, contact, legal                                              | build+inspect         |
| 9     | E2E suite (journey, mobile, deep links, errors)                                 | test:e2e              |
| 10    | Independent review + fixes                                                      | /review               |
| 11    | Security audit + npm audit + fixes                                              | /security             |
| 12    | Visual QA vs reference (all viewports) + fixes                                  | /visual-qa            |
| 13    | Docker (multi-stage standalone, non-root), .env.example                         | build image           |
| 14    | Final completeness audit + final verification                                   | all gates             |

Risk register:

- **Reference divergence risk** — mitigated by exhaustive discovery docs + reviewer/visual-qa checks with exact-string checklist.
- **Date/timezone determinism** — services use local-date math (string-sliced ISO parsing, never `Date.parse`); tests use fixed fixtures and a fixed `today` injection point where needed.
- **URL round-trip regressions** — central `lib/dates.ts` parsed per route; unit tests for read/write symmetry; e2e reload/back checks.
- **localStorage boundaries** — services guard `typeof window` and are the only storage access; tests run with jsdom + fresh stores per test.
- **External image host flakiness** — images carry dimensions + neutral background + fallback; e2e never asserts on specific pixel content.

## Verification requirements (no false completion)

A feature or phase is complete only when the relevant verification has actually run and passed:

```
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run test:e2e && npm run audit
```

plus browser visual QA against the reference at 320/360/390/430/768/1024/1280/1440 and an independent reviewer verdict.

## Task ledger (status updated in docs/PROJECT_ROADMAP.md)

Discovery ✅ → Docs ✅ → Foundation → Search widget → Core pages → Booking/account pages → Static pages → Tests → E2E → Review → Security → Visual QA → Docker → Final audit.
