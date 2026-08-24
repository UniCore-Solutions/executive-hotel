# Decisions

Every decision here is a documented deviation or deliberate choice vs the reference product. Everything not listed follows the reference exactly (see DATA_FLOW.md, DISCOVERY.md).

## D-1 Location: project continues in `/tmp/opencode/hotel/hotel-nextjs`

The intended parent (`/home/hotel-executive`) is not writable by the current user; the previous session scaffolded here (deps installed). Note: `hotel-html` reference copy sits at `/tmp/opencode/hotel/hotel-html` (identical to `/home/hotel-executive/hotel-html`). To relocate later: copy the directory (excluding `node_modules`, `.next`) and run `npm ci`.

## D-2 SEO/route case for room pages

Reference uses `room.html?id=…`; Next.js uses a real route segment `/room/[roomId]` (better URLs, PRD SEO-4 spirit). `/booking`, `/confirmation`, `/reservation`, `/checkin` keep flat routes with query params exactly as the reference (`?room=…`, `?ref=…`).

**Update (2026-08): superseded for room views by D-26** — the room detail now lives on `/hotel?roomId=…` (query param on the hotel page, single implementation). `/room/[roomId]` is kept purely as a redirect for legacy/external links.

## D-3 Confirmation `.ics` add-to-calendar (was documented-only upstream)

Implemented exactly as a downloadable `text/calendar` file (VEVENT: summary, dates, hotel address, location, ref as UID) — closes BOOK-8 gap. Pure client-side, no dependency.

## D-4 15-minute hold chip on booking (was documented-only upstream)

Informational countdown chip (`Rate held for {mm}:{ss}`), resets on mount; explicitly does not mutate prices (that requires a backend). Copy remains "mock hold".

## D-5 Modify dates/occupants on My Reservation (was documented-only upstream)

New dialog from the reservation dashboard: adjust check-in/check-out/adults/children/rooms → live recomputed quote + differential before applying; applies via `reservations.update` with fresh price. Implements documented RES-2 behavior.

## D-6 Booking-side promo field applies to the quote (upstream quirk fixed)

In the reference the booking-page promo field only updated a status line; a valid code left the quote unchanged unless it was in the URL. Here, a validated code updates the quote (and the URL via state), consistent with OFFER-3 copy ("quoted before you pay"). Failure still shows the exact error message.

## D-7 Check-in notes persisted

`ci-notes` is stored on the reservation (`notes`) — upstream discarded it.

## D-8 Filters/alternate-date suggestions (superseded — see D-24)

PRD documents `f_*` filters and best-price suggestions, but the shipped reference implements only sort (recommended/price-asc/price-desc) and a single empty state. Kept at shipped scope at the time. **Update (2026-08): filters are now implemented** — query-param facets on `/search`, see D-24. Alternate-date suggestions remain out of scope.

## D-9 Extras catalog kept as shipped (no per-person extras)

UI machinery supports `per person` units (default qty = guest count) but the fixture catalog has none; no invented extras.

## D-10 React Query / Redux / Redis: not used

All data is local and deterministic; async is simulated latency on pure functions. The service layer returns Promises and is the API seam — adding TanStack Query or Redux would duplicate React state for no gain; Redis is irrelevant without a server. Revisit when a real API/PMS is added (documented in TECH_STACK.md).

## D-11 next/image vs plain `<img>`

The reference renders remote photos at fixed widths with lazy loading and fallbacks. We use plain `<img>` with `loading="lazy"`, explicit width/height via aspect-ratio containers, and a styled background — zero config surprises with remote hosts; identical visual behavior. (Images are mock photography; SEO page content is text-led.)

## D-12 Sticky header scroll threshold

Reference: `scrollY > 12`; used as-is.

## D-13 Check-out display time `by 11:00`

The reference confirmation/reservation UI says `by 11:00` while property data says 12:00. Kept exactly (`by 11:00`) for parity; noted for product correction later.

## D-14 Home header "Book now" anchor

In the reference, `#search` is a dead anchor on home (no element with that id; widget id is `#searchbar`). We point the home Book-now CTA at the page search widget (`#searchbar` → scrollIntoView) — a functional fix documented here.

