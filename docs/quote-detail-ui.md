# UI-02 — Quote detail

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

- `npm run check` and `git diff --check`: PASS.
- Focused UI, SQL and HTTP checks: 49/49 PASS, no skips. Includes canonical copy and denied/unavailable manual fallback, no-charge exact values, escaped labels/evidence, local seconds/timezone, response binding, current/missing actor labels, private/public RPC allow/deny and no quote/audit writes by the reader.
- Local full suite: 129 discovered, 128 PASS, 1 explicit skip for the independent PostgreSQL-connection test because no local PostgreSQL service is configured. Exact-head CI must run that test with its PostgreSQL 17 service before merge.
- Independent QA `QA-UI02-IMPLEMENTATION-20261019` v1: PASS for the bounded implementation. Reviewer made no edits/live mutations, independently ran the same 49 focused checks, syntax and whitespace checks. Same AI tooling disclosure applies. Browser/layout/real clipboard and deployed SQL/advisors remain excluded from that local gate.
- Staging baseline before this reader: 3 quotes `d2663a1b909c4d7fc81acb57a7e5f6d2`; 2 handoffs `a32c88f2e3f38be036e09ad83c23abc6`; 12 bookings `d4bbf1b8a33c7ebaac1758c9010bcd99`; 182 audit events; 5 memberships `1fe483593e28b1f7cd383b872b2969b5`.
- Advisor baseline: 2 pre-existing RLS/no-policy INFO, 1 leaked-password-protection WARN; 6 pre-existing unindexed-FK INFO and 1 unused-index INFO. No unrelated remediation is included.

## Release and recovery gates

Apply only the reviewed additive reader to the FaraiOS **staging** project after independent implementation review. Verify office allow, staff/anonymous/foreign deny, function security/grants and unchanged baseline records through read-only calls. Run advisors again. Merge only after exact-head CI and independent review pass. Then the owner's loopback staging process must pull/restart before browser acceptance can test this runtime. Do not claim the old running app shows the new UI.

Final desktop/mobile acceptance must check both businesses' existing converted/cancelled QA quotes, current labels/precise local timestamps, top status/total/action, no-charge and service disclosures, copy/manual fallback, focus and viewport fit. Other quote states are covered by synthetic HTTP/render tests; never alter an unrelated owner-created quote for layout testing. Preserve all historical T18 evidence and keep T19 Not started. UI-02 remains open until browser acceptance and final independent QA are recorded.

Recovery: revert this bounded application's changes and, if necessary, revoke execution of the additive reader through a reviewed follow-up migration. No stored agreement or operational data rollback is needed; the reader performs no data writes. Production and foundation gates remain separate.
