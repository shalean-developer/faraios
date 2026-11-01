# T25 customer portal and booking page — verified preparation

Date: 1 November 2026 (Africa/Johannesburg).
Source baseline: staging `101feefbc14f8aa6eb215c9d1aafb3f76ae66df1`.
Local branch: `t25/customer-portal-preparation`. No publication or shared write.

## Canonical scope

Direct Google Sheets read of `Build Tracker!A25:L26`, plus the current full tracker, confirms:

| Task | Deliverable | Requirements | Acceptance | Dependency | Status |
|---|---|---|---|---|---|
| T25 | Customer portal and booking page | Business booking page; account and booking history | Customer can book on mobile and see correct business | T20 (Done) | Not started |

T24 is Done, completed 01/11/2026. Its final canonical note records explicit owner acceptance and supersedes its historical pending notes. PR295 is the current local staging baseline. T25's historical no-payment slice is explicitly a sequencing proposal, not approved replacement scope. No T26 work.

Read: root AGENTS.md, docs/blueprint.md, current canonical tracker including decision history, customer/booking/cleaning-profile/availability documentation, identity/session/booking/customer/access modules, T24 reader and acceptance documentation. Open PR search returned historical T19 work; separate T25 open-PR search returned none. Do not reopen those historical tasks.

Public `/environment-health` freshly returns the expected staging project and source fingerprint `b5044a6fd4da333ba7dddc5d83c8efcb62a579b086012c46235d278889164296`, LiteSpeed, managed TLS edge, TEST-only payment dispatch, disabled notification dispatch and disabled accounting worker. Auth email safeguard says `requires-independent-verification`; this is not proof of independently verified email safeguards. `/health` returned 404; the implemented endpoint is `/environment-health`.

No Plesk environment action occurred. Subscription 738/site 841, filesystem roots/startup/private checkpoint and database baseline require fresh inspection before any subsequent approved environment action. Tracker baseline/digests are historical acceptance evidence, not a fresh database read in this session.

## Existing capabilities to reuse

| Capability | Existing implementation | T25 implication |
|---|---|---|
| Verified sign-in, expiry, logout | src/auth-session.js; src/identity.js | Reuse Auth verification; current business discovery is membership based and does not discover customer relationships. Do not grant customer office membership. |
| Business customer/address ownership | database/customers-draft.sql; src/customers.js | Composite business/customer references, RLS, immutable ownership, versions and audit exist. No Auth-user/customer link exists in these tables. Matching email is not ownership. |
| Catalogue pricing and duration | src/bookings.js; cleaning profiles; existing SQL triggers | Reuse authoritative calculations and immutable snapshots. Do not accept browser totals, rates, duration or policy versions as authority. |
| Idempotency and retained bookings | createBooking and database unique request keys | Preserve identical-request replay and conflicting-request denial; customer entry requires a narrow guarded writer rather than new direct table grants. |
| Assigned-cleaner concurrency | T16 reservation exclusion constraint and workload guards | Reuse for actual assignments. Unassigned Draft/Confirmed visits reserve no cleaner; this is not a guaranteed public slot-capacity system. |
| History | Existing office customer history and booking snapshots | Reuse data through explicit customer-safe projection; office rendering is not safe customer output. |
| Payments | Accepted T20/T21 | Keep business-specific verified payment state distinct. No new charge, email, earnings or payout side effect. |
| Assessed services/equipment | Cleaning-profile assessment and recorded distance evidence | Do not expose office overrides as customer input or invent automatic assessment/distance. Incomplete configuration must fail closed with clear office-contact guidance. |

## Missing business decisions

No approval for these customer-entry semantics was established from the inspected tracker/repository. These are bounded questions, not approval requests for deployment:

1. **Customer identity/relationship establishment.** Proposed: an authenticated customer may create a NEW separate business relationship for themselves; only an owner/manager may link an existing business customer record to an Auth identity after independently verifying that relationship and recording evidence. Never attach old history by matching email, silently merge contacts or grant another business. Existing-contact collisions and correction/revocation need an explicit link, not an email shortcut. Confirm whether this is the intended workflow, or whether all relationships must be office-linked before customers can book. Account provisioning/verification for hosted synthetic acceptance must be separately authorised; disabled email dispatch stays unchanged.
2. **Submission/availability/payment semantics.** Proposed: create an unassigned Draft booking request, clearly labelled awaiting office confirmation; requested time is not guaranteed, no automatic charge, payment requirement or capacity reservation. Reuse current office confirmation/assignment and concurrency controls. If immediate guaranteed booking is required, specify capacity reservation/team selection and payment-before-confirmation policy independently for each business before implementing that path. The proposal does not reduce canonical T25: account, own history, correct business and an actual persisted mobile booking remain required.

