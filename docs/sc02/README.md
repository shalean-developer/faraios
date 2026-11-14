# SC-02 — Contract inventory and baseline fixtures

Date: 15 November 2026 (Africa/Johannesburg). Foundation F01–F06 remain complete. Baseline source: main `e0d45923b441d7833e048faa041a3f0e16cfe1e2`; authority: current Foundation Plan v20, SC-01. This package is documentation/tests only, on a separate branch. Main automatically deploys through Plesk; **do not merge this package without considering that deployment path**. No deployment or merge is part of SC-02.

## Deliverables and source findings

| Item | Evidence / result |
|---|---|
| Contract inventory | [Source index](source-index.md), [machine inventory](contract-inventory.json): 29 migrations + 2 manual release scripts; 493 SQL statements; 31 tables (17 public/14 private); 3 invoker views; 79 function names / 81 overload identities / 109 definitions; 23 policies; 87 GRANT and 78 REVOKE statements; 96 application HTTP/RPC sites, plus local-I/O/query sites. Counts describe source declarations/history, not effective hosted privileges. |
| Snapshot versions | [Legacy inventory](legacy-snapshots.md): unversioned profile/catalogue/document generations, explicit scope.schema=1, row vs schema versions, backup v1/v2 and private config v1. |
| Synthetic baseline | `tests/fixtures/sc02/baseline.json` and fingerprint lock: three model identities plus outsider, seven pricing cases, legacy documents/profiles, preservation projections and rejection cases. No customer records, real tokens or credentials. |
| Role-action catalogue | [20 actions](role-actions.md), [machine contract](role-actions.json): SC-01 owner/manager/receptionist/worker/customer boundaries plus outsider tests. Current owner-only authorization is not broadened. |
| Preservation manifest | [Gates](preservation.md), [148-file manifest](preservation-manifest.json), fixture hashes; all original rows/documents/financial history/publication to remain unchanged in later adoption except specifically approved link metadata. |
| Pilot defaults | [Frozen defaults](pilot-defaults.json): synthetic preview only, one accountable owner, fixed delegated bundles disabled, request-first, ZAR, manual finance, one active invoice, guest/exact-document access, conservative travel buffers. Three operating models are future proof cases, not supported-product claims. Numeric 30-minute mobile buffers are rehearsal parameters, not a live configuration or empirical travel guarantee. |

Important dependencies found:

1. `business()` selects one owner-visible business (`limit=1`); ownership is UNIQUE. Profiles/catalogues/media/enquiries/quotes/bookings/customer policies partly rely on `businesses` RLS. Broadening that SELECT alone would broaden dependent access. Other RPCs explicitly check owner_id/nonanonymous claims and must change together for delegated roles. Owner SELECT does not universally restrict environment.
2. Source grants include direct businesses insert/update columns, profile/catalogue DML, public-page DML and enquiry status/notes/follow-up updates. RPC-only UI is not proof that direct API mutation is denied. Existing RLS, constraints and triggers remain part of the contract. Private helpers with schema USAGE/EXECUTE must enter denial tests alongside public wrappers.
3. All three views are `security_invoker=true`. Quote expiry is derived using saved sender zone; invoice paid/balance/status is computed from preserved ledger. Booking schedule detects overlaps as warnings; it does not reserve staff or enforce capacity. Published pages are a public projection for anonymous **and authenticated** readers.
4. Both legacy and selections-bearing request-submit overloads remain. Manual activation replaces quote free guard/send and invoice correction logic. Migrations-only, activation and rollback are independently recorded; never choose the last file alphabetically as the production function contract. Effective hosted state was not inspected.
5. Dynamic `customer_private.link` updates only allowlisted enquiry/quote/booking tables. App customer activity reads also expand these three targets. Source inventory retains full statements/call sites and explicit dynamic expansion, rather than claiming a lexical graph resolves every SQL alias or runtime dispatch.
6. There are no memberships, visits, crew/resource reservations or generic capability records yet. Staff is not an Auth identity; customer email/name is not access. Assignment links are current state, not historical events. No Show, invitation, strict capacity and generic customer action contracts remain future work.
7. Images are JSON/base64 or immutable database image records; no application Storage API call was found. Backups include optional Storage metadata, not object bytes. No paid branch/service is required by the proposed next package; Free quota headroom has not been measured here.

## Validation and reproducibility

Run the offline suite from repository root:

```sh
python3 tests/sc02-baseline.py
```

Eight tests cover inventory/source equality, SQL quote/comment/dollar-body splitting, overload and manual release composition, fixture tamper detection, execution of the **unchanged production browser calculator** against seven frozen expected price/duration cases, financial-chain projections, role/default locks, and five-step/tab-draft contract. This is not browser interaction, native SQL or deployed-RLS acceptance. Node is required for the real JavaScript calculator check; Python otherwise uses only standard libraries.

Native checks use the existing disposable PostgreSQL/PHP harness:

```sh
PG_BIN=/usr/lib/postgresql/16/bin PHP_BIN=php python3 tests/sc02-native.py
PG_BIN=/usr/lib/postgresql/16/bin PHP_BIN=php python3 tests/release-checks.py
```

The new native suite validates SQL calculator/JSON parity, rejects malformed selections and whole-currency fractions, records relation/function/policy/column/schema ACL metadata and per-role function access for migrations/activation/rollback, validates three invoker views, and creates a document→invoice→payment→reversal→void→replacement chain with outsider/environment denial and immutable original/ledger comparison. It runs only on newly initialized loopback databases and simulated Auth/REST. Existing full regression retains request→quote→booking→invoice, concurrency, free-quote, correction and recovery coverage. New suites are included in `tests/release-checks.py`, so the existing foundation pull-request CI executes them; no workflow or runtime configuration changed.

Native catalogue output: `test-results/release/sc02-native.json`; suite logs/summary are retained by existing CI. Review exact latest-head CI before marking native validation passed. Local PHP/PostgreSQL binaries are absent in this workspace and system package installation is unavailable; native execution must be evidenced by CI. Do not treat compilation or offline success as native acceptance.

To intentionally refresh source inventory after reviewing new application changes:

```sh
python3 tests/sc02_inventory.py
```

Do not regenerate fixtures/fingerprints merely to make preservation tests pass. Review any intentional baseline change and record its source/compatibility impact.

## Remaining gaps and next package

SC-02 provides a source contract baseline and test preparations, not live drift certification or industry acceptance. Before SC-03 implementation: refresh source/head and reconcile manual-release state; agree command/event envelopes, idempotency scope, lock order and old-reader strategy against this manifest. SC-03 acceptance must prove atomic rollback/stale/races and extend recovery for added records. SC-04/06/08/10 remain separate authorization/agreement/reservation/outbound gates.

Outstanding evidence: current hosted catalogue/ACL/default grants vs source; exact real record counts/shape distribution/fingerprints; provider Auth/Storage/default-role differences; Free usage/headroom/load; native latest-head suite results until CI finishes; future delegated-role/direct-API, lifecycle, migration concurrency and three-pilot journeys. These are not performed against the hosted project in SC-02. Preserve all live switches and five steps (Service → Details → Schedule → Contact → Review); no customer messages, live intake changes, Shalean republication, schema/permission changes, deployment, merge or subscription upgrade.
