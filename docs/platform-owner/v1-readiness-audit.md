# FaraiOS v1.0.0 readiness audit — 16 November 2026

## Result: HOLD

FaraiOS has working foundation features. This audit does not support a v1.0.0 release today. It distinguishes confirmed defects, planned capabilities, decisions and acceptance gaps. No audit can guarantee finding every defect.

## Scope and evidence

Read-only live navigation: account welcome/setup, dashboard, requests, services, bookings, staff, invoices, profile and Access. Public Features and Shalean booking service/details steps observed. Existing logged-in business was Bokkie; no business record was changed. No booking was submitted, invoice/payment created, invitation sent, publication changed or permission activated. No new physical-phone acceptance performed.

Source reviewed: main4cea37e; repair candidate PR68 head04c3368. Foundation Plan v71 and Defect Repair Plan v22 read. Plan recovery status was checked against actual GitHub run43843901476: completed/success. Tests are evidence for their stated candidate; they do not automatically accept a new deployment.

## Confirmed findings

1. D01–D06 repairs are preview-only. Their earlier defects remain a live-release dependency until exact reviewed rollout; do not duplicate the repairs.
2. Public Features availability text contradicts the active public booking form and live owner Access screen. Reconcile other public pages before v1.0.0.
3. In the audited baseline, staff assignment accepts overlaps and the schedule view reports conflicts afterward; atomic resource reservations and complete availability are planned SC08 work. This is a release capability gap for a collision-safe scheduling promise.
4. No dedicated software-owner task workspace exists in the main baseline. The additive tracker in this work package addresses that gap, subject to owner identity activation and state-backup integration.

## Existing strengths — do not rebuild

Account/business setup and daily owner pages load. Fixed/from/quote service modes, private drafts, deliberate publication, secure customer quote/invoice links, manual payment records and correction safeguards have existing implementation/regression evidence. The shared marketing header is live on21 pages. The fresh isolated database restore succeeded. Existing verified-account and listed Manager/Worker/Receptionist phone checks passed in the repair work. These are bounded observations, not full release approval.

## Complete release register

| ID | Type | Priority | Current state | Release blocker | Task |
|---|---|---|---|---|---|
|V1-001|Defect|Critical|Preview|Yes|Release the tested D01–D06 repairs|
|V1-002|Verification|High|To do|Yes|Prove new-account verification on a phone|
|V1-003|Verification|High|To do|Yes|Accept stale forms and connection recovery|
|V1-004|Verification|High|To do|Yes|Accept payment replay and cross-page assignments|
|V1-005|Capability|High|To do|Yes|Define and enforce launch scheduling constraints|
|V1-006|Decision|High|To do|Yes|Agree the exact v1.0.0 product promise|
|V1-007|Defect|High|To do|Yes|Align public availability statements with live behavior|
|V1-008|Verification|Critical|To do|Yes|Audit every supported role against the final live candidate|
|V1-009|Verification|High|To do|Yes|Prove a complete independent-business pilot|
|V1-010|Capability|High|To do|Yes|Complete essential booking lifecycle communication|
|V1-011|Verification|High|To do|Yes|Validate service configuration for the launch model|
|V1-012|Verification|Critical|To do|Yes|Verify financial correction and document privacy|
|V1-013|Verification|High|Verified|Yes|Review fresh database restore evidence|
|V1-014|Verification|High|To do|Yes|Confirm support, monitoring and recovery ownership|
|V1-015|Verification|High|To do|Yes|Complete privacy, export and account lifecycle review|
|V1-016|Verification|High|To do|Yes|Verify mobile usability and accessible controls|
|V1-017|Verification|Critical|To do|Yes|Establish one reproducible release manifest|
|V1-018|Dashboard|High|In progress|Yes|Activate your platform-owner tracker|
|V1-019|Verification|Normal|Verified|No|Keep marketing design and navigation consistent|
|V1-020|Later|Normal|To do|No|Add online payment collection|
|V1-021|Later|Normal|To do|No|Expand industry models, recurring automation and AI|

### V1-001 — Release the tested D01–D06 repairs

The repaired pagination, time zones, record selectors, forms and staff joining are still preview-only.

Evidence: PR68 final-release-review.md; Foundation Plan v71. https://github.com/shalean-developer/faraios/pull/68

Acceptance:
- Complete remaining phone acceptance
- Review exact six-file and SQL scope
- Authorize, deploy and verify live

### V1-002 — Prove new-account verification on a phone

Existing-account invitations passed; a genuinely new account signup and verification phone journey remains unaccepted.

