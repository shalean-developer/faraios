# FaraiOS Production Launch Checklist

Use this checklist when deploying FaraiOS to staging or production. Apply steps in order.

---

## 1. Database migrations (54 files)

Apply all migrations in **timestamp order** under `supabase/migrations/`.

```bash
# Supabase CLI (linked project)
supabase db push

# Or run each file in the SQL editor, oldest → newest
```

### Critical migration milestones

| Order | Migration | What it adds |
|-------|-----------|--------------|
| Base | `20260415120000_init_faraios.sql` | Core schema |
| V1 | `20260623220000_v1_operations_module.sql` | Customers, services |
| V2 | `20260624000000_v2_booking_engine.sql` | Bookings engine |
| V3 | `20260625000000_v3_revenue_engine.sql` | Quotes, invoices, payments |
| V4 | `20260626000000_v4_website_domain_engine.sql` | Domains, tracking |
| V5 | `20260627000000_v5_growth_engine.sql` | SEO, campaigns, leads |
| V6 | `20260628000000_v6_bi_automation_engine.sql` | Workflows, roles, segments |
| Phase B | `20260629200000_phase_b_company_branding_overdue.sql` | Branding, overdue cron |
| Phase C | `20260630000000_phase_c_growth_scale.sql` | GSC OAuth tables |
| Phase C | `20260630120000_sync_search_console_cron.sql` | GSC sync cron registry |

### Post-migration

- [ ] Seed at least one `platform_admins` row for your operator account
- [ ] Confirm RLS: `is_company_member()` exists (used by Phase C policies)
- [ ] Verify `platform_cron_jobs` lists 3 jobs (automations, overdue invoices, GSC sync)

---

## 2. Environment variables

Copy to `.env.local` (dev) and your host’s env panel (production).

### Required — app will not function without these

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App URL (Paystack callbacks, portal links, GSC OAuth redirect)
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

### Required for billing

```env
PAYSTACK_SECRET_KEY=sk_live_...
```

Register Paystack webhook:

```
POST https://app.yourdomain.com/api/paystack/webhook
```

Events: `charge.success` (and any others you rely on).

### Required for email (bookings, invoices, campaigns, retention, overdue)

```env
RESEND_API_KEY=re_...
BOOKING_FROM_EMAIL="Your Business <notifications@yourdomain.com>"
```

Verify the sender domain in Resend.

### Required for cron jobs (production)

```env
CRON_SECRET=generate-a-long-random-string
```

### Optional — website hosting deploys

```env
VERCEL_TOKEN=...
FARAIOS_VERCEL_CNAME_TARGET=cname.vercel-dns.com
CLOUDFLARE_API_TOKEN=...
FARAIOS_CLOUDFLARE_PAGES_CNAME=...
NEXT_PUBLIC_FARAIOS_TENANT_DOMAIN_SUFFIX=.sites.yourdomain.com
```

### Optional — Google Search Console

```env
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=GOCSPX-...
```

OAuth redirect URI (Google Cloud Console):

```
https://app.yourdomain.com/api/integrations/google-search-console/callback
```

### Optional — E2E tests (local/CI)

```env
E2E_USER_EMAIL=...
E2E_USER_PASSWORD=...
E2E_COMPANY_SLUG=your-workspace-slug
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_SKIP_WEBSERVER=1
```

---

## 3. Cron job URLs

Schedule these with **Vercel Cron**, GitHub Actions, or any HTTP scheduler.  
Send header: `Authorization: Bearer $CRON_SECRET`

| Job | Schedule (suggested) | URL |
|-----|----------------------|-----|
| Process automations | Every 15 min | `GET /api/cron/process-automations` |
| Overdue invoices | Daily 08:00 UTC | `GET /api/cron/process-overdue-invoices` |
| Search Console sync | Daily 06:00 UTC | `GET /api/cron/sync-search-console` |

**Full URLs (replace base):**

```
https://app.yourdomain.com/api/cron/process-automations
https://app.yourdomain.com/api/cron/process-overdue-invoices
https://app.yourdomain.com/api/cron/sync-search-console
```

