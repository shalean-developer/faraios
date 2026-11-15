# Remaining public URL recovery — 15 November 2026

Nine static pages and three permanent legacy mappings address the remaining twelve
confirmed 404 URLs. Prepared on an isolated branch from main 8884bc5. No account,
database, permission, notification, booking-intake or published-business mutation.

| Historical URL | Proposed response |
| --- | --- |
| /privacy | 301 to /privacy.html |
| /platform/about | 301 to /about.html |
| /marketplace/shalean-cleaning-services | 301 to /b/shalean-cleaning-services |
| /terms | 200 website terms; new wording requires owner review before publication |
| /pricing | 200 current pricing status and contact path; no invented prices or checkout |
| /marketplace | 200 curated directory linking the verified published Shalean business |
| /industries/cleaning | 200 cleaning-specific service-administration content |
| /industries/electrical | 200 electrical-specific content and professional boundaries |
| /industries/security | 200 installation/maintenance content; no monitoring claims |
| /industries/beauty-spa | 200 appointment-administration content and suitability checks |
| /industries/fitness | 200 training-service administration; no membership-billing claims |
| /industries/consulting | 200 engagement-administration content and confidentiality boundaries |

The three replacement destinations returned HTTP200 and relevant titles/H1s during
the audit. The six industry pages contain distinct service examples, three practical
steps, specialist boundaries and related links. They use the existing marketing
stylesheet, logo and responsive layout. Every new page has one H1, description,
canonical, social metadata and WebPage/BreadcrumbList structured data. No rating,
price, SoftwareApplication offer or certification schema is fabricated.

The industry hub links all six additions. The homepage footer links Pricing,
Marketplace and Terms. The live sitemap gains nine new canonical pages plus the
existing privacy canonical; redirect-source URLs are excluded. Existing business
sitemap enumeration is retained unchanged.

## Preview and validation

Run `python docs/remaining-404s/build.py` to render the nine pages. `package.py`
creates `release/remaining-404s/preview.zip`. It contains only `_recovery-preview/`
paths, static files and a noindex .htaccess. No executable application code,
configuration or credentials are packaged. Existing live pages and account routes
are linked through temporary preview-only redirects. Production files cannot be
overwritten by extracting the archive at the website root.

`verify.py --preview` checks nine pages for HTTP200, exact source bytes, one H1,
description, canonical and noindex response; eighteen canonical alias redirects;
six legacy path/trailing slash redirects; two unknown-route 404s. `verify.py`
without the flag performs the matching production acceptance after deployment.
Preview and production evidence are separate files; no live success is implied by
a preview test. Live sitemap XML, mobile layout and existing site/account smoke
checks must also pass before closeout.

SC-02 preserves both historical manifests. A second explicit 14-file old/new hash
delta accounts only for this repair, on top of the first marketing repair. All
other runtime/configuration/asset bytes must remain exact. Inventory is refreshed
only for the one-line movement of existing sitemap access code.

## Release and rollback

Review the website terms and current pricing wording before publishing. No paid
subscription contract or new account acceptance flow is introduced. Website terms
do not invent company registration numbers, addresses, payment terms, liability
waivers or cancellation charges. This page is not a complete paid-service contract.
Reference reviewed for avoiding invented supplier-disclosure claims:
https://www.gov.za/documents/electronic-communications-and-transactions-act

After review and green latest-head CI, merge this repair only; check for concurrent
main changes before Plesk pull/deployment. Validate all twelve historical URLs,
canonical aliases, no preview leakage, sitemap and existing site/account paths.
Do not enable delegation, replay migrations, change live configuration, republish
business content, send messages or submit Search Console requests as part of this
repair.

Rollback is a reviewed source revert of these exact public files. Retain prior
source and evidence. Do not restore a database or overwrite newer shared records.
Google recrawl and indexing are asynchronous and not guaranteed by HTTP repair.
