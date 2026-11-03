# T29 consolidated staging acceptance review — 3 November 2026

STATUS: NOT YET ACCEPTANCE-READY. T29 In progress; PR #306 Draft/unmerged.

## Owner-approved scope
Owner approved a fresh-start V1 approach for Shalean and Bokkie, superseding the original historical-data import rehearsal. Current live legacy systems remain authoritative; historical financial and recurring obligations are retained and any future per-flow cutover requires separate approval. T28 Done, T30 Not started.

## Verification matrix
| Gate | Evidence | Finding |
|---|---|---|
| Canonical amendment | Build Tracker T29 row and owner decision | PASS — amended scope recorded |
| Shared V1 target | 27 staging public tables; core business tables RLS enabled | PASS for schema existence; first-time tenant provisioning not yet fully rehearsed |
| Synthetic policy | T29 access tests in Foundation CI | PASS for source tests, not exhaustive hosted API |
| Hosted access denial | Bokkie-only manager denied Shalean page with supplied HTTP 403 | PASS for tested application route |
| Database access | Read-only authenticated-role PostgreSQL queries: Bokkie visible, tested Shalean customer/booking/invoice/quote/recurrence/membership rows invisible | PASS for tested RLS paths |
| Synthetic booking | Existing PGlite booking lifecycle tests plus T29 booking test | PASS for tested isolated workflow, not complete first-customer-to-invoice continuity |
| Synthetic rollback | Disposable PGlite rollback and repeatability test in run 41613818683 | PASS for synthetic dataset; no hosted rollback claimed |
| Local no-provider effects | T29 test using disabled payment runtime, inactive accounting worker, denied provider URL and protected RPC paths | PASS in earlier CI for disconnected adapter, not OS/host network sandbox |
| Staging notification/cron metadata | Both T26 notification settings disabled; no pg_cron, pg_net, wrappers, or cron.job | PASS for inspected database state |
| Plesk scheduler | Owner screenshot: enabled T19 TEST invoice worker scheduled every 5 min | Host-wide outbound isolation NOT demonstrated |
| Node runtime | Owner screenshot: startup _test_payments.cjs; no custom environment entries visible; private T19/T20 config not inspected | Private runtime activation state NOT VERIFIED |
| Legacy continuity | T28 accepted retention: Shalean 13 active schedules/85 future visits; Bokkie historical credits/quotes/groups remain in source | Approved plan; end-to-end future cutover continuity not tested |
| Owner acceptance | Not yet received | PENDING |

## Crucial boundary
T29 is a disconnected synthetic rehearsal and does not launch the existing Plesk T19 job, run a real booking, send an invoice, or call customer/provider services. This does not imply that the unrelated standing T19 TEST worker is disabled. Do not stop that worker or touch its private configuration as part of T29. NODE_ENV=production is Plesk/Passenger application mode and does not establish live business credentials.

## Outstanding acceptance proof
1. Latest-head CI success (the previously checked run 41634292847 was still in progress at time of initial review).
2. Explicit decision whether isolated disconnected no-outbound proof is the intended amended T29 boundary, or whether hosted Plesk-wide isolation is actually required. If the latter, protected runtime and worker state need separate verified evidence.
3. Full new customer/booking/invoice-state synthetic continuity remains partly unproved; do not substitute booking-only tests for that whole journey.
4. Confirm no release, deployed change, new source writer, DNS or cutover and obtain explicit owner T29 staging acceptance before setting Done.

No production or staging data mutation, restore, import, provider action, deployment, host restart or T30 performed.