# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Client Platform — Index Data Architecture

> STATUS: **APPROVED — IMPLEMENTATION IN PROGRESS** (revision 3)
>
> Discovery + architecture + planning for moving the **client-facing platform** (`/home/hotel-executive/frontend-hotel`) from mock/static data to the database-backed GraphQL service, **starting with the index page only**.
>
> Revision 3: approved by the owner on 2026-08-19 with the final decisions recorded in §20/§22. Implementation began; completed items are marked **IMPLEMENTED**, remaining work is marked **IN PROGRESS** / **TODO**.

## Classification legend

| Label | Meaning |
|---|---|
| **FACT** | Verified from the existing code (file:line) |
| **PROPOSED** | Architectural recommendation, not yet approved |
| **ASSUMPTION** | Inferred, not confirmed |
| **DECISION REQUIRED** | Requires owner approval |
| **FUTURE** | Potential capability, out of scope for this phase |
| **TODO** | Agreed implementation task (only after approval) |

---

## 1. Executive Summary

**FACT** — `frontend-hotel` is a fully mocked client: zero GraphQL, zero REST, zero `fetch` (grep-verified across `src/`). The index page (`src/app/page.tsx`) renders 11 sections from the `PROPERTY`/`OFFERS` fixtures in `src/data/index.ts`, `localStorage` mock services, and hardcoded JSX copy.

**FACT** — The backend already owns the full customer domain: hotels (with contact fields), room_types, rooms (physical/operational), experiences, offers/promotions, reviews, rate plans + prices, sparse availability, and a typed-owner `media` table with per-owner primary-image uniqueness. There is **no** platform, content-block, destination, slug, or media-storage implementation anywhere.

**PROPOSED (revision 2 changes)** — Scope tightened to what the index page actually requires:
- **Block types classified by real requirement**: HERO + EXPERIENCES = NOW; GALLERY, CONTACT, FEATURED_HOTELS = LATER; SLIDER, TEXT = NOT NEEDED.
- **Content-block design validated**: base `platform_content_blocks` + 1:1 typed tables + ordered item rows is the best fit for PostgreSQL + Spring + GraphQL (FK integrity, CHECKs, GraphQL interface, batch-loading); JSONB and generic-item alternatives rejected with reasons.
- **Search architecture**: reuse `availability` + `rates` (several reusable queries in one document) for the single-hotel phase; a dedicated search query is FUTURE for multi-hotel.
- **API classification done operation-by-operation** (§11) — not a blanket "reads = GraphQL" assumption.
- **Frontend integration is progressive**: 8 phases (platform identity → hero/media → rooms → experiences → offers → reviews → location/contact → search), each independently reviewable.
- **Media storage (revision 3 decision)**: **local filesystem only** for this phase behind a `MediaStorageProvider` port (sole implementation `LocalFilesystemMediaStorageProvider`, root from `MEDIA_STORAGE_PATH` env). No Cloudinary, no S3/MinIO. Metadata in DB, binaries on local disk, with upload/download implemented as REST (multipart) this phase. S3-compatible object storage = FUTURE behind the same port.
- **`hotel_distances` dropped (revision 3)**: location distances stay static frontend copy; the table is not part of this phase.

---

## 2. Current Frontend Architecture Findings

**FACT** — Verified by reading the code (not just prior docs):

- **Index page** `src/app/page.tsx` (server component). Sections: Header (layout), Hero (hardcoded image URL + copy + facts from `PROPERTY`), Recent activity (localStorage), Rooms (`RoomsGrid` ← `PROPERTY.rooms`), Experiences (`PROPERTY.experiences`), Facilities (`PROPERTY.facilities`), Offers (`OFFERS.slice(0,3)`), Reviews (`PROPERTY.reviews`), Location (`PROPERTY.location.distances` + hardcoded image), Newsletter (mock), Final CTA, Footer (`PROPERTY` identity + constants).
- **Search widget** `src/components/search/SearchBar.tsx`: dates, adults 1–9, children 0–6 (+ages), rooms 1–5, promo. No destination field. Submit → `recordSearch()` + `router.push('/search?…')` — URL is state, no API call (`AGENTS.md` rule 1).
- **Search page** `src/app/search/page.tsx` + `SearchResults.tsx`: calls `searchRooms({checkin, adults, children})` from `src/services/availability.ts` — mock with 350 ms latency; returns `{room, availability, plans, demand}` per room; availability is a deterministic FNV-1a hash; facets (price/plan/refund/category/amenities) applied client-side (`filterEntries`, `src/lib/filters.ts`).
- **Service seam** `src/services/*` — all promise-based, component-safe (`AGENTS.md` rule 3: "swap a promise-based HTTP client later without UI changes"). This is the intended integration point.
- **Types** `src/types/index.ts` — single source of truth for frontend shapes; `src/data/index.ts` — single fixture source.
- **No data-fetching library** (no Apollo/urql/React Query — decision D-10); plain `<img>` (D-11); CSP restricts `img-src` to the three CDN hosts (`next.config.ts`).
- **Backoffice pattern available**: `@graphql-codegen` client preset + `src/graphql/*.graphql` documents (used by `backoffice-hotel`).

