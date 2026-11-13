# Sidebar navigation and Overview refinement

13 November 2026. Draft PR #15. Preview application f8cf4e2ecee7cccff5e422b1c18528f7ab1908a9, based on production PR #14 merge 666e1f6bac3320c8209bdfc60d70831b5ef79ef4. Saved recommendations and docs/dashboard-production-release.md read from docs/dashboard-release-20261113 before implementation.

Shared presentation shell across Overview, Enquiries, Quotes, Bookings, Customers, Staff, Invoices, Services and Profile, plus private enquiry creation. Existing destinations only. Desktop icon sidebar, active aria-current, business identity, account access, relevant existing Create actions. Mobile drawer implements inert background/navigation, focus entry/return, Tab cycling, Escape and responsive reset. With JS unavailable, navigation stays visible. Overview presents compact counts, today/attention cards and outstanding/overdue/monthly net figures; expandable payment/reversal breakdown and definitions preserve meaning and clear periods/currencies.

No database migration or hosted record writes. All ten page PHP sections before HTML (authentication, data reads and POST handlers) are byte-identical to PR #14. Core helpers, SQL, permissions, business/environment isolation, calculations, time zones, accounts, homepage, waitlist and public customer pages unchanged. Retain all protected Cancelled bookings, Void invoices, original/reversal ledger entries, staff statuses, unpublished Shalean page, labelled preview fixtures and audit history.

Connected Plesk: changed only faraios-accounts-preview.git to feature/sidebar-refinement-20261113 and manually deployed to /faraios.com/_accounts-preview. Production faraios.git remains main at PR #14; waitlist preview untouched. No integrations, notifications, Resend access or production fixtures.

Validation: all account PHP files lint PASS; layout.js syntax and git diff whitespace PASS. Native disposable PG17.11 + PHP8.4 targeted scripts PASS: accounts 5, profiles 4, services/enquiries/quotes/bookings/customers/staff/invoices/dashboard 1 each = 17 checks. Auth/PostgREST transport is simulated; real PHP requests and native SQL security/financial routines run. Dashboard tests cover reversal arithmetic, multiple currencies, DST/day/month boundaries, non-owner denial and read preservation. No paid CI introduced.

Test setup corrections: first native dashboard attempt lacked shared-library configuration for PHP; rerun with PG_LIB passed. A unittest discover invocation inadvertently collected inherited unrelated waitlist test methods, which failed on missing fixture fields before executing their workflows; use targeted script entry points only. No hosted waitlist webhook/recovery check or provider operation was performed.

Browser checkpoint: previous preview was authenticated on inspection, but reload after deployment expired to sign-in. Owner asked to sign in to /_accounts-preview/account/index.php?page=signin. Authenticated navigation, keyboard, responsive layout and visual review are PENDING. Do not label preview fully tested or deploy production until these pass and owner has reviewed it.

Rollback preview: switch only the accounts preview repository back to feature/dashboard-overview-20261113 or PR #14 and deploy manually. No data rollback needed.

## Authenticated preview closeout — PASS

Owner signed in and replied Ready. Application f8cf4e2 verified in connected Chrome on the isolated preview only. All nine sidebar destinations load, active aria-current matches page, and existing forms/filters/profile/service controls remain present. Desktop 1280: each page scrollWidth <= viewport. Mobile 390: all nine pages scrollWidth <= viewport; Overview and enquiry/quote forms also pass 320-pixel overflow checks. No device-hardware claim.

Drawer verified by keyboard: Enter opens; focus enters Close menu; Shift+Tab at first link wraps to Account, Tab at last wraps to brand; Escape closes, returns focus to Menu and clears background inert. Navigation closes drawer on destination. Desktop reset restores sidebar; final viewport override reset. Financial breakdown and definitions expand/collapse with Enter. All four Overview Create links open correct forms without submission.

Retained preview: Today 1, New enquiries 3, awaiting responses 0, overdue 0. November ZAR outstanding 75.00, overdue 0.00, net recorded payments 555.50; expandable payments 886.00 less reversals 330.50. October net 0 with current outstanding still 75.00. Returned to November. Existing labelled booking/staff/invoice fixtures visible. No hosted business writes or new fixtures; production protected records untouched by this presentation-only preview. Full-page screenshots: docs/evidence/sidebar-desktop-preview.jpg and sidebar-mobile-preview.jpg. Preview left open for owner review.

Decision: PASS for tested preview, awaiting owner review/deployment instruction. No production merge/deployment authorized or performed. Native 17-check result from previous checkpoint remains valid; browser testing required no source correction.
