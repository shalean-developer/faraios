# T25 customer portal — implementation candidate

Date: 1 November 2026, Africa/Johannesburg. Base: accepted staging `101feefbc14f8aa6eb215c9d1aafb3f76ae66df1`. Branch: `t25/customer-portal-preparation`.

## Scope and decisions

The directly read canonical tracker specifies customer portal and booking page; business booking page, account and booking history; customer can book on mobile and see correct business; dependency T20 Done. T24 is explicitly accepted and Done. The old no-payment slice remains a proposal and is not substituted for full T25.

Owner replied **yes** to BOTH decisions in this session, for Shalean and Bokkie:

- Signed-in customers can create a new separate business relationship. Existing customer history requires independent office verification and explicit linking; email matching never grants ownership.
- Customer submission creates an unassigned Draft request awaiting office confirmation. It does not guarantee a time, reserve a cleaner, charge money or create earnings/payout eligibility.

This approval covers the decisions and authorised local source preparation/testing. It is not publication, migration, fixture, account-provisioning, merge or deployment approval.

## Implementation

| Requirement | Candidate implementation | Evidence boundary |
|---|---|---|
| Correct business page | `/b/<configured-slug>` resolves a private route table and current active business; public output is an allowlist of identity, hours, areas and active catalogue pricing | Disposable DB and HTTP tests pass; real routes not seeded |
| Customer account | Existing password sign-in and expiry, independent of office memberships; live non-anonymous Auth session; explicit business/customer/Auth links | Disposable Auth adapter plus real DB session/relationship guards; actual hosted customer sign-in pending |
| New customer relationship | Narrow `enrol` RPC creates a new contact without copying/matching an email; immutable business parent; same-operation durable replay receipt | Tested; no shared record created |
| Verified old history | Owner/manager customer detail links to `/customer-access`; exact Auth ID and independent evidence needed; grant/revoke is business scoped and audited | Native SQL semantics exercised in embedded PostgreSQL; office UI hosted acceptance pending |
| Booking request | Narrow transactional operation, customer/address ownership, catalogue version preconditions, unchanged pricing/duration/snapshot/workload triggers and unique request key | Disposable HTTP → SQL journey and denial/snapshot/replay checks pass |
| History | Explicit customer-safe snapshot projection, own active relationships only, pages of 50 plus next sentinel; no staff, access notes, office notes or business finance | Embedded DB and HTTP checks pass |
| Mobile acceptance | Existing responsive stylesheet and semantic forms; catalogue, account, addresses, service scope and saved totals | Actual viewport inspection pending; no visual pass claimed |

No new grants on source customer/address/booking tables, no customer office membership, no Auth email/SMS enablement, and no business-specific rates or financial mapping changes. Route/config/link/event tables have RLS and no client table grants. Public functions are invoker facades; narrow private functions verify current sessions and records with empty search paths. The additive context bridge returns an empty staff list for customers; the original office context retains its office guards. Current private pricing configuration is not returned wholesale; depot information and unknown config fields are excluded.

Assessed services, office-estimated duration, equipment delivery needing measured distance, and scope options requiring assessment remain office work. Customers cannot invent assessment prices or override business hours. Customer-selected catalogue versions are optimistic preconditions, never price authority. Changes require reopening the page. Saved requests retain original authoritative prices even after catalogue edits.

## Verification

Final result counts are recorded in the execution log before publication. Meaningful local coverage includes:

- Own account/history and new customer/address/request through actual local HTTP → guarded SQL.
- Same-email accounts receive no automatic link; wrong customer/address/business and office endpoints denied.
- Anonymous browsing only; protected actions, revoked relationship/session and anonymous Auth sessions denied.
- Explicit office link/revoke with evidence, wrong-role denial and private-table denial.
- Authoritative price/duration snapshots, changed-catalogue rejection, identical replay and conflicting replay.
- Invalid scope, past time, out-of-hours and forged assessment/duration/amount rejection with no partial booking.
- Draft requests reserve no cleaners; existing office confirmation/assignment still invokes reservation controls.
- Existing customer/session/cleaner HTTP regressions and repository syntax checks.

`test/t25-customer-native.test.js` and `scripts/run-t25-customer-postgres.mjs` prepare independent PostgreSQL connection checks: duplicate contenders must visibly block, response-loss retries return the same result, rollback removes booking/audit/receipt atomically, relationship revocation serializes against writes, and repeatable-snapshot retry produces one persisted result. The existing CI policy runner invokes this in its own disposable cluster. **Not run locally:** this workspace has no native PostgreSQL binaries; attempted package installation could not run under its available process permissions. PGlite is not counted as independent-connection proof.

A local Playwright inspection was attempted, but no browser executable was installed and its download returned invalid/truncated archives. **No desktop/mobile screenshot or physical-phone acceptance is claimed.** Perform actual browser verification after approved source qualification/deployment.

Wider-suite known Unix listener errors are kept distinct from new T25 results. Exact-head hosted CI/security/native qualification remains mandatory before proposing a merge or staging execution.

## Operating instructions

Customer: open the configured business page, sign in with an existing staging account, create a NEW relationship or use independently linked history, save an own address, choose a configured service and scope, request a future in-hours time, submit, then review the saved total/duration and awaiting-confirmation status in own history. Browser refresh/retry reuses the same form request key; interrupted committed submissions can be checked in history. Catalogue changes require reopening the page. Existing 30-minute/token-expiry reauthentication remains.

Office: open the business-owned customer record → Verify or revoke customer portal access. Verify the exact Auth user and relationship independently, enter evidence, grant or revoke. Same email is not evidence. Corrections to saved contact/address records remain under existing office controls. Keep undisputed historical records; never merge/delete accepted customers to resolve access.

## Publication and staging boundaries

Candidate source is local and uncommitted. No external branch/PR/tracker write, deployment, migration, route seed, account, customer, booking, credential, message or financial action occurred. The tracker remains unchanged. T25 is not Done and needs explicit owner acceptance after complete staging evidence.

Next proposed approval: publish this bounded branch and draft PR targeting staging, run exact-head CI/security/native checks, and record T25 In progress plus the approved decisions in the canonical tracker. This does not authorise merge, migration, deployment, accounts, route seeds or shared acceptance fixtures. Prepare a separate exact execution package only after CI passes.

## Local qualification result

- Relevant regression command (bookings, identity, cleaning profiles, availability, T24 HTTP, auth sessions, customers, T25 HTTP/SQL): **24 passed / 0 failed / 0 skipped**.
- Final T25 focused addendum, including hosted outbound RPC restrictions: **5 passed / 0 failed / 0 skipped**. Four overlap the regression command; counts are not additive.
- Broader run before that last focused test addition: **1,225 total / 1,193 passed / 2 failed / 30 skipped**. Failures are the two recorded Unix-listener `EPERM` cases in `test/hosted-staging.test.js`, not T25 failures. Skips include platform-specific DPAPI and explicitly unavailable native database tests; no broad-suite PASS is claimed.
- Repository `npm run check`, changed-file syntax and `git diff --check` pass after the final source changes.
- Database candidate SHA-256: `bd9714130f1e9847c83f70d4f76bfc570057ce601e321799b17242d3dcf363b9`.
- Customer portal module SHA-256: `494bba66e21ae97f02febac119eaf0b2b997d05b54e43e068c9b84491ec93ed3`.

Decision: **CONDITIONAL PASS for bounded source publication and exact-head CI qualification; NO-GO for merge, migration, deployment or Done status until their separate checks and approvals are satisfied.** No independent reviewer requirement is introduced.
