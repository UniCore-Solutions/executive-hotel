# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Client Platform Index — Implementation Report (2026-08-19)

Baseline: `CLIENT_PLATFORM_INDEX_DATA_ARCHITECTURE.md` (rev 3, approved). All §19/§20 decisions honoured.

## 1. Summary

The approved client-platform index integration is implemented end-to-end and verified:

- **Backend**: `platform(slug:)` GraphQL query serving identity + typed content blocks (HeroBlock, FeaturedExperiencesBlock) with real media and real experience references; local-filesystem media upload/download as JWT-authenticated REST; migrations V13 (structure) + V14 (demo seed) applied to both Testcontainers (fresh) and the dev database.
- **Frontend**: codegen infra (backoffice pattern), thin GraphQL fetch wrapper, `platform.ts` (identity/hero/featured) and `catalog.ts` (rooms/offers/reviews/experiences/availability/rates seams) with mock fallback; header brand, footer identity, hero copy/image/CTA and the home experiences section are now data-driven from the backend, gracefully falling back to the static fixture.
- **Quality**: backend `./mvnw test` 91/91 green; frontend typecheck + lint + 108 Vitest tests + production build green; live verification against the running backend passed (nested platform query, multipart upload → 201, public read → 200 image/png, delete → 204).
- **Postman**: folder 9 "Client Platform Index" added and executed against `http://localhost:8080`.

## 2. Migrations

- `V13__platform_content.sql` — platforms, platform_content_blocks, hero_blocks, featured_experiences_blocks, featured_experience_items; `hotels.slug` (unique, `-2/-3` collision backfill) + `hotels.platform_id` (nullable); media `+platform_id` (6th typed owner via `num_nonnulls` check) + `caption`.
- `V14__seed_platform_demo.sql` — seed wrapped in `DO $$ ... IF EXISTS (SELECT 1 FROM hotels WHERE id = 3)` so fresh Testcontainers DBs (no hotels) stay valid; platform 1 "The Hotel Collection" (`the-hotel-collection`), 2 blocks, 1 hero, 3 featured items, 7 media, 3 experiences; hotel 3 "Azure Bay Resort" linked (`azure-bay-resort`).
- Root-cause fixes landed during this phase: V13 originally backfilled `slug` without adding the column; V14 had a double-`WHERE` syntax error; both fixed and confirmed green on fresh Testcontainers DB.
- Applied to dev DB: "Successfully applied 2 migrations ... now at version v14".

## 3. Backend

- `PlatformService` maps platforms → identity + blocks; null-guards for missing media (`Stream.of` + filter instead of `List.of(null)`; explicit null checks for `Map` lookups).
- Block ordering by position; `isEnabled` respected; featured items reference real `experiences.id` (no duplication of experience content in blocks).
- Closed enum `PlatformBlockType` (HERO / EXPERIENCES) — no CMS over-generalization; typed 1:1 child tables + item rows.
- Booking/review/pricing/availability services untouched; 24-block type↔child-table consistency enforced service-side (no trigger — approved).

## 4. GraphQL

- `platform(slug: String!): Platform!` returns `media` + `contentBlocks` as a `ContentBlock` **interface** (not union) with inline fragments for `HeroBlock` and `FeaturedExperiencesBlock`; `FeaturedExperienceItem { position, experience }` resolves the full domain experience.
- Domain queries available for phases 3–8: `hotel(id:)`, `roomTypes(hotelId:)`, `experiences(hotelId:)`, `offers(hotelId:)`, `reviews(hotelId:, page:)`, `availability(input:)`, `rates(input:)`.
- Live-verified document (identity + hero + featured with prices/durations/locations) returns complete nested data; no N+1 (single batched resolver path, <12 queries per test case A–L).
- Test cases A–L all green in `PlatformGraphqlIntegrationTest` (platform exists, slug lookup, ordering, disabled excluded, hero, hero media, featured experiences, real experience ref, update reflection, no duplication, no dangling refs, no N+1).

## 5. Media / Filesystem

- `MediaStorageProvider` port + `LocalFilesystemMediaStorageProvider`; root `MEDIA_STORAGE_PATH:./data/media` (test: `./target/test-data/media`), base URL `MEDIA_BASE_URL:http://localhost:8080`; 5 MB limit; magic-byte signature sniffing (fixed `(byte) 0xFF` → int literal bug that caused "invalid image: unrecognized file signature"); server-generated UUID storage keys (traversal-safe).
- Upload: `POST /api/v1/media/upload` (multipart, JWT) → 201; reads public `GET /media/{key}` → 200; `DELETE /api/v1/media/{id}` → 204. Live round-trip verified (upload → read → delete, media count returned to 7).

## 6. Frontend

