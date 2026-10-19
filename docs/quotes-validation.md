# T18 implementation and staging validation

## Independent implementation opinion

Document QA-T18-IMPLEMENTATION-20261019, version 1. Evidence cut-off: 19 October 2026, 20:17:02 UTC. Reviewed PR59 candidate `c07ee93cdc56aa2f28eae1801e40bc35d66003f2`, base `ef5ba8c065682dd735d44512a5ed825cad37ae41`.

**CONDITIONAL PASS — implementation and staging preparation.** No unresolved material code blocker prevents controlled staging application. T18 delivery and browser acceptance remain open.

The independent reviewer did not implement or remediate the candidate and did not mutate staging. Reviewer and delivery agent share the AI tooling environment; this is not an external human audit. Engineering owns implementation and evidence; Farai retains production, foundation, financial-policy and expanded-scope decisions.

Scope: schema, shared snapshot builders, state/conversion RPCs, direct Data API controls, office routes/forms, access/navigation and tests. Excludes actual invoices/accounting, payments, production, customer-authenticated acceptance and final browser acceptance. Criteria: tracker T18 booking/invoice flow and duplicate prevention; T19's separate invoice/accounting scope; approved T14/T17 integrity/access contracts; AGENTS.md; the recorded T18 design.

Method: independent source/constraint/trigger review; exact GitHub/local blob comparison; full local regression; CI-log inspection; review and isolated rehearsal of the staging verifier. All 14 implementation file hashes matched GitHub and the comparison contained only those files. Independent local run: 123 total, 122 passed, zero failed, one explicit PostgreSQL-connection skip. Syntax/whitespace passed. Both exact-candidate CI jobs **118283514854** and **118283541614** independently confirmed **123 passed, zero failed, zero skipped**, including independent-connection contention.

| Criterion | Result in reviewed code and isolated tests |
|---|---|
| Frozen agreement and money | Generic and six representative configured-profile samples pass quote/booking parity, including Office assessment. |
| Exactly-once conversion | Quote locks, uniqueness, durable links and independent PostgreSQL contention pass. |
| Atomicity | Forced handoff failure rolls back booking, quote/link/version and audit. |
| Direct API enforcement | Server snapshots/state replace forged values; mixed, foreign and non-accepted sources fail. |
| Access and audit | Scoped RLS, current membership, invoker wrappers and protected audit paths verified. |
| Existing behaviour | Booking/recurrence routing, immutable updates and reservation tests pass. |
| Staging and browser | Required separately; isolated tests do not replace them. |

Executed tests also cover acceptance evidence/actor/time, stale and conflicting requests, cancelled/rescheduled replay, inactive customer/address, terminal reasons and lifecycle. The earlier mixed-source gap is addressed by a CHECK and early trigger rejection. The contact validation/snapshot race is addressed by customer → address → catalogue-row locks before calculation; CI confirms contact-edit blocking and the committed contact snapshot. No unresolved material implementation finding remains.

Limits: six-profile parity samples representative configurations, not every equipment/linen/assessment branch. No owner runtime SHA or actual browser workflow was assessed by this opinion.

Conditions and ownership:

1. Before staging application, Engineering must retain verified staging identity, original-record digests and matching function baselines. Mismatch blocks application pending reconciliation.
2. After application and before merge/client acceptance, Engineering and QA must assess the reviewed rollback-only verifier, actual RLS/RPC allow/deny behaviour, original-record preservation, zero residual SQL fixtures and advisor differences. Failure blocks progression and requires remediation/review.
3. After client update, record both-business desktop/mobile create → issue → office acceptance → convert; reload/retry; linked booking and truthful invoice-pending presentation; invalid/stale/cancel paths; picker/keyboard fit. Stop labelled test operational work while retaining history.
4. Before tracker Done, independent QA must assess final staging/browser evidence and issue the bounded closure opinion.

