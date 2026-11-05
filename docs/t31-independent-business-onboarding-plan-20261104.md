# T31 — Independent cleaning business onboarding: source review and implementation contract

Date: 2026-11-04. Source baseline: staging `e979e5ef03e84e8c0a8946afc71db9af4c97ee60`. Canonical Build Tracker: T30 Done (2026-11-04), T31 Not started, T32 Not started; decision D16 Approved. This document is **preparation, not implementation or acceptance evidence**.

## Bounded scope
A new independent cleaning business owner must self-register with Supabase Auth, safely bootstrap a uniquely identified business and active owner membership, finish business profile/branding/contact/service areas/hours, configure services/extras/prices, invite team members with explicit business roles, and access only that business dashboard. No Shalean/Bokkie historical imports, defaults, credentials, staff, prices, or obligations. T32 hosted widget, T33 payment/accounting connection, T36 subscription administration are separate.

## Verified source baseline
- `database/identity-draft.sql`: `businesses` UUID identity, `business_memberships` compound primary key, RLS read-only client grants; **no client INSERT**; documentation explicitly defers audited provision/invite workflow.
- `src/auth-session.js`, `src/identity.js`, `src/access.js`: Supabase password sign-in, revalidation of active membership, server-side permission checks; no public owner signup.
- `src/staging-server.js`: staging sign-in and business-specific workspace routes; sign-in page explicitly says accounts are provisioned in staging.
- `src/business-settings.js` and `database/business-settings-draft.sql`: business-owned contact details, service areas, working days, timezone and opening times, owner RLS and audit.
- `src/catalogue.js`, `database/catalogue-draft.sql`: tenant-specific service/extra price CRUD, optimistic version checks, RLS/audit.
- `src/staff-teams.js`, `database/staff-teams-draft.sql`: staff profiles and teams require pre-existing active membership; **not** invitation/bootstrap.
- `src/dashboard.js` contains demo Shalean/Bokkie personas and is **not** a generic provisioning implementation.
- Existing public profile branding and invitation lifecycle, actual deployed database grants/policies, and live end-to-end new-tenant path require separate inspection and testing before claims of readiness.

## Proposed smallest complete source changes
1. Introduce a dedicated `src/onboarding.js` parsing/validation and rendering module; add minimal owner signup, workspace-creation, setup-status and invitation routes to `src/staging-server.js`, without bypassing existing session and workspace access checks. Add no framework.
2. Add a staged, **unapplied** SQL migration candidate for atomic `create_business` authenticated RPC. Use `auth.uid()` only; never trust submitted owner ID or membership. Generate business UUID in PostgreSQL, insert business + owner membership + minimal settings + audit in one transaction. Set tight function ownership/search_path/EXECUTE grants; prevent direct client writes and platform-admin implicit membership. Use a durable authenticated-request idempotency key, unique by requester, with replay returning the same business ID and mismatched payload rejection.
3. Use a separate owner-authorized invitation lifecycle with cryptographically strong single-use opaque tokens or Supabase Auth invitation semantics, bounded expiry, recipient binding and no role grant before verified acceptance; assign membership only after authenticated identity proves the intended recipient. Avoid sending outbound invitations in staging until independently authorized; allow deterministic synthetic invite acceptance with a disabled-outbound test adapter.
4. Reuse `business_settings`, `business_catalogue`, staff profiles, audit history, and the existing dashboard. Extend branding only with safe allowlisted data, no arbitrary HTML/remote credential fields. Define onboarding progress from persisted authoritative state rather than trusting a client checkbox; support retries and incomplete setup.
5. Separate schema changes from deployment approval; no staging migration, service restart, email send, payment/Zoho calls, production changes or merge through this branch.

## Security and acceptance matrix — not yet passed
- Native PostgreSQL: unauthenticated create denied; owner user ID forged/ignored; UUID immutable; two concurrent submissions/idempotent replay create exactly one business and owner membership; failure rolls back both; idempotency payload mismatch denied; public table writes and grant escalation denied; own tenant allowed, every other tenant denied; manager/staff/platform admin cannot grant owner.
- API: unauthorized route access; fake business ID; invalid/expired invite; wrong recipient; duplicate invite/accept; revoked membership; malformed input; overlong values; predictable/conflicting slug if introduced; CSRF, request size and abuse rate limits; no sensitive data leaked in error messages.
- Synthetic E2E: fresh third company sign-up, login, workspace creation, profile/branding/service areas/hours, catalog + extras, staff invite/accept/role management and dashboard access without manual SQL or privileged support. Confirm Shalean/Bokkie and unrelated third company inaccessible.
- Latest-head GitHub CI including native PG plus regression; owner-authorized staging test; read-back of tenant counts, audit trail, preservation/no-outbound evidence and rollback plan. No acceptance before all checks pass.

## Gating
Source preparation and a Draft PR may proceed. Any database migration, merge, deployment, live outbound invitation or financial/provider activation requires distinct explicit owner authorization. T31 stays Not started in the canonical tracker until a planned update to In progress is expressly made; never mark Done without owner staging acceptance. T32 stays Not started.
