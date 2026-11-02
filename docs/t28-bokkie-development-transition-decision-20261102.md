# T28-BOK-DEV-01 — Development-stage legacy system transition

**Decision date:** 2 November 2026 (Africa/Johannesburg)

**Authority:** Owner explicitly supplied the following approved approach in the T28 conversation. This is a **T28 mapping and transition decision**, not T28 staging acceptance or permission to change live systems.

Bokkie Cleaning Services was under development before FaraiOS.

The approved approach is to:

1. Preserve Bokkie's existing Supabase database, historical records and operational evidence.
2. Map supported business records into the already approved FaraiOS V1 structure.
3. Retain website-specific and non-V1 features within the existing Bokkie environment.
4. Avoid rebuilding incomplete legacy features unless independently required by the canonical FaraiOS Build Plan.
5. Preserve unresolved customer credits and financial obligations until reconciled and explicitly assigned a safe transition.
6. Preserve the previously approved historical recurring-booking treatment.
7. Maintain independent Shalean and Bokkie business ownership.
8. Perform no migration or production cutover during T28.

This decision establishes mapping policy only. It does not approve a production security change, financial adjustment or migration.

## Implementation guidance and outstanding checks
- Classify every source feature and record family as **existing V1 mapping**, **retained in legacy website/source**, or **specific unresolved transition**. No scope extension follows from legacy features.
- Preserve source identifiers, ownership and snapshots; do not link customers across businesses using emails alone.
- Existing five recurring groups remain historical; completion and any ongoing agreements require operational evidence, as approved in T28-BOK-REC-01.
- The recorded R64.75 Bokkie customer-credit balance and unexplained historical R50 ledger continuity gap remain protected and unresolved. This decision is NOT authorization to write off or recreate either.
- Potential Bokkie credit-function access/atomicity risk is documented separately for owner-approved security remediation; no production permissions changed during mapping.
- Continue source/target field and record-type inventories, Shalean classification, dependencies, evidence and explicit decisions for remaining gaps.
- T28 is **In progress** pending coverage and acceptance. T29 is **Not started**.

**References:** docs/t28-feature-data-mapping-20261102.md; docs/t28-bokkie-live-table-inventory-20261102.md; docs/t28-bokkie-group-history-20261102.md; docs/t28-bokkie-credit-liability-20261102.md; docs/t28-bokkie-credit-writer-review-20261102.md.
