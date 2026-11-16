CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tenant_memberships (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_subject text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','admin','viewer')),
  PRIMARY KEY (tenant_id,auth_subject)
);
CREATE TABLE IF NOT EXISTS hotmart_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label text NOT NULL,
  client_id_encrypted text NOT NULL,
  client_secret_encrypted text NOT NULL,
  basic_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,label)
);
CREATE INDEX IF NOT EXISTS idx_membership_subject ON tenant_memberships(auth_subject);
CREATE INDEX IF NOT EXISTS idx_connections_tenant ON hotmart_connections(tenant_id);
-- Bootstrap tenants/memberships through a trusted administrative process only.
