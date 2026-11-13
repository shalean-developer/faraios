# Sidebar navigation production release — 13 November 2026

Owner reviewed the tested reference-aligned isolated preview and explicitly instructed Deploy. PR #15 marked ready and merged as a667162e145ed5b0028f68b8e9cb11256ea2bab9, expected head84a4dcc7a9dc3e6b48421ba86f352e175f276e86. Application f9b95dc; later commits only evidence. Latest-head GitGuardian security check success, no commit statuses or additional CI required/configured. No paid Actions introduced. Native and browser preview evidence: docs/sidebar-preview.md.

Connected Plesk initially returned Permission denied on a stale session. Reopened Plesk via existing signed-in Allanux reseller Log in to Plesk (no permission/security changes), navigated to FaraiOS Git repositories. Production faraios.git confirmed main, automatic destination /faraios.com. Pull now completed and card showed PR #15 merge; explicit production Deploy now returned Deployment task has completed, Done. Accounts preview and waitlist preview unchanged.

Live /account/dashboard.php reload correctly redirects expired owner session to existing sign-in. Owner asked to sign in on live and reply Ready. Authenticated live navigation/figures verification is PENDING; do not mark it passed before observation. A browser attempt to open layout.css directly was blocked by client; no direct asset claim made. Preview visual and mobile checks passed previously.

No database migration, hosted record writes, notifications, Resend access, waitlist webhook/recovery checks, integrations or fictional production records. All page authentication/data/write handlers remain unchanged. Protected Cancelled bookings, Void invoices, payment/reversal history, staff statuses, unpublished Shalean page and retained preview audit fixtures preserved by presentation-only scope. No new database fingerprint/readback claim for this release yet.

Rollback: revert PR #15 application to PR #14 on main and deploy using production Git; no data rollback, deletion, counter reset or schema action required. Production verification will be appended after owner sign-in.
