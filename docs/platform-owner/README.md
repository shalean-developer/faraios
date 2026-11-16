# FaraiOS platform-owner release tracker

This work package adds a small protected tracker, not a tenant administration console. It never deploys code, sends messages, reads tenant records, changes roles, collects payments or activates intake.

## Entry and access

Entry: `/account/platform.php` (under the selected deployment prefix). It reuses the existing verified Auth session, session expiry, CSRF, CSP and private account configuration. Every page, POST and export revalidates the signed-in account through Auth before comparing an immutable UUID against a private explicit owner allowlist. Business ownership, user metadata and email text never grant platform access. No service-role credential is used.

Access defaults to denied. Before activation the owner must identify the intended verified FaraiOS account and confirm its immutable Auth identity. Never infer software ownership from the browser's currently signed-in business account.

Private `platform-owner.php` example (outside web root):

```php
<?php
return ['enabled' => false, 'owner_ids' => []];
```

Enable only with an explicitly verified owner UUID; keep configuration mode0600. No account identity has been supplied or granted by this work package. Missing config, disabled config, anonymous, unverified and non-allowlisted users cannot read tasks or export history.

## Files and state

The five new account runtime files are platform.php, platform-core.php, platform-seed.php, platform.css and platform.js. No existing application runtime changes. The seed is a PHP return value; direct HTTP emits no task data. The editable tracker is JSON outside web root in a base-URL-specific private directory, mode0700, file/lock0600. Preview and live use different directories. An exclusive lock, whole-store revision and atomic rename prevent lost updates; stale POST input remains visible without retrying writes. Initial GET reads the seed and does not reset or overwrite saved state. Full before/after change history is retained in the same atomic record. No deletion action. Export is authenticated and includes full history; keep exports private. Storage fails closed on invalid JSON and has explicit size/task limits.

Add this private directory to the existing encrypted application-state backup allowlist before treating this tracker as the sole authoritative project register. Current database backups do not automatically include a host JSON file. The initial seed remains reproducible; subsequent edits require an exported/encrypted copy. This is an explicit preview limitation and activation gate, not a claim of completed operational backup integration.

## Usage

Overview, Tasks, Defects, Releases and History. Search/status/priority filters; ten task cards per page; create/review/edit tasks; release blockers; acceptance checklist; dependencies; evidence links/notes and export. Release progress is a task count, not an estimated percentage of software completion. Only Verified counts as verified. Completing all checklist items, entering evidence and verifying dependencies is required. Dependency cycles reject; reopen verified dependents first. Changing checklist wording requires saving and accepting it again. Updating a task does not deploy or independently validate a feature.

Seed: all20 owner checklist requirements, plus2 retained verification records and2 explicitly deferred tasks (24 stable task records). See checklist-map.md. Verified baseline entries have cited existing evidence. The audit scope and date are visible; future status changes are owner assessments. Source seed refreshes never overwrite persisted owner edits.

## Validation and deployment

`python3 tests/platform-owner.py` runs real PHP HTTP with a fake local Auth transport and private disposable state. Tests cover anonymous/business-owner denial, disabled configuration, CSRF/origin, create/save/refresh, stale replay, HTML escaping, verification/dependency gates, protected export and private modes. It does not claim hosted email or a real platform-owner session test. Existing UI/baseline tests continue to enforce preservation. CI runs this suite with native PHP.

Install only the five additive files to an isolated preview. Do not replace account/core.php or any staged repair files; whole-repository deployment is inappropriate while the live runtime uses prepared shared-role transforms. Leave private platform-owner config absent until explicit identity verification. No SQL required. Rollback removes/disables entry files while retaining all private tasks/history and business records. Production installation and owner activation are separate from this preview preparation.
