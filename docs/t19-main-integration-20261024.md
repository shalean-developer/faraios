# T19 integration candidate — 24 October 2026

Scope: combine existing T19 PR101/102/105/106/110 work with current main1b5416dae65662b1dfff7302dc97334e7c653aa4; T19 source3bbdc71273e65ef9ee362359df27691e991c79a3. Canonical Build Tracker T19 remains In progress: separate invoice identities/connections, business totals reconcile and failures visible, dependencyT18. No tracker update or other task change.

This is a new review candidate, not acceptance or a shared-branch merge. Preserve existing PRs and full ancestry, including failed security checks and original synthetic evidence. No history rewrite, suppression, scanner bypass or incident disposition is applied. GitGuardian ticket9441 mailbox read found acknowledgement only; no substantive resolution. Owner decision declining Ignored/Test credential remains in force. A new successful scanner result would certify only this candidate's check, not disposition of the old incident.

## Integration decisions

- Main is authoritative for completed T04/T06–T18 runtime, hosting config, session/RLS foundations, package checks and pinned CI actions/runners.
- T19 runtime/schema/test/document additions are copied from final3bbdc712. No hosted migration added or applied. Standalone connection default remains unapproved/unprovisioned; no provider worker is imported by hosted runtime.
- Two local content conflicts: CI workflow and scripts/run-ci-policy.sh. Retain main's pinned action SHAs, exact runner/Node versions, network-disabled nonroot random-credential fixture; add T19 Windows suite and dedicated native PostgreSQL acceptance command. package.json auto-merge retains all main checks and adds T19 commands.
- All original T19 evidence bytes retained, including line-ending/whitespace differences flagged by diff --check; no evidence normalization or deletion. Source-only diff whitespace check passes.
- T05 stays deferred; T20+ untouched. Separate Shalean/Bokkie accounting, staging data and actual agreements/prices/pay are not changed.

## Acceptance boundaries

Previous PR110 exact-head Windows69/69 and legacy110/110, native26/26, four required checks and independent technical QA support only source3bbdc712. Combined candidate needs its own hosted CI/security/Windows/native and independent review. Green previous checks do not automatically transfer.

Local Node24.19 syntax and focused T19 suite69total56PASS0FAIL13explicit Windows skips. Broader local suite432total415PASS2FAIL15SKIP. Both failures are actual Unix/inherited-listener tests with listen EPERM on owned Unix socket paths; source/test unchanged from main. The local host rejected socket binding; no code-defect inference is made. Retain this failed run as evidence; hosted run must establish acceptance without modifying accepted T07. Local native PostgreSQL/Windows tests are not substitutes for hosted evidence.

No real credentials, OAuth, provider request, financial write, production deploy, database migration or record edit. Merge readiness and T19 closure remain NO-GO until all applicable criteria/holds resolved. Provider identity/accounting acceptance remains separately unfulfilled even if inactive code becomes technically ready.