**PROPOSED** — preserve the service seam: each `src/services/*` module is swapped to a GraphQL-backed implementation per phase (§17), with the same function signatures. No UI redesign.

---

## 3. Current Backend / Database Findings

**FACT** — Verified from migrations and domain code:

- **hotels** (`V3__catalog.sql:10–39`) — full identity + contact: name, brand, description, address lines, city, country_code, latitude/longitude, phone, email, star_rating, check_in/out_time, default_currency, `config` JSONB (presentation flags), status. **No slug, no platform reference.** Contact information for a hotel already exists — **no new contact table for hotels**.
- **room_types** (`V3:45–64`) — hotel_id FK, name, description, max_adults/children, bed_configuration, size_sqm, view_type, status; `UNIQUE (hotel_id, id)` (C1 composite-FK target, also serves hotel lookups — **no new index needed**); `total_inventory` added by V12 (sparse model).
- **rooms** (`V3:86–105`) — physical/operational: room_number, floor, status, housekeeping_status, maintenance_status; composite FK `(hotel_id, room_type_id)`; `idx_rooms_room_type`. Search is room-type/inventory based — physical rooms unused by customer flows.
- **experiences** (`V3:109–126`) — hotel_id FK NOT NULL, name, description, category, duration_minutes, price_amount, currency_code, location, status, sort_order; `idx_experiences_hotel`.
- **restaurants / faqs / extras** (`V3:130–177`) — hotel-scoped; **faqs.hotel_id NULL = global/platform FAQ** (the existing null-hotel convention).
- **media** (`V3:179–214`) — typed-owner metadata: url, storage_key, alt_text, category, mime_type, width, height, owners (hotel/room_type/experience/restaurant/extra), is_primary, sort_order; `chk_media_single_owner`; partial unique indexes enforce **one primary image per owner**; owner indexes exist. **No platform owner, no caption.**
- **amenities** (`V3:66–84`) — catalog + hotel/room_type junctions (this is the "facilities" data).
- **pricing** (`V4`) — rate_plans, room_type_rate_plans (offers), rate_plan_prices (valid_from/valid_to, `idx_rate_plan_prices_lookup (room_type_rate_plan_id, valid_from)`), rate_restrictions, promotions (offers), tax_fee_types (null-hotel = platform-wide).
- **availability** (`V5` + `V12`) — sparse: `availability(room_type_id, stay_date, rooms_sold, out_of_order, blocked, version)`; missing row = free; PK covers `(room_type_id, stay_date)` date-range scans.
- **reviews** (`V8:38`) — `idx_reviews_hotel`.
- **identity/RBAC** (`V2`) — users/roles/permissions; `uq_user_roles_platform … WHERE hotel_id IS NULL` — a **platform-level role** concept already exists in RBAC naming.
- **reservations/booking** (`V6`) — statuses pending/confirmed/modified/cancelled/checked_in/checked_out/no_show; `hold_expires_at` exists but is never set (no hold logic implemented).
- **No platforms, content_blocks, destinations, slugs anywhere** — verified in all 12 migrations and `database/collection-schema-postgresql.sql`.

**PROPOSED** — nothing duplicates an existing concept; the new tables are limited to platform identity + content blocks (§12).

---

## 4. Platform Model

**FACT** — No platform concept in DB/backend; only the null-`hotel_id` convention (faqs, promotions, tax_fee_types, notification templates) and the RBAC "platform role" naming.

**PROPOSED** — `Platform` = the **collection / brand tenant** ("The Hotel Collection"): identity only, grouping hotels and owning site-level content via blocks. Not a hotel, not a marketplace, not a technical tenant boundary.

```text
platforms
--------------------------------
id                BIGSERIAL PK
name              VARCHAR(120) NOT NULL
slug              VARCHAR(120) NOT NULL UNIQUE   -- URL + GraphQL lookup
tagline           VARCHAR(255)
description       TEXT
status            VARCHAR(20) NOT NULL           -- draft | active | inactive (CHECK)
default_currency  CHAR(3)                        -- optional; hotel-level default already exists
created_at        TIMESTAMPTZ NOT NULL
updated_at        TIMESTAMPTZ NOT NULL
--------------------------------
```

Logo, hero image, gallery, contact → media + content blocks, never platform columns.

