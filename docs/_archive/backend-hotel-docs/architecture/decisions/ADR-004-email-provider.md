# ADR-004: Resend as the initial email provider

- Status: proposed (pending approval)
- Date: 2026-08-18

## Context

Guest-facing emails (booking confirmation, cancellation, password reset) are required from day one. Resend is the initial provider.

## Decision

1. `EmailProvider` port (`send(EmailMessage)`); `ResendEmailProvider` is the initial adapter in `infrastructure/provider`.
2. Emails flow through the `notifications` table: event → notification row (status `pending`) → worker → provider → `sent`/`failed` + provider reference; failures retried by the worker.
3. Delivery-status webhooks: signature verification + idempotent dedupe.
4. Secrets via `RESEND_API_KEY` env var only.

## Consequences

- Swap to another provider = new adapter only.
- Notification pipeline is tested with `FakeEmailProvider`; no live Resend calls in CI.