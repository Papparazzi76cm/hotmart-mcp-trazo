# Supabase OAuth 2.1 setup for Hotmart MCP

Dedicated project: `rlrolpkjhkatasbfcjxa`

## Administrative actions (not yet completed)
1. In Supabase Dashboard → Authentication → OAuth Server, enable OAuth 2.1 server.
2. Configure the **authorization UI/consent screen** as required by Supabase. Display requested access, provider, tenant and an explicit Approve/Deny choice. No automatic consent.
3. Register ChatGPT as OAuth client using its exact callback/redirect URLs from ChatGPT's connector configuration. Do not guess redirect URLs.
4. Keep dynamic client registration disabled during pilot unless the onboarding/consent/monitoring process is ready.
5. Set `AUTH_ALLOWED_CLIENT_IDS` to approved Supabase OAuth client ID(s). OAuth JWTs use `client_id`; do not assume Hotmart-specific scopes are issued.
6. Set `AUTH_ISSUER=https://rlrolpkjhkatasbfcjxa.supabase.co/auth/v1`, `AUTH_AUDIENCE=authenticated`. Verify actual JWT claims and issuer against the live Supabase OAuth configuration before publishing.
7. Use asymmetric Supabase JWT signing (RS256/ES256) to support JWKS verification. Rotate keys with overlap.
8. Deploy server privately first; check `/.well-known/oauth-protected-resource`, authenticate two test users and verify cross-tenant access is denied.

**Important:** The API's `/api/tenants` bootstrap creates a tenant with the authenticated subject as owner. Membership changes require an existing owner; creating Hotmart credentials requires owner/admin. Ensure API rate limiting and billing quotas before public registration.

**Separate authentication domains:**
- Supabase OAuth identifies the ChatGPT user and authorizes the MCP client.
- Hotmart API client credentials are associated with a tenant and are never sent to ChatGPT.

Docs:
- https://supabase.com/docs/guides/auth/oauth-server
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
