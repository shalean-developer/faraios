# FaraiOS V5 — SEO, Marketing & Growth Engine

V5 turns FaraiOS from an operations platform into a **growth engine** for service businesses: local SEO, content, review generation, email campaigns, lead tracking, and marketing analytics.

## Scope delivered in V5

| Capability | Status |
|------------|--------|
| SEO dashboard (score, gaps, recommendations) | ✅ |
| Local SEO settings (GBP, review link, service areas) | ✅ |
| Service area pages (dynamic, editable, non-duplicate slugs) | ✅ |
| Client website SEO editing | ✅ |
| Schema markup (LocalBusiness, Organization, Service, FAQ, Breadcrumb) | ✅ |
| Blog / content engine | ✅ |
| Review request workflow + auto-send on completed booking | ✅ |
| Simple email campaigns + unsubscribe | ✅ |
| Lead capture API + attribution fields | ✅ |
| Marketing analytics dashboard | ✅ |
| UTM passthrough in booking embed | ✅ |
| Tracking respects `tracking_enabled` | ✅ |
| Growth navigation (SEO, Marketing, Reviews, Campaigns, Content, Analytics) | ✅ |

## Out of scope (V6+)

- Full social media scheduler
- Advanced marketing automation / drips
- AI content generation
- Google Ads / Meta Ads API
- Full reputation management
- Google Business Profile API sync

---

## Database migration

Apply:

```bash
supabase db push
# or run: supabase/migrations/20260627000000_v5_growth_engine.sql
```

### New tables

| Table | Purpose |
|-------|---------|
| `local_seo_settings` | Business name, industry, service areas, GBP URL, review link, hours, social links |
| `service_area_pages` | Local landing pages (`/areas/[slug]`) |
| `content_posts` | Blog, guides, articles, FAQs (`/blog`, `/blog/[slug]`) |
| `review_requests` | Review outreach history |
| `email_campaigns` | Simple broadcast campaigns |
| `email_unsubscribes` | Per-tenant unsubscribe list |
| `leads` | Contact / quote request capture with UTM |

### Extended columns

- `quotes`: `source`, `utm_*`, `referrer`, `landing_page`, `conversion_page`
- `bookings`: `landing_page`, `conversion_page`

---

## Dashboard routes

All under `/{company}/dashboard/`:

| Route | Purpose |
|-------|---------|
| `/seo` | SEO score, local settings, website meta, service area pages |
| `/marketing` | Marketing KPI overview (30-day) |
| `/reviews` | Manual review requests + history |
| `/campaigns` | Create/send email campaigns |
| `/content` | Create/publish blog posts |
| `/analytics` | Sources, pages, campaigns, conversion rate |

---

## Public APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/public/business/{id}/leads` | Contact / quote lead capture |
| `GET /api/public/review-click?requestId=&redirect=` | Track review link clicks |
| `GET /api/public/unsubscribe?companyId=&email=` | Email unsubscribe |
| `POST /api/public/tracking` | Now respects `tracking_enabled` |
| `POST /api/public/business/{id}/bookings` | Now accepts `landingPage`, `conversionPage`, UTM |

### Embed scripts

**Booking widget** — UTM and landing page now forwarded:

```html
<script src="https://your-app/embed/booking.js" data-business-id="COMPANY_UUID"></script>
```

**Lead capture** (custom sites):

```javascript
fetch('/api/public/business/COMPANY_UUID/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name, email, phone, message,
    leadType: 'contact', // or 'quote_request'
    sourceWebsite: location.href,
    referrer: document.referrer,
    utmSource, utmMedium, utmCampaign,
    landingPage: location.href,
  }),
});
```

---

## Tenant website routes

Published tenant sites gain:

- `/areas/[slug]` — service area landing pages with FAQ schema
- `/blog` — content index
- `/blog/[slug]` — individual posts

Homepage emits **LocalBusiness**, **Organization**, and **FAQPage** JSON-LD when local SEO settings exist.

