> **CORRECTION — 5 November 2026, after exact backup-SQL reproduction:** The earlier NO-GO conclusions in the historical investigation below were based on diagnostic catalogue projections that did **not** use the effective V3 backup pipeline's required `SET LOCAL search_path = ''` and `to_jsonb(pg_sequences)-'last_value'` normalization. Executing the corrected read-only transaction with `search_path=''` reproduces the ORIGINAL V3 hashes exactly: raw catalogue `6ab220df693da9748332e5eaa874231ed6fc6c21df293d91873219cf84d0ba14`, portable application `2fc21b9e8cbee3e0b97b978ad774d7cd1aac9dae475947ff2ac3a5575b768797`, managed `b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23`. Hence the assertion of a **current V3 fingerprint mismatch is withdrawn**. The raw untransformed CTE variants `c3a84e04...` and `71747d9b...` are not valid profile comparisons. The 43-vs-45 private-function historical count difference remains unattributed; matching the exact V3 structural fingerprint is strong evidence for current catalogue continuity, but does not prove complete historical audit provenance or backup recovery. **Do not rebaseline, create, or activate a replacement V3 profile. Keep original protected `current.json` unchanged.** Backup itself still requires independently verified write freeze and operational prerequisites; no backup/restore/migration occurred. The remaining sections below are retained as superseded investigative history, not current decision authority.

# T31-A02 — Read-only catalogue drift forensics (5 November 2026)

**Decision:** Backup still **NO GO**. This file only records current read-only metadata and approved next verification steps; it does NOT authorise V3 rebaseline, staging backup, migration, restore, write freeze, Plesk change, email or production action.

## Chain of custody

- Canonical T31 remains In progress. PR #313 was source-only merged into staging at `3d1de9155cbb09e4e95d8e6b64699351716e62bc`; PR #314 is a Draft proposal and remains unmerged.
- Owner local checkout `b7019f83813bc0467d2c98a15c597d16348bece9`, clean working tree. Backup implementation and pinned catalogue projection source blobs are the same as current staging. Owner verified V3 `current.json` matches unmodified candidate `profile-v3-t30-candidate.json` across all seven checked fields and owner-only ACL inherited access is disabled.
- Historical V3 expected SHA-256: raw catalog `6ab220df693da9748332e5eaa874231ed6fc6c21df293d91873219cf84d0ba14`; portable application `2fc21b9e8cbee3e0b97b978ad774d7cd1aac9dae475947ff2ac3a5575b768797`; managed `b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23`.
- Independently observed live catalogue `c3a84e04e1c1708adbeb57d51318ce3c5abf794f917f552b5c6a6b062a2b0198`, portable application `70d9924639df9dddb4b126609e297079b999d850e9d2461c5fa4c236df3fec09`, managed `b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23`. The live portable query was rerun after the mismatch and returned the same application/managed values.
- Live staging still has 2 businesses, 5 active/total memberships as previously counted, 53 catalogue items, 353 audit events, 30 public+audit and 35 private tables; `private_t31` and T31 wrappers remain absent. Supabase migration ledger ends at `20261102081254_t27_operational_report_readonly` (56 migrations).
- Older 26 Oct T19 differences affect Auth indexes and Storage relations. They are **not** a valid Nov 4 application-baseline explanation. The 3 Nov T30 review cited 45 private functions, while the current seven protected schemas have **43**: `private_t19_custody:11; private_t19_standard:11; private_t20:8; private_t21:2; private_t22:1; private_t25:6; private_t26:4`. No same-date named function list is available to establish which two differ, so do not claim deletion or assign cause.

## Independent current portable application component fingerprints

The current component-only query was derived from the exact committed `scripts/t30-private-restore-catalog.sql` by replacing the final `jsonb_object_agg` with `jsonb_each(c.value)` and `extensions.digest(e.value::text,'sha256')`. Only component names/counts/digests were returned; **no function definitions, Auth identities, secrets or business rows** were exported.

| Application component | Entries | SHA-256 |
|---|---:|---|
| column_acl | 11 | `073940385ab3db30f7f2e34ce9f8ef87d42d9e9611ec656c4641287fe9cdfc6b` |
| columns | 577 | `743af3deb9b2951ff8891b8a78cbec629db85b84d6803dff20b138fe7f520b4b` |
| constraints | 416 | `83ba351e87102e66c71bca1dcf36f00ede2d4c09788b272238f9055d1a1e0217` |
| default_acl | 6 | `a047949e84b86980bdd561058c1da8719cfa54f9f3ff961ce1882f2d9c8e2e4d` |
| functions | 151 | `6de4e5dfa12f9a904adcac2db3ae68d7c91531ed19533499de5a3ad5d9f80a31` |
| indexes | 164 | `1371d8661a9d1406dc162272edc852636823020c05a04c599f120432df71a279` |
| parameter_acl | 1 | `57f05ecb9cf14fa5651e03f324a061e0111229195e8afc828f7f74b97f52d796` |
| policies | 60 | `f93349b220b07c97fefea9f2ed92e7dcf818b5251c4fd4129421044ffe46b673` |
| relations | 69 | `00893eaeefd0334eaad3a0311fb7facb679ece57342e7a8cee21a2875f49b864` |
| role_capabilities | 34 | `73174c3cd2cccaf0727b5b46aa0dbf10c8821a3bc1e52e6ac7192fb77a8e9660` |
| role_memberships | 30 | `72a36edf6b9040cfc74bde069994c063ed7f58a8dee6f080245807169257f9f4` |
| schemas | 10 | `eeba624e690371b64f6a0e390c10b3da64461f21182dee7ed3c1e3c1dbc59009` |
| sequences | 3 | `1079fcfd3442414740d6a034a227afa5152514f5f929ccf2dde24271bd3a962c` |
| triggers | 51 | `6ec5f5d91265f040c412d4bf2671cf26fabae5bf3a998d773c8c2e6dc9218c3c` |

