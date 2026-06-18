-- Migration: 001_drafts
-- Table: drafts
-- One mutable row per (target_kind, target_id) pair.
-- version is incremented on each update; used for optimistic locking.

CREATE TABLE IF NOT EXISTS drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind TEXT NOT NULL CHECK (target_kind IN ('card', 'section', 'device_block')),
  target_id   TEXT NOT NULL,
  content     JSONB NOT NULL DEFAULT '{}',
  version     INTEGER NOT NULL DEFAULT 1,
  author_id   TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one active draft per target
  CONSTRAINT drafts_target_unique UNIQUE (target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS drafts_target_idx ON drafts (target_kind, target_id);
CREATE INDEX IF NOT EXISTS drafts_author_idx ON drafts (author_id);
