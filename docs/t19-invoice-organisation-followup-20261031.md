# T19 invoice organisation verification follow-up — 31 October 2026

Status: prepared locally; not deployed. T19 remains In progress. Canonical tracker verified T19 In progress / T20 Not started on this date.

The connection path already verifies the pinned organisation using the Books organisation list. The reusable invoice adapter still requested the detailed organisation endpoint that returned 403 during staging onboarding. This bounded correction aligns invoice preflight with the list endpoint. It preserves independent credential pins, business/environment checks, draft-only creation, durable dispatch hooks, reconciliation and receipt validation. It requires exactly one active ZAR match and refuses incomplete or ambiguous results before customer lookup or invoice writes. No acceptance criterion changes.

Validation: 44/44 focused tests passed, zero skipped, covering the adapter and standard connection, HTTP handler, private setup and isolated SQL storage tests. Added rejection cases for missing, foreign, duplicate, inactive, unverified-active, wrong-currency and incomplete organisation results, plus selection when the correct organisation is not first. These are isolated tests, not provider acceptance.

Rollback: revert only the adapter and its test change. No migration, credential change, worker activation or provider financial write is part of this increment.

Still required: publish a bounded PR against freshly verified staging; verify deployed fingerprint; safe disconnect/reconnect and refresh after restart; adapt and verify the background execution path; prepare one explicitly approved synthetic draft; prove interruption/retry reconciliation; independently enrol Bokkie; finish operating instructions and owner staging acceptance. Do not enable invoice syncing on the strength of this patch.
