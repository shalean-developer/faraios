# T19 Plesk lifecycle verification

28 October 2026. Existing hosting only. Source preparation, not runtime PASS.

## Finding

The dedicated subscription846 exists, uid10521/system userfaraios_t19, and is suspended. Node application is disabled. It has no Git deployment, application credentials or accounting service. The existing CLI can execute Node24.22.1 without enabling the application. OS file isolation was already tested in both directions against websiteuid10463 using disposable fixtures; the accounts sharegid1003, so owner-only permissions remain essential.

The installed public loader `/usr/local/lsws/fcgi-bin/lsnode.js` has SHA256 `a919533c99d912629df6b906d2a2fed4ea4353ff7a5aeb2979684f51ab78afe2`. Its source overrides the primary HTTP listener to the LiteSpeed Unix socket, handles loader/child termination and watches socket identity. Official LiteSpeed documentation describes on-demand spawning and configurable idle termination/startup behavior. This is not proof of this host's effective idle/startup settings or durable service availability. Plesk's restart control by itself does not accept those properties.

The current `scripts/t19-runtime.mjs custody` starts only loopback HTTPS and is not yet an accepted Plesk primary HTTP application. Do not select it as a Plesk startup file or assume a cron-launched daemon has supervision. A successful probe must inform the actual service composition, not substitute for it.

Primary references inspected:

- https://docs.litespeedtech.com/lsws/cp/cpanel/ts-cloudlinux/
- https://www.litespeedtech.com/docs/webserver/config/app-server
- https://doc.plesk.com/en-US/obsidian/administrator-guide/website-management/hosting-nodejs-applications.76652/

## Prepared probe

`scripts/t19-plesk-lifecycle-probe.cjs` imports Node built-ins only. No database, provider, credentials, scheduler, children or accounting imports. Its actual entrypoint refuses anything other than the specified Linux uid10521, Plesk application root and managed LiteSpeed startup. It verifies that the actual listener is a kernel Unix socket, not a TCP listener. Its public response is always403/Unavailable with no host/process metadata. It never records request headers, cookies, paths, query strings or bodies.

Private owner-only exclusive journals record a random instance nonce, PID, process start ticks, UID, socket path, readiness, heartbeat and termination. Heartbeats are10seconds. Each invocation stops itself after120seconds; no process can extend this to a permanent accounting service. Root/owner-only ancestor and regular-file/single-link protections apply. Tests exercise real HTTP denials, deadlines, TCP rejection, refused contexts and actual filesystem permission/link denials. Source tests do not establish hosted process supervision.

## Exact bounded hosted procedure requiring owner authorization

1. Re-read subscription846 status/startup settings and the private directory. Stop on any unexpected code, credential or service. Existing baseline is Suspended/Node disabled, app root and document root `/httpdocs`, startup `app.js`, application version25.9.0. Do not overwrite an existing probe folder or journal.
2. Install only the exact reviewed probe bytes as `/var/www/vhosts/custody-staging.faraios.com/t19-lifecycle-probe/probe.cjs`, with an empty `public` subdirectory. Read back SHA256 before enabling. Private evidence stays in the existing0700 `.faraios-t19-custody` directory, never the public directory. No package install is required.
3. Temporarily configure only subscription846: Node24.22.1, app root `/t19-lifecycle-probe`, document root `/t19-lifecycle-probe/public`, startup `probe.cjs`. Activate this otherwise empty subscription and enable this credential-free Node application for the test. No public DNS alteration or certificate issuance is required to trigger it through the host's existing loopback HTTP virtual-host routing. No HTTPS/accounting security acceptance is claimed by this HTTP-only inert403 test.
4. Send a credential-free request to this new virtual host. Require fixed403 and a new private ready record withuid10521 and verified Unix socket. Wait at least20seconds and read the private heartbeat. This proves only that observed interval, not indefinite availability or startup after a server reboot.
5. Before75seconds, use the Plesk restart control for this application only. Trigger a second request. Require a new nonce/PID and verify the original PID/start-time identity is absent using read-only `/proc` metadata. Record whether graceful termination was observed; absence of a graceful event is not a PASS for database drain/recovery. No direct kill, pkill or Docker call is included.
6. Each process is bounded to120seconds; the whole operational test is limited to5minutes. Disable the test Node application and suspend only subscription846; restore its original startup/root/version settings. Reconcile exact probe instance records and owned files. Never remove an uncertain resource, real private config or unrelated file. Preserve the private journals and sanitized runtime evidence.

No production or existing staging app configuration, database/grants/Vault, OAuth, real credentials, background schedule, invoice/payment or existing Docker container may be changed. Creating the dedicated identity did not authorize this temporary test activation. Approval for this bounded probe does not authorize accounting activation or credentials.

## Acceptance after the probe

Record cold-start, observed lifetime, stop/restart, old-instance absence, public denial and final parked-state results separately. Any failure remains NO-GO for managed custody. Even a PASS here still needs actual custody composition, mTLS/client-identity denials, hosted database grants/recovery, protected credentials, Gate2 requirements, approved TEST provider operations and final reconciliation before fullT19 acceptance. T20 remains Not started.
