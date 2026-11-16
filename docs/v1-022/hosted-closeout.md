# V1-022 hosted closeout — 16 November 2026

Owner authorized installation, hosted verification and task closure in this conversation. No merge/main change or broader v1.0.0 launch is authorized.

The reviewed two private functions and original quote page payload were installed after fresh encrypted backup43882549999 and isolated restore43883575323 passed. Hosting preflight verified original quote bytes, all seven previous repair hashes and private configuration; only quote/index.php changed among1160 web files. Database comparison: only quote_private.customer/invoice_private.customer definitions changed; all function ACLs and RLS policies unchanged. Ten business/customer/document/financial/staff/membership/publication tables retained exact original row fingerprints. Supabase recorded the bounded DDL through its migration receipt, v1022_customer_document_privacy; no application table/history migration occurred.

Hosted anonymous REST verification passed99 checks against nine pre-existing synthetic documents: exact projections, wrong environment, invalid/altered/UUID tokens and private-table denial. Existing A/B onboarding and delegated access remained closed.

Two new dedicated A/preview quotes were created for guest action testing:6434b33a-e719-49ee-84b5-9987a08783fc (Accept),7e8e6913-5da9-431b-b38b-c8bc4a9a12de (Decline). No messages, invitations, invoices, payments or booking/intake/publication changes. Initial fixture cloning picked a historical synthetic sender containing only time_zone; corrected only these two new Sent/version1 fixture sender snapshots to complete fictional sender details. Historical fixtures were not changed.

## Hosted-discovered quote response repair

Actual mobile-browser Accept failed despite confirmation, with no state/version change. Reproduced in the real local Chromium/PHP journey: no-referrer form navigation sends Origin:null. The common CSRF check rejects that origin. This predates V1-022's unconditional header because enabled foundation guest pages already used no-referrer.

Bounded follow-up changes only the same quote entry page. For Origin:null, require browser Sec-Fetch-Site:same-origin, the exact session CSRF token, a scalar token and the existing8192-byte body limit. Reject missing/cross-site/same-site Fetch Metadata, foreign origins and invalid tokens. Ordinary origins retain the existing csrf() check. No shared core/session/role/policy/cookie changes; no-referrer, CSP and confirmation retained.

Expanded local regression PASS: actual confirmed browser POST now accepts its synthetic quote; previously it failed. Negative Origin:null requests without same-origin metadata, cross-site/same-site metadata, forged foreign origin and invalid token all fail without mutation. Five privacy methods including browser PASS; eight preservation checks and three UI-preservation checks PASS. Exact updated PHP hashes are in scope.json and separately pinned preservation/logic deltas. SQL payload is unchanged. Candidate CI and hosted recheck remain pending at this checkpoint; do not record acceptance early.

Preview and live need the identical corrected quote entry-page bytes to verify the guest action end-to-end using preview-only synthetic capabilities. Keep all other runtime/configuration files and existing history untouched. No access/onboarding reopening is required.
