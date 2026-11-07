# T31 greenfield source installation review

Status: SOURCE PREPARATION ONLY; no Supabase migration has been applied.

Target: newly created synthetic-only project `qcmnxjilmsibxftfverd`, NOT original staging `xdmfyrsauvqznkloroxg`.

The reviewed dependency order is maintained in `src/t31-greenfield-manifest.js`. It begins with identity and audit, then settings, catalogue, customers, bookings and staff teams, followed by T31 provisioning, branding and invitations.

**Warning:** Do not execute `supabase/migrations/` directly on the empty project: the earliest T04 delta locks `public.one_off_bookings` before that table exists.

The existing native T31 provision test applies only the minimal five-file identity/audit/provision/branding/invite fixture. The older T25 synthetic fixture demonstrates a broader foundation order. Neither is proof of a complete Supabase-managed Auth installation. The ordered source still needs a full native greenfield rehearsal, detailed ownership/grant/RLS review, and separate migration approval.

Test environment differences to address before a hosted installation:
- Supabase Auth and managed roles are already provisioned; do not recreate or replace them.
- The dedicated T31 non-login roles and security-definer functions must be reviewed for Supabase permissions.
- The application's source configuration currently pins a different Supabase staging project; keep all hosts and credentials isolated.
- No outbound Auth/email, Paystack, Zoho, SMS, notifications or production integrations are approved.
- The greenfield T31 onboarding slice does not itself establish complete T01–T30 operational capabilities.

**Acceptance gating:** latest-head CI, native PostgreSQL clean-cluster integration/negative RLS tests, reviewed migration artifact, owner-authorised migration to only the new project, separately authorised isolated application deployment, then genuine synthetic owner/tenant mobile and browser acceptance. Do not merge or deploy PR #314 or begin T32.

## Restricted-installer compatibility correction — 6 November 2026

The original PR head `a7e24f9` completed native PG17 greenfield and provisioning checks
in Foundation run `42269891709`. This proved the ten-file source order, not managed
Auth or installation as a non-superuser. The Windows job separately failed two T19
DPAPI tests after approximately 30 seconds; cause remains unconfirmed. A same-code
Windows job rerun was requested; no timeout or custody protection was weakened.

The source candidate now addresses two concrete permission gaps:

- Ownership transfers temporarily grant the installer SET membership in the dedicated
  role, with INHERIT disabled, and revoke that membership after the transfer. Function
  ACLs are established before ownership changes.
- Dedicated workers no longer request access to managed Auth schema/tables. Three small
  installer-owned, private, fixed-search-path SECURITY DEFINER functions return only
  the current caller identity, claims or verified email; no arbitrary-user argument exists.
  EXECUTE is revoked from PUBLIC/anon. Only current_actor is callable by authenticated
  for the invoker-rights identity audit trigger. The audit trigger retains invoker rights,
  worker grants and RLS; the historical audit source file is unchanged.

The greenfield fixture models an independently owned Auth schema and a NOSUPERUSER,
NOBYPASSRLS, NOINHERIT installer with CREATEROLE. It checks unchanged managed-object
ownership/ACLs, final function owners, no remaining SET/schema CREATE access, no worker
Auth access or authenticated membership, tenant settings/pricing denials, audit writes,
unverified-email rejection, JWT-claims fallback and invitation acceptance.

Local validation: 21 T31 tests passed, two native tests purpose-skipped without PG17.
The expanded greenfield test also passed using the existing pinned PGlite dependency
(PostgreSQL 18.6), with only its single database name and transport adapted. Replaying
the original candidate through the restricted fixture reproduced SQLSTATE 42501,
`must be able to SET ROLE "t31_bootstrap"`. PGlite is supplementary evidence, not PG17
or hosted Supabase acceptance. Updated native PG17 CI must pass before qualification.

References reviewed:
- https://supabase.com/kb/troubleshooting/cant-revoke-a-role-membership-granted-by-supabase_admin-d08922
- https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7
- https://www.postgresql.org/docs/17/sql-alterfunction.html

Remaining: actual new-project read-only permission/precondition review, generated and
reviewed migration artifact, separate owner authorization for hosted SQL and isolated
web deployment, then genuine Auth/API/browser/mobile acceptance. This fixture does not
emulate Supabase event triggers/default ACLs or prove Data API integration.

Gate: NO-GO for hosted migration, merge or deployment until remaining gates qualify.
T31 In progress; T32 Not started. Original staging and all legacy systems unchanged.
