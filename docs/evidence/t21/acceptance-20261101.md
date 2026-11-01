# T21 staging acceptance evidence — 1 November 2026

Status: In progress; owner acceptance pending. Canonical scope remains manual EFT evidence/unmatched items and agreement of booking/invoice states with verified payment. No T22 work.

## Deployed source

PR291 merged at 75c6f6d2bbb92054894cf95a92fed8851818e078. Necessary rejection-display correction PR292 merged at 77455dd29af15a4c063b5e558a7bf9aeb74a3d2c, qualified head 84874081e18dc9156d8e04f8618b3e8058761836. All 7 checks PASS, including native T21 concurrency/rollback at READ COMMITTED and REPEATABLE READ. Local correction regression 55/55 PASS.

Plesk staging host104.238.222.122; application root /staging.faraios.com/app; Node 24.22.1; existing _test_payments.cjs launcher and accounting schedule preserved. Exact migration SHA256 ba31a2b815c2c7c597ccafb0c8a08b006d22bdc8ee7c685d7aba3192b78ac2cb applied only to project xdmfyrsauvqznkloroxg. Live source fingerprint 86239729f9118893b426a55ce6a6c93c1c03021a802d7a0861f45bcc67d6de3e matches corrected source. Managed TLS, TEST-only payments and disabled notifications preserved. No production/provider financial write or credential/account-mapping change.

## Actual authorised synthetic journeys

| Business | Booking | Invoice | Verified allocation | Unmatched |
|---|---|---|---|---|
| Shalean |576d3973-1812-45f8-8211-6e43c0901631|8784b5cc-4de3-4bd8-be41-2f14fdb48219|R40+R60=R100|R10|
| Bokkie |c36f35b9-30c2-4fa9-b8fd-499ccda9cb18|457473ae-825c-4e49-bd73-069d38f1ca63|R40+R60=R100|R10|

Created through the authenticated staging UI using the existing fictitious customers/services at R100. Both bookings are unassigned drafts for 5 November 09:00; existing business working-day rules retained. Both invoices remain internal drafts and unsynced, with no provider action. All six receipt references include T21/business/date/amount/TEST; evidence explicitly states SYNTHETIC TEST ONLY/no bank funds. Verification is simulated staging bank evidence, not an assertion of actual money received.

In each business: unverified evidence left the invoice unpaid; verified-but-unmatched evidence did not pay it; R40 allocation produced part_paid/balance R60; final R60 produced paid/balance R0. Actual invoice AND booking pages were inspected and agree. R10 remained verified/unmatched. Reopening retained records/actors/timestamps. Hosted excess, cross-business, existing-online-attempt and duplicate-reference submissions rejected without extra receipts/allocations. Corrected rejection message is visible inside the EFT workspace; no generic sign-in error on the retest. These are existing owner-browser/Supabase API flows, not invented SQL outcomes.

## Access and concurrency evidence boundaries

Native independent-connection tests cover 8 scenarios across 2 isolation levels including first-writer rollback, exact totals and disposable-cluster cleanup. Operator-driven SET ROLE rollback-only hosted checks prove anon RPC denial, authenticated/service-role direct-table denial and missing-session denial. Actual anonymous PostgREST call returned HTTP401/SQLSTATE42501. Existing owner login exercised actual permitted hosted API operations. Staff/foreign-user/manager enforcement is additionally covered by isolated HTTP/SQL tests; separate live logins for those roles were not performed. No new access identity was provisioned.

All 3 T21 private tables have RLS enabled and no anon/authenticated/service-role direct read/write grants. Public RPC is invoker rights; privileged functions are private with empty search_path and current membership/live-session checks. Advisors gained only 3 expected private-table/no-policy INFO findings; pre-existing leaked-password warning unchanged.

## Final reconciliation

Totals: 6 receipts, 4 allocations; per business 3 receipts, 2 allocations, 10000c allocated and1000c unmatched. Existing online attempts 6 and verified credits 4 unchanged. Invoices 7→9 and bookings 19→21 are exactly the 2 approved synthetic fixtures; no new customer/service/account.

Excluding those new fixtures, original invoice digest 98340014fd738bfa5d8124c03ae20740 and booking digest bb4795d96a422a315832a0c7a3358389 remain unchanged. Account digest c0d5929312b244cf0313e41294ad7512 remains unchanged. Shalean and Bokkie retain separate account/organisation mappings.

## Visual verification and remaining acceptance

Desktop 1280px inspected: invoice/booking payment summaries agree and are readable; EFT form and rejection remain usable. Document clientWidth/scrollWidth 1265/1265: no horizontal overflow. [Actual Bokkie invoice capture](bokkie-paid-desktop.png).

Mobile emulation NOT VERIFIED: viewport capability requested 390×844 but actual DOM/screenshot stayed 1280×575, including after reload and a fresh tab. The override was reset. No mobile/physical-handset pass is claimed. Owner should review the two EFT workspaces on a phone as part of acceptance. Cosmetic alignment refinements are not added to T21 scope.

Remaining: owner review (including phone layout if required) and explicit staging acceptance. Keep T21 In progress until accepted. No new technical blocker in the canonical payment-state criterion is known from these tests.

## Operating instructions and rollback

Record the business bank's unique transaction reference and a controlled evidence reference. Verify actual bank receipt before matching the internal invoice. Payment advice alone is insufficient. Leave excess and online-conflict receipts unmatched for review. Do not remove online attempts to bypass guards. Recording payment does not complete a service, issue/pay a Zoho invoice or accrue earnings.

After T21 records exist, preserve schema/history and the financial conflict guard. The empty-only SQL rollback must refuse these populated tables. Source rollback/repair may disable the T21 UI while retaining the ledger/guard; never delete accepted financial evidence. Existing recovery and historical T19/T20 material is preserved.
