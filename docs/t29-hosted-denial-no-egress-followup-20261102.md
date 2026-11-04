# T29 — Hosted authenticated denial gate, read-only follow-up (2026-11-02)

User directed authenticated cross-business access verification and no-outbound-effects synthetic rehearsal under approved fresh-start amendment.

## Verified
- Connected browser tab inventory exposes no authenticated FaraiOS staging session (only GitHub PR #306 and unrelated tabs). Browser list access cannot create or impersonate a Bokkie-only and a Shalean account.
- Read-only connected Supabase `pg_policies` inspection on FaraiOS staging showed authenticated policies for `business_customers`, `one_off_bookings`, `business_quotes`, `business_invoices`, and `recurring_schedules`. All five selected policies reference both business_id and auth.uid in USING predicates. Customers and bookings have ALL policies with WITH CHECK (previous read-only inventory). This is useful structural evidence **not** an actual authenticated denial.
- T29 CI run 41500831586 passed for `e96a875` synthetic access tests. Existing isolated `test/bookings.test.js` runs in-process PGlite and existing staging-access-verifier tests use mocked HTTP. These do **not** prove hosted API/RLS denials or runtime no-egress controls.

## Still required
- Real Shalean-authorised and Bokkie-only signed-in sessions, permitted same-business baseline and denied other-business API+RLS reads, recorded with response codes and no sensitive payloads. Do not fake JWT users via privileged postgres or rely on client-selected business ID.
- Disposable offline synthetic booking run with provider/notification/recurrence egress disabled and explicit blocked-call counters; no live Paystack/Zoho/EFT, mail, cron or shared staging writes. Record isolated resource, run SHA, before/after digests and rollback.
- Owner staging acceptance and tracker Done only after checks pass.

No production modification, hosted write, import, financial notification, staging deployment, port 5432 or T30. State: T29 In progress; hosted denial and no-egress tests pending.
