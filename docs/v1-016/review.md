# V1-016 presentation repair review — 17 November 2026

Status: candidate, not installed; V1-016 In progress, none of its three original criteria newly accepted. Launch HOLD, 22/30 Verified, 6 blockers. Preserve PR70 header and PR68/V1-002 partial phone acceptance.

## Demonstrated defects and repair

1. Hosted dummy email-token rejection shows the invalid/expired/used error with Your link is ready and enabled Continue. Focus returns to BODY. This corroborates V1-002 actual-expiry phone evidence. account.js now prioritizes server error, removes the failed confirmation form and displays recovery guidance. Fresh links remain deliberate, fragments cleared, upstream email-change behavior retained.
2. Hosted new quote with synthetic name and no contact rejects without saving, retains name, but focus returns to BODY. New error-focus.js focuses the first workspace server alert. It is loaded once through the shared layout.
3. Public assets return max-age=604800. Auth index uses a new account.js query version; layout loads a new asset URL. No reliance on users clearing seven-day caches.

## Exact candidate

Only four runtime paths in release-scope.json: account/account.js, account/error-focus.js (new), account/index.php and account/layout.php. Canonical PHP candidates derive from V1-017 captured installed bytes, retaining its join/access overlays. Source-root PHP edits are minimal integration changes for future source reconciliation; never deploy the whole branch or replace live PHP with source-root copies. Runtime candidates live under docs/v1-016/runtime.

Fresh public account.js SHA matches 6a58a1cc69653813c0d0ed21d8363f487601dda29a947108c986d6b6f97408af. Fresh public layout.js matches cfecbbb3f40ad25c35975e5af5a17f6c33e3c6b65a2e0f24d890cfacf1e09a3a and remains UNCHANGED. Private index/layout hashes in manifest are historical V1-017 captures, not a new server reading. Mandatory immediate preflight: hash current private PHP and JS and require exact manifest preimages/new-path absence; stop on any drift. Retain private originals and full web census. Install helper asset before PHP hook, and account.js before its versioned reference. Verify exact served assets and changed references; compare all non-target files. Rollback only these preimages/new helper after candidate-hash guards; never restore data or overwrite later edits. No database/configuration/permission changes.

## Validation

PASS: eight auth-link DOM-unit states; workspace error/no-error DOM-unit states; six native account tests; original isolated full journey; three candidate-on-installed-runtime tests (cache/hooks and rejected quote retaining name, owner scheduling/stale assignment retention, independent ZA request to paid and correction history). PHP candidate syntax and diff whitespace pass. First account run failed from missing local shared-library path; corrected environment passed all six. No CI, candidate browser or new physical-phone pass claimed.

Hosted four-width page overflow observations PASS at actual 320/390/768/1280: dashboard; requests/quotes/bookings/invoices lists; new invoice, new booking, new quote; service form with added extra; profile editor; unpublished website preview; completed booking/assignment; linked invoice draft; void invoice/payment history; booked request; customer accepted quote; new staff form. Form-label scans on checked forms found no unlabelled visible inputs. Empty invoice/booking/service/staff submissions focus name; service Add room or extra by Enter focuses option_name_2. At 320 dashboard menu opens by Enter, focuses Close menu, traps background through inert, closes with Escape and restores Menu focus. Main booking/assignment buttons measure 50px high. These checks are not full keyboard/touch/visual acceptance of every state.

An initial staff width loop measured 1280 four times because another tab held the viewport; discarded and repeated after closing that tab, actual widths verified. A subsequent Access/tablet-menu batch stalled and returned no evidence, so is not counted. Browser connection then reset/stalled during recovery. Viewport reset and tracker continuation must be verified after reconnecting.

Scheduling settings unavailable in this pilot is expected: authoritative V1-009 closeout explicitly disabled policy and rollout after acceptance. Preserve that closure. Pilot website remains unpublished and worker inactive. Do not reopen rollout or publish automatically.

## Still required

Fresh private runtime preimages and review; candidate browser confirmation/rejection/error-focus checks; active guest intake, pending quote acceptance, active manual payment form and availability UI at four widths in a controlled fixture; comprehensive keyboard/touch/visibility checks and actual-phone acceptance. Current retained hosted records are terminal states, not fresh active-form proof. No original criterion weakened. No customer messages, financial record mutations, publication, deployment, merge or main changes during this audit.

## CI continuation — 17 November 2026

PR82 first CI found two stale expectations: SC-02 preservation hashes omitted the bounded repair, and the auth regression expected the previous script cache version. Preserve the historical manifests; add a chained source delta limited to the four source files and the new dedicated V1-016 CI workflow. The exact cache version assertion now matches the reviewed release. Existing frozen foundation workflow and release runner remain byte-for-byte unchanged. The dedicated workflow runs both JavaScript regressions and all three candidate-runtime tests. No deployable bytes changed in this continuation.

Additional hosted checks: Access and Staff access have no horizontal overflow at actual 320/390/768/1280. Access inputs are labelled and at least48px high; empty invitation submission focuses recipient without creating access. Dashboard menu Enter/ Escape opens to Close menu and returns focus to Menu at390 and768. Physical-device coverage remains pending. Current synthetic business session cannot edit the platform tracker; platform-owner sign-in is required. Viewport reset confirmed.
