ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS interval_km NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_due ON maintenance_records(vehicle_id, due_odometer_km, due_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status, due_at);