## D-15 Payment mock parity

Shipped reference has one decline path (digits ending in `1`) and no 3-DS frame. Kept as shipped; the PRD 3-DS frame stays out of scope (documented in TECH_STACK).

## D-16 Testing tools

Vitest + Testing Library + jsdom for unit/component; Playwright (system Chrome via `channel: 'chrome'`) for e2e — no browser downloads needed, deterministic fixtures everywhere.

## D-17 Mock auth storage (security audit 2026-08)

Auth is client-side simulated (AGENTS.md rule 8): users/session live in `localStorage` (`rc_users_v1`, `rc_session_v1`) with plaintext demo passwords — exact port of the HTML reference's mock.js. Accepted for the prototype scope: zero server surface, demo-only credentials, no real PII expected. Mitigations shipped with this audit: all user-supplied strings render through React escaping only (the single `dangerouslySetInnerHTML` site was removed, Calendar hint renders as JSX), JSON-LD blocks use `textContent`, no cookies, no `eval`/`innerHTML` sinks, security headers + CSP added (verified violation-free in a real browser on all routes), `X-Powered-By` removed, redirects are internal-only with `encodeURIComponent`, and `npm audit` reports 0 vulnerabilities (612 deps). Any future server-side auth must move to hashed credentials + httpOnly cookies.

## D-18 Accessibility pass — axe WCAG 2a/2aa (2026-08)

Axe-core sweep (`e2e/a11y.spec.ts`, wcag2a/2aa/21a/21aa, serious+critical) found violations across all 16 routes, all fixed:

- **Contrast**: Tailwind's translucent `text-navy/35–60` failed 4.5:1 on light surfaces and `@utility` overrides lost the cascade to theme-generated utilities. Fixed with a single block at the end of the utilities layer mapping `/35 /40 /45 /50 /55 /60` → `color-mix(in srgb, var(--color-navy) 88%, white)` (one tonal value ≈ 11:1, decorative `/10 /12`/`/20` untouched). Also darkened `--color-gold-dark` `#8f692c → #7a5622` (6:1 on paper), `text-white/45 → /60` on room facts + footer legal row, availability badge `text-emerald-700 → text-emerald-800`. Not unlayered, or state variants (`data-[state=active]:text-white`) would have been overridden.
- **Semantics**: `Stars` got `role="img"` + accessible name; review carousels (home/hotel) are `role="region"` with `tabIndex={0}`; RoomDetails photo thumbs are a proper `role="tablist"` with `role="tab"`/`aria-selected`; room facts `<dl>` rows restructured (icon wrapped inside `<dt>`, no non-dt/dd div children); `QuoteTable` note moved out of the `<dl>`; cookies toggles gained `aria-label`s; search results grid is `role="region"` (was `aria-label` on a plain div); SearchBar closes panels on `Escape`.
- Suite now: 76/76 e2e passing, axe 0 serious/critical on all routes. Kept icons `aria-hidden`, skip tech (aria-prohibited on decorative star glyphs remains as-known-good).

## D-19 Visual QA + tooling hardening (2026-08)

**Visual QA vs reference** (`../hotel-html` served side-by-side; screenshots at 1280/390 + text + pixel + height metrics): all 16 routes are visually and textually aligned. Text-identical: offers, faq, contact, cookies, privacy, cancellation, booking. Static pages within <1% pixel diff; page heights within 0–14% (layout is height-flexible, matches across widths). Room "EXTRAS & SERVICES" panel is JS-rendered in the reference (`#extras-host`, room.js) and present in the app — parity confirmed. Nits accepted as known-good: search "AVAILABLE" is CSS-uppercase in the app vs reference "Available" (cosmetic); reference `/terms` has a duplicated "5. Cancellation" heading where the app has "5. Guest conduct" — content identical, heading deviation documented here.

**Tooling failures found and fixed during QA**:

