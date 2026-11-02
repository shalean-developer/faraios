# T29 G29-01 — Pro plan and storage-backup distinction (2026-11-02)
Read-only supplement, no execution.

Verified via connected Supabase get_organization: Shalean organisation `zpwhurnjkeltuunyjeci` plan `pro`. Supabase's official Database Backups documentation (updated 2026-10-29, https://supabase.com/docs/guides/platform/backups) states that Pro projects automatically receive daily backups with the last seven days available, unless PITR changes the mechanism. This is a **provider policy**, NOT evidence of any individual Shalean backup timestamp, accessible restore point, successful restoration, or current PITR setting. We did not fetch the project's live backup inventory.

The same documentation explicitly states database backups contain **Storage metadata only**, not Storage object bytes. Separate object backup, private access assurance, manifest and recovery verification are mandatory for Shalean's 5 buckets/42 objects and Bokkie's original Storage records.

The connector still lacks an exposed backup listing, and Bokkie project access remains permission denied. No safe basis to mark G29-01 PASS. To proceed: obtain non-secret Shalean project Database > Backups listing and restore-window evidence; separately verify authorised Bokkie project backup dashboard and Storage retention. Do **not** click restore on either live source, provide secret tokens in chat, download private objects, or disturb current restore-test T07 evidence.

Status G29-01 NO-GO; PR306 Draft; T29 In progress; T30 untouched.
