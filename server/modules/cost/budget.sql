CREATE TABLE IF NOT EXISTS fleet_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fiscal_year integer NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  fuel_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (fuel_budget >= 0),
  maintenance_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (maintenance_budget >= 0),
  total_budget numeric(14,2) GENERATED ALWAYS AS (fuel_budget + maintenance_budget) STORED,
  agency_id uuid NULL,
  department_id uuid NULL,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_fleet_budgets_period ON fleet_budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_fleet_budgets_fiscal_year ON fleet_budgets(fiscal_year);
