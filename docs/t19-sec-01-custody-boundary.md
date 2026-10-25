# T19-SEC-01 — Restricted custody boundary and acceptance contract

**Status:** PROPOSED / documentation only. **Date:** 2026-10-25.
**Scope:** T19 only, governed by `AGENTS.md`, `docs/blueprint.md`, [canonical Build Tracker](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit), [Issue #122](https://github.com/shalean-developer/faraios/issues/122), owner-approved restricted-service direction and D4 policy. T20 remains Not started.

## Decision and threat boundary

The proposed restricted custody service replaces the **future design path**, not the historical evidence, of bespoke HMAC/Ed25519 publication. The historical publisher-bypass fixture remains evidence only and **MUST NOT** be shipped or reused as an executor. A legacy publisher login must have zero effective path to read, seal, write, substitute, classify, activate or publish any live credential. Renaming it is insufficient.

A dedicated custody service is a highly privileged trusted component, not proof by itself. Compromise of custody and its decryption identity can endanger all grants reachable by that identity. This risk must be contained by credential and deployment isolation, auditable scope, egress restrictions, and externally verified tests.

## Proposed principal-to-capability matrix

| Principal | Read scoped status | Request permitted operation | Read/decrypt/return tokens | Seal credential | Publish/advance credential | Disconnect/reconnect |
| --- | --- | --- | --- | --- | --- | --- |
| Unauthenticated/foreign business | No | No | No | No | No | No |
| Authenticated ordinary business user / manager | Scoped, policy-authorised metadata only | None for connection custody | No | No | No | No |
| Current authorised business owner | Own business metadata | Begin consent, owner-scoped disconnect/reconnect through custody gate | No | No | No | Owner action via custody |
| Web/API process | Request forwarding only under verified end-user identity | Only allowlisted business operation | No | No | No | Never by itself |
| Invoice worker identity | Authorised job submit and status, scoped to business and immutable operation | Request invoice work; never request generic refresh/publication | No | No | No | No |
| Historic publisher identity | No | No | No | No | No | No |
| Restricted custody identity | Authoritative internal operation status | Authorise vetted operations | Internal only, never exported | Internal only | Conditional, prepared and fenced only | Execute authenticated owner D4 action |

**Mandatory effective-privilege verification:** inspect role memberships and inheritance; CONNECT/USAGE/CREATE; grants on all schemas, tables, views (including Vault decrypted view), RPC overloads, functions and SECURITY DEFINER indirect paths; default PUBLIC EXECUTE; role switching; backup/restore identities. Denied trials must not mutate protected state. Ordinary invoice workers must **not** receive Supabase `service_role` or an identity that can read `vault.decrypted_secrets`. The proposed grant matrix is not evidence that hosted permissions already enforce it.

## API boundary (contract, not routes)

Only narrowly typed custody operations are contemplated:
- `consent.begin(ownerSession, businessRef)` and `consent.finish(state, providerCallback)`: owner membership revalidated server-side; provider organisation and environment pinned; callback state short-lived and single-use.
- `connection.status(actorSession, businessRef)`: scrubbed business-scoped metadata only.
- `refresh.request(workerIdentity, operationId)`: verified machine identity, scoped durable operation; does not choose provider URL, organisation, lease, secret or output format.
- `disconnect.request(ownerSession, businessRef)` and `reconnect.begin(ownerSession, businessRef)`: execute approved D4 transitions.
- **Internal only**: claim intent, dispatch, seal successor, complete publication, failure/quarantine and status recovery.

There must be **no generic publish/write secret, raw decrypt, token export, set provider result, choose arbitrary URL, caller-selected sealed reference, or arbitrary generation endpoint**. C1 `access()` returns access-token material within its trusted dependency context: never wire that return value to a web or ordinary-worker API. API authentication is necessary but not sufficient; verify current actor and operation authorisation at commit/egress boundaries.

## Seven-field binding and authoritative transitions

Every grant and operation binds immutable `business_id, environment, provider, connection_id, generation, organization_id, credential_version`. Re-read trusted server-side values, not client-supplied fields. Shalean and Bokkie have independent business/environment/organisation/grant scopes. Refuse any substituted dimension, stale version/epoch or unknown operation.

A durable, authoritative coordinator owns `intent → claim/lease/attempt → dispatched → prepared → published` or terminal held/error state. Store intent before network egress. Never automatically replay dispatched work with ambiguous provider results. New sealed material is merely **prepared**, not current, until a single atomic coordinator publication transaction verifies custody-origin preparation, current binding, expected reference/version, live lease, attempt, epoch, generation, owner/operation policy and non-disabled state. That transaction either publishes exactly once or leaves the prior state unchanged. Provider result classification is custody-only, not caller-selected.

### F3 disconnect/completion serialization

The in-memory `src/t19-synthetic-custody.js` `complete()` currently checks before `await custody.read()` and may mutate after a concurrent disconnect. It is a **known unsuitable authority oracle** (Codex F3); do not promote unchanged.

The durable fixture must lock connection + operation in a deterministic order, recheck all state **after waits**, and serialize `complete` against `disconnect` on that lock. If disconnect commits first: any stale completion fails without increasing credential_version or exposing a prepared grant. If completion commits first: disconnect advances generation once and fences the published credential. Concurrent/repeated disconnects advance generation exactly once, with one audit event. Crash recovery cannot restore a disabled or retired generation.

## D4, recovery and deployment constraints

Disconnect cancels undispatched work and quarantines dispatched uncertain attempts; no secret reactivation by late completion. Reconnect requires fresh owner consent, new generation and credential version 1. Never reuse old grants. Durably fence lease/attempt/epoch and confirm egress rights immediately before provider call. After crashes or lost acknowledgements, read durable status; never repeat uncertain egress automatically. A stale backup must not roll back the external epoch/egress fence. Rotation revokes old identities and sessions.

Disposable test topology **only**: isolated local PostgreSQL and service process, explicitly non-hosted credentials, synthetic-only key and secrets, fake provider with **no external network**, no sharing hosted Vault, Supabase, Plesk, provider endpoints, environment variables, backups or machine identities. The C2 fixture's own declared trust assumptions do not satisfy A12. Actual host/network/key/backup isolation remains an independent pre-activation gate.

## SEC-02 acceptance matrix (not yet executed)

Every test must use distinct authenticated test principals, a permitted positive control, negative attempts, committed state readback, and fake-provider call counts.

| ID | Required synthetic evidence |
| --- | --- |
| A12-1 | Ordinary user, web worker, invoice worker and historical publisher all denied decrypt, seal, arbitrary publish and activation, through direct and indirect SQL/Vault paths; no state delta. |
| A12-2 | Role inheritance, PUBLIC/default EXECUTE, SET ROLE, schema CREATE, SECURITY DEFINER, views, overloaded RPCs, secret references and backup credentials tested; only custody principal may access protected internals. |
| TENANT-1 | Substitute all seven binding dimensions, operation ID, sealed reference and business role across Shalean/Bokkie; all mismatches denied. |
| AUTH-1 | Missing, forged, expired and revoked machine or owner identities denied; arbitrary provider URL and plaintext-export attempts impossible. |
| PUB-1 | Competing processes, unprepared/foreign/stale seal, duplicate result and lease expiry: exactly one fenced publication or none, never duplicate version advance. |
| A15/F3 | Forced lock waits in both disconnect/completion orders, ownership revocation and lease expiry, including delayed `custody.read()`; no mutation after disconnect. |
| A16 | Kill and restart process at each intent/dispatch/response/seal/publish boundary with the **same durable store**; ambiguous dispatch held, lost acknowledgement recovered by status only. |
| D4-1 | Repeat/concurrent disconnect increments generation once, holds uncertain work, cancels undispatched work; fresh consent/new generation/version 1 on reconnect. |
| A17 | Key and identity rotation, revoked existing session, stale backup/epoch recovery and old egress process blocked. |
| LEAK-1 | Synthetic secret markers absent from HTTP, logs, audit and error bodies; forbidden staging/production substitution and outbound provider egress denied. |

Historical Ed25519/HMAC **mechanics** become N/A under the approved design; their A12 attack objectives remain mandatory. Record actual command outputs, role grants, SQLSTATE, transaction/lock traces, kill/restart evidence and negative assertions before claiming a PASS.

## SEC-01 acceptance / next gate

SEC-01 is acceptable as a **reviewable contract** only when the capability matrix, narrow no-export API, isolated disposable topology, post-wait atomic transition, D4 and A12/F3/A15/A16/A17 tests are each traceable to findings F1–F5. This document changes no implemented permission or runtime behavior. It neither fixes A12 nor constitutes an independent human reviewer decision.

**Next:** qualified independent reviewer records ACCEPT / CONDITIONAL / REJECT against this exact contract. Separately capture explicit owner approval for SEC-02 disposable-only implementation if accepted. Keep T19 In progress, Issue #122 open, accounting activation NO-GO and T20 Not started.