The `custom_types`, `enums` and `views` components are JSON null and do not contain rows. This table is a **present-day baseline only**; without a Nov 4 component manifest no historical per-component equality/inequality is provable. In particular, the difference in top-level hashes does not prove that every component above has changed.

## Current-state least-privilege review (read-only)

This is a **partial present-state security verification**, not a certification of the historical migration contents, full access matrix or all API pathways.

- All `public` 27, `audit` 3 and exact 35 private T19/T20/T21/T22/T25/T26 application tables have RLS enabled, and each currently has the expected `postgres` table owner. Verified by `pg_class`/namespace owner inventory.
- No `PUBLIC` table grants were returned on the seven protected schemas by `aclexplode(coalesce(relacl,acldefault('r',relowner)))` in the checked table scope.
- No direct `SELECT` or `INSERT` privileges were returned for `anon` or `authenticated` on those protected tables, in the checked table scope.
- The private schema function count by schema is 11, 11, 8, 2, 1, 6, 4; 39 of the 43 functions are SECURITY DEFINER. All 39 have an explicit function-level `search_path` in `proconfig`. This check does not establish that each function body is safe or that every grant is correct.
- The `anon`, `authenticated`, `t19_hosted_custody`, `t19_runtime_owner`, `t19_standard_backend` and `t20_payment_verifier` roles show `rolsuper=false`, `rolbypassrls=false`, `rolcanlogin=false` and `rolcreaterole=false`. This is limited to the named roles; other grant paths and runtime transport require separate review.

- One explicit exception exists for **function EXECUTE**, separate from table access: the `anon` role has schema USAGE on `private_t25` and EXECUTE on `private_t25.portal(route text,action text,payload jsonb)`. This is present in the committed `database/t25-customer-portal-candidate.sql`, which explicitly grants both and checks `private_t20.live_session()`, `auth.users` identity and non-anonymous status inside the privileged function. Its function-level `search_path` is explicitly empty. This appears to be a **documented T25 public-route compatibility exception**; it is not a claim of a successful live anonymous denial test and must remain in native security regression. Other six private scopes had zero anonymous EXECUTE results in the inspected function inventory.

**Evidence interpretation:** No tested emergency privilege escalation or missing RLS was identified in these queries, but the original 4 November object-level baseline remains unavailable and the exact cause of application/catalog fingerprint drift is still unresolved. Do not infer that the old V3 profile can be activated safely.

## Follow-up preservation and limited log check

- Repeated read-only row fingerprints (same selected-fields algorithm as the previous staging review) match the earlier 5 Nov checkpoint: businesses 2 / `c4e263bfc29b5c36d7bc23819986d688`; memberships 5 / `c23c10e0c49dd5ab414005b52baba0ac`; catalogue 53 / `639535f3f8677731c4bd24e57bbe2c2e`; audit.events 353 / `562ddc22e3d722155ab4db9eeeb8ac20`. These are **partial field-level checks**, not complete backup, guarantees of database immutability, or proof of no other writes.
- The Supabase PostgreSQL log stream for **4 Nov 04:45–5 Nov 04:45 UTC** contained 577 postgres events; a read-only **text-pattern** aggregate found zero matching `CREATE FUNCTION`, `DROP FUNCTION`, `ALTER FUNCTION`, `CREATE ROLE`, `ALTER ROLE` or `GRANT` strings in those log attributes. **Do not infer no DDL occurred:** PostgreSQL may not log successful statements, or the relevant event may be absent/expired. No log content or private SQL statements were exported.
- The discrepancy between T30's documented 45 private functions and today's 43 therefore remains **unexplained**, not disproved. Hash comparison cannot determine which component changed without a saved older component manifest or an independently accepted current-state risk rebaseline.

## Required safe closeout

1. Obtain a **verifiable Nov 4 V3 component/object-level structural snapshot** or explicitly record its absence. Do not infer old component values from SHA-256 digests: cryptographic hashes are one-way.
2. If available, run object-level diff for function names/signatures/security definer/owner/body fingerprint, roles and memberships, table/sequence definitions, policies/grants/default ACL, and migration and deployment provenance. Preserve managed unchanged evidence. Classify every delta with an approved decision and an owner.
3. If unavailable, perform an **independent current-state security and recovery scope certification** from the approved migrations, access matrix, exact private V3 table inventory, role grants and synthetic native RLS tests; enumerate which historical changes remain unprovable. A current-state certification is a risk-based alternative, **not a retrospective drift explanation**.
4. Only after independent risk sign-off, propose a **new owner-only V3 profile candidate** with current exact fingerprints; preserve original V3 and ACL/history, verify catalog/application/managed values twice and in an operator-controlled write freeze, and obtain separate explicit owner approval before activating it. Do not manually edit the original `current.json` or weaken `validateScope`/metadata assertions.
5. For the previously approved **one pre-migration staging backup**, verify T19 cron/provider/no-write fence, snapshot keeper/TLS/credentials and protected V3 ACL; execute owner-local interactive backup, verify archive and checksum with existing helper. Fresh archive alone does not prove recoverability; independent empty-target full restore requires another specific approval.
6. Post-T31 branding/invitations add five scoped tables, execution roles, a private identity sequence and an unbounded SaaS tenant growth problem. Existing V3 capture is incompatible after that migration; the inactive V4 scope proposal requires a separately qualified post-migration capture/recovery implementation.

**Current NO GO:** No hosted backup executed or independently verified; no profile rebaseline, staging migration, provider activation, live signup or deployment. T31 In progress · T32 Not started.
