# Sidebar navigation production release — 13 November 2026

Owner reviewed the tested reference-aligned isolated preview and explicitly instructed Deploy. PR #15 marked ready and merged as a667162e145ed5b0028f68b8e9cb11256ea2bab9, expected head84a4dcc7a9dc3e6b48421ba86f352e175f276e86. Application f9b95dc; later commits only evidence. Latest-head GitGuardian security check success, no commit statuses or additional CI required/configured. No paid Actions introduced. Native and browser preview evidence: docs/sidebar-preview.md.

Connected Plesk initially returned Permission denied on a stale session. Reopened Plesk via existing signed-in Allanux reseller Log in to Plesk (no permission/security changes), navigated to FaraiOS Git repositories. Production faraios.git confirmed main, automatic destination /faraios.com. Pull now completed and card showed PR #15 merge; explicit production Deploy now returned Deployment task has completed, Done. Accounts preview and waitlist preview unchanged.

Live /account/dashboard.php reload correctly redirects expired owner session to existing sign-in. Owner asked to sign in on live and reply Ready. Authenticated live navigation/figures verification is PENDING; do not mark it passed before observation. A browser attempt to open layout.css directly was blocked by client; no direct asset claim made. Preview visual and mobile checks passed previously.

No database migration, hosted record writes, notifications, Resend access, waitlist webhook/recovery checks, integrations or fictional production records. All page authentication/data/write handlers remain unchanged. Protected Cancelled bookings, Void invoices, payment/reversal history, staff statuses, unpublished Shalean page and retained preview audit fixtures preserved by presentation-only scope. No new database fingerprint/readback claim for this release yet.

Rollback: revert PR #15 application to PR #14 on main and deploy using production Git; no data rollback, deletion, counter reset or schema action required. Production verification will be appended after owner sign-in.

## Authenticated production closeout — PASS

Owner signed in and replied Ready. Live /account/dashboard.php verified (no preview banner) with deployed compact sidebar, account/business footer, greeting/New action, Today/Needs attention and Money overview. Business display name remains FaraiOS Preview Test Business but route/environment is production. All nine destinations load, correct active states, no alerts, desktop1280/scrollWidth<=1280. All four New links open correct forms without submission. Live profile shows Draft; no publication performed.

Production dashboard Today0, New0, awaiting0, overdue0; current ZAR outstanding0.00, overdue0.00, November net recorded payments0.00. Expanded breakdown retains payments276.90 and reversals276.90. Existing reversal history therefore still nets zero, and retained preview fixtures are excluded from live figures. No record write, form submission, payment action, notification or integration/provider access performed. No new database fingerprint claim; presentation-only code retains all handlers and database routines. Previously passed preview mobile/keyboard checks apply to identical deployed application; no additional live mobile claim made.

Screenshot docs/evidence/sidebar-production.jpg captured live. Owner live dashboard left open for review. The prior pending-sign-in checkpoint is now closed. Decision PASS: sidebar navigation and dashboard refinement deployed through PR#15 and authenticated production verification complete.
