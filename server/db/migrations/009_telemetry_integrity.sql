ALTER TABLE telemetry
  ADD COLUMN IF NOT EXISTS deduplication_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_deduplication_key
  ON telemetry(deduplication_key)
  WHERE deduplication_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_vehicle
  ON telemetry(vehicle_id, recorded_at DESC);
