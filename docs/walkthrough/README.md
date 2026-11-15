# FaraiOS practical walkthrough and existing Crozdesk listing

Owner scope: complete the existing Crozdesk application, then publish a useful
enquiry → quote → scheduled job → invoice walkthrough. Owner separately confirmed
“Completely free” as the current product pricing model in this task.

## Public content

Canonical guide: https://www.faraios.com/guides/enquiry-to-invoice

The guide uses the current live owner interface labels and source contracts:
Enquiries/Create enquiry/Create quote; Quotes/Save draft/Mark sent & get link;
customer acceptance; Bookings/Create / open booking/Save booking/Save assignments;
Invoices/Create / open invoice/Save draft/Issue invoice & get link; manual payment
records. Source reviewed: account/enquiries.php, enquiry-new.php, quotes.php,
bookings.php, invoices.php and invoices-core.php, quote/index.php.

Fictional Example Customer, R850 invoice, R300 + R550 payments, 180-minute visit.
No live/synthetic records created, customer messages sent, share tokens exposed,
or testimonials invented. Examples are labelled fictional. The guide distinguishes
quote acceptance from scheduling; separate assignment saves; allowed overlaps;
manual quote/invoice sharing; issued-document locking; ledger correction versus
actual refund. Public checklist and fragment links support referencing and reuse.

One H1, canonical, description, OG/Twitter metadata, WebPage/BreadcrumbList and
Article JSON-LD; no invented reviews or offer schema. No JS/forms required. Shared
marketing design plus responsive/print stylesheet. Homepage footer and About link
the guide; sitemap adds only its canonical. Explicit alias redirects preserve the
extensionless URL; unknown guide routes remain errors.

Owner-confirmed current free prototype pricing updates pricing.html, homepage FAQ
and About, while future paid offerings/domain packages remain unannounced. No paid
plan, billing automation, native app, public API or live delegated role is claimed.

## Preview, preservation and release

`build.py` renders the guide. `package.py` creates a static-only archive containing
only `_walkthrough-preview/` paths, with a noindex response header and temporary
links to existing live routes. No application PHP, SQL, credentials or config.
`verify.py --preview` checks content/SEO/source bytes, anchors/IDs, canonical
redirects and unknown-guide errors. Run without the flag after deployment.

Eight local SC-02 methods passed. The third explicit eight-file old/new hash delta
preserves both historical baselines and all previous exact deltas. Inventory only
changes the sitemap API site's line number. Full latest-head CI and hosted desktop/
mobile checks are required before merge/publication. Check main for concurrent
unrelated changes before the Plesk production pull. No account, SQL, permission,
configuration, notification, intake or business-publication changes.

## Crozdesk

Existing accepted application at vendor.revleads.com/app/faraios. General product
description/keywords/audience/Web App/English and verified site links saved.
Verified features only: calendar/customer/dashboard/lead management/scheduling.
Current model saved as completely free following owner confirmation. Eight FAQs
saved without unsupported integrations, public API, native apps or delegated access.

Required logo: canonical favicon.svg exported as a 600×600 PNG, with no raster
redesign. Required screenshot: actual public Shalean business website, 1585×991
JPEG. No private customer records appear. Assets are retained under assets/.
Automatic browser transfer/download did not complete; manual upload remains.

Submission also requires the owner's action-time approval to accept Crozdesk/
Revleads Vendor Policy and Privacy Policy. Do not accept or claim submission until
that approval is received and the mandatory assets are saved. No paid promotion,
campaign, subscription or outreach email is authorized by this listing task.
