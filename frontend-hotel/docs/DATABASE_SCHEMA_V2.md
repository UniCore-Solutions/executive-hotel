# DATABASE_SCHEMA_V2.md

**Project:** The Hotel Collection — Hotel Platform
**Schema version:** 2.0 (multi-domain)
**Scope of this document:** the relational schema in `database/collection-schema-v2.sql`
**Conventions:** see `.opencode/skills/database-schema` — this document and the SQL must stay in sync

Version 2.0 introduces the **multi-domain** foundation: a `domain` is a
brand/collection scope (e.g. "The Hotel Collection"), every hotel belongs
to exactly one domain, and every hotel-scoped table inherits that scope
through `hotels`. This document records what changed versus v1.1, what
was deliberately not added, and how the domains/rooms/services concepts
fit together — so the schema stays a single source of truth.

---

## A. What changed from v1.1

| Area                                                                                                                                                          | v1.1                                 | v2.0                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `domains`                                                                                                                                                     | —                                    | **ADDED** — top-level brand/collection scope (`name`, `slug`, `website_url`, `status`)                                                         |
| `hotels`                                                                                                                                                      | unscoped (implicitly one collection) | `domain_id BIGINT NOT NULL REFERENCES domains(id)` added                                                                                       |
| `hotel_configurations`                                                                                                                                        | —                                    | **ADDED** — structured hotel-level rules: check-in/check-out rules, breakfast/lunch/dinner availability, other meal options                    |
| `hotel_services`                                                                                                                                              | —                                    | **ADDED** — structured hotel service catalog (breakfast, dinner, airport transfer, parking, …)                                                 |
| `translations`, `translation_keys`                                                                                                                            | not present                          | **still not present** — deliberately excluded; content is stored in the platform's primary language, `languages` stays a plain reference table |
| `room_inventory`                                                                                                                                              | not present                          | **still not present** — deliberately excluded; `availability` is the single inventory source, no duplicate rooms concept                       |
| `restaurants`                                                                                                                                                 | ✅ kept                              | ✅ **kept** unchanged — hotel dining facilities are first-class content                                                                        |
| `experiences`                                                                                                                                                 | ✅ kept                              | ✅ **kept** — curated activities (spa, excursions)                                                                                             |
| `extras`                                                                                                                                                      | ✅ kept                              | ✅ **kept** — bookable add-ons / extra charges on a reservation                                                                                |
| `invoices`                                                                                                                                                    | —                                    | **ADDED** — guest-facing billing documents per reservation                                                                                     |
| `notifications`                                                                                                                                               | —                                    | **ADDED** — outbound notifications (email/sms/push/in-app)                                                                                     |
| `rate_plans`, `rates`, `availability`, `promotions`, reservations chain, `payments`, `check_ins`, `reviews`, `amenities`, `faqs`, `media`, RBAC, `audit_logs` | ✅                                   | ✅ **kept unchanged**                                                                                                                          |

---

## B. Multi-domain foundation

```
domains  (The Hotel Collection, …)
  └─< hotels.domain_id
```

- A **domain** is the commercial brand/collection scope of the platform.
  Example: `The Hotel Collection` owns `Executive Boutique Hotel Rabat`
  and any future properties.
- `hotels.domain_id` is `NOT NULL` — every hotel belongs to exactly one
  domain. No hotel can float outside a domain.
- All other tables are already hotel-scoped (directly or through
  `hotel_id`), so the domain scope propagates with no new join tables:
  `room_types`, `rooms`, `rate_plans`, `rates`, `availability`,
  `restaurants`, `experiences`, `extras`, `hotel_services`,
  `hotel_configurations`, `faqs`, `promotions`, `reservations`,
  `reviews`, `notifications`.
- Global lookup tables (`countries`, `currencies`, `languages`) and the
  RBAC tables stay shared across all domains. `user_roles.hotel_id`
  already scopes a role to one hotel or leaves it global.
- `promotions.hotel_id` remains nullable — a promotion can be
  platform-wide (all domains) or hotel-scoped.

---

## C. Hotel configuration & services (meal plans, check-in rules)

