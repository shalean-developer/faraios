# Dashboard production release — 13 November 2026

Owner reviewed the authenticated isolated preview and explicitly instructed Deploy. Release includes PR #13 dashboard plus a narrow follow-up migration enabling private manual enquiry intake for live/preview only when the existing enquiry ingress gate is enabled. Explicit owner/nonanonymous checks, field validation, idempotency, restricted grants and lack of direct DML remain unchanged. Existing accounts, records, public pages, homepage and waitlist must be preserved.

Final release test: native disposable PostgreSQL 17 + actual PHP intake successfully creates a live enquiry, retains idempotency, rejects invalid environment/foreign owners/anonymous callers, and rejects live intake when ingress is disabled. Hosted probes use preview rollback fixtures only; no fictional production records are authorized.

No notifications, Resend access, integrations, real money movement or waitlist webhook/recovery checks. Deployment/verification evidence will be appended after release. Rollback: restore PR #12 application; replace enquiry_private.manual_create with the preview-only implementation from migration 20261113143833 if manual intake must be disabled without affecting public enquiries. Retain all records and counters.
