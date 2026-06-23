# FaraiOS V4 — Website Connection, Hosting & Domain Engine

Version 4 connects external websites, manages custom domains, optional FaraiOS hosting, API keys, and basic tracking — without rebuilding the website builder.

## System audits (pre-V4)

### Websites

| Area | Pre-V4 state | V4 change |
|------|--------------|-----------|
| `websites` table | Draft/publish, domain, subdomain, SEO | Added `connection_status`, `hosting_provider`, tracking/booking flags |
| `connected_websites` | External URL + API key only | Extended with name, status, domain fields, feature toggles |
| Creation flow | Options A/B/C hub | Hub + sub-pages: domains, API keys, tracking, hosting |
| Status | `draft` / `published` only | V4 statuses: draft → connected → verification_pending → verified → live |
| Preview / publish | DB status flip | Publish creates deployment record + `connected_websites` hosted link |

### Domains

| Area | Pre-V4 state | V4 change |
|------|--------------|-----------|
| Domain storage | Split across `websites.domain` and `hosting_subscriptions.custom_domain` | Unified `website_domains` + `website_dns_records` |
| DNS instructions | Hardcoded Vercel CNAME copy in UI | Generated per domain with CNAME, A, TXT records |
| Verification | Manual / never updated | `verifyWebsiteDomainAction` + Supabase Edge Function `verify-domains` (pg_cron) |
| SSL | Optimistic on Paystack webhook | Tracked per domain: not_started → pending → active → failed |

### Hosting

| Area | Pre-V4 state | V4 change |
|------|--------------|-----------|
| Provider integration | None (Vercel assumed in copy) | `HostingProvider` abstraction (Vercel + Cloudflare Pages) |
| Deployments | None | `website_deployments` table + publish hook |
| Environment vars | Not implemented | Placeholder in provider deploy API |
| Preview deployments | `/preview/[id]` routes only | Deployment `environment: preview` supported in schema |

### External website connection

| Area | Pre-V4 state | V4 change |
|------|--------------|-----------|
| API keys | Auto-generated, read-only | Rotate, revoke, audit log |
| Embed scripts | `booking.js` only | Booking + `tracking.js` with copy-paste snippets in dashboard |
| V2 public API | Business ID auth | Unchanged; lead source fields added to bookings |
| V1 legacy API | `X-FaraiOS-Company-Key` | Revoked key check + usage logging |

---

## V4 schema

Migration: `supabase/migrations/20260626000000_v4_website_domain_engine.sql`

| Table / column | Purpose |
|----------------|---------|
| `connected_websites.*` (extended) | External/hosted connection metadata |
| `websites.*` (extended) | Hosted site V4 status and provider |
| `website_domains` | Primary, subdomain, preview domains |
| `website_dns_records` | CNAME / A / TXT instructions and verification |
| `website_deployments` | Preview and production deployment status |
| `business_api_key_events` | Key generate / rotate / revoke / used audit |
| `website_tracking_events` | Page visits, form views, conversions |
| `bookings.referrer, utm_*` | Lead source attribution |

---

## Website modes

1. **Connected external** — `connected_websites.type = 'external'`
2. **FaraiOS hosted** — `websites` + optional `connected_websites.type = 'hosted'`
3. **Future builder** — UI placeholder only (Option C)

### Connection flow

```text
Add Website → Choose type → Add domain → Connect booking/tracking/API
→ Verify DNS → Website live
```

---

## Hosting provider abstraction

```
lib/hosting/providers/
├── types.ts          # HostingProvider interface
├── vercel.ts         # Vercel API (when VERCEL_TOKEN set)
├── cloudflare-pages.ts
└── index.ts

HostingProvider
├── createProject
├── connectDomain
├── deploySite
├── checkStatus
└── removeDomain
```

Env vars:

