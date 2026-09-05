CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'government',
  restricted BOOLEAN NOT NULL DEFAULT FALSE,
  alert_on_entry BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_exit BOOLEAN NOT NULL DEFAULT TRUE,
  speed_limit_kmh NUMERIC(6,2) CHECK (speed_limit_kmh IS NULL OR speed_limit_kmh > 0),
  center_lat NUMERIC(10,7) NOT NULL CHECK (center_lat BETWEEN -90 AND 90),
  center_lng NUMERIC(10,7) NOT NULL CHECK (center_lng BETWEEN -180 AND 180),
  radius_m INTEGER NOT NULL DEFAULT 500 CHECK (radius_m > 0 AND radius_m <= 100000),
  geometry geography(POLYGON,4326) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofences_scope ON geofences(agency_id, department_id, active);
CREATE INDEX IF NOT EXISTS idx_geofences_geometry ON geofences USING GIST(geometry);

CREATE TABLE IF NOT EXISTS geofence_events (
  id BIGSERIAL PRIMARY KEY,
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('entry','exit')),
  occurred_at TIMESTAMPTZ NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_vehicle_time ON geofence_events(vehicle_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_fence_time ON geofence_events(geofence_id, occurred_at DESC);
