# OWNER-03 bounded installation and rollback preparation

Prepared18 November2026. NOT deployed, NOT approved for execution, PR88 remains draft. Live task TASK-4D58A7674A remains In progress; reconciliation and data-contract criteria are supported (2/5). This document supersedes the README's earlier pending-tracker-save note: evidence was saved successfully before this preparation and the new results must also be recorded.

## Reconciled sources

Six account files were read through the signed-in Plesk editor without saving. `hosted-baseline.json` contains hashes of the observed UTF-8 editor text. A subsequent read-only Python SHA256 check on the actual host confirmed all six raw file-byte hashes match these observations on 18 November 2026. This attests these six files at that point in time; repeat before installation. The new-target absence output was truncated, so that gate remains unverified. A host-side byte check remains mandatory immediately before installation. Do not rewrite a file to make its hash match.

| File | Comparison with PR88 historical base | Installation action |
| --- | --- | --- |
| account/platform.php | Exact observed-text match; hash also matches earlier accepted receipt | Preserve |
| account/platform-core.php | Exact observed-text match | Preserve |
| account/platform-session.php | Production-only adapter; absent from branch; hash matches earlier accepted receipt | Preserve; never replace with core.php |
| account/index.php | Newer owner redirect, staff-join/recovery and business-creation repairs | Preserve |
| account/core.php | Newer business-context/role and error-handling repairs | Preserve |
| account/regions.json | Exact observed-text match | Preserve |

The production session adapter loads private production configuration, uses the existing account session, refreshes expiring sessions and calls Auth `/user` on reads. Do not include both that adapter and account/core.php in a future page: they define overlapping functions. Other booking repairs are being developed concurrently; recheck immediately before any installation and never ship the historical branch wholesale.

## Exact proposed scope

- Add only `account/platform-directory.php` and `account/platform-directory-reader.php` to the website after checking both targets are absent. These are include-only and direct requests return404. This preparation adds no page or live menu link.
- Apply only `supabase/migrations/20261118092848_owner_directory_restricted_reader.sql` to FaraiOS project `rxelmugnucfajrqmphhe`, after explicit bounded authorization and exact-file review. Generated using Supabase CLI3.2.0 `migration new`; tested on isolated PostgreSQL17.11, not hosted Supabase. Never run all historical pending migrations or a blanket db push.
- The migration creates one NOLOGIN role, one private schema and two security-barrier projection views. It modifies no business/Auth table, row, RLS policy, existing role or public RPC. Name collisions abort rather than overwrite. Views deliberately use their trusted provisioning owner's access across businesses; reader gets only SELECT on projected fields. Confirm the provisioning identity can read all six source relations and that migration default privileges add no unexpected recipients.
- Credentials/login activation and private `platform-directory-db.json` are a separate authorized step. No password is generated, stored or included in this packet. Keep configuration disabled until runtime checks pass.
- OWNER-04/05 page routes and navigation enablement are outside this installation. Installing these modules alone does not finish OWNER-03 or provide visible directory pages.

## Pre-installation gates

1. On the host, run `php scripts/owner-directory-preflight.php /var/www/vhosts/shalean.com/faraios.com docs/owner-03/hosted-baseline.json` from a private review directory, after verifying the actual document-root path in Plesk. This document root was freshly confirmed in both Plesk and the actual web runtime on 18 November 2026. The script reads only and exits nonzero on changed/missing source bytes or existing new-file targets. It is not a deploy script. Preserve before/after receipts outside the webroot.
2. Verify PHP PDO_PGSQL, CA trust, network and database mode using the hosted PHP runtime. Current adapter uses a fixed unqualified username and native prepared statements: use direct PostgreSQL with verified TLS. Supabase Free direct connectivity requires IPv6. If that network path is unavailable, stop and review a bounded session-pooler username/configuration change; do not use a privileged account or disable TLS verification. Transaction pooler mode is not accepted by this adapter.
3. Confirm private schema is not in the Data API exposed-schema list. Confirm reader role/schema are still absent before applying the exact migration and capture migration-history state. Production metadata on18Nov showed both absent; this is not permission to create them.
4. After applying, verify role NOLOGIN, no memberships, no superuser/bypass-RLS/create-role/create-db rights; exact two-view SELECT, no underlying-table writes/reads, no public/anon/authenticated view access and no unexpected default ACL recipients. The PHP adapter additionally rejects excess effective grants and accessible SECURITY DEFINER functions. Never remove unrelated global PUBLIC grants to make this check pass.
5. Before login activation, review existing security-advisor baseline and rerun after installation. Baseline:39 RLS-without-policy informational findings,26 authenticated SECURITY DEFINER warnings,1 leaked-password-protection warning. These were not introduced by this uninstalled reader; this preparation did not remediate unrelated tables/functions. Provision only the dedicated reader identity, mode0600 private config outside webroot, enabled=false initially. Confirm TLS verify-full and query plan/latency against representative data before any owner-facing caller exists.
6. Test protected route wiring and every supported-role denial, expired/revoked owner, direct URLs, error redaction, mobile/keyboard and navigation before enabling OWNER-04/05 links. None of these new hosted-route tests has passed yet because no route is installed.

