# T29 — Isolated migration rehearsal contract and blocking register
Date: 2026-11-02. Status: SOURCE-ONLY PREPARATION; IMPORT NO-GO; NOT ACCEPTANCE READY.

## Canonical contract
Read directly from Build Tracker row 30 on 2026-11-02:
- Deliverable: Migration rehearsal.
- Work: Import copies into staging and reconcile.
- Acceptance: Counts, financial totals and future bookings match.
- Dependency: T28 (Done 2026-11-02, mapping-only staging acceptance).
- T29 initially Not started. T30 must not commence.

This document cannot replace a real isolated import or recovery proof. All PASS claims must cite run-bound evidence, not T28 estimates, source-code tests alone, or draft PR status.

## Source of truth and accepted T28 disposition
Use `docs/t28-final-feature-record-coverage-matrix-20261102.md`, `docs/t28-owner-staging-acceptance-20261102.md`, `docs/t28-required-field-crosswalk-20261102.md`, `docs/t28-exceptions-01-owner-approval-20261102.md` and the retained-source decisions on PR #305. PR #305 remains Draft and unmerged as observed on 2026-11-02; its branch is evidence, not deployed application functionality.

Shalean: 13 active recurrence schedules and 85 future linked visits stay with original scheduler, one unmatched Paystack transaction and one Auth-linked booking/CRM-unlinked relationship stay under EXCEPTIONS-01. No replacement recurrence writes or inferred payment/CRM links.
Bokkie: five historical recurring groups and 13 grouped bookings plus one ungrouped case, 20 credit accounts (R64.75 positive, unresolved R50 historic gap), 15 large legacy quotations, and blog-images storage all stay source-authoritative. Never call historical credit update functions.
All monetary source amounts, status history, assignment, ownership, quotation documents, invoice/payment references and obligations must be retained without reclassification by guesswork.

## Required isolated execution topology (no runtime authorisation yet)
1. Owner approves exact non-production source backup snapshots and protected object manifests for Shalean and Bokkie. No uncontrolled export of private data to GitHub/CI. Record immutable snapshot identifiers, capture timestamps/timezones, source schema revisions, key custody and cryptographic digests in a private evidence location; only non-secret hashes/counts in PR.
2. Independently restore both DB backups and required objects into authorised *disposable, physically separate* non-production resources; demonstrate decrypt and object retrieval, failed access for unauthorised actors and destruction/recreation. Staging must not be reset or overwritten while it hosts existing accepted T01–T28 evidence. No Supabase port 5432 connections.
3. Before import, disable and verify absence of all outbound notifications, Paystack/Zoho/EFT sends, invoicing, refunds, payouts, recurring writers, scheduled workers and webhooks in the rehearsal execution environment. Read-only mocks alone are not enough for negative-side-effect proof; network/credential denies and logs must corroborate.
4. Import only into isolated target with trusted server-side business membership and immutable business ownership. Each key is (source_system, source_table, source_primary_key) -> (target_business_id, target_table, target_primary_key), unique in both directions as applicable. Do not merge Shalean and Bokkie source identities or join by email/phone. Keep unresolved FK records and associated original evidence in a quarantined manifest, not invented target links.
5. Money: parse canonical decimal ZAR exactly and convert to integer cents without float rounding; reject invalid scale/precision and any unexplained totals. Dates: preserve original local date/time, timezone and UTC interpretation with ambiguous/invalid entries quarantined. Status: explicit approved enumeration table; original source status remains attached for review. Never infer provider-confirmed payment from source UI status.
6. Compare snapshot-bound exact row counts and per-family sums by tenant, status, currency and liability class. Independently corroborate provider settlement/reference IDs and prevent duplicate invoice/payment/payout/credit posting. Historic credit balances and the R50 discrepancy must not be auto-adjusted.
7. Compare all 13 Shalean active schedules and 85 future linked visits by original ID/date/obligation; no new visit generation. Compare Bokkie five historical groups, 13 linked bookings and one ungrouped case without converting them into active schedules; prove original booking/quote/credit histories persist.
8. Export privacy-safe reconciliation report with per-family count, cents totals, future-visit IDs/dates, unresolved FKs, original/target hashes and exceptions, every row attributed to source snapshot and tenant. All mismatches fail acceptance unless owner explicitly approves a separate bounded exception; T28 exception approval alone is not evidence of an imported match.
9. Prove rollback by dropping only authorised disposable target resources, restoring clean baseline, repeating import from identical snapshot and comparing canonical digests. Never delete or mutate source systems or existing staging data.

## Evidence gates — all currently NOT VERIFIED
| Gate | Evidence required | Current result |
|---|---|---|
| G29-01 | Owner-scoped backup DB/object manifests and successful restore/retrieve for both | NO-GO: T28 has metadata, not proven protected restore |
| G29-02 | Exact source snapshots and access/authority for both, Bokkie connector or authorised private export | NO-GO: Bokkie source schema/aggregates owner-supplied, direct session access missing |
| G29-03 | Approved executable mapping, identity/FK/money/date/status transformations and provenance | NO-GO: T28 family-level maps, not exhaustive validated transforms |
| G29-04 | Isolated non-production target and outbound-worker/provider deny tests | NO-GO: not provisioned or verified |
| G29-05 | Per-business row counts and money/liability/provider settlement reconciliation | NO-GO: independent provider evidence missing |
| G29-06 | Shalean future visits, Bokkie historical groups/quotes/credit continuity | NO-GO: no import performed |
| G29-07 | Source immutability, business access denial and cross-tenant isolation | NO-GO: no run-bound before/after proof |
| G29-08 | Destructive-only-disposable rollback, clean repeat-run digest equivalence | NO-GO: no authorised rehearsal |

## Test cases required before acceptance
- Duplicate import same source key must be idempotent; conflicting key with a different business must hard fail.
- A Bokkie-only member must be denied access to Shalean rows (and vice versa) by database RLS and authenticated API, not merely UI filters.
- One unauthorised reviewer must not retrieve private attachments or view protected evidence.
- Foreign keys with no verified CRM relationship, and Paystack references without verified targets, remain quarantined with full source provenance.
- Amount decimal conversion exact; reject negative/invalid money forms according to original field contract; do not silently equate gross billing to settled cash.
- Missing attachment, changed source snapshot, ambiguous timezone, unknown status, duplicate provider reference or inconsistent credit ledger must prevent a PASS.
- Compare initial and repeated import digest; compare before/after source fingerprints; prove no event/job was sent.
- Failure halfway through must roll back target-only writes and leave both source systems intact.

## Explicitly blocked
No permission to copy production databases, download private attachments, create/restore hosted backups, alter source controls or modify currently shared staging resources has been established for this T29 run. No GitHub-hosted workflow should contain private exports or keys. Do not use Supabase port 5432. No production release, settlement, refund, invoice, notification, job scheduling, T30 or Done tracker state.

## Acceptance handoff
Only after G29-01..08 have measured PASS evidence: list isolated resource ID, run ID, source snapshot IDs/hashes, code SHA, import/reconciliation count and cents summary, provider-backed settlement evidence, future booking comparison, mismatch register, RLS/API denial, disabled-worker evidence, rollback/repeat digest, source no-change fingerprint and staging browser checks if applicable. Obtain explicit owner T29 staging acceptance *before* marking Done and read tracker back.