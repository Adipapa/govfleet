-- Prevent overlapping active/historical assignments for the same vehicle.
-- A vehicle may have only one driver at any point in time.
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
