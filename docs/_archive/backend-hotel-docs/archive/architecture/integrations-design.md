# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# External Integrations

> STATUS: DRAFT — proposed, pending human approval. Nothing is implemented.

## 1. Principle

Business logic never couples to vendors. Domain/application code depends on **ports** (interfaces); vendor SDKs live only in `infrastructure/provider` adapters.

## 2. Ports and initial implementations

| Port (interface) | Location | Initial implementation | Future |
|---|---|---|---|
| `EmailProvider` | `integration` module | `ResendEmailProvider` | — |
| `MediaStorageProvider` | `integration` module | `CloudinaryProvider` | — |
| `PaymentProvider` | `integration` module | — (not implemented) | payment provider TBD |
| `SmsProvider` | `integration` module | — (not implemented) | SMS provider TBD |

Ports are small and domain-shaped:

```java
public interface EmailProvider {
  EmailSendResult send(EmailMessage message); // throws EmailSendException
}
public interface MediaStorageProvider {
  UploadedMedia upload(byte[] content, String contentType, String folder);
  void delete(String storageKey);
}
```

## 3. Adapter rules (`infrastructure/provider`)

- Thin: translate domain input → SDK call → domain result; map vendor errors to domain exceptions (`EmailSendException`, `StorageException`, `PaymentException`).
- Timeouts configured on every client (connect + read); retries with bounded backoff for retryable failures (network, 5xx) — **no retry for 4xx**.
- No vendor classes in signatures of the port; no vendor imports outside the adapter.
- Configuration via `@ConfigurationProperties` bound from env vars (`RESEND_API_KEY`, `CLOUDINARY_URL`, …) — secrets never in files.

## 4. Media (Cloudinary)

- Uploads go through `MediaStorageProvider`; the DB `media` row stores `url` + `storage_key` (Cloudinary public_id) — `storage_key` is the deletion handle.
- Deletion of media = DB row + async storage delete (fire-and-forget with retry; orphans tolerated and reconciled).
- `storage_key` is also the idempotency handle: uploading the same content twice must not duplicate media rows (app-level dedupe by hash/key).

## 5. Email (Resend)

- All outbound email via `EmailProvider` behind the `notifications` table pipeline: event → notification row → worker calls provider → status `sent`/`failed` + provider reference stored.
- Webhook (delivery status) endpoints: signature verification, idempotent by provider event id.
- Templates: provider-side templates keyed by template id in notification `type`; subject/body snapshot stored for audit.

## 6. Webhooks (general)

- Every webhook endpoint: verify signature/token (shared secret from env, constant-time compare) → ack promptly → process asynchronously → dedupe by provider event id (unique constraint + `ON CONFLICT DO NOTHING`).
- Out-of-order delivery tolerated (idempotent side effects; status transitions validated).

## 7. Failure and degradation

- Provider outages: notifications/payments fail into `failed`/retry states — the API still returns domain results; retries are the worker's job.
- Payment capture failures surface as `payment_status = failed` on the reservation with a documented retry path (no silent total recomputation).

## 8. Testing

- Ports are faked in the test suite (`FakeEmailProvider`, `FakeMediaStorageProvider`) — see testing.md §5.
- Adapter unit tests use fixtures (captured vendor responses); signature verification is unit-tested.
- No live vendor calls in CI.

