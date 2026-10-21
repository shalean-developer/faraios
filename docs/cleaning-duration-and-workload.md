# T04 — Booking duration and daily workload

Owner approval: 21 October 2026, the complete six-service table, followed by the instruction to define added-item times and implement/test the calculations and daily limits. Scope is FaraiOS and isolated staging. Shalean live, Bokkie policy, restore-test, prices, fees, worker-pay rates and old agreements are outside this change.

## Shalean duration policy

| Service | Minimum total booking minutes | Scope time per unit | Assessment |
|---|---:|---|---|
| Regular | 210 | Bedroom/bathroom/extra room: 30 | Preserve existing assessment requirements |
| Airbnb | 210 | Bedroom/bathroom/extra room: 30; linen change: 30 | Preserve existing assessment requirements |
| Deep | 300 | Bedroom/bathroom/extra room: 60 | Preserve condition assessment |
| Moving | 300 | Bedroom/bathroom/extra room: 60 | Preserve furnished-property assessment |
| Office | 210 | Office assesses the complete scope | Every booking |
| Carpet | 120 | Carpet room/rug: 30 | Every booking |

All configured positive time additions use 30-minute blocks. Zero-time pets and descriptive answers remain zero. The existing base calculation remains in place; the minimum is a floor **after base + scope + extras**, not an additional base charge or a first-room allowance. For example, Regular base180 + one bedroom30 + one bathroom30 = 240 minutes; adding a30-minute extra gives270. A small Airbnb estimate150 becomes210. Its30-minute linen change can still leave the total below the210-minute floor. The floor does not promise that every extra increases the final booking total.

| Existing enabled extra | Added minutes per existing catalogue quantity |
|---|---:|
| Inside Oven, Laundry, Post-clean Photos, Water plants, Welcome Setup, Interior Windows | 30 |
| Ceiling cleaning, Balcony cleaning, Cupboards, Stain treatment, Kitchen, Sanitisation | 30 |
| Carpet cleaning, Mattress, Garage, Outside windows, Walls, Inside Fridge, Ironing | 60 |

This maps existing enabled extras; it neither enables an extra on another service nor changes its quantity unit, price or fee. Longer existing additions are rounded up to the next block, avoiding a shorter estimate. A newly created/unmapped extra requires explicit owner configuration. The business-specific choices live in `config/shalean-approved-durations.json`; no brand policy is hard-coded in shared validators.

Assessed totals must meet the minimum, use the configured block size and cover the calculated scope. A job over eight hours can be held as an unassigned draft/quote for assessment; it is never truncated or divided by cleaner count automatically. Existing quote and recurring agreement snapshots retain their original configurations and durations, even after catalogue edits.

## Daily assignment limit

The owner-configured `business_settings.max_daily_minutes` is nullable. Shalean's selected value is480. Other businesses receive no inferred value. Existing business settings RLS/audit continue to govern owner changes; managers cannot change this policy.

Before assignment, reassignment or rescheduling, the office records explicit setup and required work-travel minutes for the whole team. Blank means unreviewed; zero is an explicit decision. Where team members need different allowances, use a conservative plan sufficient for every member or separate the visits. The fields are planned capacity, not actual payroll or route-provider evidence.

Each cleaner's occupied interval begins before the customer's start by setup + travel and ends at the booked end. The daily sum includes the full booking duration plus those allowances for every assigned cleaner, across businesses. The full booking duration is counted conservatively even if it contains a break. The calendar must still reserve and respect required breaks; this increment does not certify continuous-work, weekly-rest, overtime, minimum-pay or employment-classification compliance, or personal availability. No actual-hours clock or earnings accrual is introduced.

Policy/day boundaries use the saved booking time zone. Work crossing midnight is apportioned by actual interval overlap with each local day. A stricter saved policy on an existing appointment continues to apply to that day's combined work, even when another business has no policy. A standard working-hours override cannot waive the daily limit. Eight hours is a daily total, not an allowance for each booking or a team-hours figure.

Existing assigned records are not backfilled or rescheduled. Their known booked time counts toward a new assignment. If another job on a capped day has unreviewed setup/travel, new assignments are held for review instead of inventing zero. Pre-start records can be reviewed using the reasoned schedule/team forms; completed history is not rewritten. Avoid adding retrospective assignments to a historical day with unreviewed completed work.

Booking writes lock private per-cleaner revision rows in stable order before checking workload and replacing reservations. Competing transactions therefore cannot both approve the same remaining capacity; repeatable-read contenders fail safely. Limit errors disclose no foreign customer, booking, business or financial details. Cancelling releases reservations; completed visits continue to count on their historical day. Ordinary progress updates do not reapply a new policy to unchanged legacy assignments.

## Delivery and activation

The additive migration is `supabase/migrations/20261021152058_t04_duration_workload.sql`. Apply after the current quote/earnings baseline, only to isolated FaraiOS staging. It changes no tenant settings or existing business records. Keep the application and database versions aligned: pull/restart the new local app before setting a daily cap or applying the new catalogue duration policy. Old application versions cannot enter work-plan fields.

Apply only the timing delta to the exact six current Shalean catalogue records with expected versions. Preserve current rates, fees, active extras, assessment flags, equipment, service IDs and team sizes. Record the before/after versions and audit writes. Bokkie remains unchanged. The separately saved earnings-rule `max_minutes` field guards one preview; it is not used as a substitute for daily assignment enforcement.

Validation includes six real configurations; floors and item combinations; assessment minimum/block rejection; quote and recurring snapshot protection; exactly480 and481-minute daily totals; cross-business limits; setup/travel overlaps; midnight boundaries; unknown legacy plans; cancellation; tenant/role denial; and independent-connection READ COMMITTED/REPEATABLE READ contention in CI.

T04 remains In progress for financial choices, statutory/pay safeguards, configured earnings previews and browser acceptance. Report schema delivery, policy activation and browser acceptance separately; neither a prepared migration nor passing synthetic tests means activation.
