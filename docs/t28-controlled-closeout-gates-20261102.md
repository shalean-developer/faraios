# T28 closeout gate: Shalean and Bokkie disposition (2026-11-02)

**This is an evidence/decision register, not staging acceptance or authorization to migrate.** T28 acceptance remains every required feature mapped or transition agreed. T29 explicitly out of scope.

## Source completeness
- Shalean: complete **245/245 public BASE TABLE names** read directly from connected production Supabase `paqjwfulwywtsyyvdxrq`. Each source table assigned a provisional family in `docs/t28-shalean-245-table-triage-20261102.md`. Four unclassified name outliers subsequently assigned to privacy/operational, customer-care evidence, active customer care, and finance billing terms respectively. No unknown table names remain, but **mapping validation and final disposition remain open**. Counts/fields/relationships not exhaustively verified.
- Bokkie: owner supplied 43 public source tables; all 43 individually classified in `docs/t28-bokkie-live-table-inventory-20261102.md`. Owner-approved T28-BOK-DEV-01 supports retaining unfinished and website-only non-V1 functions; there are still unresolved **required** obligations and field-level proof. Owner supplied exact counts for 11 tables, booking/payment/recurrence/credit aggregates, customer/booking/credit ledger column sets. Connector permission denied for project `scsrxogumimsrtbnqeas`; do not claim live authenticated access.
- Target: FaraiOS staging `xdmfyrsauvqznkloroxg`, accepted T01–T27. Existing target metadata is a capability inventory, not imported source coverage.

## Bound decisions
- **APPROVED Bokkie** T28-BOK-DEV-01: preserve legacy source and records; direct-map required V1 records; keep website/non-V1 data with legacy system, subject to financial obligations.
- **APPROVED Bokkie** T28-BOK-REC-01: preserve five grouped historic arrangements and one ungrouped case without automatic status change or future generation. Active/ended agreement status unresolved.
- **NOT APPROVED** credits conversion, write-off, duplicate replay, auto-migrating existing customer identities, provider payment status assumptions, Shalean general legacy retention, any production security patch, or T29 rehearsal.

## Closeout blockers: minimum evidence/decision
| ID | Owner | Blocker and smallest acceptable T28 remedy |
|---|---|---|
| C01 | Shalean business owner / data operator | Identify which of 245 Shalean tables hold *required* V1 source facts and map fields, PK/FK, owner and historical state; affirm retain-in-source for 81 marketing/website candidates and any non-V1 active operational needs |
| C02 | Shalean finance owner | Read-only reconcile source accounting, customer credits, monthly billing, booking payment/provider references, earned/payout statuses to existing T19–T23 or approve legacy retention with servicing obligation |
| C03 | Bokkie business owner | Complete missing columns/keys for quotes, user credits, identity links, teams, files, recurrence and financial records; approve retention where already covered by DEV-01 and specific exception path where liability remains |
| C04 | Bokkie finance owner | R64.75 one-account recorded credit liability; nine completed transactions net +R14.75 plus one historical +R50 continuity gap. Agree exact customer servicing/transfer path preserving money, before any cutover; do NOT create artificial R50 adjustment |
| C05 | Both business owners | Confirm source of truth, who maintains legacy history after future cutover, lawful access/retention/rollback and no dual writers; field-mapping decisions must be auditable |
| C06 | Technical operator | Source field/relationship checks, accessible storage metadata and no-change fingerprints and required live provider evidence, without copying production personal records or using port 5432 |
| C07 | Bokkie application owner | Separate high-priority security decision for externally executable elevated credit balance function and non-atomic ledger writes. This does not authorize T28 production changes; restrict exposure under separately approved remediation if confirmed |

## Interpretation
A table's initial family classification is a **triage result**, not a completed source-to-target transformation. Even where an old website keeps its data, its agreed transition needs an identifiable retention owner, availability/access guarantees, and any financial liability servicing strategy. Bokkie has an approved general retention direction; Shalean needs an equivalent owner disposition or per-area agreement. No need to build extra FaraiOS features to achieve mapping.

## Acceptance position
- Read-only production changes: **none performed**.
- Mapping inventory: Shalean 245/245 table names; Bokkie 43/43 named/classified (Bokkie owner-provided).
- Complete required source field mapping/reconciliation/transition signoff: **NO**.
- Security finding separately documented; no unapproved production fix.
- T28 **In progress**. T29 **Not started**. No staging acceptance requested.
