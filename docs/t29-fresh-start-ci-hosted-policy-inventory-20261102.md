# T29 — Fresh-start CI and hosted policy inventory (2026-11-02)

This is a read-only verification supplement for the owner-approved T29 fresh-start amendment. No hosted insert, import, migration, deploy or production operation.

## CI
GitHub Foundation checks for T29 PR #306 commit `e96a875ffd5e0da0e73e19533ea3a0e7b967ec39` completed **success** (run 41500831586). T29-specific pure policy tests in `test/t29-fresh-start.test.js` exercise synthetic Shalean/Bokkie separation for customers, bookings, quotes, invoices, explicit shared membership and privileged financial operation denial. CI success is not proof of an authenticated hosted API or database RLS negative test.

## Hosted staging metadata
Connected FaraiOS staging Supabase `xdmfyrsauvqznkloroxg` read-only list_tables reports 27 public tables, all RLS enabled. pg_policies read-only query found:
- `business_customers.customer_office_access` ALL authenticated USING and WITH CHECK.
- `one_off_bookings.office_bookings` ALL authenticated USING and WITH CHECK.
- `business_invoices.office_invoice_read`, `business_quotes.office_quotes_read`, `recurring_schedules.office_recurring_read` SELECT authenticated USING.
- `business_memberships.read_own_active_memberships`, `businesses.read_member_businesses` SELECT authenticated USING.
- Other restricted T19 runtime/backend policies exist, and their semantics must not be inferred from policy names.
This proves policy **presence**, not that each predicate is correct, that every role grant is safe, or that live authenticated cross-tenant requests fail.

## Remaining T29 gates
- Independent hosted RLS and authenticated API negative tests with actual permitted and denied accounts in both directions, with no staging business writes.
- Disposable isolated synthetic new-flow rehearsal and exact no-outbound-effects evidence. Avoid the live staging tenant's existing customers, bookings, financial objects and recurring jobs.
- Source/legacy obligations and immutable boundaries checked against latest owner decision; no deployment or fresh-start cutover.
- Owner T29 staging acceptance then tracker Done verification; T30 explicitly not started.

Status: **CI PASSED; RLS POLICY INVENTORY PASSED; HOSTED DENIAL / SYNTHETIC REHEARSAL NOT PASSED.** PR #306 remains Draft; T29 In progress.
