# Business Flows

End-to-end traces through the system: what happens, in what order, across which components.

**Status: not yet written.** This folder is intentionally empty of traces rather than filled
with unverified ones copied from archived documentation.

## Flows that need documenting

Priority order, highest business risk first:

1. **Booking** — search → quote → reserve → pay → confirm. The revenue path, and the one with
   a defect history: migrations `V15`/`V16` fixed reservation totals involving extras twice,
   and `V23` added payment idempotency constraints. See
   [[Database/schema-and-migrations]].
2. **Quote / pricing** — carries the live currency trap recorded as KI-1 in
   [[Known-Issues/README]].
3. **Authentication** — guest and staff, including provisioned guest accounts (`V27`).
4. **Availability search** — note that availability is stored *sparsely* (`V12`), so the
   read path is not a simple row-per-night lookup.
5. **Outbox / eventing** — `event_outbox` is written and has publishing status
   (`V9`, `V17`). **Nothing in this repository consumes these events**
   ([[Backend/local-development]]), so document where the flow actually stops.

## How to write one

Trace the real call path, do not infer it from names:

```
frontend service → src/graphql/*.graphql → schema .graphqls → controller → service/impl → repository
```

Record where the flow **stops being real** — a stub, a hardcoded value, an unconsumed event.
That is the most valuable part of the trace and the part archived docs most often got wrong.

## Related notes

- [[Architecture/system-overview]]
- [[APIs/graphql-rest-split]]
- [[Known-Issues/README]]
