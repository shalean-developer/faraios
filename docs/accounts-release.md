# FaraiOS New — accounts and business setup

## Scope and baseline

User-authorized 12 November 2026: create account → verify email → sign in → create business → welcome; password reset, branded emails, mobile pages, isolated preview before production. Base main `0157fd3`. Fresh code only. No old implementation, historical import, bookings, payments or dashboard. Homepage, waitlist and their configuration remain intact. Registration does not touch waitlist tables, queues or Resend marketing contacts.

## Smallest implementation

PHP account area on the existing Plesk site, no frontend dependencies/build. Supabase Auth handles passwords, verification, recovery and email throttling; Resend custom SMTP delivers Auth templates. PHP holds access/refresh tokens in server-side sessions. Browser receives only an HttpOnly, Secure, SameSite=Lax session identifier with a separate cookie name/path for each environment. Every mutation checks CSRF; sensitive responses are no-store/noindex with restrictive CSP. Idle sessions expire after 30 minutes; Supabase user lookup validates identity on protected requests. Refresh tokens are rotated. No service-role key is used in this account application.

One business per account, enforced by owner_id uniqueness. SELECT/INSERT grants and RLS constrain all business access to the authenticated non-anonymous owner. Updates/deletion/owner transfer are unavailable. Business name and type only. No staff roles yet. Future child tables must reference business ID and enforce membership policies; never infer authority from editable user metadata. Supabase email confirmation must stay enabled; anonymous sign-in disabled.

Email links carry token hashes in fragments, stripped immediately by local JS. GET never consumes a token: an explicit CSRF-protected POST verifies it. Verification logs out the issued session and asks for sign-in; recovery has a 10-minute application window. Supabase controls one-time token expiry (configure 3600 seconds). A reset signs out through Supabase then clears the local session. No user-selected redirect destination.

## Connections and cost

Verified fresh project `rxelmugnucfajrqmphhe`, healthy PostgreSQL 17, Supabase organization Free. FaraiOS Resend browser workspace Free; connected Resend API tools point to Shalean and must not be used for FaraiOS writes. Existing verified FaraiOS sending subdomain recorded as notify.faraios.com; preserve existing key. No plan upgrade, paid runner, new project or paid branch authorized. Existing Plesk billing continues; no additional app server required. Free quota, pausing and lack of managed recovery guarantees remain operational limits. Confirm actual Resend/Supabase quotas in dashboards before launch; no unconditional zero-cost production guarantee.

## Required configuration before hosted preview

1. Private directory `/var/www/vhosts/shalean.com/private/faraios-account-preview`, outside every web root; config.php 0600. Use separate production directory later.
2. PHP config returns `enabled=>true`, `environment=>'preview'`, `base_url=>'https://www.faraios.com/_accounts-preview'`, `supabase_url=>'https://rxelmugnucfajrqmphhe.supabase.co'`, `publishable_key=>'<project publishable key>'`. Set FARAIOS_ACCOUNT_DIR in preview-only Plesk config. Do not copy the waitlist server secret. Protect session storage permissions.
3. Supabase Site URL `https://www.faraios.com`; exact permitted Auth redirect: `https://www.faraios.com/_accounts-preview/account/index.php?page=confirm`. Add production account URL only for release. No wildcards. Keep email confirmation enabled and anonymous sign-in disabled. Password minimum 12; OTP expiry 3600 seconds. Review Auth abuse limits, password leak protection availability and CAPTCHA before public launch.
4. Custom SMTP: Resend's documented SMTP host/port/TLS; username resend; password a FaraiOS domain-restricted sending key installed directly by owner; sender `hello@notify.faraios.com`, name FaraiOS. Verify current Resend SMTP documentation in dashboard. Do not display/copy key into chat or source.
5. Install confirmation/recovery templates from supabase/templates; subjects match titles. Disable click/open tracking for Auth links. Enable password-change security notification with branded content. Verify SPF/DKIM/DMARC and owner-controlled inbox receipt.
6. Apply additive business migration only after native tests. No waitlist alterations. Preview source on feature/accounts-20261112, manual Plesk Git repository to /faraios.com/_accounts-preview; noindex and separate cookie path. It shares the named Supabase project, so use only marked owner-controlled test accounts/businesses. It is not a separate database.
7. Full hosted account journey, confirmation replay/expiry/resend, password reset across tabs, sign-out, session refresh, business reload, duplicate submit and two-account direct REST isolation; desktop/mobile visual/keyboard checks. Preserve homepage/waitlist regression results.
8. Owner reviews preview before merge. main auto-deploys via Plesk Git: do not merge beforehand. After acceptance install production private config and exact redirect, GitHub → Plesk Git release, smoke test, rollback via disable account config/source revert while preserving records.

## Separate waitlist follow-up register

- WL-WEBHOOK: install correct FaraiOS Resend signed webhook and prove delivered/bounced/complained/failed/suppressed, replay rejection and suppression. Source handler exists; hosted completion not yet verified.
- WL-RECOVERY: verify database backup/export and a restoration rehearsal including consent/withdrawal reconciliation, private secrets/config and queue recovery. Do not claim a configured backup is proven recovery.
- Existing release notes also leave scheduled worker/private export, mail header and mobile/CTA evidence open. Reconcile current evidence separately without changing subscriber status or treating account registration as consent.

## Release status

Source preparation in progress. Hosted Auth SMTP currently disabled, Site URL localhost:3000 and no redirects at inspection. Production deployment blocked until isolated and hosted evidence plus owner preview acceptance. Do not claim real email or mobile end-to-end success from simulated local tests.

Local evidence: three account suites passed (real PHP HTTP journey with simulated Auth/REST, CSRF/response headers, native PostgreSQL ownership/grants including anonymous and cross-owner denial). Real hosted Auth, SMTP, recovery and mobile visual checks remain pending. PHP syntax, JS syntax and diff checks passed.

## Hosted preparation evidence — 12 November 2026

Draft PR #2, initial head 9081b17. Plesk manual Git target faraios-accounts-preview.git follows feature/accounts-20261112 and deploys only to /faraios.com/_accounts-preview. Source deployed and signup page rendered successfully using private /private/faraios-account/config.php with only the project publishable key. This default directory is temporarily preview-only; before production use separate FARAIOS_ACCOUNT_DIR settings and verify the application base-path guard. Config contains no Resend or service-role secret. Do not submit hosted registrations until SMTP/templates/redirects are complete.

Additive business migration applied to the specifically authorized faraios-new project as hosted version 20261112152816; source filename aligned. Security advisors: only the four pre-existing informational waitlist RLS-without-policy notices; no business-table advisory. No business/account records inserted by this migration. Native tests remain disposable. The 15 waitlist regression tests passed.

Hosted signup layout inspected at 390×844, scrollWidth=390 (no horizontal overflow). This is a signup layout check, not full mobile journey acceptance. SMTP settings form opened but not saved; credential handoff required. Site URL/redirects/templates still need configuration. Password-change security notification not yet enabled. Production remains on main unchanged. Waitlist worker/status/private export success was visible in Plesk task notifications; restore and webhook proof remain open.
