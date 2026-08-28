# DATABASE_SCHEMA.md

**Project:** The Hotel Collection — Hotel Platform
**Schema version:** 1.1 (update to the v1.0 baseline)
**Scope of this document:** the relational schema in `hotel_collection_schema.sql`

This document records what already existed, what was added, what was
changed, and why — so the schema stays a single source of truth as the
platform grows past the first hotel (Executive Boutique Hotel Rabat).

---

## A. Existing entities (reviewed, kept as-is)

These were already correctly modeled and needed no change:

| Entity                                                                                            | Why it was left alone                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hotels`, `room_types`, `rooms`                                                                   | Hotel → RoomType → physical Room distinction was already correct; this is exactly what section 3/16 of the requirements asked to preserve.                                                                                                                                                               |
| `rate_plans`, `room_type_rate_plans`, `rates`                                                     | Date-grained pricing per (room type, rate plan) was already correct — supports different prices per night, not one static room price.                                                                                                                                                                    |
| `availability`                                                                                    | Already date + room-type grained with `total_inventory` / `rooms_sold` / `out_of_order` / `blocked`, plus an optimistic-lock `version` column. A stay-length query is just `WHERE stay_date BETWEEN check_in AND check_out - 1` against this same table — no separate "stay-range" structure was needed. |
| `promotions`, `promotion_eligible_room_types`, `promotion_eligible_rate_plans`, `promotion_rules` | Already covers booking window, stay window, discount, min nights, eligible rooms/plans, usage limits, and status. Promotion logic isn't hardcoded into `reservations` — it's just referenced by `promotion_id`.                                                                                          |
| `extras`                                                                                          | Already a separate, reusable entity.                                                                                                                                                                                                                                                                     |
| `reservations`, `reservation_rooms`, `reservation_guests`, `reservation_extras`                   | Core reservation model was already sound. `reservation_rooms.rate_per_night` and `reservation_extras.unit_price` already snapshot the price _at booking time_, independent of later changes to `rates`/`extras` — this was already correctly implemented and preserved untouched.                        |
| `reservation_rooms.room_id` (nullable)                                                            | Already correctly nullable — a reservation books a room _type_; a physical room can be assigned later by operations. This was explicitly checked against requirement §3 and left untouched.                                                                                                              |
| `payments`, `payment_transactions`                                                                | Already cover pending/authorized/captured/failed/refunded/partially_refunded — no payment-provider integration added, this was a schema-only task.                                                                                                                                                       |
| `check_ins`                                                                                       | Already linked to `reservations` and `reservation_guests`, with arrival estimate, preferences, a tokenized `id_document_reference`, and verification status. No new check-in entity was needed.                                                                                                          |
| `guests`, `users`                                                                                 | Already correctly separate (`guests.user_id` nullable) — a reservation requires a `guest_id`, never a `user_id`. An account is optional, exactly as required.                                                                                                                                            |
| `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_logs`                            | Existing RBAC/audit infrastructure — not part of this task's scope, kept because removing it would break the existing project (per the "what not to remove" instruction).                                                                                                                                |
| `countries`, `currencies`, `languages`                                                            | Reference tables, unchanged.                                                                                                                                                                                                                                                                             |

---

## B. Added entities

All additions are new tables — nothing existing was replaced.

### Hotel-page content

- **`amenities`** — one reusable definition per amenity (name, icon, category). Prevents re-typing "Free WiFi" as free text in five different places.
- **`hotel_amenities`** / **`room_type_amenities`** — join tables attaching the shared `amenities` catalog to a hotel and/or a room type. This is what satisfies "avoid duplicating the same amenity data in multiple tables."
- **`experiences`** — hotel activities/experiences (name, description, category, duration, optional price, location, status, display order). Images reuse `media` (see below), not a new images table.
- **`restaurants`** — hotel dining venues (name, description, cuisine type, opening hours as display text, location, status, display order). Images also reuse `media`.
- **`faqs`** — reusable FAQ entries, `hotel_id` nullable so a FAQ can be hotel-specific or platform-wide/global.

Hotel images and room-type images were **not** given their own tables — the schema already had a generic, polymorphic `media` table (`entity_type` + `entity_id`) built for exactly this. It already supports `url`, `alt_text`, `category`, `sort_order`; the only thing missing was a "featured image" flag, so `is_primary` was added to it (see section C). This one table now covers hotel images, room-type images, experience images, and restaurant images without duplicating a media table per entity type.

### Structured pricing add-ons

- **`tax_fee_types`** — reusable catalog of tax/fee definitions (VAT, city tourism tax, service fee), each with a `calculation_method` (percentage / fixed per night / fixed per stay / fixed per guest). `hotel_id` nullable = applies platform-wide by default.
- **`reservation_charges`** — the itemized taxes/fees actually applied to one reservation. `name` and `amount` are snapshotted at booking time, so editing `tax_fee_types` later never silently changes a past reservation's total. `reservations.tax_amount` and the new `reservations.fee_amount` are the aggregated rollups of this table, kept on the reservation row for fast display without a join.

This directly answers requirement §10 — a single hardcoded `tax_amount` couldn't represent VAT + city tax + service fee separately; now it can, without over-engineering a full billing engine.

---

## C. Modified entities

| Entity         | Change                                                                                                                                                                                                                                                   | Why                                                                                                                                                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `media`        | Added `is_primary BOOLEAN DEFAULT FALSE`                                                                                                                                                                                                                 | Supports "featured/primary image" per hotel or room type, which the polymorphic table didn't previously distinguish.                                                                                                                                                                                                                     |
| `rate_plans`   | Added: `is_refundable`, `cancellation_deadline_days`, `cancellation_penalty_type`, `cancellation_penalty_value`, `payment_timing`, `deposit_percentage`. Existing `cancellation_policy`/`payment_policy` TEXT columns kept as guest-facing display text. | §4/§11 explicitly call out that cancellation/payment rules must be backend-calculable, not just prose. The backend can now answer "is this cancellable, by when, what's the penalty" from columns instead of parsing text. Nothing was removed — the TEXT fields stay for the guest-facing policy description shown on the booking page. |
| `reservations` | Added `fee_amount NUMERIC(10,2) DEFAULT 0`, alongside the existing `tax_amount`.                                                                                                                                                                         | Gives taxes and fees separate buckets on the reservation row, matching the new `reservation_charges` itemization, without removing or renaming anything that existed.                                                                                                                                                                    |
| `reviews`      | Added `author_name VARCHAR(100)` (nullable) and `updated_at`.                                                                                                                                                                                            | §Reviews explicitly requires a review to not always need an account — `guest_id` was already nullable, but there was no way to show a display name for a guest with no `guests` row at all. `updated_at` was added for moderation-status tracking, consistent with every other mutable table in the schema.                              |

No existing column was renamed, retyped, or removed.

---

## D. Removed entities

**None.** No table or column was removed. Everything in section A was reviewed and kept because it already satisfied the requirement it maps to.

---

## E. Relationships

**Hotel content / inventory chain:**

```
hotels
  ├─< room_types
  │      ├─< rooms                        (physical inventory unit)
  │      ├─< room_type_rate_plans >─< rate_plans
  │      ├─< rates            (room_type_id + rate_plan_id + date → price)
  │      ├─< availability     (room_type_id + date → inventory counts)
  │      └─< room_type_amenities >─< amenities
  ├─< hotel_amenities >─< amenities
  ├─< experiences
  ├─< restaurants
  ├─< faqs                     (nullable hotel_id = global FAQ)
  ├─< extras
  ├─< promotions
  └─< media                    (entity_type='hotel'|'room_type'|'experience'|'restaurant', entity_id=…)
