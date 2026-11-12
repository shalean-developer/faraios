# FaraiOS New

Fresh approved homepage and dedicated waitlist page, with a small PHP waitlist prepared on `feature/waitlist-20261112`. No build step or frontend dependencies.

The waitlist collects name, email, business type and six interests with explicit consent. It uses private SQLite storage, double email opt-in, unsubscribe, server-side spam controls, a bounded mail queue and owner-only CSV export through Plesk. It introduces no dashboard, product authentication, booking or payment system.

Read [deployment and operating instructions](docs/waitlist-release.md) before enabling it. Private configuration, storage and a scheduled worker are required; without configuration, the endpoint fails closed. The repository contains no subscriber records or secrets.

Plesk's production Git repository follows `main` automatically and deploys to `/faraios.com`. Keep unapproved changes on a separate branch. Do not merge/pull to production before owner preview approval.

Local verification: `PHP_BIN=php python3 tests/journey.py` (PHP 8.2+ and PDO SQLite). No GitHub Actions workflow or paid runner is used.