**DECISION RESOLVED (rev 3)** — Platform = the **collection / brand tenant** ("The Hotel Collection"); `platforms` carries identity fields only. Alternatives (marketplace, multi-tenant boundary, property group) rejected — revision 1 reasons unchanged. `default_currency` kept nullable.

---

## 5. Content-Block Model (design validation)

**PROPOSED — evaluation against PostgreSQL + Spring Boot + GraphQL:**

| Option | Shape | Verdict for this stack |
|---|---|---|
| A | `content_blocks` + `data JSONB` | **Rejected** — no FK integrity (items can reference deleted hotels), no DB validation, GraphQL needs `JsonObject` + manual mapping, admin editing needs app-level parsing, migration of shapes is silent |
| B | base table + 1:1 typed tables + item rows | **Recommended** — real FKs (hotel/experience/media references are enforced by the DB), CHECK constraints, GraphQL interface with per-type resolvers, batch-loadable in one query, admin forms map 1:1 to tables |
| C | typed tables only, no base | **Rejected** — ordering/enablement/platform scoping would be duplicated per type; GraphQL interface would need synthetic IDs; admin listing harder |
| D | A+B hybrid (typed tables + small JSONB only for genuinely free-form fields) | Accepted as B with discipline — **no JSONB fields in this phase** (none of the index-page blocks need free-form data) |

**PROPOSED — the "type + rows" model (unchanged from revision 1, now validated):**

```text
platform_content_blocks
--------------------------------
id                BIGSERIAL PK
platform_id       BIGINT NOT NULL REFERENCES platforms(id)
type              VARCHAR(30) NOT NULL CHECK (type IN ('HERO','EXPERIENCES'))
position          INT NOT NULL
is_enabled        BOOLEAN NOT NULL DEFAULT TRUE
created_at        TIMESTAMPTZ NOT NULL
updated_at        TIMESTAMPTZ NOT NULL
UNIQUE (platform_id, position)
--------------------------------
```

Each type has a 1:1 typed table (`content_block_id BIGINT NOT NULL UNIQUE REFERENCES platform_content_blocks(id)`) and, where ordered lists exist, item rows referencing domain entities or media. **Type↔child-table consistency**: service-level enforcement (**DECISION RESOLVED rev 3 — no DB trigger this phase**; precedent `trg_availability_capacity` exists but service-layer consistency is sufficient for curated content).

The block type enum stays closed; new types require a migration + GraphQL type — which is the correct cost, not a CMS abstraction.

---

## 6. Media Model

**FACT** — `media` already implements the metadata-only pattern: url, storage_key (deletion handle), alt_text, category, mime_type, width/height, typed owners, is_primary with **partial unique index per owner** (one primary per hotel/room type/experience/restaurant/extra), sort_order. No binary in DB. No storage provider implemented; ADR-003 (Cloudinary) is "proposed" status.

**PROPOSED — extend, don't reinvent:**

```text
media (ALTER — 2 columns)
--------------------------------
platform_id  BIGINT NULL REFERENCES platforms(id)   -- 6th typed owner
caption      VARCHAR(255)                            -- galleries/sliders
--------------------------------
```

- Extend `chk_media_single_owner` to include `platform_id`; add `uq_media_primary_platform … WHERE platform_id IS NOT NULL AND is_primary` and `idx_media_platform`.
- Coverage: platform logo/hero/gallery (platform_id owner); hotel/room-type/experience media already covered.

**PROPOSED — storage (rev 3: approved, local filesystem ONLY this phase):**

| Option | Verdict |
|---|---|
| **A. Local filesystem only (THIS PHASE)** | **Approved** — `MediaStorageProvider` port + `LocalFilesystemMediaStorageProvider`; root configurable via `MEDIA_STORAGE_PATH` env (no machine-specific hardcoded paths); safe handling: naming, MIME validation, size limits, path traversal, invalid-image rejection, executable rejection, replacement, deletion, orphan cleanup |
| B. Object storage only | FUTURE |
| C. Local FS (dev) + S3-compatible self-hosted (prod) | FUTURE behind the same port (e.g. MinIO, same S3 API both sides) |
| D. DB binary | Reject — bloat, no CDN, no processing |

- `MediaStorageProvider` port: `store(bytes, originalName, contentType)` → storage key; `delete(key)`; `resolveUrl(key)`. Upload = **REST multipart** (`POST /api/v1/media/upload`, JWT-authenticated, follows existing REST conventions/security). Download/streaming = FUTURE.
- Seed media rows initially with the existing CDN URLs (cf.bstatic / tripcdn / unsplash) so the page renders unchanged (**DECISION RESOLVED rev 3 — accepted**); storage switch is a later, isolated step.
- Media testing (approved): full flow — upload → physical file exists → metadata in PG → GraphQL query → frontend display → replace/delete → invalid MIME → oversized → traversal → no leftover files.

