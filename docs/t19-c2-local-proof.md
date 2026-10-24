# T19 C2 — inactive local PostgreSQL proof

24 October 2026. This is the owner-authorised local follow-on to C1, under the canonical [Build Plan](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit) and T19-AMEND-20261024. Build Tracker rows 20–21 were read during this work: T19 In progress; T20 Not started. Neither tracker nor hosted state is changed.

Base: C1 commit `446fd9c6da60af7a977abcbdc624826be12060df`, tree `997441b03df4aea3ed5a36065087dba9a706242b`, identical to merged `004b888f3d9ec476fe30e16802090a4ceb0c0530`. Isolated branch `codex/t19-c2-local`. Existing C1 worktree, PR #114 and Windows compatibility work are separate. No existing source, workflow or package script is changed.

## Run and scope

Use Node 24 and native PostgreSQL 17 binaries. Run `node scripts/run-t19-c2-postgres.mjs`. The runner starts its own random loopback cluster, loads the existing Stage B fixture and C2 proof SQL, runs explicit native tests, stops that exact cluster and removes its random directory. It strips inherited database configuration. Windows sandbox filesystem restrictions may require execution outside the sandbox. No application database URL is accepted. The cluster uses local trust authentication exclusively for disposable dummy fixtures; it is unsuitable for hosting and provides no isolation from other processes of the same OS user.

All new executable files live in test-support or an opt-in test runner. The SQL is not a migration. There are no real credentials, OAuth/HTTP calls, hosted imports, deployment configuration, new services, dependencies or recurring charges. R500/month remains the constraint; the recorded R519 baseline is not an approved increase. Hosted custody and workload identity remain undecided interfaces. T19 activation is blocked; T20 is untouched.

## What the proof establishes

Native PostgreSQL transactions serialize on the existing Stage B connection then the credential row. A private mapping binds each real worker login (`session_user`) to a business/environment. Client role claims and JWT GUCs do not confer worker authority. The worker must reference a Stage B operation whose actor still has finance membership and whose business, connection and generation match. Owner connect/disconnect/reauthorisation remain the existing Stage B controls; browser roles receive no C2 privileges. This adds no hosted API, auth implementation or background scheduler.

Credential identity reuses C1's complete binding, plus key version, recovery epoch and exact secret reference. The dummy adapter only accepts synthetic environments/providers and dummy token material. AES-GCM authenticates the binding, key version, epoch and reference. Separate on-disk dummy envelopes survive worker-process death. The key is in the same disposable directory: this is deliberately **not independent key custody**. Production/staging key roots and rotation are not implemented. Wrong or missing keys/versions fail closed.

One persistent row per connection carries an attempt UUID, monotonically increasing fence, database-clock deadline, phase and approved job. Short transactions commit dispatch intent before fake refresh starts. No transaction spans fake transport. A second process gets bounded busy/recovery failure; this proof does not implement a distributed token cache or wait queue. C1's scoped in-process cache remains separate and retains its denial regressions.

Publication advances credential version and exact envelope reference with its audit event in one PostgreSQL transaction. A lost acknowledgement can read the exact published attempt/version; it cannot republish it. The independent dummy watermark is written before database publication: if publication is uncertain, mismatch blocks further adapter use. Partial watermark writes fail closed. This is process-crash testing, not power-loss durability: files are not fsynced and the dummy watermark is neither tamper-resistant nor a production monotonic authority.

## Recovery contract and limits

| Observed state | Permitted local outcome |
| --- | --- |
| Claimed, never dispatched, lease expired | New attempt and higher fence may reclaim; old attempt cannot dispatch/publish. |
| Dispatch intent committed, worker lost before send | Hold. Sending and database commit cannot be atomic. |
| Response received, worker lost before seal | Hold; potentially rotated grant cannot be recovered from a database rollback. |
| Envelope staged, worker lost before publish | Hold; staged envelope is an orphan, never an automatic “latest” fallback. |
| Publish committed, acknowledgement lost | Read the exact current published attempt and version, subject to current authority/generation. |
| Timeout, expired result, invalid grant | Recovery hold or reauthorisation-required; no automatic refresh retry. |
| Disconnect, reauthorisation or membership loss | Existing job/generation cannot publish; predecessor state remains blocked. |
| Older database metadata with newer retained watermark | Adapter refuses refresh. Missing/invalid evidence also fails closed. |

There is no recovery-unlock endpoint, successor credential installation, orphan deletion or automatic key retirement in this proof. Recovery requires a future approved procedure: disable work, establish termination/isolation of old executors, reconcile external grant/version evidence, advance an independently retained epoch, resolve predecessor cleanup and explicitly reauthorise. Merely expiring a dispatched lease is never sufficient. A suspended process may still perform an already-authorised external side effect; database fences only reject its stale publication. Fake transport has no such real effect.

The metadata-rollback test is not a complete PostgreSQL backup/restore rehearsal and does not reopen the accepted T11 exercise. Restoring the database **and** its external watermark together is undetectable here. Direct malicious privileged SQL can bypass the adapter's watermark check; infrastructure administrators and trusted worker code are residual trust boundaries. This proof is not API/RLS enforcement evidence for a hosted deployment, distributed hosted safety, provider exactly-once execution, an RPO/RTO commitment or T19 completion.

## Review gate

Before publication, review the exact local patch and reproduce native tests independently. No commit, push, PR change, hosted CI run, migration, spending or tracker update is authorised in this slice. Future hosted work needs workload/key custody isolation, full environment separation, bounded real transport, externally durable rollback evidence, termination/recovery procedures, cost allocation within the owner-approved budget and separate owner approval.
