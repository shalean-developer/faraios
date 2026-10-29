# T19 callback relay: inactive implementation and evidence

The owner authorised the Cloudflare alternative and implementation. T20 remains excluded. This change adds portable Web Crypto envelope and relay factories; nothing mounts these factories in the live application, provisions keys, changes Zoho redirect URIs or activates custody.

## Design

The callback relay has only the custody RSA-OAEP public key. Each callback receives a fresh AES-256-GCM key and IV, and RSA-OAEP wraps that key. The encrypted payload contains the code, state, version and a two-minute expiry. The fixed HTTPS return address is `/accounting/zoho/return`; its fragment carries ciphertext. Code/state never appear in that return request's query. The relay forwards no headers and performs no logging or outbound fetch.

Custody decrypts through `consumeCallback`, then delegates to the existing `createOwnerOAuth().callback`. That flow authenticates the original FaraiOS session and atomically consumes its database-bound state before provider exchange. The new encryption layer does not authorise a business, identity or generation. It must never be wired to an adapter that omits the existing state/session checks. Consumed or uncertain outcomes must not be retried with the same state.

## Local verification

`node --test test/t19-callback-envelope.test.js` exercises an encrypted round trip, wrong session, replay, concurrent delivery, expiry, tampering, wrong key, sanitised errors, fixed return origin, incoming Referer exclusion and duplicate/unexpected query parameters. Its atomic-consume adapter is a model, not evidence of hosted database enforcement. No real OAuth values or credentials were used.

## Cloudflare trial observations supplied by owner and inspected in dashboard

Trial: `faraios-t19-callback-trial.shaleanclean.workers.dev`.
Version `e259aa2c-db02-4df2-9c6c-824165ec4f8c` retained safe application status logs with automatic invocation logs disabled, query redaction enabled, traces disabled and preview URLs disabled. The inspected persisted callback application event had method GET, route denied, status 403 and a query-free request URL without a request-headers block. Earlier invocation logging retained a dummy Referer even with query redaction enabled. Historical records were preserved.

This is scoped evidence for the inspected Workers Logs event, not proof about every Cloudflare security, network or internal log. The relay factories in this change have not been deployed to that Worker.

## Required before activation

1. Qualify the implemented return page and same-origin receiver in an actual browser and private hosted session adapter. The local HTTP test exercises synthetic requests; it does not execute browser navigation or prove hosted cookies. Preserve the original session and existing database state-consumption contract. No ciphertext in request URLs or application/error logs.
2. Qualify key generation, custody-only private-key storage, public-key pinning, rotation, expiry and failure handling. Do not place private keys in the Worker, browser, source or logs.
3. Validate browser behaviour, CSP, referrer handling, absence of third-party assets and reporting leakage; inspect effective deployed logging controls with fresh dummy values.
4. Complete exact hosted SQL safeguards, permissions, consumer closure, private TLS identities and authenticated API/database/machine denial tests before real OAuth or credential storage.
5. Publish a separately reviewed activation change and record actual hosted evidence. This implementation is not full T19 acceptance.