---

## 7. Hotel / RoomType / Room / Experience Relationships

**FACT** — Verified schema:
- `platforms` → (proposed) `hotels.platform_id` — one platform, many hotels.
- `hotels` → `room_types` (catalog + inventory `total_inventory`, sparse availability per room-type/night).
- `hotels` → `rooms` (physical, operational only: housekeeping/maintenance — back-office concept).
- `hotels` → `experiences` (hotel-scoped, `hotel_id NOT NULL`), `offers` (promotions), `reviews`, `media`, `restaurants`, `extras`, `faqs`.
- Customer search uses **RoomType-level inventory**, never physical Room rows (availability is room-type/night sparse; `rooms` has no availability).

**PROPOSED** — relationship model for the client platform:

```text
Platform
  └── Hotels (platform_id)
        ├── RoomTypes ── availability (sparse, per night) + rates (rate plans/prices)
        ├── Experiences / Offers / Reviews / Faqs / Restaurants / Extras
        └── Media (typed owner)
```

Physical Room remains operational/back-office (no concrete reason found to surface it in customer flows). **ASSUMPTION** — housekeeping-driven inventory (e.g. out-of-order room type blocking) may later need `rooms` linked to availability; not needed now.

**PROPOSED — additive hotel changes (rev 3: approved):** `hotels.platform_id BIGINT NULL REFERENCES platforms(id)` (**nullable — existing rows stay valid; demo hotel backfilled in V14**) and `hotels.slug VARCHAR(120) NOT NULL UNIQUE` (generated from name at backfill with **collision strategy: append `-2`, `-3`, … suffixes** — deterministic, exercised by the duplicate draft hotels in the dev DB).

---

## 8. Index-Page Data Mapping (complete)

**FACT** — section sources verified in §2. **PROPOSED** — mapping per dynamic piece:

| Section / piece | Current source | DB entity / table | New or existing | GraphQL type / query | Platform or domain | Static? |
|---|---|---|---|---|---|---|
| Header brand line | `PROPERTY.name/brand/city` | platforms | new | `Platform` / `platform(slug:)` | **Platform** | dynamic |
| Header nav links | `NAV_LINKS` constant | — | — | — | — | **static** |
| Header tel | `TEL` constant | hotels.phone | existing | `Hotel.phone` | domain | dynamic (defer) |
| Hero image | hardcoded bstatic URL | media (platform_id) | ext. media | `HeroBlock.image → Media` | **Platform** | dynamic |
| Hero eyebrow/title/subtitle | hardcoded JSX | hero_blocks | new | `HeroBlock` | **Platform** | dynamic |
| Hero facts (rating, reviewCount, room count, check-in) | `PROPERTY` | hotels + reviews | existing | `Hotel`, review stats, `roomTypes` | **domain** (computed, never block data) | dynamic |
| Recent activity | localStorage | — | — | — | client-side | **stays client** |
| Rooms & suites | `PROPERTY.rooms` | room_types + rate_plan_prices | existing | `hotel { roomTypes }` + `rates` | domain | dynamic |
| Experiences | `PROPERTY.experiences` | experiences (via block items) | existing | `FeaturedExperiencesBlock.items → Experience` | **Platform** (block) → domain rows | dynamic |
| Facilities | `PROPERTY.facilities` | amenities + hotel_amenities | existing | `hotel { amenities }` | domain | dynamic |
| Offers | `OFFERS` | promotions | existing | `offers(hotelId)` | domain | dynamic |
| Reviews | `PROPERTY.reviews` | reviews | existing | `reviews(hotelId)` + stats | domain | dynamic |
| Location distances | `PROPERTY.location.distances` | hotel_distances (new small table) | **new** (or static — DECISION REQUIRED) | `hotel { distances }` | domain | dynamic (or static) |
| Location image + address | hardcoded img + `PROPERTY` | media (hotel) + hotels | existing | `hotel.media`, `hotel.address*` | domain | dynamic |
| Newsletter | hardcoded copy + mock form | — | — | — | — | copy **static**; form FUTURE REST |
| Final CTA | hardcoded + `PROPERTY` | hotels/reviews | existing | `hotel` facts | domain | copy static, facts dynamic |
| Footer identity | `PROPERTY` | platforms + hotels | new/existing | `platform`, `hotel` | both | dynamic |
| Footer links | constants | — | — | — | — | **static** |

**PROPOSED** — hero facts remain **computed from domain** (rating = review aggregates, check-in = `hotel.checkInTime`, room count = `roomTypes`); they are not hero-block data (prevents duplication — rule §29 of revision 1).

---

## 9. Search Architecture

