# T19-02 hosted rollout approval package (NOT authorised)
25 October 2026 · Applies only to FaraiOS staging project `xdmfyrsauvqznkloroxg` · T19 only

## Gate before any hosted action
The current `test-support/t19-02-hosted-candidate.sql` has a disposable-only guard and MUST NEVER be applied to Supabase staging. It is NOT a deployable migration. A separate migration must be authored from reviewed SQL, without committed passwords, fake role credentials, synthetic organization values or test-only assumptions. Reviewers must record immutable migration SHA, database/region/role identity, actual owner permission, audit baseline, restore-test result and rollback plan.

## Minimum real staging service
- Dedicated, non-public custody runtime and a separately provisioned authenticated machine identity; no anonymous credentials, browser environment access, shared invoice `service_role`, developer personal login or token-return API.
- Dedicated minimally privileged custody role and non-login ownership; effective PostgreSQL grant/role inheritance/default PUBLIC grants checks. Private schema not exposed to PostgREST; tenant scope is trusted server-side and C1 seven-field values checked against authoritative connection state.
- Restricted encrypted material: validate Vault decrypted-view and create/update function grants with real role tests; use only the isolated custody identity where verified, with stable key lifecycle/backups. No actual OAuth grant acquisition until full permission matrix passes.
- Operation sequence: verified owner consent, immutable durable operation ID; authenticated custody claim/dispatch/prepare/publish with live lease/generation/credential-version fencing and uncertain egress recovery; provider response/classification never caller-selected. Business-disconnect D4 quarantines uncertainty and refuses stale publication.
- No automatic retries after dispatched uncertain refresh, no credentials or raw tokens in logs/SQL client output, no cross-business reads or mutations.
- Staging application and invoice background workers remain disabled until separate E2E approval.

## Required security evidence
Check allow and deny for all three classes: ordinary web/customer/office actor, invoice worker, restricted custody identity. Test Vault read/decrypt, public RPC overloads, SECURITY DEFINER indirect paths, SET ROLE, schema/table/sequence privileges, provider key custody, binding/generation/version isolation, two businesses, expired lease, duplicate/replayed event, disconnect both race orders, lost provider acknowledgement, aborted SQL transaction and backup restore epoch. On failure preserve prior encrypted credential and keep financial writes disabled. Independent reviewer records assessed SHA/results and residual risks.

## Rollout and rollback
1. Capture read-only schema/roles/grants and encrypted inventory counts, connection states, staging build SHA and restore point. Never extract real credentials.
2. Review migration in disposable PostgreSQL plus separate restore-test project first; verify clean additive deploy and **tested** rollback. Host permissions/key provisioning separately approved with specific operator.
3. Request **owner approval for exact staging SQL and scope** before execution; no standing approval from PR merge.
4. Provision machine credentials out of Git; deploy isolated runtime with blocked worker ingress/egress until security gate passes; tests against hosted staging use synthetic grant values first.
5. Verify signed-off access-denial results and provider consent separately for Shalean and Bokkie; keep production untouched. Any uncertainty returns NO-GO.
6. On fault, stop custody dispatch; quarantine dispatched operations, block all retries; preserve ledger/epochs and protected grants; use tested restore only with post-restore fencing, not unsafe DROP/overwrite.
No active OAuth connection, real refresh, invoicing, payments or T20 is approved by this document.
