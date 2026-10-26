# T11 compatibility supporting T19

This bounded change separates reviewed current-schema metadata from reusable backup validation. Live profiles and detailed recovery evidence remain in protected local storage outside Git. Public tests use synthetic profiles only.

The local profile contains a version, reviewed source identity, scope identifier, complete sorted application/audit table allowlist, and raw/application/managed catalog fingerprints. It is an owner-controlled trust anchor; it must never be populated automatically from an archive or live inventory. Profile updates require review. The loader uses the existing T11 canonical-path, outside-Git, ownership and ACL safeguards, rejects links and malformed configuration, and detects file replacement/content changes during an operation. It does not repair unsafe permissions. Missing or invalid profiles block new captures before Docker or export.

Exact table identities, postgres ownership, RLS, source identity and all catalog hashes remain mandatory. The original archive validation branch and immutable restore configuration are unchanged. New capture cannot fall back to the historical count-based scope. Both catalog projections share the existing read-only snapshot; encryption, TLS, dump coverage, row consistency, cleanup and retention protections remain in place.

The offline checkpoint verifier authenticates the archive and validates the reviewed catalog and SQL replay envelope. Its result explicitly says restore NOT_RUN and recovery readiness PENDING_ISOLATED_RESTORE. It does not repoint or authorise the historical restore destination.

No profile, backup, keys, recovery locations or detailed manifest belongs in public Git, PR descriptions, logs or CI artifacts. No GitGuardian exclusion or workflow relaxation is required. Public publication, governed merge, capture and hosted acceptance remain separate decisions. This local implementation performs no staging export, hosted migration or activation.

T19 In progress; A12 unresolved; Accounting activation NO-GO; T20 Not started.
