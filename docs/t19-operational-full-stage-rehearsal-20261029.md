# T19 complete operational SQL rehearsal

29 October 2026. Synthetic source-regression package; **no hosted provisioning or operational acceptance**. This advances the full-stage SQL evidence required by the provisioning review packet, while retaining the separate compatible owner-candidate and private-host gates.

## Exact tested source

The test executes all statements of runtime, OAuth and API review SQL, in that order, with the same SHA256 pins recorded in t19-operational-custody-provisioning-packet-20261029.md. No operational SQL bytes or accepted bootstrap/restore bundles are changed in this package. The installed inactive schema remains historical and untouched.

The fixture reuses the existing synthetic invoice foundations and actors. A new opt-in supplied-database mode lets that test fixture use an already prepared managed-style Auth boundary; default fixtures are unchanged. No application/authentication foundation is rebuilt in a hosted environment.

## Permission model and checks

An isolated fixture administrator prepares a postgres role with CREATEROLE/BYPASSRLS but no superuser authority, and provider-owned Auth/Vault objects. postgres receives the observed use/delegation capabilities: no Auth schema or auth.uid EXECUTE grant option, but reviewed Vault view/function grant options. Source installation runs as this postgres principal. Auth/Vault tables/functions are explicit synthetic substitutes, not Supabase encryption or service implementations.

For each complete stage:

1. Capture role/membership/schema/relation/column/default/function/policy/constraint/index state and table/sequence fingerprints.
2. Add a fixed synthetic exception immediately before the outer COMMIT, execute the whole preceding source, require that exact exception/55000, rollback and compare state unchanged.
3. Execute the original unchanged stage and commit; verify protected application/audit/Auth/Vault rows and sequences unchanged.
4. Re-execute the same source, require collision SQLSTATE 55000, rollback and compare unchanged committed state.
5. Verify temporary runtime-owner SET/CREATE authority is absent and no Auth schema access was delegated.

After all stages, verify 10 empty custody tables, RLS enabled, 11 private functions owned by the restricted runtime owner and both custody roles still NOLOGIN/non-administrative/NOINHERIT. Probe actual SQL denials for anonymous, authenticated and service roles against custody tables, Vault and runtime/OAuth/revocation entrypoints. Verify permitted business status and foreign-business/staff denial through the installed API wrappers. A privileged synthetic session handoff tests limited custody lookup and direct-data denial; it is **not authenticated machine login proof**. No provider credential or operational job is inserted.

## Native execution and cleanup

Ordinary test discovery uses an isolated embedded database model. Only the dedicated scripts/run-t19-operational-postgres.mjs runner creates the native cluster, under its own random temporary directory and loopback port. It strips ambient database/service configuration, creates a fresh database marker bound to a generated nonce, and supplies the local test URI/nonce. The test verifies that binding, PostgreSQL major 17, empty public/user schemas and initial role state before changing any role. New independent native connections as the non-superuser executor verify snapshots in READ ONLY repeatable-read transactions after rollback/commit. The runner stops its owned server and removes its exact temporary directory in finally, including test failure paths.

CI explicitly invokes this runner and requires T19_OPERATIONAL_FULL_STAGE_NATIVE_PASS, CI_POLICY_OPERATIONAL_FULL_STAGE_NATIVE_PASS and T19_OPERATIONAL_DISPOSABLE_CLUSTER_CLEANED. A skipped native test or embedded-only result cannot satisfy that native gate. Local targeted evidence before publication: 21/21 tests passed; updated whole-stage local checks are rerun before commit. Native CI results must be verified on the final PR and merged staging heads.

The first native attempt refused admission before role changes because the guard used obj_description for a shared database comment. Cleanup passed. The corrected guard uses shobj_description and is also exercised by the embedded test; the nonce/fresh-state gate remains mandatory. The failed CI result remains historical, not accepted SQL evidence.

## Limits and next gate

This is a complete reviewed-SQL regression under managed-style permissions. It is not the exact pinned Supabase Docker image, live provider/Vault encryption, current hosted Data API exposure, real restricted database/mTLS authentication, nonempty operational-custody recovery or accounting E2E evidence. The successful earlier bootstrap/restore does not automatically certify this new SQL on that image. A bounded, freshly authorized compatible owner-candidate rehearsal and private-host qualification remain required before exact hosted provisioning approval. No existing owner receipt is reusable.

T19 remains In progress; operational custody remains uninstalled, accounting activation NO-GO and T20 excluded.