**FACT** — Search flow today: form → URL state → `/search` → mock `searchRooms()` (deterministic hash availability + derived plans) → client-side facets/sort. Backend per hotel: `availability(input)` (sparse, minFree per night) and `rates(input)` (rate options per room type; `checkInDate` keyed) and `quote(input)` (authoritative pricing, promo-aware).

**PROPOSED — evaluate options:**

| Option | Shape | Trade-offs |
|---|---|---|
| **A. Several reusable queries (recommended, single-hotel phase)** | One GraphQL document: `availability` + `rates` (both per hotel) | Reusable and independently cacheable; client combines results — mirrors today's `SearchResultEntry {room, availability, plans}` semantics exactly; no new schema; rate-plan filtering/pricing stays where it is. Cost: client-side join of two result sets (trivial at one hotel, N room types) |
| B. One dedicated search query | `searchAvailability(input): [SearchResultEntry]` | Single round-trip and server-side join (good for multi-hotel + pagination); but new schema + service, couples availability and pricing, harder to cache granularly, and duplicates what `availability`+`rates` already answer |
| C. Other (search at REST) | — | Rejected — reads stay GraphQL here; no file/streaming/transaction need; browser caching of GraphQL POST is weaker than GET-based REST but acceptable |

**PROPOSED** — **A now** (single hotel), **B as FUTURE** when multi-hotel search arrives (hotels filtered by availability server-side, paginated).

**Combining availability and pricing — the correct behavior:** availability and rates are advisory snapshots for display; the **authoritative** price is `quote` at booking time (FACT — `BookingService.create` re-prices server-side via `pricingService.quote`; client totals are never trusted). The search page combines `availability` (filter/sort: available/few/soldout) with `rates` (price facets, plan selection) client-side; on selection, the booking flow calls `quote`. Stale availability between search and booking surfaces as a normal booking-time conflict ("no availability left") — acceptable and already handled.

---

## 10. GraphQL Architecture

**PROPOSED — home-page query strategy:**

| Option | Trade-offs |
|---|---|
| A. `platform(slug:)` + separate domain queries (recommended) | `platform(slug:) { …contentBlocks… }` plus existing `hotel`/`roomTypes`/`offers`/`reviews` in **one client document** (GraphQL already batches): one round-trip; domain queries stay reusable (hotel page, search page); response size controlled by selection; N+1 avoided via existing `@BatchMapping`; codegen generates per-section fragments. Maintainability best — new blocks/types don't touch domain queries |
| B. One `homePage` query | Tempting for "frontend simplicity" but duplicates domain query shapes into a synthetic envelope, adds a service just for the index page, and every page-specific tweak changes one big schema type |
| C. Something else | Rejected — REST for these reads adds a second read surface with no benefit (no caching win at this scale; GraphQL already covers batching) |

**PROPOSED — A.** `platform(slug: String!): Platform!` becomes the index entry point; the page document also selects `hotel`, `roomTypes`, `offers`, `reviews`, `availability`, `rates` as needed.

**PROPOSED — schema additions (draft):**

```graphql
type Platform {
  id: ID!
  slug: String!
  name: String!
  tagline: String
  description: String
  status: PlatformStatus!
  defaultCurrency: String
  media: [Media!]!                  # platform-owned (logo, hero, og image)
  contentBlocks: [ContentBlock!]!   # enabled, ordered by position
  hotels: [Hotel!]!                 # platform-scoped hotels
  createdAt: DateTime!
  updatedAt: DateTime!
}

interface ContentBlock { id: ID! type: PlatformBlockType! position: Int! isEnabled: Boolean! }
enum PlatformBlockType { HERO EXPERIENCES }   # grows with approved types

type HeroBlock implements ContentBlock { id: ID! type: PlatformBlockType! position: Int! isEnabled: Boolean!
  eyebrow: String title: String! subtitle: String
  image: Media mobileImage: Media ctaLabel: String ctaTarget: String }

type FeaturedExperiencesBlock implements ContentBlock { id: ID! type: PlatformBlockType! position: Int! isEnabled: Boolean!
  title: String items: [FeaturedExperienceItem!]! }
type FeaturedExperienceItem { id: ID! experience: Experience! position: Int! }
```

- **Interface vs union**: interface (recommended) — common fields without duplication; union requires a wrapper type or repeated common fields. **DECISION RESOLVED rev 3 — ContentBlock interface confirmed.**
- Resolver pattern unchanged: `PlatformQueryResolver` (thin) → `PlatformService` → repositories. No business logic in resolvers (backend AGENTS rule 7).
- **No new GraphQL mutations this phase.** Block/media management = FUTURE back-office mutations (mirroring `setHotelMedia` style); existing guest mutations unchanged (REST per approved split). Media upload is REST (multipart) — §6.

