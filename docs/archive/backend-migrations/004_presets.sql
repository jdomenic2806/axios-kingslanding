-- Migration 004: presets table
-- Stores reusable promotional presets (name, styles, copy templates).
-- Versioned alongside the main draft history.

CREATE TABLE IF NOT EXISTS presets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  -- JSONB blob of visual style overrides (colors, template, badge, etc.)
  styles       JSONB NOT NULL DEFAULT '{}',
  -- JSONB blob of copy template fields (title, button text, badge text, etc.)
  copy_template JSONB NOT NULL DEFAULT '{}',
  -- Incremented on each update so clients can detect stale presets
  version      INT  NOT NULL DEFAULT 1,
  created_by   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique preset names prevent accidental duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_presets_name ON presets (name);

-- Trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW
  EXECUTE FUNCTION update_presets_updated_at();
