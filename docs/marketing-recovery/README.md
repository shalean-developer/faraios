# Public URL recovery — 15 November 2026

Status: preview prepared; production release awaits owner approval. Draft PR #61.

## Scope

Restore `/features`, `/hosting`, `/industries`, and four industry pages: tourism,
gardening, technology and construction. Preserve their indexed extensionless
URLs. The content describes the current general workspace and its limitations;
it does not promise specialist industry functionality or unconfirmed hosting plans.

`/platform/contact` and `/contact` (with optional trailing slash) permanently
redirect to `/contact.html`. New `.html` aliases and trailing slashes redirect to
the extensionless canonical URLs. No catch-all redirect is added. Update homepage
navigation/footer links and add the seven pages to the existing live sitemap.

No account code, SQL, configuration, live delegation, booking intake, payment
integration, notification settings or business publication state changes.

## Preview

https://www.faraios.com/_marketing-preview/features

Static-only isolated directory, with no application configuration or executable
application code. Every response has `X-Robots-Tag: noindex, nofollow`. Production
canonical URLs remain in the preview HTML; the preview is excluded from the live
sitemap. Account links temporarily redirect to existing live sign-in/signup pages
and retain the query string. The live homepage was read and matches its original
main source exactly after preview installation.

The preview ZIP uses 0644 static files. Its initial permissions were corrected
before successful acceptance. The ZIP contains only files beneath
`_marketing-preview/`; it cannot overwrite the root live files when extracted.
Preview page and stylesheet bytes were compared directly to the proposed source.
The preview does not execute the proposed sitemap PHP; live sitemap verification
is a post-deployment requirement.

## Verification

- `hosted-checks.json`: 27 checks passed: seven 200 pages with one H1, description,
  correct canonical, noindex response and exact source bytes; 14 canonical alias
  redirects; four contact redirects; two genuine 404s.
- `apex-checks.json`: seven non-www preview URLs permanently redirect to www while
  preserving the path.
- Browser: all seven pages at 390px have no horizontal overflow or broken images.
  Desktop Features at 1280px has no horizontal overflow. Desktop/mobile captures
  are retained alongside this file.
- `python tests/sc02-baseline.py`: eight methods passed locally. The original
  inventory needed one sitemap line-number update; no access site was added.
- Historical preservation manifest remains unchanged. `source-delta.json` lists
  exact old/new hashes for the three existing public files and nine additions.
  The baseline test verifies that bounded set and every other original file.
- Initial CI passed 30 of 31 suites; only the old baseline expectation failed.
  Corrected full CI is required before deployment.

## Production release and recovery

After owner approval and green current-head CI, merge only this repair. Review
main for concurrent changes before pulling the Plesk main repository. Verify the
seven canonical routes, 301 mappings, unknown-route 404s, no preview leakage,
styles/images, desktop/mobile navigation, existing account sign-in and public
business pages, and live sitemap XML. Confirm existing business sitemap entries
remain and the seven platform entries are present.

Keep the preview noindex. Do not submit Search Console requests as part of this
source repair without an explicit request. Google recrawling and result snippet
updates are asynchronous; no ranking or recovery-time guarantee is made.

Rollback: restore the prior `.htaccess`, `index.html` and `sitemap.php` from the
recorded base, then remove the newly added public pages and stylesheet through a
reviewed source revert. Retain evidence and preview history. No database rollback
is needed. This will return the old missing URLs to 404, so prefer a forward fix
when safe.
