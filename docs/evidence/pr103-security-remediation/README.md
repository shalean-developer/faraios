# PR #103 — security and cleanup evidence remediation

Original failed evidence head: `12592d1d62697f69f9d5f2b0dd2450938af664e0`; failed GitGuardian check120306947376. Narrow correction candidate: `947bb4ef534289c1d8112d82ef0a06034fda18f2`.

## Authenticated finding and evidence correction

Read-only GitGuardian UI inspection verified incident38892014, statusTriggered, detectorGeneric High Entropy Secret, one occurrence306534652. Exact source: docs/evidence/pr103-public-tls/cleanup.json line3 in12592d1. This is separate from incident38407534. No incident state, scan configuration or Regression setting was changed.

The detected field ownedToken contains the disposable Docker run identifier. Source independently generates that ID with randomBytes(16) and the PostgreSQL fixture password with randomBytes(24). In-memory comparisons confirm the ID matches captured fixture names/network; it is not used for authentication or as a database password. No detected value is included in this report or incident-assessment.json. Classification as non-sensitive fixture metadata is supported by source and captured references; it is not a global guarantee about unrelated credentials.

The field was renamed to dockerFixtureRunId, preserving its value. This corrects misleading metadata semantics; it does not suppress a detector, encode a credential, redact history or change scanner rules. Original evidence remains at12592d1; original-public-tls-SHA256SUMS preserves the prior manifest. The current historical evidence manifest was updated for exactly the renamed metadata field. All other historical logs/reviews remain intact. A historical PR scan may still fail; only its actual result can establish the security gate. No incident-ignore/resolve decision is implied.

## Confirmed cleanup defect and correction

A network-disabled, credential-free regression using the pinned PostgreSQL17.11 image reproduced one anonymous volume left by docker rm --force. The corrected docker rm --force --volumes left zero, with ownership captured before either deletion. See cleanup-regression.* and historical/corrected-ownership.json. Each test container was resource bounded and used no PostgreSQL startup or credentials.

The sole test-harness source change adds --volumes when removing the explicitly owned persistent fixtures in scripts/check-backup-transport.mjs. No application, T04, production helper, authentication or assertion changes. Docker documents --volumes removes associated anonymous volumes, not named volumes: https://docs.docker.com/reference/cli/docker/container/rm/ . No broad prune is used.

## Historical provenance gap

Initial snapshots retained only two server mappings; the first lifecycle query filtered the other mappings correctly in memory but discarded container-name rows. Later replay was empty. Docker only retains the last256 events: https://docs.docker.com/reference/cli/docker/system/events/ . This explains why delayed recovery is unreliable; the exact eviction sequence cannot be proven.

Independent supplementary investigation found the missing container IDs in local Docker logs but no fixture-name/run-ID associations. Thus historical4/4 ownership remains NOT VERIFIED. historical-cleanup-review.md preserves that investigation. A new run cannot retroactively repair the original gap.

## Prospective offline verification

The new regression uses a clean archive of947bb4e. Its disposable copy omits only the publicPoolerTLS invocation; no new public provider contact is authorized or performed. All remaining transport assertions are preserved. The reviewed WSL Docker bridge synchronously records allowlisted container/name/network/mount metadata immediately after each detached fixture starts, flushes it to disk before returning to the test, and never records environment values. This fixes the evidence-collection method without depending on event replay. Complete record identity is checked before cleanup and final container/network/volume absence is recorded afterward.

The corrected cleanup is exercised by all local transport assertions, including TLS negative cases, restore isolation, timeout/cancellation and unrelated sentinel preservation. This run is offline transport evidence, not a new public TLS result. The prior approved public probe remains PASS at81588da0de91e092463a18920f7c8522ec360c95 with its historical limitations preserved. See offline-identity.json, offline-environment.log, offline-transport.log, ownership-ledger.jsonl and final cleanup evidence for actual results.

## Remaining governance boundaries

Independent security QA and an actual GitGuardian check on the resulting exact PR head are mandatory. No check is presumed successful. If historical finding38892014 remains blocking, obtain a separate supported owner/security decision rather than changing incident status or repeatedly altering evidence to chase green.

No CI exception applied, no merge, no billing/protection/scanning changes, no deployment, no T04 change, no live Zoho or accounting activation. PR103 remains Draft; T19 In progress; accounting activation NO-GO. Owner exception approval, protection/reviewer confirmation, applicable formal approvals and separate merge authorization remain outstanding even if current cleanup verification passes.

## Preserved first offline attempt failure

The first offline run reached all23 transport PASS markers and fixture cleanup, then the outer Bash wrapper returned127 with a trailing-fragment command error. During that execution the operator had rewritten the active wrapper to correct a comment. The timing and resulting fragment are consistent with Bash resuming at an invalid file offset; the log alone does not independently prove the exact parser offset. This is a harness/orchestration failure, not a transport assertion failure. Overall first attempt is FAIL, not relabeled PASS.

attempt1-offline-transport.log, attempt1-exit.txt and ownership-ledger.jsonl preserve that run; attempt1-cleanup.json records all4 captured fixtures and volumes absent. A second offline-only attempt uses offline-run-frozen.sh, a separate one-use marker, and before/after wrapper hashes. No active file is edited. Its result must be assessed separately; no public provider probe is repeated.
## Final prospective regression result

Frozen attempt2: PASS, exit0, all23 offline transport markers, no public TLS invocation. Four detached fixtures each had a unique anonymous volume captured synchronously before teardown. Final exact-ID checks show zero remaining captured containers, volumes or networks; temp directory empty. Before/after frozen-wrapper hashes match. No supplemental volume deletion was needed for this run. The private build root was then removed after explicit absolute-path validation.

First attempt remains overall FAIL(exit127) in preserved logs; targeted historical cleanup regression remains a reproduced orphan-volume finding. Corrected prospective cleanup PASS does not replace historical NOT VERIFIED mapping evidence. Final independent-review.md and exact resulting GitGuardian observation determine the remaining gates; no scanner success is presumed here.
