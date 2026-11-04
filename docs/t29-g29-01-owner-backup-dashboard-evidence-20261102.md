# T29 G29-01 — Owner-supplied backup dashboard evidence, 2026-11-02

Evidence scope: owner uploaded Shalean production Database > Backups screenshot and stated Bokkie is on Supabase Free. This note records only non-sensitive metadata; screenshot/private contents are not committed.

## Shalean
The owner screenshot displays the Shalean Production Pro project, scheduled physical backups, and Restore controls for eight dates:
- 2026-11-02 07:31:35 UTC
- 2026-11-01 07:32:45 UTC
- 2026-10-31 07:32:03 UTC
- 2026-10-30 07:31:30 UTC
- 2026-10-29 07:31:29 UTC
- 2026-10-28 07:31:38 UTC
- 2026-10-27 07:32:43 UTC
- 2026-10-26 07:28:11 UTC

**Verified:** owner-visible physical backup listing with restore UI. **NOT VERIFIED:** test restore to an isolated target; contents/digest, associated objects, permissions/keys, restore duration, or consistent recovery point for application data. Do not click Restore on production.

Dashboard also displays an outstanding-invoices banner warning of potential service disruption. Record this as operational/billing follow-up only; no payment or account action is authorised.

## Bokkie
Owner reports Bokkie on Free plan with no managed backups. Supabase official docs (updated 2026-10-29; https://supabase.com/docs/guides/platform/backups and https://supabase.com/kb/faqs/platform/free-plan-backups) confirm Free does not include automatic daily backups and recommends manual CLI logical exports retained off-site. This is a **method option**, not evidence an actual export exists. Bokkie source project `scsrxogumimsrtbnqeas` remains unavailable to the connected Supabase account (permission denied).

## Storage
Supabase database backups include Storage metadata only, not object bytes (official backup docs). Shalean's 5 buckets/42 metadata objects and Bokkie's historical blog-images bucket each need separate authorised object backup and retrieval proof; private object contents and URLs must not enter a public PR.

## G29-01 judgement and next gate
**PARTIAL/NO-GO for recoverable source copies.** Shalean managed *backup availability* now independently supported by owner screenshot, while *recoverability* is not demonstrated. Bokkie manual backup has not yet been created or validated. Neither source has proven object-byte recovery. Do not mark G29-01 passed until independent authorised non-production DB and object restores succeed for BOTH.

Do not run port 5432, any production restore, database import, data mutation, payment, notification, recurring jobs, production deployment or T30. T29 remains In progress; PR #306 Draft.