Evidence: Foundation Plan v71, final review. https://github.com/shalean-developer/faraios/pull/68

Acceptance:
- Register a new synthetic account
- Confirm email and land in the intended flow
- Recover expired verification and password-reset links

### V1-003 — Accept stale forms and connection recovery

Automated safeguards exist; deliberate physical-phone stale-version and interrupted-submit cases remain open.

Evidence: Foundation Plan v71. https://github.com/shalean-developer/faraios/pull/68

Acceptance:
- Reject stale saves without overwriting newer data
- Retain entered fields after recoverable errors
- Retry without duplicate customers, bookings or payments

### V1-004 — Accept payment replay and cross-page assignments

Basic phone payment and selection passed; deliberate replay and cross-page assignment acceptance remain open.

Evidence: PR68 acceptance evidence. https://github.com/shalean-developer/faraios/pull/68

Acceptance:
- Same payment retry creates one ledger entry
- Assignments survive browsing multiple staff pages
- Stale assignment rejected without data loss

### V1-005 — Define and enforce launch scheduling constraints

Current assignment code reports overlapping jobs after assignment; complete atomic availability is a planned shared-core package.

Evidence: staff_booking_assignment.sql staff_private.assign and business_booking_schedule; SC08 planned. https://github.com/shalean-developer/faraios/blob/main/supabase/migrations/20261113103036_staff_booking_assignment.sql

Acceptance:
- Agree launch rules for hours, leave, capacity and buffers
- Reject conflicting confirmation or assignment atomically
- Prove simultaneous confirmation and time-zone boundaries

### V1-006 — Agree the exact v1.0.0 product promise

Use request-first service management, guest document links and manual payment recording as the proposed initial scope. Cross-industry expansion needs separate pilot proof.

Evidence: Foundation Plan SC01 and this audit recommendation. https://chatgpt.com/library?file_id=libfile_5f8898a27afc81919b224c0039a9a738&account_id=personal

Acceptance:
- Approve supported operating model and countries/currencies
- Record optional features excluded from v1.0.0
- Align all release acceptance criteria

### V1-007 — Align public availability statements with live behavior

Features says booking intake is excluded and live access is owner-only. Live booking entry and the owner Access screen both expose those capabilities. Public claims are stale.

Evidence: Observed /features on 16 November; Foundation Plan current intake section. https://www.faraios.com/features

Acceptance:
- Reconcile actual live capabilities and flags
- Update homepage, Features, About, Pricing and walkthrough consistently
- Verify public claims against the deployed release

### V1-008 — Audit every supported role against the final live candidate

Preview role tests are substantial; final live release acceptance must remain distinct from source implementation and marketing claims.

Evidence: PR68 final release scope; source/main and hosted runtime differ. https://github.com/shalean-developer/faraios/pull/68

Acceptance:
- Owner, manager, receptionist and worker permitted paths pass
- Cross-business and direct API denials pass
- Revocation and financial-field filtering pass

### V1-009 — Prove a complete independent-business pilot

Empty live screens load successfully, but that does not establish the whole operational journey.

Evidence: Read-only live Bokkie account screens; no business records mutated. https://www.faraios.com/account/dashboard.php

Acceptance:
- New owner configures services and publishes a site
- Guest request becomes deliberately priced accepted work
- Assign, complete, invoice and record payment with history intact
- Repeat cancellation, correction and denied-access paths

### V1-010 — Complete essential booking lifecycle communication

Enquiry and invitation transport exist; quote/invoice screens use manual customer-link sharing. Full lifecycle communications remain SC10.

Evidence: account/quotes.php and invoices.php; Foundation Plan SC10. https://github.com/shalean-developer/faraios/blob/main/account/quotes.php

Acceptance:
- Agree which events send automatically and which are manual
- Show confirmation, change and cancellation information
- Deduplicate retries and expose failures with recovery

### V1-011 — Validate service configuration for the launch model

Fixed, from and quote pricing exist. Generic capability profiles and typed intake across models remain planned.

Evidence: account/services.php; SC05 planned. https://github.com/shalean-developer/faraios/blob/main/account/services.php

Acceptance:
- Prove fixed/from/quote, extras and duration for the launch pilot
- Preserve agreed scope and prices after catalogue edits
- Do not advertise untested industry workflows

### V1-012 — Verify financial correction and document privacy

Existing regression covers financial controls; final release needs evidence for its exact deployed candidate.

Evidence: F02/F03/F04 history and PR68. https://github.com/shalean-developer/faraios/pull/68

Acceptance:
- Issued originals and payment reversals remain traceable
- No duplicate active invoice or overpayment on retry
- Customer links expose only the intended document