- `postcss.config.mjs` had disappeared (root cause of a 21-test e2e regression: Turbopack emitted "Parsing CSS source code failed" for every `@theme`/`@utility` and silently dropped the entire Tailwind utilities layer — pages rendered unstyled but the build reported success). Recreated as `@tailwindcss/postcss`. The build now emits 0 warnings and full utilities (verified: `text-white`, `flex`, tw-animate `animate-in`/`fade-in-0`/`zoom-in-95` + `@keyframes enter/exit` all present in output).
- `tw-animate-css@1.4.0` was installed but never declared; `npm install` pruned it. Its exports map (`"."` with `style` condition, no deep paths) breaks both bare and deep CSS imports under Turbopack, so it is vendored at `src/app/tw-animate.css` (imported as `./tw-animate.css`, excluded from prettier via `.prettierignore`). Prettier's tailwind plugin rewrites the import to a relative path anyway — the vendored file makes that resolve.
- `eslint.config.mjs` had gone missing (deleted during a cruft sweep); recreated with the standard Next flat config (`nextVitals` + `nextTs` + global ignores). Lint is back to 0 problems.
- `e2e/helpers.ts` gained `settleImages()` — axe and overflow scans must run against the fully-painted page, not a partially-rendered one (remote CDN photos can arrive after DOMContentLoaded).

**Perf pass**: DCL 49–232 ms across routes, CLS 0.00 everywhere (explicit aspect containers, self-hosted fonts), route table all-static except `/booking` + `/room/[roomId]`; added `loading="lazy"` to the last home gallery photo and the room-related-cards thumbs (the only below-fold `<img>`s still eager). Remaining optional: `/booking` and `/room/[roomId]` could be prerendered with stable params, and the 239 KB shared chunk could be split further — both deferred as non-blocking.

## D-20 Mobile responsive audit — duplicate search bar + compact extras (2026-08)

**Duplicate search bar (index page, phone size)**: `SearchBar` rendered BOTH the full segmented bar (dates/guests/promo/search) AND the `md:hidden` mobile pill trigger — the reference (`mountSearchBar`, common.js) shows exactly one: pill below `md`, segmented bar from `md` up. Fixed by wrapping the segmented bar in `hidden md:block` (`SearchBar.tsx`); the hero now matches the reference exactly (identical page height 7567px at 390px, single visible search element, pill only). The bottom sheet flow (pill → sheet → dates/guests/promo → search) is unchanged and covered by the responsive e2e spec.

**ExtrasPicker ignored `compact`**: room/booking sidebars rendered full cards (description, unit badge, large price) in the booking card — the reference `bindExtras` compact mode renders name + price only (`text-[13px]`, ` /pp`|` /stay`, quantity row when checked, `grid md:grid-cols-2` when not sidebar). Implemented the true compact branch; the room aside on mobile dropped from 1509px → 1245px vs reference 1264px; booking/confirmation/checkin within ±1.3%.

**Responsive verification performed** (probes at 390/768/1280 across all 16 routes): zero horizontal overflow everywhere, no clipped content except intentional `truncate` ellipsis (logo, pill label, plan names — same as the reference), no undersized touch targets, no duplicate IDs, header/utility/mobile-menu breakpoints identical to the reference, hotel page within ±6% of the reference heights at all widths. Plan cards verified identical to the reference (99 vs 97px). Full suite re-run: 76/76 e2e, 89/89 vitest, lint/typecheck/format clean.

## D-21 shadcn/ui + Tailwind v4 integration audit (2026-08)