These proposals are NOT approved or activated. They must not become defaults merely because preparation continues. Existing service rates, cancellation decisions and accepted financial policies are not reopened.

## Smallest complete implementation contract

After the decisions above, implement one bounded T25 increment:

1. Exact public business route bound to trusted configured business identity, resolved against current active records. Browser IDs are selectors only; no business/customer authority from forms, query strings or metadata. Public projection includes only intended business identity and bookable catalogue/pricing/policy information, never internal settings or staff IDs.
2. Customer session context independent of office membership: verified Auth plus current active explicit business/customer relationship, revalidated in native DB guards on each protected read/write. Preserve existing owner/manager/staff journeys and the existing session expiry contract.
3. Audited relationship establishment according to the chosen workflow, with tenant/customer/Auth foreign keys, immutable ownership, revocation and uniqueness. Never backfill from email. Narrow customer-safe account, address and history projection; no private office notes/access notes copied indiscriminately, teammates or business finances.
4. Narrow transactional customer booking operation that resolves its customer server-side, validates selected own address and current business catalogue, calculates prices/duration using existing engine, saves immutable snapshots and uses native idempotency. No source-table insert/update grants or weakening of existing booking triggers. Public demand/capacity semantics follow the explicit decision.
5. Mobile booking form with business identity throughout, scope/pricing/time review, clear submitted-versus-confirmed state, stable replay key after interruption and persisted own-history detail. Customer cancellation/reschedule controls are not implied by T25 wording and cannot silently acquire financial authority.
6. Additive guarded database candidate and native independent-connection tests, HTTP/API tests, existing-flow regression and concrete staging execution package. No integration is enabled before the migration and controls are qualified.

## Isolated verification performed

Runtime Node v24.22.1. Installed exact lockfile dependencies with `npm ci --ignore-scripts --no-audit --no-fund` in the isolated clone. Initial test attempt failed to load absent PGlite; after dependency installation the same affected tests and relevant additional suites passed.

`node --test test/bookings.test.js test/customers.test.js test/identity.test.js test/auth-session.test.js test/availability.test.js test/cleaning-profiles.test.js`

Result: **18 passed, 0 failed, 0 skipped**. Includes embedded PostgreSQL customer/booking/RLS/snapshot/reservation checks. These are existing-capability regressions, not T25 implementation proof or native independent-connection concurrency proof. No T25 route, schema, booking or identity linkage has been built or tested yet.

## Concrete staging acceptance checklist

- [ ] Both business routes resolve current identity and correct independent catalogue, prices, duration/timezone and approved policy presentation; unknown/inactive/mismatched route fails closed.
- [ ] Actual customer sign-in, approved relationship establishment and own account/history work without office membership. Other-customer and other-business access denied even with forged IDs or matching email.
- [ ] Anonymous public browsing allowed only on intended projection; private history and submission require chosen verified workflow. Disabled relationship/session takes effect on next request.
- [ ] Mobile submission persists one own booking with correct business/customer/address and authoritative saved snapshots. Reopen from history; catalogue changes do not rewrite it.
- [ ] Duplicate/retry/interrupted-response/concurrent submissions produce exactly one result or safe explicit conflict; different payload with same key is rejected. Native DB transaction rollback and independent-connection tests pass.
- [ ] Requested-time versus capacity guarantee and any payment requirement match the approved decision; assigned-team conflict protections remain intact. No customer payment creates earnings/payout eligibility.
- [ ] Assessed/incomplete services and unavailable dates/addresses fail clearly without inventing prices, override reasons or configuration.
- [ ] Actual hosted customer UI → API → DB journey and denial cases; desktop and 390×844 mobile viewport inspected. Physical handset verification claimed only if actually performed.
- [ ] Fresh before/after twelve retained full-row digest comparisons, accepted T20/T21 fixtures, T22 protected R0 sources, T23 versions16/14, four claims/thirty monthly events and private configuration/recovery checks pass. New approved synthetic rows distinguished from retained baselines.
- [ ] Exact-head CI, migration/function/grant checks, operating/recovery instructions and evidence boundaries recorded in canonical tracker after publication/write approval.
- [ ] Farai explicitly accepts staging before T25 is marked Done. No automatic T26 start.

Decision: **CONDITIONAL PASS for investigation/preparation and existing isolated regressions; NO-GO for inventing customer-link/booking policies or performing shared staging writes.** Canonical tracker unchanged; T25 is not complete.

## Subsequent owner decision and local implementation

Owner answered **yes** to both proposed relationship and request-confirmation rules for both businesses in this session. The missing-policy hold above is resolved for those two choices. Local implementation and isolated verification are now recorded in `docs/t25-customer-portal-20261101.md`; staging execution checklist is separate. Earlier statements that no T25 source has been built describe the initial assessment only. No publication or staging execution approval is inferred.
