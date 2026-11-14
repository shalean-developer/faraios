# Private application monitoring — F06 preview

Scope is accounts-preview, stacked on PR #37. No live activation, Auth setting
change, database writes, customer messages or booking-intake change is included.

Events retain only allowlisted timestamp/environment/type/operation/status/random
correlation fields. Preview bootstrap routes them to `ops-preview` under the
existing private account configuration directory. The directory is mode 0700;
event files, lock, application heartbeat and monitor state are mode 0600. Symlink
log targets are rejected. Raw exceptions, bodies, tokens, URLs and IDs are omitted.
At most two approximately 1 MiB event segments per UTC day are retained for fourteen
calendar days. Cleanup touches only matching old event filenames. Hosting/provider
raw logs remain separate and need their own restricted access/retention policy.

An application request heartbeat is written at most once per minute. A private CLI
monitor probes the preview sign-in GET and Supabase Auth health GET, checks the
recent application heartbeat and bounded error counts, and writes an aggregate
monitor state. It does not authenticate, submit forms, consume queues or send mail.
No recent heartbeat, incomplete logs or invalid configuration returns unknown;
a failed page/Auth probe or fatal/threshold error returns attention. A quiet log
alone never returns healthy. The CLI sets only the fixed preview request context
before loading configuration, so URI-aware private configs retain preview scope.

Operator command (outside HTTP):

```
php scripts/operations-monitor.php --config-dir=/private/account-config
```

A harmless `--canary` writes a fixed monitor-canary event without creating a false
workflow failure. `--status-only` never probes and cannot report healthy. Scripts
are web-denied; events remain outside the document root. There is no public health
endpoint revealing private queues or state. Rollback is PR #37 application source;
new private log files can remain for inspection and require no database rollback.

Local regression covers privacy, permissions, bounded rotation/retention, symlink
denial, missing/stale heartbeat, page/Auth outage and recovery, live-config denial,
and the existing complete application regression gate. Hosted sink/mode/probe and
scheduler results must be recorded separately; synthetic tests do not establish
hosted evidence.

Proposed alert payload is a fixed state summary only: environment, time, page/Auth
availability, heartbeat freshness and event counts, with no customer data. No
recipient or operator is assumed; real test sending and alert scheduling require
the owner to specify the destination. No custom alert has been sent.
