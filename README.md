# FaraiOS New

Fresh approved homepage and dedicated waitlist page, with a small PHP waitlist prepared on `feature/waitlist-20261112`. No build step or frontend dependencies.

The waitlist collects name, email, business type and six interests with explicit consent. It uses Supabase storage, double email opt-in, unsubscribe, server-side spam controls, a durable Supabase queue and Resend sending and owner-only CSV export through Plesk. It introduces no dashboard, product authentication, booking or payment system.

Read [deployment and operating instructions](docs/waitlist-release.md) before enabling it. Private configuration, storage and a scheduled worker are required; without configuration, the endpoint fails closed. The repository contains no subscriber records or secrets.

Plesk's production Git repository follows `main` automatically and deploys to `/faraios.com`. Keep unapproved changes on a separate branch. Do not merge/pull to production before owner preview approval.

Local verification: `PHP_BIN=php PG_BIN=/path/to/postgres/bin python3 tests/journey.py` (PHP 8.2+, PostgreSQL 17 binaries and Python 3). No GitHub Actions workflow or paid runner is used.

Account and business setup is prepared on `feature/accounts-20261112`, isolated from the existing waitlist. Read [account preview and release instructions](docs/accounts-release.md). No main merge or production release is authorized before owner preview acceptance. Local account checks: `PHP_BIN=php PG_BIN=/path/to/postgres/bin python3 tests/accounts.py`; Auth is simulated while ownership policies execute in disposable PostgreSQL.

Customer enquiries: see [preview and release evidence](docs/customer-enquiries-preview.md). New intake starts enabled only for preview. Production requires later owner approval. Local checks: `PHP_BIN=php PG_BIN=/path/to/postgres/bin python3 tests/enquiries.py`.
