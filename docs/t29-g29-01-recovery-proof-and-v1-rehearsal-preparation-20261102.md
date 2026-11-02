# T29 — Shared V1 isolated rehearsal preparation and recovery proof specification
Date: 2026-11-02. State: SOURCE ONLY; NO IMPORT AUTHORISED.

## Canonical requirement
T29: import copies into staging and reconcile. Acceptance: counts, financial totals and future bookings match. T28 mapping acceptance does not prove recoverability or field-level compatibility.

## Verification performed
- Supabase get_project for Shalean `paqjwfulwywtsyyvdxrq`: ACTIVE_HEALTHY. This is project health, **not a verified backup**.
- Supabase get_project for Bokkie `scsrxogumimsrtbnqeas` via connected Shalean account: permission denied. No current authenticated source backup check possible.
- Supabase get_project for FaraiOS restore-test `zrlojsvkqipuwkkyfrkn`: ACTIVE_HEALTHY, not proof of isolation or restoration.
- Current connected Supabase tools do not expose a backup inventory/download/restore verification action. No claim that any backup is accessible or recoverable is supported.
- Prior G29-01 read-only inventories and owner authorisations remain recorded in T29 documents on this branch.

## Required private, per-business recovery evidence (NO-GO until demonstrated)
For EACH of Shalean and Bokkie:
1. Owner-confirmed authorised source project, source schema revision, backup class (logical/PITR/snapshot), snapshot creation timestamp (UTC), retention/expiry and access permissions.
2. Protected independently recoverable database backup stored and verified with checksum and key accessibility; no credentials, personal data or backup contents committed to GitHub.
3. Protected storage attachment inventory and actual byte-level retrieval of a permitted sample to isolated private storage, including private bucket permissions.
4. Successful restoration into an owner-authorised disposable NON-PRODUCTION target, integrity counts and FK checks, and source no-change evidence.
5. Restoration result bound to snapshot ID, data version, verifier, timestamp, target ID and evidence digest. Do not publish customer-identifying rows.
6. Non-overlapping tenant storage and separate recovery paths; apply Shalean's verified PROCEDURE to Bokkie only after Bokkie-specific source access is granted. The backup itself must be Bokkie's own.
Any missing field => G29-01 = NO-GO. Independent restore was NOT performed here.

## Isolated V1 rehearsal plan (preparation, NOT execution)
Target is the current FaraiOS V1 tenant-owned schema, not a new parallel app or finance module. Reuse its existing customers, addresses, bookings, staff, quotes, invoices, payment evidence and recurrence structures; reject any missing required field contract instead of silently mutating the destination schema.

- Protected preflight: prove current T07 restore-test guard and T19/T20 protected evidence are preserved; use a **separate disposable target** or obtain specific no-overwrite authorisation before changing restore-test. No database reset has been authorised.
- Capture read-only schema metadata from independently authenticated Shalean, Bokkie and the exact V1 staging schema. Field-to-field crosswalk must include original source system/table/key, destination business ID, table/key, FK provenance and quarantine reason.
- Approved conversions only: exact ZAR integer-cents, timezone-aware original date/time, original lifecycle/status, full invoice/quote price and line snapshot, no inferred payment-provider confirmation. Unknown or conflicting joins remain unresolved.
- Verify business-specific source records: Shalean 13 active schedules/85 future linked visits and both EXCEPTIONS-01 held records. Bokkie five historical recurring groups/13 bookings plus one ungrouped, 20 credit balances and R64.75 liability with unresolved R50 ledger discrepancy, 15 large quotations and blog-images objects.
- Freeze live outbound channels in rehearsal through independent egress/credential denies: no invoices, Zoho/Paystack posts, refunds, payouts, messages, scheduled recurrence or jobs.
- After authorised import only: per-business exact count and financial totals with independent provider evidence; exact future bookings identity/date comparisons; cross-business RLS/API denial; repeat import digest equivalence and disposable-only rollback/recovery; source hash stability.
- Preserve legacy Shalean and Bokkie as separate live systems and only authoritative writers. Granular future cutovers each need separate explicit approval; no T30 or production deployment.

## Status and next owner action
G29-01 FAIL CLOSED. Bokkie authorised project access and independently verifiable backup/restore proof for both sources are blockers. Request owner-provided non-secret backup configuration/retention screenshots or authorised native connector access; never request passwords or backup bytes in chat. No import, restore, storage copy, source modification, Supabase 5432, CI private exports or deployment occurred.