---

## 11. REST vs GraphQL — Operation Classification

**FACT** — Approved split (`docs/planning/API_SPLIT_RECOMMENDATION.md`, implemented): reads → GraphQL; 8 guest write/action ops → REST. This revision **re-evaluates per operation** instead of assuming:

| Operation | Transport | Reason | Caching | Security | Notes |
|---|---|---|---|---|---|
| platform (+ blocks + media) | **GraphQL** | read-only, nested/typed, part of page document | HTTP/CDN (FUTURE) | public read | `platform(slug:)` |
| hotel / roomTypes / experiences / offers / reviews / amenities | **GraphQL** | reads, batched in page document | HTTP (FUTURE) | public read | existing queries |
| media (read URLs) | **GraphQL** | URLs are fields on Media | HTTP | public | storage host via URL |
| availability / rates / quote | **GraphQL** | reads + pricing assembly; reused by booking | per-document | public read | authoritative re-price at booking |
| search (single-hotel) | **GraphQL** | = availability + rates composition | HTTP (FUTURE) | public | §9 |
| multi-hotel search (FUTURE) | **GraphQL** | aggregation + pagination | server-side | public | dedicated query |
| me / myReservations / reservation lookup | **GraphQL** | reads, session-scoped | per-user | JWT | existing |
| login / register | **REST** (done) | brute-force rate limiting per-IP (429), form posts, simple bodies | no | rate-limited | `POST /api/v1/auth/*` |
| createReservation / cancelReservation | **REST** (done) | idempotency header, action verbs | no | email+reference / JWT | Idempotency-Key |
| createPayment / capturePayment / issueInvoice | **REST** (done) | transactions/actions, provider-facing shapes | no | JWT | approved split |
| createReview | **REST** (done) | action with side effects | no | JWT | approved split |
| media upload / download (FUTURE) | **REST** | multipart files don't fit GraphQL; streaming, size limits | CDN (FUTURE) | JWT (admin) | object storage |
| newsletter subscribe (FUTURE) | **REST** | simple form post; consent record | no | public + honeypot/rate limit | new endpoint + table |
| contact form (FUTURE) | **REST** | form post | no | public + rate limit | new endpoint |
| recent activity | client-side | personal, localStorage | — | client | stays mock/local |

**PROPOSED** — no change to the approved split; new index-page reads are GraphQL; new writes (newsletter/contact/upload) are FUTURE REST by default.

---

## 12. Database Tables

**PROPOSED — new (rev 3 approved; hotel_distances dropped — distances stay static copy):**

```text
platforms                        (identity only — §4)
platform_content_blocks          (base — §5)
hero_blocks                      (1:1 — §8/hero)
featured_experiences_blocks      (1:1)
featured_experience_items        (rows → experiences)
```

**PROPOSED — alters:** `hotels` (+`platform_id`, +`slug`); `media` (+`platform_id`, +`caption`, extended single-owner CHECK, primary/owner indexes).

**PROPOSED — LATER (not this phase):** `gallery_blocks` + `gallery_items` (hotel page galleries), `featured_hotels_blocks` + `featured_hotel_items` (multi-hotel), `contact_blocks` (phase 7), `slider_blocks` + `slider_items` (only if a slider requirement appears), `text_blocks` (only if CMS-editable copy required), `destinations` (multi-hotel search), `hotel_distances` (if distances ever become dynamic).

**No changes:** room_types, rooms, experiences, restaurants, extras, faqs, amenities, promotions, rate plans/prices, availability, reservations, reviews, payments/invoices, identity/RBAC.

---

## 13. Relationships / ER Diagram

```text
platforms ───< platform_content_blocks (type, position, is_enabled)
   │                │ 1:1
   │                ├── hero_blocks ── image ──> media (platform_id owner)
   │                └── featured_experiences_blocks ──< featured_experience_items ──> experiences
   │
   └──< hotels (platform_id)                hotels ──< room_types ──< availability (sparse per night)
         │      │                                  │         │
         │      ├──< experiences / offers / reviews / faqs / restaurants / extras
         │      └──< media (hotel owner)           └──< rate_plans/prices (offers)
         │
         └──< rooms (physical, operational — back-office)

media: typed owners — hotel_id | room_type_id | experience_id | restaurant_id | extra_id | platform_id
        (exactly one; per-owner unique primary)
```

---

## 14. Security Considerations

- **No new auth surface**: index-page reads are public GraphQL (consistent with `/graphql` permitAll).
- FUTURE block/media admin mutations must enforce platform-scope RBAC + hotel isolation (existing patterns; platform-level roles already exist in `user_roles`).
- Media `url` validation on write (scheme/host allowlist — XSS via SVG, open redirect).
- CSP updates (`img-src`, `connect-src` in `next.config.ts`) when GraphQL origin and media host change.
- Newsletter/contact (FUTURE REST): rate limiting (precedent `AuthRateLimitFilter`), consent storage, no PII in logs.
- No secrets in seed data.

