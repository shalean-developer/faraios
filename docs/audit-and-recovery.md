# T11 — Audit history and recovery

19 October 2026. Scope: FaraiOS staging only (`xdmfyrsauvqznkloroxg`). Existing Shalean/Bokkie systems are unchanged.

## Implemented audit coverage

Migration `foundation_audit_history` installs `audit.events` and invoker-rights triggers for `public.businesses` and `public.business_memberships`. An administrative INSERT/UPDATE/DELETE records business, timestamp, verified request subject when available, database role, transaction ID and before/after records. Identical updates produce no event. Identity keys cannot be changed. Audit insertion and the source mutation succeed or roll back together.

Application roles cannot insert/update/delete/truncate audit history. Only an active owner can SELECT their business's events under RLS. Audit history survives source record deletion. The schema is not added to exposed Data API schemas and no audit UI exists yet. Direct database administrators retain authority over the database; this is not an externally tamper-proof log.

Current identity tables deny application writes. The invoker audit function deliberately does not grant extra write privileges. Future client-facing mutations must add a reviewed audited write path; do not grant users arbitrary audit INSERT to bypass a permission failure. Service-role mutation workflows must verify explicit audit privileges before adoption.

Direct SQL operations may have no authenticated human subject: the database role remains recorded. Do not label an absent subject as a verified human. Nothing backfills changes that happened before this migration.

## Validation

- 43 local tests pass; syntax checks pass.
- Live staging transaction changed a business name, checked before/after and actor capture, verified owner reads, denied audit deletion, downgraded membership and verified manager denial. The whole transaction rolled back. No test changes or audit rows persisted.
- Security advisor: no finding for the new audit schema. Existing findings remain: admin-only `public.identity_audit` has RLS and no policies (intentional default denial); leaked-password protection is disabled. Do not treat the latter as resolved.

## Recovery rehearsal

`scripts/rehearse-foundation-restore.mjs` accepts a v1 JSON snapshot with `project_ref`, `businesses`, `memberships` and `events`. It opens only an in-memory PGlite database, creates tracked schemas, imports the captured rows with parameterized SQL, compares SHA-256 digests, verifies each user's RLS scope and verifies that a new change still produces an audit event after restore. It has no remote database restore operation.

An actual staging snapshot was restored offline: 2 businesses, 2 memberships, 0 new audit events. Digest `3d434b405cba547fdc90fb715f183b75f592b205d615185518a8771cc60a0144`. Data comparison, RLS and post-restore audit passed. Separate synthetic tests restore non-empty history. Microsecond timestamps are preserved as canonical UTC text.

**This is a scoped application-data recovery rehearsal, not a complete Supabase disaster restore.** Auth users are ID placeholders only; credentials, sessions, Auth configuration, existing bootstrap `public.identity_audit`, Storage objects, secrets and provider settings are outside this snapshot. No snapshot is committed to Git. The temporary copy is not a durable off-site backup.

## Full recovery gate still open

Before deployment, establish an approved protected off-site backup destination, retention and schedule; export the full database schema/data and required roles through the supported Supabase CLI/pg_dump workflow; separately account for Storage files and environment/provider settings. Rehearse restoring into an isolated Supabase project and verify real sign-in, business access and application health before any production recovery claim. Record actual RPO/RTO after that exercise; neither is currently promised. Never restore over the live staging project merely to demonstrate recovery.

Source: https://supabase.com/docs/guides/platform/backups (reviewed 19 October 2026). Free projects should export and maintain off-site backups; database backups alone do not restore Storage objects.

## Rollback

If staging identity changes start failing because of audit integration, investigate the write role and privileges first. A reviewed rollback can drop only `audit_business_change` and `audit_membership_change` triggers, preserving `audit.events`; record the resulting gap explicitly. Do not delete history or weaken RLS to make a write succeed.

## Remaining foundation acceptance

PR #12 records live role resolution, suspension, logout and mobile-menu acceptance. Separate manager/staff test identities and fresh sign-in still need completing. Browser creation of credentials requires the user's private password entry. No Auth admin-create connector is exposed, so no accounts were fabricated through auth-table SQL.

Decision: CONDITIONAL PASS for continued isolated development. T11 remains In progress until full backup/recovery acceptance. T12 settings implementation follows as a separate bounded package.
