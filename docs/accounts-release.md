# FaraiOS New — accounts and business setup

## Scope and release state

Authorized 12 November 2026: Create account → Verify email → Sign in → Create business → Welcome; password reset, branded emails, mobile pages and business isolation. Fresh implementation from main 0157fd3. No deleted code/history restored, no imports, bookings, payments or dashboard. Homepage and waitlist application code preserved. Registration never writes waitlist consent or Resend marketing contacts.

**Current decision: CONDITIONAL PASS for final preview review; production NO-GO until the latest source is deployed to preview, hosted smoke checks pass, owner accepts and production configuration is verified.** PR #2 stays draft. main auto-deploys to production through Plesk Git, so do not merge it prematurely.

## Implementation

Existing Plesk PHP hosting; no build step or frontend package dependency. Supabase Auth stores credentials and handles verification/recovery; FaraiOS Resend SMTP sends the branded confirmation/recovery templates. PHP stores access/refresh tokens in server sessions. Browser receives an HttpOnly, Secure, SameSite=Lax identifier scoped to the account path, with a separate cookie name per base URL. All account responses are no-store/noindex with restrictive CSP. No service-role or Resend key in the account application.

Email links carry a one-time token hash in the fragment. JavaScript removes it from the address bar and supplies the explicit POST form. GET never consumes a token. CSRF and exact Origin checks remain enabled. Referrer-Policy is same-origin: no-referrer was found to make native browser form POSTs send Origin:null and fail the application check. Retry preserves posted link fields. Versioned JavaScript avoids stale mobile retry code. Successful verification and password reset use a 303 redirect to the sign-in URL rather than rendering a sign-in form at the confirmation URL.

Idle sessions expire after 30 minutes. Supabase identity is checked on protected requests. Access token refresh rotates tokens; rejected refresh/access credentials clear the application session and return to sign-in. Sign-out executes before business data loading, so a business data outage does not prevent logout. Auth errors distinguish wrong credentials, unverified email and expired/used links without exposing provider internals.

One business per owner is enforced by owner_id uniqueness. SELECT and column-limited INSERT grants plus owner-scoped RLS restrict rows to the authenticated, non-anonymous owner. UPDATE/DELETE are not granted; customers cannot reassign ownership. Business name/type only. Future child tables must reference a business and enforce authorization; editable metadata is not authority.

## Services and cost

- Only Supabase faraios-new rxelmugnucfajrqmphhe, Ireland, PostgreSQL 17. Organization shows Free. Additive business migration hosted version 20261112152816, aligned with its source filename.
- FaraiOS Resend browser workspace shows Free, with notify.faraios.com verified during the waitlist work. The connected Resend API plugin instead exposes Shalean; do not use it for FaraiOS mail changes or logs. Automatic review blocked log inspection. Actual inbox verification/recovery was completed by the owner.
- Existing Plesk subscription remains in use. No extra server, paid runner, project, paid branch, upgrade or purchase introduced. Quotas, free-project pausing and backup limitations still apply. No unconditional zero-cost production guarantee. Auth email delivery defaults to a shared project rate limit; monitor it before increasing usage.
- Leaked-password protection is a paid-plan capability and was not activated. Password-change security notification is an optional follow-up; the required confirmation and recovery emails are branded.

## Evidence and acceptance

| Requirement | Evidence | Limitation/status |
|---|---|---|
| Create account | Real Plesk HTTP signup for owner-controlled hello@faraios.com; Supabase user created | Marked preview account |
| Verify email | Owner followed real email; email_confirmed_at populated | Inbox receipt is owner evidence; provider logs not inspected |
| Sign in | Real hosted password grant through PHP reached Create business; owner later reached Welcome on mobile | New owner password never requested or read |
| Create business/save/reload | FaraiOS Preview Test Business, type other, created via PHP; hosted SQL confirms ownership; subsequent HTTP reload preserved it | Test business, not an approved trading business name |
| Welcome/mobile | Owner Samsung screenshot shows verified account and saved business; signup inspected at 390×844 with scrollWidth 390 | Latest error/session/privacy changes need final preview smoke |
| Password recovery | Real reset email requested; owner then reached Welcome; old generated test password now returns 400 invalid_credentials | Reset link replay/expiry covered locally with simulated Auth, not a second real inbox cycle |
| Sign out | Hosted HTTP returned Sign in; protected reload required sign-in | Outage logout additionally tested locally |
| Business isolation | Hosted actual authenticated role + owner claims sees 1 business; different identity claims sees 0. Hosted rolled-back probe denied forged owner INSERT, UPDATE, DELETE and anon SELECT | Claims simulated in SQL; not a second real mailbox-authenticated HTTP account |
| Security/session | Five local PHP/PostgreSQL suites cover CSRF, Origin:null rejection, retry token, redirect URL, expiry/replay, refresh success/failure, idle expiry, logout during data outage, grants and ownership | Auth/REST gateway simulated locally; RLS runs in native PG |
| Browser CSRF regression | Real hosted Chromium dummy-token POST passed CSRF and reached expected invalid-token response; no form-expired message | No valid email token consumed by automated browser |
| Hosted response/access | same-origin policy, no-store, Secure/HttpOnly/SameSite=Lax cookie; core.php, docs, .git/config and preview waitlist API all return 403 | No secrets captured in evidence |
| Waitlist regression | All 15 native PG/PHP tests pass | Webhook and restore checks tracked separately |
| Source checks | PHP/JS syntax and git diff checks pass | No paid GitHub Actions used |

