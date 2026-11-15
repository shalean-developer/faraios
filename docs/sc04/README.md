# SC-04 — membership and explicit authorization candidate

Isolated candidate on `feature/sc04-authorization-20261115`, stacked on unmerged
SC-03 `43609483cd04a24b86061b943042d52e07961274` (draft PR #55), itself stacked
on SC-02/#54. Main remains `e0d45923b441d7833e048faa041a3f0e16cfe1e2`.
No automatic migration, application rollout or hosted permission change is included.
F01–F06 remain complete. Supabase remains Free.

## Model and authority

Membership identity is `(business_id, environment, user_id)`; environment is
exactly preview or live. Fixed roles are owner, manager, receptionist and worker.
The immutable existing `businesses.owner_id` remains the accountable owner and
its unique-owner constraint remains in place. Backfill inserts both environment
memberships, changes no old row, is repeatable, and aborts on conflicting owner
membership. New businesses receive both memberships atomically.

Selectors are the explicit `x-faraios-business` and `x-faraios-environment`
request headers. They are untrusted input. Authorization additionally requires
verified nonanonymous Auth identity, an active owner membership in that exact
scope, and equality to the original accountable owner. Missing, malformed,
foreign or mismatched selectors fail closed. Direct API clients cannot choose
authorized identity through headers. Provider-verified JWT claims remain a
required platform boundary; tests simulate the provider.

**Delegation remains disabled unconditionally.** There is no feature flag or
client setting that turns it on. Recording an accepted delegated membership does
not expose its business or any operational action. The SC-02 twenty-action
catalogue is the future bundle contract, not a claim of delegated operational
support. Customer exact-document capabilities and public projections retain
their original behavior; membership does not grant customer impersonation.
Co-owner addition, transfer, cross-business operational transactions and worker
assignment-based reads remain unavailable. The accountable owner cannot be
removed, suspended, demoted, reassigned or deleted through membership operations.
A business-row lock serializes membership/invitation changes. No owner transfer
endpoint exists.

## Invitations

Owner creates a preview-only invitation for an existing authenticated identity
UUID; no email lookup, message, contact import or public link-intake UI is added.
Only manager/receptionist/worker can be invited. Self-invitation and existing
membership are rejected. A 256-bit random token is returned once; only its SHA256
hash is stored. The token is bound to identity, business, environment and role.
Expiry is 1–168 hours. At most twenty unexpired pending invitations per scope,
and one pending invitation per recipient, are allowed under a business lock.
Acceptance atomically checks recipient, scope, expiry, revocation and unused
state, records membership and audit event, and consumes the invitation. Concurrent
acceptances produce exactly one success; retries reject. Audit insertion failure
rolls back consumption and membership. Revocation is owner-only; accepted tokens
cannot be revoked in place, but their membership can be revoked. History remains.
Invitations do not enable sign-in, create an Auth user or send a customer message.

## Complete candidate adapters

1. `authorization.sql` defines the additive membership, token and immutable audit
   records, owner protections, discovery, onboarding and bounded invitation RPCs.
2. `adapters.sql` is applied after all original migrations, the reviewed manual
   activation profile and SC-03. It snapshots the 42 effective original scoped
   function definitions and guards every existing business/environment entry
   point, including SECURITY DEFINER implementations and invoker wrappers.
   Unexpected languages/return signatures abort the transaction. Existing ACLs
   remain; authorization is an additional condition. Restrictive policies compose
   with every original policy on environment-bearing business tables. The enquiry
   activity policy follows its scoped parent. Business SELECT/UPDATE also requires
   the selected owner context. All three existing views remain security invoker.
   Public published reads remain intentional; their writes require owner context.
3. `stage.py DESTINATION` builds a disposable application copy, refuses an existing
   destination and fails on source drift. It replaces the single common business
   lookup, attaches validated session selectors to all authenticated REST calls,
   adapts business creation to an atomic identity-bound RPC, extends the recovery checker to assert explicit positive owner and outsider
   scopes through the shared `recovery.py` helper, and extends encrypted
   backup enumeration for `authorization_private`. The application revalidates
   discovery on each lookup, filters environment and rejects ambiguous selection.
   It never uses `limit=1`. No role selector or business-switch UI is exposed.
   All callers of the shared `business()` and `api()` functions inherit this
   behavior. Original runtime, migration, release and workflow bytes stay frozen.
4. `deactivate.sql` is an operator-only disposable rehearsal. Restore the original
   application alongside it. It restores captured original function definitions,
   removes only SC-04 restrictive policies, restores exact original insert columns
   and revokes new public endpoints. It retains every old and new row, protective
   triggers and audit history. Do not drop membership/history tables to roll back.

These are deliberately executable **candidate overlays outside automatic
migrations**, consistent with SC-03. Merging this documentation/test package must
not activate authorization. A future separately reviewed release must install
SQL, application and backup adapters together and revalidate the complete gate.
Do not apply original manual activation/deactivation scripts after the SC-04
adapters: they can replace guarded definitions. Compose the profile first, then
regenerate/review/retest adapters. The package fails on duplicate application;
owner backfill alone is intentionally repeatable.

## Evidence and gate

Run `python3 tests/sc04-native.py` with PG_BIN, PG_LIB and PHP_BIN pointing to
local runtimes. The existing release runner now includes SC-04. It creates its
own loopback PostgreSQL cluster, synthetic Auth identities, simulated REST and
real PHP HTTP. No hosted address, credentials or real records are used.

Ten native methods cover exact/repeated/conflicting backfill; nonempty issued
invoice/correction/ledger/publication/private-draft preservation; invitations,
expiry/revocation/bounds/atomic failure/single-use races; last-owner protection;
new owner RPC and real PHP onboarding/reload; delegated/outsider/context denial
across all 42 scoped functions (252 attempts); cross-environment direct table
read/write denial; the unchanged existing owner financial/quote journey; and the
actual candidate encrypted exporter followed by fresh native restoration.

Recovery compares all rows, effective function/table API rights, function bodies,
policies and invoker-view options. It then rehearses deactivation and checks every
row and all captured original function definitions again. New private schema
coverage is mandatory; original public-only enumeration would omit it.
The archive is temporary and deleted with the cluster; only aggregate evidence
is retained. Existing backup wrong-key/tamper and private-config tests remain.

Local/native proof is not hosted acceptance. Managed Auth/PostgREST, provider
hooks, catalogue/default-role drift, global-role bootstrap, real-record census,
Free headroom/load and browser/pilot acceptance remain separate release evidence.
Do not infer RTO/RPO or universal industry readiness from these fixtures.

No merge, deployment, hosted schema/permission changes, live intake changes,
customer messages or republication are authorized. Main auto-deploys via Plesk.
The five steps remain Service → Details → Schedule → Contact → Review.

Local final validation: **PASS**, PostgreSQL 17.11/PHP 8.4.27, all 29 suites /
58 methods. Final ten SC-04 methods additionally pass schema-grant/trigger/audit
sequence equality and context-aware recovery checks. See `validation.json`.
The optional managed Auth rehearsal is explicitly blocked in the candidate
checker until its separate adapter acceptance; the existing live checker is unchanged.

Remote submission was blocked by automatic approval review interpreting the
no-republication restriction as prohibiting a public GitHub push. Implementation
commit `4935919` remains local; no SC-04 remote branch, PR or latest-head CI is
claimed. Main was read back unchanged. Do not retry through another publishing
route without explicit authorization. Isolated preparation/local validation is
complete; remote review and the full rollout authorization gate remain open.
