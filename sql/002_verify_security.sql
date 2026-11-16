-- Read-only post-migration validation for hotmart-mcp-trazo.
-- Run only against dedicated Supabase project rlrolpkjhkatasbfcjxa.
-- Expected: 3 rows, all rls_enabled=true and unauthorized role grants=false.
SELECT
  t.table_name,
  c.relrowsecurity AS rls_enabled,
  has_schema_privilege('anon','hotmart_mcp','USAGE') AS anon_schema_usage,
  has_schema_privilege('authenticated','hotmart_mcp','USAGE') AS authenticated_schema_usage,
  has_table_privilege('anon',format('%I.%I',t.table_schema,t.table_name),'SELECT') AS anon_can_select,
  has_table_privilege('authenticated',format('%I.%I',t.table_schema,t.table_name),'SELECT') AS authenticated_can_select
FROM information_schema.tables t
JOIN pg_namespace n ON n.nspname=t.table_schema
JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=t.table_name
WHERE t.table_schema='hotmart_mcp' AND t.table_type='BASE TABLE'
ORDER BY t.table_name;

-- Expect 0 rows: schema is not listed in configured PostgREST exposed schemas.
-- Note: independently verify the Data API settings in the Supabase dashboard.

-- Expect all counts zero before creating any tenants or storing real credentials.
SELECT 'tenants' AS item, count(*) AS rows FROM hotmart_mcp.tenants
UNION ALL SELECT 'memberships',count(*) FROM hotmart_mcp.tenant_memberships
UNION ALL SELECT 'connections',count(*) FROM hotmart_mcp.hotmart_connections;