| Variable | Purpose |
|----------|---------|
| `VERCEL_TOKEN` | Vercel Domains + Deployments API |
| `FARAIOS_VERCEL_CNAME_TARGET` | CNAME value (default `cname.vercel-dns.com`) |
| `FARAIOS_CLOUDFLARE_PAGES_CNAME` | CF Pages CNAME target |
| `NEXT_PUBLIC_FARAIOS_TENANT_DOMAIN_SUFFIX` | Preview subdomain suffix |
| `CRON_SECRET` | Optional extra auth on `verify-domains` edge function |

---

## API surface

| Route | Purpose |
|-------|---------|
| `POST /api/public/tracking` | Record tracking events from `tracking.js` |
| `POST /functions/v1/verify-domains` | Supabase Edge Function — poll pending DNS verifications (pg_cron every 15 min) |
| `GET /api/v1/health` | V1 key check (now respects revoked keys) |
| V2 `/api/public/business/{id}/*` | Unchanged; bookings accept UTM/referrer |

### Embed scripts

```html
<script src="https://faraios.com/embed/booking.js" data-business-id="BUSINESS_ID"></script>
<script src="https://faraios.com/tracking.js" data-business-id="BUSINESS_ID"></script>
```

---

## Dashboard navigation

`/{company}/dashboard/websites` hub with sub-routes:

| Route | Purpose |
|-------|---------|
| `/websites` | Overview, checklist, connection status |
| `/websites/domains` | Domain + DNS management |
| `/websites/api-keys` | Generate, rotate, revoke keys |
| `/websites/tracking` | Tracking script + recent events |
| `/websites/hosting` | Deployment status per hosted site |
| `/hosting` | Hosting billing (Paystack) |

---

## Setup checklist

Computed in `lib/services/website-checklist.ts`:

- Business profile completed
- Services added
- Booking form configured
- Domain added
- DNS verified
- SSL active
- Booking widget installed
- Tracking script installed
- Website live

---

## Security checklist

- [x] Multi-tenant isolation (RLS on all V4 tables)
- [x] Public API keys scoped to safe V1/V2 actions only
- [x] Rate limiting on tracking and public bookings
- [x] Domain ownership TXT verification (`_faraios`)
- [x] API key rotation and revoke
- [x] Revoked keys rejected on V1 health
- [x] Tracking script cannot access admin data (public POST only)
- [ ] Webhook verification (existing Paystack — unchanged)
- [ ] Full Vercel SSL polling in production (requires `VERCEL_TOKEN`)

---

## V4 implementation checklist

- [x] Database migration
- [x] Hosting provider abstraction
- [x] Domain + DNS tables and verification
- [x] API key rotate / revoke / audit
- [x] Tracking script + public API
- [x] Lead source fields on bookings
- [x] Website hub dashboard + sub-pages
- [x] Setup checklist component
- [x] Publish → deployment + hosted connection
- [x] Connected website panel embed snippets
- [ ] Apply migration to production Supabase
- [ ] Configure `VERCEL_TOKEN` for live domain API
- [ ] Deploy `supabase functions deploy verify-domains`
- [ ] Add Vault secrets `project_url` + `service_role_key` and apply migration `20260626010000_verify_domains_supabase_cron.sql`
- [ ] Deprecate duplicate domain fields on `hosting_subscriptions` (future)

---

## Cleanup notes (identified, partial)

| Issue | Status |
|-------|--------|
| Template-first creation as only path | Mitigated — external connection is first-class |
| Duplicate domain stores | `website_domains` is new source of truth; legacy fields kept for compat |
| Confusing preview/publish | Publish now writes deployment + connection status |
| Hardcoded `.faraios.com` | Configurable via `NEXT_PUBLIC_FARAIOS_TENANT_DOMAIN_SUFFIX` |
| Website settings mixed with booking | Separated into `/websites/*` sub-routes |

---

## Out of scope (later versions)

- Drag-and-drop website builder
- Marketplace directory
- Advanced analytics / heatmaps
- AI website generation
- Full SEO / marketing automation
