# T27 source publication — 2 November 2026

Canonical tracker verified T26 Done on 02/11/2026, T27 In progress (blank completion), dependency T26. Scope: Reports and operational overview; business totals, authorised combined view and alerts; reconcile reports and expose failures/unassigned work.

This is a **source-only Draft PR for CI**, not a completed T27 feature. Owner approved publication and CI only. Target base staging at 0447b4dcaa0cc00d5c79ac1bf7753e6bc68e92e8. No migration, hosted installation, deploy, notifications, new accounts, fixtures, production or financial writes.

## Prepared
- Guarded read-only SQL RPC for active owner/manager membership and live session; no platform implicit access.
- Separate metrics: eligible booking value (not revenue), current unassigned confirmed bookings, pending office assessments, failed T26 notification jobs, verified online credits, verified EFT receipts, allocated verified EFT, synthetic accrued earnings and reconciled cleared payouts.
- SQL transfer reconciliation uses a single latest reconciliation timestamp per transfer to prevent duplicate count from repeated events.
- Read-only authenticated JS adapter; scope mismatch fails closed; focused tests.

## Mandatory incomplete requirements
- **Issued invoice / outstanding balance / reimbursement metrics are not implemented.** The staging invoice row has draft document status even for some matched provider bindings; do not substitute sync status for an issued invoice or a stored Draft for revenue.
- The existing earlier T27 isolated dashboard/rendering prototypes are **not yet integrated** into the real server/navigation. Do not mistake this PR for dashboard delivery.
- Native PostgreSQL authenticated role/session/concurrency and date-reconciliation tests, two-business/current-membership revocation/API direct denial, exact-head CI, full regressions, source ownership and review still required.
- Exact SQL amounts/dates and payout semantics require reconciliation against staging source records, including partial settlement and corrections.
- Before any approved staging migration/deploy, verify Plesk subscription 738 / site 841, private checkpoint and scheduled workers, and prepare explicit fixture limits and before/after full-row hashes.
- T27 remains In progress. Completion blank until actual hosted desktop/mobile/UI/API/database evidence and explicit owner acceptance. T28 untouched.
