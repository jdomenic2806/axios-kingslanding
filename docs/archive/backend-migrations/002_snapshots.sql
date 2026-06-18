-- Migration: 002_snapshots
-- Table: snapshots
-- Immutable records created on each publish. No UPDATE or DELETE allowed.
-- Enforced at application layer; row-level security can add a DB-level guard.

CREATE TABLE IF NOT EXISTS snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind        TEXT NOT NULL CHECK (target_kind IN ('card', 'section', 'device_block')),
  target_id          TEXT NOT NULL,
  content            JSONB NOT NULL,
  published_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by       TEXT NOT NULL,
  diff_summary       TEXT NOT NULL DEFAULT '',
  parent_snapshot_id UUID REFERENCES snapshots(id) ON DELETE SET NULL
);

-- Index for retrieving history per target ordered by time
CREATE INDEX IF NOT EXISTS snapshots_target_time_idx ON snapshots (target_kind, target_id, published_at DESC);

-- Track the currently active (latest published) snapshot per target
CREATE TABLE IF NOT EXISTS active_pointers (
  target_kind  TEXT NOT NULL,
  target_id    TEXT NOT NULL,
  snapshot_id  UUID NOT NULL REFERENCES snapshots(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (target_kind, target_id)
);
