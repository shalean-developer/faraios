# T19 Stage B synthetic-credential security closeout

Starting evidence: `328abcb34e644da35bcaeb08ffb8792e7d9a859b`. Narrow harness candidate: `347d03e0d1221e09f73732af502317e6407675ae`. Application implementation remains `d4643e244f5f9538264a5beec15b03984a437d32`. PR102 remains draft; T19 In progress; accounting activation NO-GO.

## Finding verification and scope

Independent QA inspected both GitGuardian incident38407534 occurrences. policy.sh created a fresh mktemp PostgreSQL cluster, used SCRAM authentication, listened on loopback inside a network-disabled container and destroyed the cluster/container afterward. audited-ci.yml was a byte-identical copy of the existing workflow's disposable PostgreSQL17 service configuration. The two literal values are exclusively synthetic fixture credentials, not evidence of real business/provider-secret exposure. This conclusion covers the two reported occurrences, not an unbounded repository credential audit. No real secret was read, tested or rotated.

A narrowly scoped fixture-hygiene improvement was justified: the reusable policy harness now generates one32-byte random hex password per cluster using Node crypto, writes it with0600 permissions under a private temporary directory, uses it for unchanged SCRAM authentication and removes it with that cluster. The restrictive umask applies only to creating that file, preserving the tests' inherited file-creation behaviour. New executable regression requires both genuine wrong-password authentication rejection and correct-password success. No trust-mode downgrade, assertion change, log masking trick, scanner exclusion, service/workflow/application or T04 implementation change was made.

The copied YAML was historical audit evidence, not an active fixture. Editing its content into a purported random-password workflow would falsify the audit. The current redundant copy was replaced by audited-ci.md, an immutable original-source/evidence link and SHA256. The actual .github/workflows/ci.yml is unchanged. This is provenance deduplication, not a claim that historical occurrences disappear.

## Historical integrity

The original files, raw findings and49-entry manifest remain at exact328abcb. Independent QA verified all49 historical hashes directly from that commit's Git blobs. Original backup investigation, Windows CRLF failure, transport adapter failure, Linux proof and all previous QA remain preserved. The old manifest intentionally continues to describe328abcb, not the superseding current harness. New evidence has its own manifest. Git history was not rewritten.

## Regression method

All regressions use a Git archive of347d03e, whose archive hash is retained. Linux builds the exact candidate with the existing pinned Node24.22.1/PostgreSQL17.10 Dockerfile; fresh `npm ci --ignore-scripts`, unchanged `npm run check`, `npm test` and dedicated native acceptance run in a networknone,2CPU/4GB, no-new-privileges/capabilities-dropped disposable container. The inherited policy log's CANDIDATE=d4643 line denotes the unchanged application implementation; identity.txt/archive hash/build records identify the changed harness candidate347d03e. Generated passwords are neither printed nor stored in Git.

Windows safety regression uses Node24.19.0, fresh locked install, six exact syntax checks and the exact seven-file workflow command under a cleared task environment. No implementation difference affects this group; it was rerun as explicitly requested.

Docker transport safety regression uses the existing independently reviewed WSL adapter, Ubuntu26.04/Node24.22.1 and workflow-pinned PostgreSQL17.11. The disposable copy changes only the public TLS invocation into an omission marker; every synthetic dump/restore/TLS-negative/timeout/cancel/sentinel assertion is unchanged. The prior approved TLS handshake is preserved, not repeated; no public provider request was authorised or needed for this harness change.

## Actual scanner outcome and owner decision

**GitGuardian security gate: NO-GO.** Check120240059535 on347d03e completed FAILURE: same two historical occurrences at03f7ed0, scan of8commits, incident38407534. Full returned output is retained in gitguardian-candidate.json. There are no reported new occurrences at347d03e. Removing a current duplicate and improving the runtime harness cannot make a history-scanning PR check forget its preserved historical evidence.

No finding suppression, ignore directive, dismissal, check override, history rewrite, billing change or merge was performed. Within those restrictions there is no authorised code-only operation established to make this historical check green. The owner/security team must review the retained synthetic classification and decide an allowed incident-resolution process with the security service, or retain the failing gate. Any action that would suppress findings remains prohibited absent changed owner instructions; this report does not request or apply a bypass. Merge readiness remains NO-GO until a genuinely successful required security check and the separate hosted/governance gates are resolved.

The earlier no-spend CI proposal remains unapproved and does not waive GitGuardian. No new development stage, Zoho access, production deployment or accounting activation is authorised by this work.

## Completed regression results

| Check | Result |
|---|---|
| Runtime credential regression | PASS: pwfile0600, generated credential authenticates, incorrect credential produces actual password-authentication failure |
| Linux locked install / syntax | PASS, exit0 |
| Linux full Node24 suite | PASS297 tests:296 passed,0failed,1skip;183916.771652ms |
| Dedicated native PostgreSQL17 security acceptance | PASS26/26,0failed,0skip;10859.900684ms; native cleanup complete |
| Windows exact seven-file group + six syntax checks / install | PASS110/110,0failed,0skip;122535.8262ms |

The single full-suite skip is the dedicated StageB native group, covered by the following26/26 step. Legacy independent-connection concurrency ran successfully in the full Linux suite without changing its assertions. The original Windows CRLF failure remains preserved. Successful regression results are not successful hosted Actions results; the hosted execution/billing blocker and branch-governance constraints are unchanged.

Docker synthetic transport regression: **PASS**, exit0, all23 success markers including six dump modes, native restore/ACL/RLS/rollback,21TLS-negative clients, timeout/cancellation cleanup and unrelated-sentinel preservation. Runtime04:25:55–04:29:11UTC. Public provider handshake was explicitly omitted. Task-owned native database, stopped container/customimage, transport containers/network/temp directories and checked build root were removed; cleanup.log and native cleanup logs retain proof. Unrelated infrastructure and shared base images were not removed.

Independent reassessment: [QA report](independent-qa.md). Full logs, exits, environment, archive identity and raw scanner result are listed in SHA256SUMS.txt. Final evidence commit is the commit containing this report; exact SHA is provided in PR102 and the delivery response. **Fixture hardening/regressions PASS; GitGuardian security gate NO-GO.**
