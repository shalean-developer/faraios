# T19 A12 inactive-schema hardening — applied and verified

Date: 28 October 2026. Owner explicitly replied “Approved” to applying only the exact linked inactive-schema SQL to faraios-staging xdmfyrsauvqznkloroxg. This approval does not cover operational installation, Vault changes, logins, worker/provider activation or production.

## Executed identity and procedure

Approved source: docs/proposals/t19-a12-inactive-hardening.sql, SHA-256 c57946f78ad77dd5ea0d5c28e5d75ac67dc6bd48fb40c22e3ff914342efd72bc. Six embedded PostgreSQL/WASM source tests passed before owner approval. Supabase connector still returned missing link_id; continued with the already owner-authorized browser fallback in the signed-in Chrome staging dashboard. Rechecked project URL/name and captured current before-state ACL/RLS/counts. Verified editor contents byte-for-byte modulo CRLF against the approved SQL by selecting/copying the complete editor text before dispatch. The read-only baseline initially encountered a Run/Run selected UI locator mismatch; no mutation had been submitted at that point. Retargeted the observed Run selected control. The exact approved transaction then returned “Success. No rows returned.” A subsequent separate SELECT request independently read committed catalog/state results; do not claim it used a separately authenticated connection or a TEST browser account.

## Verified result

| Check | Before | After |
|---|---|---|
| RLS on connections/operations/prepared_references | false / false / false | true / true / true |
| Table owner | postgres on all three | postgres on all three |
| Table ACL | postgres-only, arwdDxtm | Identical postgres-only ACL |
| Private row counts | 0 / 0 / 0 | 0 / 0 / 0 |
| Effective unexpected schema USAGE/CREATE | Earlier read-only discovery false for all four roles | 0 role violations |
| Effective unexpected table privileges | Before ACL postgres-only | 0 role/table violations, including MAINTAIN in readback |
| Private policies/functions | Guard requires none | 0 / 0 |
| Vault secret count | 0 | 0 |
| service_role decrypted Vault SELECT / write-function EXECUTE | true / true | true / true |

Verified roles: anon, authenticated, service_role, t19_hosted_custody. No-policy RLS is defense in depth for ordinary non-owner/non-BYPASSRLS identities; the application role must still lack table grants. BYPASSRLS roles and owners are not made safe by RLS alone. No secret values were read. No rows, public business objects, role memberships, global defaults, credentials or provider operations were changed by the exact SQL. No migration-history entry is claimed; this bounded approved change ran through dashboard SQL Editor and is traced by exact source hash, owner decision, before/after metadata and this record.

Evidence: evidence/t19-a12-hardening-20261028/readback.json contains tool-returned before/after metadata; evidence/t19-a12-hardening-20261028/verified.png shows the actual dashboard readback. Dashboard may retain its private query snippet. Historical approved inactive source and previous local signed bundles/nonce ledger were not modified.

## Remaining scope

Approved narrow inactive hardening: applied and verified. Full A12 operational custody: NOT ACCEPTED. Actual authenticated TEST account/API denials, protected business snapshot/global-default/indirect-function/Vault consumer review, managed B02 compatibility/transport and operational recovery, exact runtime SQL/identities/private service deployment, and separately approved provider E2E remain open. This is not full T19 completion or T20 authorization. No canonical tracker, remote GitHub publication or deployment update is made in this action.
