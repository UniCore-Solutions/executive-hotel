# HTML → Next.js migration map

## Method

```
hotel-html/src (reference facts)            hotel-nextjs/src (engineering)
──────────────────────────────              ──────────────────────────────
data.js  (fixtures)            →  data/index.ts            (typed fixtures)
mock.js (business rules)       →  services/*.ts            (typed, testable, API-ready)
common.js (state+URL+widgets)  →  context/Search* + lib/dates.ts + components/search/*
common.js (header/footer)      →  components/layout/*
common.js (toast/modal/consent)→  context/* + components/ui/* + components/layout/Consent*
ui.js   (micro components)     →  components/ui/*          (React atoms)
*routes.js (page init scripts) →  app/*/page.tsx           (server components + client islands)
*.html (content + copy)        →  components/pages + data fixtures (SSR)
dist/output.css (tokens)       →  globals.css @theme       (design tokens)
tests/ (playwright e2e)        →  e2e/*.spec.ts            (Playwright)
```

## What was deliberately NOT copied

- `window.RC` global + IIFEs → React client components with injected contexts (no globals).
- innerHTML template strings → JSX (escaping by default — XSS surface removed).
- `history.replaceState` URL rewriting → `useRouter().replace` with the same param semantics.
- DOM-queried state (`$('#seg-dates-value')`) → derived React state (no imperative DOM sync).
- Custom events (`rc:dates`, `rc:currency`) → React context subscriptions (same behaviors surface: labels refresh, panels reposition by Refs).
- `setTimeout` latency mocks → promise-based service functions with identical delay constants, consumed by `useEffect` loaders (matching skeleton UX).
- Blank-until-JS pages → server-rendered content + client interactivity everywhere the reference had JS fill-ins.

## Behavioral parity (asserted by tests/E2E)

1. URL round-trip: any page URL with full context parses identically; back/forward/reload restore state (e2e).
2. Exact strings: validation, promo errors, badges, legal copy (unit tests grep fixtures; visual QA page-by-page).
3. Deterministic data: availability, demand, QR bitmap, demo seeds, promo outcomes (unit tests).
4. Pricing math: same values for every fixture combination + promo + extras (unit tests vs reference numbers, e.g. RC-DEMO2: originalTotal 3987, discount 356, total 3631).

## Files that were ported conceptually but re-engineered

- `QR` (deterministic mulberry32 QR) — same algorithm, typed module + tests.
- `quoteTable` — React component with the same row anatomy.
- `steps` — same stepper anatomy (done=gold ✓, active=navy, upcoming=ghost).
- Calendar — same 2-month/Monday/state-machine semantics; implemented as controlled React with focus retention.

## Verification protocol per page

[ ] renders with same structure/copy — [ ] URLs deep-link correctly — [ ] round-trip reload — [ ] mobile + desktop — [ ] keyboard/focus — [ ] console clean — [ ] e2e covers https:// — see docs/PROJECT_ROADMAP.md for the per-page checklist state.
