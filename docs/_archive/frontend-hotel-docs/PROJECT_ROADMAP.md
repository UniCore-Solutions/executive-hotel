# Project roadmap & task ledger

Legend: ✅ done/verified · 🚧 in progress · ⬜ pending

## Phase 0–1 Environment & OpenCode system

- ✅ Repo/env inspection (Node 24, npm 11, Chrome 145, Docker 29, Next 16 toolchain)
- ✅ Discovery of reference (16 pages, all JS modules, docs, tests)
- ✅ `.opencode/` agents (build/explorer/reviewer/security/visual-qa/architect) + commands (verify/review/security/visual-qa) + skills (hotel-project-facts, hotel-responsive-audit) + AGENTS.md
- ✅ SKILLS_AUDIT.md

## Phase 2 Documentation

- ✅ DISCOVERY · PLAN · PAGE_INVENTORY · DATA_FLOW · BOOKING_WORKFLOW · AUTHENTICATION_WORKFLOW · ACCOUNT_WORKFLOW · HTML_TO_NEXTJS_MIGRATION · PROJECT_ROADMAP · DECISIONS
- 🚧 ARCHITECTURE · TECH_STACK · ROUTES · TESTING · SECURITY · DEVELOPMENT · DESIGN_SYSTEM · PERSONAS · FEATURE_INVENTORY · UI_REFERENCE · PRD (applied to Next.js)

## Phase 3 Foundation

- ✅ types/ (domain) — data/ (fixtures) — lib/ (dates, url, format, hash, qr, ics, validation)
- ✅ services/ (pricing, availability, reservations, auth, consent, newsletter, cancellation, payment, fx) + unit tests

## Phase 4 Contexts + UI kit + layout

- ✅ SearchProvider (URL-driven) · ToastProvider/ModalContext · AuthSession hook
- ✅ components/ui (Badge, Stars, QuoteTable, QR, Steps, PromoField, ExtrasPicker, Input/Select/Button atoms, Modal, Skeleton)
- ✅ components/layout (Header incl. utility bar + mobile menu, Footer, ConsentBanner, ConsentDialog)
- ✅ globals.css design tokens (Tailwind v4 @theme) + fonts (next/font)

## Phase 5 Search widget

- ✅ DatePicker (2-month calendar), GuestSelector (steppers + ages), SearchBar (segments/panels), MobileSheet, StickyDock

## Phase 6 Core pages

- ✅ / (home) — /search — /hotel — /room/[roomId]

## Phase 7 Journey pages

- ✅ /booking — /confirmation — /reservation — /checkin — /account

## Phase 8 Static pages

- ✅ /offers — /faq — /contact — /terms — /privacy — /cookies — /cancellation-policy — robots/sitemap/metadata

## Phase 9 Testing

- ✅ Unit: dates/URL, pricing, promos, availability, reservations, auth, cancel, QR, ics (89 vitest tests green)
- ✅ Component: search widget, booking form, quote table, guest steppers, calendar, check-in, account
- ✅ E2E: journey (home→search→room→booking→confirmation→reservation→checkin), mobile sheet, deep links, errors, auth, modify/cancel + a11y axe spec + responsive overflow spec — 76/76 passing (Playwright, chrome channel, workers 1)
- ✅ Accessibility audit: axe-core (wcag2a+aa) sweep on all 16 routes — 0 serious/critical (violations fixed 2026-08: see DECISIONS D-18)

## Phase 10–14 Quality gates

- 🚧 Independent review (reviewer verdict) + fixes
- ✅ Security audit + npm audit (0 vulns) + fixes (headers, CSP, innerHTML removal — see DECISIONS D-17)
- ✅ Visual QA vs reference (1280 + 390 screenshots, text/pixel/height metrics) + fixes — see DECISIONS D-19; nits documented (terms heading, AVAILABLE casing)
- ✅ Mobile responsive audit (390/768/1280, all 16 routes): fixed duplicate search bar on mobile + compact extras in booking cards — see DECISIONS D-20
- ✅ Tooling hardening: recreated `postcss.config.mjs` (Tailwind utilities were silently dropped from builds — fixed a 21-test e2e regression), vendored `tw-animate-css`, recreated `eslint.config.mjs`, `settleImages()` for CDN images
- ✅ Perf pass: DCL 49–232 ms, CLS 0.00, lazy-loading completed for below-fold images (see DECISIONS D-19)
- 🚧 Docker (multi-stage standalone, non-root) + docker-compose + .env.example
- 🚧 Final completeness audit + final verification run

