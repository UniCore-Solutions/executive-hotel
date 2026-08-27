# AGENTS.md — hotel-nextjs

Next.js (App Router, TypeScript, Tailwind v4) reimplementation of the **Executive Boutique Hotel Rabat** guest frontend. The static HTML reference lives in `../hotel-html` (sibling directory) — product truth; this repo — engineering.

## Commands

| Command                                        | Purpose                                 |
| ---------------------------------------------- | --------------------------------------- |
| `npm run dev`                                  | dev server                              |
| `npm run build` / `start`                      | production build / serve                |
| `npm run typecheck`                            | `tsc --noEmit` (strict)                 |
| `npm run lint`                                 | ESLint (next)                           |
| `npm run format` / `format:check`              | Prettier (tailwind plugin)              |
| `npm test`                                     | Vitest unit + component tests           |
| `npm run test:e2e`                             | Playwright end-to-end suite             |
| `npm run audit`                                | `npm audit`                             |
| `node tests/reference-server.mjs` (see `e2e/`) | serve the HTML reference for comparison |

## Architecture in one screen

```
src/app/            routes (server components for static content; client where interactive)
src/components/     ui/ (atoms) · layout/ (header, footer, consent) · search/ (widget)
                    · cards/ (room, offer, experience, review…) · booking/ · account/
src/context/        Search (URL-driven stay state) · Toast · Modal · Auth session
src/services/       pricing, availability, promo, reservations, auth, consent, newsletter, cancellation, payment, fx
src/data/           fixture data (property, rooms, offers, extras, demos)
src/lib/            dates, url, format, hash, qr, validation, ics
src/types/          domain types (single source of truth)
e2e/                Playwright specs (journey, mobile, deep links, auth, reservations)
tests/unit?         Vitest under src/**/*.test.ts(x) (co-located)
docs/               product + engineering documentation (see docs/README.md)
```

## Rules (do not violate)

1. **URL is state** — stay params live in the query string; `SearchProvider` is their only client mirror. No second copy (no localStorage for search state).
2. **Single source of truth** — room/hotel/plan types once in `src/types`; fixture data once in `src/data`; pricing/promo/availability rules once in `src/services`.
3. **Service boundary** — components never touch `localStorage`. Storage services are client-guarded and API-ready (swap a promise-based HTTP client later without UI changes).
4. **Exact product copy** — strings, prices, messages and flows mirror the reference exactly (see `.opencode/skills/hotel-project-facts`); deviations require a documented decision in `docs/DECISIONS.md`.
5. **Strict TS, no `any`, no comments-as-cargo** — Keep code self-documenting.
6. **Verify before done** — run `nm run typecheck && npm run lint && npm test && npm run build` after meaningful changes and fix everything red. Tests must be deterministic (fixed fixtures, seeded logic).
7. **Accessibility** — semantic HTML, labels, aria-live for dynamic messages, keyboard-operable calendar/steppers/modals, visible focus, contrast ≥ 4.5:1.
8. **Mock boundaries are explicit** — payment, auth, check-in ID upload are simulated; UI copy must keep the "prototype/simulated" wording.

## Key files to know

- `src/lib/dates.ts` — URL ↔ SearchState parsing/serialization (port of `hotel-html/src/common.js`)
- `src/services/pricing.ts` — quote math, promo rules, cancellation, FX
- `src/services/availability.ts` — deterministic per-date availability + rate plans
- `src/data/index.ts` — all fixture content and fact strings

## OpenCode project system

`.opencode/` holds project agents (`agents/*.md`), commands (`commands/*.md`), skills (`skills/*`), and `opencode.json`. Use `/verify`, `/review`, `/security`, `/visual-qa` for the quality gates. Changes to `.opencode/` require an opencode restart.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
