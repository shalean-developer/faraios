# D01–D06 hosted preview — 16 November 2026

## Phone acceptance follow-up — customer navigation

The owner entered synthetic A's Manager workspace on a physical phone and reported one long customer page with no Next at the bottom. **D01 phone acceptance failed at this step.** The original navigation was only above the50-row list, so reaching the end did not offer a next-page action. Earlier API/local-browser passes did not cover that usability requirement.

The fix requests10 customers per page in the PHP UI, adds a second **Record pages end** navigation after the last card, states the number of records on the current page, and uses the existing secondary-button style. Other resource/staff page sizes and all SQL functions, roles, session/revocation controls and data remain unchanged. No new CSS/runtime dependency or dashboard.

Meaningful regression: parse a rendered customer list and require10 cards, a bottom navigation after the last card, follow its next-page link and prove10 different customer IDs. The optional390/1280 browser run scrolls to the bottom, checks44px+ touch targets, clicks bottom Next, bottom Previous and top Next, with no horizontal overflow. Canonical8 methods including browser PASS; preview alias10 native methods PASS; full37 suites /125 reported tests PASS. Phone acceptance needs the owner's retry after refreshing.

A fresh hosted hash check matched the original preview before replacement. Only `_accounts-preview/account/delegated.php` was atomically replaced, with original bytes retained privately. Before/after full1,053-file maps and original private configuration are checked by `phone-navigation.php`; no database DDL or business-record mutation is performed. A separate real PHP session verifies pages1–3 contain10 distinct customers each, navigation after the last card, and returning to Page2. The earlier494-assertion closeout is retained as historical evidence; current hashes and follow-up receipts are in `d01-d06-preview-scope.json`.

The owner initially used a live-only account; that account's permissions were not changed. The registered synthetic Manager alone was reopened for this phone acceptance window. Receptionist/worker remain closed. Revoke the Manager after acceptance, cancellation or handoff closeout; preserve live access and all synthetic financial/audit history. The prepared worker-join patch remains separate.


## Original hosted verification before phone follow-up

**Preview verification passed; physical-phone acceptance and live authorization remain open.** Draft PR68 remains stacked on PR66. Application source is a4db8705e4640f78657490d69d42d42f7d5e35bb. The later operational overlay changes only RPC names and adds stronger preview guards; no new product behaviour is introduced. Main remains c75377d2e2adfdf6c173c0ad750687d80e6138b7 and PR66 remains d5f6f6c2c9c4e917253d5239ea40be78386f791b.

## Installed scope