Tests: `PHP_BIN=php PG_BIN=/path/to/postgres/bin python3 tests/accounts.py` and `tests/journey.py`. Disposable PostgreSQL 17 required; never point tests at a hosted database. Native SQL policy probes used a temporary table and ROLLBACK, leaving no persistent changes.

## Preview configuration

Manual Plesk Git repository faraios-accounts-preview.git follows feature/accounts-20261112, destination /faraios.com/_accounts-preview. Production faraios.git follows main to /faraios.com. Confirm the repository card before pulling/deploying. No production branch switch.

Current preview config is /var/www/vhosts/shalean.com/private/faraios-account/config.php, outside web roots, containing enabled=true, environment=preview, base_url=https://www.faraios.com/_accounts-preview, project URL and publishable key only. This default directory is preview-only. For release establish separate FARAIOS_ACCOUNT_DIR values for preview/production; the base-path guard must reject the wrong environment. Protect config/session file permissions. Do not copy waitlist server secrets.

Supabase Site URL is https://www.faraios.com. Only the exact preview callback is allowed: https://www.faraios.com/_accounts-preview/account/index.php?page=confirm. No wildcard redirects. Email confirmation enabled; anonymous sign-in disabled; password minimum 12; OTP expiry 3600 seconds.

Owner installed SMTP credential privately. Reloaded settings showed enabled, smtp.resend.com:465, username resend, sender FaraiOS <hello@notify.faraios.com>. No credential read/copied. Full clean confirmation/recovery HTML templates installed from supabase/templates; subjects match titles. Tracking must stay disabled for Auth links. Replies/support use hello@faraios.com.

## Final preview and production steps

1. Pull/deploy the latest feature/accounts-20261112 commit only to the account preview. Check wrong-password copy, expired-session handling and the expanded privacy notice. Sign in using the owner's chosen password; saved business must remain and sign-out/reload must work. No new account/password reset is needed for routine smoke tests.
2. Review the preview result with the owner. Record acceptance of the tested scope and limitations, including the simulated second-identity policy test. Production requires explicit approval after this result is reviewable.
3. Install separate private production config, initially disabled, with base_url=https://www.faraios.com. Verify preview retains its config/path. Add exactly https://www.faraios.com/account/index.php?page=confirm to the Auth allowlist; preserve preview callback. Check all links and environment boundaries.
4. After approval, merge qualified PR #2 into main and let production Git deploy. Enable production account config and verify register/verify/sign-in/business/welcome/reset without modifying waitlist consent. Public account entry links need an owner-approved placement; homepage CTA redesign is not part of this change.
5. Validate homepage/waitlist live regression and production health. Rollback by disabling production account config or reverting source, retaining Auth/business records. Do not delete or import historical records.

## Separate waitlist follow-ups

- WL-WEBHOOK: correct FaraiOS workspace signed webhook installation and real delivered/bounced/complained/failed/suppressed handling, signature/replay rejection and suppression proof. Handler exists; hosted completion not verified.
- WL-RECOVERY: backup/export and restore rehearsal, including private configuration, queue recovery and withdrawal/consent reconciliation. A backup setting alone is not recovery proof.
- Plesk task success notifications showed worker/status/private export completion. Reconcile those operating records separately; remaining mail-authentication/header and complete waitlist mobile/CTA evidence is outside this account closeout.

No account creation grants marketing consent. No production readiness claim closes the outstanding waitlist webhook/backup checks.
