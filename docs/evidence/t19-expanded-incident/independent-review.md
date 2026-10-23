# Independent expanded-incident security review

Reviewer: separate Codex agent `/root/expanded_incident_qa`,23 October2026. Reviewed repository head `8a4aed07dd5429c3cef8963a6975efd8329e78c4` and default branch `651490e8b1e2ecd1815598d3aad7f1ebacaa3353`. This reviewer independently inspected Git source, immutable commit context, redacted search metadata and historical cleanup/regression evidence. The parent completed authenticated GitGuardian UI inspection of all six individual occurrence patches, reporting two historical workflow additions, two original evidence additions and two removal-side remediation records. This reviewer independently assessed their Git source contexts and does not claim a separately authenticated UI session. Credential values are omitted. No statuses, code, credentials, history or checks were changed or run.

## Findings by occurrence record

| Record | Independent source assessment |
|---|---|
|0454a7f82a3859994880023fffdaf62ad3ef3254 / .github/workflows/ci.yml R15|Original historical synthetic CI fixture. Commit purpose is verification of real concurrent shared-cleaner assignments in isolated PostgreSQL CI. The workflow provisions PostgreSQL17 as a job service, sets the dedicated test database, and passes a loopback database URL to Node24 tests. No production endpoint or real-secret retrieval appears in this credential flow.|
|a5b512afc30b272f1755d7449c7d979df8df86ef / .github/workflows/ci.yml R15|Historical integration of the same synthetic fixture through T16 PR47. The complete workflow Git blob is identical to0454a7f (`7eacd42116ad096fd595c4b2d519d178a91aa8ca`). This is repeated test configuration, not source evidence of a second production credential.|
|03f7ed0d6406843637618a764d21e32b44ab3024 / docs/evidence/t19-final-ci/policy.sh R32|Original reported local test-harness finding. The historical harness starts a new private SCRAM-authenticated database inside a network-disabled task container. Retained evidence verifies PID absence, database removal and successful teardown.|
|03f7ed0d6406843637618a764d21e32b44ab3024 / docs/evidence/t19-final-ci/audited-ci.yml R15|Original reported historical evidence-copy finding. All62lines match the implementation workflow after line-ending normalization. Raw Git blobs differ due to evidence checkout line endings; this is not an independent runtime use.|
|347d03e0d1221e09f73732af502317e6407675ae / docs/evidence/t19-final-ci/policy.sh L32 (-)|Remediation removal-side record. The bounded change replaces the fixed fixture password with one random runtime password and preserves SCRAM/loopback. Recorded native correct-password acceptance, wrong-password rejection and cleanup pass. This removal record is not a new exposure by itself.|
|347d03e0d1221e09f73732af502317e6407675ae / docs/evidence/t19-final-ci/audited-ci.yml L15 (-)|Remediation removal-side record. The duplicate evidence YAML was deleted from the current tree and replaced by immutable provenance; history was retained. This is not a new runtime credential.|

The older native test source explicitly constrains the database hostname to127.0.0.1 and database name to the dedicated fixture name, and provisions synthetic identities, businesses and bookings. The0454a7f and a5b512a test/workflow source comparisons show no difference for those files.

Isolation must be described precisely: the GitHub workflow maps service port5432:5432; that mapping is not explicitly bound to127.0.0.1. Its test client is loopback, but the service cannot be claimed to use the local harness's networknone isolation. Runtime port reachability of historical hosted jobs was not tested here. The standalone evidence harness, separately, has recorded networknone, dropped capabilities and no-new-privileges.

## Reuse and remaining activity

An independent metadata-only search derived the compared fixture value in memory and searched tracked text at both the reviewed PR head and the current default-branch commit. A narrower password-assignment/URL-credential pattern found matching literal credential settings only in `.github/workflows/ci.yml:15,25`. Broader token matches include database role names, variables, vendor SQL, tests and historical descriptions; these are not automatically password reuse. No source lines or values were printed for the metadata-only search.

The actual workflow retains the fixed synthetic configuration. Therefore repository-wide removal is incomplete, and a future workflow execution can create a fresh disposable database accepting that test credential. The source demonstrates a disposable CI use, not a live production endpoint. It does not prove that every independent machine, environment, database or credential store rejects the same generic value.

Historical task-owned local clusters were removed. The new harness uses a generated runtime value and passed credential rejection/acceptance tests. No evidence establishes an active real-service credential requiring rotation, but there was no live authentication or external credential-store inspection. Active state outside the proven removed fixtures is NOT VERIFIED. Neither “rotation definitely required” nor “no rotation can ever be required” is supported. Any discovered non-test reuse requires separate security handling; no rotation is authorised by this task.


The separately captured `local-fixture-metadata.json` was reviewed. The named running container `faraios-t16-test-db` uses PostgreSQL17 Alpine, declares the expected disposable test database and binds its exposed port to127.0.0.1:55432. Its configured password does not match the historical incident fixture. This is a comparison of configuration metadata, not an authentication test: an initialized persistent database can have a role password different from its container initialization environment. Actual database role credentials and data contents were not verified. No authentication or data query was attempted. This evidence does not establish active real-service reuse, and it does not prove universal inactivity.

The preserved owner comment6357574288 was reviewed through `prior-approval.json`. Its conditional approval cannot be silently extended to the newly reviewed historical workflow records. The independently reviewed `default-head.json` identifies default-branch commit651490e8b1e2ecd1815598d3aad7f1ebacaa3353; the fixed synthetic workflow configuration remains there as well as at the reviewed PR head.

## Approval recommendation and monitoring effect

**PASS for synthetic classification of the six reviewed source contexts. NO-GO for unconditional expansion of approval that asserts universal non-reuse, universal inactivity or complete repository eradication.** The original two-occurrence classification is now supported by an expanded source assessment, but the wider active/reuse questions remain bounded by available evidence. If governance requires conclusive verification outside tracked source and known removed fixtures, keep NO-GO rather than infer it.

GitGuardian's supported test-credential disposition applies to the entire incident, not just six selected records. Ignored status prevents future occurrences of that same incident from reopening or alerting. This remains material because the current workflow still uses the fixed synthetic configuration and unrelated reuse cannot be disproved. A revised owner decision must explicitly identify the six records and persistent workflow configuration, acknowledge this monitoring effect and the remaining uncertainty, and exclude all other incidents, settings, broad rules, history changes and check skipping. No previous approval is silently extended.

A conditional proposed decision may authorise only incident38407534 as Ignored/Test credential after accepting the documented bounded assurance and confirming no newly discovered/unreviewed occurrence. If the owner cannot accept these limits, retain Triggered and investigate further. A later status change would still require a genuine GitGuardian SUCCESS and independent reassessment before the security gate becomes PASS. No check was rerun during this investigation.

Official lifecycle source: https://docs.gitguardian.com/internal-monitoring/detect/incident-statuses . The prior disposition report contains the vendor-supported permissions and rerun procedure; neither is exercised here.

One attempted selectively redacted source-output read was rejected by automatic approval review because other credential values could theoretically escape the selected redaction. It was not executed. A safer structural metadata-only search succeeded, without source values, and no work remains blocked by that rejection.

T19 stays In progress; local StageB implementation PASS; PR102 draft/unmerged; accounting activation NO-GO. No T04, production, billing, provider, Git history or implementation changes were made.
