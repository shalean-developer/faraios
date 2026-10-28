# T19 Gate 2 local disposable test — owner accepted

Date: 28 October 2026. Farai accepted the exact local disposable test result with “yes” in this conversation after receiving the technical PASS summary and its scope. This records owner acceptance of this bounded test, not independent certification, full T19 completion, hosted execution, provider activation or production authority.

## Accepted identity

- Installed bundle: /opt/faraios-t19-gate2-20261028-ready1.
- Module SHA-256: 67fe4b7a0531d3e70fbed075ae86e5efafd322a43823207e5312b7fb9603dc4c.
- SQL SHA-256: 6bc9cf8a64f056af01152961503769d68edfd93cfd254e952cba9d305dfb20af.
- Derivative image ID reported by owner-host Docker: sha256:2b3159aaa54f5bfb06dffce70ee7b2481a3489fdfb607562e12b4940e26331f8.
- Original image: sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda.
- Docker executable SHA-256: cb92457611ccecae73e395a97673de28e397eaf020f807d91153960bbfe41b01.
- Signed receipt path on owner host: /root/t19-sign-MJ9p9Vuj/approval.json. Signing verification reported expiry 2026-10-28T17:09:25.721Z; this receipt must not be reused.
- Owned test container ID: cf552bea798c6bee41f87b19973319408bd9dc716ba00f8f5f7fb3a95c3dea27, removed by the successful run.

## Owner-provided execution and durable readback

Owner pasted the actual host execution result: PASS; mutationAttempted true; cleanupVerified true; stages NONCE_DURABLE, INTENT_DURABLE, READY, SQL_EVIDENCE, RECONCILED. The subsequent read-only journal summary reported receiptMatchesIntent, bindingMatchesReceipt, stoppedRecordMatches, originalBaselineMatches and finalBaselineMatches all true; finalContainerCount13; commandErrorRecords empty.

Each complete SQL marker appeared exactly once: T19_ALLOWED_WRITE_PASS, T19_SQLSTATE_42501_PASS, T19_DUPLICATE_23505_PASS, T19_COLLISION_42P06_PASS, T19_COLLISION_55000_PASS and T19_ROLLBACK_PASS. No raw private key, passphrase or generated database key was supplied to the agent. These are owner-host observations conveyed in chat, not Docker execution performed in this workspace or a complete imported raw journal audit.

## Corrections and limitations retained

The accepted bundle includes exact environment-entry comparison independent of order with duplicate-name rejection, the approved single key-path symlink derivative, vendor initialization/PID1 readiness gating and explicit text casts in the complete catalog fingerprint queries. The affected local suite passed45/45, including embedded PostgreSQL/WASM full fingerprint and drift checks; the owner's subsequent native run supplies the bounded actual runtime evidence above. Earlier failures/quarantines are retained in the existing proposal record; their containers were separately cleaned and the original13 baseline reconciled before subsequent runs.

The result still reports runtimeEvidence false because the source initializes that field and never updates it. This is a reporting defect, not a missing SQL marker or failed reconciliation. It remains open; do not rewrite the accepted bundle, old receipts or journal to conceal it. Local cryptographic/durable evidence is not a general host-security or disaster-recovery attestation.

## Status and next boundary

This corrected local disposable test: technical PASS and owner ACCEPTED. Preserve installed bundle, image identity, signed receipt and immutable nonce records. Broader Gate2 security/fault scenarios not observed in this native run retain their stated source-test limitations. Full T19 remains in progress; T20 remains not started pending full T19 acceptance. No canonical tracker edit, remote publication, merge, hosted SQL, OAuth, TEST provider action, financial write, worker activation or production change is performed or authorized by this acceptance record. Next preparation may reconcile the restricted hosted-custody and business-denial acceptance package with current evidence before any separately scoped operations.
