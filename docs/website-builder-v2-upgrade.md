# FaraiOS Website Builder V2.0 — Upgrade Audit

**Status:** Phase 2 complete — editor depth shipped  
**Principle:** Upgrade, not rebuild — preserve V9 builder, legacy hosted sites, booking, SEO, CRM, and publishing.

---

## 1. Existing features (inventory)

### Company dashboard — Website hub
| Feature | Route / component | Data |
|---------|-------------------|------|
| Overview hub | `app/[company]/dashboard/websites/page.tsx` | `business-websites`, checklist, tracking |
| External connection | `websites/connection` | `connected_websites` |
| Domains (V4) | `websites/domains` | `website_domains`, DNS |
| API keys | `websites/api-keys` | `business_api_key_events` |
| Tracking | `websites/tracking` | `website_tracking_events` |
| Deployments | `websites/hosting` | `website_deployments` |
| Hosting plan | `dashboard/hosting` | `hosting_subscriptions` |
| Legacy create/edit | `websites/create`, `websites/[id]/edit` | `websites`, `website_content` |

### V9 self-serve builder (`builder_mode=true`)
| Feature | Route | Actions |
|---------|-------|---------|
| Builder dashboard | `builder/` | `initializeWebsiteBuilderAction` |
| Pages (text edit) | `builder/pages` | `updateLandingPageAction`, `regenerateLandingPageAction` |
| **Page Builder V2** | `builder/page-builder` | `updatePageSectionsAction` |
| Service pages | `builder/service-pages` | `saveServicePageAction` |
| Contact / Forms | `builder/contact` | enquiries inbox |
| Booking CTA | `builder/booking` | `updateBookingButtonAction` |
| SEO | `builder/seo` | `updateWebsiteSeoAction` |
| Publish | `builder/publish` | `publishWebsiteAction` |
| Domains (builder) | `builder/domains` | `updateDomainSettingsAction` |
| Enquiries | `builder/enquiries` | `markEnquiryReadAction` |
| Preview | `builder/preview` | in-dashboard iframe |
| Theme (V2) | `builder/theme` | `updateWebsiteThemeAction` |

### Public rendering
| Surface | Path | Renderer |
|---------|------|----------|
| Builder public site | `/site/[businessSlug]` | `PublicSite` (+ section renderer when `schemaVersion: 2`) |
| Service pages | `/site/[slug]/services/[serviceSlug]` | `PublicSite` |
| Legacy tenant | custom domain | `tenant-site.ts` + `ServiceBusinessTemplate` |
| Legacy preview | `/preview/[id]` | `preview-website.ts` |

### Integrations (working today)
- **Booking:** CTA → `/book/{companyId}`; widget snippets for external sites
- **SEO:** per-site meta on `websites`; growth SEO dashboard; SEO V10 platform (separate `website_url`)
- **CRM:** `website_enquiries` → notifications
- **Business profile:** landing auto-generation from company + `company_services`
- **Plan gating:** `lib/website-builder/access.ts` + `nav-filter.ts`

---

## 2. Dual architecture (must preserve)

| System | Tables | Public URL |
|--------|--------|------------|
| Legacy hosted | `websites`, `website_content` | Custom domain / preview |
| V9 builder | `websites` (`builder_mode`), `website_pages`, `website_service_pages` | `/site/[slug]` |

**Conflict to resolve in V2:** two `publishWebsiteAction` implementations (`website-builder.ts` vs `websites.ts`). V2 should consolidate behind one publish pipeline with deployment records.

---

## 3. Missing features vs Wix / Squarespace / Webflow

| Area | Current | V2 target |
|------|---------|-----------|
| Visual editing | 3 text fields on Pages | Drag-and-drop sections, split preview |
| Multi-page | Single landing row | Page manager + nav builder |
| Hero | Headline + subheadline | Full hero builder (background, CTAs, badges) |
| Theme | JSON in DB, limited UI | Visual theme editor |
| Media | Legacy upload only | Media library with folders, ALT, crop |
| Templates | One layout | Industry template library |
| Forms | Fixed contact form | Drag-and-drop form builder |
| Blog | Growth content module | Integrated blog builder |
| Analytics | External tracking only | Per-page metrics in builder |
| AI | Platform AI elsewhere | In-builder rewrite, SEO, FAQ |
| Versions | None | Draft history + restore |
| i18n | None | Multi-language pages |
| Custom code | None | HTML / component slots |

---

## 4. Components to reuse

| Component | Path | V2 role |
|-----------|------|---------|
| `PublicSite` | `components/website-builder/public-site.tsx` | Render target; extend with section registry |
| `PublicContactForm` | same folder | Forms + enquiries |
| `BuilderLockedCard` | same folder | Plan gates |
| `WebsiteBuilderClient` | same folder | Section hosts; split into modules |
| `load-page.tsx` | `builder/load-page.tsx` | Server data loader pattern |
| `website-setup-checklist` | `components/websites/` | Onboarding |
| `connected-website-panel` | `components/company/` | External sites |
| `website-content-editor` | `components/websites/` | Legacy migration reference |
| `website-image-upload-field` | `components/websites/` | Media library seed |
| SEO dashboard | `app/.../seo/` | Reuse services, do not duplicate |
| Growth content | `app/.../content/` | Blog bridge |

