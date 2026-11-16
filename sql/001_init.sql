-- Hotmart MCP by Trazo Digital: dedicated private schema.
-- Run ONLY on the new, dedicated Supabase project.
-- Never execute on existing CRM or Trazo Digital databases.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS hotmart_mcp;
REVOKE ALL ON SCHEMA hotmart_mcp FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS hotmart_mcp.tenants(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hotmart_mcp.tenant_memberships(
 tenant_id uuid NOT NULL REFERENCES hotmart_mcp.tenants(id) ON DELETE CASCADE,
 auth_subject text NOT NULL,
 role text NOT NULL CHECK(role IN ('owner','admin','viewer')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,auth_subject)
);
CREATE TABLE IF NOT EXISTS hotmart_mcp.hotmart_connections(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES hotmart_mcp.tenants(id) ON DELETE CASCADE,
 label text NOT NULL,
 client_id_encrypted text NOT NULL,
 client_secret_encrypted text NOT NULL,
 basic_encrypted text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,label)
);
CREATE INDEX IF NOT EXISTS idx_hotmart_subject ON hotmart_mcp.tenant_memberships(auth_subject);
CREATE INDEX IF NOT EXISTS idx_hotmart_tenant ON hotmart_mcp.hotmart_connections(tenant_id);
ALTER TABLE hotmart_mcp.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotmart_mcp.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotmart_mcp.hotmart_connections ENABLE ROW LEVEL SECURITY;
-- The backend uses a dedicated trusted direct Postgres connection.
-- No browser/Data API access: no policies or grants to anon/authenticated.
REVOKE ALL ON ALL TABLES IN SCHEMA hotmart_mcp FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA hotmart_mcp REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
-- Provision users/tenants only from trusted admin workflows, never from self-supplied tenant IDs.
