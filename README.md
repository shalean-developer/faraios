# FaraiOS

FaraiOS is a SaaS platform for done-for-you websites, with onboarding, company
workspaces, project tracking, booking MVP, and billing integrations.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` and add required environment variables (see below).

3. Run the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

### Core App / Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (required for secure webhook updates)

### Billing (Paystack)

- `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL` (e.g. `https://your-domain.com`; also accepts `NEXT_PUBLIC_SITE_URL`)

### Optional

- `NEXT_PUBLIC_GA_ID` if you choose to add Google Analytics later.
- `NEXT_PUBLIC_SITE_URL` — alias for `NEXT_PUBLIC_APP_URL` when configuring Paystack callbacks.

## Supabase Setup

1. Create a Supabase project.
2. Set the env vars listed above.
3. Run all SQL migrations in `supabase/migrations/` in timestamp order.
4. Confirm RLS policies are active for `memberships`, `bookings`, and `companies`.
5. For webhook updates, ensure `SUPABASE_SERVICE_ROLE_KEY` is set in deployment.
6. Seed the first platform admin via SQL (service role), e.g. `insert into public.platform_admins (user_id) values ('<auth-user-uuid>');`
7. Apply **all** migrations through `20260622210000_fix_rls_auth_email.sql` (fixes `permission denied for table users` on company queries).

## Scripts

- `npm run dev` - start local dev server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks without emit
- `npm run test` - run unit tests (Vitest)
- `npm run build` - production build

## Client dashboard routes

Canonical workspace URLs are company-scoped:

- `/{company}/dashboard` — main workspace
- `/{company}/dashboard/websites` — website list
- `/{company}/dashboard/websites/create` — create draft website
- `/{company}/dashboard/websites/{id}/edit` — edit website content
- `/{company}/project` — project tracker

Legacy `/dashboard/*` paths redirect to the signed-in user's company workspace.

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Configure all environment variables in Vercel project settings.
4. Deploy and verify:
   - `/auth` works
   - company dashboard loads
   - booking creation works
   - Paystack initialize and webhook endpoints function

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs:

- install (`npm ci`)
- lint
- typecheck
- build
- test
