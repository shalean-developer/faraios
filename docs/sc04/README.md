# SC-04 — delegated authorization candidate

Isolated branch `feature/sc04-authorization-20261115`, draft PR #56, stacked on
SC-03/#55 (`43609483cd04a24b86061b943042d52e07961274`) and SC-02/#54
(`8bae37db940d357a014a5ffdd561aba82a0b0d4a`). Audited previous SC-04 head
`751b2c00a1d7340fb6034769ed5f03dae47afe1f`, foundation-plan version 25 and the
frozen twenty-action catalogue. The previous 29-suite/58-test result proved
owner compatibility and delegated denial. This continuation adds permitted
manager, receptionist and worker operations and tests their restrictions.

**Delegated enablement remains OFF.** Candidate preparation and disposable proof
are separate from hosted acceptance. The private gate defaults false and has no
API, client/JWT/session flag or application switch. Only disposable operator
fixtures open it during tests. Nothing here executes automatically on merge.
No merge, deployment, hosted schema/permission change, intake change, messages
or republication is authorized. Main auto-deploys through Plesk; leave it alone.
F01–F06 remain complete; Supabase remains Free.

## Authorization model

Membership is `(business_id, environment, user_id)`, with four fixed roles.
`businesses.owner_id` remains the unique accountable owner. Exact repeatable
backfill preserves old rows; new-owner membership is atomic with onboarding.
Removing, demoting, suspending or changing the accountable owner is forbidden.
Co-owner creation, transfers and support impersonation remain unavailable.

Explicit `x-faraios-business` and `x-faraios-environment` selectors are untrusted.
Verified nonanonymous identity and an active membership in precisely that scope
provide authority. Neither user-supplied claims nor session-cached roles grant
access. Missing/foreign/mismatched selectors deny. Delegated acceptance is
preview-only; owner live operation retains its existing business capabilities.
A live delegated rollout is outside this package and remains denied.

Invitations retain the original owner-controlled, UUID-recipient-bound,
preview-only design: 256-bit one-return secret, SHA256 storage, 1–168-hour
expiry, twenty pending invitations per scope, one per recipient, single-use
acceptance, revocation and atomic immutable audit. No email-based identity
matching, delivery, registration shortcut or public invitation intake is added.

`require_member` takes a membership row share lock before authorization. Owner
revocation conflicts with this lock: an already authorized transaction finishes
before revocation commits; subsequent commands/reads using the same session and
credentials fail. An active session cannot retain cached authority. Assignment
writes and visit transitions lock the booking row, and worker assignment is
checked after that lock. Inactive staff, unassignment and revoked memberships
lose worker access.

## Consistent API and data boundary

The 42 existing scoped APIs, their private helpers, direct tables and three
invoker views stay owner-only under `authorization.sql` and `adapters.sql`.
Widening those grants would expose unrestricted drafts, finance or worker data.
Delegates instead use two explicitly guarded public APIs:

- `business_delegate_command`: fixed operation names and typed named arguments;
  no caller-controlled SQL, business/environment override or arbitrary helper.
- `business_delegate_read`: fixed resource names, exact scope, bounded reads,
  secret redaction and role-specific positive projections. Receptionist bulk
  invoices/payments are denied even with an ID filter. The separate singular
  `invoice` resource requires an exact ID and an unchanged linked booking
  agreement, and excludes payment history, audit events and document tokens.

Private implementation copies are generated from the captured effective source,
retaining lifecycle, ingress, optimistic-version, duplicate, currency, pricing,
issued-document, payment and snapshot rules. Copies replace only the explicit
owner assertion with exact membership authorization and route nested scoped
calls to private copies. **PUBLIC/anon/authenticated/service_role EXECUTE on all
copies is revoked.** They are reachable only through the dispatcher after its
fixed action/argument checks. Original APIs and policies are unchanged by this
second layer. Unknown operations and extra arguments fail closed. There is no
owner-JWT substitution or service-key impersonation.

