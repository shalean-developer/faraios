# T19 rejected-consent cleanup correction

24 October 2026, Africa/Johannesburg. **Local code preparation only. No actual vault recovery, OAuth retry, provider request, deployment or tracker change.** T19 remains In progress; T20 untouched. The owner authorised this bounded fix, regression tests and independent review after the supervised attempt was stopped and the local service terminated.

## Requirement and verified defect

Canonical Build Tracker T19: separate invoice identities/accounting connections, business totals reconcile and failures visible, dependencyT18. Existing T19 D3/D4 reviewed custody/lifecycle and truthful cleanup controls require distinct handling of imported-but-unused, rejected-before-exchange, and possibly issued grant material. This correction addresses only the middle state; it does not redefine T19 acceptance.

The supervised Shalean TEST attempt displayed the administrator at Zoho consent, so Accept was never clicked and Reject returned to the local page. No code exchange or two-read verification was initiated. Fresh local status confirmed connection17ff4c10-d94b-4f77-a601-383afca5d648, then generation2/disabled/cleanupPending:false/verified:false after local disable. The imported client remains protected. Owner reports stopping PowerShell.

The existing pre-consent cleanup refuses every referencing connection; grant cleanup requires a cleanup marker; authorise refuses any previous connection. Thus the rejected attempt cannot be locally cleaned with either reviewed action. Do not fabricate provider revocation evidence, delete/reset the store or remove its audit to bypass that gap.

## Bounded implementation

| Existing T19 requirement | Defect/gap | Correction and verification |
|---|---|---|
| Reviewed exact-manifest custody | New recovery code cannot satisfy the historical manifest's runtime digest | Separate recovery approval pins the original manifest raw SHA256 and current recovery runtime digest; original import/execution hash gates unchanged |
| Connection/business/generation isolation | Generic removal would risk another binding or a used credential | Match client, business, org, dedicated identity, custodian, connection ID/generation, complete binding and both stored approval digests; refuse any other connection reference |
| Truthful cleanup and failure handling | Rejected/no-exchange state lacks grant-cleanup marker | Require disabled generation2 and the exact two-event consent_started1/locally_disabled2 history; reject missing/unknown history, credentials, cleanup markers, provenance, verification fields, unknown connection fields or prior recovery |
| Preserve evidence and no replay | Deleting the connection could permit implicit retry | Remove only the exact client secret; keep connection disabled with generation3, original history, non-secret recovery record and explicit providerRevocationClaimed:false; existing already_attempted guard remains |

The operator must separately attest observed consent rejection and no grant issuance, including relevant out-of-tool activity. Local history alone cannot prove provider state. Software validates binding/evidence shape, not the truth of a human attestation or authority of a text reference. Any possible exchange, grant uncertainty or other client reference stops this path and needs a different reviewed recovery plan. The strict event schema intentionally excludes more general cancellation/repeated-disable histories.

Recovery is an explicit offline CLI mode, mutually exclusive with service/import/check-import and both earlier cleanup modes. It reads the original immutable approved manifest plus a new non-secret recovery approval file. Both are bounded in size. Before opening the exclusive DPAPI vault, it validates the new file's exact approved hash, action, separate approval reference, old manifest hash and current recovery digest. The old approved manifest is validated at its original start solely to allow cleanup after its original window; this does not permit expired OAuth/import/verification. Storage protection, atomic replacement, exclusive writer and generic diagnostics are reused. No server/session/client API construction occurs on this branch.

## Future recovery package — not approved or executed here

The new evidence file must have exactly these fields: action=cleanup_rejected_consent, approved, approvalReference, originalManifestSha256, recoveryProbeSha, clientId, businessId, organizationId, connectionId, generation, identity, custodian, consentRejected=true, noGrantIssued=true, reference. Use approved:false while preparing it; only a separate, explicit recovery execution decision permits approved:true. No real recovery approval file is created by this implementation task.

Original manifest SHA256 remains abbf16b542d6607736f26e1535703491b3b024073290435950d780d2a6a480fd. Preserve its bytes and the old client's import binding. Do not replace its probeSha with the new code digest. Any future recovery package must independently review/hash the exact final code and evidence bytes for the Windows checkout. Changing covered source invalidates all earlier runtime fingerprints. This implementation does not authorise running cleanup against the owner's store, another grant, or another business.