### V1-013 — Review fresh database restore evidence

Fresh isolated database restore is successful. The plans still show the earlier queued state; this tracker records the verified current run.

Evidence: GitHub run43843901476 concluded success on16 November. https://github.com/shalean-developer/faraios/actions/runs/43843901476

Acceptance:
- Fresh isolated restore run completes successfully

### V1-014 — Confirm support, monitoring and recovery ownership

Backups/monitoring have implementation evidence. Release readiness still needs agreed ownership, recovery targets and a usable support route.

Evidence: Foundation Plan F06; operational evidence. https://chatgpt.com/library?file_id=libfile_5f8898a27afc81919b224c0039a9a738&account_id=personal

Acceptance:
- Name the person responsible for failed jobs and alerts
- Record recovery time/data-loss objectives and instructions
- Verify support contact and an incident recovery drill

### V1-015 — Complete privacy, export and account lifecycle review

Initial customer access uses secure guest links. Account restriction, export and retention behavior need explicit launch decisions. This is a readiness gap, not a legal certification.

Evidence: Foundation Plan platform operations boundary. https://www.faraios.com/privacy.html

Acceptance:
- Document retained data and account closure process
- Provide an accountable support/export process
- Confirm draft/private/public data separation

### V1-016 — Verify mobile usability and accessible controls

Marketing headers passed; this does not accept all application forms. Test full launch journeys at320/390/768/1280.

Evidence: Header release PR70; PR68 partial phone acceptance. https://github.com/shalean-developer/faraios/pull/70

Acceptance:
- Keyboard and phone navigation remain usable
- Labels, error focus and touch targets work
- No horizontal overflow or invisible actions

### V1-017 — Establish one reproducible release manifest

Main Git source and the deliberately transformed hosted account runtime are not identical. A whole-repository pull must not replace staged role files.

Evidence: Current deployment method; PR68 exact scope. https://github.com/shalean-developer/faraios/pull/68

Acceptance:
- Inventory actual live runtime, schema and enabled capabilities
- Pin the complete v1.0.0 candidate and migration set
- Rehearse rollback preserving new records
- Run required CI against the exact combined candidate

### V1-018 — Activate your platform-owner tracker

Dashboard is being built with deny-by-default owner access. The platform-owner sign-in email has not yet been supplied. Business ownership never grants platform access.

Evidence: This work package.

Acceptance:
- Identify and verify your exact owner account
- Test unauthorized, expired-session and CSRF denial
- Prove task edits persist with conflict protection and history
- Accept preview before any live dashboard release

### V1-019 — Keep marketing design and navigation consistent

Shared header deployed across21 public pages; live logo and signup/signin checks passed.

Evidence: PR70 bounded release24 files,441 protected. https://github.com/shalean-developer/faraios/pull/70

Acceptance:
- Shared template applied to21 relevant pages
- Live logo and account navigation pass

### V1-020 — Add online payment collection

Optional after v1.0.0 when the launch explicitly offers manual recording only.

Evidence: Deferred scope recommendation.

Acceptance:
- Separate provider, refund and reconciliation design
- Independent security and financial acceptance

### V1-021 — Expand industry models, recurring automation and AI

Defer broad expansion until the first operating model is proven.

Evidence: Foundation Plan defer section.

Acceptance:
- Separate operating-model pilots
- Scope recurring services and specialist workflows
- Add AI only with a tested purpose

## Release order

1. Confirm the request-first launch scope.
2. Finish existing repair phone acceptance and exact release scope.
3. Close applicable scheduling, communications and configuration gaps.
4. Run complete independent-business and security/financial journeys against the pinned release.
5. Prove runtime/schema/config/private tracker state recovery and monitor ownership.
6. Owner accepts documented limits; authorize bounded rollout; observe live results.

## Limits and unperformed checks

No fresh retained business mutation or cross-business penetration test was run against live. New-account email verification, account recovery on a physical phone, deliberate mobile connection/stale/replay/assignment scenarios and the complete independent-business pilot remain open. Browser observations on an empty business do not prove large-list performance. Load/capacity and future operational models remain unaccepted. Broader countries/currencies, tax expansion, instant booking, full customer accounts, automated online payments, recurrence and AI are not silently included in launch scope.

## New dashboard release conditions

The tracker itself requires explicit owner UUID binding, positive hosted owner-session acceptance, mobile/desktop visual checks, denial of the currently signed-in non-platform business owner, durable task/history checks and encrypted host-state backup/export verification. Initial access is disabled. It creates no authority over tenant records. This is a source/preview deliverable, not a production release.
