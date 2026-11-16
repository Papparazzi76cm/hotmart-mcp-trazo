# Hotmart MCP backend on Vercel

Separate from `hotmart-mcp-consent` Vercel app and all existing CRM deployments.

## Endpoints
- `GET /health`: `status: ok` means HTTP process is responding; `ready: false` means the service is **not** configured for actual authenticated traffic.
- `GET /.well-known/oauth-protected-resource`: OAuth resource discovery (Supabase Auth authorization server).
- `POST /mcp`: streamable HTTP MCP endpoint. Returns 503 until required settings are installed and verified.
- `/api/connections` and `/api/tenants`: protected management APIs.

## Before serving real clients
1. Provision only the dedicated Supabase project's Postgres **connection string** in encrypted Vercel environment variable `DATABASE_URL` (never in GitHub or a response).
2. Generate an independent random 32-byte AES key and store its **base64** value as encrypted env `ENCRYPTION_KEY_BASE64`; back it up privately, rotation requires re-encryption.
3. Set `AUTH_ISSUER=https://rlrolpkjhkatasbfcjxa.supabase.co/auth/v1`, `AUTH_AUDIENCE=authenticated` (confirm the actual token claims), and `AUTH_ALLOWED_CLIENT_IDS` to the approved OAuth client IDs (never wildcard).
4. Set `PUBLIC_URL` to the real assigned stable HTTPS Vercel domain.
5. Confirm Supabase Auth uses asymmetric JWT signing, HTTPS JWKS URI, and client ID issued during OAuth registration.
6. Confirm Vercel Deployment Protection allows authorized ChatGPT users to reach production while protecting preview environments.
7. Verify `/health`, OAuth resource discovery, unauthorized request behavior (401 **after** configured), and two-user tenant isolation.

**Current status:** Deployment can be made accessible to test HTTP routing **without any production credentials**; it will intentionally respond 503 to MCP/management requests until secure configuration exists.