- **Infra**: `graphql` + `@graphql-typed-document-node/core` deps; `@graphql-codegen/cli` + client-preset devDeps; `codegen.ts` (schema from backend, documents `src/graphql/**/*.graphql`, scalars DateTime/LocalDate → string); generated output in `src/graphql/generated/` (PlatformBySlugDocument, HotelByIdDocument, HotelRoomTypesDocument, HotelExperiencesDocument, HotelOffersDocument, HotelReviewsDocument, StayAvailabilityDocument, StayRatesDocument).
- **Services**: `src/services/graphqlClient.ts` (typed fetch wrapper, `print` + POST to `NEXT_PUBLIC_API_URL`, throws on GraphQL errors); `src/services/platform.ts` (identity/hero/featured via `platform(slug:)`, `NEXT_PUBLIC_PLATFORM_SLUG`); `src/services/catalog.ts` (phase 3–8 seams: room-type→Room, offer, review, experience mappers, `toBaseMad` FX conversion, `ratePlansForRoom`, `searchStay` combining availability+rates in one document) — all guarded by `NEXT_PUBLIC_USE_MOCK_SERVICES` with fixture fallback on any failure.
- **Wired live (phases 1–2 + experiences)**: header logo/brand line, footer identity/description, hero eyebrow/title/subtitle/image/alt/CTA ("Reserve your stay" → /search), and the home "Experiences" section (featured items with price/duration) render backend content; every one falls back to the fixture.
- `next.config.ts`: CSP `connect-src` + `img-src` include `http://localhost:8080`; `images.remotePatterns` allows it. `.env.example`: `NEXT_PUBLIC_API_URL=http://localhost:8080/graphql`, `NEXT_PUBLIC_PLATFORM_SLUG=the-hotel-collection`, documented `NEXT_PUBLIC_USE_MOCK_SERVICES`.
- Verification: `tsc --noEmit` clean, ESLint clean (one pre-existing `setState-in-effect` in `RecentActivity.tsx` fixed), 108/108 Vitest, `next build` success — home page prerendered **with backend content** (grep of `.next/server/app/index.html` confirms "The Hotel Collection", "Azure Bay Resort, Lisbon", "Reserve your stay", Sunset Cruise / Old Lisbon Walking Tour / Sintra Day Trip).

## 7. Postman

- New folder **"9 · Client Platform Index"** added to `backend-hotel/postman/Hotel-Collection-API.postman_collection.json`:
  1. `Platform by slug (identity + hero + featured experiences)` — POST `/graphql`, variables `{ "slug": "the-hotel-collection" }`.
  2. `Upload media to platform (requires token)` — POST `/api/v1/media/upload`, multipart, `Authorization: Bearer {{token}}`.
  3. `Read media (public)` — GET `/media/202608/…png`.
- Executed live: the platform query returns the full nested hero + featured payload (45/25/90 EUR experiences); upload → 201; read → 200 image/png; delete → 204.

## 8. Tests + Results

| Suite | Result |
|---|---|
| Backend `./mvnw test` (Testcontainers: Postgres + Kafka, Kafka startup timeout 3 min) | **91 passed, 0 failed** — PlatformGraphql 12, MediaUpload 9, DatabaseIntegrity 21, plus RestApi/BookingFlow/PricingService/GraphqlApi/AdminGraphql |
| Frontend `npm run typecheck` | pass |
| Frontend `npm run lint` | pass (0 errors) |
| Frontend `npm test` (Vitest) | **108 passed** (11 files) |
| Frontend `npm run build` | success — 19 routes, home prerendered with live platform data |
| Live E2E (manual) | platform query, media upload/read/delete, Flyway v14, hotel 3 slug/platform link — all verified |

## 9. Blockers

- None blocking. Notes: transient Kafka container startup flakiness resolved (3-minute startup timeout + retry); a crash-looping `crm-backend` container on the host (`crm-auto-crm-backend`) can cause resource pressure — stop it if builds/tests slow down.

## 10. FUTURE (outside this phase, per §17/§21)

- **Phase 7 (partial)**: wire `RoomsGrid`/offers/reviews sections to `catalog.ts` (service seams + mappers already landed); availability badges from real availability; deterministic hash mock removed per decision §19.13.
- **Phase 8 (partial)**: wire location/contact (hotel address/media, static distances) and the search page to `searchStay` (one document: availability + rates); facets/sort stay client-side.
- Run Playwright e2e against the real backend (flag `NEXT_PUBLIC_USE_MOCK_SERVICES=false`) after phase 7/8 wiring.
- Platform-level pages (collection homepage, contact block), S3-compatible storage provider, dedicated search query, and DB trigger for type↔child-table consistency remain FUTURE per approved decisions.