---

## 15. Performance Considerations

- One GraphQL document per page view (single round-trip); existing `@BatchMapping` prevents N+1 for media/prices.
- Block/item volumes are tiny (<50 rows) — no pagination; indexes §12 keep composition reads single-index.
- Availability query cost: active room types × nights — fine; PK `(room_type_id, stay_date)` covers ranges.
- `totalsByHotelAndDate` (currently dead code, `AvailabilityRepository.java:53–60`) becomes useful for FUTURE multi-hotel search — leave for later.
- Caching (HTTP/CDN for the platform document) = FUTURE; Redis not needed now.
- GraphQL depth cap 15 already guards runaway nesting (blocks add one level).

---

## 16. Migration Strategy

**DECISION RESOLVED rev 3 (approved):**
- **V13__platform_content.sql** — one structural migration: platforms, platform_content_blocks, hero_blocks, featured_experiences_blocks + items, hotels alters (platform_id nullable, slug NOT NULL UNIQUE + backfill with collision suffix), media alters (platform_id, caption, extended `chk_media_single_owner`, `uq_media_primary_platform`, `idx_media_platform`).
- **V14__seed_platform_demo.sql** — platform ("The Hotel Collection"), hotel slug/association backfill, seed HERO + EXPERIENCES blocks, demo experiences + media rows (CDN URLs) referencing existing demo hotel 3 (Azure Bay Resort) and its room type 1. Idempotent (`ON CONFLICT` style per V10/V11 precedent).
- Migrations immutable once merged (backend AGENTS rule 2); frontend phases (§17) consume this schema and need **no further migrations**.
- Note (verified 2026-08-19): dev DB contains demo hotel 3 (active), room type 1, rate plan 1, promotion 1 — but **no experiences, media, or reviews**; V14 seeds a small demo set so index-page sections render real rows.

---

## 17. Frontend Integration Strategy (progressive)

**APPROVED (rev 3) — incremental, UI untouched, each phase independently reviewable and shippable** (service-seam swap per `AGENTS.md` rule 3; mock remains the fallback until its phase lands):

| Phase | Scope | Changes | Tests |
|---|---|---|---|
| 1 | **Platform identity** | `platform(slug:)` + codegen client setup (backoffice pattern); header brand line + footer identity from Platform; `NEXT_PUBLIC_API_URL` env wired | new GraphQL client unit; e2e header/footer |
| 2 | **Hero / media** | HeroBlock + media resolution; hero image/copy from block; facts still domain (`hotel` query) | hero e2e data-driven |
| 3 | **Rooms** | `hotel { roomTypes }` + `rates` replace `PROPERTY.rooms` in `RoomsGrid`; availability badge from real availability | availability tests rewritten (hash mock removed) |
| 4 | **Experiences** | FeaturedExperiencesBlock → `Experience` rows | experiences e2e |
| 5 | **Offers** | `offers(hotelId)` replaces `OFFERS` fixture | offers tests |
| 6 | **Reviews** | `reviews(hotelId)` + stats replace `PROPERTY.reviews` | reviews tests |
| 7 | **Location / contact** | `hotel` address/media + distances (or static); contact block if approved | location e2e |
| 8 | **Search / availability / rates** | `SearchResults` calls `availability` + `rates` (one document); facets/sort unchanged client-side; quote at booking | search e2e against real availability |

Per-section loading/empty/error states use existing patterns (skeleton exists); `IMG_FALLBACK` kept; `next.config.ts` remote patterns/CSP updated once per phase as needed. **PROPOSED** — no React Query (D-10 preserved); codegen + thin fetch wrapper.

---

## 18. Risks

| Risk | Mitigation |
|---|---|
| CMS over-generalization | Closed enum, typed tables, only HERO + EXPERIENCES now; every new type must clear this review |
| Branding ambiguity (collection vs single hotel) in header/footer/hero | Decide in §19 before phase 1 |
| Mock→DB parity breaks ~89 unit + ~79 e2e assertions (deterministic hash, exact copy) | Per-phase swaps with mock fallback until phase lands; copy stays static where classified static |
| Media host change vs CSP | Seed with existing CDN URLs; storage switch isolated later |
| Duplication between blocks and domain | Blocks carry copy/media only; all facts computed from domain |
| Type↔child-table drift | Service enforcement + optional trigger (decision) |
| Interface vs union codegen friction | Decide early; fragments isolate impact |
| Existing adjacent gaps (not ours): `Quote.message` unresolvable; `hold_expires_at` unused (overbooking window) | Flagged; tracked separately |

