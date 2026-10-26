# T19 consolidated completion evidence and independent review packet

26 October 2026. T19 **In progress**, A12 **unresolved**, accounting activation **NO-GO**, T20 **Not started**.

Authority: [canonical Build Tracker](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit), Build Tracker row 20, Decisions D13 and T19 Evidence, read live in this execution. This packet consolidates current findings; historical records remain intact. No new architecture or scope is approved here.

## Acceptance matrix

| Original requirement | Existing evidence | Missing implementation / acceptance | Test and status |
|---|---|---|---|
| Independent business connections and invoice mappings | Invoice foundation; two disabled TEST connections | Hosted owner consent and operational independent grants | Actual Shalean and Bokkie identity/organisation/permission verification; NOT PASSED |
| Encrypted hosted credentials and scoped refresh | PR137 core, PR138/139 SQL/test preparation | Restricted runtime, machine authentication, durable adapters and protected storage | Effective identity/SQL/Vault/host/backup denial and human assessment; BLOCKED |
| Generation-fenced durable work | Existing C1/D4 contracts and disposable fixtures | Hosted durable operation wiring and process recovery | Real restart, lost acknowledgement, both disconnect race orders; NOT PASSED |
| Duplicate prevention and uncertain-write reconciliation | Existing invoice reconciliation; synthetic Stage B | Custody-integrated provider operations | One authorised write, no blind replay, reconciled known/unknown outcomes; NOT PASSED |
| Visible failures and business totals reconcile | Invoice status/error foundation, historical fixtures | Consolidated provider-backed two-business run | Exact local/provider identities, currency and totals plus denial checks; NOT PASSED |

## Exact inputs for Issue 140

