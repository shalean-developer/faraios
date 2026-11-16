# V1-007 — public availability statements

16 November 2026. Owner-authorized bounded five-file release deployed and live content verified; task closure recorded below. Owner authorizes this bounded public-content release, with no merge/main change. Broader v1.0.0 remains on hold.

## Baseline and findings

- Current main: `4cea37e553edd3d6b1faae277a3286f7134c3801`.
- Foundation Plan v87 and Defect Repair Plan v38 read. Those documents still contain historical closed-gate/owner-only statements; current hosted observations take precedence for this repair.
- Open PRs inspected: #73 public SEO, #72 customer-document privacy, #71 platform owner tracker, #68 seven-file/two-function repair and #66 staff onboarding. No merge or changes to those branches.
- Candidate starts at SEO PR73 source `66ae7dc8b667a218685ef23313d9124027cdb307`. Its deployed metadata, canonical links and header corrections are preserved. PR73 deployment record confirms its public overlay. The live About metadata and Features navigation match it. A fresh hosting byte comparison is still required before installation; the installer stops on any unexpected baseline.
- Read-only managed SQL confirms live and preview booking-request, enquiry, quote and invoice ingress enabled. Global delegation gate enabled; live membership aggregates include an active Manager. Staff onboarding enabled for one live business and disabled for both synthetic preview businesses. Live delegation remains explicitly business-allowlisted. Roles are Owner, Manager, Receptionist and Worker; this is not universal availability or a new full role acceptance claim.
- Actual live published Shalean booking: Service → Details → Schedule → Contact → Review reached with fictional input. Preferred date 20 November 2026, 09:00 Africa/Johannesburg. Review says Pending confirmation / No payment now. Edit address returned to Details with input retained and no horizontal overflow. No final request submission; the dedicated draft tab was closed. No customer messages or real contact details used.
- Refreshed live overview: 7/30 verified, 18 blockers. Release on hold.

## Runtime scope: exactly five static files

`index.html`, `features.html`, `about.html`, `pricing.html`, `guides/enquiry-to-invoice.html`.

Explain eligible published business booking requests, preferred-time review, no reserved availability, invitation-based role-limited staff access for enabled businesses, and the distinction between staff records/assignments and login access. Retain prototype/free pricing, manual payment recording and confidential document links. Do not advertise online payment collection, accounting integration, automated marketing or full customer accounts.

All original href/src targets, metadata and schemas remain byte-identical to the SEO source except the walkthrough Article dateModified advancing to 16 November. No PHP, SQL, CSS, JS, intake, invitation, business publication, account, dashboard or financial changes are deployed. V1-022 and seven-file/two-function live overlays must remain untouched.

## Validation

- Native PostgreSQL17/PHP8.4 `tests/requests.py`: PASS, including request validation, request/quote conversion, lifecycle and replay behavior on disposable data.
- `tests/sc02-baseline.py`: 8 PASS, including frozen financial cases and five-step/tab draft contract. Historical manifests unchanged; exact five-file content delta appended.
- `tests/ui-only.py`: 3 PASS; original PHP logic and controls retained.
- `tests/seo-public.py`: 3 PASS; SEO historical body preservation tested against its pinned source and exact V1-007 delta checked.
- Existing `tests/booking-history-browser.cjs`: PASS all five steps, Back/Forward, refresh, custom controls, draft isolation, expiry and privacy links. Synthetic local data only.
- `tests/v1-007-browser.py`: 15 views PASS, 320/390/1280 widths across five pages; no horizontal overflow, single h1, mobile menu, in-page anchors, all prior link/asset targets and SEO heads preserved. Responsive evidence JSON included. Features mobile screenshot visually inspected. Browser automation is not physical-phone acceptance.
- PHP installer syntax PASS. Disposable installer rehearsal PASS: preflight, apply exactly five, repeated apply no-op, drift rejection; unrelated overlay/private fixture unchanged.

## Bounded release and retaining rollback

`source-delta.json` pins five original SEO hashes and five candidate hashes. CLI-only `install-public.php` contains only those payloads. Run check first, then apply only after hosting access is available and the preflight passes. It backs up originals privately, rechecks every baseline before replacement, verifies every other regular web file and original private file, and creates a private receipt. Stop on drift; do not deploy the branch or change a Git/Plesk automatic deployment target. No database action is required.

Rollback restores only backed-up five-file originals when the installed candidate hashes still match; preserve later edits, other overlays and all data. Never restore a database or deploy an older whole branch. Fresh final live GET/browser verification must precede task Verified. Update evidence and counts only after actual deployment.

## Live release — 16 November 2026

The owner explicitly authorized the signed-in hosting boundary and deployment of only PR74's five reviewed public files. Source `e959997e2fa788cbd28222223b2487f409e6217b`, tree `5b28033d730bb5a53c7b98a75147ce3cb8e64d02`; all three exact-source CI workflows passed: Foundation 43893185076, database backup regression 43893185333, private configuration recovery regression 43893185642.

Guarded preflight PASS: all five installed originals match the reviewed SEO hashes. Earlier seven-file runtime overlay matches its private manifest; V1-022 live quote hash remains `f26cc02d4101d38c860c3f4bc0476a62d80114782b9df6462d1afa0d19de922c`. Installed exactly five static payloads at 15:23:29 UTC / 17:23:29 Johannesburg. Receipt `applied_PASS`: every other regular web file and original private file preserved, no database writes. Private rollback/receipts retained under `v1-007-20261116-152328-594951`.

The first long-command notification remained visually marked Running, although the short diagnostic/check command proved the staged source exists, lock is free and exact preflight passes in zero seconds. No blind application retry occurred. The short guarded application ran once and completed in one second with the expected receipt.

Final hosted verification: five canonical URLs HTTP200 and exact candidate SHA256; 22 distinct existing link/asset targets HTTP200 with zero failures. Chrome mobile390 and desktop1280 across all five pages: one h1 each, no overflow, request wording present, no stale intake-disabled/owner-only wording. Mobile navigation opens. Existing SEO heads/canonical links remain as reviewed. These responsive checks do not claim separate physical-phone acceptance or complete whole-product role assurance.

The temporary unsaved hosting form was cancelled. Four original schedules remain unchanged. No Git deployment target, main, SQL, account/dashboard code, legitimate access/invitation, financial/document history, private config, intake setting or business publication was changed. Earlier hosting access rejection was resolved by the owner's explicit boundary authorization. Broader v1.0.0 launch remains on hold.

Post-release live mobile booking preservation: Service → Details → Schedule → Contact → Review completed at390px with only fictional example.test contact data. Preferred20 November09:00 Johannesburg, expected Office Cleaning estimate and Pending confirmation/No payment now shown; no final request submission. The transient test tab was closed and viewport reset.

V1-007 saved as Verified with all three acceptance items checked, evidence and PR74 link. Fresh overview after concurrent SEO progress: **11/30 verified, 17 open blockers**, launch still on hold. These are observed overview counts, not all attributable to this one repair.
