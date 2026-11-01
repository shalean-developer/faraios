# T24 cleaner portal — source preparation

Document T24-SOURCE-20261101 v1, 1 November 2026. Engineer: Codex. Approval and staging acceptance: Farai. Status: local source prepared, unpublished; canonical task remains Not started until progress update. No independent-review gate added.

## Canonical scope and verified dependency

Direct live read of Build Tracker A24:L25 on 1 November: T23 Done, completed 01/11/2026, accepted PR294. Its final canonical note records explicit owner acceptance and supersedes historical pending states. T24: stage 05 Portals and notifications; deliverable Cleaner portal; requirements “My Jobs, Schedule, Earnings and Profile”; acceptance “Mobile cleaner can view assigned work and correct earnings”; dependency T23; Not started. T25 is excluded.

Read AGENTS.md, docs/blueprint.md, canonical Decisions and T04 Decisions current header/E01/BK01/V01, T22/T23 canonical acceptance notes, repository T23 source/execution reports. Open PR search returned historical T19 work, not a competing T24 implementation. Historical T19 blockers are not reopened. Current staging source base 3b8cd5e6067b585428cfbbcd8747431c0a725951, clean before this local branch t24/portal.

## Smallest complete implementation

Existing staff dashboard has placeholder assignments/earnings links. Staff adjustment and monthly settlement history already enforce own-worker scope; reuse them. Existing booking/profile table access is office-only, so do not grant staff broad table SELECT or expose complete snapshots.

Add `/cleaner?business=<id>&view=jobs|schedule|earnings|profile&page=0`. Existing verified session and current membership resolve the cleaner; no worker selector or browser-provided identity. The four tabs share responsive workspace styles. My Jobs and chronological Schedule expose assigned saved visits with saved time zone, duration, status, customer name and selected address/access fields only. Profile displays own business profile and contact, with owner correction instructions; no profile writes required by canonical acceptance. Earnings displays each own verified agreement, original version/period, own integer cents and durable accrual state. Accrued sources reconstruct existing adjustment history for approved earnings corrections, separate reimbursements, pending/disputed status and existing history links. Existing monthly statements/references are linked, preserving simulation labels.

New private stable security-definer reader has empty search_path, fully qualified relations, current live-session helper and active business/staff membership check. Public facade is security invoker. Explicitly revoke public/anonymous/service-role execution. Only authenticated callers may reach guarded reader. Worker JSON is filtered before return. Stable function plus single RPC statement gives coherent agreement/accrual snapshot; it has no financial writer, no table grants and no change to existing policies or writers. Pages return 50 records with 51st sentinel. Query errors and mismatched identity/history fail closed. Add the exact RPC to existing HTTPS/public-schema outbound allowlist.

No earnings formula, cap, price, allocation, rounding, duration, entitlement, adjustment authority, payout eligibility, account mapping or business setting changes. No fees, bank action, payment, accrual, adjustment, freeze, approval, claim or settlement action occurs in this portal. Customer payment has no earnings trigger. No new financial fixtures needed for the proposed hosted read-only journey.

## Validation and evidence boundaries

Focused first pass 12/12 (8 reused T22 tests plus 4 T24 HTTP/SQL checks), zero skips/failures. SQL executed in PGlite: own-assignment projection, private-field exclusion, own-profile, wrong business, owner/manager denial, removed assignment, suspended membership, revoked session, anonymous execution denial; protected original cents, teammate exclusion, agreement-before-accrual, repeat-read no ledger changes, pagination, escaping and fail-closed response. Existing HTTP/workspace regression 51/51. Subsequent dedicated hosted-dispatch test verifies named RPC allowed, wrong verb/private schema/plain HTTP denied. Final syntax checks and diff whitespace pass.

Broad pre-final-dispatch run: 1207 total, 1177 pass, 2 fail, 28 skip. The failures are the existing Unix-domain listener EPERM checks in this environment; no unrelated fix attempted. Not a green broad-suite claim. New native test/runner and final dispatch change require exact-head CI after publication. Native PostgreSQL binaries and Docker are absent here; no local native pass claimed. Prepared independent connections testing uncommitted accrual rollback under READ COMMITTED/REPEATABLE READ, coherent snapshot across commit, fresh transaction visibility, repeated read-only calls and unchanged exactly-once accrual/source counts. CI invokes an owned disposable cluster; it does not connect to staging or Supabase.

Supabase current function/security documentation checked; changelog read. Existing HTTPS PostgREST path retained. No Supabase port5432 use.

## Fresh read-only environment and preservation baseline

Plesk UI: staging.faraios.com, IP104.238.222.122; Git last commit3b8cd5e; Node24.22.1; application root `/staging.faraios.com/app`; public root `/staging.faraios.com/app/public`; startup `_test_payments.cjs`. Actual health: fingerprint eea0832e37d5804443510e96faa0411f7d86e2017a586dd8c12ef1f3469de420; xdmfyrsauvqznkloroxg, LiteSpeed/managed TLS, TEST-only payment dispatch, notifications disabled, in-process accounting worker disabled. Plesk retains one five-minute scheduled T19 standard worker; not changed. No private configuration opened or modified.

