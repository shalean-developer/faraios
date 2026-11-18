# OWNER-03 installation receipt — 18 November 2026

User approved the bounded HTTPS foundation and enrollment of only the existing platform-owner account. No merge, main-branch change, visible directory pages, application transport switch, customer messages or business/Auth row edits.

## Installed scope

| Repository migration | Hosted migration version |
| --- | --- |
| 20261118092848_owner_directory_restricted_reader.sql | 20261118103302 |
| 20261118101850_owner_directory_https_gateway.sql | 20261118103430 |
| 20261118104000_owner_directory_claims_compatibility.sql | 20261118103721 |

The first gateway attempt failed ownership transfer and rolled back entirely. Temporary membership for CURRENT_USER fixed managed postgres ownership transfer; it is revoked before commit. The next hosted query exposed unavailable auth schema USAGE. A corrective migration reads PostgREST-verified request.jwt.claims directly, validating sub before UUID conversion. The immutable enrollment/session/expiry/eligibility checks remain enforced. This does not create a caller-controlled SQL or arbitrary RPC path.

Exactly one verified, nonanonymous, nondeleted, unbanned owner with an active session was enrolled after matching the private local owner_ids. No identity is disclosed in this receipt. Both custom roles remain NOLOGIN, NOSUPERUSER, NOBYPASSRLS. Supabase retains creator ADMIN memberships for postgres with INHERIT=false and SET=false; no runtime user membership exists. Executor has SELECT only on four private projections/control objects, no raw auth.users SELECT, public.businesses UPDATE or private-schema CREATE. Anonymous/authenticated direct SELECT on all four private objects is false.

Two installed PHP modules have exact reviewed hashes:

- account/platform-directory.php: 048f131ccab53c220ab020d23447e5015f002e5d2676701aacd4b01b1195fb39
- account/platform-directory-https.php: 104d98727971cdbdbbff18c47d0af513f588e38a1ca8eccdd8630a4e3a1d59d6

Six baseline files matched before and after installation: platform.php, platform-core.php, platform-session.php, index.php, core.php, regions.json. Files were staged outside webroot, syntax checked, added without overwrite and temporary staging removed. No private credentials or configuration were changed. Scheduler form cancelled; exactly five existing jobs remain.

## Verification

- Hosted database read-only transactions: authenticated-role calls with controlled claims referencing the existing owner/session returned bounded Businesses and Users projections. No records were printed. These are database authorization tests, not signed JWT verification.
- Eight hosted denial checks passed: missing claims, expired claims, unenrolled identity with forged metadata, invalid session, wrong claimed role, invalid resource, direct private-table SELECT and anonymous function invocation.
- Host PHP8.2.35 CLI through existing production session adapter reached the new HTTPS RPC with the existing publishable key, no bearer token, verified peer/name, five-second timeout and redirects disabled: HTTP401 / SQLSTATE42501,621ms, no stderr. Confirms PHP TLS/API reachability and anonymous denial; not a successful signed-in read or web-SAPI acceptance.
- HTTP: homepage200; both new include-only module URLs404. Live owner tracker loads and retains Development navigation.
- Supabase UI: only public/graphql_public schemas exposed; faraios_owner_directory unchecked. No exposure settings changed.
- Post-install advisors:39 INFO RLS-no-policy,26 authenticated-definer warnings,1 password-protection warning, unchanged from baseline. No owner-directory finding. Checked private SECURITY DEFINER helper remains an intentional boundary requiring explicit review regardless of advisor output.
- Local:69 authorization/projection +14 HTTPS adapter +49 isolated PostgreSQL checks =132 passing assertions. PostgreSQL suite covers unavailable Auth schema grants and non-superuser CREATEROLE installer ownership, removal of temporary executable membership, containment and RESTRICT-only removal. Business fixtures preserved. No hosted rollback executed.

## Remaining limits and next step

OWNER-03 stays In progress,2/5; do not mark the three hosted page/security/navigation criteria complete. No protected directory page or enabled caller yet. Next: wire a bounded protected page, verify real signed owner JWT over HTTP, ordinary supported-role/expired/revoked-session denial, projection/privacy, pagination/search, failure handling and web-SAPI latency; then direct URL, sign-in destination, mobile/keyboard and navigation acceptance. Do not scrape session storage, extract owner tokens, add privileged fallback keys or enable links prematurely.

Rollback: disable callers, commit disable-https.sql first (enrollment disable and function EXECUTE revocation); then uninstall-https.sql with RESTRICT. Both scripts accommodate managed non-superuser ownership via temporary membership. Base projections are removed separately afterward if needed. Never restore business/tracker rows or use CASCADE. Actual hosted containment/removal is not claimed tested; the managed-style local rehearsal passed.
