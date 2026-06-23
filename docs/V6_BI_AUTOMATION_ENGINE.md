# FaraiOS V6 — Business Intelligence, Automation & Customer Experience Engine

**Version:** V6  
**Migration:** `supabase/migrations/20260628000000_v6_bi_automation_engine.sql`  
**Status:** Implemented on top of V1–V5

---

## V6 Vision

FaraiOS V6 transforms the platform from a business management system into a **Business Growth Operating System** — helping service businesses automate operations, improve retention, increase revenue, reduce admin work, gain insights, and improve customer experience.

---

## 1. Reporting Audit

### Existing (Pre-V6)

| Surface | Location | Capability |
|---------|----------|------------|
| Operations dashboard | `/{slug}/dashboard` | Booking counts, customer count, booking-estimate revenue |
| Revenue dashboard | `/{slug}/dashboard/revenue` | Payment-based KPIs (today/month/year, outstanding) |
| Financial reports | `/{slug}/dashboard/reports` | Quote funnel, payment stats, 6-month revenue table |
| Marketing overview | `/{slug}/dashboard/marketing` | 30-day KPI cards (subset of analytics) |
| Growth analytics | `/{slug}/dashboard/analytics` | Visits, leads, bookings, top sources/pages, campaign ROI |
| SEO audit | `/{slug}/dashboard/seo` | Static SEO scorecards |
| Website tracking | `/{slug}/dashboard/websites/tracking` | Raw last-15 events |
| Admin analytics | `/admin/analytics` | Farai internal project charts (Recharts) |

### Issues Identified (Cleanup)

1. **Dual revenue definitions** — Operations dashboard uses completed booking `price_cents`; Revenue/Reports use `customer_payments`. V6 BI dashboard standardizes on **payment-based revenue** for financial metrics.
2. **Marketing vs Analytics overlap** — Marketing page duplicates Analytics KPIs. Both retained; Analytics remains the detailed view.
3. **No booking aggregate reports** — Fixed in V6 advanced reports (by service, staff, source).
4. **No customer LTV/cohort analytics** — Fixed in V6 advanced reports and BI dashboard.
5. **No lead CRM UI** — Leads counted in marketing analytics; V6 AI search surfaces leads.
6. **Fragmented billing BI** — SaaS/hosting/customer payments remain separate ledgers (documented, not merged).

### V6 Additions

| Feature | Route | Service |
|---------|-------|---------|
| Executive BI dashboard | `/{slug}/dashboard/insights` | `lib/services/bi-metrics.ts` |
| Advanced reporting | `/{slug}/dashboard/reports` (enhanced) | `lib/services/advanced-reports.ts` |
| Business health score | `/{slug}/dashboard/business-health` | `lib/services/business-health.ts` |

---

## 2. Automation Audit

### Existing (Pre-V6)

| Automation | Trigger | Channel |
|------------|---------|---------|
| Booking created/updated emails | Inline in booking-engine / company actions | Resend |
| Financial emails (quote, invoice, payment) | Server actions / Paystack webhook | Resend |
| Auto review request | Booking completed | Resend |
| Email campaigns | Manual send | Resend |
| Domain verification | pg_cron every 15 min | Edge function |

### Gaps (Pre-V6)

- No user-configurable workflows
- No job queue or delayed steps
- No in-app notification center
- `notifyInvoiceOverdue` defined but never called
- Admin notification prefs saved but never read
- No SMS/WhatsApp (deferred)

### V6 Additions

| Feature | Location |
|---------|----------|
| Workflow engine | `lib/services/workflow-engine.ts` |
| Workflow UI | `/{slug}/dashboard/automations` |
| Delayed job processor | `GET /api/cron/process-automations` |
| Unified notifications | `company_notifications` table + `/{slug}/dashboard/notifications` |
| Trigger wiring | booking-engine, company actions, portal quotes, leads API |

### Supported Triggers

- `booking_created`, `booking_confirmed`, `booking_completed`, `booking_cancelled`
- `quote_accepted`, `invoice_paid` (schema ready; wire on Paystack webhook as follow-up)
- `customer_created`, `review_submitted`, `lead_created`

### Supported Actions

- `send_email`, `create_task`, `assign_staff`, `change_status`, `add_customer_tag`, `schedule_followup`
- `send_sms`, `send_whatsapp` — future-ready stubs