Direct staging database metadata: PostgreSQL17.11; private_t24 absent; two active staff memberships; six agreements/six accruals. Accepted T23 Shalean statement remains v16 and Bokkie v14; 2 statements,4claims,30events. Ordered full-row newline MD5 preservation digests (readback comparisons, not security attestations):

| Records | Count | Digest |
|---|---:|---|
| Bookings | 27 | da8ada6d7fccfeedef0407934b68db67 |
| Agreements | 6 | 59adc4ac43c7e798e095f337097a7ab0 |
| Accruals | 6 | bcde720daeb0ff198e89c9b01b2e688e |
| Adjustment sources | 6 | d9f83eb0119ba58c4c065ab90e1e1c86 |
| Adjustment items | 4 | 0c92ac2bfbc2026b5f6fa3bb7b476f6a |
| Adjustment events | 18 | 72b30bc164c489972fd3b40cd7bac425 |
| Memberships | 5 | ee896718c5bbd953ed14719885b4fcc6 |
| Earnings rules | 7 | bff5104fc05b6cc96d4ae206b5bcc2fa |
| Invoices | 9 | 2a6552aec1f9ab5991ad51362f488b94 |
| Monthly statements | 2 | fe7b392572519bd326cfc34c225cbea0 |
| Monthly events | 30 | b98d448008a43d766bad1ac7f11da316 |
| Monthly claims | 4 | 08025bdbc9adc89290a28a124ced62a2 |

Earlier accepted fixture IDs and canonical acceptance history remain authoritative and untouched. Some final T23 workspace-only evidence is absent in this checkout; the canonical final notes supply the retained acceptance mapping. Do not treat earlier source reports' pending states as current.

## Concrete next approval: publication only

Publish local T24 code, additive reader candidate, tests, native runner/CI hook and this report on bounded branch; open Draft PR against staging; record T24 In progress and source-evidence boundaries in canonical tracker. Purpose: qualify the actual candidate including native PostgreSQL and known socket failures on eligible CI. No merge, hosted migration/deployment, credentials, staff accounts/memberships, fixture writes, production or money authorised by this publication request. Expected runtime impact: none before deployment. No downtime. No credentials in diff.

After approval: commit/push, Draft PR, inspect exact-head CI and full diff, resolve only T24 defects, then prepare a specific staging package. Proposed future package captures a fresh private source checkpoint; applies only reviewed T24 reader; deploys exact qualified source and keeps startup/private configuration/scheduled work unchanged. Hosted proof needs an actual existing staff sign-in, not owner impersonation. Availability of that sign-in is currently unknown; no account creation or reset is inferred. Validate each business with its own authorised cleaner identity, or explicitly record the actual account/membership evidence boundary.

## Staging acceptance checklist — not yet completed

- [ ] Exact-head CI, broad tests and dedicated native coherent-read/rollback/retry evidence qualified.
- [ ] Approved additive reader migration, permissions/live-session checks and current source deployed; health/root/startup verified.
- [ ] Actual staff UI→API→database My Jobs/Schedule show only assigned visits in selected business; removed/foreign assignments denied.
- [ ] Actual own Profile displayed; empty profile handled without exposing another profile.
- [ ] Own Earnings reconciles accepted originals including protected R0, approved corrections and separately categorised reimbursements; agreement-only remains unaccrued.
- [ ] Existing monthly statement/reference views reconcile accepted synthetic values; no original payout replay or new claim.
- [ ] Anonymous, manager/owner cleaner-route, cross-business, revoked membership/session and mutation denials evidenced on named surfaces.
- [ ] Desktop and mobile viewport layouts visually inspected, navigation usable, no horizontal overflow. Physical-phone testing claimed only if performed.
- [ ] Baseline financial/history/membership/configuration digests preserved; no new financial records, messages or transfers.
- [ ] Operating/recovery instructions and precise evidence boundaries appended to canonical tracker.
- [ ] Farai explicitly accepts T24 staging; only then mark Done. Do not start next task.

## Operations and recovery

Cleaner signs in normally, selects an authorised business, opens My Jobs and the four portal tabs; pages retain business scope. Use existing correction-history links to understand changes and request owner review through accepted controls. Profile corrections remain owner-managed. Reauthenticate after existing session expiry; no security changes. On interrupted GET reload same page; it cannot create financial records. Missing history fails closed rather than displaying a fabricated zero.

Rollback: contain/remove the `/cleaner` route or restore qualified source from fresh checkpoint. Reader can have execute revoked as a bounded containment action if approved. Preserve T22/T23 database writers and every original agreement, accrual, adjustment, statement, event and claim. Never restore a permissive writer or delete financial history. No data rollback is required for read-only portal journeys.

Gate: CONDITIONAL PASS for local source preparation; exact-head CI/native and approved hosted evidence pending. NO-GO for claiming T24 complete or executing shared staging changes without new-session approval.
