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
