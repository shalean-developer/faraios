# T19 execution expiry race correction

24 October 2026. Bounded follow-up to the independent review of PR113, based on merged main c0f6f3537c13511075ba1999ba9069e094c67e9f. Owner authorised a fix PR and dummy regression tests. T19 remains In progress; T20 is untouched. No tracker changes, real credentials, OAuth execution, provider calls, deployment or migration are part of this change.

## Defect and decision

The callback checked execution approval and OAuth-state expiry before awaiting membership and vault operations. Crossing either deadline during those waits could still dispatch a token exchange. The same approval-check timing affected consent generation and verification GETs. This defect predates PR113.

Recheck deadlines after asynchronous prerequisites and synchronously at the injected/default transport boundary. Approval expiry also fences grant/evidence acceptance after asynchronous reads. Existing single-use state, successor history, manifest binding and cleanup contracts remain intact. Tests use explicit dummy transport, fake time and synthetic membership/vault state; the HTTP regression uses loopback only.

If expiry occurs during the durable pre-dispatch write, no transport is called, but the already-persisted exchange intent stays conservative: the service disables the attempt with an unknown-outcome cleanup hold. Do not reinterpret that record as proof that no grant exists. Existing separately approved targeted cleanup remains required, and predecessor history is preserved. No new retry or recovery authority is introduced.

Changed runtime bytes invalidate existing runtime fingerprints. This PR does not amend or approve any execution manifest or real-store cleanup package.

## Validation

- Three regression groups failed on the original source, then passed with the fix: callback approval/state expiry during membership, vault read and vault write; consent/verification expiry during membership/read; expiry in guards before either GET.
- Final connection/successor run: 49 tests passed, zero failures or skips (Windows, Node24.14.1). Includes the loopback HTTP callback regression, post-exchange expiry during membership/read, conservative cleanup after pre-dispatch expiry, and real dummy Windows DPAPI successor archive/restart/cleanup.
- Earlier wider T19 run: 96 tests, 95 passed, one failure, zero skips. The failing unchanged test was `masked helper hands dummy secret to real gated importer and DPAPI; duplicate import fails closed`. A focused retry also failed. The same failure was independently reproduced from disposable, unmodified base c0f6f353 source with locked dependencies. Its cause is not established; this is not a full-suite PASS. The final two additional regression tests are included in the 49-test focused pass above.
- The initial sandbox-only run could not load uninstalled dependencies or connect to loopback. Locked dependencies were then installed with `npm ci --ignore-scripts`, and tests rerun with local test permissions. No tests were waived or weakened.
- Repository syntax checks and explicit checks of the modified module/tests passed. Hosted exact-head CI is a separate publication check, not claimed by these local results.

Synthetic tests are not real-provider acceptance or database/RLS certification. Actual identity/permission verification, targeted provider cleanup and business-total reconciliation remain outstanding under T19.
