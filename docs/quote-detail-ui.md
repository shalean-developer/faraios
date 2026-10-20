# UI-02 — Quote detail

20 October follow-up status: browser checks are partial; final acceptance remains open for the small corrections and real host clipboard confirmation described below.

20 October06:40SAST follow-up: after the owner restarted PR64, both businesses show12px action spacing and the44px primary action ends at573.5px in document coordinates, within the575px desktop viewport. Bokkie's displayed locality still repeats because one saved component contains a non-breaking space while its neighbour uses an ordinary space. The follow-up collapses Unicode whitespace in display components before comparing them; the regression includes U+00A0 and U+202F, repeated spaces, and unchanged source text. This is presentation only; no stored address, agreement, invoice or financial state is changed. Corrected address runtime acceptance and exact host clipboard contents remain open. T19's actual isolated Zoho setup/reconciliation remains a separate open gate.

19 October 2026. Engineering owner: Codex. Authority: the owner's “fix them” instruction after the eight-defect quote-detail review. Baseline main `3b3ddb1297031b5751d887c804f67c4a4c5962f1`, tree `dac50670f4a70e074ada1e2011ea283ca27e233f`. This is a bounded follow-up to completed T18, before unstarted T19. Status: implementation independently reviewed; exact-head CI, staging reader verification and final browser acceptance are release gates below.

## Scope and traceability

| Verified defect | Implemented correction | Required acceptance |
|---|---|---|
| Cancelled booking and invoicing review buried | Quote and current linked booking badges plus invoicing review at the top | Existing converted/cancelled QA quotes in both businesses |
| Total and primary action below the fold | Compact summary with saved total and immediate Open booking or state-appropriate action link | Desktop and 390px mobile summary visibility |
| Tall price paragraphs | Semantic Item / Qty / Rate / Amount table; mobile quantity/rate beneath each item | Read amounts and units without horizontal overflow |
| Zero-charge clutter | Native No-charge details disclosure retains every saved quantity/rate/amount; opens if all items are free | Zero-quantity rows are not described as included |
| Low-contrast muted detail text | Detail text uses #52685f against white; scoped to quote detail | Computed styles, normal-text contrast and focus visibility |
| Generic actor/date-only acceptance | Current recorded-account label, exact local timestamp/timezone, immutable actor ID disclosure | Fallback retains actor ID/time; office access only |
| Long reference with no copy | Abbreviated display reference plus full canonical UUID copy and script-free manual disclosure | Clipboard success/denial fallback and keyboard operation |
| Adjacent duplicate locality | Trim and suppress adjacent equal address components for display | Saved snapshot remains byte-for-byte unchanged |

The abbreviated UUID is a display aid, not a new quote numbering policy. Saved service details remain available in a native disclosure. Email/phone use their saved snapshot values. Quote state transitions, immutable agreement, price calculations, conversion, uniqueness and handoffs are unchanged. Cancelled booking review is informational, not an invoice decision or payment record.

## Narrow acceptance-account reader

`database/quote-acceptance-actor-draft.sql` adds one read-only RPC for a single quote. The public SECURITY INVOKER wrapper calls a private SECURITY DEFINER implementation with an empty search path. Both explicitly revoke PUBLIC/anonymous execution and grant authenticated execution. The implementation checks `audit.quote_access` before selecting the business-scoped quote, then resolves only its saved `accepted_by` through that business's membership and profile/account label. It accepts no actor ID and exposes no directory or Auth table grant. No table, RLS, state-write or membership change is included.

The resolved label is explicitly current, not frozen acceptance history. A historical actor's subsequent role/status change does not rewrite the quote. Missing membership/label or a temporary RPC problem displays “Account label unavailable” while preserving recorded UUID and timestamp. Denied caller access and mismatched business/quote/actor responses fail closed. The actor's label does not authorise the caller.

## Verification record

