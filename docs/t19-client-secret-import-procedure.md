# Shalean TEST client-secret import — review only

Prepared 23 October 2026 for Farai Chitekedza on device `SHALEAN`, Windows account `shalean\info`. This document does not authorise secret retrieval, import, OAuth or provider reads. No secret has been retrieved or imported. The manifest remains `approved:false`.

## Destination and immutable context

- Existing client: `FaraiOS Shalean TEST`, ID `1000.ET7LNPRV6W7EM2HLL35E2X38RKEGVF`.
- Business: `612be091-b1d7-4911-9c3b-143446a9fe27`; Books organisation: `943440851`; staging, US region.
- Registered callback: `http://127.0.0.1:3102/zoho/callback`.
- Protected destination: `%LOCALAPPDATA%\FaraiOS\T19\credentials`, resolved under `shalean\info`, outside the repository. Use the normal Windows login, not another account or a Run as administrator session.
- The tested backend uses Windows DPAPI CurrentUser, a restrictive directory ACL, atomic encrypted replacement and an exclusive writer lock. Import refuses replacement of an existing client. No provider call or loopback service start occurs on the import branch.

## Proposed secret source and transfer

Farai will personally obtain the existing client's secret from its controlled API Console record under `accounts@shalean.com`, or an already established secure password-manager entry for that exact client. This source is proposed, not inspected or confirmed. Do not generate or rotate a secret, select another client, or expose the secret to Codex, screenshots, chat or recordings. The administrator account managing the client is distinct from the later dedicated consenting identity `faraios590@gmail.com`.

Use an attended local masked-input helper: Farai enters the secret directly into a `Read-Host -AsSecureString` prompt on SHALEAN. Do not paste into a shell command or use clipboard history/sync. The helper `scripts/t19-import-client.ps1` converts the secure input in memory, serialises exactly one JSON property `clientSecret`, and starts the existing Node importer with redirected standard input. It writes the JSON directly through `Process.StandardInput`, closes that pipe, waits for exit, and disposes its input/process objects in a finally block. No plaintext files, environment variables, command-line secret, echoed JSON, debug dumps or shell-pipeline logging are permitted. No secret value is included in a script source.

**Implemented helper:** `scripts/t19-import-client.ps1` requires PowerShell 7 and an interactive console. It checks the exact manifest hash, current Windows account/device and runner approval gate before prompting. It uses Read-Host -AsSecureString, validates bounded input, JSON-escapes the value and passes it only through redirected child stdin. It always supplies the import-only flag; child output is captured and never reflected except for the fixed success receipt. Node debug/injection environment options are removed from the child. The runner independently rechecks approval/digest/window and immutable client context. Its check-import action opens no store and performs no provider request. Storage conflicts are still checked during import.

Tests inject a dummy SecureString at the prompt boundary, exercise actual private subprocess pipes and mock children, and cover the real importer/Windows DPAPI path in an isolated dummy store. They do not establish that a human has visually tested masking in a live console. Managed strings can remain in process memory until reclaimed; disposal is not a guarantee of complete memory erasure. DPAPI does not protect against compromise of this same Windows account.
## Future approved sequence

1. Review the helper QA evidence and complete independent review of the final manifest. Confirm the existing client identity/type, named reviewer, evidence references, cleanup responsibility and a maximum 60-minute window. Record the current runtime digest from inert `--describe` and SHA256 of the exact completed manifest. Any manifest change requires a new hash and review.
2. Obtain separate explicit approval for secret retrieval/import. Current implementation also requires the complete execution-approved manifest and current time window even for local import; it cannot import with this review template. Do not bypass that gate or set approval merely to make import work. Local-import approval is not permission to start the service, consent or call Books. Required CI/security/formal gates remain applicable.
3. Confirm device/account with `Environment.MachineName` and `whoami`. Ensure the T19 service is stopped and no other vault writer is running. If a writer lock, corruption or existing-client rejection occurs, stop; do not delete locks, reset the vault or overwrite credentials.
4. Farai privately obtains the existing secret and enters it through the reviewed masked helper. No agent/browser capture should be active on a secret page or prompt. Close the secret view after entry. Do not transmit the value in chat.
5. From an interactive PowerShell 7 console in the reviewed worktree, the future approved operator invokes the helper with only non-secret arguments:

   `pwsh -NoLogo -NoProfile -File scripts/t19-import-client.ps1 -ManifestPath <completed-manifest-path> -ManifestSha256 <exact-manifest-SHA256>`

   The command is an interface illustration, not an instruction to run it now. The helper resolves the local Node application and fixed sibling runner; no user-supplied command or secret parameter is accepted. It invokes check-import before the prompt and import-client afterward. Do not call the runner manually or remove its import flag. No transcript, screen recording or debug capture should run while entering the secret.

6. Require exit code 0 and the fixed receipt `TEST client stored; no provider request performed.` On failure, retain only the generic failure category and stop. A timeout, interruption or lost success receipt may leave an import completed; do not automatically retry, reset storage or remove a writer lock. Investigate only non-secret state under separate recovery review. Never print decrypted storage to diagnose or prove success. Import success proves protected local custody only, not secret validity or a grant.
7. Record non-secret evidence: custodian, Windows device/account, client/business/org IDs, timestamp, reviewed commit/digest, manifest hash, exit code and fixed success receipt. Only then mark credential provisioning complete. Do not start OAuth or the service as an automatic next step.

## Cleanup and remaining boundary

Following a separately approved provider run, disable locally, have Farai perform targeted grant revocation, and record the custodian attestation before using the existing cleanup action. Do not revoke all connected apps or remove unrelated credentials. The existing cleanup action requires connection/grant cleanup state; it is not a generic removal tool for a secret imported without a connection. If a run is cancelled after import but before consent, leave the protected client disabled and obtain a bounded cleanup plan; do not claim the current tool can remove it in that state.

Still pending: confirmed secure source, final manifest reviewer, attended identity evidence, execution window and separate approvals. The helper and dummy-secret verification are implemented; real secret entry/import has not occurred. The saved synthetic invoice stays Draft and unchanged. Organisation active status remains NOT VERIFIED. No OAuth, invoice sending, payment, merge or deployment is authorised by this procedure.
