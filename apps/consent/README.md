# Trazo Digital — OAuth consent UI

Independent Vite + React SPA served over HTTPS. This is the **authorization UI** required by Supabase OAuth 2.1 and **not** the MCP server. It uses only the dedicated Supabase project's publishable client key. No Hotmart credentials are used in browser.

## Setup
1. `npm install`, `npm run check`, `npm run build`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel.
3. Deploy from the GitHub repo with Root Directory `apps/consent` and Vite framework.
4. Open `https://your-domain/oauth/consent` (without authorization_id it intentionally displays a safe error).
5. When tested, configure Supabase **Authentication → URL Configuration → Site URL** to this app's stable HTTPS origin, and **OAuth Server → Authorization Path** to `/oauth/consent`.
6. Add the exact app URL `https://your-domain/auth/callback` to Supabase's allow-list of authentication redirect URLs for magic links.
7. Create the OAuth client for ChatGPT using its **exact** callback URI; do not confuse that callback with our app's `/auth/callback` used for magic link sign-in.

## Security
- User must authenticate; `getUser` verifies session with Supabase.
- `getAuthorizationDetails` retrieves actual requesting client and scopes, no hard-coded trust in query strings.
- Explicit Approve or Deny; no background auto-consent.
- Full client tokens and secret API keys never reach the browser.
- OAuth server handles issuing codes; our app redirects solely to the URL it returns.
- Preview builds are **not** authorization production endpoints until manually verified.
- Enable email delivery/SMTP appropriate for public scale and configure email rate limits and bot protection.
- The MCP API backend remains a separate deployment needing OAuth audience/issuer validation and tenant membership checks.


## Confirmed infrastructure (2026-11-16)
- Vercel project `hotmart-mcp-consent` (`prj_tI28VA4Fqps9hGYHMEHMDEWXui6S`) is deployed and its initial Git SHA is `ed385e7957597bf44ad24f5d6a96e80583bb840c`.
- The deployment API reports `READY`; the site has **not** been confirmed from an unauthenticated browser.
- Vercel SSO protection was changed from `all_except_custom_domains` to `preview`, allowing the production authorization page to be visited without Vercel-team login while keeping preview deployments protected.
- **No** Supabase Auth Site URL or redirect URL settings were changed via API. Do not claim OAuth end-to-end is working until confirmed.

## Exact values for manual Supabase dashboard configuration
Project: `rlrolpkjhkatasbfcjxa` (the dedicated Hotmart Supabase project only).
- Authentication → URL Configuration → **Site URL**: `https://hotmart-mcp-consent.vercel.app`
- Additional redirect URL: `https://hotmart-mcp-consent.vercel.app/auth/callback`
- Authentication → OAuth Server → Enable: on (already enabled by administrator)
- Authorization Path: `/oauth/consent` (already entered in dashboard)
- Dynamic OAuth Apps: off until approved clients and consent flows are tested.
- Email OTP: enabled and email confirmation required; verify email rate limits / delivery.
- After changes, confirm preview authorization URL is `https://hotmart-mcp-consent.vercel.app/oauth/consent`.

These URLs are **for the consent portal only**. ChatGPT's OAuth redirect URI must come from ChatGPT's connector setup and must be registered separately with Supabase OAuth Server. Do not invent it.

## Before using real Hotmart data
1. Register an OAuth client in Supabase (or use permitted dynamic registration) for ChatGPT.
2. Verify the actual Supabase JWT issuer, audience, and client ID accepted by the backend.
3. Complete deployment and secret management for the MCP backend, which is **not** this Vite portal.
4. Execute a full approve and deny authorization from a real ChatGPT connection.
5. Run independent-user tenant isolation tests against the dedicated database.
