# T19 current acceptance decision — 28 October 2026

Engineering assessment under the owner's T19-only mandate. **Full T19: NO-GO / In progress. T20: Not started.** This is not independent certification. Earlier audit reports and failed attempts remain historical evidence; this report supersedes their current-state conclusions only where fresh evidence below closes the same bounded issue.

## Canonical requirements and authority

The [canonical Build Plan](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit) was re-read: Build Tracker rows20–21, Decisions D14–D15 and T19 Evidence rows65–72. T19 remains In progress and T20 Not started; no tracker cells were changed in this delivery. Canonical T19 requires separate invoice identities/connections, verified consenting identity/organisation/effective permissions, encrypted isolated hosted custody, scoped refresh, durable business-authorised operations, generation fencing, duplicate prevention, uncertain-write reconciliation, visible failures/disconnect/revocation/recovery, authenticated API/database denials and reconciled business totals. Fixture matches alone do not satisfy it.

The owner's28October instruction replaces reviewer nomination/co-signature prerequisites for this owner-led staging path; see `t19-owner-led-acceptance-20261028.md`. It does not waive independently trusted owner-key custody, technical acceptance or separate approvals for Docker/SQL/credential/OAuth/accounting/financial operations. No prior PR-specific exception is reused. No protected operation is authorised by an `enabled` configuration field.

## Exact implementation and delivery identities

| Component | Source / PR |
|---|---|
| Gate2 owner-signed v4 implementation | PR209, mergedc64051ed682fb5dde192ecc4d4ca524b68f9f484; owner-led source595d5a0c6717332b7f27a8537f4f6f1cf1185e0d |
| Non-root protected deployment paths/file loading | PR210 sourcea871b098f316837d4d6151b61e4a614c279f1fc8; staging mergefa72a27b083f8ece0d4a976047ac46c501c03b7c |
| Actual accepted credential-free probe | PR211 source8778edf6f65dd7a5bf04c3da1794284ccb56fc54; executable SHA25608bfc6e8d1408f8a690343cea66c74f565d781a939c4792d333e98ab02d322b7 |
| Inactive managed custody composition | PR211 sourceb32b3a5421cc1a80c579ea0e95af5cab3d660646; tree321cb5dd96ed7cf3eb87d15cdf03ed5c4fca1952 |
| Expected hosted fingerprint for this source | a81578d23d28936418942b259e6bc04c90be090295c2a127617a06f9af63b8bd |

The final report-only descendant and merge/CI identities are recorded in PR211. A file fingerprint is a selected-source check, not proof of process image, runtime security or every Git object.

## Implementation and runtime evidence

The isolated custody subscription846 has system userfaraios_t19/uid10521, separate from websiteuid10463. Earlier positive owner-read and six actual cross-account EACCES read/list/write results remain accepted for their tested0700/0600 fixture scope. Sharedgid1003 is not isolation; owner-only private directories/files are essential. No provider/database credentials were provisioned.

The owner installed a free TLS certificate. Strict TLS1.3 verification passed for custody-staging.faraios.com and its www alias, expiry26January2027. No certificate warning was bypassed and no key exported.

The corrected owner-approved probe produced real403/Unavailable over strict HTTPS, kernel-verified Unix listening underuid10521, readiness and10/20second heartbeats. Plesk Restart App was invoked by58173ms; originalpid3376255 recorded SIGTERM and disappeared; a new nonce/pid3377021 became ready. A third managed instancepid3377555 arose during shutdown/reconfiguration; its precise trigger is unknown. All three recorded SIGTERM and final process inventory was empty outside the diagnostic CLI chain. All seven owner-only journals remain: four earlier startup refusals and three reconciled instances. Subscription suspended, Node disabled and original25.9.0,/httpdocs roots,app.js restored by128315ms, within five minutes. Evidence: `evidence/t19-plesk-lifecycle/lifecycle-pass-20261028.json`.

This proves the observed lifecycle interval only. It does not prove indefinite availability, reboot startup, database draining, hosted credential security, provider recovery or financial reconciliation.

Inactive service source now provides:

