# T19 synthetic compatibility acceptance — 29 October 2026

Decision: **PASS for the bounded synthetic managed-bootstrap prerequisite; full T19 remains In progress / NO-GO.** This is an owner-reported host result, not an independent inspection of the host or a checkpoint restore. Canonical tracker T19 and T20 were re-read during this delivery: T19 In progress, T20 Not started; no tracker status was changed.

## Accepted source and observed result

- Executed staging source: dbe5cf80ad4958a80fda5604798bbefaa33a6961 (PR234).
- Signed executable bundle: 231e08e545544fb9483e97e2811a22f7ad85635441ba4a8aedd58915d063556a.
- PostgreSQL: sha256:ab85056c03f387f1b544420d88198872035093af9df6455402284b2deabe6eec.
- Auth: sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f.
- Storage: sha256:d1ad18d4afde8f08ae8b18f0aede17737d83fb3f189664a741f626329e5e6b97.
- Owner terminal reported SYNTHETIC_COMPATIBILITY_PASS, reason null, cleanupVerified true. Source and prior capture bindings were checked before fresh signing; the approval was consumed by this run. Historical receipt expiry does not invalidate a completed accepted run, and never authorizes replay.

All twelve stages passed in order: isolation, postgres, bootstrapHelpers, bootstrapDependencies, realtime, authMigrations, authIndexes, storage, managedCatalog, custody, security, stableCatalog.

The managed comparison matched with no differing components. The Storage denial was HTTP400 with structured status403/AccessDenied. Database readback proved allowedBucketCount1, deniedBucketCount0 and totalBucketCount1. Auth and Storage allowed/denied requests and postgres custody reads passed; anon/authenticated/service_role custody reads were denied. The final stable catalog matched, all seven final user/object/bucket/Vault/custody counts were zero, and cleanup reported verified with baselineMatches true. The harness's original baseline requires thirteen exited containers and unchanged container/network/volume inventory.

Retain the original private receipt, signature, expected catalog, complete ordered journal and source checkout unchanged. The owner-host run directory is /root/t19-bootstrap-run-j5WFO069. The uploaded terminal transcript is supporting owner evidence, not a substitute for revalidating the signed receipt and journal at future admission. Do not copy private catalogs, archive/key identities, data fingerprints or rows into Git or chat.

## What this closes and what it does not

This supersedes earlier compatibility-NOT-EXECUTED/FAIL conclusions only for this exact synthetic source/image configuration. It proves the observed empty-candidate bootstrap, catalog parity, inactive custody reconstruction, bounded security checks, empty final state and cleanup interval. Earlier failed attempts, quarantine records and their remediation remain historical evidence.

The result explicitly reports checkpointUsed false, checkpointUseAuthorized false, restoreAttempted false and operationalCustodyInstalled false. No destination survives the accepted cleanup. A new restore destination must be independently bound, bootstrapped and checked; this run cannot authorize archive access in a new process or container. It does not prove recovered application rows/sequences, accounting boundary enforcement, real TEST provider behavior, off-site/key recovery, operational RPO/RTO or owner UAT.

The same24-criterion T19 rubric remains27/72 (3.8/10): this is additional prerequisite evidence under already-partial V07/V23, not full hosted accounting isolation or current-scope recovery acceptance. No criterion is upgraded to full acceptance from empty synthetic checks alone. Reassess against actual recovery and subsequent operational evidence, rather than PR count or time spent.

## Next bounded package

Prepare the separately reviewed [current-scope restore rehearsal definition](t19-current-scope-restore-definition-20261029.md). Source preparation and metadata-only admission may proceed; protected checkpoint execution still requires a distinct exact-run owner signature. Do not reuse the bootstrap scope/approval, change the legacy restore destination, or execute the historical T11 restore helper against any held project. The source staging project and protected prior restore project remain untouched; operational custody and T20 remain excluded.

## Fresh hosted read-only admission observation

On29October the FaraiOS staging connector was used with an explicit repeatable-read READ ONLY transaction (readOnly on, database postgres, server17.11). All three custody tables were empty; custody functions/policies0; enabled accounting connections0; Vault secrets0; Storage buckets/objects0. A separate READ ONLY role check confirmed the actual reviewed runtime role t19_runtime_owner absent. This is a point-in-time prerequisite observation only, not full catalog revalidation, checkpoint authentication, restore authorization or persistent readiness. No data, grants or settings were changed. Repeat the exact current-scope/role checks at eventual execution admission.