The v1.1 `rate_plans.meal_plan` text field remains as display text. The
back-end, calculable side of "does this hotel serve breakfast / dinner /
other meals, and what are the check-in/check-out rules?" now lives in
two new tables:

### `hotel_configurations` — hotel-level rules (typed key/value)

| Column         | Type          | Meaning                                           |
| -------------- | ------------- | ------------------------------------------------- |
| `hotel_id`     | FK → `hotels` | the configured hotel                              |
| `config_key`   | VARCHAR(60)   | seeded keys below                                 |
| `config_value` | TEXT          | the value                                         |
| `value_type`   | enum          | `boolean` / `string` / `number` / `time` / `json` |

Seeded keys (documented in the SQL header):

- `breakfast_available`, `lunch_available`, `dinner_available` — meal
  availability flags
- `breakfast_hours`, `lunch_hours`, `dinner_hours` — serving windows
- `other_meal_options` — JSON list of additional meal options
- `early_check_in_allowed`, `late_check_out_allowed`
- `check_in_rules`, `check_out_rules`, `deposit_policy`

The base `check_in_time` / `check_out_time` columns stay on `hotels`;
the configuration holds the _rules_ around them. Typed key/value means
a new rule never requires a schema change.

### `hotel_services` — the hotel's service catalog

| Column                                       | Meaning                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `name`                                       | 'Breakfast', 'Dinner', 'Airport transfer', 'Parking', 'Laundry', … |
| `category`                                   | `meal` / `transport` / `wellness` / `business` / `general`         |
| `available`                                  | is it currently offered                                            |
| `is_paid` / `price_amount` / `currency_code` | optional fee (nullable = complimentary)                            |
| `availability_hours`                         | display text, e.g. '06:30–10:30 daily'                             |

**Why three tables instead of one?** The three service-like concepts
have different lifecycles, so they stay separate — no duplication:

| Table            | Answers                                          | Example                                      |
| ---------------- | ------------------------------------------------ | -------------------------------------------- |
| `hotel_services` | "What does this hotel offer day-to-day?"         | Breakfast, dinner, airport transfer, parking |
| `experiences`    | "What curated activities can guests book?"       | Spa treatment, guided excursion              |
| `extras`         | "What bookable add-ons attach to a reservation?" | Extra bed, late checkout, extra person       |

An airport transfer, for example, is a `hotel_service` (offered or not,
with an optional fee). A spa is an `experience`. An extra bed is an
`extra` — snapshotted on `reservation_extras` at booking time.

---

## D. The room model — three distinct concepts, no `room_inventory`

This was the key decision: **do not create a second rooms concept.**

| Table          | Answers                                                                                    | Grain                          |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| `room_types`   | "What can the customer book?" — _superior-double-or-twin, double-or-twin, executive-suite_ | commercial category, per hotel |
| `rooms`        | "Which physical room exists?" — _Room 101, Room 204_                                       | physical unit, per hotel       |
| `availability` | "How many units of this room type can we sell on this date?"                               | (room_type, date) count        |

- **There is no `room_inventory` table.** `availability` is the single
  sellable-inventory source with `total_inventory` / `rooms_sold` /
  `out_of_order` / `blocked` and the optimistic-lock `version`. A second
  table would only drift out of sync.
- `rooms` carries operational state only (`status`,
  `housekeeping_status`, `maintenance_status`) and is never counted for
  sellability.
- A reservation books a **room type**; `reservation_rooms.room_id`
  stays nullable and is assigned later by operations.

---

## E. Deliberately not included (removed / never added)

| Concept                            | Decision     | Why                                                                                                                                                                           |
| ---------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `translations`, `translation_keys` | **Excluded** | Content is authored once in the platform's primary language. Localization is an application-layer concern for later; the `languages` reference table stays for metadata only. |
| `room_inventory`                   | **Excluded** | `availability` already answers the inventory question; a parallel table would duplicate the rooms concept (see section D).                                                    |

