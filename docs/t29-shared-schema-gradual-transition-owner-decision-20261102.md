# T29 — Owner-approved shared V1 target and gradual transition approach

Date: 2026-11-02. Owner chose the FaraiOS V1 shared data structure for Shalean and Bokkie, keeping both existing live legacy databases separate, and requested incremental, low-disruption transition. Owner confirmed **“yes”** to recording this as a T29 migration approach in PR #306 and the canonical tracker.

## Approved architecture and migration approach
- Reuse existing FaraiOS V1 common schema for customers, bookings, staff, quotations, invoices, payments and recurring services; **do not introduce new features or rebuild the schema merely for migration**.
- All FaraiOS business-owned records retain trusted immutable business ownership with row-level and API authorisation. Sharing the schema is not permission to share records, staff membership, customer links, providers or private notes.
- Current Shalean and Bokkie production databases, attachments, historical records and existing schedulers remain physically separate and authoritative until **individual, separately approved future cutovers**.
- Rehearse into an authorised isolated non-production copy with independent source/attachment backups, verified restore, exact source-ID crosswalk, explicit financial/provider proofs, future visits, tenancy denial, no outbound effects and rollback/repeatability evidence.
- Plan future change in bounded, reversible, business-by-business and flow-by-flow units; no uncontrolled dual writers, duplicate cron/recurrence, settlements, invoices, messaging or payouts. No promise of completely invisible customer impact without checks and monitoring.
- Preserve approved T28 legacy dispositions and exceptions: Shalean 13 active schedules/85 future visits, unmatched Paystack record and Auth/CRM-unlinked booking; Bokkie five historical groups/13 related bookings plus ungrouped case, 20 credits incl R64.75 and R50 discrepancy, 15 historical large quotations, and blog-images content.

## Strict limits of this decision
This is **target-architecture and migration-plan approval only**. It does not authorise any current production modification, source export, production/tenant cutover, staging import, hosted restore, DNS/route switch, new dual-write mechanism, financial/provider action, notification, deployment, destructive reset, use of port 5432, T30 work, or T29 acceptance. G29-01 backup/attachment recovery and Bokkie authorised access remain NO-GO until proven. Exact T29 canonical requirement remains 'Import copies into staging and reconcile'; acceptance 'Counts, financial totals and future bookings match'.

Status: T29 In progress, PR #306 Draft, T30 Not started.