- Staging: `91ab7e165e5e2218273f59557e4d576b598d4af2`, refreshed from origin in this execution.
- Inactive proposal: `docs/proposals/t19-02-staging-inactive-schema.sql`.
- Git blob: `ffc54cc1676edc83533c1f16dec56af05f16928f`.
- Canonical Git-byte SHA-256: `094af80bea2abff440a3ae45623e564e16c5b3556706f90adc51140bee8cf3c9` (hash the Git blob bytes, not a Windows CRLF checkout).
- Intended target: FaraiOS account, project `xdmfyrsauvqznkloroxg`, `faraios-staging`, eu-west-1, PostgreSQL 17.11. Project listing independently matched these values; restore-test is the separate `zrlojsvkqipuwkkyfrkn` project.
- PR138 merge `1d4448eaeb06a295713209d2a65c3c07784482cd`; PR139 merge is current staging above. GitHub readback confirms their Foundation policy, Windows, backup-transport, candidate-disposable and GitGuardian checks SUCCESS. These historical checks were not rerun as hosted proof.
- [Issue 140](https://github.com/shalean-developer/faraios/issues/140) remains open, unassigned, with no attributable independent PASS. Owner expressly confirmed in this execution that no independent human assessor has been appointed. Codex review is not that assessment.

## Fresh hosted read-only inventory

Connected Supabase metadata queries on the target, 26 October 2026; no secret values selected, no DDL/DML, no role changes, no provider calls:

| Check | Observed result | Meaning / limitation |
|---|---|---|
| Custody schema / role | Both absent | Inactive proposal has not been installed |
| Vault secret count | 0 | No operational Vault credential demonstrated |
| Accounting connections | 2 total, 0 enabled | No enabled business connection |
| Business invoices | 2 | Count agrees with recorded baseline; not a record digest or reconciliation |
| postgres | LOGIN, INHERIT, BYPASSRLS, CREATEROLE; not superuser | Privileged migration executor remains trusted |
| service_role | NOLOGIN, INHERIT, BYPASSRLS | Must not be supplied to ordinary accounting worker |
| anon / authenticated | NOLOGIN, INHERIT, no BYPASSRLS or CREATEROLE | Catalog attributes only |
| authenticator | LOGIN, NOINHERIT; SET memberships in anon/authenticated/service_role | NOINHERIT alone does not remove SET ROLE paths |
| postgres memberships | Includes pg_read_all_data, service_role, anon, authenticated and authenticator with SET/inherit; supabase_privileged_role too | Proposed objects retain privileged owner, not isolation from database administrators |
| Vault effective grants | service_role has schema USAGE and SELECT on secrets and decrypted_secrets; anon/authenticated/authenticator do not | Existing broad credential access prevents treating generic service_role as custody isolation |
| Vault create/update overloads | supabase_admin owner; SECURITY DEFINER; empty search_path; service_role EXECUTE, anon/authenticated denied | These paths remain in the review threat model |
| postgres default ACLs | Explicit defaults found for public and storage, not global/private custody | Fresh post-apply ACL check still required; future defaults can change |
| Financial table RLS | Enabled on business_invoices and business_accounting_connections; owner postgres | Not a fresh API/RLS allow/deny execution |
| pgrst.db_schemas in role/database catalog | No stored matching setting returned | Actual API exposure configuration NOT VERIFIED; absence is not proof of non-exposure |

Metadata methods: `pg_roles`, `pg_auth_members` (including `inherit_option`, `set_option`, `admin_option`), `pg_default_acl`, `has_schema_privilege`, `has_table_privilege`, `has_function_privilege`, `pg_proc`, `pg_class`, and the filtered `pgrst.db_schemas` entry in `pg_db_role_setting`. Only aggregate counts were read from business/Vault tables. The independent assessor must reproduce this inventory under identified credentials and exercise effective denials. The [Supabase role documentation](https://supabase.com/docs/guides/database/postgres/roles) explains role inheritance and service identities; it is guidance, not evidence of this project's enforcement.

## Static assessment of exact inactive SQL

The proposal creates one NOLOGIN/NOINHERIT role, one private schema, three empty tables and an open-operation uniqueness index inside one transaction. It revokes PUBLIC access, grants no runtime privileges, creates no functions, installs no credential, and enables no connection. Schema/table ownership stays with the migration executor. Existing business/T07 tables are not modified. Collision with an existing schema or role aborts rather than replacing objects. The project session GUC is only a guard: the operator can set it, so it is not identity or approval proof.

No new confirmed defect in these exact inactive SQL bytes was established by this review. This is a bounded self-assessment, NOT an independent PASS. RLS is not enabled on the private tables: the inactive boundary depends on absent schema/object grants and privileged ownership. The human assessor must explicitly accept or reject that inactive boundary and evaluate inherited/indirect privileges, external API schema configuration and future-grant risks. Operational SECURITY DEFINER functions/grants/storage remain separate unbuilt work; the inactive proposal must not be presented as an operational coordinator migration.

Rollback evidence to reuse: PR138 restore-test apply/rollback record; `test-support/t19-02-managed-owner-rehearsal.sh` exercises the exact inactive proposal and removes its empty objects in dependency order without CASCADE. `t19-02-rollback-rehearsal.sh` is for the DIFFERENT disposable RPC fixture, not a staging rollback script. Before staging approval, capture a fresh restore checkpoint, exact baseline digests and a reviewed empty-schema rollback. Abort rollback if any operation/credential data exists; preserve ledgers and use reviewed recovery instead. No rollback or restore was executed here.

## Safe implementation completed in this branch

Original criteria addressed: no credential exposure and automatic scoped token refresh.

1. Restricted core previously returned arbitrary adapter Error objects when their code was `stale` or `custody_denied`, and the first authorizer call was outside its sanitizing catch. An adapter's message, stack, cause and enumerable details could therefore leave custody. Now all such errors are freshly constructed with fixed messages/codes and first authorization is inside the same boundary. Tests reproduce the prior failures across authorization/current/claim/read/dispatch/provider/seal/complete and assert unchanged pre/post-dispatch failure handling.
2. Core previously rejected successful refresh without a replacement refresh token. Existing C1 already preserves nonrotated material, as does the Shalean reference refresh pattern. Core now validates existing material before dispatch, retains it when a trusted success omits replacement, and seals under the next seven-field credential version. Explicit malformed replacement tokens still quarantine without publication; rotated replacements remain supported. Provider adapter remains responsible for validating real response/token/expiry/region before reporting success.

These changes do not wire routes, introduce credentials, enable worker access, or supply missing provider/storage/database adapters. Focused tests are synthetic and are not A12 or provider acceptance.

## Reuse / integration disposition

PR102 is still Draft/open at `a028fe62a2a38cb537b5f35b43a38c29b681c72f`, based on `codex/t19-research-architecture`. Its `src/accounting-stage-b.js` and `database/accounting-stage-b.sql` are byte-identical to current staging (verified by Git diff). Do not merge the obsolete branch to obtain those files. Its provider/environment/org guards and in-memory vault deliberately restrict it to synthetic execution; removing these guards would not provide operational custody.

Reference inspected: `shalean-platform` HEAD `1fa7fa1b1a6ea23786cbecd3ee7a77682a6fd0ed`, `apps/web/lib/zoho/zohoBooksClient.ts`: server-side token POST, refresh-token reuse, access-token expiry cache, pinned organisation in Books requests. Reuse the established refresh behavior, not global single-business environment variables, raw provider error propagation, payment-account defaults or automatic write retries. No production secrets were read or copied. [Zoho OAuth reference](https://www.zoho.com/books/api/v3/oauth/) checked for refresh contract; no actual Zoho request performed.

## One remaining dependency chain, owners and gates

1. **Farai appoints independent human assessor; assessor decides PASS/NO-GO for Issue140.** Required signed/attributed record: identity, independence, date, target, exact SQL SHA/blob, commands/evidence, ownership and SET ROLE paths, defaults/API/Vault exposure, baseline/rollback assessment, findings/residual risks and explicit inactive-only decision. Unverified items must be NOT ASSESSED, never PASS.
2. **Farai separately approves exact inactive staging SQL after PASS.** Operator then rechecks project/hash, T07 and financial digests, role/grant baseline and restore readiness; applies only approved inactive migration; executes actual deny trials and verifies unchanged records. No approval requested prematurely in this execution.
3. **Codex/operator prepares operational wiring under the existing design; Farai/security approve concrete grants, secrets and runtime deployment before execution.** Required dependencies remain machine authentication, durable coordinator RPCs with atomic C1/lease/generation fencing, Vault adapter and isolated runtime; no ordinary worker token access. Existing fixtures are references, not deployable adapters. A12 remains open until actual hosted identity/privilege/key/process/backup acceptance.
4. **Business owner performs separately approved consent for EACH business; operator verifies real provider behavior.** Recheck current identity and effective least privileges, organisation boundary, callback/state/cancellation/failure, custody, refresh/disconnect/revocation. Earlier successful reads or empty lists do not prove isolation.
5. **Codex/operator runs one consolidated accounting acceptance; independent assessor performs final quality/security acceptance.** Record exact app/migration/deployment SHA, current CI, per-business expected/actual totals, mappings, permitted operations and role/tenant denials, refresh/version fence, durable replay protection, lost response/network/restart recovery, disconnect/revocation and duplicate checks. Preserve pre/post financial digests. Authorised TEST writes need concrete approval first. Only then reconcile tracker and consider Done.

Until then: T19 IN PROGRESS; no claim of operational integration, provider acceptance, full T07 preservation, financial reconciliation, deployed SHA, or independent human approval. T20 remains Not started.
