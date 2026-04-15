# FaraiOS — project completion report

This document summarizes gaps and suggested next steps based on a scan of the codebase (routes, services, UI, migrations, tooling).

---

## 1. Routes and features that are still stubs

| Area | Location | Gap |
|------|-----------|-----|
| **Project detail (global list)** | `app/dashboard/projects/[id]/page.tsx` | Explicit placeholder: no Supabase/API; only shows `id`. |
| **New project** | `app/dashboard/projects/new/page.tsx` | Placeholder copy only; no form or API. |
| **Main client dashboard nav** | `components/dashboard/farai-dashboard.tsx` | Sidebar items (`hosting`, `domains`, `settings`, `projects`) only update **active state**; **main content never changes** — everything is still the dashboard home view. |
| **Workspace booking block** | `app/[company]/dashboard/company-dashboard-client.tsx` | “Booking system” section with **disabled “Coming soon”** button — no scheduling UI or APIs. |
| **Project tracker copy** | `components/project/project-status-tracker.tsx` | Mentions future **notifications, realtime, chat, uploads** — not built. |

**Implication:** Decide whether `/dashboard/projects/[id]` and `/new` should exist at all, or should deep-link to `/{slug}/project` and onboarding instead, to avoid duplicate concepts.

---

## 2. Data model and product depth

| Topic | Notes |
|--------|--------|
| **Billing / subscriptions** | `types/dashboard.ts` and `getDashboardSnapshot()` still treat subscription as **derived from companies + pricing slugs**, not a real billing system. No renewals, invoices, or payment provider. |
| **Admin project detail** | `types/admin.ts`: **pages, features, design style, competitors** are still **placeholders** until onboarding metadata is stored and mapped in `lib/services/admin`. |
| **Company → project mapping** | `lib/mappers/company-to-project.ts` notes **extra fields are placeholders** until DB columns exist. |
| **Launch / live URL** | No `production_url` (or similar) on companies; “launch” flows use **internal** routes (e.g. first published workspace dashboard), not a real public site URL. |
| **Auth users sync** | Migration `20260415170000_auth_public_users_sync.sql` syncs new users into `public.users`. **Existing** auth users may need a **one-time backfill** so `full_name` is populated everywhere the app reads it. |

---

## 3. UX, marketing, and compliance

| Item | Gap |
|------|-----|
| **README** | Still default **create-next-app** text — no FaraiOS setup, env vars, or Supabase workflow. |
| **Legal** | Auth footer (`components/auth/farai-auth-page.tsx`): “Terms” and “Privacy” are **non-link spans** — no `/terms` or `/privacy` pages. |
| **Support** | “Contact our support team” is **not wired** (no mailto, link, or form). |
| **Analytics** | No **Vercel Analytics**, GA, Plausible, etc. in `app/layout.tsx` or app code. |
| **SEO** | Root metadata exists; many routes rely on **local `metadata` exports** — worth a pass for OG images, canonical URLs, and sitemap when you go live. |

---

## 4. Engineering hygiene and operations

| Item | Status |
|------|--------|
| **Tests** | No `*.test.*` / `__tests__` found; **no automated regression safety**. |
| **CI** | No `.github/workflows` (or similar) in repo — **no lint/build on push**. |
| **Scripts** | `package.json`: only `dev`, `build`, `start`, `lint` — no `typecheck` script (optional convenience). |

---

## 5. Environment and Supabase (must be correct for production)

| Requirement | Detail |
|-------------|--------|
| **Env** | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`lib/supabase/public-env.ts`). |
| **Middleware** | If URL/key missing, **middleware skips auth** — protected routes may not enforce login as intended until env is set in production. |
| **Migrations** | Apply all under `supabase/migrations/` in order on the project you deploy against; verify **RLS** matches how the app queries (memberships, companies, bookings, admin). |

---

## 6. Suggested completion order (pragmatic)

1. **Product clarity:** Single story for “project” — either finish `/dashboard/projects/*` or remove/replace with `/{company}/project` + onboarding.
2. **Client dashboard:** Implement real **section routing** (or replace nav with links to real pages) for Projects / Settings / Domains / Hosting.
3. **Billing:** Schema + provider (Stripe/Paddle/etc.) + webhook → then replace subscription/renewal fields end-to-end.
4. **Workspace value:** Replace booking “Coming soon” with MVP (list bookings from DB + simple form) if that’s core to the offer.
5. **Admin:** Persist and load onboarding **metadata** so admin isn’t showing placeholders.
6. **Launch checklist:** Terms/Privacy, support contact, README, env docs, analytics, CI + smoke test.

---

*Generated from a static codebase scan; update this file as work completes.*
