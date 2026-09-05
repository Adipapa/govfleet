-- Driver ownership is explicit so agency-scoped users cannot move drivers
-- between agencies merely because a historical assignment exists.
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_drivers_agency ON drivers(agency_id);

-- Prevent overlapping assignments for the same vehicle.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE vehicle_driver_assignments
  ADD CONSTRAINT vehicle_driver_assignment_no_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(starts_at, COALESCE(ends_at, 'infinity'::timestamptz), '[)') WITH &&
  );

CREATE INDEX IF NOT EXISTS idx_vda_driver_time
  ON vehicle_driver_assignments(driver_id, starts_at DESC, ends_at);

CREATE INDEX IF NOT EXISTS idx_vda_vehicle_time
  ON vehicle_driver_assignments(vehicle_id, starts_at DESC, ends_at);