**Example curl:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://app.yourdomain.com/api/cron/sync-search-console
```

Monitor runs in **Admin → Cron jobs** (`/admin/cron`).

**Supabase Edge (separate):** domain verification runs via pg_cron + `verify-domains` edge function (see `20260626010000_verify_domains_supabase_cron.sql`).

---

## 4. Pre-launch smoke tests

### Automated (local or CI)

```bash
npm run typecheck
npm test          # 63 Vitest tests
npm run build
npm run test:e2e  # public smoke (no credentials needed)
```

### Manual — core customer journey

- [ ] Sign up → onboarding → land on `/{slug}/dashboard`
- [ ] Create a booking (dashboard + public `/book/{companyId}`)
- [ ] Create quote → convert/send → customer portal accepts
- [ ] Create invoice → portal Paystack or EFT payment → webhook updates status
- [ ] Publish website → tenant `/about`, `/contact`, industry template renders
- [ ] Capture lead from public API or contact form → appears in **Growth → Leads**
- [ ] Send retention campaign to inactive segment (requires Resend)
- [ ] Pay workspace subscription at `/{slug}/dashboard/subscription`
- [ ] Connect GSC on **Growth → SEO** → run cron → metrics appear

### Manual — platform admin

- [ ] `/admin` loads for platform admin user
- [ ] Cron run history shows success after triggering jobs
- [ ] Email log shows sent/failed entries after notifications

---

## 5. Paystack verification

Three isolated billing flows:

| Flow | Initialize route | Webhook `product_type` | Dashboard |
|------|------------------|------------------------|-----------|
| Workspace SaaS | `/api/paystack/initialize` | `website` | `/{slug}/dashboard/subscription` |
| Website hosting | `/api/paystack/hosting/initialize` | `hosting` | `/{slug}/dashboard/hosting` |
| Customer invoice | Portal `/api/public/portal/.../payments/initialize` | `customer_invoice` | Portal |

- [ ] Test each flow in Paystack test mode first
- [ ] Confirm `companies.plan` / `subscription_status` update after SaaS payment
- [ ] Confirm `hosting_subscriptions` row after hosting payment
- [ ] Confirm `customer_payments` after portal payment

---

## 6. Multi-company / workspaces

- [ ] User with 2+ memberships sees `/app/workspaces` after login
- [ ] Company switcher in sidebar preserves sub-path
- [ ] Middleware blocks access to slugs the user is not a member of

See [WORKSPACES.md](./WORKSPACES.md).

---

## 7. Known limitations (document for support)

- **Smart Search** is rule-based keyword routing, not LLM
- **SMS/WhatsApp** workflow actions are disabled until a provider is configured
- **SEO indexed pages** estimate in audit score; real index data comes from GSC after sync
- **Second workspace** creation is not self-serve in onboarding (admin or future feature)
- **Playwright** authenticated E2E requires `E2E_USER_*` env vars; not in CI yet

---

## 8. Launch day order

1. Apply migrations  
2. Set env vars on host  
3. Deploy application  
4. Register Paystack webhook  
5. Verify Resend sender domain  
6. Configure cron scheduler (3 Next.js routes + Supabase domain verify)  
7. Seed platform admin  
8. Run smoke tests  
9. Onboard first pilot customer  

---

## Quick reference docs

| Topic | Doc |
|-------|-----|
| Revenue / portal | [V3_REVENUE_ENGINE.md](./V3_REVENUE_ENGINE.md) |
| Websites / domains | [V4_WEBSITE_ENGINE.md](./V4_WEBSITE_ENGINE.md) |
| Growth / SEO | [V5_GROWTH_ENGINE.md](./V5_GROWTH_ENGINE.md) |
| BI / automations | [V6_BI_AUTOMATION_ENGINE.md](./V6_BI_AUTOMATION_ENGINE.md) |
| Workspaces | [WORKSPACES.md](./WORKSPACES.md) |
