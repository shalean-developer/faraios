# T19 consolidated closeout

30 October 2026. Owner requested combined remediation. T19 only; T20 remains Not started. This is an engineering work package, not independent certification or full acceptance. The canonical Build Tracker remains the acceptance authority; D15 and the later owner-led acceptance decision supersede the historical external-reviewer prerequisites. Preserve historical journals and completed rehearsals.

## Current verified state

Source baseline: staging `9771c274a55f53a77c93a6d2347f5b900873de05` (PR255). All four merged-head checks passed; policy job123955429789 records dedicated native PostgreSQL/security/restore results and CI_POLICY_EXIT=0. This is prior-source CI, not verification of this work package.

Fresh read-only native capture through the connected staging database returned `a94b2ba59a7bab2e2345c10e7a51a8a029dbfa642ded3633c652a7232bb94fd5`, exactly the original protected baseline. Separate catalog/count queries found runtime owner absent, zero private functions, custody NOLOGIN, three empty inactive tables and zero Vault secrets. Therefore the failed installation did not persist; no new commit installation is accepted. This reconciles database state, not private operator journal completeness or permission to replay an old packet.

A bounded function-body scan found no non-Vault routine referring textually to vault/decrypted_secrets/create_secret/update_secret. This does not close dynamic SQL, external/service-key consumers, Edge Functions or private-host configuration. No grants were revoked and no private credential was read.

Fresh Supabase UI inspection confirms public/graphql_public selected and audit/private_t19_custody excluded from exposed schemas. No setting was changed. Plesk subscription846 readback confirms Node disabled, Node24.22.1, /app and _custody.cjs selected, document root /httpdocs outside the app. The CLI ran as10521; app and private directory are owner10521/mode0700, custody.json absent. Identity directory entries are regular non-symlink owner10521/mode0600 files (CA/server/callback material); only metadata was read, so this is not key/certificate validity, cryptographic pairing or machine-client acceptance.

The installed sealed package lacks /app/public. Adding an unmanifested directory would break package verification. This work package instead includes exactly one inert public/index.html in the curated source/dependency manifest; no runtime source/configuration/credentials are mapped into that public root. The source correction creates a reviewable path to /app/public after a separately verified inactive upgrade, rather than pointing the document root at /app. No live directory/root/package setting was changed. Existing upgrade.lock, receipts, old package and rollback app are preserved; a subsequent upgrade still needs explicit lock/recovery disposition and exact previous/new verification.

## Combined blocker register and acceptance order

| ID | Work | Current disposition | Closure evidence |
|---|---|---|---|
| C01 | Reconcile uncertain runtime installation | Original full native baseline verified; runtime absent | Fresh capture above; retain old attempt and intent unchanged |
| C02 | Make outcome inspection consistent | Read-only reconciler added in this branch | Protected packet byte/binding tests, SQL refusal test, exact native TLS original/commit/drift cases in existing full-stage runner; native CI required |
| C03 | Install runtime, OAuth and API | Hosted runtime absent; remaining stages uninstalled | Separately reviewed exact packets, current protected baseline/quiet window, per-stage transaction and fresh full catalog/permission/data verification; no automatic stage progression |
| C04 | Close security admission | Partial source/catalog evidence; open | Current Data API exclusions and HTTP denials; default/indirect/Vault consumer closure; restricted credentialed login and machine/business/API allow/deny evidence |
| C05 | Qualify private host and callback | Current disabled host/private modes verified; missing public root addressed in source package; credentialed acceptance open | Verify new inactive package, preserve prior upgrade/lock evidence, select only its public subdirectory; qualify TLS identities/expiry, logging and encrypted dummy callback original-session/replay tests |
| C06 | Verify nonempty recovery | Accepted empty-custody restore and synthetic operational rehearsal retained | Encrypted nonempty custody/operation recovery, external generation/epoch fencing and uncertain-operation reconciliation before credential admission |
| C07 | Connect separate TEST businesses | Not accepted | Independently verified consenting identities, intended organisations/permissions, separate grants/mappings, refresh/revocation/disconnect evidence |
| C08 | Verify accounting and reconcile | Not accepted | Both TEST invoice journeys; concurrency/replay, uncertain writes and recovery; failure visibility; external/internal totals and applicable verified tax mappings |
| C09 | Owner UAT and T19 acceptance | Open | Both businesses tested in staging; every mandatory criterion linked to versioned evidence and owner acceptance; then tracker reconciliation |

Code fixes can share this branch/PR. Hosted operations remain bounded to their dependencies and exact approved scope. Neither the combined request nor a green source test substitutes for credentials, consent, protected historical evidence or current hosted acceptance.

## Read-only outcome tool

From reviewed Node24/Linux source, `scripts/t19-runtime-reconcile-prepare.mjs --packet PRIVATE_PACKET_DIRECTORY [--candidate SHA256]` reads the current corrected packet, verifies its exclusive owner-only regular files, original SQL digests and reconstructed source/contract binding, and emits read-only SQL. It never connects, executes, loads credentials or changes the packet. An expired execution packet remains eligible for inspection; expiration is never extended. It refuses older contract versions rather than silently upgrading history.

The optional candidate is the exact candidate hash retained in the original execution output, not a newly guessed hash. Execute the emitted SQL only through the existing verify-full staging route, keep ON_ERROR_STOP and preserve private output. SQL enforces the managed postgres/backend-TLS identity, empty inactive custody, bounded read-only transaction and native PostgreSQL fingerprints.

- ORIGINAL_BASELINE_VERIFIED_NO_INSTALLATION: exact original catalog/data/sequence/trigger fingerprint. No retry is authorized.
- EXPECTED_COMMITTED_STATE_VERIFIED: exact current contract and complete fresh fingerprint equal the retained candidate. This accepts only the reconciled runtime state, not service/provider activation.
- QUARANTINE_REQUIRES_REVIEW: no matching original baseline or no proven candidate equality. A matching contract alone cannot certify protected data or missing commit evidence.
- SQL/preparation failure: no conclusion. Preserve evidence; do not reinterpret a nonzero exit or missing output as rollback.

The current database absence was independently established with the unchanged native capture and catalog queries; it was not inferred from the newly added tool's source tests. Actual private owner packets/journals are unavailable in this workspace. Source preparation does not modify installed SQL or grant retry/activation authority.

## Delivery boundary

No hosted DDL, LOGIN, permissions, credentials, OAuth, provider invoices, service startup, scheduler, production or T20 changes are part of this source increment. Continue C03 only with the existing protected history and freshly prepared exact packet; continue security/host/recovery admission without repeating accepted synthetic rehearsals.

Local verification: six focused reconciliation/packet/full-stage embedded tests, twenty recovery/managed-host/callback tests and nine package/upgrade tests passed; syntax/whitespace passed. Native CI initially caught an audited fixture timestamp side effect, then correctly denied a provider-owned Auth update in the replacement probe. Those failed results are retained. The final drift probe uses a dedicated postgres-owned protected fixture created before baseline capture; no Auth permission is broadened. Final-head native TLS and complete CI remain required. Successful model tests do not certify hosted login, credentials or provider operations.

Overall: NO-GO for full T19 acceptance; C01 reconciled, C02 source correction prepared, C03–C09 remain explicit work.
