# P0-02 — Website Publishing Lifecycle

## Problem

The builder publish action previously set `websites.status = published`, stamped `published_at`, and published landing/service pages before proving that the candidate site could render or that its domain and SSL were ready.

## Implemented lifecycle

`publish_requested → validating_origin → validating_domain → validating_ssl → smoke_testing → live | failed`

A publish attempt stores an immutable snapshot in `website_publish_attempts`. The operational ledger is service-role only with RLS enabled.

## Gates

1. FaraiOS production origin is configured and HTTPS in production.
2. Candidate content renders successfully at `/preview/{websiteId}`.
3. A configured primary custom domain must be verified.
4. A configured primary custom domain must report active SSL and be HTTPS-reachable.
5. Only then are the website and pages switched to published.
6. The public `/site/{companySlug}` URL must return a successful response.
7. If the live smoke check fails, the previous website/page/service-page statuses are restored and the attempt is marked failed with the actionable error.

Draft and unpublish actions keep their existing semantics and do not require the live publish gates.

## Verification

CI must pass lint, typecheck, build and unit tests. Production completion additionally requires the migration to be applied to the FaraiOS Supabase project and a real publish attempt to finish in `live` after the HTTP checks.
