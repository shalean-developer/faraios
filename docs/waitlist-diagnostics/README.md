# Waitlist database failure diagnostics — 18 November 2026

Draft repair; not installed live. MON-01 remains open.

The worker currently reports only `Database request failed`. A typed exception now preserves the generic public message while the CLI emits one bounded JSON line with UTC, an allowlisted RPC name, normalized HTTP status, validated PostgREST/SQLSTATE code and a fixed category. No response body, parameters, headers, credential, email or customer record is emitted. Status zero does not claim a specific DNS/TLS/timeout cause. No retry, scheduling, mail, retention or security behavior changes.

Local verification: eight CLI scenarios using a loopback-only fake database, including 401/403/429/500/503, hostile error fields, cleanup failure, normal status success and connection refusal. No external requests or mail. Eight SC-02 baseline tests passed. Source inventory regenerated; historical manifest retained with an explicit three-path delta.

Host evidence: read-only waitlist_status using live PHP/config returned HTTP 200 with the expected aggregate structure at 2026-11-18T21:47:32Z (23:47 SAST). This does not explain the earlier 23:15 SAST work failure or prove mail processing.

Imunify investigation: run 44389915336 captured HTTP 403 with `access denied` and `imunify` markers for home and preview at 20:21Z. Plesk client Imunify exposes malware/proactive-defense views, not a matching request incident. Accessible domain error log contains older 17 November contact-page rule 77142192 warnings, not the monitor event. Do not attribute the monitor failure to that rule. Read-only host access check found no accessible /var/log/imunify360 or /var/log/modsec_audit.log; /var/www/vhosts/system/faraios.com/logs exists but is unreadable to the task user. Matching incident ID, rejecting rule/reason and source-IP correlation remain unavailable. No protections were changed.

Screenshots establish delivery of the attention/recovery emails; they do not establish resolution of either failure. V1-014 recovery and cadence acceptance remain separate. No production tracker checks changed in this investigation.

Before activation: review CI, compare exact live hashes for waitlist/core.php and scripts/waitlist.php against the base, preserve overlays, back up both files privately, apply only the reviewed two-file diff, lint and verify without executing work. Revert only those exact files from their backups if required. Do not merge or use a broad Plesk deploy; Git deployment remains Manual. A later natural failure is needed to capture the original cause; absence of failure is not proof of repair.
