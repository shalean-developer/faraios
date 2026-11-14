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
migration, deliberately outside automatically applied migrations. It replaces only
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
set private live account configuration `foundation_release => true`; recapture encrypted
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
configuration, apply `release/deactivate-foundation.sql` to restore preview-only financial
activation, then restore the prior approved application. Keep additive schema, correction
links, issued originals/replacements, numbering, audit/events and payment/reversal history.
Never restore the old one-invoice-ever constraint or replay a backup over current records.
Existing issued replacements remain readable. Verify intake/publication flags and original
fingerprints; recapture encrypted private configuration after any configuration change.
