CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(expires_at) WHERE revoked_at IS NULL;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS result TEXT NOT NULL DEFAULT 'success';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs(user_id, timestamp DESC);

INSERT INTO roles(name, description) VALUES
  ('super_admin', 'National platform administrator'),
  ('agency_admin', 'Agency-level administrator'),
  ('fleet_manager', 'Fleet operations manager'),
  ('dispatcher', 'Fleet dispatch and monitoring operator'),
  ('security_police', 'Authorized security or police monitoring user'),
  ('auditor', 'Read-only audit and compliance user'),
  ('driver', 'Assigned government driver')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(name, description) VALUES
  ('fleet.read', 'View fleet and vehicle data'),
  ('fleet.write', 'Create and update fleet records'),
  ('drivers.read', 'View driver records'),
  ('drivers.write', 'Create and update driver records'),
  ('devices.read', 'View GPS devices and status'),
  ('devices.write', 'Register and manage GPS devices'),
  ('telemetry.read', 'View historical and live telemetry'),
  ('alerts.read', 'View alerts'),
  ('alerts.manage', 'Acknowledge and dispatch alerts'),
  ('fuel.read', 'View fuel telemetry and events'),
  ('maintenance.read', 'View maintenance records'),
  ('maintenance.write', 'Create and update maintenance records'),
  ('reports.read', 'Generate and view reports'),
  ('geofences.read', 'View geofences'),
  ('geofences.write', 'Create and update geofences'),
  ('users.read', 'View platform users'),
  ('users.write', 'Create and manage platform users'),
  ('audit.read', 'View immutable audit records'),
  ('system.admin', 'Manage platform configuration and privileged operations')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'fleet.read','fleet.write','drivers.read','drivers.write','devices.read','devices.write',
  'telemetry.read','alerts.read','alerts.manage','fuel.read','maintenance.read','maintenance.write',
  'reports.read','geofences.read','geofences.write','users.read'
) WHERE r.name = 'agency_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'fleet.read','fleet.write','drivers.read','drivers.write','devices.read','telemetry.read',
  'alerts.read','alerts.manage','fuel.read','maintenance.read','maintenance.write','reports.read',
  'geofences.read','geofences.write'
) WHERE r.name = 'fleet_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'fleet.read','drivers.read','devices.read','telemetry.read','alerts.read','alerts.manage',
  'fuel.read','geofences.read','reports.read'
) WHERE r.name = 'dispatcher'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'fleet.read','devices.read','telemetry.read','alerts.read','alerts.manage','geofences.read','reports.read'
) WHERE r.name = 'security_police'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'fleet.read','drivers.read','devices.read','telemetry.read','alerts.read','fuel.read','maintenance.read',
  'reports.read','geofences.read','audit.read'
) WHERE r.name = 'auditor'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'fleet.read','telemetry.read','alerts.read'
) WHERE r.name = 'driver'
ON CONFLICT DO NOTHING;
