# T19 encrypted callback host adapter

Owner instruction: continue the secure callback handoff after PR250, preserving T19 scope and source delivery to staging. Canonical Build Tracker T19 remains In progress and requires authenticated boundary and independent-business evidence; T20 remains Not started. The owner-led staging security gates remain in force. This is opt-in source preparation, not hosted activation.

## Changes

The private custody runtime can optionally load `callback: { privateKeyFile: "/private/owner-only/callback.pem" }` from its existing protected configuration. Web and scheduler configurations cannot contain this field. The loader uses the existing bounded descriptor-based, single-link, owner-only file and ancestor checks, requires RSA of at least 3072 bits, imports a non-exportable RSA-OAEP SHA-256 decrypt key and clears the temporary DER buffer. No key is generated, installed or read from a real host by this change. The private key must be separate from TLS keys and kept outside source/web roots; distribute only its public key to the relay. Rotation remains a separately qualified operational procedure; do not disable existing key handling while a consent is in flight.

Only when that explicit key is supplied does the accounting handler admit `/accounting/zoho/return`. The existing short-lived HttpOnly/Secure/SameSite=Lax callback cookie then has Path `/accounting/zoho/`, covering the clean GET and same-origin encrypted POST. The ordinary app cookie is unchanged. GET preserves the callback cookie; POST clears it. Both paths independently check the original live session, and the existing custody OAuth flow retains durable state, owner, business and generation checks. Plaintext GET callbacks are rejected in encrypted mode. No callback key means the new route remains denied and the existing behaviour is preserved.

The proxy authenticates the callback session from its server-side store and sends only its verified user token over mTLS, replacing browser authority headers. Only the exact return path receives the bounded 17,000-byte body allowance; ordinary operations retain their previous limit. Explicit private endpoint SNI prevents the forwarded public Host from selecting the certificate identity. Certificate verification remains enabled.

## Verification

- Real local HTTPS exercises the Node return adapter: permitted encrypted POST, wrong/missing/revoked session, wrong Origin, replay, oversized body, plaintext callback denial and query-bearing return denial. The callback/session adapter uses synthetic identities and an atomic state model, not hosted database credentials.
- A real local mTLS server receives a 5,000-byte return body with the verified callback session and token; forged browser authority fields are replaced and an oversized body never reaches it.
- Real filesystem tests check a fresh synthetic RSA-3072 key, non-exportable decrypt-only import, broad-mode/symlink/hardlink rejection, RSA-2048 rejection, unknown-field rejection and custody-only configuration.
- Existing mTLS bridge, managed wakeup and deployment tests run alongside these regressions. No real OAuth, provider request, hosted SQL or financial data is used.

## Still required on the hosts

The currently parked private service is not activated by merging this source. Verify its exact new package and safe key provisioning, current machine certificates/identities, private endpoint certificate and grants, effective logging controls and original-session behaviour in an actual browser. The Worker must be configured with the corresponding public key and fixed staging return address. Run fresh dummy callback cases and inspect applicable request/error/referrer logs before real OAuth. Existing hosted SQL execution, permission, consumer-closure and recovery gates are not waived.

Do not reuse the local test keys or change Zoho's registered redirect URI before this qualification. No full T19 acceptance is asserted by local adapter tests.
