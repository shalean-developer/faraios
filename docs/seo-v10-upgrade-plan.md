# FaraiOS SEO Platform V10 — Upgrade Plan

> Incremental upgrade from V1–V9 Growth Engine SEO to an enterprise-grade V10 platform.
> Rank Math used for feature inspiration only — no proprietary code copied.

## What Already Exists (V1–V9)

### Database
| Table | Purpose |
|-------|---------|
| `websites` | Hosted site meta (`seo_title`, `seo_description`, `seo_keywords`, OG fields) |
| `website_pages` / `website_service_pages` | V9 builder per-page SEO columns |
| `local_seo_settings` | NAP, GBP URL, service areas, social links |
| `service_area_pages` | Local landing pages with SEO fields |
| `content_posts` | Blog/guide meta |
| `google_search_console_connections` | GSC OAuth |
| `seo_search_metrics` | GSC clicks/impressions/queries |
| `connected_websites` | V4 `seo_enabled` flag |

### Services (`lib/services/`)
- `seo-audit.ts` — rule-based score 0–100 from DB heuristics
- `local-seo.ts` — local business settings CRUD
- `service-area-pages.ts` — area page generation
- `schema-markup.ts` — LocalBusiness, Organization, Service, FAQ, Breadcrumb builders
- `tenant-seo.tsx` — public JSON-LD injection
- `search-console.ts` / `search-console-sync.ts` — GSC integration

### UI
- `/{company}/dashboard/seo` — main customer SEO dashboard
- `/{company}/dashboard/websites/builder/seo` — V9 builder site-level SEO
- `components/growth/seo-dashboard-client.tsx` — score cards, GSC, local SEO, area pages
- `app/sitemap.ts` / `app/robots.ts` — platform-level sitemap/robots

### Missing Before V10
- Site crawler / page-level HTML audit
- Redirect manager, 404 monitor
- Per-tenant robots.txt / extended sitemap
- Focus keyword analysis per page
- Meta/social preview manager (canonical, robots meta, Twitter)
- Schema builder UI with validation
- SEO health history / trends
- Admin cross-tenant SEO overview
- Modular scoring with Critical/Warning/Passed/Recommendation groups

---

## V10 Improvements

### New Tables (`20260704000000_v10_seo_platform.sql`)
| Table | Purpose |
|-------|---------|
| `seo_projects` | SEO project per company (domain, language, country, business type, integrations) |
| `seo_pages` | Inventoried pages with crawl snapshot fields |
| `seo_crawls` | Crawl run history |
| `seo_analysis` | Per-page analysis results and issue breakdown |
| `seo_keywords` | Focus keywords per page (multiple per page) |
| `seo_keyword_rankings` | Ranking placeholder (GSC/manual) |
| `seo_meta` | Extended meta (canonical, robots, OG, Twitter) per page |
| `seo_schema` | JSON-LD records with type and validation status |
| `seo_redirects` | 301/302/307/308/410/451 redirect rules |
| `seo_404_logs` | 404 hit tracking (privacy-safe) |
| `seo_sitemaps` | Sitemap config and generation status |
| `seo_reports` | Generated report snapshots |
| `seo_integrations` | OAuth-ready GSC/GA/GBP/Indexing API slots |
| `seo_settings` | Per-project robots.txt, crawl rules, exclusions |
| `seo_health_history` | Daily score/health snapshots for trends |

### Extended Columns
- `local_seo_settings`: `latitude`, `longitude`, `google_maps_url`, `logo_url`, `whatsapp`, `knowledge_graph_data`

### New Modular Services (`lib/services/seo/`)
| Service | File |
|---------|------|
| Crawl | `crawl-service.ts` |
| Analysis | `analysis-engine.ts` |
| Scoring | `scoring-engine.ts` |
| Meta | `meta-service.ts` |
| Sitemap | `sitemap-service.ts` |
| Schema | `schema-service.ts` |
| Redirects | `redirect-service.ts` |
| 404 Monitor | `monitor-404-service.ts` |
| Image SEO | `image-seo-service.ts` |
| Reports | `report-service.ts` |
| Integrations | `integration-service.ts` |
| Project | `project-service.ts` |

### Components Reused
- `components/growth/seo-dashboard-client.tsx` — extended with V10 tabs (not replaced)
- `components/seo/schema-json-ld.tsx` — unchanged public renderer
- `lib/services/schema-markup.ts` — builders reused by schema-service
- `lib/services/local-seo.ts` — extended fields
- `lib/services/search-console.ts` — wired into integration-service
- Existing GSC OAuth routes

### Components Upgraded
- `seo-dashboard-client.tsx` — V10 overview metrics, tab navigation, health chart
- `seo-audit.ts` — delegates to scoring-engine; preserves `SeoAuditResult` shape
- `app/[company]/dashboard/seo/page.tsx` — loads V10 project + health data

### New Components (`components/seo/v10/`)
- `seo-v10-tabs.tsx` — tab shell
- `seo-overview-panel.tsx` — health score, trends, issue counts
- `seo-meta-manager.tsx` — meta + social previews
- `seo-keywords-panel.tsx` — focus keyword analysis
- `seo-schema-builder.tsx` — schema types + JSON-LD validation
- `seo-sitemap-robots.tsx` — sitemap + robots.txt manager
- `seo-redirect-manager.tsx` — redirect CRUD + import/export
- `seo-404-monitor.tsx` — 404 log + quick redirect
- `seo-reports-panel.tsx` — reports + export
- `seo-project-settings.tsx` — project/domain/integration config
- `seo-local-extended.tsx` — extended local SEO fields

### Admin
- `app/admin/seo/page.tsx` — cross-tenant SEO health overview
- Admin nav entry under Infrastructure

### API
- `app/api/seo/404/route.ts` — privacy-safe 404 logging endpoint

---

## Compatibility Rules
- All V5–V9 tables and routes preserved
- `SeoAuditResult` backward-compatible; V10 fields additive via `SeoV10DashboardData`
- RLS: company members see own projects; `is_platform_admin()` sees all
- No Rank Math source copied
- Crawl uses existing page inventory + optional HTTP fetch (no external crawler dependency)

---

## Implementation Order
1. Migration + grants
2. Types + services
3. Server actions
4. Dashboard tabs + panels
5. Admin overview
6. Typecheck / lint / build
