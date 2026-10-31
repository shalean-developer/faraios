# T19 private setup implementation —31Oct2026

Owner approved the Shalean-pattern amendment (“YES Go Ahead”). This implements owner-assisted private provisioning for initial staging; it does not implement a public self-service Connect flow. T19 In progress; T20 Not started; T04/T05 untouched.

## Source result

- `createStandardConnection.provision` reuses DB owner/organisation-pin checks, single-use expiring state reservation, durable lease, generation and AES-GCM storage. It stores disabled revocation material before contacting Zoho, refreshes and verifies the exact active ZAR organisation, then publishes. It cannot replace a connected/pending connection.
- `src/t19-standard-private-setup.js` validates an exact staging manifest, authenticates the owner, uses existing verified membership sessions, provisions and exercises a second refresh from encrypted storage. Provider/native error details never escape. A failed second refresh attempts to fence only its own connection/generation; any setup failure requires durable-state review rather than blind retry.
- `scripts/t19-standard-private-setup.mjs` uses fixed private input/config paths; no command-line/environment credentials, HTTP listener, financial operations or hosted OAuth redirect. Owner authentication uses the staging publishable key, not service_role. Its local owner Auth session is signed out after execution. Protected-file checks are reused from runtime.
- The standard startup selects private onboarding mode. Callback404, Connect409, no HTTP provisioning endpoint; authenticated status/disconnect remain. The disconnected page states private owner setup is required. Old callback implementation is preserved but is not enabled by this entrypoint.

No schema migration or extra backend account required. Existing private config stays disabled and unchanged. The one client pair in current settings supports the Shalean-first staging milestone; separately configured client pairs for later Bokkie onboarding still need explicit implementation if different clients are used. Do not mix credentials to work around this constraint.

## Reviewable staging procedure

1. Pass exact-head CI/security review before delivering this revision to Plesk. Default `_passenger.cjs` remains unchanged; no merge/deployment implied by this runbook.
2. Establish a dedicated staging-only Zoho offline grant for Shalean TEST943440851. Keep existing/live clients and grants intact. Verify the actual console client type/region and official initial grant procedure before any consent; the script consumes an already issued refresh token and does not generate one. Do not claim that server-based registration and Self Client are interchangeable. No code must be sent to the hosted callback.
3. Owner privately completes `zoho.clientId/clientSecret` in the existing protected staging.json, keeping enabled:false and its encryption key/key ID/backend values intact. Never inspect/share/screenshoot this file. Separate production credentials remain untouched.
4. Create `/var/www/vhosts/faraios.com/.faraios-t19-standard/provision-staging.json`, regular owner-only0600 file in the0700 directory. Exact keys: version(integer1), environment(staging), businessId(Shalean UUID), organizationId(943440851), ownerEmail, ownerPassword, refreshToken. The owner enters credentials privately; no real values in Git, task commands or chat. Password login must be compatible with the existing owner account authentication policy; do not weaken MFA or any Auth setting to run it. File is temporary secret handoff, not the durable token store.
5. Reviewed host command: `/opt/plesk/node/24/bin/node scripts/t19-standard-private-setup.mjs --provision-staging`, working directory staging app. Only safe result JSON or fixed failure marker may be retained. Any interruption/error: inspect scoped encrypted state, pending reservation/lease and owner-session revocation before recovery. Do not blindly rerun or clear leases.
6. Remove the temporary provisioning input through the authorised private channel immediately after the attempt, after establishing encrypted recovery material or retaining it privately if setup failed before saving. Verify its absence before enabling the app. Do not back up the temporary owner password or plaintext refresh token. Keep encryption-key recovery separate from encrypted database backups; recovery rehearsal remains required.
7. Inspect native ciphertext-only storage/status and exact organisation; verify owner/foreign-business/environment route denial and public secret-path404 on reviewed source. Only then consider a separate connection-only startup change. Config remains disabled until that review. No invoice worker is enabled by this step.

The ordinary disconnect route revokes the provider grant and retains disabled recovery material until revocation succeeds. The initial utility has no forced-replace/automatic-grant-deletion flag. Unexpected refresh-token rotation is rejected for review. Authentication failures, ambiguous publication and logout failures all report generic setup failure; inspect state before claiming no side effect.

## Validation and remaining acceptance

Local28/28 PASS across connection, HTTP handler, private orchestration, HTTPS SQL, restricted storage and historical PG config tests; zero skips. Includes real isolated SQL organisation-pin denial before provider traffic, two-business encrypted grants, non-owner denial, refresh from persisted ciphertext, post-publication failure fencing, callback/import-route denial and safe UI. Syntax checks PASS. No new hosted/provider tests run by this source preparation; no completion based on these tests.

Pending: exact CI/review; actual dedicated staging grant/private entry; reviewed host source delivery; real refresh/disconnect/restart proof; invoice queue worker/approved synthetic draft/retry-interruption reconciliation; independent Bokkie credentials/provider isolation; recovery and owner acceptance. No invoices/customer data, external financial writes, recurring scheduler, source deployment or production activation performed.

Rollback: retain default inactive startup, keep enabled:false, preserve original callback source and all existing historical material; review/disable only any newly provisioned connection and revoke under owner authority. No destructive migration is needed.

Decision: PASS for isolated source preparation; NO-GO for real provisioning/activation/T19 closure until remaining checks and private setup are satisfied.
