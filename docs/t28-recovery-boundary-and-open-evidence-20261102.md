# T28 — Read-only recovery boundary and remaining decisions (2 November 2026)

This is a T28 feature/data mapping closeout supplement, not a restore rehearsal or implementation. No data records, storage objects, credentials, permissions or production settings were modified.

## Verified source availability
- Connected Supabase get_project independently confirms Shalean production `paqjwfulwywtsyyvdxrq` ACTIVE_HEALTHY and FaraiOS staging `xdmfyrsauvqznkloroxg` ACTIVE_HEALTHY. Health state establishes project availability at the observation time, **not backups or recoverability**.
- The Bokkie production project reference `scsrxogumimsrtbnqeas` and its 43-table and one-bucket inventories are **owner-supplied**. It is not connected to this session's Supabase integration, so direct authenticated retrieval/recovery verification is unavailable.
- Shalean's five storage buckets/42 object metadata rows and Bokkie's public blog-images/24 object metadata rows were already recorded. No private object was accessed or restored.

## What remains NOT proven
1. For each legacy source, actual backup configuration/retention, successful recent protected backup, access to separate encryption keys where applicable, and authorized retrieval/restore evidence. T28 may record the planned retention/recovery dependency but cannot call it passed without evidence. **Do not perform T29 rehearsal here.**
2. Independent financial-provider settlement reconciliation and original document references where current source status is insufficient.
3. Shalean Auth-to-CRM booking exception and one Paystack booking-labelled transaction with no proven booking target: keep original rows, verified source links and named review ownership; no speculative correction.
4. Bokkie positive R64.75 credit servicing and historic +R50 gap: owner-approved retention/servicing policy but no authorized payout/refund or proved root cause.
5. Required-record field/identity crosswalks where legacy schema has alternative identifiers and incomplete proofs; source-name coverage does not imply complete field-level compatibility.

## Proposed safe closeout treatment
T28 acceptance criterion says **“Every required feature mapped or transition agreed”**, not “all legacy records copied” or “full disaster-recovery rehearsal executed.” Record retained legacy source, accountable owner, outstanding proof and transition boundary for each held record family. Do not claim provider settlement, data restored or exact transformation completeness from metadata alone. Where the original source remains authoritative under SHA-LEG-01 / BOK-DEV-01, a separately approved future cutover/recovery gate can own executable rehearsal; T28 must still document the retrieval/servicing dependencies explicitly.

## Owner approvals already established
T28-SHA-LEG-01, SHA-REC-01, BOK-DEV-01, BOK-REC-01, BOK-CREDIT-01, BOK-QUOTE-01, RET-OWNER-01. These remain mapping-only and do not authorize migration, production repair or T29.

**Decision/evidence status:** recovery and provider evidence outstanding; mapping-closeout review can proceed read-only, but no unqualified acceptance claim. T28 In progress, T29 Not started.
