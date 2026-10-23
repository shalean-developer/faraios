# Independent operational MVP history QA — 23 October 2026

Decision: **PASS for bounded local synthetic implementation acceptance; NO-GO for release, merge, deployed acceptance or financial activation.**

Reviewer: separate Codex agent `/root/independent_qa`. The reviewer inspected the existing main implementation before the change, reviewed the new runtime and test source, and independently executed the focused regression. The reviewer did not implement or alter application/test code. Shared host and AI tooling are disclosed; this is not external human assurance or a formal GitHub approval.

## Reviewed scope and identity

Baseline: origin/main `651490e8b1e2ecd1815598d3aad7f1ebacaa3353`. Branch: `codex/operational-mvp-history`. Review occurred before the implementation commit; these exact SHA256 file identities bind the opinion:

| File | SHA256 |
|---|---|
| src/customer-booking-history.js | 1D9CBD80BDDD7EFFB1EF4F61FA158452188FF849DA7AEB25B89B6022A907AA09 |
| src/staging-server.js | 6C54451B01E9D397CE39E2A2D66F8D1BB024B1D3EEBBAF693F13D80B6F912413 |
| test/customer-booking-history.test.js | FD2FE1988B111876679B5C65DF6C8BDFC50E99E927C14FB36D3EA0208357824A |

The missing feature was independently confirmed: customer details previously contained contact/address editors; global booking search matched names only after the business-wide cap. The existing customer parameter opens creation. The new history query filters by both business and customer before its limit, avoiding same-name identity inference and omission caused by unrelated customers.

## Source review

No material finding remains. The GET route reuses server-verified membership and customer lookup, rejects unavailable/foreign records before history access, and retains owner/manager-only office access. Staff/customer portal access is not added. Inactive customers retain history. The helper independently rejects mixed business/customer result rows and query errors; database RLS remains authoritative. Results sort by scheduled start descending and ID descending, with a 201-row sentinel and explicit latest-200 notice. Rendering escapes snapshot service names, time zones and statuses and builds business-scoped detail links. Upcoming, completed and cancelled records are explicitly included. No application writes, new migration, policy, provider action or unmerged branch dependency is introduced.

## Independently executed checks

Environment: Windows, Node v24.14.1 (`C:/nvm4w/nodejs/node.exe`), local loopback HTTP, disposable in-memory PGlite. Command:

```text
node --test --test-concurrency=1 test/customer-booking-history.test.js test/staging-server.test.js test/customers.test.js test/bookings.test.js
```

Observed exit 0: 55 tests, 55 passed, 0 failed, 0 skipped, 0 cancelled; total reported duration 14855.5329 ms. The reviewer observed the complete tool output. This report records the independent command/result, not a separately retained raw terminal transcript. Engineering's separately retained test logs are additional evidence.

New integration coverage includes two synthetic businesses named Shalean and Bokkie; explicit owner, separate managers and explicitly shared staff memberships; database-enforced creation and progression through Completed for each business; actual local HTTP customer-history reads backed by PostgreSQL RLS; owner switching; manager own-business access and foreign-business denial despite `role=owner`; mixed customer/business 404; shared-staff and membershipless identity denial; anonymous redirect and database permission denial; suspension revalidation; query failure; inactive/empty customers; and two same-name customers in one business with 201 unrelated visits. Read queries leave audit counts unchanged, with the deliberate membership suspension counted separately. Unit coverage checks mixed-scope results, escaping and truncation wording. Existing focused tests exercise customer/booking HTTP workflows, RLS, immutable snapshots, versions and audit.

## Evidence limits and acceptance boundaries

- The new integrated lifecycle creates/transitions records through authenticated SQL, then tests history through actual HTTP. It does not claim the full creation-to-completion journey ran through a browser or through HTTP against the real database. Existing booking HTTP tests use their existing mocked data provider.
- Auth is synthetic and the read-query adapter maps the application's query contract to PGlite. This is actual PostgreSQL RLS enforcement through local HTTP, not hosted Supabase Auth, PostgREST, deployed RLS or provider JWT acceptance.
- The new integration loads the six original identity/audit/settings/catalogue/customer/booking SQL drafts. It does not reproduce every subsequent migration, concurrent native PostgreSQL sessions, workload reservation or hosted data configuration. The runtime change is read-only against existing columns/policies.
- Browser desktop/mobile and deployed acceptance of the new panel remain unrun by this reviewer. The code renders existing layout components; no visual PASS is inferred from HTML assertions.
- No full-suite, hosted CI, security-scanner, live service, financial, staging or production run was executed by this reviewer. Separate results must retain their provenance and limitations.
- This opinion applies to the exact files above. Material runtime/test/schema/access changes require reassessment. Publication as a Draft PR is review preparation, not merge permission.

## Historical assessment cross-check

The baseline operational work should be retained. T14's final approved setup and PASS supersede its earlier conditional paragraphs; T17 and T18 have bounded staging acceptance. The T08–T10 closeout explicitly records manager 31/31 and shared-staff 35/35 PASS with cleanup, while lower pending sections are history. These reports are reviewed historical evidence, not fresh replay.

Separately inspected T19/PR103 evidence summaries preserve these distinctions: Stage B local semantic test-body coverage passed, with Linux 296/297 and dedicated native 26/26 covering the explicit skip, Windows 110/110, and separately composed TLS/offline transport coverage after a retained adapter failure. Security and hosted execution remain separate. PR103 corrected prospective cleanup passed, while two of four historical ownership mappings remain unverified; the earlier wrapper exit127 remains overall FAIL despite passing internal assertions. Incidents 38407534 and 38892014 are distinct. A Docker metadata classification or source correction does not itself turn a failed GitGuardian check into success, approve a CI exception or authorize merge.
