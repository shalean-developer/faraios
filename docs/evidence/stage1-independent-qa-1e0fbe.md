# T04 Stage 1 — independent technical reassessment

## 1. Document control

QA-T04-S1-20261022-R2, version 1, ISSUED 22 October 2026. Reviewer: separately delegated QA agent `/root/stage1_qa`; delivery owner: `/root`. Subject: PR #98, `shalean-developer/faraios`, commit `1e0fbe8201d21d5853c65dcc216d8085c9fd52ea`, tree `38fe50cab226ec24e3ffc2a8740bb66bab988e9d`. Supersedes the gate recommendation in `stage1-independent-qa-bf402ac.md` for the corrected candidate only; the original NO-GO report remains preserved and valid as historical evidence for bf402ac.

## 2. Executive assurance summary

**QA outcome: PASS for Stage 1 synthetic staging acceptance at 1e0fbe.** Both blocking findings are closed by independently verified remediation. No remaining material blocker was identified within the reviewed Stage 1 scope. Recommend that the authorized owner accept Stage 1 and permit Stage 2 linked earnings-adjustment development and synthetic testing. This is not approval of production deployment, live financial operation or full T04 closure.

## 3. Scope and context

Includes cancellation/rescheduling assessment, owner approval, simulated refund reservations/submission/completion/release, required evidence, role/tenant enforcement, journal reconstruction, direct-RPC integrity, additive staging corrections, tests and evidence. Financial receipts and worker-pay applicability are activation gates, not blockers to this engineering gate. Pilots remain 0/4. Excludes live provider refunds, actual earnings posting/settlement, legal or worker-classification opinions, migration of real Shalean/Bokkie operations and Stage 2 implementation.

## 4. Authority and independence

The user expressly authorized a separate QA agent. This reviewer did not implement or remediate the source, did not change hosted data and did not merge or post GitHub reviews. Root implemented fixes in response to reported defects; QA independently reproduced and retested them. This is an independent AI technical assessment rather than a human audit or specialist legal/finance determination. Organizational acceptance remains the authorized owner's decision. Inherited delivery claims were assessed as evidence, not assumed true.

## 5. Applicable sources

The user's Stage 1/staging-only instructions, `AGENTS.md`, `docs/blueprint.md`, `docs/cancellation-refunds-stage1.md`, the QA skill and its deliverables/gate rules, and original QA findings QA-S1-01/02. The underlying commercial-policy authority is represented in the repository/conversation; this opinion does not make those policies legally applicable to any worker/customer or configure them for a real business.

## 6. Methodology and criteria

Reviewed PR comparison, rules, HTTP and database boundaries, migrations, policy/event tests and evidence. Independently matched final local and remote Git trees, reran the 19 cancellation tests and disposable adversarial probes, reviewed final CI and its native PostgreSQL job, and performed read-only hosted writer/hash/count/fingerprint queries. No hosted rollback script was executed by this reviewer; its 22-check results are delivery evidence, corroborated by local reproduction and independently verified deployed code/data identity.

## 7. Evidence and provenance

- GitHub final commit independently read: 1e0fbe tree `38fe50ca…`; local ab25380 has the identical tree. Local ancestry differs but reviewed contents are identical. Working tree was clean before this report.
- GitHub runs **39762056663** and **39762047580** independently retrieved: both completed/success on exact 1e0fbe. PR run policy-tests, backup-transport and zoho-setup-windows jobs all succeeded. The policy job provisions PostgreSQL 17, sets `T16_TEST_DATABASE_URL` and runs syntax checks plus `npm test`, covering the native simultaneous-reservation test.
- Independent focused rerun: 19 cancellation tests passed, zero failures/skips. Independent disposable probe passes mixed-case submission/completion, safe hydration, prohibited post-submission release/re-reservation, required date/type/UUID/Unicode evidence negatives, and unrelated-event refundId handling.
- Remediation source and migration alignment reviewed. `database/cancellation-review-rpc-event-filter.sql` exactly equals `supabase/migrations/20261022101621_t04_refund_transition_event_filter.sql`; original applied migration remains historical, with additive correction files.
- Hosted FaraiOS staging `xdmfyrsauvqznkloroxg`: independently read writer body MD5 `74b70ebe8ca473685d4d1c7d4ec0ce61`, exactly equal to local final writer body; full function-definition MD5 `3d2c39be581c76e7fe76c32531d45e37`, matching delivery evidence. SECURITY DEFINER/private schema and empty search path retained.
- Independent hosted counts: cases 0, events 0, policies 0, QA businesses 0. Independently recomputed all 18 original record-group fingerprints: exact baseline match, including original audit count 228, memberships 5 and bookings 14.
- `stage1-rpc-hardening-20261022.json`: delivery record of 22 rollback-only hosted checks, applied corrections 20261022101454/20261022101621 and no active accounting connections. Prior authenticated desktop/375px evidence is retained; no UI/JavaScript changes occurred in remediation. QA reviewed that evidence without repeating the local-browser session.

## 8. Traceability and criterion coverage

