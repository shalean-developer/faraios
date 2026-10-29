# T19 signed pinned-image operational SQL rehearsal

29 October 2026. **PASS for the bounded synthetic owner-host rehearsal and its post-run evidence check.** Hosted operational custody is not installed; authenticated custody login is not verified. T19 remains In progress, accounting activation NO-GO, T20 excluded.

## Provenance

The owner ran staging source a37916558f1e230d4b55c013fc4e40400c34e371 (PR #247, preparation import correction following PR #246) in a fresh private checkout. The owner reported SYNTHETIC_OPERATIONAL_SQL_PASS, then SYNTHETIC_OPERATIONAL_EVIDENCE_CHECK_PASS from the reviewed read-only checker. This is owner-host execution/readback evidence; the assistant did not independently access the private host or journal. Owner signature verification binds the receipt. Subsequent journal integrity relies on protected host custody and the recorded sorted file/hash index, not an additional signature over the journal.

| Binding | SHA256 |
| --- | --- |
| Operational source bundle | c58ae6718029d80d28257f9d509679ecea5561d75fcc96b32b3c975ffb1ffbd2 |
| Signed receipt | 18ac3fe3994d3336abe56e5d57654ba5a3f9abf4054be25d6ce9102abb24c3f6 |
| Sorted private journal file/hash index | 68106a0f219e2a5d0a4066f53c1511cbb731776ad7790a7c3167b31d7f5451d1 |

Preserve /root/t19-operational-run-GLpQWazH and /root/t19-operational-evidence-BM5Hk7 unchanged. The original approval is consumed; do not rerun it or remove nonce records. Do not publish signatures, keys, private catalogue contents or journal files. Retain the earlier failed preparation and accepted bootstrap/recovery evidence unchanged.

## Verified scope

All sixteen phases passed in order: isolation, postgres, bootstrapHelpers, bootstrapDependencies, realtime, authMigrations, authIndexes, storage, managedCatalog, custody, security, stableCatalog, stopServices, syntheticFoundation, operationalSQL and operationalBoundaries.

The candidate used the previously pinned PostgreSQL/Auth/Storage images, actual vendor Auth/Vault implementations and the accepted bounded bootstrap. It used synthetic data only, without a checkpoint or recovered application records. Auth/Storage services stopped before the synthetic foundation and operational SQL stages.

The exact reviewed runtime, OAuth and API source hashes are unchanged from the provisioning packet. Each whole SQL stage passed forced precommit abort/unchanged-state readback, unchanged-source commit, collision refusal/unchanged committed-state readback, protected row/sequence preservation and removal of temporary authority. The evidence checker verified the three stage records against the source manifest, six expected SQLSTATE 55000 probes and sixteen expected 42501 denials, with no unexpected command-error/failure record.

Final checks covered ten empty RLS custody tables, eleven runtime-owned private functions, both custody roles remaining NOLOGIN/non-administrative, no retained runtime-owner SET/private CREATE/Auth schema USAGE, and empty Vault. Synthetic manager access passed; foreign-business and staff access were denied. Direct private-table/runtime/OAuth/revocation requests were denied for anon/authenticated/service_role. A privileged fixture handoff checked the custody role's permitted empty machine lookup and denied direct custody/Vault reads. That handoff is not a password/TLS-authenticated custody login, real machine registration or hosted business API test. Managed service_role Vault capabilities were not blanket-revoked or claimed absent.

The post-run checker verified source, owner public-key fingerprint/signature, canonical receipt, expected-metadata digest, consumed-nonce binding, intent/signed baseline, exact ordered phases/result, SQL-stage/command/boundary evidence and cleanup records. It performed a fresh read-only Docker inventory comparison: all thirteen original containers plus signed networks/volumes matched. It checked the original journal file list and bytes remained unchanged and wrote a separate evidence index.

## Remaining admission

The compatible-candidate whole-stage SQL prerequisite in the provisioning packet is now demonstrated for this exact source and empty synthetic state. It does not approve hosted SQL execution or establish the private host, credentials, transport or real security boundaries.

Next is current read-only qualification of the existing isolated Plesk custody subscription: identity10521 versus web10463, private paths/ancestor ownership and modes, source fingerprint, parked settings and disabled schedules, log destinations/redaction and supported lifecycle/private listener configuration. The prior credential-free lifecycle interval remains historical evidence, not current activation or indefinite availability proof. Do not load credentials, select startup, enable Node/subscription, create keys/roles, schedule jobs or activate providers during that inspection.

Then close current Vault/legacy consumers and actual API exposure; nonempty custody recovery/fencing; exact staged hosted execution wrapper and protected before-state; separately approved restricted identities/configuration/grants and authenticated custody transport. Actual authenticated API/database/machine boundary tests, both TEST connections/fixtures, real accounting scenarios, totals reconciliation and owner UAT remain in the agreed order.

No numerical T19 score is changed by counting this gate alone. Reassess the full acceptance register before revising the score or claiming full T19 acceptance. The protected restore project remains untouched.
