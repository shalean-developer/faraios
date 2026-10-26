# T19 restricted service source integration

26 October 2026. Original requirements: server-authorised business scope, protected credential handling, scoped automatic refresh and visible safe failures. T19 In progress; A12 unresolved; activation NO-GO; T20 Not started.

PR141 was approved by the owner under a one-PR solo-maintainer exception for exact head `9a72c49cab016e6062267b50e7c61afc93dd2f8c`, and merged into staging at `3a6094f2f871855c0c56cf4a0ece4d3dd4660009`. GitHub and fetched staging matched. Five CI checks and automated Codex review passed; no independent human approval is implied. The exception does not cover this subsequent integration change.

## Implemented composition

`src/t19-custody-operations.js` composes the existing restricted core with machine verification and authorised durable-operation lookup. Callers can submit only an operation UUID. No business, role, binding, provider outcome or credential reference is accepted from input. The server derives the machine and complete C1 binding, then reauthenticates the machine and reloads operation authorisation at the core's initial, pre-dispatch and pre-publication checkpoints. Changed identity, revoked authority or changed binding fails closed. The service exports only operation ID and status; all dependency errors are sanitized.

`src/t19-custody-machine.js` supplies a concrete `authenticateMachine(transport)` implementation for a directly terminated mutually authenticated TLS connection. It requires a native authorized TLSSocket, hashes the actual peer certificate, and resolves its pin against a current active server-side machine record on every call. Plain objects, forwarded certificate headers, unauthenticated peers, revoked records and pin mismatches deny access. It provisions no certificate, key, CA, listener or hosted configuration. Deployment must enforce client certificates and approved trust roots; a shared proxy header is not a substitute.

`findMachineByFingerprint` and `resolveAuthorizedOperation({machineId,operationId,action})` still require database adapters. The latter must query trusted durable jobs and current machine/business authority, returning only an allowed refresh operation assigned to that machine. Its `authorized` result is produced inside the trusted server dependency, never deserialized from a client. No insecure fallback implementation is provided; database enforcement remains unverified.

`src/t19-zoho-custody-provider.js` implements the provider side of the core's refresh interface. It compares all seven C1 fields with the binding stored in protected material; validates client/token fields; uses the existing Zoho regional allowlist; sends one form-body token POST with redirects rejected; bounds the response at 32 KiB and 12 seconds; validates token type, domain and lifetime starting at dispatch. An explicit token-endpoint invalid_code/invalid_grant response maps to reauthorisation, while transport failures, 401/403/429/5xx, contradictory payloads and invalid responses fail uncertain. There is no retry, generic URL, environment credential loading or default transport.

The provider returns access material only inside the restricted service. The existing core continues to export status rather than tokens. Successful publication stores the successor's binding with its protected refresh material, preventing a subsequent valid refresh from seeing the retired credential version. This does not yet implement an invoice execution/access-token cache inside custody.

Reference: [Zoho Books OAuth](https://www.zoho.com/books/api/v3/oauth/), checked 26 October 2026, documents the regional token endpoint, nonrotating refresh response and invalid_code for a removed refresh token. The existing Shalean reference client supplies the connect-once/refresh pattern; its global single-business environment and operational payment policies are not copied.

## Verification and limits

New tests exercise the real composed source with an injected mock HTTP response, separate business material, all seven substituted bindings, malformed credentials/responses, rotation and nonrotation, sequential credential versions, revoked machine/job authority, changed business scope during a pending vault read, post-provider revocation, redacted errors and a transport that ignores abort. They assert no provider calls on denied work and recovery hold after uncertain egress. Existing core/integration tests are reused.

The machine test uses actual loopback TLS handshakes with freshly generated disposable certificates and removes its temporary private keys afterward. It verifies permitted certificate identity and denials for no certificate, revoked records, wrong pins and forged transport objects, plus backend error redaction. The Windows sandbox blocked Git OpenSSL startup; the approved isolated run outside that sandbox passed. This is local TLS authentication evidence, not hosted process/key/backup isolation.

Other source tests use synthetic adapters, not hosted SQL/RLS, durable crash recovery, actual consent or provider acceptance. No tests use operational credentials or contact Zoho. Entry points, database SQL, runtime configuration, dependencies, invoice data and T01–T18 behavior are unchanged.

## Actual remaining integration

1. Issue140 independent human assessment and separate exact inactive-SQL owner approval remain prerequisites for hosted schema application. Its existing packet and immutable SQL are unchanged.
2. Implement/deploy the concrete isolated runtime identity, durable authorised-job lookup, protected storage and coordinator adapters under separately approved permissions. The existing reviewed disposable RPC fixture is not a deployable hosted migration: it does not provide complete operational failure/recovery and identity provisioning. Do not silently substitute it for the inactive SQL.
3. Connect the existing invoice worker to internal custody execution, including scoped usable access-token lifecycle and durable accounting job claims. This source change implements refresh composition only, not invoice execution. Keep uncertainty held and reconcile before retry; no ordinary worker receives tokens.
4. Complete owner consent/callback storage, provider permission/organisation checks for each business, D4 disconnect/revocation/reconnect and recovery through those adapters. Actual consent remains separately gated.
5. Run the original consolidated two-business API/database/provider accounting acceptance and financial totals reconciliation, then independent final quality/security acceptance. No synthetic result closes these gates.

No new architecture, hosting commitment, database grants, keys, machine credentials, migration, deployment, provider consent or financial write is included. The existing security packet is authoritative for Issue140; this document records the concrete source interfaces and their unimplemented runtime dependencies.
