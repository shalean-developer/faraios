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
