# T05 hosting verification — 19 October 2026

Read-only Plesk inspection; no configuration applied.

## Verified

- Legacy Git connection removed: Git page displays Add a repository to start deploying files.
- FaraiOS Node.js interface offers versions 24.21.0 and 25.9.0. Use Node 24 for consistency with current tests. Selected setting is still 25.9.0 and application is disabled; no version change or enable action performed.
- Subscription permissions allow Node.js support/state/version management, Git management, DNS zone management, hosting settings, scheduler, log rotation and JetBackup access.
- Subscription quota fields allow unlimited subdomains and databases; traffic quota 100 GB/month, storage labelled unlimited. No staging domain has been created.
- Existing paths show /httpdocs as application and document root, startup app.js. These are residual settings, not an accepted deployment layout. Separate public root required in deployment design.
- CloudLinux Manager reports unavailable and says to contact the hoster. CPU, RAM and process limits cannot be verified from this interface.

## Pending evidence

- Actual CPU/RAM/process and build limits; whether staging shares those limits.
- Actual recurring hosting cost and incremental staging charge, if any.
- HTTPS certificate/domain routing validation, isolated staging configuration and backup restore proof.
- Database/auth/storage and outbound communications service costs.

## Decision

CONDITIONAL PASS for Node 24-compatible local application preparation. T05 remains blocked for production readiness and budget confirmation. Do not infer unlimited compute from storage quotas. No new services, charges, deployments, database projects or changes to existing business websites are authorised by this evidence report.

PR #2 rule contracts merged at 9fb9f60d7714abe729ef07c323c5a9e93fc5157a after both GitHub checks succeeded; local suite had 15 passing tests. Actual pricing/earnings decisions remain open.

## Allanux client-area verification

Directly observed on 19 October 2026 in the authenticated client area:

- Lite Reseller active: R420/month; next due 25 October 2026.
- Reseller storage: 35,346 M used / 51,200 M total (69% displayed). Remaining 15,854 M, about 15.5 GiB. The reseller-wide quota limits actual headroom even when an individual subscription says unlimited.
- Separate Starter Cloud for shalean.co.za: active R99/month. Combined displayed recurring hosting amounts R519/month, excluding domains, optional services and usage charges. Do not cancel either service.
- No CPU, RAM, process/concurrency limits or explicit staging charge displayed in the reseller product details.
- Public Lite plan lists 50 GB storage, unlimited subdomains and free SSL: https://www.allanuxweb.com/reseller-hosting . The page comparison inconsistently lists 60 GB elsewhere; use authenticated 51,200 M quota as account evidence.

Inference: existing subdomain allowance may accommodate staging without another plan, but no staging-specific charge guarantee is verified. Provider confirmation is still required for resource limits and any additional charges. The R420 is existing shared hosting spend, not a new FaraiOS-only charge; incremental FaraiOS costs remain unverified.
