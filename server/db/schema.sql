CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_status AS ENUM ('active','disabled','locked');
CREATE TYPE vehicle_status AS ENUM ('moving','stopped','idling','parked','offline','no_gps','emergency','unauthorized');
CREATE TYPE device_status AS ENUM ('active','inactive','offline','suspended');
CREATE TYPE fuel_event_type AS ENUM ('refuel','theft','consumption','adjustment');
CREATE TYPE alert_severity AS ENUM ('low','medium','high','critical');

CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, code)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  agency_id UUID REFERENCES agencies(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, role_id)
);

CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  licence_number TEXT,
  licence_expiry DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
  registration_number TEXT NOT NULL UNIQUE,
  asset_number TEXT UNIQUE,
  make TEXT,
  model TEXT,
  model_year INT,
  vehicle_type TEXT,
  fuel_type TEXT,
  tank_capacity_litres NUMERIC(10,2),
  odometer_km NUMERIC(14,2) NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'offline',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX idx_vehicle_driver_active ON vehicle_driver_assignments(vehicle_id, ends_at);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_identifier TEXT NOT NULL UNIQUE,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  protocol TEXT,
  firmware_version TEXT,
  status device_status NOT NULL DEFAULT 'inactive',
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_device_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE sim_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  iccid TEXT UNIQUE,
  msisdn TEXT,
  carrier TEXT,
  apn TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fuel_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  serial_number TEXT UNIQUE,
  sensor_type TEXT,
  calibration_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE telemetry (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  position GEOGRAPHY(POINT,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude),4326)::geography) STORED,
  speed_kmh NUMERIC(8,2),
  heading NUMERIC(6,2),
  ignition BOOLEAN,
  odometer_km NUMERIC(14,2),
  fuel_litres NUMERIC(10,2),
  battery_voltage NUMERIC(6,2),
  satellites SMALLINT,
  gsm_signal SMALLINT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_telemetry_vehicle_time ON telemetry(vehicle_id, recorded_at DESC);
CREATE INDEX idx_telemetry_device_time ON telemetry(device_id, recorded_at DESC);
CREATE INDEX idx_telemetry_position ON telemetry USING GIST(position);

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  end_lat DOUBLE PRECISION,
  end_lng DOUBLE PRECISION,
  distance_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  idle_seconds INTEGER NOT NULL DEFAULT 0,
  max_speed_kmh NUMERIC(8,2),
  average_speed_kmh NUMERIC(8,2),
  fuel_consumed_litres NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  geometry GEOGRAPHY(GEOMETRY,4326) NOT NULL,
  entry_alert BOOLEAN NOT NULL DEFAULT TRUE,
  exit_alert BOOLEAN NOT NULL DEFAULT TRUE,
  restricted BOOLEAN NOT NULL DEFAULT FALSE,
  speed_limit_kmh NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_geofences_geometry ON geofences USING GIST(geometry);

CREATE TABLE geofence_events (
  id BIGSERIAL PRIMARY KEY,
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  severity alert_severity NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_alerts_time ON alerts(occurred_at DESC);
CREATE INDEX idx_alerts_vehicle ON alerts(vehicle_id, occurred_at DESC);

CREATE TABLE fuel_readings (
  id BIGSERIAL PRIMARY KEY,
  fuel_sensor_id UUID NOT NULL REFERENCES fuel_sensors(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL,
  litres NUMERIC(10,2) NOT NULL,
  percentage NUMERIC(6,2),
  raw_value NUMERIC(14,4),
  quality_score NUMERIC(5,2),
  raw_payload JSONB
);
CREATE INDEX idx_fuel_readings_vehicle_time ON fuel_readings(vehicle_id, recorded_at DESC);

CREATE TABLE fuel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  fuel_sensor_id UUID REFERENCES fuel_sensors(id) ON DELETE SET NULL,
  event_type fuel_event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  before_litres NUMERIC(10,2),
  after_litres NUMERIC(10,2),
  delta_litres NUMERIC(10,2),
  unit_price NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at DATE,
  due_odometer_km NUMERIC(14,2),
  performed_at DATE,
  odometer_km NUMERIC(14,2),
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  service_provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  result TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_time ON audit_logs(occurred_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, occurred_at DESC);
