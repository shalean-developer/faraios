# T29 — Verified Shalean physical backup clone path (2 November 2026)

Supabase official live documentation (connected Supabase search_docs): https://supabase.com/docs/guides/platform/clone-project describes paid-plan physical-backup **Restore to a New Project**, a database-only independent clone with a fresh project and additional cost disclosed in Dashboard before confirmation.

Source evidence: owner screenshot shows Shalean latest visible 2026-11-02 07:31:35 UTC physical backup; Shalean source is Pro and healthy. No actual clone, database restore or attachment copy was performed.

IMPORTANT: clone includes auth records, database schema and data; excludes Storage object bytes/configuration, Edge Functions, API/Auth service settings and some other services. Supabase documentation warns that cloned extensions such as pg_net/pg_cron/wrappers may immediately perform external operations: before allowing a clone to operate, enforce isolation/disable external jobs and verify no live webhook/payment/email credentials or workers can send side effects. This cannot be assumed merely from a new project URL. Never paste private data/keys into public GitHub.

Shalean existing Supabase project has a separate historical branch named staging with MIGRATIONS_FAILED; it contains no source data by default, and is **not** recovery proof. Preserve separately existing FaraiOS restore-test project T07 guard/migration. Do not clone through a default create_branch, which does not copy production data.

Current connected Supabase toolset exposes get_project and restore_project (paused-project recovery), but **not** the physical backup 'Restore to a New Project' dashboard operation. Do not call restore_project on Shalean production. A clone incurs new-project charges; obtain explicit approval of displayed amount and a safe external-egress plan before initiating. Do not claim a successful backup restoration without measured clone+recovery and storage-object proof.

Current status: documented safe route only. G29-01 NO-GO, T29 In progress, no import, restore, production write, port 5432, deploy or T30.
