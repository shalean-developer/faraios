# T19 Milestone A — focused verification and independent QA

23October2026. Windows, Node24.14.1; native PostgreSQL17.10. Base PR105: `cd40c3f8b321ffcf908877cab761518725e2eb4b`.

Reviewed runtime digest (`npm run t19:describe`): `b2f43f62aa559f54275070e417e5f13866277c5ca3102dc6a28d085537983840`. This digest covers the executable dependency list in the runner; test/report changes do not change it. After independent QA, trailing blank lines were removed from the provider file (no behavioral change), the26-provider-test suite passed again, and this digest was recomputed.

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

## Callback-alignment addendum — 23 October 2026

The owner approved adapting only the local callback to the registered `/zoho/callback`. This addendum supersedes the earlier callback prerequisite and runtime digest, while retaining the earlier test history. Current runtime digest: `551ea772904d545389443543b5d8f8b9af05c520acae36f387a6f987c9036a64`.

Independent reviewer `/root/callback_qa` inspected the final service, tests and manifest and reran `npm run test:t19:connection`: **58/58 PASS**, zero failures/skips, 26.773 seconds. This includes actual Windows DPAPI with dummy secrets and local HTTP with synthetic providers. The implementer separately passed the 57-test suite before the added manifest regression and then all 22 connection tests with that regression. Inert `npm run t19:describe` confirmed the digest and disabled execution; `git diff --check` passed.

QA verified consistent consent/exchange/handler/manifest callback, former-route rejection before vault/provider access, duplicate-state rejection, clean callback redirects and continued approved:false. **Independent verdict: PASS; no blocking findings.** No real OAuth/provider request or Zoho setting change occurred. Unchanged PostgreSQL/RLS and legacy suites were not rerun for this URL-only correction; their prior results above remain historical and are not new hosted acceptance evidence.

Callback compatibility is resolved. Provider acceptance remains NOT RUN / NO-GO pending the actor/custody, grant lifecycle, synthetic fixture, explicit execution approval and formal security/release gates recorded in E18. Organisation active status remains NOT VERIFIED. T19 remains In progress.
## Synthetic fixture evidence addendum — 23 October 2026

Independent reviewer `/root/fixture_qa` reviewed the manifest/E19 tuple against recorded browser observations and independently inspected the saved screenshot. Verdict: **PASS; no blocking findings**. The screenshot confirms Shalean TEST, INV-000001, Draft, R1.00 and FARAIOS-T19-SHALEAN-TEST-001. Customer/invoice IDs and the complete tuple rely on the recorded browser URLs, customer link and creation form; the reviewer did not reinspect live Zoho or call an API. The screenshot is included at `evidence/t19/shalean-synthetic-draft-20261023.png` for PR reviewers.

Independent focused rerun: `node --test test/t19-connection.test.js`, **22/22 PASS**, zero failures/skips, 669.627ms. `git diff --check` passed. No runtime code changed, so the callback addendum's runtime digest remains current; the completed manifest hash must be recomputed before any future approved execution. Broader historical suites were not rerun for this evidence-only change.

The fixture prerequisite is resolved by the separately approved browser provisioning. Provider execution remains approved:false; no usable dedicated grant, attended consent proof, API field comparison or explicit organisation active status has been established. Named actor/custody details, time window, cleanup responsibility, separate execution approval and required security/CI/formal gates remain. Independent agent QA does not replace owner approval or constitute an external human audit. No OAuth, sending, payment, provider API access, merge or deployment occurred in this QA/update task. T19 remains In progress.