---

## 5. Components to upgrade

| Component | Change |
|-----------|--------|
| `website-builder-client.tsx` | Split per section; Rise layout shell |
| `PagesSection` | Page list + link to Page Builder |
| `PublicSite` | Block/section renderer when `sections[]` present |
| `DomainsSection` | Wire V4 `website_domains` engine |
| `PublishSection` | Deployments + staging URL |
| `SeoSection` | Link SEO V10 + per-page fields |
| `company-nav.ts` | V2 builder navigation catalog |

---

## 6. New components (V2 foundation)

| Component | Path | Status |
|-----------|------|--------|
| Section types | `types/website-builder-sections.ts` | ✅ |
| Section catalog | `lib/website-builder/section-catalog.ts` | ✅ |
| Page content utils | `lib/website-builder/page-sections.ts` | ✅ |
| Dynamic placeholders | `lib/website-builder/dynamic-placeholders.ts` | ✅ |
| Page Builder editor | `components/website-builder/page-builder/` | ✅ |
| Section props editors | `page-builder/section-props-editor.tsx` | ✅ |
| Sortable section list | `page-builder/sortable-section-list.tsx` | ✅ |
| Builder history hook | `lib/website-builder/use-builder-history.ts` | ✅ |
| Section preview renderer | `components/website-builder/sections/` | ✅ |
| Builder layout shell | `components/website-builder/builder-layout.tsx` | ✅ |
| Theme editor | `components/website-builder/theme-editor.tsx` | ✅ |

**Planned (next phases):** template library, media library, navigation builder, form builder, version history, AI panel.

---

## 7. Database changes

### Existing tables (reuse)
- `websites`, `website_pages`, `website_service_pages`, `website_enquiries`
- `domain_settings`, `website_domains`, `website_dns_records`, `website_deployments`
- `connected_websites`, `website_tracking_events`
- `website_assets` storage bucket
- SEO: `service_area_pages`, SEO V10 tables
- Booking: `bookings`, company profile tables

### V2 content model (no migration required for phase 1)
Store in `website_pages.content` JSON:

```json
{
  "schemaVersion": 2,
  "sections": [ { "id", "type", "visible", "mobileVisible", "desktopVisible", "props" } ],
  "hero": { ... },
  "about": { ... }
}
```

Legacy `LandingPageContent` fields remain synced for backward compatibility.

### Recommended phase 2 migrations
1. `website_pages`: `sort_order`, `nav_visible`, `parent_page_id`
2. `website_page_versions`: snapshot JSON per publish
3. `website_media`: metadata (alt, tags, folder)
4. `website_components`: saved reusable blocks
5. `website_templates`: industry templates
6. Partial unique index: one `builder_mode` site per `client_id`
7. Deprecate `domain_settings` → `website_domains`

---

## 8. API / server action changes

| Action | Status | Notes |
|--------|--------|-------|
| `updatePageSectionsAction` | ✅ Added | Saves sections + syncs legacy landing fields |
| `updateWebsiteThemeAction` | ✅ Added | Site-wide theme JSON |
| `updateLandingPageAction` | Keep | Legacy text editor |
| `publishWebsiteAction` | Upgrade planned | Single pipeline + deployment |
| Pages CRUD | Planned | Multi-page manager |
| Media API | Planned | List/upload/delete assets |
| Preview token | Planned | Share unpublished drafts |

---

## 9. Navigation (V2)

Builder sidebar (`websiteBuilderNavItems`):

Dashboard · Pages · Templates · Page Builder · Components · Theme · Media · Navigation · Forms · Booking · SEO · Blog · Analytics · Domains · Publishing · Settings

Hub overview retains: Connection, Domains, API keys, Tracking, Deployments, Hosting plan.

---

## 10. Rollout phases

### Phase 1 — Foundation (current)
- Audit doc, section model, page builder split UI, hero editor, theme editor, V2 nav routes, placeholder sections for upcoming modules.

### Phase 2 — Editor depth ✅
- Full hero builder (animation, trust badges, statistics, reviews badge, WhatsApp)
- All 20 section type editors in Page Builder
- Drag-and-drop reordering (`@dnd-kit`)
- Autosave (2.5s debounce) + manual save
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z) + keyboard save (Ctrl+S)
- Live preview renders all section types

### Phase 3 — Platform integration (next)
- Media library, template apply, navigation builder, SEO V10 bridge, analytics on public site, publish snapshots.

### Phase 4 — Enterprise
- Multi-language, AI assistant, form builder, custom HTML, admin template management.

---

## 11. Validation checklist

- [ ] Legacy `websites/[id]/edit` still works
- [ ] `/site/[slug]` renders published builder sites
- [ ] Booking CTA and `/book/{id}` unchanged
- [ ] `updateLandingPageAction` still works for simple edits
- [ ] SEO fields on `websites` unchanged
- [ ] Enquiries pipeline unchanged
- [ ] Plan gating respected
- [ ] TypeScript + lint + build pass

---

## 12. Key file index

```
app/[company]/dashboard/websites/
app/[company]/dashboard/websites/builder/
components/website-builder/
components/website-builder/page-builder/
components/website-builder/sections/
lib/website-builder/
types/website-builder-sections.ts
app/actions/website-builder.ts
lib/constants/company-nav.ts
```