## Confirmed hosted runtime blockers — 18 November 2026

Read-only checks found two installation blockers:

- Actual web phpinfo reports CloudLinux PHP 8.4.27 / lsapi, despite Plesk domain settings showing PHP 8.2.35 / FastCGI. PDO lists only mysql and sqlite; pdo_pgsql is absent. Use actual web-runtime evidence, not the Plesk version label or CLI runtime.
- The direct Supabase endpoint resolves to IPv6 on the hosting server, and a credential-free TCP/TLS probe returned `OSError: [Errno 101] Network is unreachable`. The probe never authenticated or queried SQL. TLS certificate verification could not be reached and remains untested.

CloudLinux offers pdo_pgsql, but the PHP 8.4 extension settings are shared by faraios.com, shalean.com, bokkiecleaning.co.za and staging.bokkiecleaning.co.za, all with domain isolation disabled. No extension or isolation setting was changed. Obtain authorization for this concrete shared-setting change before enabling only pdo_pgsql; preserve PHP version and all other extensions, verify all four sites and restore the single checkbox if regression occurs. Do not reset extension defaults.

Next scoped development: obtain the project's exact session-pooler endpoint from Supabase connection settings; add explicit session-pooler mode with the project-qualified dedicated reader login while retaining role verification, native prepared statements and verify-full TLS. Do not guess the regional pooler hostname, accept arbitrary usernames, use transaction pooling, weaken TLS or provision a privileged credential. Test parser/connection identity and repeat credential-free host TLS checks before installation.

Host probes used the unsaved Plesk Add Task form with notifications disabled and Run Now. The form was cancelled afterward; the scheduler still contains its original five entries. No scheduled task, source file, PHP setting, database object or business row was changed.

## Two-step rollback

First disable private configuration and stop callers/menu links (currently none), then execute `disable-reader.sql`: in its own committed transaction it sets NOLOGIN and revokes directory SELECT/schema USAGE. NOLOGIN does not kill existing sessions; review and close only sessions for this exact reader role when necessary. Do not terminate other roles. If containment times out, leave application disabled and escalate; do not assume revocation succeeded.

After no reader sessions remain, execute `uninstall-reader.sql`. It refuses a still-enabled role, remaining reader sessions or SELECT privileges. It drops only the two views, then the private schema and role, all with restrictive dependency handling. No CASCADE, DROP OWNED, business/Auth-table operation or backup restoration. Unexpected dependencies abort removal; the separately committed containment remains in effect. Investigate dependencies instead of expanding the drop scope.

Remove the two new PHP files only after disabling their callers and verifying installed bytes still match the reviewed release. Remove only this feature's private credential/config entry through the approved secret-management process. Never restore the tracker JSON, owner allowlist, production.php, account/index.php/core.php/session files or business records. Reconcile the exact migration-history entry through the chosen migration mechanism; do not manually fabricate or reset the project's migration history.

## Rehearsal evidence

Local PostgreSQL test now applies the generated migration and passes36 assertions (previous27 plus9 rollback assertions). It proves login/read containment, rejected new connections, RESTRICT stopping unexpected dependent objects, containment remaining after a failed uninstall, successful narrow removal, and identical business/Auth fixture data before/after. Tests use an isolated localhost database, synthetic rows and no hosted credentials. Reader role and database server are removed/stopped at the end; other fixture schemas remain disposable local test state.

The host preflight is tested against copied observations, then a deliberately modified core.php: expected PASS and STOP respectively. These tests do not substitute for executing it against actual hosted bytes. Original69 module assertions and seven tracker regression methods remain part of the release evidence; optional Chromium is skipped. No hosted database or website mutation was made during preparation.

References: [Supabase connection modes and TLS](https://supabase.com/docs/guides/database/connecting-to-postgres); [RLS-without-policy advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy); [authenticated SECURITY DEFINER advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). The existing source SQL review pointer is superseded by the named migration; do not install both.
