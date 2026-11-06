# T31 isolated onboarding preview release

Scope: owner-directed preparation through a testable site, 6 November 2026. Only
`staging.faraios.com` and synthetic project `qcmnxjilmsibxftfverd` are targets.
T31 remains In progress until owner acceptance. T32 is excluded.

## Source package

`deploy/t31-greenfield/supabase/migrations/20261106195033_t31_onboarding_foundation.sql`
was created with Supabase CLI 3.0.0 `migration new`, then deterministically assembled
from the manifest by `scripts/build-t31-greenfield-migration.mjs`. The isolated folder
intentionally excludes historical delta migrations. One transaction guards an empty
application target, creates generic onboarding objects and an initially empty Auth
signup allowlist, and commits no tenant, user, policy defaults or financial history.
The source includes existing generic cleaning profiles and the current settings
workload column because the setup UI queries them. It is still not a complete V1
operations installation. Native tests execute the generated artifact itself.

The new `_t31_preview.cjs`/`hosted-t31-preview.mjs` entrypoint pins the new project,
uses only its publishable key, carries no provider adapters or service credential,
and restricts routes/SDK requests to onboarding. Existing hosted entrypoints and
original staging configuration retain their project. New preview health identifies
the selected project. Registration is permitted only in this explicit preview;
legacy hosting's registration guard remains intact. New-project Auth must have its
Before User Created hook enabled, email confirmation on and anonymous sign-in off.
A separately owner-supplied recipient is configured in the private allowlist, never
in public source. Staff invitation delivery remains manual; no automatic email send.

## Required release sequence

1. Qualify latest source/head CI and generated-artifact/native permissions, signup
   allowlist, settings/cleaning field compatibility, tenant RLS and audit tests.
2. Recheck new target emptiness, managed Auth role privileges and no application-role
   conflicts. Apply only the reviewed generated artifact through a named migration.
   Verify tables/RLS/ACL/function owners, unchanged managed Auth structure and advisors.
3. Configure the Before User Created hook and the approved private signup recipient.
   Verify a non-allowlisted direct Auth signup is rejected with no created Auth record.
   Preserve email confirmation and disabled anonymous/SMS/social authentication.
4. Use a separate Plesk checkout at `/staging.faraios.com/t31-preview`, not the existing
   application directory. Existing root `/staging.faraios.com/app`, document root
   `/staging.faraios.com/app/public` and startup `_test_payments.cjs` are rollback values.
   Switch root/document root/startup only after source and Auth gates qualify.
5. Verify HTTPS/noindex, new project fingerprint and no provider runtime; desktop and
   mobile registration/settings pages and foreign routes. Then invite the owner to
   test signup/email confirmation/sign-in/business provisioning/configuration.

## Rollback and limits

Before SQL commit, any failure aborts the transaction. After commit, preserve the
new isolated schema; do not delete Auth users, tenant data or roles as an automatic
rollback. Reverting the Plesk root/document root/startup restores the old staging app;
new database objects cannot affect its pinned original project. Keep original Plesk
Git automatic deployment disabled; do not change production or legacy databases.

Default Supabase SMTP may limit recipients to organisation members; if the approved
inbox cannot receive confirmation, report that actual result and keep registration
acceptance pending. Do not disable email verification or copy another project's
SMTP credentials to make signup pass. No real passwords are recorded in evidence.

Gate before hosted actions: latest-head CI, exact artifact digest, isolated target
preflight and Auth safeguard checks. This document records preparation, not completed
migration/deployment/owner acceptance; execution evidence belongs in PR/tracker.
