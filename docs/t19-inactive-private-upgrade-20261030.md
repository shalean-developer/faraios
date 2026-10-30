# T19 inactive private upgrade

The owner requested a verified private-package upgrade with the previous installation preserved and activation disabled. Read-only Plesk inspection on 30 October 2026 confirmed subscription 846 suspended, Node disabled, old `/httpdocs` / `app.js` / Node25.9.0 settings, an owner-only `/app`, and no custody.json in the listed private directory. The installed source lacks the callback modules from PR250/251.

## Bounded execution

Build the updated offline package through the current-head CI artifact. Verify its transport digest, production-manifest digest and exact contents before any installation. Stage it under the existing owner-only private directory as `package-<new-manifest-digest>`. Never reuse an old ZIP merely because its filename matches.

Run the packaged `scripts/t19-private-upgrade.mjs` using the pinned Node24.22.1 as UID10521. `--inspect <previous-digest> <new-digest>` verifies the fixed context and both package baselines without changing installation files. `--upgrade-inactive <previous-digest> <new-digest>` additionally:

1. Requires custody.json absent; refuses existing stage/backup/journal/lock collisions.
2. Acquires a persistent exclusive upgrade lock and saves/fsyncs the intent.
3. Copies and verifies new bytes under an exclusive owner-only private stage.
4. Rechecks the old app and absent configuration, then preserves the old app at `.faraios-t19-custody/rollback-<previous-digest>-app`.
5. Moves the verified stage to the fixed `/app`, verifies both installations and fsyncs a result record.

No application import, runtime startup, config/credential content read, database access, OAuth or financial operation occurs. Existing install receipts and evidence are preserved. The lock remains for explicit recovery review, including before a subsequent upgrade. An interruption never triggers blind retry, deletion or automatic rollback; inspect the durable intent, exact resources and both hashes before deciding recovery.

## Configuration boundary

The approved callback configuration is the existing exact custody configuration plus optional `callback.privateKeyFile`. Its loader requires a protected, single-link RSA key of at least3072 bits and imports a non-exportable decrypt-only key. Private TLS keys, database credential, current machine identities, publishable-key selection and effective logging controls must be qualified before a real runtime configuration is installed. Do not create placeholder custody.json or invent missing credentials. Provisioning a valid configuration and changing parked Node settings is a separate host step after package verification; keep enabled:false, the Node app disabled and the subscription suspended. Public Worker configuration receives only the corresponding public key.

The package upgrade does not itself qualify hosted TLS, original-session browser behaviour, SQL execution or credential recovery. No real OAuth activation or T20 work is included.

## Local regression evidence

Tests cover exact new/old verification, preserved owner-only backup, denied re-execution, config collision, changed previous bytes and a forced interruption after old-app preservation. The latter leaves a verified backup, verified stage and durable intent, with no result or inferred success. Packaging tests verify the updated module closure and unchanged dependency/exclusion safeguards. CI must pass for the exact final head before source merge or package selection.
