# F05/F06 — release gate and recovery readiness

14 November 2026. Based on PR #36 final source 51a0fa1fc6d70fd3e95a52a29813ac5078be61ad. Scope authorized by Proceed after F04: F05 regression/release coverage and F06 safe recovery/operational preparation. Preview only, no main merge or live activation.

F05 now runs one fail-closed offline application gate (tests/release-checks.py): 23 suites / 29 Python test methods plus PHP template/dispatcher assertions, including owner registration/confirmation/recovery/session expiration, native tenant permissions, drafts/publication, booking gates, full cross-industry enquiry→quote→booking→invoice/payment flow, financial corrections/concurrency, customer confidential-link access, notification retry/denial, backend outage recovery, event privacy and logical backup restoration. Auth/REST/provider transports are simulated locally; database functions and RLS run natively, PHP handlers run over real HTTP. CI records source, dirty state, runtime versions, per-suite outcomes/logs and restore evidence; any failure/timeout fails the gate. Native local PG17 PASS; GitHub PG16 latest-head proof pending. No hosted provider dispatch or credentials in test inputs/artifacts.

F06: full synthetic database dump restored into a new disposable target; 32 table fingerprints and effective security invariants match. Corrected invoices/payments/counters survive and fresh numbering continues. No source DB overwrite or hosted restore. This does not prove provider Auth/session/private-config recovery. Detailed runbook and observed backup/worker inventory: docs/recovery-operations-runbook.md. Local trace: docs/evidence/release-recovery-local.json.

Preview observability adds fixed-schema, content-free upstream/workflow/fatal events and a CLI aggregate checker with honest unknown/quiet states. No live logging activation, scheduling or outgoing alerts. No schema, auth/grant/configuration, published content, five-step booking or business-record change.

Important audited blocker: Supabase faraios-new Free dashboard explicitly has no project backups. Plesk JetBackup shows 8 hosting snapshots, not external database recovery proof. F06 cannot be marked complete: backup arrangement, actual hosted recovery rehearsal and operator/alert/log-sink verification still need resolution. Do not buy or restore anything under this delivery.

Hosted preview deployment/unchanged-journey smoke checks and latest-head CI pending. Production remains gated. Rollback application to PR #36; no data migration/rollback needed.
