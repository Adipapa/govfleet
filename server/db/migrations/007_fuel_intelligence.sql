CREATE TABLE IF NOT EXISTS fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('refuel','adjustment')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  odometer_km NUMERIC(12,2),
  fuel_before_litres NUMERIC(10,2),
  fuel_after_litres NUMERIC(10,2),
  quantity_litres NUMERIC(10,2) NOT NULL CHECK (quantity_litres > 0),
  price_per_litre NUMERIC(10,2) CHECK (price_per_litre >= 0),
  total_cost NUMERIC(14,2) GENERATED ALWAYS AS (quantity_litres * COALESCE(price_per_litre, 0)) STORED,
  station_name TEXT,
  receipt_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_vehicle_time ON fuel_transactions(vehicle_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS fuel_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  telemetry_id BIGINT REFERENCES telemetry(id) ON DELETE SET NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('sudden_drop','abnormal_consumption','refuel_mismatch')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  litres_delta NUMERIC(10,2),
  expected_litres NUMERIC(10,2),
  severity alert_severity NOT NULL DEFAULT 'medium',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_fuel_anomalies_vehicle_time ON fuel_anomalies(vehicle_id, occurred_at DESC);
