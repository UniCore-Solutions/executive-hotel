# GraphQL API

Single endpoint `POST /graphql` (GraphiQL in dev). Schema:
`src/main/resources/graphql/schema.graphqls`.

## Conventions

- **Naming**: camelCase, `Input` suffix for input objects, `Page` types for
  paginated results.
- **Scalars**: `LocalDate` (ISO `yyyy-MM-dd`) and `DateTime` (ISO-8601).
  `Hotel.checkInTime` / `checkOutTime` are `String` (`HH:mm`).
- **Errors**: GraphQL errors carry a stable machine-readable code:

| code | classification | meaning |
|------|----------------|---------|
| `UNAUTHORIZED` | `UNAUTHORIZED` | no/invalid token on a protected operation |
| `FORBIDDEN` | `FORBIDDEN` | authenticated but no access (not owner / not staff of the hotel) |
| `NOT_FOUND` | `NOT_FOUND` | hotel/reservation/payment missing |
| `CONFLICT` | `BAD_REQUEST` | no availability, already cancelled, in-house stay, etc. |
| `VALIDATION` | `BAD_REQUEST` | invalid input, bad promo, overpayment |
| (none) | `INTERNAL_ERROR` | unexpected server error (generic message) |

Errors are mapped by `GraphqlExceptionAdvice`; HTTP status stays 200
(standard GraphQL). Queries deeper than 15 levels are rejected up front
(depth instrumentation).

## Queries

| query | notes |
|-------|-------|
| `hotels(input: HotelSearchInput): HotelSearchResult!` | free-text on name/city/brand, pagination; sort `NAME_ASC` / `PRICE_ASC` / `RATING_DESC` (bounded in-memory, see architecture doc) |
| `hotel(id: ID!): Hotel` | detail with `media`, `amenities`, `roomTypes`, `fromPricePerNight` (batched) |
| `hotelDetails(id: ID!): HotelDetails` | hotel + experiences + restaurants + FAQs + approved reviews + aggregates |
| `roomTypes(hotelId)`, `experiences(hotelId)`, `restaurants(hotelId)`, `extras(hotelId)`, `faqs(hotelId)` | catalog lookups |
| `offers(hotelId): [Promotion!]!` | active promotions |
| `reviews(hotelId, page): ReviewPage` | approved reviews |
| `availability(input): [RoomAvailability!]!` | per room type `available/few/soldout`; **`rooms` is honored** — a request for N rooms is `available` only if every night has ≥ N rooms free |
| `rates(input): [RoomRateOption!]!` | nightly rate per room-type+rate-plan |
| `quote(input): Quote!` | server pricing: per-line nights+rate, extras, charges, discount, `valid`, `promoMessage`; totals identity `subtotal + discount + tax + fee = total`, `originalTotal` pre-promo |
| `me: Me!` | current account (roles, hotelIds); requires token |
| `myReservations: [Reservation!]!` | current account's bookings |
| `reservation(input: ReservationLookupInput!): Reservation` | accountless lookup by reference+email |
| `adminReservations(hotelId, status, page): ReservationPage!` | staff only, hotel-scoped; page/size clamped (0..100) |
| `adminHotel(hotelId): AdminHotel` | staff only: hotel + roomTypes + ratePlans + 30-day availability window |

## Mutations

| mutation | notes |
|----------|-------|
| `register(input): AuthPayload!` | creates account + guest profile, returns token + `me`; duplicate email → generic `VALIDATION` ("registration failed") — no account enumeration |
| `login(input): AuthPayload!` | token + `me`; generic "invalid email or password" |
| `createReservation(input): CreateReservationInput!` | server-priced; `created` flag for idempotency; outbox `booking.confirmed`; anonymous OK |
| `cancelReservation(input): Reservation!` | penalty math + inventory release + outbox `booking.cancelled`; account-backed bookings can only be cancelled by their **owner** (anonymous/other-user → `FORBIDDEN`); accountless bookings keep reference+email |
| `createPayment(input): Payment!` | **requires an authenticated actor**: the booking owner or staff of the hotel (or `super_admin`); anonymous → `UNAUTHORIZED`; validates amount > 0, currency, reservation state |
| `capturePayment(input): Payment!` | same authz as `createPayment`; idempotent capture (C17) |
| `issueInvoice(input: ReservationLookupInput!): Invoice!` | generates the reservation invoice on demand (replaces the dead `invoice(id:)` query); idempotent — one invoice per reservation |
| `createReview(input): CreateReviewInput!` | reviewer must own a **checked-out** reservation at the same hotel (guests without accounts review by reservation guest email); rating 1–5 |
| `updateAvailability(hotelId, rows): [AvailabilityRow!]!` | **deprecated** — per-date rows; `totalInventory` now lives on the room type |
| `updateAvailabilityRange(hotelId, input): [AvailabilityRow!]!` | **sparse inventory**: range input (`fromDate..toDate`); null fields unchanged; `totalInventory` sets the room type capacity; rows with nothing sold/blocked are removed |

## Auth

Stateless Bearer JWT (`Authorization: Bearer <token>`). No token → fields
work anonymously where allowed; protected ones return `UNAUTHORIZED`.
Staff scope: JWT claims carry `roles` and `hotels`; `super_admin` or hotel
membership required for `admin*` (else `FORBIDDEN`). Tokens carry
`type=access`; parse rejects anything else.

## Example (accountless booking round trip)

```graphql
query Quote($input: QuoteInput!) {
  quote(input: $input) { totalAmount valid }
}

mutation Book($input: CreateReservationInput!) {
  createReservation(input: $input) {
    created
    reservation { reference status totalAmount }
  }
}

query Lookup($input: ReservationLookupInput!) {
  reservation(input: $input) { reference status checkInDate totalAmount }
}

mutation Pay($input: CreatePaymentInput!) {
  createPayment(input: $input) { id status }
}

mutation Bill($input: ReservationLookupInput!) {
  issueInvoice(input: $input) { invoiceNumber totalAmount }
}
```

## Verification

End-to-end HTTP tests in `GraphqlApiIntegrationTest` (real server, real
PostgreSQL/Kafka, real security): anonymous discovery, quote + booking +
lookup + idempotent duplicate, `UNAUTHORIZED` mapping, register/login + `me`,
admin hotel-scope, staff-of-another-hotel `FORBIDDEN`, anonymous payment
rejected, payment owner-or-staff, anonymous cancel of account-backed booking
rejected, duplicate-email register, availability `rooms` semantics, rating
sort, `checkInTime` strings, idempotent `issueInvoice`. See
[`../development/testing.md`](../development/testing.md).