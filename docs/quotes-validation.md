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

## Owner browser acceptance — 19 October 2026

The owner replied Ready after the requested main pull, staging-server restart and owner sign-in. The connected Chrome session at local port 3101 displayed the new Quotes destination and workflow. Current merged source at handoff was main `2d8fb101da5f214ae13bd73f796af6995b7d67ab`, tree `c1aa19fdceadc57a98ddf110f11388c3fa22ac0e`. Owner readiness plus observed behaviour establishes this browser acceptance; the browser did not independently attest the server process's Git SHA.

All simulated acceptance references and assessment notes explicitly say T18 TEST ONLY and deny a real service/customer commitment. No quote was sent, no real contract accepted, and no invoice/payment was created. Only the two identified QA quotes/bookings below were changed. An independently created Shalean Carpet Cleaning Draft quote, `c90ef16f-3dbd-4997-a0ea-e623faf67719`, appeared during acceptance and was left untouched.

| Business and case | Saved quote | Converted booking | Observed result |
|---|---|---|---|
| Bokkie — Regular Cleaning, one bedroom/bathroom/extra room, fridge extra, customer equipment, explicit zero assessment | `56ec46fc-2d4b-425c-8094-0675b68ad3a1` | `1581fb74-8241-4fac-b280-61a58417358a` | R410, 330 minutes, one required cleaner. Create → issue → office-recorded test acceptance → unassigned Draft booking. Reload retained its link and frozen agreement. |
| Shalean — medium Office Cleaning, one bathroom, kitchen extra, business equipment, R75 additional assessment | `185d1aa2-e19a-4838-a9b5-3cbe9398ae96` | `a64b98ca-ce99-4321-bb92-0b46f39793f0` | R875, 240 minutes, one required cleaner. Same complete office workflow; rescheduling the booking to 23 October preserved the quote. |

Shalean's Accepted quote was opened in two real browser tabs before conversion. Both forms submitted the same 22 October 09:00 start and test override reason with the original version. The first converted; the second returned the **same booking link**. Database readback confirmed quote version 4 and exactly one booking and one invoice handoff for each QA quote. The duplicate tab was closed afterward. Conflicting conversion payloads and post-cancellation RPC replay remain evidenced by the SQL/CI tests, not claimed as additional browser submissions.

Both converted pages displayed Booking status Draft and Awaiting invoicing, explicitly saying no invoice number or payment had been recorded. Booking detail links returned to the accepted quote/handoff. Both synthetic visits were cancelled through the booking UI with test-only reasons. The quotes retained Converted history and showed Booking status Cancelled with **Invoicing needs review**. Shalean's saved conversion date remains 22 October even though its booking was rescheduled to 23 October before cancellation.

Browser validation rejected `2026-02-30 09:00` with a visible date error. The desktop date grid supported arrow-key navigation and Enter selection; the 09:00 time committed normally. The Shalean mobile date/time picker fit within the viewport and retained the typed date/time. Actual office acceptance evidence was recorded with actor/time; no customer portal acceptance was claimed.

Visual acceptance used normal desktop width and a temporary 390×844 viewport (375-pixel content width after scrollbar). Desktop quote details/list and mobile creation/assessment/extras, conversion picker, saved details, linked-booking receipt and filtered list were inspected. Measured mobile document width equalled scroll width, with no horizontal overflow. Office search returned one of two Shalean quotes and Clear filters restored the list. Keyboard Skip to content moved focus to MAIN/main-content. Viewport overrides were reset. Private fixture contact/address screenshots were inspected internally and are not published as artifacts.

After browser cleanup, all ten original non-quote bookings retained digest `58ebb3ded11ae1f1e5f48469d74b6190`; all membership, customer, address, catalogue and settings hashes still match the earlier baseline. The two recurring schedules are unchanged. The two new QA bookings are Cancelled, unassigned and have **zero cleaner reservations**. Their quotes, handoffs and audit history remain intentionally durable; do not delete them or reopen/recreate visits. The unrelated Carpet Cleaning Draft quote remains outside this QA cleanup.

Limits: owner browser flow was exercised, while manager/staff/anonymous/suspended and foreign-business enforcement is supported by HTTP/SQL/staging evidence. This is bounded staging acceptance; production, foundation and T19 financial-policy gates remain separate. The following opinion closes this review stage.

## Final independent closure opinion

