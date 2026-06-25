# Shalean

Shalean is a **Business Operating System** for service businesses — company
workspaces, customers, services, bookings, team access, websites, and billing.

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
- `SUPABASE_SERVICE_ROLE_KEY` (required for webhooks, team email lookup, external booking API)

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
7. Apply **all** migrations through `20260624000000_v2_booking_engine.sql`.

## Scripts

- `npm run dev` - start local dev server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks without emit
- `npm run test` - run unit tests (Vitest)
- `npm run build` - production build

## Company workspace routes

Canonical workspace URLs are company-scoped:

- `/{company}/dashboard` — operational overview (bookings, customers, revenue)
- `/{company}/dashboard/bookings` — create, filter, and manage bookings
- `/{company}/dashboard/bookings/{id}` — booking detail, staff assignment, custom responses
- `/{company}/dashboard/calendar` — week schedule view
- `/{company}/dashboard/booking-form` — industry presets, custom fields, publish form
- `/{company}/dashboard/customers` — customer records
- `/{company}/dashboard/customers/{id}` — customer detail and booking history
- `/{company}/dashboard/services` — service catalog and pricing
- `/{company}/dashboard/settings` — business profile and connected website
- `/{company}/dashboard/team` — staff invites and roles
- `/{company}/dashboard/websites` — websites hub (hosted sites, connected site, hosting add-on, build progress)
- `/{company}/dashboard/websites/create` — create draft website
- `/{company}/dashboard/websites/{id}/edit` — edit website content
- `/{company}/dashboard/hosting` — hosting add-on (linked from Websites hub)
- `/{company}/dashboard/project` — Farai website build tracker (when a build project exists)

Legacy `/{company}/project` redirects to `/{company}/dashboard/project`.

### Multi-company access

Users with multiple workspace memberships can switch companies from the sidebar or choose a workspace at `/app/workspaces` after login.
Middleware validates access to the company slug in the URL (not only the first membership).
See [docs/WORKSPACES.md](docs/WORKSPACES.md) for the full model (multi-company is intentional; onboarding still creates one company per flow).

### Public booking API (V2)

Business ID is the company UUID (shown on Booking form settings).

```
GET  /api/public/business/{businessId}
GET  /api/public/business/{businessId}/services
GET  /api/public/business/{businessId}/booking-form
POST /api/public/business/{businessId}/bookings
```

Embed widget:

```html
<script src="https://your-domain.com/embed/booking.js" data-business-id="COMPANY_UUID"></script>
```

Legacy API key flow (still supported):

```
GET  /api/v1/health
POST /api/v1/bookings
Header: X-FaraiOS-Company-Key: <key>
```

Legacy `/dashboard/*` paths redirect to the signed-in user's company workspace.

## Deployment (Vercel)

See **[docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)** for migration order, env template, cron URLs, and smoke tests.

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