Everything that v1.1 kept is kept: reservations and the booking chain,
payments + invoices, check-in, reviews/ratings, notifications, RBAC,
audit. `restaurants` is a first-class entity, not a configuration value.

---

## F. Relationships

**Domain / content / inventory chain:**

```
domains
  └─< hotels
         ├─< hotel_configurations        (check-in/out rules, meal flags)
         ├─< hotel_services              (breakfast, dinner, airport transfer, …)
         ├─< room_types
         │      ├─< rooms                (physical units — never counted for sellability)
         │      ├─< room_type_rate_plans >─< rate_plans
         │      ├─< rates                (room_type + rate_plan + date → price)
         │      ├─< availability         (room_type + date → sellable count) ← THE inventory
         │      └─< room_type_amenities >─< amenities
         ├─< hotel_amenities >─< amenities
         ├─< restaurants
         ├─< experiences
         ├─< faqs                       (nullable hotel_id = global)
         ├─< extras
         ├─< promotions
         └─< media                       (entity_type='hotel'|'room_type'|'experience'|'restaurant', entity_id=…)
```

**Booking chain (unchanged from v1.1):**

```
guests
  └─< reservations
         ├─< reservation_rooms    (room_id nullable — assigned later)
         │      └─< reservation_guests
         ├─< reservation_extras
         ├─< reservation_charges
         ├─< payments
         │      └─< payment_transactions
         ├─< invoices
         └─< check_ins
```

**Notifications:** one row per outbound notification; recipient is a
`user_id` (account) or a `guest_id` (no account), `hotel_id` nullable
for platform-wide sends.

---

## G. Frontend mapping

| Frontend area                  | Backing entities                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Homepage**                   | `domains`, `hotels`, `media` (`is_primary`), `room_types` (price teasers via `rates`)                                                                   |
| **Search**                     | `room_types`, `availability`, `rates`, `rate_plans`                                                                                                     |
| **Hotel details**              | `hotels`, `media`, `hotel_amenities`, `experiences`, `restaurants`, `hotel_services`, `hotel_configurations` (meal + check-in rules), `faqs`, `reviews` |
| **Room details**               | `room_types`, `room_type_amenities`, `media`, `rate_plans`                                                                                              |
| **Offers**                     | `promotions`, `promotion_eligible_room_types`, `promotion_eligible_rate_plans`                                                                          |
| **Booking**                    | `rates`, `availability`, `rate_plans`, `extras`, `tax_fee_types`                                                                                        |
| **Reservation / "my booking"** | `reservations`, `reservation_rooms`, `reservation_guests`, `reservation_extras`, `reservation_charges`, `payments`, `invoices`                          |
| **Check-in**                   | `check_ins`, `reservation_guests`, `reservations`                                                                                                       |
| **Notifications**              | `notifications`                                                                                                                                         |
| **Account**                    | `guests`, `users`, `reservations`                                                                                                                       |
| **Admin / staff**              | `users`, `roles`, `permissions`, `user_roles` (hotel-scoped), `audit_logs`, `hotel_configurations`, `hotel_services`, `availability`, `rates`           |

---

## H. Future considerations (intentionally left out)

- **Per-domain content localization** — when a real translation
  requirement appears, add `translation_keys`/`translations` at the
  application layer with `domain_id` or `hotel_id` scope; not added now.
- **Channel manager / PMS sync** — an integration layer writing into the
  existing `availability`/`rates`/`reservations` tables, never a
  parallel data model.
- **Loyalty / points accounting** — new domain tables only if the
  business launches a program.
- **Full housekeeping task scheduling** — `rooms.housekeeping_status`
  remains sufficient for "is this room sellable".
- **Tiered / bracketed taxes** — `tax_fee_types.value` covers flat
  percentage/fixed rules; a bracketed extension would be additive.

---

## Migration note

The platform hasn't launched, so v2.0 was written as a fresh full
schema (`database/collection-schema-v2.sql`) rather than ALTER scripts.
`hotels.domain_id` and the new tables are additive; nothing was removed
from v1.1. **Once deployed, all further changes must go through
versioned migrations**, and this document should track migrations
chronologically instead of describing direct schema edits.
