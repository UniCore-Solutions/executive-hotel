-- ====================================================================
-- Outbox relay claim-state fix (audit): the relay atomically claims a
-- pending batch by moving rows to 'publishing' before publishing to
-- Kafka (single relay instance). V8's CHECK only allowed
-- pending/published/failed, so every claim attempt violated the
-- constraint and NO event was ever published. Align the constraint
-- with the documented state machine (ADR-002).
-- ====================================================================

ALTER TABLE event_outbox DROP CONSTRAINT chk_event_outbox_status;

ALTER TABLE event_outbox
    ADD CONSTRAINT chk_event_outbox_status
        CHECK (status IN ('pending', 'publishing', 'published', 'failed'));