Future interface (documentation only): `node scripts/t19-connection.mjs --manifest=<original-file> --cleanup-rejected-consent-evidence=<new-approved-evidence> --recovery-approved=<new-file-SHA256>`. There is no execute-approved flag in this mode. Do not run it now. Lost output/timeout is uncertain: inspect non-secret state through reviewed procedures, never automatically retry/reset. Successful local cleanup is not revocation, provider acceptance or permission to re-import/retry OAuth. A later attempt needs its own reviewed lifecycle; this fix deliberately retains the blocking tombstone.

## Validation and remaining gates

Node24.19.0/Linux: focused T19 provider/connection/vault/runner/recovery plus existing adapter/invoice/auth/identity regressions:84total,77PASS,0FAIL,7explicit Windows skips. New recovery selection:4total,3PASS,0FAIL,1Windows skip. Tests reproduce the actual lifecycle with a fake provider call counter of zero, demonstrate both old cleanup paths refusing it, then verify exact client removal, unchanged unrelated records, retained history/tombstone, denial of retry, grant-risk negatives, old-byte/new-code hash fencing and mixed CLI modes refusing before storage access.

A Windows-only real dummy DPAPI CLI/restart test is added to the existing test:t19:connection command, already called by Windows CI. It uses an isolated temporary LOCALAPPDATA root and synthetic material only. It is **not run on this Linux host**. No blanket synthetic PASS or Windows acceptance is claimed. Source syntax and diff whitespace checked. Existing main CI, hosted acceptance and original provider test results do not automatically transfer to this candidate.

Independent technical review PASS for bounded local preparation. Reviewer /root/t19_independent_review independently reran60 tests:59PASS,0FAIL,1Windows skip; new recovery3PASS/1Windows skip. The initial review found unknown credential fields on the client could be removed; fixed by exact four-field imported-client validation and missing/malformed/extra-token negatives. No remaining blocking code finding. Reviewer is a separate Codex agent sharing tooling, not formal GitHub approval or external human assurance. Recovery execution and merge readiness remain NO-GO. Required before execution/merge readiness: resolve review findings, exact-head Windows dummy DPAPI test, required CI/security and explicit owner recovery execution decision. No real-secret/provider/financial/live records were read or changed. Completed T04/T06–T18, deferred T05 and all tenant/data safeguards remain preserved. Tracker unchanged.

Final reviewed LF runtime digest:156be704ff9b2026843ce2aa79db324dc456f195351f6a19e17d95369fab71ff. Windows CRLF digest must be verified against its exact checkout before any later recovery approval. No approved recovery envelope for the real store is included.


## Owner-host Windows synthetic acceptance received

24October2026: owner supplied complete npm run test:t19:connection transcript from C:\Users\info\FaraiOS-Projects\faraios-t19-provider-test, Node24.14.1/PowerShell7.6.8 previously reported.73tests/73PASS/0FAIL/0SKIP, including Windows real dummy DPAPI restart and CLI recovery, existing vault/ACL/corruption/exclusive-writer and masked-import regressions. This is owner-supplied terminal evidence, not independently operated Windows execution or hosted CI. No real store cleanup is claimed. The current exact Windows runtime digest and changed-file inventory still require readback; expected all-CRLF digest7134448ca1158d1276db98f3784246eadb22747d11623e4277d7f87909f81605. No code edit is justified by this successful run. Final CI/security and separately approved real recovery remain pending. Do not run a recovery against the original vault from the synthetic test result alone.


Final owner-host readback: --describe7134448ca1158d1276db98f3784246eadb22747d11623e4277d7f87909f81605 exactly matches the independently projected CRLF digest of reviewed source. git diff --check produced no output. git status lists only modified package.json/scripts/t19-connection.mjs and new docs/t19-rejected-consent-cleanup-20261024.md/test/t19-rejected-consent.test.js, matching the delivered four-file patch. No post-test source correction needed. Evidence is owner-supplied readback; this is not a formal GitHub approval or a real-store recovery result. Publication, exact-head hosted CI/security and separate approved recovery envelope remain pending.

Final independent evidence assessment (/root/t19_independent_review): PASS for publication preparation; no unresolved technical preparation blocker. Windows transcript is owner-supplied, while CRLF digest was independently recomputed and four-file patch inventory matches. Supports a Draft candidate for exact-head CI/security only, subject to owner publication approval. Keep actual store disabled/generation2 and secret retained; no real recovery/OAuth retry is authorised. Merge/execution readiness and T19 closure are not granted.