Sitemap includes blog and area pages per tenant.

---

## Review request flow

```
Booking marked completed
        ↓
auto_review_request_enabled?  →  Send email with tracked Google review link
        ↓
Customer clicks link  →  review_requests.status = clicked
```

Configure in **SEO → Local SEO settings**.

---

## Security checklist

- [x] All V5 tables use `company_id` + RLS member policies
- [x] Public lead endpoint rate-limited (10 / 15 min / IP / business)
- [x] Tracking endpoint checks `tracking_enabled`
- [x] Campaigns only email that company's `customers` table
- [x] Unsubscribe link in every campaign email
- [x] Review/unsubscribe redirects validated (HTTPS only)
- [x] Published content/area pages readable publicly; drafts member-only

---

## SEO system audit (pre-V5 → post-V5)

| Area | Before V5 | After V5 |
|------|-----------|----------|
| SEO dashboard | Missing | Score + gap analysis |
| Local SEO settings | Split across `companies` + `website_content` | Unified `local_seo_settings` |
| Service area pages | Homepage section only | Dedicated `/areas/[slug]` pages |
| Client SEO UI | Dead `updateWebsiteSeoAction` | Wired in SEO dashboard |
| Schema markup | None | LocalBusiness, Org, Service, FAQ, Breadcrumb |
| Blog/CMS | Onboarding flag only | Full content engine |
| Sitemap | 5 static routes, hardcoded domain | + blog/areas, tenant domain suffix |

---

## Marketing system audit

| Area | Before V5 | After V5 |
|------|-----------|----------|
| Email campaigns | None | Draft + send to customers |
| Review requests | Static testimonials | Email workflow + tracking |
| Contact forms | No backend | `POST .../leads` |
| Lead CRM | Bookings only | `leads` table |
| Unsubscribe | None | Per-tenant list |

---

## Analytics audit

| Area | Before V5 | After V5 |
|------|-----------|----------|
| Website visits | Raw event list | Aggregated 30-day count |
| Lead sources | Stored on bookings, not shown | Top sources report |
| Conversion rate | None | Visits → bookings % |
| Campaign ROI | None | Sent / bookings / revenue columns |
| Quote attribution | Missing | Schema ready (columns added) |

---

## Implementation checklist

- [x] Migration `20260627000000_v5_growth_engine.sql`
- [x] Services: local-seo, service-area-pages, content-posts, review-requests, email-campaigns, leads, seo-audit, marketing-analytics, schema-markup
- [x] Server actions: `app/actions/growth-engine.ts`
- [x] Growth hub navigation + sidebar section
- [x] Public tenant routes: areas, blog
- [x] UTM fix in `embed/booking.js`
- [x] Auto review request on booking completion
- [x] Tracking `tracking_enabled` gate

### Recommended follow-ups (post-V5)

1. Wire quote creation to populate attribution fields
2. Display UTM/referrer on booking detail UI
3. Add `robots: noindex` to `/preview/*`
4. OG image upload in SEO dashboard
5. Per-tenant `robots.txt` / sitemap on custom domains
6. Cron to attribute campaign bookings/revenue from UTM

---

## Files added / key paths

```
supabase/migrations/20260627000000_v5_growth_engine.sql
types/growth-engine.ts
lib/services/local-seo.ts
lib/services/service-area-pages.ts
lib/services/content-posts.ts
lib/services/review-requests.ts
lib/services/email-campaigns.ts
lib/services/leads.ts
lib/services/seo-audit.ts
lib/services/marketing-analytics.ts
lib/services/schema-markup.ts
lib/services/tenant-seo.tsx
app/actions/growth-engine.ts
app/[company]/dashboard/{seo,marketing,reviews,campaigns,content,analytics}/
app/api/public/business/[businessId]/leads/route.ts
app/api/public/review-click/route.ts
app/api/public/unsubscribe/route.ts
app/areas/[slug]/page.tsx
app/blog/page.tsx
app/blog/[slug]/page.tsx
components/growth/
```
