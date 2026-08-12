# P0-01 — Restore faraios.com as the FaraiOS production origin

## Current failure

`https://faraios.com` reaches the Plesk subscription but serves the Plesk/default "Website not configured" response instead of the FaraiOS Next.js application.

## Target architecture

- `faraios.com` / `www.faraios.com` → FaraiOS Next.js production project on Vercel
- FaraiOS customer subscriptions remain provisioned under the Allanux/Plesk reseller account
- Plesk customer domains proxy to the FaraiOS application origin with the original Host header preserved
- Supabase remains the application database/auth backend

## Production project

Create/import a dedicated Vercel project:

- Project name: `faraios`
- Git repository: `shalean-developer/faraios`
- Production branch: `master`
- Framework: Next.js
- Root directory: repository root

## Required production environment

At minimum:

- `NEXT_PUBLIC_APP_URL=https://faraios.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Hosting/billing integrations additionally require their existing secrets/configuration, including Paystack, Resend, Vercel hosting automation and Plesk credentials/settings.

For Plesk proxying set or verify:

- `FARAIOS_PLESK_PROXY_ENABLED=true`
- `FARAIOS_PLESK_APP_ORIGIN=https://faraios.com` after the Vercel deployment/domain is healthy

## Domain cutover

1. Add `faraios.com` and `www.faraios.com` to the dedicated Vercel project.
2. Read the exact DNS records Vercel requires for those domains.
3. In the authoritative DNS zone for `faraios.com`, change only the web records needed for the apex and `www` to the Vercel-required values.
4. Preserve MX, SPF, DKIM, DMARC and unrelated TXT records.
5. Confirm Vercel shows both domains as valid and SSL is issued.

## Smoke tests

- `/` returns the FaraiOS marketing homepage, not a Plesk default page.
- `/auth/sign-in` loads.
- A signed-in workspace route loads.
- `NEXT_PUBLIC_APP_URL` resolves to `https://faraios.com`.
- Tenant/custom-domain routing still preserves the incoming Host header.
- Existing Plesk customer provisioning remains functional.

## Important

Do not delete the `faraios.com` Plesk subscription until customer hosting/proxy dependencies have been reviewed. The immediate goal is to make the public FaraiOS application origin Vercel-backed while retaining the reseller hosting system for customer subscriptions.
