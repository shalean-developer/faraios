# T28 — Feature and record mapping baseline (2 November 2026)

## Authority and boundary
Canonical tracker T28: Stage 06 Pilot and migration; **Feature and data mapping**; compare existing sites and all record types with V1; acceptance **every required feature mapped or transition agreed**; depends on T27. Direct tracker read on 2026-11-02: T27 Done (2026-11-02; PR #304), T28 Not started. This file is a source-based initial inventory, **not** a complete live-data inventory or approval to migrate. Existing Shalean/Bokkie systems are authoritative until separate approved cutover. T29 rehearsal is excluded.

Source refs: AGENTS.md, docs/blueprint.md, docs/cleaning-rule-contracts.md, docs/t19-item-mapping-20261031.md, docs/t25-customer-portal-20261101.md, docs/t27-source-qualification-20261102.md and current staging database/ modules. Historical documents may contain superseded status; tracker/current merged source govern.

## Feature inventory
State legend: **Implemented** = existing FaraiOS V1 capability evidenced by source/accepted T01–T27; **Verify source** = existing legacy behaviour/record source or equivalence not confirmed by authoritative read; **Decision** = explicit owner-approved transition needed. 'Implemented' is not a claim of identical legacy behaviour.

| ID | Required existing-functionality area | Existing source to inventory (read only) | V1 destination / reusable capability | Mapping/transition and evidence gap | Business owner | Readiness |
|---|---|---|---|---|---|---|
| F01 | Public Shalean website and booking funnel | Shalean live website booking pages/API and provider records; inventory routes, forms and status semantics | T25 per-business `/b/<slug>` booking page/customer entry | Compare page behaviour and SEO links; preserve live website; decide redirect/link/cutover only later | Shalean owner | Implemented V1; verify source |
| F02 | Public Bokkie website and booking funnel | Bokkie live site/Plesk and booking source | T25 per-business booking page/customer entry | Preserve existing website/identity; verify forms and bookings are owned by Bokkie | Bokkie owner | Implemented V1; verify source |
| F03 | Office customers, business notes, addresses | Both offices, databases and exported schema | T12/T13 customer/address records, T25 relationship linking | Never cross-merge by email; verified identity link only; business-owned notes | Each business owner | Implemented V1; verify source |
| F04 | Services, catalogue, extras, quote/assessment | Existing price lists, service pages, quote records | T15–T16 cleaning profiles, quote/assessment and catalogue | Versioned per-business price, unit, tax, assessment and accepted snapshot mapping; Bokkie never inherits Shalean rates | Each business owner | Implemented V1; verify source |
| F05 | One-off bookings and booking history | Live bookings/office records, cancellations, reschedules | T14–T16 booking lifecycle, T25 customer history | Map original IDs, occurrence/timezone, workflow statuses, scope, price snapshots and audit trail | Each business owner | Implemented V1; verify source |
| F06 | Recurring schedules and future visits | Live recurring plans and generated bookings | T17 recurrence/visit snapshots | Preserve existing visits and price locks; no regeneration/repricing or duplicate visit creation | Each business owner | Implemented V1; verify source |
| F07 | Staff, teams, assignments, travel, progress | Legacy worker/roster/assignment data | T18 staff teams/availability; T24 cleaner portal | Explicit memberships, assignment history, shared-staff busy-only visibility; no leakage of customer details | Each business owner | Implemented V1; verify source |
| F08 | Invoices, tax, payment state and Zoho | Per-business invoicing, Zoho Books, provider transaction references | T19 Zoho Books, T20 Paystack, T21 EFT | Map invoice IDs, provider org/connection, VAT/rates, paid/refunded/cancelled states; no synthesized receipt or invoice | Each business owner | Implemented V1; verify source |
| F09 | Earnings and monthly settlements | Legacy earnings/payroll/payout ledger, bank references | T22 earnings, T23 review/freeze/approve/payout evidence | Versioned rules and frozen settlement references; preserve payment proofs; no bank action | Each business owner | Implemented V1; verify source |
| F10 | Customer and cleaner accounts/portals | Legacy authentication and portal records | T24 cleaner portal, T25 customer portal | Independently verify ownership, memberships and legacy account access; do not import credentials | Each business owner | Implemented V1; verify source |
| F11 | Notifications and failed jobs | Legacy providers, templates and delivery evidence | T26 queue/delivery/failed-job controls | Map consent, delivery history, retry keys; do not resend on import | Each business owner | Implemented V1; verify source |
| F12 | Reports and combined business oversight | Legacy office/Zoho summaries and dashboards | T27 read-only reports | Match date/status/metric definitions, distinguish online credits vs EFT vs invoice revenue; combined only if authorised | Each business owner | Implemented V1; verify source |
| F13 | Admin access, tenant boundaries and integrations | Legacy roles, business ownership, credential custody | T02–T11 membership/RLS/audit/backup, T19–T27 scoped services | Explicit owner/manager/staff/customer scope; platform no implicit data access; never copy secrets | Each business owner | Implemented V1; verify source |

## Record-type mapping (discovery register, not a proven exhaustive source catalog)
For each record type the source system/schema/table names, record counts, source extract format, timestamp and evidence digest must be obtained per business **read-only** before marking source coverage verified. Mapping field defaults are prohibited where ownership, money, identity, or status would change.

| ID | Source record family to verify separately for Shalean and Bokkie | FaraiOS V1 target family | Required transformation / reconciliation |
|---|---|---|---|
| R01 | Business and operational settings | businesses, service configurations | Stable business ownership; explicit per-business settings; no inferred common rules |
| R02 | Owner/manager/staff membership and customer login | identities and business memberships; customer relationship links | Independently verify auth subjects; no email-only matching or credential import |
| R03 | Customers and private customer notes | business-owned customers and notes | Source ID→target ID crosswalk scoped by business; preserve private notes and duplicates for review |
| R04 | Property/service addresses | customer-owned addresses | Preserve exact address components and owner linkage; do not geocode into a new authority silently |
| R05 | Services, catalogue lines, extras, assessment | versioned catalogue and cleaning assessments | Preserve units, VAT, prices, assessments, snapshots; map Zoho items explicitly if applicable |
| R06 | Quotes and approvals | quotes and acceptance evidence | Preserve original price/version, acceptance actor, expiry, tax and line amounts |
| R07 | Single bookings, cancellations, reschedules | bookings/status/audit | Source IDs, timezones, sequence of states, histories, immutable price snapshot |
| R08 | Recurrence rules and occurrence bookings | recurring schedules + immutable visit references | Preserve generated_through, cadence, exceptions and visit IDs; detect overlaps/duplicates |
| R09 | Staff profiles, rosters, team assignments, attendance/work | staff, memberships, team and assignment/progress records | Shared staff requires explicit dual membership; respect cross-business occupied-time privacy |
| R10 | Issued/draft invoices and Zoho synchronisation | invoices + provider bindings | Match business/org, tax, currency cents, invoice number, lifecycle and source document |
| R11 | Paystack charges/refunds and EFT evidence | payment events, clearing, EFT receipt/allocations | Provider event/transaction idempotency; distinguish unverified, settled and allocated amounts |
| R12 | Earnings, adjustments, eligibility | accrual and adjustment journals | Versioned rules, eligible work, cents, allocation and immutable history |
| R13 | Payout batches, bank transfers and references | settlement batches and payout evidence | Freeze/approval/transfer state; no duplicate settlement; bank proof and exact totals |
| R14 | Portal relationships, consent, delivery history, failures | portal access + notification queue/evidence | Verified subject relationship, retention/consent, original message IDs; never replay deliveries |
| R15 | Audit/history, reporting source facts | immutable audit and T27 report inputs | Preserve actor, date/time, business owner, event causality; reconcile per business, not by summed gross flows |
| R16 | Files, attachments, images and supporting documents | approved scoped file/document references (target existence to verify) | Inventory blob metadata, source ACLs/checksums, expiry, lawful retention; no guessed file import |
| R17 | Historical, active and future records for every family | corresponding V1 records | Classify by cutover boundary; retain source lineage, tombstones and original references |

## Universal crosswalk/validation contract
A future rehearsal mapping must include: source_system, source_business, source_record_type, source_record_id, source_updated_at, source_payload_schema_version, target_business_id, target_record_type, proposed_target_id, relationship_keys, authoritative_state, transformation_version, mapping_decision_id and reconciliation_method. Crosswalk identities must be unique within (source_system, source_business, source_record_type, source_record_id); never deduplicate across Shalean/Bokkie or by email/phone. Preserve immutable snapshots, currency minor units, local timezone plus instant, per-record reason and source checksum where available.

Reconciling by counts alone is insufficient: use counts by business/type/status/time window, source→target key uniqueness, orphan references, future booking dates/occurrences/assigned staff, zero unapproved duplication, invoice currency/tax/line totals, verified provider payments, EFT allocations, earnings and payout frozen totals. Distinguish outstanding/issued invoices from mere provider-sync status. Audit denials for cross-business access; verify source and target read-only snapshots with stable digests. Exclusions and deferrals need owner approval.

## Decisions and open gaps (all block a claim of final T28 completeness)
| Gap | Owner | Required evidence / decision | Acceptance impact |
|---|---|---|---|
| G01 | Shalean owner | Actual production website/office feature list, schema, record type inventory, API/export feasibility and read-only snapshot counts | Feature/record exhaustiveness unproved |
| G02 | Bokkie owner | Same independently for Bokkie, including legacy identity and ownership linkage | Business separation and completeness unproved |
| G03 | Each business owner | Cutover treatment for historical vs active vs future appointments; source authority, freeze and exception/rollback criteria | Transition not agreed |
| G04 | Each business owner | Whether legacy-only features or records have a direct V1 match; explicit accepted archive/retain/replace/omit choice per unmatched item | “Mapped or transition agreed” not met |
| G05 | Each business owner | Customer duplicates, unverified portal identities, inaccessible records and invalid references policy | Must not guess identity |
| G06 | Each business owner + financial operator | Exact invoice/Zoho/Paystack/EFT/earnings/payout reconciliations, historic tax and disputed balances | Monetary equivalence not yet demonstrated |
| G07 | Each business owner | File/document coverage, source permissions, retention and audit-history treatment | Some record families may be missing |
| G08 | Technical operator | Read-only source schema/export list, record counts/digests and approved extraction method (HTTPS/API only; no Supabase port 5432) | Inventory not validated against authoritative data |

## Read-only validation gates
1. Verify source inventories for each business independently, including every page/workflow and actual record-type listing.
2. For every F/R row assign a concrete exact source and destination, a testable rule, status and evidence reference; split any row containing distinct source types.
3. Reconcile source counts and status categories, crosswalk uniqueness, relationships and money with discrepancy register; no staging import in T28.
4. Obtain explicit written owner decision for every unsupported feature and non-direct mapping.
5. Re-run the read-only coverage check and confirm no records, payments, notifications, providers or deployments changed.
6. Publish final acceptance evidence and request explicit T28 staging acceptance; only afterward update canonical tracker to Done. Never start T29 here.

**Status:** Source-based baseline prepared, **T28 acceptance NOT READY**. No production source or provider data read, extracted or changed by this document.
