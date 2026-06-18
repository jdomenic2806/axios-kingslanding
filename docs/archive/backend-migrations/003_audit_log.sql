-- Migration: 003_audit_log
-- Table: audit_log
-- Append-only. No UPDATE or DELETE ever issued on this table.
-- Revoke UPDATE/DELETE privileges at the DB role level in production.

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('publish', 'rollback', 'schedule', 'cancel', 'draft_save')),
  target_kind TEXT NOT NULL CHECK (target_kind IN ('card', 'section', 'device_block')),
  target_id   TEXT NOT NULL,
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB NOT NULL DEFAULT '{}'
);

-- Composite index for querying by target (primary access pattern)
CREATE INDEX IF NOT EXISTS audit_target_time_idx ON audit_log (target_kind, target_id, occurred_at DESC);
-- Index for querying by actor
CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_log (actor, occurred_at DESC);
