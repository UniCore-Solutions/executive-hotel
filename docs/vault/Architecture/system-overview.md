# System Overview

**Verified against the running system on 2026-08-28.**

## What this system is

A direct-booking platform for a single hotel — the "Executive Hotel" in Lisbon. Guests search
availability, get a price quote, and book a room without going through an online travel agency.
Staff manage inventory, rates, and reservations through a separate back-office application.

"Direct booking" is the point of the product: the hotel keeps the commission an OTA would take,
which is why the booking funnel and the pricing engine are the parts of this codebase that
carry the most business risk.

## Three deployables

| Component | Directory | Stack | Port |
|---|---|---|---|
| Backend API | `backend-hotel/` | Spring Boot, Java 21, Maven | **8180** |
| Guest site | `frontend-hotel/` | Next.js App Router, TypeScript, Tailwind v4 | 3000 |
| Back-office | `backoffice-hotel/` | Next.js App Router, TypeScript | **3101** |

Supporting infrastructure: PostgreSQL 16 (host port **5433**), Kafka.

The ports are deliberately non-default. Assuming 8080 or 5432 will silently fail against a
different service. See [[Backend/local-development]].

## Single-hotel, multi-hotel-shaped

The data model is multi-hotel: rooms, rates, and reservations all hang off a `hotel_id`, and
the GraphQL API exposes a `hotels` collection. The deployment is single-hotel. Migration
`V26__canonical_single_hotel.sql` and `V30__canonical_hotel_identity.sql` collapsed the data
onto one canonical hotel with a fixed identifier:

```
$ curl -s -X POST localhost:8180/graphql -H 'content-type: application/json' \
    -d '{"query":"{ hotels(input:{page:{page:0,size:5}}){ items{ id name city status } } }"}'
{"data":{"hotels":{"items":[{"id":"00000000-0000-0000-0000-000000000001",
  "name":"Executive Hotel","city":"Lisbon","status":"active"}]}}}
```

**Why it matters:** the multi-hotel shape is retained, so authorization code must still scope
by hotel (see [[Security/authorization-model]]) even though there is only one hotel today.
Code that hardcodes the canonical UUID will break if a second property is ever added; code
that ignores `hotel_id` entirely is an authorization bug waiting to happen.

## Currency

All money is **MAD** (Moroccan dirham). The backend performs **no currency conversion** — the
`quote` operation echoes back whatever `currencyCode` the client sends, attached to
unconverted MAD figures. Any other currency shown to a guest is display-only formatting done
client-side.

**This is a live trap.** Sending `currencyCode: "EUR"` returns MAD amounts labelled EUR.
Send `MAD` and convert for display only. Migration `V21__convert_eur_to_mad.sql` shows the
system previously ran in EUR.

## Related notes

- [[Architecture/layering-and-boundaries]] — how the backend is structured internally
- [[APIs/graphql-rest-split]] — the read/write API rule
- [[Database/schema-and-migrations]] — the schema and how it changes
- [[Security/authorization-model]] — why every admin resolver guards itself
