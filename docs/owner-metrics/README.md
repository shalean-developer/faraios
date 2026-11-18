# OWNER-02 metrics and MON-01 investigation — 18 November 2026

## Live metric completion

OWNER-02 saved Live6/6 at revision207,19:45:01Z; original V1-014 dependency remains In progress2/3. No Verified/launch claim.

Contract recorded before implementation in revision206. Active30d counts unique current businesses that CREATED a live quote, booking or invoice in inclusive rolling30days ending at snapshotUTC. Draft/cancelled records count as recorded activity, not revenue. Edits, sign-ins, preview and future rows do not count. Setup complete requires current live saved profile, nonarchived service, published website and nonblank name/country/timezone; not availability/payment/readiness.

Live counts: active3 (known tests2,Other1), complete1 (known tests0,Other1),9businesses/20users. Independent SQL reconciled3/1/9; Other remains unclassified. Existing owner/session gate unchanged. No raw quote SELECT to executor, no direct metric-view SELECT to authenticated. An internal security-barrier view exposes only business ID and two booleans to the existing aggregate executor; public RPC exposes counts only.

130 disposable PostgreSQL assertions,32 contract assertions and22 actual PHP page/access assertions PASS. Coverage: authorization, stale/invalid data, confirmed empty counts, duplicate activity, cohort reconciliation, preview/old/future exclusion, exact30day boundary, setup conjunction, scoped SQL rollback to prior response. Live owner read and Enter refresh PASS; desktop1280/mobile390/320 no horizontal overflow. Anonymous route303 to sign-in and include-only model404.

Supabase migration applied transactionally to FaraiOS rxelmugnucfajrqmphhe. Two runtime PHP files installed via unsaved Plesk Run Now from PR100 f38405cb8ed838e4d50aede9f309e68ca73fa9e4, exact preimage/download hashes, staged syntax checks and private original copies. Cancelled the unsaved form afterward; no schedule created. Existing overlays preserved; no merge/main or business-data changes.

## Rollback

Stop on installed hash drift. Restore the two .before files from private/faraios-account/owner-metrics-backup to account/, preserving0644, before running rollback.sql. This restores the old compatible UI before removing the additional database fields/view. SQL rollback restores original aggregate function and drops only the new metric view; no table/data changes. File originals verified/linted; SQL reversal exercised in disposable DB. No actual live rollback performed. install.py contains pinned pre/post hashes and partial-install rollback.

## MON-01 investigation

Monitor failures44375746359 and44379388606 reported home/preview403 while Auth200 and backup/config healthy. Host tail showed18 exact monitor-UA requests,0status403, including successful20:00SAST origin requests; failing later requests absent from this bounded sample. Host probes using the same UA got200/LiteSpeed for both URLs. This suggests pre-application rejection but does not prove WAF/IP/rate-limit cause.

Isolated diagnostic branch fix/mon01-probe-diagnostics-20261118 commitcb0812696f652fc9e673fbf6ecef25c722d181a0 deliberately replaces that branch's workflow with a manual-only, permissions-empty, no-secret/no-alert test. DO NOT MERGE that diagnostic workflow into main. Run44382822993/job135079386873 at19:41:12Z returned200 for both URLs using default and IPv4, remote104.238.222.122,TLSverify0,LiteSpeed. This manual diagnostic does not prove repair or unattended backup cadence. Main workflow/schedules/security unchanged.

MON-01 findings saved revision208,3/5 at19:45:13Z. Next collect bounded response headers from a failing scheduled runner and correlate origin/security logs; do not relax security or claim general downtime without evidence. Backup cadence and full-service recovery remain separate.
