> Execution update: staging setup was subsequently authorised. The D20 wording replacement and L20 NOTE amendment were applied and read back on30Oct2026; H20/H21 retained. The original proposed value append below was not used because L20 already contained49,980characters. See t19-standard-staging-setup-20261030.md.

# Prepared canonical T19 update — not applied

Destination: FaraiOS Build Plan and Progress Tracker, Build Tracker row20 (A20=T19). Re-read exact row/cell metadata and existing notes before applying; preserve history and guard concurrent edits.

- H20: retain `In progress`.
- D20: retain independent invoice identities/connections, connect-once, scoped automatic refresh, authorised background sync, visible failures, recovery and environment separation. Replace architecture-specific custody wording with: `Standard Zoho Books Server-based OAuth in the FaraiOS backend, backend-only client configuration and encrypted per-business/environment tokens in restricted storage, under T19-AMEND-20261030-STANDARD.`
- E20: retain all business/security acceptance outcomes. Explicitly record that account-level OAuth is constrained through verified intended org, pinned routing and negative tests; a sole-org listing is not a universal OAuth guarantee. Preserve consenting-identity/permission evidence and uncertain-write reconciliation.
- L20: APPEND, do not replace history: `30Oct2026 owner authorised replacing the separate custody service with standard server-side OAuth inside FaraiOS. T19-AMEND-20261030-STANDARD supersedes custody-process/mTLS/Vault architecture requirements only; applicable business isolation/security/recovery gates remain. Bounded source preparation has 12/12 isolated tests; A–F hosted/provider acceptance remains pending. No deployment, credentials, migration, activation or financial write performed. T19 In progress; T20 Not started. See docs/t19-standard-integration-amendment-20261030.md on the eventual reviewed source revision.`
- F20: retain T18. I20/J20: preserve dates. K20: preserve existing evidence and add replacement evidence only when a reviewable remote revision exists.
- Add a T19 Evidence entry linking the amendment and bounded test result; retain prior T19 evidence rows. No other task status, dependency, dates, totals or Overview summary is rewritten in this update.

No canonical cell was changed during source preparation. This delta is review material, not an assertion that the canonical record has been amended.
