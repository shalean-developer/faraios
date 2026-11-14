# Combined foundation release preparation

Status: verification in progress; production authorization not requested.

Base: main dbf9d61e706c08082395d3b643c9a2b38b8b3d42 (includes homepage #47, F06 #45/#46).
Application stack: #35 7b5802567e2b10508108a84d76bad128daf3e340;
#36 51a0fa1fc6d70fd3e95a52a29813ac5078be61ad;
#37 44f4930e4a4b8c11f338015b1be55e3532be1b47;
#44 658dde7122a823b9aaba59213aba989d7a746b47.
Clean integration uses both parent ancestries. Existing F06 backup/recovery/independent
monitor workflows and scripts are unchanged. Original stack branches are retained.

## Prepared activation (NOT applied to hosted database)

`release/activate-foundation.sql` is an explicit transactional production activation
migration, deliberately outside automatically applied migrations. It refuses unexpected function-body drift before changing anything and replaces only
three function bodies: free-quote trigger, deliberate send RPC implementation and
invoice writer. Existing ownership, non-anonymous JWT, enabled environment ingress,
optimistic version, financial locks and historical constraints remain. It accepts
live and preview, rejects NULL/unknown environments, and changes no table rows,
issued snapshots, tokens, ledgers, counters, publication or intake flags. No backfill
or retroactive confirmation of existing sent quotes occurs.

Application switch `foundation_release` is false unless explicitly true in the private
account configuration. Preview is always enabled. The switch routes live sends through
the deliberate RPC and replaces incomplete customer sign-in promises with Customer help.
Deployment to preview does not alter live configuration. Supabase stays Free.

After explicit production authorization only: capture/check backup and preservation
baseline; merge the approved candidate through green checks; apply activation SQL;
set private live account configuration `foundation_release => true`; recycle PHP workers/clear the opcode cache and verify the switch through the real HTTP journey; recapture encrypted
configuration; deploy approved application; verify source, financial guards, help and
monitor signals. Keep live booking intake disabled and all publication flags unchanged.
A database activation without its matching application switch is not a complete release.

## Rehearsal

The combined gate includes `tests/production-activation.py`: establishes issued/void
invoices and payment/reversal history first, compares all selected public/private table
contents before/after applying activation twice, proves native live send denial without
free confirmation and real PHP HTTP send with it, cross-owner/unknown-environment denial,
concurrent replacement deduplication, corrected issuance, original/ledger equality,
deactivation equality and reactivation equality. All targets are disposable.
Other combined suites cover preview, customer access, enquiry workflows, business isolation,
financial history, concurrency, publication/intake boundaries, failure/recovery and restore.
Provider Auth/REST transports are simulated in this gate. Hosted browser evidence is separate.

## Rollback

Before activation: restore preview repository to #44 658dde7; retain all additive schema/data.
After an authorized production release: first disable `foundation_release` in private live
configuration and recycle PHP workers/clear opcode cache, apply `release/deactivate-foundation.sql` to restore preview-only financial
activation, then restore the prior approved application. Keep additive schema, correction
links, issued originals/replacements, numbering, audit/events and payment/reversal history.
Never restore the old one-invoice-ever constraint or replay a backup over current records.
Existing issued replacements remain readable. Verify intake/publication flags and original
fingerprints; recapture encrypted private configuration after any configuration change.

## Verified candidate — 14 November 2026

**Technical PASS for owner preview review. No production application authorization or deployment.**
Runtime deployed only to accounts-preview: `e2855d39d666585e60bbc2700e06d01180b84437`.
PR #48 is the combined release vehicle; retain original #35/#36/#37/#44 branches as
source/audit history and do not merge those independently after releasing #48.
Main remained `dbf9d61e706c08082395d3b643c9a2b38b8b3d42` after verification.

Native combined CI [43642862086](https://github.com/shalean-developer/faraios/actions/runs/43642862086)
PASS: 25 suites, 34 Python methods plus PHP assertions/syntax. Clean tested merge
`81445f525d82564b45635de5aff5f4f219d78378`, PG16.15/PHP8.3.6/Python3.12.3.
Backup regression [43642862068](https://github.com/shalean-developer/faraios/actions/runs/43642862068)
and private configuration recovery [43642862108](https://github.com/shalean-developer/faraios/actions/runs/43642862108)
PASS. Native activation applies twice without data change, exercises live financial guards,
concurrent replacements, original/ledger equality and rollback/reactivation equality.
Early activation HTTP failures revealed cached PHP private configuration; recycling the worker
makes the real HTTP confirmation pass. Production activation/rollback instructions now require
worker/cache recycling. No failing activation was applied to the hosted database.

Hosted rollback-only `tests/foundation-hosted.sql` PASS on current project PG17.11.0.019:
free confirmation/legacy bypass, acceptance, financial prerequisites, replacement/issuance,
original/ledger preservation and outsider/anonymous denial. Claims are simulated for these
SQL probes; they are not a new hosted user-login/concurrency exercise. No fixture retained.

Fresh actual Chrome/PHP/Supabase journeys after deployment:

- Existing enquiry exposes private follow-up/notes and linked quotes. Conversion carries all
  4,000 requirement characters, excludes its private note and starts with blank unknown prices.
- Missing item price rejects. Explicit zero saves; unchecked extra free checkbox blocks send.
  Confirmed quote `93C622D2` is Sent with database confirmation timestamp and 4,000 notes chars.
  It remains a clearly fictional review fixture; no email was sent. One post-submit browser
  read timed out; saved state was inspected before proceeding, with no duplicate submission.
- Original `4A8AF093` / INV-000004 remains Void at ZAR250.50 with fictional ZAR100 payment
  and its reversal. Replacement `99B8E44F` / INV-000005 remains issued at ZAR300. Repeating
  Create/open replacement returns that same issued replacement; no new row/event is created.
  Original confidential customer link still shows the original number, amount and Void state.
  Full editable replacement creation/save/issue and concurrency are exercised natively and by
  hosted rollback probes, not repeated by creating another persistent invoice.
- Customer help has no credential form and explains single-document bearer links and limits.
  Guest booking Service→Details works, all five progress steps remain, and help→Back restores
  fictional address/notes and Details selection. No booking request submitted; ephemeral draft
  tab closed after testing.
- Owner enquiry/quote/invoice and Customer help fit at actual 1280/390/320 viewport widths:
  document widths 1265/375/305, respectively. Original public invoice fits at 390 (width375).
  Mobile/desktop visual inspection passed; viewport restored. Internal narrow-screen business
  navigation scrolls independently; no page overflow.

All 17 original public-table counts/full-row fingerprints match after the tests, excluding
only the one newly added quote. No existing row changed, including issued documents,
payment/reversal records and published content. Full non-secret comparison is in
`docs/evidence/production-release-preservation.json`. Live booking intake=false,
preview=true; enquiry mail live=true/preview=false. Supabase organization plan remains Free.
Existing two Security Advisor warnings (mail-status definer, leaked-password protection)
and private deny-by-default informational findings remain; no schema was applied in this task.

Review [owner preview](https://www.faraios.com/_accounts-preview/account/quotes.php?id=93c622d2-842d-e78c-881d-a3d2f4c4035a)
and [customer help](https://www.faraios.com/_accounts-preview/account/customer.php?slug=faraios-demo-cleaning).
Supported readiness is the existing enquiry/quote-led foundation with secure document links.
Full customer accounts, delegated staff access, enforced availability and broader industry
capabilities remain outside this release. Existing F06 recovery limits/objectives still apply.
