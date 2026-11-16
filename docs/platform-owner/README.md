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

Enable only with an explicitly verified owner UUID; keep configuration mode0600. The owner selected and verified owner@faraios.com; its immutable Auth UUID is allowlisted privately. The UUID is not kept in repository configuration. Missing config, disabled config, anonymous, unverified and non-allowlisted users cannot read tasks or export history.

## Files and state

The five new account runtime files are platform.php, platform-core.php, platform-seed.php, platform.css and platform.js. No existing application runtime changes. The seed is a PHP return value; direct HTTP emits no task data. The editable tracker is JSON outside web root in a base-URL-specific private directory, mode0700, file/lock0600. Preview and live use different directories. An exclusive lock, whole-store revision and atomic rename prevent lost updates; stale POST input remains visible without retrying writes. Initial GET reads the seed and does not reset or overwrite saved state. Full before/after change history is retained in the same atomic record. No deletion action. Export is authenticated and includes full history; keep exports private. Storage fails closed on invalid JSON and has explicit size/task limits.

Every saved revision now first writes an AES-256-GCM snapshot, with its random data key wrapped using the existing RSA recovery public key, into private recovery storage. Saving fails if the snapshot cannot be written. The matching existing private recovery key and its separately retained passphrase are required for recovery; neither is held in the web application. Recovery, wrong-key and tampering tests pass. The bounded installer seals the preview state, rehearses restoration of actual task/history bytes with a disposable key, and copies the state unchanged to the live base-URL-specific directory. Host-local snapshots do not protect against loss of the hosting account: retain authenticated exports or encrypted packets in independent secure storage. Database backups do not include host JSON files.

## Usage

An expandable Development menu contains Overview, Tasks, Defects, Releases, History and UI review. UI review lists the 43 existing synthetic preview pages and opens them in separate tabs. Search/status/priority filters; ten task cards per page; create/review/edit tasks; release blockers; acceptance checklist; dependencies; evidence links/notes and export. Release progress is a task count, not an estimated percentage of software completion. Only Verified counts as verified. Completing all checklist items, entering evidence and verifying dependencies is required. Dependency cycles reject; reopen verified dependents first. Changing checklist wording requires saving and accepting it again. Updating a task does not deploy or independently validate a feature.

Seed: all20 owner checklist requirements, plus2 retained verification records and2 explicitly deferred tasks (24 stable task records). See checklist-map.md. Verified baseline entries have cited existing evidence. The audit scope and date are visible; future status changes are owner assessments. Source seed refreshes never overwrite persisted owner edits.

## Validation and deployment

`python3 tests/platform-owner.py` runs real PHP HTTP with a fake local Auth transport and private disposable state. Tests cover anonymous/business-owner denial, disabled configuration, CSRF/origin, create/save/refresh, stale replay, HTML escaping, verification/dependency gates, protected export and private modes. It does not claim hosted email or a real platform-owner session test. Existing UI/baseline tests continue to enforce preservation. CI runs this suite with native PHP.

Install only the five additive files to an isolated preview. Do not replace account/core.php or any staged repair files; whole-repository deployment is inappropriate while the live runtime uses prepared shared-role transforms. Leave private platform-owner config absent until explicit identity verification. No SQL required. Rollback removes/disables entry files while retaining all private tasks/history and business records. Production installation and owner activation are separate from this preview preparation.

## Authorized dashboard-only production installation

The owner authorized deployment on 16 November 2026. Run the CLI-only `scripts/platform-owner-release-20261116.php` privately through the host task runner. It pins the five runtime files to source commit `49509da913f952208c3e257427e95a6e5316c4b4`, refuses pre-existing targets/live state, encrypts and rehearses task-history recovery before copying, installs the entry file last, and compares all existing account-file hashes and private configuration hashes afterward. It performs no SQL, provider, business-record or role changes. A private receipt allows safe verification on repeated execution. It does not deploy PR68 repairs or announce v1.0.0 readiness.

For an interrupted install, inspect the private stage and receipt before retrying; do not overwrite an existing live tracker. Rollback disables/removes the five newly added runtime files and retains private task/history and recovery packets. Restore a packet in an isolated private directory using `platform_unseal`, the retained encrypted private key and passphrase; validate task/history and revision before any replacement of live state.
