# T19 C3 — CI coverage and hosted-readiness gates

24 October 2026. Local preparation authorised by Farai under the canonical [Build Plan](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit) and T19-AMEND-20261024. Base: merged C2 `8520bb3be6bd128cb8d138289f1d0112823b5e4d`, reviewed tree `21420905a11384e1d2ff38520ccce4b15ecda0fd`. T19 remains In progress; activation blocked; T20 untouched. This document is a proposal for hosted readiness, not permission to implement it.

## Current authority and cost correction

Owner-confirmed hosting baseline is **R420/month**. The separate R99 service has cancellation pending; do not mark it cancelled, count it as a new approved service, or silently change billing. The R500/month constraint remains. Nominal headroom against the confirmed retained baseline is R80/month; available cash headroom is not established while cancellation/billing allocation remains unresolved. No part of that headroom authorises spending. The older tracker R519 note is historical and was not edited.

Authorised here: isolated local CI preparation, dummy tests, this readiness proposal and independent review. Excluded: commits, pushes, PR changes, hosted CI dispatch, new paid services or runner capacity, secrets, provider/OAuth calls, deployment, live migrations, permissions changes and tracker updates. PR #114, the Windows compatibility package and earlier C1/C2 evidence remain separate.

## C3 CI change

Explicitly invoke the existing C2 native runner after Stage B native acceptance in `scripts/run-ci-policy.sh`. Reuse the pinned Node 24/PostgreSQL 17 image, non-root container, network isolation, two-CPU/four-GB limits, existing job and ten-minute timeout. No workflow, package, dependency or hosting configuration changes. Ordinary Node discovery still excludes the native suite.

The runner requires one complete TAP summary: 18 tests passed, zero failures, cancellations, skips or TODOs. This count deliberately requires review when coverage changes. PostgreSQL must report version 17. Successful exit and the proof marker require database stop, absent owned PID, fixture removal and confirmed absent directory. Failure to stop preserves the fixture instead of deleting a possibly live cluster. Failed tests remain failed even if cleanup succeeds. Success is emitted only after cleanup.

Dummy regressions cover incomplete/ambiguous summaries, skip/failure propagation, missing binaries, partial startup, unsupported version, stop/PID/removal failures, target containment and unrelated-file preservation. Injected command models prove orchestration decisions; the real disposable PostgreSQL run supplies native integration evidence. Hard process/container termination is not proven graceful cleanup: a killed process cannot promise a final marker. CI container disposal remains the outer containment boundary. No hosted durability or process-supervision claim follows.

Acceptance before publication: independent exact-candidate review, native C2 18/18 with cleanup, focused failure/discovery tests, and local reproduction of the constrained Linux policy job where available. Local evidence is not hosted CI PASS. After separately authorised publication, require all existing exact-head CI/security checks plus the explicit C2 marker/counts, reviewed diff and post-merge evidence. If the existing time/resource allowance is exceeded, stop and investigate; do not silently raise limits, buy capacity or weaken tests.

## Hosted-readiness decision record

No custody platform is selected or provisioned. Keep custody, executor identity and recovery authority behind interfaces until these gates have evidence and separate owner approval.

| Gate | Required evidence / decision | Current outcome |
| --- | --- | --- |
| Budget and capacity | Confirm R99 cancellation effective date/final charge; reconcile retained R420 invoice, attributable services, taxes/usage and existing CI allowance; document worker CPU/RAM/process limits and staging charges. | R420 confirmed; R99 cancellation pending; capacity/complete cost unresolved. |
| Custody and operator trust | Enumerate host/DB/key operators and decrypt rights; assess shared OS-user exposure; approve separate environment key roots, key rotation/retention and exact business/environment/provider/connection/generation/organisation/version/epoch binding. | Dummy key and ciphertext together are not independent custody. No production choice. |
| Worker authority | Verify narrowly scoped workload identity and approved-job authority; reuse trusted server memberships, generation checks and explicit tenant/record scope; deny platform-only access and browser secret operations. | C2 native role proof is local only. No hosted worker identity or key access approved. |
| Distributed refresh | Specify bounded transport, lease/attempt fencing, immutable dispatch intent, atomic reference/audit publication, lost-ack readback and orphan quarantine. Never reclaim an uncertain dispatched refresh automatically. | Local process-death proof accepted; no real transport or hosted safety acceptance. |
| Recovery and rollback | Approve durable independent epoch/version evidence, restore-disabled default, key-loss handling, retention, scoped operator authority and measured RPO/RTO. Evidence lost or rolled back means hold/re-authorisation, not fallback to an old token. | Same-directory watermark is neither tamper-resistant nor power-loss durable; combined rollback remains undetectable. |
| Old executor isolation | Establish termination/isolation evidence before any recovery unlock; address paused/resumed executors and predecessor cleanup before successor installation. | Database fencing blocks stale publication, not a remote effect already authorised. No unlock or successor endpoint. |
| Hosted acceptance | Plan negative API/DB/custody tests, separate staging/production, verified consenting identity/organisation/effective permissions, visible failures and business-total reconciliation. | Deferred, separately authorised synthetic hosted phase first; real providers require their own explicit gate. |

Reuse accepted authentication and Stage B foundations. Preserve T07 environment separation and T11 recovery evidence; do not reopen their accepted exercises or claim they establish credential-recovery objectives. Payments and payment-evidence work remain outside T19 C3 and T20/T21 unchanged.

## Proposed sequence and stop conditions

1. Complete the authorised local C3 candidate, tests and independent review. No publication in this approval.
2. Seek separate approval for exact-candidate Draft PR/CI-only publication. CI coverage must pass before merge consideration; merge and deployment are distinct approvals.
3. Assemble existing non-secret invoice/capacity/access-boundary evidence and a custody/recovery decision record. Any new authenticated host inspection, provider contact or settings change must be explicitly scoped first. Never collect secret values for this record.
4. If a defensible existing-host option fits the reconciled budget, propose a bounded synthetic hosted rehearsal with exact target, rollback, executor isolation, key custody and acceptance criteria. If not, retain the interface and return a fully costed alternative; do not weaken isolation or spend the nominal R80 automatically.

Stop at unexpected credentials, real destinations, missing rollback evidence, ambiguous tenant identity, unverified executor isolation, failed cleanup or budget/capacity uncertainty. The immediate next review is the exact local C3 patch and its test evidence, not hosted activation.