- 20 October owner-restarted browser check at remote main `9e415c34b6a4cc65939099ebc066da0f4b1f9003`: both saved converted/cancelled test quotes show current cancellation/review state, exact R875/R410 totals and Open booking together. Mobile390×844: primary action615.8–659.8px, page width375 with no overflow; price tables305.3px wide. Shalean desktop1265×631: primary action bottom579.5px, fully visible. Bokkie short desktop1265×575 clips its final4.5px; follow-up reduces action top margin18→12px while preserving44px target height. Runtime recheck of that correction remains pending.
- Both no-charge disclosures retain exact saved quantities/rates/amounts (Shalean2 rows, Bokkie3); actor current label, historical UUID disclosure, exact local seconds/timezone and test approval evidence render. Shalean acceptance22:38:33 and Bokkie22:31:37 on19Oct2026, Africa/Johannesburg. Scoped text colour read back as #52685f. Full reference opens with keyboard and allows selection of all36 canonical UUID characters.
- Copy button reports Reference copied, but the automation clipboard read returned empty and a real UI paste attempt was rejected by the tool: “Browser Use virtual clipboard has no data to paste.” Exact host clipboard contents are **unassessed**, not a reproduced application failure. Isolated copy/denial tests pass. Owner host Copy→paste confirmation remains necessary for final acceptance.
- Bokkie's street field itself ends in Century City, followed by the same suburb. Whole-field deduplication missed that boundary; the follow-up splits comma-separated display components before suppressing adjacent equal values. Nonadjacent repeats and stored snapshots remain unchanged. Independent local correction QA PASS (5/5 quote tests initially,52/52 combined focused checks after all corrections); exact-candidate CI and owner pull/restart/recheck remain gates. No quote or booking data was changed by UI checks. Both temporary viewport overrides were reset and verified1280×575.

- `npm run check` and `git diff --check`: PASS.
- Focused UI, SQL and HTTP checks: 49/49 PASS, no skips. Includes canonical copy and denied/unavailable manual fallback, no-charge exact values, escaped labels/evidence, local seconds/timezone, response binding, current/missing actor labels, private/public RPC allow/deny and no quote/audit writes by the reader.
- Local full suite: 129 discovered, 128 PASS, 1 explicit skip for the independent PostgreSQL-connection test because no local PostgreSQL service is configured. Exact-head CI must run that test with its PostgreSQL 17 service before merge.
- Independent QA `QA-UI02-IMPLEMENTATION-20261019` v1: PASS for the bounded implementation. Reviewer made no edits/live mutations, independently ran the same 49 focused checks, syntax and whitespace checks. Same AI tooling disclosure applies. Browser/layout/real clipboard and deployed SQL/advisors remain excluded from that local gate.
- Staging baseline before this reader: 3 quotes `d2663a1b909c4d7fc81acb57a7e5f6d2`; 2 handoffs `a32c88f2e3f38be036e09ad83c23abc6`; 12 bookings `d4bbf1b8a33c7ebaac1758c9010bcd99`; 182 audit events; 5 memberships `1fe483593e28b1f7cd383b872b2969b5`.
- Advisor baseline: 2 pre-existing RLS/no-policy INFO, 1 leaked-password-protection WARN; 6 pre-existing unindexed-FK INFO and 1 unused-index INFO. No unrelated remediation is included.

## Release and recovery gates

Apply only the reviewed additive reader to the FaraiOS **staging** project after independent implementation review. Verify office allow, staff/anonymous/foreign deny, function security/grants and unchanged baseline records through read-only calls. Run advisors again. Merge only after exact-head CI and independent review pass. Then the owner's loopback staging process must pull/restart before browser acceptance can test this runtime. Do not claim the old running app shows the new UI.

Final desktop/mobile acceptance must check both businesses' existing converted/cancelled QA quotes, current labels/precise local timestamps, top status/total/action, no-charge and service disclosures, copy/manual fallback, focus and viewport fit. Other quote states are covered by synthetic HTTP/render tests; never alter an unrelated owner-created quote for layout testing. Preserve all historical T18 evidence; T19 progress is tracked separately in its accounting record. UI-02 remains open until browser acceptance and final independent QA are recorded.

Recovery: revert this bounded application's changes and, if necessary, revoke execution of the additive reader through a reviewed follow-up migration. No stored agreement or operational data rollback is needed; the reader performs no data writes. Production and foundation gates remain separate.