## Quality gate protocol

```
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run test:e2e && npm run audit
```

plus reviewer approval, security verdict, visual-qa verdict. No gate is assumed — each is run.

## shadcn/ui integration audit (2026-08)

- ✅ Primitive re-centering: Button (CTA canon variants/sizes, asChild), Input (no h-11, size=sm), Label, Skeleton; new ui/dialog.tsx (Radix) with ModalProvider refactored onto it (focus trap/restore, aria-modal); deleted dead ui/Select.tsx
- ✅ Migration of every raw button/input/label across 18 files onto primitives (visuals pixel-identical; custom widgets kept — segments, tabs, day cells, accordion, hamburger, date triggers)
- ✅ Regressions fixed: Slot asChild 500 on /booking, BookingFlow input ids, ModStepper props, ConsentManager contrast
- ✅ Gates green: typecheck, lint 0, format, vitest 89/89, build, e2e 76/76, audit 0
- ✅ Parity re-probed: search/contact/faq 0.00%, booking −0.58%, checkin −0.29%, confirmation −0.05%, room +1.62%; migrated elements measure identical to reference
- 📌 Known pre-existing deltas (follow-up, not regressions): hotel ±6% (known), reservation +7.0% (demo seed extras + banner text), account +4.9% (missing login-form/auth-view ids, taller auth card)
- 🚧 Final completeness audit + final verification run

## Homepage hero + second homepage variant (2026-08)

- ✅ Existing hero: dark fallback + `[data-hero] img` navy fallback (no light strip while loading), lighter bottom gradient so the image reaches the section edge naturally (D-23; deliberate deviation from the reference's 85% bottom gradient)
- ✅ `/index-2` variant: upper search bar hero (existing SearchBar reused), editorial intro, "Discover new ways to stay" section (6 fixture-data cards), "Plan your stay" band — all house design tokens/components
- ✅ Responsive verified at 390/768/1280 (no overflow, no duplicate search, cards 1/2/3 cols, hero image full-coverage)
- ✅ New e2e/index-2.spec.ts (3 tests) — suite 79/79; gates green (typecheck, lint, format, vitest 89/89, build)

## Platform build-out — search facets + hotel sections (2026-08)

- ✅ Search facets on `/search`: price / meal plan / refundability / room type / amenities, driven by `f_*` query params (D-24) — `src/lib/filters.ts` codec + `filterEntries()` in services, unit-tested; URL round-trip, reload, back/forward verified; stay-state edits preserve facets; `f_*` never leaks into room/booking URLs
- ✅ `/hotel` gallery section ("Inside the hotel", existing Property.gallery fixture, featured 2×2 mosaic) + policies section (new `Property.policies` fixture, icons `child`/`paw`/`cigarette`) (D-25)
- ✅ New e2e/filters.spec.ts (7 tests) — suite 86/86; vitest 108/108; axe 0 serious/critical (incl. filter panel open); no overflow at 390/768/1280

## Platform build-out — room-on-hotel-page + homepage activity/CTA (D-26)

- ✅ Room detail moved onto the hotel page: `/hotel?roomId=…` renders the existing `RoomDetails` inline (single implementation); `roomURL()` emits the new URL everywhere; `/room/[roomId]` redirects (404 for unknown ids); RoomDetails URL-sync preserves `roomId` and snapshots `initialPlan`
- ✅ Homepage "Continue where you left off" — anonymous recent searches + viewed rooms via `src/services/activity.ts` (localStorage, API-ready), recorded from SearchBar/SearchSheet/RoomDetails; section hidden when no history
- ✅ Homepage closing "Plan your stay" CTA band (Search availability + View offers), matching `/index-2`
- ✅ New e2e/activity.spec.ts (2 tests) + updated room-URL assertions across specs — suite 89/89; gates green (typecheck, lint, format, vitest 108/108, build — `/` and `/hotel` stay static); axe clean on `/hotel?roomId=…`
