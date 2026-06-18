-- Migration: 006_assets.sql
-- Table: assets
-- Stores metadata for uploaded images. The actual file lives in S3.
-- Key format: assets/{project}/{uuid}.{ext}

CREATE TABLE IF NOT EXISTS assets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT        NOT NULL UNIQUE,       -- S3 object key
  url          TEXT        NOT NULL,              -- Public CDN / presigned URL
  mime         TEXT        NOT NULL,              -- e.g. image/jpeg
  size         INTEGER     NOT NULL,              -- file size in bytes
  uploader_id  TEXT        NOT NULL,              -- user who uploaded
  alt_text     TEXT,                              -- optional accessibility text
  tags         TEXT[]      NOT NULL DEFAULT '{}', -- filterable tags
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by tag (GIN index on the array)
CREATE INDEX IF NOT EXISTS assets_tags_gin ON assets USING GIN (tags);

-- Chronological listing
CREATE INDEX IF NOT EXISTS assets_uploaded_at_idx ON assets (uploaded_at DESC);
