# Independent T19 synthetic-credential closeout QA

Reviewer: separate Codex agent `/root/security_closeout_qa`, 23 October 2026. Reviewed candidate `347d03e0d1221e09f73732af502317e6407675ae` against evidence baseline `328abcb34e644da35bcaeb08ffb8792e7d9a859b`. This reviewer did not implement or execute the regression runs and authored only this report. Review used source, immutable Git blobs, full retained logs, environment/isolation and cleanup evidence, and the actual scanner response. Shared host/tooling means this is independent agent assessment, not external human assurance.

## Decision

**PASS for the narrow fixture hardening and requested local regressions. NO-GO for the GitGuardian security gate and PR merge readiness.** GitGuardian check `120240059535` on the reviewed candidate completed FAILURE. Offline Stage B technical acceptance remains bounded; T19 stays In progress and accounting activation NO-GO.

## Independent classification and source review

Both incident `38407534` findings are exclusively disposable test values in the reviewed occurrences. The original policy harness initialized a new private temporary PostgreSQL cluster, required SCRAM authentication and bound it to loopback inside a network-disabled container. Historical logs prove database shutdown, PID absence, directory removal and task container/image removal. The original copied workflow specifies a disposable PostgreSQL17 test service. Its SHA-256 matches the real workflow: `2e407b41c960f34c919619a8792115a299b283192f682212c59532404ba592ca`. Nothing in either reviewed lifecycle obtains a real business/provider credential. This is a two-finding classification, not a claim of a complete repository secret audit.

The candidate changes only the evidence harness and provenance documents. The harness creates one cryptographically random 32-byte hex password per cluster, writes its password file under a scoped restrictive umask, asserts mode0600, and supplies the same generated value to unchanged SCRAM initialization/client authentication. The wrong-password test requires an actual password-authentication rejection; a successful correct-password query is separately asserted. Hex encoding avoids URL-escaping ambiguity. The original test process umask, loopback restriction, database name, SQL assertions and teardown remain unchanged. No generated password is deliberately logged or committed. No application, T04, dependency, actual CI workflow or scanner configuration changed; an independent exact Git diff over those paths was empty.

The redundant YAML snapshot is replaced by an immutable source/evidence link and original hash, not edited to pretend that a different workflow was historically tested. This is acceptable provenance deduplication. The original policy and YAML bytes remain in existing history. The reviewer independently read all49 historical manifest entries from raw Git blobs at328abcb and verified every SHA-256 successfully. The old manifest correctly remains tied to that snapshot, while new evidence has a separate manifest. No failure record or historical assertion was rewritten.

## Regressions independently assessed

| Check | Result and evidence |
|---|---|
| Credential-file and native authentication regression | PASS: mode0600 assertion, wrong-password SCRAM rejection and correct-password success; policy.log contains FIXTURE_SCRAM_PASSWORD_ACCEPT_AND_DENY_PASS |
| Linux dependency install and syntax | PASS: fresh locked install and exact syntax command; exit0 |
| Linux full suite | PASS:297 tests,296 passed,0 failed,1 explicit native skip;183916.771652ms |
| Dedicated native PostgreSQL17 | PASS:26/26,0 skips;10859.900684ms, native acceptance and cleanup markers |
| Windows exact workflow group | PASS: fresh install, six syntax checks,110/110 with0 skips;122535.8262ms, exit0 |
| Docker synthetic remainder | PASS:23 success markers, six dump modes, native restore/ACL/RLS/rollback,21 TLS-negative clients, timeout/cancel cleanup and unrelated sentinel; exit0 |
| Cleanup | PASS: stopped server/PID absent/database removed; owned container/custom image removed; final task transport inventory absent, transport temp entries0 and build root absent |

The Linux full-suite skip is the separately configured Stage B native group, covered by the following dedicated26/26 run. Legacy independent-connection assertions also ran unchanged; no skipped test is silently counted as a pass. Historical Windows CRLF and earlier backup failure remain preserved.

The inherited Linux log labels the unchanged application SHA d4643e2; archive identity/build evidence separately identifies the changed harness candidate347d03e. Node24.22.1/PostgreSQL17.10 Linux and Node24.19.0 Windows environments are recorded. These are local checks, not hosted CI results.

The reviewer reconstructed the offline transport script from candidate source by replacing only its public TLS invocation with the explicit omission marker. The resulting SHA-256 `f7e6feccd29b9ad9289f816cd69c36527d51767938b58e51cd696927b8596b58` matches transport.log. All synthetic assertions are therefore unchanged. No public handshake was repeated; its previous approved evidence is historical only. Docker uses the previously reviewed WSL adapter and pinned PostgreSQL17.11 image, with the disclosed local environment difference.

## Actual security gate and remaining decision

The retained gitguardian-candidate.json reports two occurrences from a scan of8commits. Both still point to historical commit `03f7ed0d6406843637618a764d21e32b44ab3024`, policy.sh and audited-ci.yml, incident38407534. No new occurrence at347d03e is reported. This directly demonstrates that the tip refactor has not made the PR history scan successful; classification as synthetic does not equal a green check.

No suppression, scanner weakening, incident dismissal, override or history rewrite is justified or performed by this review. The owner/security team must decide an authorised incident-resolution process with the security service or retain the failing gate. Any suppressed-finding action would require changed owner instructions; the current restrictions remain binding. A successful required security check remains mandatory for merge readiness, alongside the existing hosted CI/governance gates. No further development, deployment, Zoho access or accounting activation is approved.