- `_custody.cjs`: exact isolated UID/root/startup/loader/socket binding; actual Unix-listener verification before private-file reads/DB startup; fixed protected config outside Git.
- Public managed listener: only503/Unavailable while preparing and403/Unavailable after private readiness. No accounting proxy, provider dispatch or request-data logging.
- Private HTTPS service: actual127.0.0.1/IPv4/port binding checked through native net.Server address; existing mTLS, machine/business grants, seven-field credential binding and durable operations reused.
- Interruption handling: public intake closes; delegated custody drains; a service finishing after an interruption is also closed; unexpected primary/private listener shutdown withdraws readiness and closes the service.
- Optional protected web/scheduler transport profile: fixed strict-public-HTTPS GET cold-start checks, bounded/coalesced, carrying no user token/cookie, client certificate/key, business ID or body. Only inert503 startup checks retry. Private accounting/provider requests never enter that retry loop; actual mTLS remains required. Web-session validation precedes wakeup and wake failure blocks private dispatch.

No actual custody application/config/grant/schedule was installed or selected by this service preparation. `_passenger.cjs` remains the default web startup. Importing modules does not activate work.

## Tests and CI

Local `npm run check`: PASS. Local focused suite: **54PASS,0FAIL,0SKIP**, including actual HTTP/TLS requests, strict certificate rejection, timeout bounds, public denials, authenticated mTLS bridge, membership withdrawal, foreign root/UID/socket denial, TCP rejection before credential loading, signal-during-load/startup faults, late-service cleanup, unexpected listener shutdown, loopback binding despite HTTP interception, protected-file tests and existing operation/machine/provider-adapter regressions. See `evidence/t19-plesk-lifecycle/managed-composition-local.tap`.

Implementation CI at exact sourceb32b3a5421cc1a80c579ea0e95af5cab3d660646: Foundation40695003101 **SUCCESS**. Linux814total/796PASS/0FAIL/18explicit skips; dedicated native PostgreSQL26/26PASS; C2 native18/18PASS; three additional custody scenarios1/1eachPASS. Windows and backup-transport jobsSUCCESS. Isolated startup40695003092 and recovery source preflight40695003094 alsoSUCCESS. The final report-only head has its own ordinary required checks; its final status is recorded in PR211.

Real PostgreSQL evidence from Foundation is confined to its isolated synthetic PostgreSQL17 runner and native regressions. It is not the separately signed Gate2 pinned Supabase image run, hosted Vault/API security verification, a hosted migration or a real provider acceptance run. The new managed composition's local DB dependencies are fixtures; no real hosted database connection was made.

## Gate decisions

| Gate | Current decision | Evidence / remaining dependency |
|---|---|---|
| Canonical scope, T01–T18/history preservation, T20 hold | PASS for inspected scope | T19-only source changes; historical evidence retained; no task advancement |
| Gate2 trusted authorisation/recovery source | PASS for existing regression scope | Owner Ed25519 key verification, exact executable/scope binding, expiry, single-use durable nonce, intent/ID ownership, bounded execution/recovery/quarantine implemented in209 |
| Gate2 exact Docker/PostgreSQL/cleanup acceptance | NO-GO | Eligible independently trusted owner-key/ledger host, exact signed run and separately authorised execution not available here. Image remains pinnedsha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda. No owner Docker resource was operated on |
| Separate custody OS identity/filesystem fixture isolation | PASS for tested scope | Separateuids10463/10521, protected files and EACCES evidence; no claim of every host ACL/service |
| Public TLS and bounded managed probe lifecycle | PASS for observed interval | Strict TLS, actual socket/readiness/heartbeats/restart/termination and final parked-state reconciliation |
| Actual managed custody service | NO-GO for hosted acceptance | Source prepared/tested; actual private mTLS identity denials, config/DB grants and interruption/recovery must run under separate approval |
| A12 operational security/custody | NO-GO | Historical empty NOLOGIN installation is preserved, not operational custody. Per-business/environment grants, credential sealing/retrieval, refresh publication/fencing, durable leases, revocation/generation recovery, Vault consumers/default privileges/private Data API denials require credentialed hosted acceptance |
| Hosted backup/restore | NO-GO | Current-scope authenticated recovery, off-site/key recovery and managed provenance/catalogue holds remain. Inactive-only recovery-risk acceptance does not waive operational recovery |
| Zoho model clarification | PASS for clarification only | Existing ticket169559907/Sanu Jose reply explains account-level token/membership permissions. Historical consenting identity/entered pins remain unknown; no breach is inferred |
| Independent Zoho TEST business grants | NO-GO | Intended Shalean943440851/Bokkie943440162 metadata remains separate and disabled. Correct active consenting identity, client type, intended org visibility, effective CREATE/refresh/revoke and independent grants still need approved provider verification. No new consent was attempted |
| Business access isolation | PASS for prior bounded UI/source checks; NO-GO for complete accounting runtime | Owner UI tests1–5 accepted; earlier Bokkie-only manager denied Shalean/foreign invoice. Source mTLS/session/membership denial tests pass. Actual operational accounting API/DB credentialed cross-business denials remain |
| Internal invoice relationships/totals | PASS for prior bounded read-only sample | Last verified Shalean1draft/R875 and Bokkie1draft/R410 matched booking/quote ownership/charges; unsynced. No new final financial/DB reconciliation was performed in this probe run |
| Provider E2E and final reconciliation | NO-GO | No real new TEST provider invoice/create/retry/uncertain-write/refresh/disconnect/revoke run or provider-to-database totals reconciliation. Mocked/fixture provider results are not acceptance |
| VAT/legacy invoice eligibility | NO-GO where applicable | Verified organisation-specific tax mapping/rounding and legacy saved VAT facts absent. Existing visible holds remain; no guessed mapping or hold bypass |
| Owner app UAT / formal T19 acceptance | NOT READY for full accounting acceptance | Staging app remains available for existing functionality; new operational accounting paths remain disabled until all required gates pass |

