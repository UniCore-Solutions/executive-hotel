# Persistence & Domain Model

Entities mirror the frozen Flyway schema (V1–V18, 53 tables) 1:1 and are
validated at boot with `ddl-auto: validate`. Composite FKs that the schema
models as `hotel_id`-style columns stay plain `Long` fields — only
lifecycle-bearing relationships become JPA associations. Schema evolution:
V15/V16 dropped the pre-extras totals CHECKs (extras-aware code-level
identity), V17 added `event_outbox.updated_at` (stale-claim recovery), V18
added the `total_inventory` capacity trigger (see `invariants.md` items 3, 9, 21).

## Aggregates

### Hotel (catalog)
`Hotel` — id, name, brand, description, city, `country_code` (char(2), FK
`countries`), `default_currency` (char(3), FK `currencies`), status
(`active|inactive|draft`), timestamps.
- `@ManyToMany amenity` via `hotel_amenities`.
- Children (plain FK columns): `RoomType`, `Experience`, `Restaurant`,
  `Faq`, `Extra`, `Promotion`, `RatePlan`, `TaxFeeType`, `Media`.

### RatePlan (pricing)
`RatePlan` — per-hotel; code, `currency_code`, meal plan, cancellation
policy fields (`cancellation_deadline_days`, `cancellation_penalty_type`
`first_night|percentage|fixed_amount`, `cancellation_penalty_value`),
`is_refundable`, `payment_timing`, `deposit_percentage`, `min/max_stay`,
`occupancy_rules`, status.
- `RoomTypeRatePlan` links a room type + rate plan (its own `currency_code`).
- `RatePlanPrice` — `[room_type_rate_plan_id, valid_from, valid_to,
  price_amount, currency_code]`; nightly rate lookup requires the range to
  cover the check-in date.

### Availability (inventory)
`RoomType.total_inventory` — the house count (capacity) lives on the room
type. `Availability` — `[room_type_id, stay_date]` UNIQUE; `rooms_sold`,
`out_of_order`, `blocked`, `version`. **Sparse model (V12):** a row exists
only for nights with activity (sold/ooo/blocked > 0); a night with no row is
fully available. Domain methods `free(total) = total − sold − ooo − blocked`,
`sell(n, total)`, `release(n)`, `isEmpty()`. Rows are materialized on booking
(`INSERT … ON CONFLICT DO NOTHING` then `PESSIMISTIC_WRITE` row locks) and
deleted when fully released; the `trg_availability_capacity` trigger rejects
writes above capacity.

### Reservation (booking aggregate root)
`Reservation` — reference (unique), `hotel_id`, `[guest_id]` (guest + email
for accountless flow), `[booked_by_user_id]`, `[promotion_id]`,
`check_in_date/check_out_date`, adults/children, `currency_code`,
money snapshots `subtotal/discount/tax/fee/total_amount` (guarded by the C16
totals-identity CHECK set), `payment_status`
(`pending|authorized|captured|failed|refunded|partially_refunded`), `status`
(`pending|confirmed|modified|cancelled|checked_in|checked_out|no_show`),
`source`, `idempotency_key` (UNIQUE), timestamps.

Associations (all `CascadeType.ALL` + orphanRemoval from the aggregate):
- `roomLines: List<ReservationRoom>` — one per requested room/rate plan, own
  nightly rate + subtotal.
- `extras: List<ReservationExtra>` — quantity + total price.
- `charges: List<ReservationCharge>` — tax/fee breakdown by type.
- `statusHistory: List<ReservationStatusHistory>` — from/to/actor/note.
- `cancellation: ReservationCancellation` (1:1) — reason id, note, actor,
  refundable flag, penalty/refund amounts, cancelledAt.
- `guest: Guest` — read-only (`insertable/updatable = false`) for display.

Collections are `@Fetch(FetchMode.SUBSELECT)` EAGER so GraphQL field
resolution works outside the transaction (`open-in-view: false`).

### Payment (billing)
`Payment` — `[reservation_id]`, amount, `currency_code`, provider, status,
`[provider_reference]`, `payment_date`, timestamps. UNIQUE `(provider,
provider_reference)` = capture idempotency (C17).
- `transactions: List<PaymentTransaction>` — `transaction_type`
  (`authorization|capture`), `status` (`pending|succeeded`),
  `provider_transaction_id`, amounts, timestamps.

### Invoice (billing)
`Invoice` — `[reservation_id]` UNIQUE (one invoice per booking), number,
`billing_name` (NOT NULL, from guest), billing address/country, currency,
money snapshots, `status`, `issued_at`.
- `items: List<InvoiceItem>` — type (room/extra/tax/fee/discount), desc,
  quantity, unit_price, total_price, sort_order.

### Review (reviews)
`Review` — `[hotel_id, guest_id, reservation_id]`, rating 1–5, title, body,
`moderation_status` (`pending|approved|rejected`), timestamps. Stays-gated:
only after a `checked_out` reservation by the same user (via
`ReservationRepository.existsByHotelIdAndBookedByUserIdAndStatus`).

### Reference data
`Country` (code char(2) PK + name), `Currency` (code char(3) PK, name,
decimal_places), `CancellationReason` (code + label).

## Column-typing notes (PostgreSQL vs Hibernate)

- `CHAR(2/3)` (bpchar) columns require `@JdbcTypeCode(SqlTypes.CHAR)` —
  `columnDefinition = "char(2)"` alone still maps to `varchar` and fails
  `validate`. Applied to country/currency codes everywhere they appear.
- All enum-like columns use `@Enumerated(EnumType.STRING)` with enum names
  matching the DB `CHECK` values verbatim (e.g. `PaymentStatus`,
  `ReservationStatus`, `CancellationPenaltyType`, `TaxFeeCalculationMethod`,
  `TaxFeeChargeType`, `PromotionDiscountType`, `ReviewModerationStatus`,
  `ExtraPricingModel`).
- `availability.version` maps with `@Version` for optimistic locking.
