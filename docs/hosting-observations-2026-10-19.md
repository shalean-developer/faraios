# Read-only Plesk observations — 19 October 2026

Observed through the owner's connected browser. No Plesk configuration changed.

- faraios.com subscription is active; usage 30.3 MB; displayed storage allowance Unlimited and traffic allowance 100 GB/month. These are quota labels, not evidence of CPU/RAM capacity.
- Domain dashboard reports Domain not secured. DNS endpoint/certificate validation remains unverified.
- A legacy Git repository remains: git@github.com:shalean-developer/faraios.git, branch master, last displayed commit e017783; automatic deployment targets /httpdocs. Latest displayed history includes August 2026 commits. Do not pull or deploy this stale configuration into the fresh build. Reusing a repository URL does not replace an old local checkout.
- Node.js Manager lists Node 24.21.0 for other hosted domains. FaraiOS is not listed as an enabled Node application; this does not establish permission to enable it on that subscription.
- Git, scheduled tasks, logs and JetBackup interfaces are visible. Their operational reliability, access scope and restore capability have not been tested.

T05 remains blocked on FaraiOS runtime permissions, CPU/RAM/process limits, deployment method, staging separation and actual costs. The earlier statement that Plesk was empty was based on the owner's report; this direct inspection corrects that assumption. Legacy cleanup remains necessary before connecting the fresh repository. No deletion was performed.
