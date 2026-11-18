> Initial foundation-phase record. The protected UI and navigation are now installed; see [closeout evidence](closeout-20261118.md) for current scope and verification.

# OWNER-03 HTTPS foundation — installed, pages inactive

18 November 2026. User-approved narrow installation is complete. Two PHP modules, private projections, checked HTTPS gateway and a managed-Postgres compatibility migration are installed. Exactly the existing immutable platform-owner account is enrolled. No visible page, navigation link or application transport switch is enabled. PR88 remains draft; no merge or whole-branch deployment. See [installation receipt](installed-20261118.md) for authoritative hosted evidence and remaining limits.

The installation found two managed-Postgres differences: function ownership transfer needs temporary SET ROLE membership, and hosted postgres cannot delegate Auth schema USAGE. Temporary membership is removed before commit; the helper reads the same trusted PostgREST request claims directly instead of calling auth.jwt()/auth.uid(). No Auth-table grant was added.
## Verified network result

An unsaved, credential-free host probe to https://rxelmugnucfajrqmphhe.supabase.co/rest/v1/ used Python's default verified TLS context and received HTTP401, the expected missing-API-key rejection. This proves the hosting server can reach the project's HTTPS gateway over443 with certificate validation. It does not prove PHP transport, JWT authorization, the uninstalled RPC, or hosted database queries. The probe form was cancelled; no scheduled job was added. Prior direct IPv6/5432 refusal remains irrelevant to this proposed HTTPS path; no firewall change or hosting support contact is needed to prepare it.

## Narrow architecture

The existing managed Auth user check and local immutable UUID allowlist run first in PHP. An explicitly selected `directory_transport=https` uses the current owner's session JWT plus existing publishable key against one fixed project/RPC URL over verified HTTPS. No service-role key, database password, arbitrary destination, redirects or automatic privileged fallback. Five-second stream timeout,512KiB response ceiling, fixed GET filters and normal output allowlist/redaction remain enforced.

The exposed `public.platform_owner_directory_read` wrapper is SECURITY INVOKER. Its private helper uses a dedicated NOLOGIN, NOBYPASSRLS executor with SELECT on the two existing narrow directory projections, a limited session-status projection and an RLS-protected owner allowlist. It has no raw Auth SELECT, business writes, login password, role membership or schema CREATE after ownership transfer. Private helper is intentionally SECURITY DEFINER; this is the bounded cross-business privilege boundary, not a general RPC escape hatch. All names are schema-qualified and search_path is pg_catalog.

Database authorization independently checks immutable auth.uid(), signed JWT role/expiry/session ID, enabled owner enrollment, session ownership/existence/expiry, confirmed email, nonanonymous status, deletion and ban status. User metadata grants nothing. Both wrapper and helper enforce the same path, including direct calls. Ordinary authenticated users may invoke the wrapper but get denied before directory reads. Anonymous/service-role direct EXECUTE is revoked. No caller can SELECT the projections/allowlist/session gate or enroll itself.

The owner allowlist is empty by default. The private schema MUST remain absent from exposed Data API schemas. Provisioning identity must validate source-view ownership/RLS behavior and existing default ACLs. Do not suppress an advisor merely because the helper is private: inspect the exact grants and recognize the intentional checked-definer boundary.

## Installation and follow-up procedure

1. Recheck live hashes/overlays and absent new targets. Apply only the reviewed base migration `20261118092848_owner_directory_restricted_reader.sql`, then `20261118101850_owner_directory_https_gateway.sql` and `20261118104000_owner_directory_claims_compatibility.sql`, transactionally. These are already installed on this project; do not replay them. No blanket db push. Base reader remains NOLOGIN; do not provision PDO credentials.
2. Verify all ACLs, no elevated executor memberships, private-schema exposure, wrapper/helper definitions and empty allowlist. Rerun advisors and compare to the baseline39 INFO,26 definer WARN,1 password WARN. No production advisors were changed in preparation.
3. After explicit approval of owner enrollment, insert only the existing verified immutable platform-owner Auth UUID into the private allowlist. Reconcile it with the local owner_ids. Enrollment is a security access change, not a business-row repair. Do not identify the owner by email or user_metadata. Revocation should disable the database enrollment first, then remove local access; local-only removal cannot revoke a direct API request.
4. Add only platform-directory.php and platform-directory-https.php; preserve production platform-session.php/core/index/tracker and booking overlays. Set directory_transport=https only after reviewed owner enrollment and protected endpoint wiring are ready. Existing PDO code may remain draft; it is unnecessary for this transport. No visible directory page/navigation is included here.
5. Prove hosted PHP TLS/API transport, owner reads, nonowner/expired/revoked denials including direct RPC, payload allowlist, pagination, latency, read-only behavior and rollback. Hosted role-denial tests require controlled synthetic sessions; local JWT-claim fixtures are not signed hosted JWT tests. Complete OWNER-04/05 protected routes and mobile/keyboard acceptance separately.

## Rollback

Disable application callers/transport. Execute `disable-https.sql` and COMMIT: disable enrolled owners and revoke wrapper/helper execution. Then run `uninstall-https.sql`: restrictive removal of only the wrapper, helper, session projection, allowlist and executor. Unexpected dependencies abort removal; containment remains committed. Remove new PHP only after checking exact installed bytes. Base projection rollback is separate and must follow HTTPS removal. Never restore tracker/business data or use CASCADE. Requests already in flight may finish; containment is effective for subsequent requests.

## Evidence

-69 authorization/projection assertions PASS.
-14 HTTPS adapter validation/redaction assertions PASS; no network calls.
-49 real isolated PostgreSQL HTTPS gate/ACL/pagination/projection/rollback assertions PASS, including managed-style non-superuser installation/removal.
-PHP syntax and diff checks PASS.
-Current hosted metadata confirmed required Auth column types. Post-install production advisors retain39 INFO,26 authenticated-definer WARN and1 leaked-password WARN; no owner-directory finding was reported.
-Hosted database-role reads and eight denial checks passed, but signed owner JWT/HTTP end-to-end success is still pending. OWNER-03 remains In progress,2/5.

Documentation consulted: https://supabase.com/docs/guides/api/securing-your-api and https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0029_authenticated_security_definer_function_executable .
