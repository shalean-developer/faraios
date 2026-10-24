# Independent T19 provider-confirmation QA — 23 October 2026

Reviewer: independent Codex sub-agent `/root/t19_confirmation_qa`; same host/tool environment, not an external human security audit.

Candidate: base `a028fe62a2a38cb537b5f35b43a38c29b681c72f` in `codex/t19-provider-confirmation`, plus the two new negative tests in `test/zoho-books.test.js` and provider-confirmation documentation. Runtime and SQL remain unchanged. Documentation was reviewed after execution; test changes were present during the independent focused run.

## Decision

**PASS: provider-model incorporation and bounded offline isolation verification. NO-GO: complete T19 acceptance, real connection activation and release.** No blocking defect found in this documentation/test-only correction. The documented legacy runtime gaps must remain gates before a real adapter is connected.

The addendum correctly attributes the four OAuth facts to the owner's supplied 23 October ticket169559907 response from Sanu Jose. It does not falsely claim retrieval of the original message or a live-provider test. Dedicated identities and independent grants are a FaraiOS preference; grants/client names alone do not make tokens organisation-exclusive. Prior diagnostics and holds are preserved.

## Independent execution

Node v24.14.1, Windows; disposable PostgreSQL17.10; synthetic fixtures only.

| Command | Actual result |
|---|---|
| `node scripts/run-t19-postgres.mjs` |26/26 PASS,0 failures,0 skips; native acceptance and disposable cleanup markers observed |
| `node --test test/zoho-books.test.js test/zoho-setup.test.js test/invoices.test.js` |45/45 PASS,0 failures,0 skips, including both new negative tests |

Condensed terminal evidence is in `qa-native.txt` and `qa-focused.txt`. These are accurately labelled extracts, not raw full transcripts. Initial restricted-sandbox runs against unchanged base failed before native acceptance (initdb WAL rename permission denied, cleanup completed) and produced39/43 focused passes with4 environment failures (temporary-file rename EPERM and three loopback EACCES). Re-execution with local temporary filesystem/loopback permissions passed in the new candidate tree; the initial failures are not silently erased or presented as product passes.

## Coverage and limits

- Org substitution: new legacy test changes the connection organisation while independent credential pins retain the expected value, asserting failure and zero requests. Existing HTTP test rejects injected organisation fields; SQL identity is immutable; wrong-org receipts quarantine.
- Cross-business access: existing broad-token fixtures prove business-pinned routing; foreign member/worker/connection IDs fail. Native tests repeat RLS/ACL and actual HTTP over real PostgreSQL roles. They use injected synthetic sessions, not hosted JWT validation.
- Incorrect permissions: native tests deny staff/platform/foreign member access, manager configuration, forged worker calls and revoked membership. New fake-provider403 test permits only token exchange plus pinned profile GET, then fails with no financial POST or fallback. Real Zoho scope/role/membership-removal behavior remains unassessed.
- Generation mismatch: existing vault test rejects absent generation and copied ciphertext; native held-lock tests prove reauthorisation-before-dispatch fences egress and preserve uncertainty after authorised dispatch. This does not add generation fencing to the legacy adapter.
- Evidence paths checked: `database/accounting-stage-b.sql` and legacy `database/invoices-draft.sql` exist. No T04 edits or runtime change were found in reviewed scope.

Legacy gaps are already documented: internal query spread could override an org pin if future callers supplied reserved keys; profile accepts a missing active flag; receipt org comes from the binding; no generation-aware legacy token cache; plaintext setup is not production custody. Current public-call exploitation is not established. Keep the sole-list gate conservatively closed until a reviewed positive-identity replacement exists.

## Exact next action

Review and approve the bounded TEST-only identity-verification manifest with dedicated identities, expected org IDs/memberships, independent grant references, pre-existing known synthetic record IDs, minimal read scopes and lifecycle/cleanup limits. Actual execution waits for security/CI and Stage C gates. Verify returned organisation profile and the known record positively; empty lists, copied request identities and ambiguous errors do not meet V01. Do not repeat broad OAuth research or read production finances.

No live grant, provider access, merge, deploy, T04 change, security-setting change or CI bypass was performed by this reviewer. Hosted CI, GitGuardian, provider identity, production custody and reconciled business totals are not certified by these local results.
