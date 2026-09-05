CREATE TABLE IF NOT EXISTS financial_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fuel_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  maintenance_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_budget NUMERIC(14,2) GENERATED ALWAYS AS (fuel_budget + maintenance_budget) STORED,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  CHECK (fuel_budget >= 0 AND maintenance_budget >= 0)
);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_scope_period ON financial_budgets(agency_id, department_id, period_start, period_end);
