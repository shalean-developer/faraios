# Business website production release — 14 November 2026

Owner authorization: “Deploy Business all we fix here.” This supersedes the earlier preview-only restriction for the application release. Release all PR22 homepage, owner-editable pages, SEO, contextual Privacy and booking-privacy fixes. It does **not** publish an existing business, copy preview records to live, activate live booking intake, submit forms, send emails or alter/delete existing records/history.

## Release preparation

Base production main a8082fd4a561820a286f17601d29a55d1f93f450; reviewed feature head40958ba plus the live-mode release adjustment in this change. Former preview-only website gates now allow the explicit preview/live environments for rendering, private editing/save/recovery, hero/social assets and standalone routes. Draft and published snapshots still remain separate by tenant/environment. Preview and private pages and every booking step remain noindex. Publishing remains an explicit, version-checked owner action.

The dynamic live sitemap now includes root plus Services, How it works, Areas and Contact for each published live snapshot; preview output remains empty. Native pagination test now checks2511 unique URLs from502 synthetic published businesses plus the platform home. No historical business is imported or automatically published. The demo remains a preview snapshot unless separately published by the owner.

All three optional validator migrations are already installed in faraios-new:20261114062432,20261114064032,20261114071849. No additional schema change or row backfill is required for this release. Existing gate baseline: enquiries live/preview true; booking requests live false/preview true. Keep these exact values.

## Validation

PASS release-specific native PostgreSQL17/PHP journey (tests/website-release.py): live editor exposes all controls; real multipart hero/social upload, save/reload, private draft preview/noindex, prepublication404, explicit local synthetic publication, all five live pages/indexability/canonicals/SEO/images, five-page sitemap coverage, changed draft/slug invisibility, second-owner denial and unchanged intake gates. This operates only on disposable local data, not hosted customer records.

PASS updated native SEO suite5, existing homepage/profile suite5, actual browser homepage and four-page navigation/custom content at1280/390/320, five-step booking state/reload/history/privacy-popup/draft isolation and policy navigation/focus/axe at1280/390/320. PHP syntax/whitespace checks pass. Previous unchanged-feature regression evidence remains in docs/business-homepage-preview.md and docs/privacy-context-preview.md.

No GitHub status checks or Actions workflows are configured on this repository (API returns empty inventories). Do not describe that as green CI; local/native/hosted evidence is the release validation.

## Deployment and verification plan

Update PR22 to the exact tested release tree, mark ready and merge with an expected-head lease. Production Git target is automatic main at /faraios.com. Inspect its actual pull/deployment state; if it has not updated, use only that scoped card's normal Pull now/Deploy now. Preview targets remain separate. Record the resulting merge SHA and hosted checks below.

GET-only production checks: platform root, updated policy/CSS and anchors, account signup/sign-in/private redirects and noindex, dynamic sitemap, missing/unpublished business/standalone pages404/noindex, preview noindex and existing preview booking entry. No hosted live business publication or record edits. Since there are currently zero live public snapshots, verify the live published-business journey with the disposable native test and disclose the limit; do not create a public fixture to manufacture a hosted PASS.

Compare all15 public-table full-row counts/fingerprints and both intake gate tables before/after. Preserve history. Capture the actual live owner editor if the existing session permits a read; never save or publish it during this verification.

## Rollback and limits

Application rollback baseline a8082fd is retained in Git. Do not restore older validators or delete optional document content. If users save the new optional fields, use a forward-compatible application correction or disable the affected new renderer/editor deliberately; do not silently strip those fields with an old editor.

FaraiOS legal entity/address/Information Officer and business-specific legal/retention facts remain unverified owner details, not fabricated content or a claim of complete legal compliance. Field Core Web Vitals/social crawlers/physical-device and screen-reader outcomes are not established by fixture lab checks. No existing live business is published by this deployment, and live booking intake remains disabled.

Production outcome and record-preservation checkpoint pending below.