| Catalogue action | Delegated behavior and native evidence |
|---|---|
| business.configure | Denied to all delegates, including publication/settings/service writers and shared-core bypasses. `test_05`, `test_11`. |
| customers.manage | Manager/receptionist search, create, update and explicit link; no worker directory. `test_02`, `test_09`, `test_12`. |
| enquiry.internal | Manager/receptionist create, status, notes and follow-up; worker denied; audit retains actual actor. `test_02`, `test_12`. |
| quote.draft | Manager/receptionist save/send and customer-linked creation. Receptionist requires exact visible, nonarchived fixed published catalogue names/unit prices/currency. `test_03`, `test_12`. |
| quote.override | Manager requires a persisted 5–500-character reason; receptionist cannot authorize an override by supplying a reason. `test_03`, manager HTTP `test_09`. |
| quote.decide | No internal impersonation operation; customer must present the existing exact valid capability. `test_03`, `test_12`, original owner/customer foundation journey. |
| booking.schedule | Manager/receptionist schedule; receptionist new booking requires an accepted quote, and cannot alter saved agreement or execution status. Request accept/convert uses the existing agreed fixed snapshot. `test_06`, `test_12`. |
| assignment.manage | Manager/receptionist schedule staff; no receptionist identity edits. Worker can submit only their own bounded availability request. `test_04`. |
| visit.execute | Manager or active explicitly linked worker on their currently assigned booking, Scheduled → In Progress → Completed only; no commercial/document mutation. `test_04`, `test_06`, worker HTTP `test_09`. |
| terminal.correct | Manager reasoned reopening with immutable reason/from/to audit. Receptionist/worker denied; original owner compatibility retained. `test_06`. |
| booking.amounts | Manager/receptionist scoped booking projection; worker allowlist excludes amounts and all document metadata. `test_04`, `test_12`. |
| finance.bulk | Manager scoped invoices/payments and dashboard. Receptionist/worker denied; exact receptionist issuance never grants bulk finance access. `test_03`, `test_05`. |
| invoice.issue | Manager; receptionist only unchanged nonreplacement booking agreement. Existing issuance, due-date and immutable document rules remain. `test_03`. |
| payment.record | Manager; receptionist/worker denied. Actor/history retained. `test_03`. |
| payment.reverse | All delegates denied through payment and aliases. `test_03`, original owner correction journey. |
| invoice.void_replace | All delegates denied through all invoice actions. `test_03`, original owner correction journey. |
| staff.manage | Manager only. Worker identity binding separately requires accountable owner, never staff email/name matching. `test_02`, `test_04`. |
| membership.admin | Owner-only invitations/revocation/linking and owner protection. All delegates and direct writes denied. Existing SC-04 native suite, `test_05`, `test_11`. |
| publication.read | Existing explicit published projection preserved for everyone; private publication writers stay owner-only. SC-02/baseline publication suites, `test_05`. |
| platform.recovery | Existing separately controlled operator recovery; no delegated recovery API or service-key privilege. Existing backup/private-config suites, `test_05`, `test_07`. |

Request `quote` is deliberately rejected as a dispatcher alias: it cannot skip
quote-price/reason checks. Use the quotation command. Catalogue “from”, variable
pricing, room/extra scope overrides and future domain visit/resource/variation
capabilities are not implicitly enabled for receptionists. The existing five-step
public booking flow, submitted snapshots and owner journeys remain untouched.
These are capability boundaries, not wider industry/pilot acceptance claims.

## Application candidate

`stage.py DESTINATION` builds a fresh disposable application copy and fails on
source drift. It never edits/deploys the real runtime. Common lookup discovers
active scopes on each request, honors exact selected context, and never picks
an arbitrary first business. Delegates must explicitly choose their workspace;
ambiguous owner/membership contexts require selection. One original owner scope
retains its existing journey. REST calls receive the selected context headers.