**Findings (audit start)**: shadcn was half-installed — `components.json` (new-york, RSC, Tailwind v4 schema) + radix deps (`react-dropdown-menu`, `react-label`, `react-slot`, `react-tabs`), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` were all present and `cn()` lived in `src/lib/utils.ts`, but only 3 primitives were used in the app (`Button`+`Input` in AccountFlow/CheckinFlow with heavy per-call overrides, `Tabs` in AccountFlow, `DropdownMenu` in Header). Everything else was hand-rolled: raw `<button>/<input>/<select>` across ~16 files, a custom dialog in `ModalContext` (Escape + scroll lock + autofocus, but no focus trap/restore/`aria-labelledby`), a custom `Select.tsx` that nothing imported, and a hand-built skeleton in SearchResults. The primitive styles also did not match the product: `Button` base was `h-11 px-6 text-sm font-medium` while the reference CTA canon is `text-xs font-bold uppercase tracking-widest rounded-xl`; `Input` base `h-11` matched only the roomier account fields.

**Actions — primitives re-centered on the product canon** (design preserved, pixels identical; verified element-by-element vs reference, see below):

- `ui/button.tsx` — base re-centered to the project CTA (`text-xs font-bold uppercase tracking-widest rounded-xl`, focus ring gold); variants `default / outline / ghost (text-link) / gold / onDark (white-outline on navy) / destructive / navyLink`; sizes `default px-6 py-3 / sm px-5 py-2.5 / lg px-7 py-3.5 / xl px-8 py-3.5 / icon size-9 / iconSm size-7 / iconLg size-10`. `asChild` kept for anchor/`Link` wrapping (must wrap an element — Slot rejects text-only children; `Slot` errors surfaced as a 500 in e2e and were fixed).
- `ui/input.tsx` — dropped `h-11` from the base (reference account fields are `px-3.5 py-3`, no fixed height) and added `size="sm"` (`px-3 py-2.5`, the booking/checkin/contact/newsletter canon). `aria-invalid` styling stays.
- `ui/label.tsx` — already pixel-identical to the reference label canon (`text-navy/60 mb-1.5 block text-xs font-semibold`); became the shared `Label`.
- `ui/dialog.tsx` (new) — shadcn new-york v4 pattern on `@radix-ui/react-dialog` (installed): `DialogOverlay` (navy/70 blur), `DialogContent` (centered, max-h 88vh, rounded-3xl, animate-rise), `DialogTitle/Description`. `ModalProvider` refactored onto it with the same `open(content)/close()` API and identical visuals — Radix now provides focus trap, focus restore, Escape handling and `aria-modal`/label; the old manual Escape listener/autofocus were removed.
- `ui/skeleton.tsx` — replaced SearchResults' hand-built `SKELETON` block.
- `ui/Select.tsx` — dead code (zero imports); deleted. Native `<select>`s stay native: the reference uses native selects, and shadcn's Radix Select would change the UX. The reference has two native select styles — compact `px-3 py-2.5` (booking/contact) and `px-4 py-3` (room/search/guests) — both kept as-is.

**Migration coverage**: every raw button/input/label in the app moved onto the primitives — BookingFlow, ReservationFlow, RoomDetails, CheckinFlow, AccountFlow, ConfirmationFlow, SearchSheet, SearchBar (promo apply + submit), GuestsPanel, Calendar (confirm), SearchResults, ConsentManager/ConsentDialog/CookiesPanel, NewsletterForm, contact-form, StickyDock, OffersGrid. Intentional stays: segmented controls (SearchBar segments, AccountFlow tabs, RoomDetails photo `role="tab"`s), calendar day cells, StaySegment, Footer accordion, Header hamburger, date-trigger fields — semantic custom widgets, not buttons.

**Regressions caught during the run**: (1) `Button asChild` with a text child → Radix `Slot` throws at runtime (500 on /booking) — asChild must wrap an element; (2) my migration script dropped `id` attributes on the 8 BookingFlow inputs — broke label association + a11y and 3 e2e specs; restored; (3) ReservationFlow `ModStepper` lost `onClick`/`aria-label`/`disabled` in a partial-block migration — restored (lint had flagged unused props); (4) ConsentManager "Customise" inherited the ghost variant's `text-navy/60` on the navy banner → axe color-contrast fail on confirmation — fixed with `text-inherit`.

**Verification**: full gates green — typecheck, lint (0), format, vitest 89/89, build, e2e 76/76, npm audit 0. Visual parity re-probed at 1280 vs reference: search/contact/faq 0.00%, confirmation −0.05%, booking −0.58%, checkin −0.29%, room +1.62%; migrated primitives measure identical to the reference (e.g. reservation cancel-btn 42/42 px, extras rows 449/449 px, dl 152/152 px, account/booking submit buttons pixel-equal). Known pre-existing deltas surfaced (not from this task, pages never in the responsive audit): hotel −6.2% (known, ±6%), reservation +7.0% (reference demo seed has the airport shuttle pre-selected + longer status banner vs app's removed-extras note), account +4.9% (app never shipped the reference's `login-form`/`auth-view` ids and renders a taller auth card). Left as follow-ups, not regressions.

## D-22 Header flash fix + dev CSP eval (2026-08)

- **Header gradient delay on dark pages**: `HeaderTheme` set `document.body.dataset.headerTheme` in a `useEffect`, i.e. after hydration + first paint, so SSR HTML had no theme attribute and the header first painted the light paper gradient, then faded (0.3s CSS transition) into the navy `linear-gradient(rgba(13,28,41,.55), rgba(13,28,41,.12) 72%, rgba(13,28,41,0))` — visible even at the top of home/hotel. The reference sets the same attribute synchronously at script parse (`common.js:195`), before first paint. Fixed by switching to `useLayoutEffect` (React flushes it before paint) — attribute now lands pre-paint, no flash. (A lazy `useState` scroll init was considered and rejected: it would cause hydration mismatches on reload mid-scroll.)
- **Dev console error "eval() is not supported"**: Next.js dev (Turbopack) + React devtools use `eval`; the strict production CSP (`script-src 'self' 'unsafe-inline'`) blocked it in dev. `next.config.ts` now appends `'unsafe-eval'` to `script-src` only when `NODE_ENV === 'development'`; the production CSP is unchanged (React never uses eval in prod).
- Verified: dev console 0 errors on home, header gradient present at load; full gates green (typecheck, lint, format, build, vitest 89/89, e2e 76/76 — one transient search-spec flake, green on rerun).

## D-23 Homepage hero fix + second homepage variant `/index-2` (2026-08)

**Existing homepage hero — full-section treatment.** The hero image (absolute `inset-0`, `object-cover`) already filled the section, but two things could leave a light band under it: the global `img { background-color: #e7e1d4 }` fallback (light tan showed while the CDN photo loaded or on failure) and the bottom gradient `from-navy-dark/85 … to-navy-dark/30` which flattened the photo's last ~10 px into pure navy. Fixed: the hero section now carries `bg-navy-dark` (dark fallback, never light), a new `[data-hero] img { background-color: #0d1c29 }` rule replaces the tan fallback for all full-bleed heroes (home + hotel), and the overlay was lightened to `from-navy-dark/70 via-navy-dark/40 to-navy-dark/25` so the image shows through to the bottom edge naturally. Verified by pixel sampling at 1280/1366/390: the photo reaches the section's bottom edge with no light or pure-navy band; section heights and parity metrics unchanged (gradient only). Note: the reference HTML has the same 85% bottom gradient — this is a deliberate, documented deviation per the redesign request.

**Second homepage variant — `/index-2`.** New route (metadata, dark header theme, same global header/search sheet/consent). Structure: full-section hero (`min-h-[88vh]`, `bg-navy-dark` fallback, bedroom photo, `bg-gradient-to-b from-navy-dark/80 via-navy-dark/35 to-navy-dark/10`) with the eyebrow/headline/subtext near the top under the nav and the existing `SearchBar` (dates · guests · promo · search; mobile pill) placed at ~59% of the hero height; the standard hero facts row below; then an editorial "Where Rabat feels like home" intro (longDescription + highlights + image collage); then the **"Discover new ways to stay"** section with six cards built from real fixture data (Executive Rooms → `/room/superior-double-or-twin`, Premium Suites → `/room/executive-suite`, Business Stays → `/offers`, Weekend Escapes, Family Stays, Longer Stays); and a navy "Plan your stay" closing band. Cards follow the house style (rounded-3xl, border-navy/10, white, font-display titles, gold CTA arrow, image scale + lift on hover, 1/2/3 columns across mobile/tablet/desktop). No new design system, no duplicated search fields (desktop bar `hidden md:block`, pill `md:hidden` — same as home), no horizontal overflow at 390/768/1280 (verified: 0 px, 1 card column on mobile, 2 on tablet).

**Verification.** New `e2e/index-2.spec.ts` (loads/sections, search in upper 65% of hero, mobile no-overflow + single pill + 6 stacked cards) — suite now 79/79. Gates: typecheck, lint 0, format, vitest 89/89, build, e2e 79/79. Pixel probes confirmed both heroes' image coverage to the section bottom edge; the "navy strip" seen in early screenshots was the consent banner (`#consent-banner`, fixed bottom, dismissed via UI in the e2e suite), not a layout artifact.

## D-24 Search-result filters via query params (2026-08)

PRD `f_*` filters were previously documented as out of scope (see D-8). Implemented as a first-class search feature per the platform build-out:

- Facets: **price per night** (MAD brackets — `under-1000` / `1000-1499` / `1500-plus`), **meal plan** (`bb`/`ro`/`hb`), **refundability** (`free`/`nonrefund`), **room type** (`standard`/`suite`) and **amenities** (derived dynamically from the current result set — only differentiating amenities are offered).
- Facets are rooms-level: a room matches when any of its rate plans satisfies the facet (price uses the room's lowest plan price, matching the displayed "from" price).
- **URL is state**: `f_price` / `f_plans` / `f_refund` / `f_cat` / `f_am` (comma-separated multi-select). Codec + option definitions live in `src/lib/filters.ts` (tested); application logic is a pure `filterEntries()` in `src/services/availability.ts` (tested) — API-ready. Empty state when facets exclude everything: "No rooms match those filters" + Clear/Edit actions.
- Stay-state rewrites preserve facets: `SearchContext.syncUrl/setPromo/setCurrency` now copy any `f_*` param already in the URL (`withFacets`), so adjusting dates/guests/promo on the results page never silently drops active filters. Facets are deliberately NOT part of `SearchState`, so they never leak into `/room/[roomId]` or `/booking` URLs.
- `/search` page gained the standard page-level `<Suspense>` (pattern of `/confirmation`, `/reservation`, `/checkin`) since `SearchResults` now calls `useSearchParams` directly.
- Verified: unit tests (lib + service), `e2e/filters.spec.ts` (URL round-trip, reload, back, combined-empty, facet-preservation on stay edit, responsive overflow at 390/768/1280), axe 0 serious/critical with the panel open.

## D-25 Hotel page: gallery + policies sections (2026-08)

- **Gallery**: new "Inside the hotel" section on `/hotel` rendering the existing `Property.gallery` fixture (10 images, featured 2×2 mosaic, lazy, hover zoom, `role="region"`). No new route or duplicate component.
- **Policies**: new "Hotel policies" section (check-in / check-out / children / pets / smoking / parking) backed by a new `Property.policies` fixture (`src/data/index.ts`, values match the FAQ/reference copy exactly) and the `Policy` type. Icons extended with `child`, `paw`, `cigarette` glyphs in `src/constants/icons.ts`. Verified no overflow at 390/768/1280, axe clean on `/hotel`.

## D-26 Room state on the hotel page via query param + anonymous activity (2026-08)

Per the platform build-out plan (single hotel page; room selection must not duplicate it):

- **`/hotel?roomId=…`** renders the selected room's full detail inline — the existing `RoomDetails` component reused unchanged (gallery, stay strip, booking card, siblings). `plan`/`extras`/stay params ride along exactly as before. A breadcrumb + "Back to all rooms" link returns to the normal hotel view (`/hotel#rooms`).
- **`/room/[roomId]` now redirects** to `/hotel?roomId=…` (single implementation, legacy links keep working; unknown ids still 404). `roomURL()` in `src/lib/links.ts` emits `/hotel?roomId=…` so every card (home grid, search results, siblings, booking sidebar) uses the new URL automatically.
- **URL-sync fix**: `RoomDetails` rewrites its own query (plan/extras/stay) via `history.replaceState` — it now preserves `roomId` (previously it dropped it with the legacy `id=` param, which unmounted the inline view). `initialPlan` is snapshotted once so the auto-sync never flips the "Recommended" badge.
- **Homepage recent activity** ("Continue where you left off", renders only when there is history): anonymous, client-side (`src/services/activity.ts`, localStorage `rc_recent_searches_v1` / `rc_recent_rooms_v1`, API-ready like the other stores). Searches are recorded on submit (SearchBar + mobile sheet); room views on `RoomDetails` mount. Chips deep-link to `/search?checkin=…&…`, viewed-room cards to `/hotel?roomId=…`.
- **Homepage final CTA**: closing "Plan your stay" band (Search availability + View offers), same as `/index-2`.
- Verified: typecheck, lint, format, vitest 108/108, build (home/hotel remain static), e2e 89/89 (incl. new `e2e/activity.spec.ts`, updated room-URL assertions), axe clean on `/hotel?roomId=…`.

## D-27 Homepage order: recent activity → Discover → rooms (2026-08)

Homepage section order per the platform plan: hero (full device height) → recent activity (last search + viewed rooms, D-26) → **"Discover new ways to stay"** (what the hotel offers: room types, suites, stays-shaped offers) → rooms list → experiences → facilities → offers → reviews → location → newsletter → final CTA. The Discover section was extracted from `/index-2` into a shared `src/components/home/DiscoverSection.tsx` (used by both `/` and `/index-2`, no duplicated markup); its room links use the D-26 `/hotel?roomId=` convention. Hero sections on `/` and `/index-2` now use `min-h-dvh` (full device height).

## D-28 Home hero search bar pins on scroll (2026-08)

On `/` only: the hero search bar sits near the **top** of the first section (content top-aligned, `pt-32 lg:pt-44`; hero keeps `min-h-dvh` + full-bleed image; gradient flipped to top-heavy). On scroll it becomes a fixed dock pinned below the fixed header (`top-[100px] lg:top-[116px]`, `/search`-style white card) via `src/components/home/StickySearchBar.tsx` — a single `SearchBar` instance is mounted at a time (in-hero ↔ dock) so there are never duplicate ids or split search state. Section order on `/` is now: hero → Discover new ways to stay → recent activity (search/view history) → rooms → experiences → facilities → offers → reviews → location → newsletter → final CTA. To make Discover visible without scrolling, it overlaps the hero's lower edge (`overlap` prop on the shared `DiscoverSection`: `-mt-24 sm:-mt-32 rounded-t-3xl relative z-10`); `/index-2` keeps its own layout (no overlap, no sticky search).

## D-29 Discover = hotel services, on the hero image; hero content restyled (2026-08)

The "Discover new ways to stay" section is now the **hotel's services** (`PROPERTY.facilities`: restaurant, free buffet breakfast, business centre & meeting rooms, 24-hour reception, free private parking, laundry & dry cleaning) — **not** the room list. On `/` it renders **on top of the main hero image** (variant `image`: no section background, white title, frosted `bg-white/90` cards) directly under the sticky search bar; `/index-2` keeps the in-flow paper-section look (default variant). The home hero content block was restyled per the reference spec: serif display heading ~50px desktop (font-medium, tight leading, `max-w-[560px]` → natural two-line wrap), 18px description (`max-w-[36rem]`, left-aligned with the heading), and a compact 180×44 pill CTA ("See rooms & prices" → `/#rooms`), left-aligned in the middle/lower-middle area; hero facts row kept at the bottom. Discover cards are `<li>` (no longer links); the discover title stays a non-heading element on the image variant so heading order (h1 first) stays valid.

## D-30 Homepage hero reverted to the reference layout (2026-08)

The `/` hero experiments (D-28 sticky/pinned search bar, D-29 "Discover on the image" + restyled serif heading/description/pill CTA) were **reverted** — the user did not like them. `/` is back to the reference-style hero: full-bleed image, bottom-aligned content (`justify-end pb-12`), eyebrow → serif `text-6xl` heading → subtitle → plain `SearchBar` (`#searchbar`/`data-hero-search`) → facts row, gradient `to-t`. Kept from the experiments: the **full-height first section** (`min-h-dvh`) and the **recent-activity section** (searches, viewed rooms — D-26) directly after the hero; the "Discover new ways to stay" section is removed from `/` entirely (the component remains for `/index-2` with services content, D-29). `StickySearchBar.tsx` was deleted. Also fixed a flaky axe failure: the `soldout` Badge now uses a new `--color-clay-dark` (#7d3a1f) token for text so its contrast is solidly above 4.5:1 on `bg-clay/10`.

## D-31 Sticky stay search bar moved from bottom to top (2026-08)

On `/` the bottom sticky stay dock (dates + guests + "Edit stay", port of `mountStickyDock`) was **replaced** by a top-fixed variant: a clean rounded pill bar pinned below the fixed header (`top-[100px] lg:top-[116px]`, `z-40`, centered `max-w-3xl`, full-width with `px-4` on mobile). It slides in as the hero search bar scrolls away (threshold = hero height − 170px) and stays pinned while scrolling; same behaviour as before — "Edit stay" opens the mobile sheet (<1024px) or deep-links to `/search` with the current stay state. `StickyDock` now takes `position?: 'bottom' | 'top'` (default `bottom`; home passes `top`), keeping the reference port intact.

## D-32 Single sticky hero search bar; RecentActivity hydration fix (2026-08)

- **One search bar on `/`**: the separate sticky dock (D-31) was removed; instead the **hero's own search bar pins below the header on scroll** (`StickySearchBar`: a single `SearchBar` instance — the same element toggles between in-flow hero placement and `fixed top-[100px] lg:top-[116px] z-30`; a measured spacer preserves the hero layout while pinned, so nothing jumps and there are never duplicate search bars/ids). `StickyDock` remains as the reference bottom-dock port but is no longer rendered.
- **Hydration fix**: `RecentActivity` read localStorage during render, so the server (no history → null) disagreed with the client (history → section) and the whole tree below mismatched. History now loads only after mount (`useEffect`), so server and first client render both render null, then the section appears post-hydration.
- **Hero polish**: added a top scrim (`from-navy-dark/60 h-44` gradient) so the header/navigation stays readable over the image; tightened search-bar spacing (`mt-6 lg:mt-8`). Branding, colors and layout direction unchanged.

## D-33 Pinned search bar: padding + glide animation (2026-08)

The pinned hero search bar (D-32) now has breathing room (`px-4 sm:px-6 py-2.5`) so it clears the header and viewport edges, and it **animates when pinning**: on first pin the bar glides from its hero position (left-aligned, ~`max-w-4xl` within the page container) into the centered dock below the header — the offset is measured at pin time (`dx`/`dy` from the in-flow rect to the dock rect) and animated with `transform` + `opacity` (600ms ease-out quint) over two `requestAnimationFrame` steps. The hero layout is preserved by the measured spacer (unchanged from D-32).

## D-34 Buttery pin animation (2026-08)

Pin animation for the sticky hero search bar (D-33) tuned: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth expo-out) over 750ms, gentle scale settle (0.96 → 1) + fade (0.25 → 1) alongside the glide, and `will-change-transform` so the motion runs on the GPU.

## D-35 Search-bar popovers flip upward when they would overflow the viewport (2026-08)

The `SearchBar` popovers (dates, guests, promo) open downward (`top-full`). On `/` the hero search bar sits low on the page (`min-h-dvh` + `justify-end`), so at 1280×900 the guests panel extended ~160px past the viewport bottom: the lower stepper buttons were clipped and any focus/click-induced scroll fired the "close on scroll" handler, closing the panel mid-interaction. Popovers now measure their rect on open (`useLayoutEffect`) and flip to `bottom-full` when there is <8px of space below and ≥8px of room above; otherwise they stay downward. Direction resets to down on every open (set in the segment onClick). Panels on `/search` (bar near the top) and the pinned dock (bar below the header) are unaffected. Deviation from the reference port (which has the same clipping); required to make the hero search bar operable at default viewport sizes.

## D-36 Hotel URLs keyed by UUID `hotelid` query param (2026-08)

The backend now identifies hotels and room types by UUID (V20 migration), and the
reference-style `/hotel/[id]` route no longer fits the new identifier format.
All hotel URLs move to `/hotel?hotelid=<UUID>`:

- `hotelURL(id)` → `/hotel?hotelid=<id>`; `hotelRoomURL(...)` → `/hotel?hotelid=<id>&roomId=<rid>` (+ stay/plan params) — single route for both modes.
- `/hotel` (no param) renders the legacy fixture hotel page; `?hotelid=<uuid>` renders the backend hotel detail page; a non-UUID `hotelid` or an unknown UUID renders 404 (`notFound()`). `generateMetadata` branches the same way.
- `/room/[roomId]` still redirects (legacy/external links), now to `/hotel?hotelid=<resolved hotel>&roomId=…`; unknown ids keep 404.
- `/hotel/[id]` route deleted.
