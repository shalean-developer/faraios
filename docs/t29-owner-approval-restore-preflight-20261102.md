# T29 — Owner approval and restore-test read-only preflight (2026-11-02)

## Approval
Owner expressly replied **"Approved"** to bounded use of existing FaraiOS restore-test Supabase project `zrlojsvkqipuwkkyfrkn` for T29 preparations, conditioned on verifying absence of protected T19/T20 recovery resources, preserving all existing tables/data until separate approval, proven backup/object recovery, disabled outgoing events/providers, no source writes, no port 5432, no production release and no T30. This does **not** authorise reset, destruction, hosted data import or unverified key use.

## Independently observed via connected read-only Supabase calls
- Project `faraios-restore-test`, ref `zrlojsvkqipuwkkyfrkn`, is ACTIVE_HEALTHY; database version 17.11.0.003.
- Public schema includes `t07_environment_guard` (reported 1 row; RLS enabled).
- Migration history reports `20261023190350_t07_reset_restore_candidate`. Its contents and protected T19/T20 provenance have **not** been independently validated.
- Auth users 0 reported; storage.buckets 0, storage.objects 0; no Edge Functions reported. Tool row counts are metadata, not independent exact table content or backup proofs.
- No grant/role/job/cron/secrets/network/backup-retention inspection was performed. No evidence that the project is free of protected recovery state beyond the visible inventory.
- GitHub Foundation checks run 41479882781 at T29 source-only commit `74aa2851291894cd8a73bf0253c9021ff7757a5d` completed with `success`. This verifies CI only, not a restore or isolation gate.

## Determination
**CONDITIONAL SITE CANDIDATE / IMPORT NO-GO.** Preserve the guard row and existing migration. Do not run reset, write/import, storage copy or network/payment workers in the resource. First establish exact protected-resource ownership and evidence of independent backup/restore for both Shalean and Bokkie and verify isolation/egress denial; seek separately bounded approval for any destructive operation. Bokkie source is not available through currently connected Supabase accounts. All G29-01..08 run-bound acceptance gates remain unverified.

This is read-only governance evidence, not T29 staging acceptance. T29 In progress; no T30.