Recommendation: apply only the reviewed additive transaction to verified FaraiOS staging within the authorized T18 workflow. Retain staged verification order and recovery controls. This opinion is valid only for the reviewed candidate/evidence. Source/schema/access, requirement or environment changes and failed conditions require reassessment. It does not mark T18 delivered or authorize T19 invoice issuance.

Evidence index: PR59 exact source; syntax/full local regression; both named CI jobs; test/quotes.test.js; independent-connection tests; scripts/verify-quotes-staging.sql and its isolated rehearsal; docs/quotes-and-conversion.md. Preliminary design opinion remains historical preparation evidence.

## Engineering staging execution

19 October 2026. Only FaraiOS staging `xdmfyrsauvqznkloroxg` was changed. The three existing live price/snapshot function bodies exactly matched the recorded baseline before application. The reviewed SQL transaction was applied using migration **20261019201948 — quotes_and_atomic_conversion**. No additional SQL edits or production changes were made.

The reviewed rollback-only verifier passed against both existing completed business fixtures. It compares current quote prices to a fresh same-input normal booking, then exercises accepted-only conversion, office actor/time, owner/manager access, stale/conflicting requests, repeat conversion after reschedule/cancel, immutable source, staff/anonymous/foreign denial, direct API completion and mixed-source rejection. Its transaction rolled back. Cleanup: zero quotes, zero handoffs, zero quote/handoff audit records; original 10 bookings, two recurring schedules and 166 audit records remain.

| Baseline | Before and after |
|---|---|
| Original bookings, excluding new nullable source_quote_id | 10; `58ebb3ded11ae1f1e5f48469d74b6190` |
| Business settings | `04e03a7863da7c87891c5fee3b07d268` |
| Customer addresses | `90986415f585d5f0a647a3ce0abd509a` |
| Catalogue | `773af43cdf676772cede3e0d770b6793` |
| Customers | `156250ca134495b83439fbfa20d0c019` |
| Memberships | `1fe483593e28b1f7cd383b872b2969b5` |
| Recurring schedules / audit events | 2 / 166 |

Hashes are MD5 of comma-joined row JSON ordered by id, with memberships ordered by business_id,user_id and settings by business_id. The booking hash excludes only source_quote_id for the additive-schema comparison. No original row changed.

Security advisories were unchanged: two existing private/system table RLS-without-policy INFO findings and the pre-existing leaked-password-protection WARN. No new security finding. Performance retained the same six pre-existing unindexed-FK INFO findings. Two new unused-index INFO notices refer to newly created quotes_business_created and quotes_customer_address on empty quote tables; retain these query/FK indexes and reassess with actual usage. They are not a failed integrity check.

Advisory references: [RLS policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Independent post-application assessment and actual owner browser acceptance are separate gates. The tracker must remain In review until browser acceptance and independent closure pass. No invoice identity, accounting connection, payment or external communication has been created by T18.

## Independent staging and premerge opinion

**PASS — bounded staging verification and premerge/client-update gate.** Evidence cut-off: 19 October 2026, 20:21:54 UTC. PR59 can progress to merge and owner client verification. T18 remains open pending browser acceptance and final independent closure.

The independent reviewer verified the healthy faraios-staging project identity and recorded migration; all **17 deployed function-body hashes** match the reviewed candidate. Function rights/search paths, RLS policies, table grants, composite foreign keys, uniqueness, mixed-source exclusion and booking trigger routing match the reviewed design. Current data matches every supplied pre-application hash and count above. Zero quotes, handoffs, quote audit records, source links and mixed sources remain. Advisor differences match Engineering's report.

The rollback-only acceptance write run was supplied by Engineering. QA independently corroborated deployed controls and cleanup using read-only queries; it did not replay live write assertions, inspect each original row individually or assess the owner browser/runtime SHA. Earlier implementation conditions for staging application/verification are satisfied; preserve that conditional opinion as history. Owner pull/restart, both-business desktop/mobile acceptance and final QA closure remain required before tracker Done. No production, foundation or financial-policy approval is conveyed.
