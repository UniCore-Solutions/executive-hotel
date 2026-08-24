-- V17: OUTBOX STALE-CLAIM RECOVERY
-- event_outbox gains updated_at so a relay that crashed between claiming a
-- batch and publishing it can be detected and recovered (status 'publishing'
-- older than the recovery window). claimBatch stamps updated_at = now().

ALTER TABLE event_outbox
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();