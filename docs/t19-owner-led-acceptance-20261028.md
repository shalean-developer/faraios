# T19 owner-led acceptance — 28 October 2026

## Owner decision and supersession

Farai instructed in this conversation: “create this system end to end without these reviewers” and requested manual feature testing at staging.faraios.com before T20. This is a new T19-specific decision, not reuse of a prior PR exception. Independent external-reviewer nomination, reviewer co-signature and reviewer closeout are no longer prerequisites for this owner-led staging acceptance path. The implementing agent does not claim independent certification. Owner accepts the loss of independent assessment and retains the final acceptance decision.

This decision supersedes contrary reviewer prerequisites in the earlier T19 Gate 2 packets and PR209 status. Historical records and evidence remain intact. The canonical tracker was read: T19 In progress and T20 Not started; no tracker cells were changed. This decision is recorded here for traceability alongside the canonical requirements.

## Implementation

Gate 2 version4 uses one Ed25519 owner signature verified against a protected, independently provisioned owner public key. No caller-supplied approval boolean, trust override, reviewer signature or old version3 receipt authorizes execution. The new version/scope changes the policy and bundle digests, invalidating previous receipts. Exact executable, SQL, Node/Docker, boot, daemon, baseline inventory, operation scope, nonce and expiry binding remain required. Durable single-use claims, intent-before-create, immutable ID binding, quarantine and ownership checks remain unchanged. No keys, trust registry, host or operation were provisioned or executed by this source change.

## Remaining execution dependencies

Removing a reviewer does not provide Docker access, image availability, securely installed owner trust or credentials. This workspace has no Docker daemon. The passing Foundation CI is a candidate for an isolated runtime job, not an attested Gate2 host. Prepare a bounded owner-authorized synthetic runtime job and host trust/signing procedure before requesting any remaining exact operation approval. Do not fabricate signatures or claim acceptance from mocked Docker tests.

Existing separate protections for hosted SQL, credential publication, OAuth consent, worker activation, live customer/financial records and production remain effective. Owner-led hosted A12 assessment direction is preserved. No paid infrastructure or unrelated resources may be changed implicitly.

## Acceptance

Source tests include actual cryptographic verification, filesystem replay fences, subprocess deadlines, failure injection and embedded SQL transaction/permission checks. They are not evidence of the exact pinned image or provider acceptance. Previous Foundation run40667502124 passed on the previous tree; it does not certify this change until new CI passes.

Before owner app UAT: finish isolated runtime acceptance, hosted custody and authenticated business-denial checks, approved TEST provider operations, retries/refresh/disconnect/recovery and reconciled independent business totals. App UAT must include both businesses and visible failure/retry outcomes. T19 cannot be Done based on page appearance alone. T20 remains Not started until formal T19 acceptance.

Decision: reviewer prerequisite SUPERSEDED by owner; source regression results recorded in evidence; protected runtime and full T19 acceptance NOT YET PASSED.
