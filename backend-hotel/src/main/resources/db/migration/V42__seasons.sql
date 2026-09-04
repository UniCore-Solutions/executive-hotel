-- Seasons: a hotel-scoped, named date range (task-driven, see
-- docs/ADMIN_REBUILD_PROGRESS.md Epic E-REDESIGN workstream 7). Calendar/
-- definition only this pass — deliberately NOT wired into rate_plan_prices
-- or any pricing logic (a season and a rate plan's date-ranged price are
-- different, already-working concepts; see workstream 7's own decision
-- note). Overlap prevention mirrors rate_plan_prices' proven EXCLUDE
-- constraint (C2, V4) — btree_gist is already enabled platform-wide.
CREATE TABLE seasons (
    id            UUID PRIMARY KEY,
    hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    season_type   VARCHAR(20) NOT NULL DEFAULT 'custom',
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    color         VARCHAR(20),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_seasons_type CHECK (season_type IN ('high','low','shoulder','custom')),
    CONSTRAINT chk_seasons_range CHECK (end_date >= start_date),
    -- Only active seasons compete for a date range — a deactivated season
    -- doesn't block creating a new one over the same dates.
    CONSTRAINT ex_seasons_no_overlap EXCLUDE USING gist (
        hotel_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    ) WHERE (is_active)
);

CREATE INDEX idx_seasons_hotel ON seasons (hotel_id);
