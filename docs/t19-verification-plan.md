# T19 — staging acceptance and review evidence

22 October 2026. Companion to [research and proposed architecture](t19-research-architecture.md). **Planned tests are not completed acceptance.** No approval to run a new OAuth diagnostic, create a provider record or enable synchronisation is implied.

## Checks performed for this review

| Check | Result / limit |
|---|---|
| Core source comparison between checkout `8452de5` and documentation base `651490e` | No differences in `src/zoho-books.js`, `src/invoices.js`, `scripts/setup-zoho-staging.mjs`, `database/invoices-draft.sql`, and their three focused test files |
| Initial focused run under default Node 22.22.0 | 39/43 passed; four callback CLI tests failed with loopback EACCES. Wrong major runtime and restricted local networking; not an accepted validation run |
| Required Node 24.19.0, focused adapter/setup/invoice tests, local loopback permitted | **43/43 passed**, zero failures/skips; synthetic provider/OAuth and PGlite fixtures only |
| Node 24.19.0 HTTP test selection `invoice\|accounting` in `test/staging-server.test.js` | **5/5 passed**, zero failures/skips; two quote/handoff and three invoice cases; mocked database |
| Live Zoho, deployed authenticated API/RLS, native PostgreSQL concurrency, vault/KMS, browser acceptance, production | **Not run** in this review |

Commands (Node 24 executable selected explicitly on this host):

```text
node --test test/zoho-books.test.js test/zoho-setup.test.js test/invoices.test.js
node --test --test-name-pattern="invoice|accounting" test/staging-server.test.js
```

These tests were run in the original checkout without editing it. The core seven files match the report branch base; the HTTP result describes the original checkout's routes/test fixtures, not an exact-head deployed candidate. No full-suite or independent QA claim is made. A separate managed worktree holds only the T19 documentation changes.

## Preconditions for future staging work

Obtain architecture/safety approval first. For any new provider experiment, record exact approved client type/authorisation endpoint, synthetic account identity and memberships, two isolated organisations, requested read-only scopes, allowlisted regional domains, endpoint list and cleanup scope. Resolve the report's support gates sufficiently to make results interpretable. New consent and grant cleanup need explicit approved scope; historic approvals are not blanket permission for future grants.

Use synthetic businesses A/B corresponding only to dedicated TEST organisations, plus a third unconnected business C. Never use production credentials or customer data. Restrict API access initially to GET organisation/contact/invoice/payment/credit reads and the explicitly approved OAuth token lifecycle POSTs. Assert no invoice/contact/credit/payment mutation endpoint is called.

Use already-existing known synthetic records with distinct markers, recorded IDs, currency and expected amounts in A and B. If no such records exist, positive identity verification remains NOT ASSESSED: arrange separately approved fixture provisioning later rather than creating records under a read-only approval. An empty organisation is insufficient to prove a correct invoice read.

Create authenticated test identities: A-only owner, B-only owner, B-only manager, explicitly shared manager, assigned/unassigned staff, two business customers, platform-only admin, revoked member and anonymous caller. Record expected capabilities before testing. Test real HTTP and direct database paths with application roles; a superuser or service-role SELECT cannot prove RLS.

## Acceptance matrix

