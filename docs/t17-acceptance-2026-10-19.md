# T17 — Recurring booking acceptance

Date: 19 October 2026, Africa/Johannesburg. Evidence readback: 17:33:48 UTC / 19:33:48 SAST. Source implementation: PR54, merged main `59402d731f3324212cac7e1cda67292980659359`. Environment: FaraiOS staging `xdmfyrsauvqznkloroxg`, with the owner-PC local staging client on port 3101. Owner confirmed the pull/restart and opened Recurring bookings. The client has no runtime SHA endpoint; browser evidence establishes its observed behaviour, not an independently measured process SHA.

Scope: the approved T17 tracker task after T16; schedules, visit creation, future changes and cancellation without duplicate visits or rewritten agreed history. Owner selected weekly, fortnightly, monthly and multiple weekdays, retaining already-created visits. Existing production sites and the separate foundation gates are outside this acceptance.

## Browser acceptance

Real signed-in owner Chrome interaction, using already-labelled T14 test-source bookings. No accounts, memberships or business configuration were changed.

| Criterion | Observed result |
|---|---|
| Business isolation | Switching Shalean → Bokkie showed Bokkie's empty recurring list, without Shalean's schedule. Independent business agreements stayed R875 / four hours and R410 / 330 minutes. |
| Weekly / multiple weekdays | Shalean created a Thursday/Friday schedule from its completed source; reload preserved both weekdays and inclusive end date. Generating through 23 October created exactly one unassigned Draft. |
| Retry | Repeating generation through the same date showed zero new visits. |
| Future changes / fortnightly | Changing Shalean to fortnightly at 09:37 and reloading retained that configuration. The existing 23 October visit remained at 09:00 / R875, with its complete-row digest unchanged. Generating through 5 November created one new visit at 09:37 / R875. |
| Mobile pause / stop | At 390×844, Shalean's status dropdown, reason and Save worked. Paused state removed generation; stopping showed Cancelled without editable/generation controls. Existing Drafts remained until cancelled individually. |
| Monthly / mobile | At 390×844, Bokkie created and reloaded a monthly schedule, retaining its original day 21, end 21 December and shorter-month policy. Generating through 21 November created exactly one unassigned R410 Draft at 09:00. |
| Bokkie future change | Mobile save changed future time to 10:15, while the created visit remained 09:00 / R410 with the complete-row digest unchanged. Generation retry returned zero. |
| Individual cancellation | Both businesses' individual generated visits were opened and cancelled through the real booking form, with a reason and saved confirmation. Bokkie regeneration after cancellation returned zero and displayed the existing Cancelled visit. |
| Stop / cleanup | Both schedules were cancelled through the browser. The second Shalean generated fixture was cancelled through a tightly scoped authenticated owner SQL update. No active recurrence work remains. |
| Responsive layout | Both business forms accepted actions at 390×844. Observed scrollWidth 375 ≤ innerWidth 390; no horizontal overflow. Viewport override reset. |

Browser automation occasionally timed out after successful navigation; fresh DOM states and database readbacks established the actual outcome before any further mutation. A fresh browser tab resolved the stalled helper. No failed browser call was counted as an application denial. Screenshots containing personal details were used only for internal inspection.

## Database and audit evidence

All seven pre-existing bookings retain normalized digest `86e064e552ce7cb1e10664eba5f2bd44`, excluding only the three additive nullable recurrence fields. Source bookings were not updated.

- Shalean source `c11a5926-ec0d-487c-b22a-d87013933e56`; schedule `327ce9bd-7cf7-43a7-ab86-13c2a6ce8fc2` ends Cancelled, version 6. Visit `6cb37f18-50b6-4962-ba3f-d656b4c8676d` retained complete-row digest `0316c234774d06729f09c1632c393030` across the schedule edit, before its deliberate cancellation. Additional visit `5be1e4f6-cdab-4cea-8b9b-36c8c92f0591` used the changed time.
- Bokkie source `0996766f-6137-4140-ba4d-a9bf76c523c4`; schedule `20cb4a01-7b9c-485c-922e-e6f4df55f449` ends Cancelled, version 4. Visit `7eea4c4a-097d-491e-ae9f-042a012a2637` retained complete-row digest `cf8494d2b809fbbc8e0fd60a8c410ddb` across the schedule edit, before its deliberate cancellation.
- All three generated test visits end Cancelled, version 2, with zero recurring cleaner reservations. Two cancelled schedules and their three cancelled visits remain as audit evidence; do not delete them.
- Schedule audit records: two INSERT and eight UPDATE. Changes carry the owner actor and acceptance reasons. Earlier migration/role tests were rolled back independently; this committed browser evidence is additional.

## Automated and access evidence

PR54 final head `ba86e45fc74864c70ceab7320028b582cdf8af47` passed both CI jobs and GitGuardian. All 114 tests passed, including two independent PostgreSQL connections competing on recurring generation and shared-cleaner assignment. Local 113 pass / one explicit independent-connection skip was not substituted for CI proof.

Earlier actual staging owner/manager/staff/anonymous role tests passed in a rolled-back transaction: scoped reads/writes, foreign denial, retries, frozen price/scope/duration, cancellation, stale versions and audit. Browser evidence in this closeout uses the real owner session only; it does not claim real non-owner HTTP sessions were exercised. Foundation restricted-link/full-recovery/hosting checks remain separate. Security-advisor baseline is unchanged.

## Closure assessment

Engineering acceptance criteria are evidenced for this bounded staging task. Independent QA outcome: **PASS — T17 bounded staging functional closure**, evidence cut-off 19 October 2026, 17:36:08 UTC. The separate reviewer verified exact source identity, CI, isolated direct-insert controls and persistent staging/audit evidence without implementing T17 or changing live data. See [QA-T17-20261019](t17-independent-qa-2026-10-19.md) for scope, criterion results and limitations.

T17 is delivered for staging under the existing task instruction. Farai retains production and foundation approval authority. This task closure does not authorise production deployment, data migration, financial changes or communications. Retain the cancelled acceptance fixtures and their audit history. Reassess on implementation, schema, access, requirements or environment changes, or a recurrence defect.
