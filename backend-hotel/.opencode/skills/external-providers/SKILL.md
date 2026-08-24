---
name: external-providers
description: External provider integration conventions for backend-hotel — Cloudinary, Resend, payment, SMS. Provider abstractions, thin clients, timeouts, retries, failure handling, webhook verification, idempotency. Use when implementing or reviewing external integrations.
---

# External Provider Conventions

Business logic must never couple to vendors. Services depend on abstractions; providers are thin adapters.

## Abstraction layer

```
MediaStorageProvider → CloudinaryProvider
EmailProvider        → ResendEmailProvider
PaymentProvider      → (future implementation)
SmsProvider          → (future implementation)
```

- Interfaces live in the domain/application layer (ports); implementations in `infrastructure/…/provider`
- No vendor SDK classes outside provider implementations — no `Cloudinary`, `Resend` imports in services or controllers
- Provider implementations are thin: translate calls, map errors to domain-level exceptions (`StorageException`, `EmailSendException`)

## Client behavior

- Timeouts configured for connect/read; bounded retry with backoff for retryable failures (network/5xx); no retry for 4xx
- Circuit breaking / graceful degradation for long outages (return domain errors; the API layer maps them consistently)
- Async where latency matters (e.g. email) — prefer the outbox → Kafka → consumer → provider flow for non-blocking sends

## Webhooks

- Verify provider signatures/tokens on every webhook call
- Idempotent handling: dedupe by event id or business key before applying side effects
- Acknowledge promptly; process asynchronously; tolerate out-of-order delivery
- Webhook endpoints documented in `docs/api/graphql.md` with the verification contract

## Secrets / testability

- Provider credentials only via environment variables
- Tests use fakes/stubs behind the interfaces — no live vendor calls in the test suite; integration against real vendors only as explicitly marked manual checks