---

## 3. Customer Portal Plan

### Existing (V3)

Token-based portal at `/portal/{token}` — quotes, invoices, payments, PDF download, Paystack pay.

### V6 Enhancements (Implemented)

| Capability | Status |
|------------|--------|
| View/update profile | PATCH `/api/public/portal/{token}/profile` |
| View bookings + status | Bookings section on portal |
| Reschedule/cancel requests | POST booking request API → staff notification |
| Quotes accept/reject | Existing |
| Invoices + pay | Existing |
| Payment history | Existing |
| Leave reviews | Google review link from SEO settings |
| View submitted reviews | Review request history |

### Future (Not V6)

- Authenticated customer accounts (magic link / Supabase auth)
- Tenant-branded portal domain
- Document uploads, messaging/tickets

---

## 4. Team Management Plan

### Existing

- Roles: owner, admin, staff
- Invite by email (must have FaraiOS account)
- Booking staff assignment

### V6 Additions

| Feature | Status |
|---------|--------|
| Extended roles: manager, finance, marketing | DB + team UI |
| Staff profiles (skills, availability, bio) | `staff_profiles` table + service |
| Granular permissions | `permissions` + `role_permissions` |
| Custom company roles | `company_roles` table (schema) |
| Assigned jobs view | `getStaffAssignedJobs()` |

---

## 5. Workflow Engine Plan

```text
Event (e.g. booking_completed)
  → triggerWorkflows()
  → Match enabled workflows by trigger_type
  → Create workflow_run
  → Execute steps (immediate or schedule via automation_jobs)
  → Create notification on completion
```

**Tables:** `workflows`, `workflow_runs`, `automation_jobs`

**Cron:** Call `GET /api/cron/process-automations` with `Authorization: Bearer $CRON_SECRET` (hourly recommended).

---

## 6. Customer Retention Plan

| Feature | Status |
|---------|--------|
| Customer segments (high value, repeat, inactive, new) | `customer_segments` + segments page |
| Customer tags | `customers.tags` column |
| Retention campaigns schema | `retention_campaigns` table |
| Win-back recommendations | AI assistant + business health |
| Loyalty tracking | Repeat customer segment + LTV reports |

---

## 7. AI Assistant Plan

Rule-based insights from existing FaraiOS data — not autonomous LLM agents.

| Capability | Service |
|------------|---------|
| Insights | `generateAiInsights()` |
| Recommendations | Same |
| Search | `aiSearch()` |

**Route:** `/{slug}/dashboard/ai-insights`

---

## 8. Business Health Scoring Plan

Score 0–100 from revenue trend, booking growth, review activity, customer retention, lead conversion.

**Route:** `/{slug}/dashboard/business-health`

---

## 9. Database Migration Plan

**File:** `20260628000000_v6_bi_automation_engine.sql`

Apply via `supabase db push` or Supabase SQL editor. Seeds default role permissions for all companies.

---

## 10. Security Checklist

| Requirement | Status |
|-------------|--------|
| Role-based permissions | `role_permissions` + `userHasPermission()` |
| Team isolation (RLS) | All V6 tables company-scoped |
| Customer privacy | Portal token-only access |
| Audit logs | `company_activity_logs` |
| Secure automation | Service role + CRON_SECRET |
| AI access controls | `view_ai_insights` permission |

---

## 11. Final V6 Implementation Checklist

- [x] Executive BI dashboard
- [x] Advanced reports
- [x] Business health score
- [x] AI insights and search
- [x] Workflow automation engine + UI
- [x] Notification center
- [x] Task management
- [x] Enhanced customer portal
- [x] Customer segments
- [x] Extended team roles + permissions schema
- [x] Navigation (Intelligence section)
- [ ] Wire `invoice_paid` trigger on Paystack webhook (follow-up)
- [ ] Enforce permissions across all nav/actions (follow-up)

---

## Navigation (V6)

| Section | Items |
|---------|-------|
| **Operations** | Dashboard, Bookings, Calendar, Customers, Services, Quotes, Invoices, Payments, Revenue, Tasks, Automations, Notifications |
| **Intelligence** | Business Insights, Business Health, AI Assistant, Reports |
| **Websites** | Websites hub |
| **Growth** | SEO, Marketing, Reviews, Campaigns, Content, Analytics |
| **Settings** | Business, Team |
