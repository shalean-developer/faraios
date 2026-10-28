# T19 consolidated implementation and acceptance report

## 1. Document control

T19-COMPLETION-20261028, engineering assessment v1, 28 October 2026, Africa/Johannesburg. Repository: shalean-developer/faraios. Existing [PR #209](https://github.com/shalean-developer/faraios/pull/209), still draft. **Overall recommendation: NO-GO for T19 acceptance, merge, protected execution and activation.** T19 remains In progress; T20 remains Not started. No new PR was created or merged.

Exact implementation commit: **`10b37d803c93afecc91fdfd6400c7dc79f68ef7b`**, tree **`4f8f9f2a9cb17bb4e97024a45829f905a3e11f07`**. Local test commit `c0042b1c328847bdc98fc52f05d7bca4261edf15` has that identical tree; GitHub connector publication changed commit metadata, not file bytes. Parent PR head `7137aa9a4acb2b063abc45d8f702d7369749c587`; current staging baseline `6413058b75593addc2e028eca04db622205a0c1e`. This report/evidence-only descendant does not change the implementation identity.

## 2. Executive assessment

This coordinated effort audited the canonical tracker, current repository, T19-related open work and #193–209 history, Gate2 reviews, Issue140, custody/SQL/runtime/invoice/provider components, deployment evidence and live staging metadata. It implemented a consolidated v2 disposable acceptance candidate inside #209, retired the forgeable legacy native adapter, expanded synthetic SQL integrity preparation and independently fetched/hash-verified all149 pinned Auth/Storage migration source blobs. It retained prior evidence and all operational holds.

The source candidate can execute a complete lifecycle with signed exact scope and durable recovery when its external prerequisites are met. **Those prerequisites are not installed or accepted here.** It is Linux-only at the real entrypoint; Windows remains unsupported. No actual Docker startup, PostgreSQL integrity execution, hosted custody provisioning, recovery rehearsal, new OAuth consent or provider invoice acceptance occurred. The assignment therefore reaches genuine environment/review/authorization dependencies, not T19 completion.

## 3. Scope and limits

Only T19 files and evidence changed. T01–T18 history and unrelated code/resources were preserved. Existing Shalean/Bokkie records were inspected read-only; no customer, invoice, financial, secret or hosted-schema write was made. No Docker executable, native psql or PowerShell exists in this execution environment. The owner's13 containers were never operated on; their actual inventory was not available and is not represented by the test substitute.

Local SQL-backed source tests use embedded PGlite and fixture data. Native PostgreSQL, Windows DPAPI and provider tests have separate limits/skips. A socket-permission failure is not a product regression conclusion. No production, Vault provisioning, host trust installation, migration, OAuth or worker activation was attempted.

## 4. Authority and review independence

The owner's end-to-end mandate authorizes audit, source implementation, test preparation and reviewable PR updates. Its separate exact-operation approval restrictions remain binding. No prior solo-maintainer exception was reused. No merge occurred.

Canonical Decisions D15 approves T19-A12 owner-led isolated staging security verification; it supersedes stale documents requiring an external assessor for that staging assessment. It does **not** waive technical gates or separately required operational security review. Gate2's independently controlled reviewer/custody/exact-run review is still open. This report is the implementing engineer's assessment, not independent QA certification; independent final assurance is **NOT ASSESSED**. No second signer or qualified reviewer is assumed to exist merely because code supports two signatures.

## 5. Authoritative sources

- [Canonical Build Plan](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit): Build Tracker row20 T19, row21 T20; Decisions D13–D15; all populated T19 Evidence rows1–72. Cell notes were checked; no current note content was returned for inspected scope/acceptance/decision cells.
- `AGENTS.md`, `docs/blueprint.md`, existing T19 design/runtime/deployment/VAT/recovery documents, unapplied `database/t19-custody-{runtime,oauth,api}.sql`, and implementation/tests at the exact tree above.
- [Issue140](https://github.com/shalean-developer/faraios/issues/140), including completed inactive installation, Gate B01 closure, B02 transport hold and catalogue RLS evidence; PR209's full review history.
- PR193–209 source branches and comments; other T19 open PRs102/110/114/118/131/165/166/182, including existing evidence and holds. PR160/104 search matches are adjacent work and were not expanded into this assignment.
- Zoho ticket169559907, original23October reply by Sanu Jose re-read in connected Gmail, message `1a168b4bc8644c1a`, thread `1a1595d5db1ac03b`. No new correspondence was sent.
- Fresh read-only Supabase staging project metadata, aggregate SQL/security metadata and public staging environment-health. No secrets, raw provider payloads or protected backup material were read.

## 6. Methods and criteria

Every criterion below distinguishes source implementation, fixture behavior, actual hosted observation, historical evidence and missing runtime proof. Root causes are stated where demonstrated; historical bootstrap actors and past consenting identities remain unknown. Findings already closed by conclusive bounded evidence were not reopened. PASS is scoped to the named dimension; a source PASS never unlocks runtime or full T19 acceptance.

## 7. Fresh evidence

| Evidence | Result and practical limit |
|---|---|
| Staging project | `xdmfyrsauvqznkloroxg`, faraios-staging, eu-west-1, ACTIVE_HEALTHY; PG17.11.0.003; Vault0.3.1 |
| Public running health | Staging/LiteSpeed/managed TLS edge; accountingWorker, appPaymentDispatch and appNotificationDispatch disabled; authEmailSafeguard still requires independent verification |
| Source fingerprint | Running `9963727474a36a16984195dcd371f6122de93b503d5327b1bcb8b7adcb4c9804` equals locally recomputed selected-file hosted fingerprint. It is not proof of the entire deployed Git SHA or process image. No deploy/restart occurred |
| Custody records | Connections0, operations0, prepared references0, Vault secrets0; operational custody is not provisioned |
| Current custody boundary | t19_hosted_custody is NOLOGIN, not superuser/BYPASSRLS. Three private tables postgres-owned, RLS false, no private functions or public t19 RPCs installed. anon/authenticated/service_role/custody have no private-schema USAGE; no private-schema default ACL entries. These are effective metadata checks, not credentialed runtime/login/API denial tests |
| Vault effective functions | Installed create_secret(text,text,text,uuid), update_secret(uuid,text,text,text,uuid), SECURITY DEFINER; service_role EXECUTE true, authenticated false. Broader Vault consumer/grantor closure remains an operational security gate |
| Financial baseline | Shalean943440851:1 draft/R875; Bokkie943440162:1 draft/R410. Both disabled staging connections; both invoices not_synced, no external invoice IDs or active attempts;0 booking/customer/quote-link mismatches in the aggregate join check |
| Supabase advisor | Existing leaked-password-protection WARN and3 RLS-with-no-policy INFO findings (audit.cleaner_reservations, audit.cleaner_workload_locks, public.identity_audit). Not silently changed or counted as new T19 defects. [Password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |

## 8. Canonical requirement coverage and gate decisions

Canonical T19 requires separate invoice identities/connections, verified consenting identity and effective organisation permissions, encrypted hosted custody/scoped refresh, durable business-authorized work, generation fencing, duplicate prevention/uncertain-write reconciliation, visible failure/disconnect/revocation/recovery, authenticated API/database denials and reconciled business totals.

| Acceptance gate | Implementation/evidence | Decision |
|---|---|---|
| Canonical scope and preservation | Current scope re-read; T20 untouched; historical evidence retained | PASS, bounded governance inspection |
| Gate B01 source preparation | Prior PR161/staging closure preserved | PASS for its previously accepted source-only scope |
| Empty inactive custody installation |26Oct approved installation evidence preserved; current empty/inactive state corroborated | PASS for historical empty installation only |
| Gate2 source regression | Integrated v2 candidate,53/53 local tests, no Docker/PG call | PASS for tested source behavior only |
| Gate2 trusted operational authorization | Host-independent key custody/ledger recovery review absent; Windows unsupported | NO-GO |
| Gate2 real Docker + SQL + cleanup | No execution authorization or suitable runtime here | NO-GO |
| Hosted B02 managed role/transport acceptance | Prior pooler backend transport evidence unresolved; no approved current direct execution route | NO-GO |
| A12 operational custody/security | Empty schema is not operational service; credentialed identities, grants, API exposure/denials and runtime recovery unaccepted | NO-GO |
| Hosted backup/restore | Historical restore/catalog/provenance holds remain; fresh current-scope recoverability not demonstrated | NO-GO |
| Zoho access-model interpretation | Original provider reply confirms account-level token model | PASS for model clarification only |
| Independent Shalean/Bokkie provider connections | Dedicated identities, effective CREATE/refresh/revoke and actual grants still unaccepted | NO-GO |
| Business access isolation | Existing catalogue-only live denial PASS preserved; accounting source negative tests pass; full credentialed accounting API/RLS acceptance absent | NO-GO for complete accounting isolation acceptance |
| Accounting provider E2E/reconciliation | Internal R875/R410 baseline is intact; no matched external invoices or real-provider E2E | NO-GO |
| Final-head required CI/review | GitGuardian PASS at10b37d8; Foundation runtime CI held; no independent approval | NO-GO |
| Full T19 acceptance | Mandatory runtime/provider/security/recovery criteria missing | NO-GO; do not mark Done |

## 9. Implementation and assurance dimensions

V2 integrates exact independent owner/reviewer Ed25519 signatures, code+SQL+Node/Docker executable hashes, fixed operation policy, expiry, baseline binding, exclusive nonce consumption, intent-before-create, immutable ID binding, bounded commands, readiness, fixed SQL stdin, repeated isolation/ownership readback, exact cleanup and final inventory. Recovery after a lost create result and after process restart only identifies/quarantines resources; no auto cleanup is authorized. Caller booleans cannot unlock the retired legacy native adapter or v2 real entrypoint.

Source tests exercise real filesystem persistence/concurrency/partial records and actual harmless-child termination, plus a stateful Docker protocol substitute. They do not demonstrate real Docker kernel restrictions, vendor bootstrap viability, Windows durability, managed extensions or provider behavior. The complete reviewable candidate/procedure and trust schema are in [the integrated review packet](t19-gate2-integrated-review.md).

All149 public source blobs (75Auth/74Storage) were fetched through GitHub; each returned UTF-8 byte sequence was rehashed with the Git blob header and matched to its pinned SHA-1 before SHA-256 calculation. The [CSV](evidence/t19-completion/upstream-migration-sha256.csv) records path, both hashes and byte length. Pinned commits: Auth4eee58f296d9698a1c2c0ae14d7a0b379c7622d3; Storaged2836fe9e8157f4fc558af0071a7671d373ff3ef. This closes missing source-byte digest collection only. It does not establish executed order, deployed service binary identity or provenance of bootstrap actors.

## 10. Consolidated defect register

| ID / severity | Demonstrated cause and affected component | Correction / current status | Required verification and dependency |
|---|---|---|---|
| G2-01 Critical | Disconnected PS/v1 verifier/adapter/SQL; no executable lifecycle | V2 integrated through existing gateway; old PS remains blocked | Exact-source review + authorized eligible-host lifecycle; Windows unsupported |
| G2-02 Critical | Caller grant flag forgeable; signature-only verifier cannot issue trusted single-use authority | Legacy native adapter retired; v2 protected host registry, two signatures, exact binding and exclusive durable ledger implemented | Independent custody, signer identity, restore/cross-host/clock-replay assurance; no self-issued keys accepted as operational proof |
| G2-03 Critical | Create may commit before ID output/receipt | Durable intent, ID binding and read-only nonce reconciliation/restart evidence implemented | Real lost-ack/crash faults on approved host; uncertain resources quarantined |
| G2-04 High | Unbounded native commands and no daemon-cancellation proof | Bounded no-shell process, output cap, kill/close handling and no subsequent mutation after uncertainty | Actual Docker daemon outcomes and target-OS process semantics; Linux harmless-child test is bounded evidence |
| G2-05 High | Pinned vendor startup may need different capabilities/writable paths/resources | Exact fixed policy/readback; no privilege relaxation implemented | Image registry provenance and real UID100:101/tmpfs/entrypoint startup; failure remains a blocker |
| G2-06 High | Cleanup and receipt crash consistency unproven | Exclusive fsync records, repeated ID/nonce/binding/stopped checks and quarantine implemented | Real stop/remove/interrupt faults; Windows storage/ACL/reparse-point implementation still absent |
| G2-07 High | SQL fixture not integrated and prior terminal failure could exit0 | Fixed SQL stdin integrated;42501/23505/42P06/55000, rollback and catalog equality assertions; false result exits nonzero | Actual native SQLSTATE/log evidence against exact pinned image; no SQL run here |
| G2-08 Medium | No approved13-container baseline bound to run | Signed sorted ID/name/state digest and exact pre/post reconciliation implemented/tested | Actual owner-host inventory and noninterference evidence; unavailable here |
| G2-09 High | Reviewer and exact operation approval absent | Concrete integrated packet prepared; draft and holds preserved | Qualified independent review, then separate exact host/procedure authorization |
| A12-01 Critical | Operational identity/grants/service not installed; inactive NOLOGIN schema mistaken for service readiness | Existing durable SQL/service/session/mTLS/leases/sealing/generation/disconnect/revoke code and regressions retained; no new runtime defect found in inspected scope | Owner-led staging security gates plus applicable operational review; exact provisioning/SQL/credential/deploy approvals |
| A12-02 High | Managed PostgreSQL ownership/permission/Vault behavior differs from disposable assumptions | Existing signature and minimal-owner corrections preserved; installed signatures corroborated | Controlled B02 rollback-only compatibility, effective default/grant closure, authenticated HTTP/login denials; exact current transport approval |
| A12-03 High | Client-pooler TLS does not prove pooler-backend transport; direct hosted runner lacked IPv6 route | Prior NO-GO retained; no TLS weakening or repeated workflow | Provider confirmation or approved direct IPv6 execution environment, secured credentials/current before-after fingerprints |
| REC-01 High | Fresh managed restore catalog/provisioning provenance incomplete; hosted free capacity exhausted | Historical failure/inactive-only risk acceptance preserved;149 source hashes now complete | Authoritative startup/migration identities/order, image manifests, catalog parity, Vault crypto and eligible destination + restore approval |
| ZOHO-01 High | Account-level grants and missing historical consenting-session identity caused ambiguous interpretation |23Oct provider clarification verified; no breach inferred; no broad consent retry | Current per-business dedicated identity/membership/role + pinned organisation/known TEST fixture evidence; historical identity may remain unknown |
| ZOHO-02 High | No accepted operational grants, effective writes/refresh/revocation evidence | Connect-once/background design and independent seven-field binding code retained/tested | Separate bounded consent/TEST provider operations after custody gates; no activation now |
| VAT-01 High | Organisation-specific tax metadata/rounding and legacy snapshot facts absent | Existing hold retained; no guessed tax mapping or rewriting of saved invoices | Verified business/org/version tax mappings before applicable VAT payload/receipt/SQL enablement |
| E2E-01 High | Mock providers cannot establish actual invoice/refresh/revoke/recovery totals | Broad SQL/API/isolation/fencing/reconciliation source tests pass; internal baseline intact | Authorized two-business TEST E2E, fault/retry/disconnect/revoke, external vs internal totals and final reconciliation |
| GOV-01 High | Current implementation lacks independent review and required runtime CI | Exact-source GitGuardian PASS; no inherited review/solo exception | Review exact final implementation; separately authorize existing CI Docker/native procedure; do not merge |
| GOV-02 Medium | Open historical PRs and stale tracker narrative can imply unresolved/repeated work | One consolidated report differentiates history/current facts; existing records not rewritten | Owner-controlled canonical reconciliation; old draft disposition requires its own review, not automatic merge/closure |

## 11. Risks and preserved exceptions

Owner-led A12 staging governance is preserved. Prior inactive-only recovery-risk acceptance remains restricted to that completed empty installation; it is not a fresh restoration PASS or operational risk waiver. Historical per-PR solo-maintainer exceptions do not apply to209. No security incident disposition, scanner suppression, history rewrite, branch-protection change or TLS relaxation occurred.

PR195's GitGuardian incident39169954 points to public upstream source-commit identifiers in its generator; no incident disposition was made. PR102's retained historical scanner hold is not automatically cleared by the new209 scanner PASS. Selected-source fingerprint correspondence does not attest every file/process. Private backup evidence and raw credentials remain outside Git.

## 12. Local and CI results

| Check | Exact result | Evidence/limit |
|---|---|---|
| Final Gate2 |53/53 pass,0fail/skip | [Raw TAP](evidence/t19-completion/gate2-final.tap), implementation tree4f8f9f2 |
| Final T19/accounting/adapter/invoice regressions |406total,388pass,0fail,18explicit native/Windows skips | [Raw TAP](evidence/t19-completion/t19-final-regressions.tap), identical implementation tree |
| Wider repository precursor run |774total,753pass,2fail,19skip | [Raw TAP](evidence/t19-completion/wider-precursor-suite.tap). Ran before final v2 expiry/entrypoint hardening; affected tests subsequently rerun above. This is not a green final full-suite claim |
| Two wider failures | Unix-domain listener creation rejected EPERM in hosted-staging tests156/158 | [Focused reproduction](evidence/t19-completion/unchanged-unix-socket-reproduction.tap), unchanged source/test files relative staging; do not alter T07 behavior to satisfy this environment |
| Syntax | npm run check exit0; changed module/test parse and whitespace checks pass | [Syntax log](evidence/t19-completion/syntax.txt) |
| Source inventory |149/149 Git object identities and SHA-256 computed;0missing/duplicate paths | CSV and checksums in evidence directory |
| Exact source GitGuardian |SUCCESS at10b37d803c93afecc91fdfd6400c7dc79f68ef7b | GitHub check-runs readback; not runtime security assurance |
| New source Foundation CI |NOT RUN; held with skip-ci commit, required checks remain pending | Existing workflow builds/runs Docker and native PostgreSQL; exact procedure requires separate authorization under this mandate. No check was bypassed for merge/acceptance |
| Historical parent Foundation |Run40656381172 SUCCESS at7137aa9 | Prior-head only; cannot be inherited as current-source PASS |

Dependencies installed from existing lockfile with npm ci --ignore-scripts; Node24.22.1. No package or lockfile change. Logs/checksums retained, including failures. No actual PostgreSQL Gate2 output, Windows transcript, new hosted SQL receipt or real-provider E2E receipt exists for this candidate.

## 13. Coordinated next sequence

1. Review the entire exact209 candidate and procedure, including Linux-only scope, host trust provisioning, key custody, local-ledger restore/cross-host risks, immutable Docker identity and uncertain-resource recovery. Independent review must be attributable and bound to the exact source; this engineering report cannot supply that approval.
2. Obtain separate approval for the existing Foundation synthetic CI Docker/native PostgreSQL procedure, then run required CI and preserve full results. Resolve environment/review failures without waiving checks. GitGuardian must stay successful at the final head.
3. Select the real eligible host. Windows needs a separately reviewed implementation/acceptance; this Linux candidate cannot be represented as Windows-ready. After reviewed host/trust installation and exact run-envelope preparation, request one bounded disposable Docker/SQL execution approval. Do not run from a caller-writable checkout or against the13existing resources.
4. In parallel where authorized, obtain B02 transport/provider assurance and current protected baselines. Execute hosted compatibility/security only after its own exact approval; provision custody identities/credentials/SQL/deployment separately. Preserve owner-led A12 direction and operational review distinctions.
5. After custody/recovery gates pass, approve per-business TEST consent/mappings and synthetic provider invoice operations. Run the canonical two-business invoice/quote/booking, retries/uncertain-write reconciliation, refresh, revocation/disconnect/recovery, failure visibility and final totals session. No broad OAuth repetition is needed to settle the already clarified token model.
6. Only after all mandatory evidence passes may the owner formally accept T19. T20 stays Not started until that decision.

## 14. Acceptance recommendation

**NO-GO for T19 acceptance.** Source implementation and safe regression preparation progressed materially, but mandatory real Docker/PostgreSQL, hosted operational security, recovery, provider and accounting reconciliation evidence is missing. Windows runtime work and independent operational review cannot be completed in this environment. These are explicit remaining dependencies, not an implied acceptance or request to approve unknown commands.

## 15. Handover and decisions

Owner action is next needed for an accountable reviewer/eligible runtime and exact bounded execution approvals after review. The concrete Gate2 procedure is available in the review packet; no signing-key/host installation, Foundation runtime CI, Docker/SQL execution, hosted migration, credential publication, OAuth, worker scheduling or financial operation is authorized by this report. PR209 remains draft. No change to canonical task completion status was made.

## 16. PR/evidence register

| PR | Current audited state | Source head |
|---|---|---|
|193 | Open source-only five-gate audit | d0f154f8962a20ee763f329d43aec6be64bace74 |
|194 | Open provenance manifest; no operational provenance PASS | efd15ea0df759df4ff490c7ed14cd41f39e43830 |
|195 | Open migration inventory/generator; source hashes now collected separately in209; original scanner disposition preserved |58db55a415f3b8f6b4df0f659c1d9debbe5051c1 |
|196 | Open bootstrap-actor source review; historical actor remains unknown |55f9bd4c0b3c9798614ed1168b697e0e02b9dddf |
|197 | Merged read-only hosted catalogue evidence |9bdf1f54c90b4b08bba78e94dd97e621c9a1d081 |
|198 | Open Storage0074 applicability/provenance evidence |2f15d880322273eca69a68c77320e3c4b45a19ba |
|199 | Merged read-only preflight |3d589d43ad6446e8f7fa1f5201a7ff6a6ebd9297 |
|200 | Merged safeguards specification |ecaad742a45ee1866bcfb4ddc80559fe585c795a |
|201 | Merged command candidate |a6990a6d787ad9eea9e06e71e077daa6ce909a1d |
|202 | Merged fail-closed executor gate |9756a1b99d7b67cc3b30212a37f9ddbd7d36fcda |
|203 | Merged readback controller |f25a18fba7373e3e23a2ab92a99673bff652bf2f |
|204 | Open exact-run contract; UID999 proposal superseded,55000 criterion preserved in new SQL |c737271ccee242c93fabcb52c4a8c61045f14b9c |
|205 | Merged writable-path candidate |d684964881f00dc26177bf116a786b4b1969533c |
|206 | Merged ownership/startup review helpers |7401d94a4a06b655b3961b42697c59a83842b60c |
|207 | Merged read-only adapter/interruption fencing |b018f0105e10a2da59bf2f174f80e24567735bcd |
|208 | Merged exclusive receipt/readback; Windows limitation preserved |c3844f66a6ef7b36d5477a0b06ba071e03a709c5 |
|209 | Existing draft consolidated correction/evidence candidate |10b37d803c93afecc91fdfd6400c7dc79f68ef7b implementation |

Older open T19 PRs102/110/114/118/131 and transport165/166/182 remain separate historical/review records; no automatic merge/closure or reopening of conclusively accepted bounded work occurred. Their source/model tests do not substitute for current hosted/provider acceptance. The evidence [checksums](evidence/t19-completion/SHA256SUMS.txt) cover the source CSV and raw local logs. Original audit findings remain in `docs/t19-gate2-end-to-end-audit.md`; this report adds current disposition without erasing them.
