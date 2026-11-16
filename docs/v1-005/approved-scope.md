# FaraiOS V1-006 — approved v1.0.0 scope

16 November 2026 · Owner approved operating/scheduling rules and selected South Africa · No deployment or launch approval

## Approved launch decision

FaraiOS v1.0.0 supports independent service businesses managing customer requests, deliberately agreed work, staff assignments, completion, invoices and manually recorded payments. The first fully accepted operating pilot is a customer-site cleaning business with one booking representing one scheduled visit. Quote-led jobs may use that same one-visit flow. Broader industry models require separate end-to-end evidence before being advertised as supported.

The owner approved the proposed operating and scheduling rules, then selected **South Africa** after the ZAR versus Zimbabwe/USD clarification. Supported launch test scope is **South Africa / ZAR / Africa/Johannesburg**. Zimbabwe/USD is not included in the first supported launch commitment. Existing Zimbabwe businesses, other configured countries/currencies, published websites, legitimate access and historical records remain intact. No geographic access restriction, currency conversion or historical migration is authorized. No FX, tax registration, VAT calculation, statutory invoice or country compliance certification is supplied by this software acceptance.

This decision specifies the target supported scope; V1-005 implementation and V1-009 evidence must pass before that support can be claimed complete.

## Included and excluded

| Area | Included for the approved target release | Excluded from the release promise |
|---|---|---|
| Business website | Existing draft/published profile, catalogue, services, coverage and contact pages | Custom-domain/paid hosting promises and industry-specific modules |
| Intake | Existing Service → Details → Schedule → Contact → Review; preferred time is a request; explicit business review | Instant confirmation or guaranteed public slot availability |
| Commercial work | Deliberate fixed/from/quote pricing; accepted agreement snapshots; manual booking with explicit unallocated status until staffed | General multi-visit work orders, staged billing, recurring dispatch and automatic price changes |
| Team | Accountable owner; existing Manager, Receptionist and Worker bundles within their proven permissions | Co-owners, ownership transfer and new role privileges |
| Scheduling | Explicit per-business hours, staff availability, worker conflicts, fixed buffers, atomic assignment/reschedule checks | Route/GPS estimates, room/equipment pools, specialist eligibility and automatic dispatch |
| Customer access | Secure guest request and purpose-scoped document links | General customer portal |
| Finance | Existing immutable issued invoices, one active invoice per booking, manual receipts, linked reversals/replacements | Online collection/refunds, FX, deposits, general tax engine and accounting integration |
| Communication | Existing enquiry/invitation transport and deliberate document-link sharing; lifecycle gaps remain V1-010 | New automatic customer messages or untested delivery guarantees |
| Platform | Existing hosting and Supabase Free, current backup/recovery contracts | Paid upgrades, universal-device or service recovery-time guarantees |

Excluded future capabilities remain in the roadmap. This decision does not delete them, disable legitimate existing features or close unrelated blockers.

## Approved V1-005 scheduling rules

