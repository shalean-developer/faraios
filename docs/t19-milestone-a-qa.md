# T19 Milestone A — focused verification and independent QA

23October2026. Windows, Node24.14.1; native PostgreSQL17.10. Base PR105: `cd40c3f8b321ffcf908877cab761518725e2eb4b`.

Reviewed runtime digest (`npm run t19:describe`): `c572303786de32dafd6f9b4009352bc88796e5521b0d37a48b826b924bf8da07`. This digest covers the executable dependency list in the runner; test/report changes do not change it.

| Verification | Independent result | Boundary |
|---|---|---|
| `node --test test/t19-provider.test.js test/t19-connection.test.js test/t19-vault.test.js test/t19-runner.test.js test/t19-integration.test.js` | 57/57 PASS;0failures;0skips;27.285s | Synthetic provider/Auth; real local HTTP; real Windows DPAPI with dummy secrets |
| `node scripts/run-t19-postgres.mjs` | 26/26 PASS;0failures;0skips | PostgreSQL17.10, disposable local cluster; acceptance and cleanup confirmed |
| `node --test test/auth-session.test.js test/identity.test.js test/zoho-books.test.js test/zoho-setup.test.js test/invoices.test.js` | 50/50 PASS;0failures;0skips | Directly reused authentication and decimal helper plus legacy compatibility; synthetic dependencies |
| Syntax, diff whitespace and inert `--describe` | PASS | No provider or vault access from describe |

Independent reviewer: `/root/t19_implementation_qa`, separate agent in the same host/session environment, not an external human audit. The reviewer inspected sources and reran the final57-test suite after fixes. Native and relevant regression sources were unchanged after their independent successful runs. Implementers separately ran focused tests, including actual DPAPI integration. No unrelated full-platform suite was run.

## Findings resolved before final verdict

- OAuth callback success/failure redirects303 to a clean local URL with no-store/no-referrer, rather than leaving code/state in the displayed result URL.
- An unknown-outcome cleanup marker is durably written before code exchange; a crash around issuance cannot appear as no possible grant.
- Custodian cleanup may occur after the approved provider window expires, still tied to the original manifest hash/source digest and exact evidence.
- Client secret import and cleanup are pinned to business/org/client; cleanup cannot remove another connection's referenced client.
- Existing grant state is bound to the complete approved manifest digest and client ID; restart with a changed client, window or fixture fails before provider access.
- PowerShell's built-in Security module is explicitly imported for DPAPI/ACL operations; final helper diagnostics are generic. Initial environment failures were not counted as passes.

Initial restricted loopback/PostgreSQL permission failures were rerun successfully with permission to run only local synthetic tests. Initial real DPAPI helper startup failed because inherited module lookup omitted ACL commands; implementation was fixed and independently rerun. Final custody tests prove ciphertext persistence, restart, writer exclusion, corrupted-store rejection, unsafe-path/junction rejection and sanitised failure handling. Integration proves the real encrypted store through mocked consent/read flow and durable disable/cleanup-only state.

**Independent verdict: PASS for bounded local implementation; no unresolved blocking code finding.** Local Windows custody is not a hosted vault and does not protect against compromise of the same Windows user. Existing membership/role enforcement is exercised with fake Auth responses; this is not a hosted JWT/RLS acceptance claim. Local generation fencing cannot recall requests already dispatched.

**Actual provider acceptance: NOT RUN.** No real grant/client secret was used, no Zoho Accounts/Books endpoint was called, and no invoice was created or retrieved. No real Supabase session/database was used by these tests. Missing client/callback/custodian details, independently known synthetic invoice and separate explicit execution approval still block the provider run. Explicit organisation active status remains NOT VERIFIED. GitGuardian/hosted CI/Stage C approval remain separate gates; no bypass or new PASS claimed. T19 remains In progress, full acceptance/accounting activation NO-GO.
