CREATE TABLE IF NOT EXISTS telemetry_events (
  id BIGSERIAL PRIMARY KEY,
  telemetry_id BIGINT NOT NULL REFERENCES telemetry(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'low',
  occurred_at TIMESTAMPTZ NOT NULL,
  value NUMERIC(12,4),
  threshold NUMERIC(12,4),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_vehicle_time ON telemetry_events(vehicle_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS trip_points (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  telemetry_id BIGINT NOT NULL UNIQUE REFERENCES telemetry(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_kmh NUMERIC(8,2),
  ignition BOOLEAN,
  fuel_litres NUMERIC(10,2)
);
CREATE INDEX IF NOT EXISTS idx_trip_points_trip_time ON trip_points(trip_id, recorded_at);

CREATE TABLE IF NOT EXISTS driver_events (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  telemetry_id BIGINT REFERENCES telemetry(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'medium',
  occurred_at TIMESTAMPTZ NOT NULL,
  value NUMERIC(12,4),
  threshold NUMERIC(12,4),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_driver_events_driver_time ON driver_events(driver_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_events_vehicle_time ON driver_events(vehicle_id, occurred_at DESC);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS daily_km NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS idle_seconds_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS after_hours_seconds_today INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trips_open ON trips(vehicle_id) WHERE ended_at IS NULL;
