-- Migration 005: scheduled_jobs table
-- Stores scheduled publish jobs for landing targets.
-- The worker polls this table every 30s for pending jobs whose run_at <= now().

CREATE TYPE scheduled_job_status AS ENUM (
  'pending',    -- awaiting activation
  'running',    -- currently executing publish flow
  'done',       -- publish completed successfully
  'failed',     -- publish failed (see failure_reason)
  'cancelled'   -- cancelled by user before activation
);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The draft that will be published when this job fires
  draft_id       UUID NOT NULL,
  -- Target kind and id denormalized for direct lookup without joining drafts
  target_kind    TEXT NOT NULL,
  target_id      TEXT NOT NULL,
  -- When the job should fire (UTC)
  run_at         TIMESTAMPTZ NOT NULL,
  -- Job lifecycle status
  status         scheduled_job_status NOT NULL DEFAULT 'pending',
  -- Optional human-readable label (e.g. "Summer Sale launch")
  label          TEXT,
  -- Who scheduled this job
  created_by     TEXT NOT NULL,
  -- Timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Populated on failure: short error message + optional snapshot ref for audit
  failure_reason TEXT,
  -- Snapshot id created on success (for audit traceability)
  snapshot_id    UUID
);

-- Index for the worker's polling query: pending jobs past their run_at time
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_pending
  ON scheduled_jobs (status, run_at)
  WHERE status = 'pending';

-- Index for looking up jobs by target (list/cancel UI)
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_target
  ON scheduled_jobs (target_kind, target_id, status);

-- Trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_scheduled_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scheduled_jobs_updated_at
  BEFORE UPDATE ON scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_jobs_updated_at();
