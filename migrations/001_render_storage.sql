CREATE TABLE IF NOT EXISTS shailus_blob_store (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  etag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
