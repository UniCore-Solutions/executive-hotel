-- V36: trace an outbound notification back to the Kafka/outbox event that
-- triggered it. Nullable — a future manually-triggered notification (if any)
-- has no event to point at. Uniqueness/idempotency itself is enforced by the
-- pre-existing event_consumption table (consumer_group, event_id), keyed per
-- email type (see EmailEventConsumer) — this column is for observability and
-- support lookups only ("which event caused this email"), not a constraint.

ALTER TABLE notifications ADD COLUMN event_id UUID;
ALTER TABLE notifications ADD COLUMN correlation_id VARCHAR(100);

CREATE INDEX idx_notifications_event_id ON notifications (event_id) WHERE event_id IS NOT NULL;
