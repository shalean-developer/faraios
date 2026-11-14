# Account information editing

Request: allow owners to edit the information shown on Account.

Account has explicit Edit your name, Change email address and Edit business details links. Save uses POST with existing authenticated session, exact Origin and CSRF validation; Cancel discards the form. Business edits include trading name, business type, country and time zone. The submitted business version is checked before an atomic compare-and-set PATCH; no ownership fields are accepted. Personal-name version checks catch stale forms, although Auth does not offer an atomic metadata compare-and-set.

Migration `20261114223756_account_information_editing.sql` grants only `UPDATE(name,business_type)` to authenticated. Existing non-anonymous owner RLS and country/time-zone column grants remain unchanged. No broad UPDATE, DELETE, ownership transfer or publication rights are added.

Email changes use Auth's authenticated update endpoint with the existing exact environment confirmation redirect. Hosted inventory: confirmations enabled, secure email change enabled, native change-email template uses ConfirmationURL. Both inboxes must confirm. Native Auth confirmation redirects are informational only: URL access/refresh tokens are stripped and never imported into PHP sessions. Custom token-hash links also support email_change with an explicit POST. Users sign in with the new address after completing both links. No admin bypass or security configuration change.

Records: no data rewrite or backfill. Public profile publication, issued document snapshots, payment/reversal histories and booking intake are untouched. Editing internal business details does not republish public pages.

Validation: disposable PostgreSQL + real PHP HTTP tests cover personal and business saves, invalid inputs, stale submissions, post-read race/empty result, Auth outage, pending-email transport contract and both confirmation responses, CSRF, non-owner/anonymous isolation and forbidden ownership/id/delete writes. Full release regression also runs financial-history, record-preservation and F06 recovery checks. Hosted email delivery and mailbox confirmation are not exercised: test mail transport is simulated and no real account email is changed.

Rollback: deploy previous main `fd63754e9c5403756d60ada201735d7fffc42c75` to application roots. Leave additive grants compatible, or revoke update(name,business_type) on public.businesses from authenticated after the UI is rolled back. Never roll back user edits by restoring database rows or historical documents. Auth email changes already requested still follow the existing provider confirmation policy.