`context.php` provides CSRF-protected business/environment selection and validates
against current discovery. `delegated.php` provides role-specific normal forms
for permitted customer/enquiry/quote/scheduling/assignment/issuance/staff and
worker actions. All writes use the same dispatcher; all reads use safe
projections. Delegates entering an owner page are directed to their workspace.
A stale/revoked selection is discarded. Worker pages expose only their assigned
jobs and their own availability request. Recovery/export adapters include the
private authorization schema. Candidate PHP under docs returns 404 unless
staged alongside account/core.php.

The workspace is intentionally a bounded acceptance surface (at most 100 rows
per resource), not certification of large-directory navigation, browser/mobile
pilot UX or new outbound sharing. No customer communication is sent. See the
exact HTTP tests; do not infer an independently verified hosted browser journey.

## Reproduce and recover

Apply only inside a disposable local cluster, in order:

1. Existing migrations and the reviewed existing manual activation profile.
2. `docs/sc03/foundation.sql`.
3. `docs/sc04/authorization.sql` then `adapters.sql` then `delegation.sql`.
4. Stage the candidate app/backup/recovery adapters together.

Never apply the old release activation/deactivation scripts after the SC-04
adapters: they replace guarded definitions. Candidate installation itself fails
on duplicate application; owner backfill alone is intentionally repeatable.

Run `python3 tests/release-checks.py` with PG_BIN and PHP_BIN set. The runner uses
loopback disposable PostgreSQL, synthetic records, simulated Auth/REST and real
PHP HTTP. Twelve new methods cover permitted/forbidden operations, aliases,
anonymous/spoofed contexts, shared-account scope selection, stale versions,
assignment filtering, active-session/in-flight revocation and fresh recovery.
The additional hostile matrix contains 315 attempts: 126 against all 42 legacy
RPCs, 126 cross-scope commands and 63 revoked commands. The original SC-04 suite
retains its separate 252-attempt denial matrix and owner/financial journeys.

Actual GPG export/fresh restore compares every one of 43 nonempty-or-empty table
fingerprints plus policies, function bodies/effective API ACLs, invoker options,
triggers, schema grants and audit sequence. Restored delegated permitted reads
and worker execution are rechecked in rollback-only transactions. Deactivation
sets the gate off, revokes new endpoints, restores captured originals/column
grants, removes only SC-04 policies and preserves all old/new records. Restore
the original application with deactivation. Never drop history to roll back.

**Local gate PASS:** 30 suites / 70 Python test methods, PostgreSQL 17.11 and
PHP 8.4.27, plus native backup, private configuration and watchdog checks.
Latest-head remote CI is recorded in `validation.json` and the draft PR.
Managed Auth/PostgREST/provider drift, hosted real-record census, operational
load/Free headroom and preview/pilot acceptance remain separate rollout gates.
No hosted-equivalence, RTO/RPO or production readiness claim is made.

## Remote implementation evidence

Implementation head `8432eeaf37e8589892e560bacf8b8fb07cef6fb6`, tree
`c3b790039f75c2364137e9e410d1e45713a32b3e` (exactly the locally tested tree):

- [Foundation regression 43659872616](https://github.com/shalean-developer/faraios/actions/runs/43659872616): PASS, all 30 suites / 70 methods, PostgreSQL 16. Job 132646562612 independently confirms PASS sc04-delegated and passed=true/tests=70.
- [Database backup regression 43659872741](https://github.com/shalean-developer/faraios/actions/runs/43659872741): PASS.
- [Private configuration recovery 43659872593](https://github.com/shalean-developer/faraios/actions/runs/43659872593): PASS.
- [Aggregate artifact 14139702064](https://github.com/shalean-developer/faraios/actions/runs/43659872616/artifacts/14139702064), fourteen-day retention.

The final documentation head is verified separately in draft PR #56 and the
Foundation Plan. This committed evidence identifies the exact implementation
ancestor; no self-referential commit hash or hosted acceptance is implied.