| ID | Scenario / layer | Required result and evidence |
|---|---|---|
| V01 | Correct-org organisation and known invoice GET, real provider | Exact expected organisation profile and known synthetic invoice identity/reference/customer/currency verified. Record safe correlation and timestamps. Empty list alone is insufficient |
| V02 | Provider boundary: A grant requests B TEST org and B known record | Record accessible/rejected/inconclusive accurately. 401/404/5xx are inconclusive; successful empty list remains unidentified. Outcome informs grant-risk acceptance, never bypasses V03 |
| V03 | FaraiOS B-only manager submits A business/invoice/contact/job/connection IDs | HTTP denial with no A data and zero provider calls; inspect safe egress counters and DB rows. Repeat both directions and with a fake token deliberately capable of both orgs |
| V04 | Tampered role/business claims, stale/revoked membership, platform-only user | Server membership is authoritative; deny inactive/absent membership and implicit platform access. Direct RPC/RLS attempts also fail |
| V05 | Staff and customer record ownership | Staff cannot list finance or use integration endpoints. Future customer portal permits only own business-scoped invoice/payment records; another customer's IDs and guessed remote IDs fail. Until implemented, deny all such portal access |
| V06 | Shared user switches A/B; cache, export, report and job paths | Only explicit memberships work; distinct mappings/cache keys/filters. “All” view never widens authorisation; no foreign audit or report data |
| V07 | Direct DB isolation and worker privileges on real PostgreSQL | Authenticated roles cannot read foreign rows or invoke claim/finish worker RPCs; forged provider success rejected. Composite FKs reject cross-business links; schema grants/RLS verified separately |
| V08 | State replay, callback/session/business mismatch, wrong host/region, lost owner role | Reject before connection publication; consume state once; no secret echo or credential save on failure; clean only the newly issued approved test grant where necessary |
| V09 | Expired access token and simultaneous workers | One refresh per credential version; all waiters use the validated token; no repeated consent. Expiry skew, refresh without new refresh token and region mismatch covered |
| V10 | Revoked/invalid refresh token and removed Zoho membership | Reauthorisation required, jobs paused and caches invalidated; no retry storm or automatic scope expansion. ORG admin-removal behaviour assessed separately from user-based grants |
| V11 | Wrong secret business/org, substituted credential envelope or cached generation | Fail before provider request/decrypt where possible; authenticated encryption context rejects swaps; key loss fails closed; rotation and restore retain isolation |
| V12 | Mismatch in organisation/profile/invoice/customer/currency/reference/lines | Quarantine and visible reason; no success receipt or fallback org. Unknown required profile fields fail verification. Confirm response-proven identity separately from injected binding fields |
| V13 | Duplicate local requests and concurrent native DB workers | One durable operation and one remote dispatch; same key/different payload rejected. Run with independent database connections, not just single-process fixtures |
| V14 | Timeout before/after dispatch, remote success then socket loss, malformed response | GET retry bounded; dispatched mutation becomes uncertain. No second POST. Readback of exactly one matching record recovers the same ID |
| V15 | Zero/two reference matches, delayed search visibility, pagination cap | Zero never authorises replay; two require review; incomplete collection cannot imply absence or reconciliation success |
| V16 | Worker crashes after remote write but before local commit; expired lease/stale finish | Durable dispatched intent survives; replacement worker reconciles only; fencing rejects stale state overwrites while preserving late receipt evidence |
| V17 | Contact success/invoice failure; failed page; rejected update | Retain verified contact mapping, resume correct step, cursor not advanced past uncommitted data; permanent validation error visible without automatic retry |
| V18 | 429, daily quota exhaustion, 5xx, DNS/network failure | Shared per-org budget, bounded jittered reads and deadline; other business remains serviceable; no mutation replay or unbounded queue growth |
| V19 | Disconnect during refresh/claim/dispatch; failed revoke | Local dispatch stops, generation changes, caches invalidated; in-flight write remains uncertain/late evidence, not falsely cancelled. Revocation_pending visible until confirmed |
| V20 | Same-org reauthorisation versus org replacement | Same-org identity preserved after revalidation; new org gets new connection/mappings. Old jobs cannot dispatch into it; historical receipts remain attached to old org |
| V21 | Partial/overpayment, credit, refund, write-off and external edits | Distinct balances/statuses; credit is not refund and paid is not payout. Unexpected edit is reviewed, not overwritten. Initial tests read existing synthetic fixtures only |
| V22 | Monthly close: all pages, period boundary, timezone, late edits and unrelated Zoho records | Counts and financial movements reconcile by business/currency; explicit unmatched buckets, repeatable run/version and accountant approval; no unexplained variance |
| V23 | Audit, secret redaction, backups and recovery | Actor/business/connection/operation trace present; no tokens, codes or secrets in logs, Git, URLs or support exports. Tenant restrictions apply to audit/export; encrypted restore and key custody tested |
| V24 | Write scope boundaries, later stage only | Method/path/action allowlist prevents sending invoices, collecting money or unintended portal/reminder changes even when OAuth scope is broad; no live records affected |

V13–V17 initially use synthetic providers. Real provider mutation variants wait for separate Stage E approval; they are not authorised by this plan. Revocation and consent tests likewise wait for their approved TEST-grant lifecycle scope.

## Evidence pack and release decision

For each test retain candidate SHA, environment, time, actor role, connection generation, synthetic fixture references, request method/path with secrets removed, HTTP/provider result category, expected/actual result, egress count, DB invariant checks and cleanup result. Store sensitive evidence privately; Git contains only redacted summaries. Preserve support correlation IDs if safe, never entire auth headers/raw credentials. Track PASS, FAIL, BLOCKED and NOT ASSESSED separately.

A reviewer must be able to reproduce both permitted and denied cases across real HTTP and real PostgreSQL/RLS. Require two-business isolation including a deliberately broad fake token, refresh/disconnect race tests, uncertainty recovery and no unexplained accounting variance. Fakes and PGlite supplement but do not replace deployed API/database evidence. Connection-only acceptance is not full T19 acceptance; the tracker still requires reconciled business totals and visible failures.

The architecture review should explicitly approve D1–D6, choose the OAuth path after support clarification, accept the secret-store/refresh design and assign accounting/security reviewers. Until then: **NO-GO for integration implementation and activation.** Approval of Stage B permits bounded offline work only; later gates remain closed. Production requires its own release/cutover approval and is never implied by a staging PASS.

## 23 October verification refinement

[Provider confirmation addendum](t19-provider-confirmation-20261023.md) records the now-confirmed Accounts-level access model. Retain V03–V07/V11/V19/V20 application-boundary tests with broad fake tokens. V01 remains required: approved dedicated TEST identity, independently recorded expected organisation profile and a known pre-existing synthetic invoice, exact ID/reference/customer/currency checks and safe evidence. V02 is not a reason to repeat the previous broad OAuth investigation; any additional provider-boundary diagnostic requires its own narrow justification and approval. Provider 403 denies that request only; it does not prove universal token isolation. All prior results and Stage C/security/CI holds remain unchanged.