| Criterion | Result and basis |
|---|---|
| Fee ceilings, elapsed 24h boundary, customer pool, company tiers | Reviewed rules and passing tests; no material finding identified |
| Business scope and fresh roles | HTTP/database checks; normal denial/permit tests remain passing |
| Approval/version/replay and immutable client history | Reviewed implementation and PostgreSQL tests; passing |
| Submitted money cannot release or reserve twice | QA-S1-01 closed by typed/canonical identity and independent direct-RPC probe |
| Required replacement evidence and replay-valid payloads | QA-S1-02 closed by date grammar/type/UUID/text guards and direct-RPC negatives |
| Hydration parity and unrelated payload fields | Canonical stored references reconstruct; CASE-guarded transition-only state query passes regression |
| Migration identity and original-data protection | Matching hosted writer, original/follow-up migration path tests, 18 unchanged hosted fingerprints |
| Desktop/375px and synthetic cleanup | Prior delivery evidence retained; unchanged UI; cleanup independently corroborated |
| No financial activation/pilot inflation | No provider execution introduced; policies absent, pilots remain 0/4 |

## 9. Assurance dimensions

Artifact identity, functional rules, database integrity, access control, recovery boundaries, regression coverage and evidence consistency are sufficiently supported for synthetic Stage 1 staging acceptance. This conclusion does not average away pending activation requirements; those requirements belong to a different gate and remain explicitly excluded. No new specialist approval is inferred from passing software tests.

## 10. Findings and closure

**QA-S1-01, High — CLOSED on 1e0fbe.** Refund UUIDs are canonicalized before replay comparison/persistence, and accounting/state lookup uses typed UUID identity. State lookup considers only submit/complete/release transitions through guarded CASE expressions, so unrelated payload fields cannot be cast or treated as transitions. Independent test: uppercase submission/completion persists canonical reference, hydrates to completed, denies release after submission and denies second full reservation. The remediation's unrelated `refundId: "not-a-uuid"` prepare-field regression also passes.

**QA-S1-02, Medium — CLOSED on 1e0fbe.** Writer rejects missing/null/empty/unzoned/noncanonical/nonfuture replacement dates and invalid JSON numeric/boolean/string values; worker/event UUID boundaries, null holidays, required Unicode-whitespace-only text and oversized evidence are guarded. Independent probes confirm missing/space timestamp, numeric string, invalid event UUID and NBSP cannot create a case. Focused tests cover additional adjacent vectors. Valid histories reconstruct successfully. Conservative 2000-byte text bounds may reject some strings the pure JS contract would allow; they do not permit an unrenderable history and are acceptable for this staging gate.

No unresolved material finding remains within the reassessed scope. Broader legal/pay applicability and actual financial integration remain unassessed rather than passed.

## 11. Risks, exceptions and residual exposure

No formal override was needed. Staging remains simulation-only with no enabled cancellation policy. Browser evidence and hosted rollback execution were generated by delivery, not repeated end-to-end by QA; independent source identity, local adversarial verification and hosted readback provide proportionate corroboration. Historical invalid journals are not repaired by this change; independently verified zero existing cases/events means no repair is required in this staging population. Reuse in another environment requires checking that population rather than assuming it empty.

## 12. Corrective actions and commitments

No Stage 1 corrective action remains open from this review. Preserve the original NO-GO and this superseding opinion. Keep allowances Off and financial workflows inactive. Stage 2 must preserve links to original records, audit/version invariants and reservation integrity; it requires its own acceptance evidence. Reassess if implementation, schema, permissions, policy or integration scope changes.

## 13. Options and recommendation

Recommend accepting the corrected Stage 1 engineering result and proceeding to bounded Stage 2 synthetic implementation. No additional general review or live receipts are needed to begin that development. Merge and deployment decisions remain separate; this review did not execute either.

## 14. Outcome and validity

**PASS — Stage 1 synthetic staging acceptance, exact 1e0fbe, 22 October 2026 evidence cutoff after both final CI runs completed.** Valid only for the documented nonfinancial staging scope and matched deployed writer. Any substantive source, policy, permission, schema, execution integration or evidence change triggers appropriate reassessment. Decision required from the authorized owner: accept this Stage 1 result and progress to Stage 2 development. No T04-wide or go-live PASS is issued.

## 15. Governance decision and handover

The user/authorized owner retains final acceptance authority. Root may record the Stage 1 acceptance decision separately based on this independent recommendation and existing instructions. T04 remains In progress; actual pilot bookings remain 0/4; allowances Off; live financial workflows inactive. No production changes, messages, financial data mutations or actual refunds were performed by QA.

## 16. Evidence index and opinion history

Original `stage1-independent-qa-bf402ac.md` (preserved NO-GO); this reassessment; `stage1-rpc-hardening-20261022.json`; original staging/browser JSON and screenshots; final corrective SQL/migrations; final CI runs 39762056663/39762047580; focused log `/tmp/stage1-qa-final2-tests.log`; disposable final probes `/tmp/stage1-qa-final-probe.mjs` and `/tmp/stage1-qa-extra-probe.mjs` with passing output `/tmp/stage1-qa-extra-probe-fixed.log`. QA performed no implementation edits; this report is the only new artifact from final reassessment.