1. **Identification:** QA-T18-CLOSURE-20261019, version 1. Evidence cut-off: 19 October 2026, 20:43:58 UTC.
2. **Decision:** **PASS — T18 bounded staging delivery closure.** No unresolved material blocker remains. T18 may be recorded Done for reviewed staging scope after this opinion is persisted and the documentation gate completes. No production, foundation or financial-policy approval is granted.
3. **Reviewed version:** implementation PR59 head `c07ee93cdc56aa2f28eae1801e40bc35d66003f2`, merged as `7e7960c8cd40412a7efed32789801c6ea8b79c79`. Browser handoff main `2d8fb101da5f214ae13bd73f796af6995b7d67ab`, with unchanged runtime source. Staging migration `20261019201948 quotes_and_atomic_conversion`.
4. **Environment:** verified FaraiOS staging `xdmfyrsauvqznkloroxg`. Owner browser acceptance used the signed-in local staging application.
5. **Scope and criteria:** office quote creation, immutable agreements, issue/recorded acceptance, accepted-only atomic conversion, duplicate prevention, business isolation, access enforcement, linked booking and durable invoice handoff. T18's invoice-flow criterion is satisfied at the approved handoff boundary; T19 owns actual invoice identities, accounting and reconciliation.
6. **Independence:** reviewer did not implement changes, control the acceptance browser or mutate staging. Reviewer and delivery agent share AI tooling; this is independent agent review, not an external human audit.
7. **Methods:** independent source/constraint/rights review, exact candidate blob comparison, isolated regression, CI-log inspection and read-only deployed schema/data/audit checks. Engineering's browser observations and rollback-only staging execution were assessed and corroborated, not independently replayed by QA.
8. **Automated evidence:** independent local run 123 total, 122 passed, zero failed, one explicit independent-PostgreSQL skip. Both exact-candidate CI jobs `118283514854` and `118283541614` passed 123/123, zero skips, including independent-connection contention. All 17 deployed function-body hashes matched reviewed source at the staging gate.

| Criterion | Final result |
|---|---|
| Frozen scope, contact, money and duration | PASS — snapshots, parity samples and persistent quote/booking equality |
| Acceptance evidence and lifecycle | PASS — reasons, recorded actor/time/reference and terminal controls |
| Exactly-once atomic conversion | PASS — locking, uniqueness, rollback tests, concurrent connections and real two-tab retry |
| Direct API and mixed-source controls | PASS — protected routing, frozen fields and quote/recurrence exclusion |
| Tenant and role boundaries | PASS — source, SQL, HTTP and staging evidence |
| Booking and invoice-flow presentation | PASS — linked Draft booking, pending handoff and truthful cancelled-booking review state |
| Desktop/mobile usability | PASS within observed owner workflow |
| Preservation and cleanup | PASS — originals preserved; labelled visits cancelled with durable history |

9. **Criterion results:** recorded in the table above.
10. **Browser evidence:** both businesses completed create → issue → simulated office acceptance → conversion. Shalean's two Accepted forms used the same original version and input; both returned the same booking link. Desktop/mobile forms, invalid-date rejection, picker keyboard operation, MAIN focus, search and overflow checks passed. Private fixture screenshots remained internal.
11. **Persistent reconciliation:** each QA quote is Converted/version 4, with exactly one booking and one handoff. Bokkie retains R410/330 minutes; Shalean retains R875/240 minutes. Both bookings are Cancelled, unassigned and have zero reservations. Their frozen agreement fields match source quotes.
12. **History and preservation:** fifteen QA audit events corroborate both four-state quote lifecycles, two booking inserts, two handoffs and three controlled booking updates. Actors correspond to active owners. Agreement digests remain constant. Shalean moved from 22 to 23 October before cancellation while saved conversion input remained 22 October. Ten original non-quote bookings retain digest `58ebb3ded11ae1f1e5f48469d74b6190`; other baseline hashes and recurring schedules are unchanged. The unrelated Carpet Cleaning Draft quote remains version 1 with one INSERT and no conversion.
13. **Findings:** no unresolved material finding. Earlier mixed-source and contact-snapshot race findings were remediated and verified. Existing foundation/security advisories remain separate gates.
14. **Limitations:** browser actions were observed by Engineering, not replayed by this reviewer. Browser coverage was owner-only; other roles rely on SQL/HTTP/staging evidence. Owner readiness and observed behaviour do not attest the running process's Git SHA. Six configured-profile parity samples are representative, not exhaustive. Acceptance references were explicitly simulated; no real customer commitment, issued invoice or payment was assessed.
15. **Disposition and ownership:** preserve earlier conditional implementation/premerge opinions as history. Engineering may persist this PASS and complete documentation/tracker closure. Retain labelled converted quotes, handoffs, cancelled bookings and audit history. Leave the unrelated Draft quote untouched. T19 and Farai's production/foundation decisions remain open separately.
16. **Validity and reassessment:** valid for reviewed source, migration, scope and evidence cut-off. Reassess after material source/schema/access/environment/requirement change, contradictory evidence, regression, or expansion into customer-facing acceptance, invoice issuance, accounting or production.