Fresh installed PHP: **8.2.35**; database PostgreSQL17.11, UTC. Both original live/preview PHP files matched the recorded baseline before installation. Encrypted backup [43807738972](https://github.com/shalean-developer/faraios/actions/runs/43807738972) and isolated restore [43808033751](https://github.com/shalean-developer/faraios/actions/runs/43808033751) passed before function installation. Configuration import, Auth rehearsal and other optional restore actions were left disabled.

Preview and live share a database. Therefore the canonical public command was **not replaced**. `preview.py` generates two copied RPCs with an additional early guard requiring `preview` and one of the two registered business IDs. Each then runs the unchanged candidate authorization/operation body. Execute is revoked from PUBLIC/anon/service_role and granted only to authenticated; active membership, matching headers and existing role/session/revocation controls still apply. Direct live, foreign-business, missing-header and anonymous calls were rejected. The original public command MD5 remains `2c2aeb980f2b7cf6e3be2d0410551020` and the canonical new page API remains uninstalled.

Only `_accounts-preview/account/core.php` and `_accounts-preview/account/delegated.php` changed. The delegated RPC helper maps the two names; core adds the aliases to the same bounded error handler. Generated source hashes and exact function names are in `d01-d06-preview-scope.json`. Two complete checks of1,053 web files found exactly those changes. Original private configuration and fixture files, live files and installed worker-join files are unchanged. Presence of some older join files is **not** evidence that PR66's prepared three-file worker-join patch is hosted; no join payload was installed in this batch.

## Hosted evidence

Only registered synthetic preview A `2f16e658-e031-4c4a-930a-2731ec1d1492` and B `4627f805-8243-4890-bf18-a14fdf3fd21b` were eligible. Existing fixture accounts, memberships, worker links, staff state and catalogue were inspected first. Five registered reserved@example.test accounts authenticated through real Supabase Auth. Three previously inactive A delegates were enabled temporarily; B's delegate remained inactive. No invitations were created, accepted or changed.

New A fixtures:105 customers,105 staff,105 scheduled assigned bookings, two accepted quotes, two scheduled quote bookings, two issued invoices, one synthetic1000-minor-unit payment and four new time-off requests. Fixtures remain as test history; **do not replay setup**. Manager/receptionist/worker PHP cookie jars and Auth tokens are separate, private,0600, and never printed. The existing fixture credential/token files were not overwritten.

| Check | Hosted result |
|---|---|
| D01 | Three pages, bounded50-row responses, >100 distinct customers for manager/receptionist and >100 assigned worker visits; worker field allowlist and receptionist staff projection retained. Page1→3 assignment saves preserve off-page staff; stale save is atomic. |
| D02 | Real worker requests interpreted in A's current server-selected zone:09:00 local becomes09:00 UTC,07:00 Johannesburg,08:00 London summer,09:00 London winter. Skipped/repeated London times fail with no inserted request. A's zone was restored to Johannesburg. No historic request adjustment. |
| D03 | Real hosted PHP validation/stale customer and staff errors retain values, forms and original version. Retained sessions lose protected forms and API access immediately after membership revocation. No automatic retry added. Connection-fault/no-replay injection remains local-only evidence. |
| D04 | Manager/receptionist hosted PHP schedule accepted quote→open exact invoice→issue. Stale selection rejects and retains input. Quote selection controls and removed UUID prompts checked in HTML; full interactive selection proven by local browser tests. |
| D05 | New synthetic staff profile edit succeeds; stale overwrite retains input; receptionist command denied. Existing linked staff, identity and invitation controls unchanged. |
| D06 | Required reference HTML constraints; blank/space/short/long/control input retains amount and submission ID. Two identical HTTP submissions produce exactly one1000-minor-unit ledger row. Overpayment denied. No money transferred. |

Private closeout contains14 completed phases and494 recorded assertions, including HTTP/receipt checks; these are not494 independent scenarios. Receipt SHA256 `b52045016d0d7c395c1a4baf039aef1d228ea5fb7d93d7c0627f82105da6150d`. See private `defect-preview-20261116/closeout.json`. Owner-authenticated existing revoke API closed all three test memberships; the same PHP cookie jars and JWTs then failed protected access. **Zero active synthetic delegates at close.** Original gate stays true for legitimate live use.

Before/after fingerprints match for all non-synthetic businesses, customers, quotes, bookings, invoices, payments, staff, published pages and catalogues, and all legitimate live memberships/manual invitations/staff invitations. Supabase advisors retain their baseline notices plus two intentional authenticated SECURITY DEFINER copies; there is no anonymous/service_role execute grant. No security setting was weakened or plan upgraded.

## Local gate and remaining acceptance

Expanded Foundation:37 suites /123 reported tests PASS. Preview transport runs nine repair/boundary methods; optional browser run adds manager/receptionist workflows at390/1280, ten methods PASS,16 measured workflow states without overflow. PHP8.4.27/PostgreSQL17.11 local; hosted PHP8.2.35. These browser screenshots are local simulated Auth/REST evidence, not a physical phone or authenticated hosted browser acceptance.

The currently signed-in user browser reaches Create business and has no registered synthetic context. Do not create a business or grant that account access. Phone acceptance needs a registered synthetic test login, with its scoped delegate temporarily reactivated only while the owner is present, then revoked again. Do not put credentials in chat or screenshots.

Phone acceptance should cover page1→3→Previous and saved assignment retention; time-off zone label and a safe request; recoverable validation/stale input with explicit review; accepted quote→booking→exact invoice; manager staff edit; reference-required payment and repeat submission; immediate revocation. Check menu, keyboard, scrolling and absence of horizontal clipping on the actual phone. No new invitation/join flow is included.

## Release and rollback

Live remains **not deployed**. Its exact proposed payload is still the canonical two PHP files in `d01-d06-scope.json`, cumulative `docs/sc04/defect-repairs.sql` command/page changes, with current live baselines rechecked immediately before separately authorized release. Do not install the preview aliases/adapter into live. Worker-join rollout is separate and remains pending. No merge, main change, customer message, intake change, republication or new dashboard.

Preview rollback: revoke/close only synthetic delegates, atomically restore the two private `before-core.php`/`before-delegated.php` originals after verifying installed hashes, then revoke/drop only the two `_preview_d0106` RPCs after confirming no remaining caller. Preserve synthetic business/financial/audit history and all real records. No data restore or deletion is part of this rollback. The private files live under `private/faraios-account/defect-preview-20261116`; no persistent scheduler job was created.