1. Scope every rule, resource and write to an explicit business/environment. One worker can occupy at most one active job interval. Pending guest requests reserve nothing. Unallocated manual work must be clearly described as unallocated, without a capacity guarantee.
2. Each strict pilot saves explicit weekly working intervals in its IANA business zone. Do not invent a default working week for existing businesses. Missing required hours blocks strict staffing with a correction message. Schedule and availability changes must preserve their prior versions and must not silently invalidate accepted future work.
3. Worker time-off requests already exist, but are requests rather than an approved-leave contract. Treat submitted time off conservatively as unavailable for new strict assignments until explicitly withdrawn/resolved through an approved workflow; do not silently reinterpret it as approved leave or ignore it. The owner approved this conservative policy.
4. Use fixed per-business buffers before/after the job; use 30 minutes before and 30 minutes after for the mobile cleaning pilot, following existing rehearsal defaults. Their combined effect means 60 minutes between two jobs. Expose that meaning clearly. No route/travel guarantee.
5. Use half-open occupied intervals [start − before, end + after). Adjacency is allowed only when the buffered intervals do not overlap. Validate entire multi-day intervals, local-midnight transitions, DST gaps/folds and saved-zone consistency. Existing jobs keep their saved time zones.
6. Confirm, assign and reschedule through one database transaction with a common resource-locking order. Validate every selected worker and all affected intervals before changing anything. Concurrent conflicting submissions yield at most one successful reservation; multiworker assignment is all-or-nothing. UI checks alone cannot enforce this.
7. Reject stale versions, inactive/new wrong-scope staff, time-off conflicts, outside-hours and buffered collisions. Keep existing saved assignments and entered form fields/tokens on rejection. All owner/delegated/direct API paths must agree. Preserve current role restrictions and immediate revocation.
8. Existing overlapping/inactive/unallocated historical jobs remain readable and fulfilment history remains intact. Inventory them at activation for review. Do not cancel, shift, reprice or delete them. The approved activation policy is explicit opt-in for new strict pilots, with pre-existing obligations grandfathered only while their schedule/resources remain unchanged. Never silently switch legitimate businesses to strict enforcement.
9. No recurring automation, temporary holds, resource-capacity pools, room/equipment scheduling, service-location matching or new dashboards are necessary for this bounded first pilot. A future operating model needing them stays unaccepted until its own tests pass.

## Acceptance and traceability

| Task | Required evidence before Verified |
|---|---|
| V1-006 | Owner approves supported model/countries/currencies, exclusions and scheduling policy. Record approved scope; align V1-005/V1-009 without weakening their original acceptance or clearing other blockers. |
| V1-005 | Reproduce installed overlap behavior first; native transactional races, owner/delegated/direct API denial, hours/time off/buffers, stale versions, reschedule/assignment races, DST and exact existing-history preservation. Exact-candidate CI, mobile form recovery, isolated rollback, reviewed hosted synthetic verification and scoped installation if required. |
| V1-009 | Fresh fictional independent owner/business and outsider; configure services and website; exercise publication in a non-public isolated preview, five-step guest request, deliberate price/acceptance, safe assignment, completion, invoice/manual receipt. Repeat cancellation, correction/reversal/replacement, idempotent retries, cross-business/environment and revoked-role denials. Preserve issued originals and audit history. |

No public site publication, real invitation, customer message or real payment is authorized by this proposal. The pilot publication criterion can be rehearsed on a non-served isolated copy; a public hosted publication needs explicit authorization and cannot be silently waived or counted as passed.

## Delivery controls and decision

Use an isolated repair branch based on the exact installed V1-017 packet, not a whole main/feature deployment. Prepare additive migration and bounded runtime deltas only after the owner scope decision. Record exact preimages, configuration contracts and updated release-manifest delta. Run synthetic tests, CI, private recovery and guarded rollback preserving all new records. Review exact live scope before any deployment; retain all overlays and concurrent SEO/dashboard work. No merge/main change or database-data restore.

Current checkpoint remains 16/30 Verified, 12 blockers, launch HOLD. V1-006, V1-005 and V1-009 are not Verified by this proposal. The owner decision is recorded above. Implementation and pilot evidence remain pending. No date, cost, paid upgrade or release commitment is made.

## Release acceptance alignment

The decision changes no original task checklist or completion threshold. Existing Verified tasks retain their exact tested scope. V1-005 must prove transactional staffing constraints for the approved one-visit model; V1-009 must prove a fresh ZA/ZAR cleaning pilot and retained history. V1-002 phone/auth recovery, V1-010 communication, V1-011 catalogue configuration, V1-014 operational ownership, V1-015 privacy/lifecycle and V1-016 mobile/accessibility remain separate release gates. Financial acceptance remains integer-hundredths ZAR/manual records with immutable issued documents. V1-017 remains the installed baseline; any later repair must supply an exact manifest delta. Broader cross-industry/visit/resource/automation plans remain future work; no task is waived or relabelled Verified by scope exclusion.

Decision evidence: owner said “Yes I approve” to the operating/scheduling proposal, then selected “South Africa” after the country/currency clarification. V1-006 can close as a scope decision once this record and its acceptance alignment are saved; it does not close V1-005 or V1-009 or authorize public launch.
