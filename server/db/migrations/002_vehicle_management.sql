ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vin TEXT,
  ADD COLUMN IF NOT EXISTS engine_number TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS body_type TEXT,
  ADD COLUMN IF NOT EXISTS transmission TEXT,
  ADD COLUMN IF NOT EXISTS seats SMALLINT,
  ADD COLUMN IF NOT EXISTS acquisition_date DATE,
  ADD COLUMN IF NOT EXISTS acquisition_method TEXT,
  ADD COLUMN IF NOT EXISTS purchase_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS base_location TEXT,
  ADD COLUMN IF NOT EXISTS cost_center TEXT,
  ADD COLUMN IF NOT EXISTS asset_category TEXT,
  ADD COLUMN IF NOT EXISTS registration_expiry DATE,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS roadworthiness_expiry DATE,
  ADD COLUMN IF NOT EXISTS permit_expiry DATE,
  ADD COLUMN IF NOT EXISTS next_service_date DATE,
  ADD COLUMN IF NOT EXISTS next_service_odometer_km NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS last_service_date DATE,
  ADD COLUMN IF NOT EXISTS last_service_odometer_km NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS disposal_date DATE,
  ADD COLUMN IF NOT EXISTS disposal_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_vin_unique
  ON vehicles(vin) WHERE vin IS NOT NULL AND vin <> '';

CREATE INDEX IF NOT EXISTS idx_vehicles_agency_department ON vehicles(agency_id, department_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status_active ON vehicles(status, active);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_expiry ON vehicles(registration_expiry);
CREATE INDEX IF NOT EXISTS idx_vehicles_insurance_expiry ON vehicles(insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_vehicles_service_due ON vehicles(next_service_date, next_service_odometer_km);

CREATE INDEX IF NOT EXISTS idx_vehicle_driver_current
  ON vehicle_driver_assignments(vehicle_id, starts_at DESC)
  WHERE ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_device_current
  ON vehicle_device_assignments(vehicle_id, starts_at DESC)
  WHERE ends_at IS NULL;
