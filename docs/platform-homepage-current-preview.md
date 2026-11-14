# Platform homepage — current capabilities

Owner request14 November2026: update the FaraiOS homepage to reflect features already covered. Base main6eee87bcd737f0946f395d96343ac7b41c90655e. This change updates only public marketing copy/metadata and two small contrast/link styles in index.html. No application features, account sessions, private pages, business documents, publication states, intake gates, payments, email delivery or waitlist consent/provider behavior are changed.

## Capability boundary

| Homepage statement | Current evidence |
|---|---|
| Create an account, confirm email, set up a business | account/index.php; docs/accounts-release.md; existing live account setup journey |
| Edit/publish a hosted business website, branding/images/benefits/area pages | account/profile.php; business/homepage.php; docs/business-header-preview.md, profile-image-upload-preview.md, benefit-cards-preview.md, area-pages-preview.md; main includes their release |
| Page SEO titles, descriptions, sharing images, canonical/schema/sitemap | business/seo.php; sitemap.php; existing released website SEO controls |
| Enquiries and itemised quotes with customer links | account/enquiries.php and quotes.php; docs/customer-enquiries-preview.md and customer-quotes-preview.md |
| Internal booking scheduling, staff assignments, customer records | account/bookings.php, staff.php and customers.php; corresponding released implementation notes |
| Invoices, secure customer links, manual payments and balances | account/invoices.php; docs/invoices-preview.md; manual-record scope only |

Not advertised as available: enabled public booking intake, online payments, accounting integrations, automated marketing, a complete customer portal or confirmed reseller-hosting service packages. SEO controls are not a ranking guarantee. Existing customer sign-in is partial; this copy makes no full-portal/history promise. No pricing/free-plan/subscription, uptime, tax compliance, review or performance claims added.

## Copy changes

Primary header/hero/final calls to action now Create account using the existing signup route. Sign in remains available. Optional launch/product updates remain a secondary footer link to the existing waitlist; its forms/consent/emails remain untouched. Generic coming-soon labels for already implemented website and workspace features are removed. The illustrative feature tabs keep explicit sample/example labels; Marketing becomes SEO and shows genuine content/sharing controls. Six feature descriptions cover websites, SEO, enquiries/quotes, scheduling/staff, customers/services, invoices/manual payment records. Process copy follows signup → website publication → workspace management. Metadata/Organization description follows the same verified scope. Existing canonical and social image remain unchanged.

## Validation and review

HTML parser and structured-data JSON parse PASS; git whitespace PASS. Real Chromium at1280/390/320 checks: no overflow, one H1, account links, tab switching, mobile menu opening/closing, valid internal anchors, no browser errors. Axe WCAG2A/AA,2.1AA,2.2AA: three scans, zero violations after correcting footer/helper contrast. Local synthetic render only; no signup, public form, provider request or record modification executed. Existing private features are described from current source and release evidence; this copy task does not claim to repeat their complete end-to-end acceptance.

Evidence: docs/evidence/platform-home-checks.json; platform-home-desktop.png is a local candidate render, not deployed production. Preview-only branch feature/platform-homepage-current-20261114. Production homepage remains unchanged.

Automatic approval review denied access to https://so1.cloud-wex.com:8443 because the homepage-update request did not grant authority to this private production-capable administration origin. No alternate admin route or workaround attempted. Specific owner authorization is needed for a manual hosted preview deployment. Do not merge or deploy to production before review. Inspect the preview target and preserve any unrelated active candidate before changing its branch.

Decision: PASS local copy/layout validation. Hosted preview blocked on administration-origin authorization; production NO-GO.
