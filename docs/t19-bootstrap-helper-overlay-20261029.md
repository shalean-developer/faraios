# T19 candidate helper reconciliation — 29 October 2026

The cached PostgreSQL initialization does not reproduce the current staging helper definitions and settings. Blindly replaying the newest upstream migrations would also diverge: they change the PostgREST watcher bodies, add CASCADE to the cron revoke and select a different search path. Preserve the current staging behavior for recovery qualification.

The overlay is derived from two immutable public PostgreSQL schema dumps. Five function bodies match staging byte for byte without modification. The sixth, set_graphql_placeholder, matches after the explicit addition of `set search_path to ''` to its generated graphql_public.graphql function. All six outer helpers also retain empty search_path, remain SECURITY INVOKER and retain their existing ownership/ACLs through CREATE OR REPLACE. No private function body is imported into source; tests derive each body from the included public snapshots with exactly the one documented nested hardening change.

Provenance in test-support/t19-bootstrap-helpers/NOTICE:

- grant_pg_graphql_access and grant_pg_net_access: supabase/postgres@802e6a10d46963f690ef0766a7d55c29150678c2, migrations/schema-17.sql.
- grant_pg_cron_access, pgrst_ddl_watch, pgrst_drop_watch and set_graphql_placeholder: supabase/postgres@be0013981bc2208db2389ad5bdae5fed021ccdcc, migrations/schema-17.sql. The older cron body has no CASCADE and the watchers retain their prior behavior.

Read-only staging inspection also resolved the role-setting difference: supabase_admin uses the literal `$user` token, while postgres retains the upstream escaped-dollar token. Correct only supabase_admin in the fresh candidate. Do not change the postgres role setting or any hosted role.

The runner binds the overlay into the signed bundle, checks its fixed byte hash and verifies the six expected invoker helpers are owned by supabase_admin before replacement. Only the existing bound synthetic PostgreSQL container can receive SQL; there is no hosted client. All six definitions and the one role setting apply transactionally. Complete managed metadata comparison, including body/owner/ACL/search-path and role settings, remains mandatory afterward.

Native PG17 CI loads the overlay in its rollback-only fixture, checks helper owner/security/search paths and the role setting, and actually fires the event helper. It verifies that the generated GraphQL placeholder has empty search_path and returns the expected disabled-extension response. The upstream full schema dumps are provenance evidence only and are never executed. No migration ledger is modified.

This closes a source implementation gap; it does not establish full native Supabase compatibility. Extension ownership/btree_gist and Storage's historical-byte/migration-context boundary still require resolution before a new owner-host qualification. No staging SQL, protected checkpoint, restore project, credentials or provider accounting actions are involved. T19 remains In progress / NO-GO and T20 remains excluded.