---

## 19. Open Questions (resolved rev 3)

1. Platform naming/branding: **"The Hotel Collection"** — approved for header/hero/footer.
2. Index page: **single-hotel site** (backend demo hotel 3 "Azure Bay Resort"); collection homepage = FUTURE.
3. Footer/contact: hotel contact (domain, current) — **kept**; platform contact block deferred.
4. `hotel_distances`: **dropped** — distances stay static copy.
5. Section headings: **static** — no TEXT blocks.
6. `platforms.default_currency`: **nullable**, not needed now.
7. Seed media URLs: **temporary CDN URLs accepted**.
8. Seed: **Flyway V14** (precedent).
9. `hotels.platform_id`: **nullable**, backfilled for demo hotel.
10. Block type↔child-table consistency: **service-only** — no DB trigger this phase.
11. Interface vs union for ContentBlock: **interface**.
12. GraphQL client: **codegen + thin fetch wrapper** (backoffice pattern).
13. Search page: **real availability now** (phase 8) — deterministic hash removed.
14. `hotels.slug`: **generated from name; collision suffix `-2`, `-3`**.

## 20. Decisions Requiring Approval — ALL RESOLVED (rev 3, approved 2026-08-19)

- [x] Approve this revised document as the implementation basis
- [x] Platform = collection/brand tenant; `platforms` identity fields (§4)
- [x] Content-block architecture: base + 1:1 typed + item rows; closed enum (§5)
- [x] Block types THIS PHASE: HERO + EXPERIENCES only; GALLERY/CONTACT/FEATURED_HOTELS LATER; SLIDER/TEXT NOT NEEDED (§8, §12)
- [x] Media: +`platform_id` +`caption`; metadata-only; **local filesystem storage via `MediaStorageProvider` (this phase), upload/download as REST; S3-compatible FUTURE** (§6)
- [x] `hotels` +`platform_id` (nullable) +`slug` (collision suffix) (§7)
- [x] Hotel contact remains domain data; contact block deferred (§8)
- [x] Search: reusable `availability` + `rates` now; dedicated search query FUTURE (§9)
- [x] GraphQL: `platform(slug:)` + domain queries in one document; ContentBlock interface (not union) (§10)
- [x] API classification table as approved (§11)
- [x] Migrations V13 + V14 (structure + seed), Flyway (precedent) (§16)
- [x] Frontend integration phases 1–8 as listed (§17)
- [x] Media upload authz: JWT-authenticated REST; reads stay public (§6, §14)

## 21. Implementation Phases (rev 3 — in progress)

| Phase | Scope | Exit criteria | Status |
|---|---|---|---|
| 0 | Decisions recorded; doc updated to APPROVED | no open decisions | **IMPLEMENTED** |
| 1 | V13 + V14 migrations; integrity tests | migrations green on fresh Testcontainers DB | **IMPLEMENTED** |
| 2 | Domain: Platform, ContentBlock base, HeroBlock, FeaturedExperiencesBlock(+items), PlatformService, repositories; tests | unit + integration tests | **IMPLEMENTED** |
| 3 | GraphQL: Platform type, ContentBlock interface, block types, `platform(slug:)`, resolvers, tests | GraphQL integration tests green | **IMPLEMENTED** |
| 4 | Media: entity +platform_id/caption; `MediaStorageProvider` + `LocalFilesystemMediaStorageProvider`; REST upload (multipart, JWT); filesystem/security tests | round-trip + security tests green | **IMPLEMENTED** |
| 5 | Seed verification: index page data fully queryable via GraphiQL | parity checklist vs §8 mapping | **IMPLEMENTED** |
| 6 | Frontend phases 1–2: codegen, platform identity, hero/media | header/hero data-driven; e2e green | **IMPLEMENTED** (build-time prerender verified against live backend; e2e rerun pending) |
| 7 | Frontend phases 3–6: rooms, experiences, offers, reviews | section swaps live; tests green | **PARTIAL** — experiences section live (FeaturedExperiencesBlock); rooms/offers/reviews service seams landed in `src/services/catalog.ts` (mock fallback), component swaps pending |
| 8 | Frontend phases 7–8: location/contact, search/availability/rates; Postman update; docs | search against real availability; full suites green; Postman executed | **PARTIAL** — Postman folder 9 added + executed; `searchStay` seam landed; location/contact + search page wiring pending |

## Approval Status

**APPROVED — IMPLEMENTATION IN PROGRESS (revision 3, 2026-08-19).** All §19/§20 decisions resolved as recorded above. Implementation began; phases marked above. This document is the baseline for the remaining work; completed scope is marked **IMPLEMENTED** as it lands.