## Consolidated remaining defects and dependencies

| ID | Root cause/component | Correction/status | Verification and dependency |
|---|---|---|---|
| HOST-01 | Raw root-string equality rejected LiteSpeed's trailing separator | CLOSED for corrected probe: accept only exact root and single trailing slash; actual hosted lifecycle now passes | Preserve the exact probe source/result; do not reopen earlier route/guard failures as current failures |
| HOST-02 | Existing custody CLI had only a private HTTPS listener and no managed cold-start composition | Source correction complete in211; hosted service unaccepted | Approved private TLS/least-privilege DB/config setup, then actual cold-start/wakeup/denial/drain/recovery verification |
| G2-RUNTIME | Trusted host/key/ledger and exact pinned-image runtime evidence missing |209 source complete; no forgeable approval fallback | Independently provisioned owner key and eligible execution environment; exact signed bounded Docker/SQL procedure and reconciliation approval |
| A12-RUNTIME | Empty NOLOGIN schema does not provide operational identities, least-privilege grants or sealed credentials | Existing source/contracts retained; runtime NO-GO | Exact reviewed hosted SQL/grants/custody provisioning authorisation, credentialed API/SQL denials, token/lease/generation interruption tests and Vault/default-privilege consumer closure |
| RECOVERY | Accepted empty-DDL risk cannot establish current operational restore capability | Historical evidence/holds preserved | Qualified isolated destination and authenticated backup/key/restore verification with exact separate approval; no paid/new project assumed |
| ZOHO-GRANTS | Historical consent evidence does not establish active independent operational business grants | Provider model clarified; no blind repeated consent or breach inference | Resolve existing support dependency and verify consenting account/client/organisation/effective grants with exact TEST-only authorisation |
| VAT-FACTS | Legacy snapshot and organisation-specific tax facts unavailable | Correct holds retained | Approved metadata/provider contract facts before mapping/SQL/adapter changes; never infer historical VAT |
| E2E-FINANCE | No authorised real-provider acceptance run/final reconciliation | Source synthetic paths tested; no actual financial acceptance | Only approved synthetic/TEST records; exact business draft/create/idempotency/retry/uncertain-write/refresh/revoke/recovery run and final provider/database totals |

## Next authorised action

Finish ordinary source CI/review and merge the inactive T19 source to staging under the owner's standing deployment instruction; verify the deployed fingerprint and disabled worker state. No further credential-free lifecycle micro-test approval is needed to prepare the remaining work: the bounded probe result is now accepted.

Protected execution still requires the concrete Gate2 host/independently held owner-key prerequisites and exact run authorisation. After its required gates, separately approve the exact hosted operational SQL/credential/mTLS/service security procedure; then approved independent TEST provider acceptance and reconciliation. These are distinct operational authorities, not reviewer nomination. No credential publication, hosted migration, new OAuth, accounting schedule/worker or financial write is authorised by merging this source.

Do not mark T19 Done or begin T20 until every canonical mandatory acceptance requirement passes and the owner formally accepts T19.
