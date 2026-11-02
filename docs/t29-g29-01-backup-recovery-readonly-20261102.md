# T29 G29-01 — Read-only backup and recovery verification (2026-11-02)

Scope: owner's authorised read-only Shalean, Bokkie and FaraiOS restore-test inspection. NO write, restore, private object download, backup exposure, migration/import, port 5432, provider actions, CI data export, deployment or T30.

## Observed on connected Supabase accounts
1. **Shalean**: get_project reports `paqjwfulwywtsyyvdxrq` ACTIVE_HEALTHY, PostgreSQL 17.6.1.166. Read-only SQL count of `storage.buckets` = **5** and `storage.objects` = **42**. Those are object *metadata* counts, not proof of successful object-body recovery, backup retention or protected backup accessibility.
2. **Bokkie**: get_project for `scsrxogumimsrtbnqeas` through connected Shalean link returned **permission denied**. The historical T28 Bokkie metadata/owner SQL screenshots are not live connector access. Cannot inspect project backup schedule, retention, export accessibility, storage contents or restoration. Do not confuse source existence with current verified recoverability.
3. **FaraiOS restore-test**: get_project reports `zrlojsvkqipuwkkyfrkn` ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. Exact read-only SQL confirms public.t07_environment_guard **1** row, storage.buckets **0**, storage.objects **0**, auth.users **0**, literal schema `t19` **0**. Prior migration listing `20261023190350_t07_reset_restore_candidate` remains. Zero literal `t19` schemas does not prove absence of T19/T20 protected resources, files or hosted secrets outside inspected objects.
4. **Connector boundary**: available Supabase actions cover project/status, database metadata/SQL and Storage catalog queries but provide no read-only backup inventory/download/restore-proof action. Therefore successful backup creation, retention, independent encryption-key access, attachment byte-level retrieval and reproducible recovery are all **NOT VERIFIED**.

## G29-01 evidence and decisions
| Criterion | Observed evidence | Outcome |
|---|---|---|
| Source availability | Shalean project healthy; Bokkie connector denies access | PARTIAL |
| DB backup inventory, snapshot age/retention and permissions | Not visible through available tools | NO-GO |
| Shalean storage inventory | 5 bucket and 42 object metadata rows, no private bytes | PARTIAL only |
| Bokkie DB/attachment inventory and backup | T28 historical owner-supplied metadata, current direct access denied | NO-GO |
| Restore-test catalog preservation | Guard 1, users 0, storage 0, literal t19 schema 0 | PARTIAL; protected-resource provenance unknown |
| Independent successful restore/retrieve/rollback | Not attempted; no authorisation to overwrite | NO-GO |

## Next bounded action
Owner/admin should verify each source project's Supabase dashboard backup/PITR availability and restore policy without exposing credentials or private data, and supply non-secret snapshot timestamps, retention and recoverability receipts. For Bokkie, connect authorised Supabase account first. Confirm T07 guard/T19/T20 protected-evidence ownership before any disposable restore target changes. Independently demonstrate encrypted DB and required object recovery *only* after isolated resource and separate execution approval. T29 G29-01 remains NOT PASSED; T29 In progress; PR #306 Draft; no T30.