```

A **rate** is only meaningful as (room_type, rate_plan, date) — never a single static price per room. **Availability** is only meaningful as (room_type, date) — never per physical room, since guests book a type, not a room number.

**Booking chain:**

```
guests
  └─< reservations                (requires guest_id; user_id is never required)
         ├─< reservation_rooms    (room_id nullable — physical room assigned later)
         │      └─< reservation_guests  (occupants of that room)
         ├─< reservation_extras   (references extras, snapshots unit_price)
         ├─< reservation_charges  (references tax_fee_types, snapshots amount)
         ├─< payments
         │      └─< payment_transactions
         └─< check_ins            (per reservation_guest)
```

`reservations.promotion_id` links to `promotions` directly — a promotion is applied to a reservation, not baked into its price calculation logic.

**Reviews:** `reviews.hotel_id` required, `reservation_id` and `guest_id` both optional — a review can be tied to a verified stay, or stand alone with just an `author_name`.

---

## F. Frontend mapping

| Frontend area                                 | Backing entities                                                                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Homepage**                                  | `hotels`, `media` (`entity_type='hotel'`, `is_primary`), `room_types` (for "from $X/night" teasers via `rates`)                                                                                |
| **Search**                                    | `room_types`, `availability`, `rates`, `rate_plans` — a search is an availability + rate lookup across the requested date range and room types                                                 |
| **Hotel details**                             | `hotels`, `media`, `hotel_amenities` → `amenities`, `experiences`, `restaurants`, `faqs` (hotel-specific + global), `reviews`                                                                  |
| **Room details**                              | `room_types`, `room_type_amenities` → `amenities`, `media` (`entity_type='room_type'`), `rate_plans` available for that room type                                                              |
| **Offers**                                    | `promotions`, `promotion_eligible_room_types`, `promotion_eligible_rate_plans`                                                                                                                 |
| **Booking**                                   | `rates`, `availability`, `rate_plans` (incl. structured cancellation/payment fields), `extras`, `tax_fee_types` — everything needed to build the price breakdown before creating a reservation |
| **Reservation (confirmation / "my booking")** | `reservations`, `reservation_rooms`, `reservation_guests`, `reservation_extras`, `reservation_charges`, `payments`                                                                             |
| **Check-in**                                  | `check_ins`, `reservation_guests`, `reservations`                                                                                                                                              |
| **Account**                                   | `guests`, `users` (only if the guest chose to create an account), `reservations` (guest's booking history)                                                                                     |

---

## G. Future considerations (intentionally left out of the MVP)

These were deliberately **not** added now, per the "what not to add" constraint — listed here so they're not forgotten, not because they're planned next:

- **Recently viewed / recently searched** — no DB tables added. For anonymous users this is client-side (localStorage/session) for now; only worth persisting server-side once there's a logged-in-user personalization requirement strong enough to justify it.
- **PMS / channel manager integration** — no external-sync tables. When needed, this should be an integration layer that writes into the existing `availability`/`rates`/`reservations` tables, not a parallel data model.
- **Loyalty / points accounting** — out of scope; would be a new domain (`loyalty_accounts`, `loyalty_transactions`) added only if the business actually launches a loyalty program.
- **Housekeeping management beyond `rooms.housekeeping_status`** — the current single-status field is enough for "is this room sellable"; a full housekeeping task/scheduling system is a separate module, not a schema gap.
- **Full hotel ERP / advanced revenue management** — explicitly excluded per the requirements; `rates` and `availability` already support manual, date-level pricing, which is enough for a boutique property.
- **Multi-property enterprise permissions beyond current RBAC** — `user_roles.hotel_id` already scopes a staff role to one hotel or leaves it global; a more granular enterprise permission model (e.g. per-module ACLs) isn't needed until there are enough hotels/staff for it to matter.
- **`tax_fee_types.value` currently supports flat percentage/fixed rules only** — tiered or bracketed tax rules (e.g. different tourism tax by star rating or occupancy) would need a small extension later, not a redesign, if a jurisdiction ever requires it.

---

## Migration note

The platform hasn't launched yet, so this update was applied directly to
the `CREATE TABLE` definitions in `hotel_collection_schema.sql` rather than
as a set of `ALTER TABLE` migration scripts. **Once this schema is deployed
to a real environment, all further changes should go through versioned
migrations** (Flyway, Prisma Migrate, TypeORM migrations, etc.) instead of
editing the base file — this document should then track migrations
chronologically rather than describing direct schema edits.
