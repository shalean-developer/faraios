# T19 Plesk lifecycle verification

28 October 2026. Existing hosting only. Corrected credential-free hosted lifecycle PASS for the observed interval; full T19 remains NO-GO.

## Corrected approved lifecycle run — bounded PASS

Owner approved source8778edf6f65dd7a5bf04c3da1794284ccb56fc54 (probe SHA25608bfc6e8d1408f8a690343cea66c74f565d781a939c4792d333e98ab02d322b7). Preflight matched source and the exact four historical refusal journals. Strict HTTPS returned403/Unavailable. Kernel Unix-listener verification passed underuid10521. The first instance recorded readiness and10/20second heartbeats. Plesk Restart App was invoked by58173ms; originalpid3376255 recorded SIGTERM and disappeared, while newpid3377021/new nonce recorded readiness and heartbeat. No direct kill or Docker operation was used.

An additional instancepid3377555/new nonce appeared during shutdown/reconfiguration; its exact trigger is not established. All three instances recorded SIGTERM. Final read-only process reconciliation found no additional owned Node process outside the CLI chain. Seven journals remain: four historical refusals and three reconciled lifecycle instances. No journal was deleted. The subscription was suspended, Node disabled and all original settings restored by128315ms, within five minutes. The owner-installed TLS certificate remains assigned.

Structured evidence: `evidence/t19-plesk-lifecycle/lifecycle-pass-20261028.json`. PASS dimensions: strict TLS, cold start, kernel socket, observed heartbeat, controlled restart, original-instance absence and final parked-state reconciliation. This does not prove indefinite availability, startup after reboot, database drain, provider recovery or accounting acceptance. The actual managed service must support late generations and rely on durable database leases/generation fences.

## Inactive managed service composition

`_custody.cjs` is an explicit alternative startup for the separateuid10521 subscription, never the default website startup. It requires the exact source root `/var/www/vhosts/custody-staging.faraios.com/app`, `_custody.cjs`, approved TLS-vhost Unix socket and installed LiteSpeed loader. Kernel Unix-listener verification precedes any private config read/database start. Its only config path is the protected `.faraios-t19-custody/custody.json` outside the checkout. Existing least-privilege DB/mTLS/operation implementations are reused; no service-role or environment fallback is added.

The public managed HTTP listener returns onlyUnavailable (503 while preparing,403 after private service readiness); it never proxies or dispatches accounting. The private TLS listener must actually bind the requested port on127.0.0.1/IPv4, verified using the native net.Server address implementation. Signals close public intake and drain the delegated service; a signal during loading/startup also closes a late service. No scheduler or background job starts on import or startup alone.

Web/scheduler protected configuration may explicitly select `transport:"managed-custody-staging"` with a loopback HTTPS endpoint. The fixed public HTTPS wakeup sends only an inertGET/, no client certificate, key, user cookie/token, business ID or body. It requires the exactUnavailable denial, strict public TLS, bounded10second startup checks and process-local coalescing. Only503 preparation responses retry; business/provider operations never enter this loop. Web session validation precedes waking; wake failure prevents the private request. The subsequent private request still requires actual mTLS and database-verified machine/business grants. Direct transport remains unchanged when no transport profile is selected.

Prepared source only. No new service source, credentials, database grants or schedule were installed or activated on the custody host by this composition work. Its hosted mTLS/credential/SQL/recovery acceptance still requires separately authorized execution after the existing gates pass. Local real HTTP/TLS, permission, startup/interruption, invalid TLS and business-boundary regressions are in `evidence/t19-plesk-lifecycle/managed-composition-local.tap`; they do not replace hosted security/provider acceptance.

Historical records below retain their original attempted-revision conclusions and are superseded only for the corrected probe's bounded lifecycle result.

## Approved diagnostic result and correction

The owner approved the R0 five-minute diagnostic run of source1e1c1ab. Preflight/hash and empty private directory passed. Strict HTTPS again returned503, but four protected journals now identified startup_refused at managed_context: UID, source directory, startup and loader match; raw LSNODE_ROOT does not. The installed public loader sets appRoot from LSNODE_ROOT and concatenates appRoot + relative startupFile, requiring the separator that the probe's raw equality omitted. This is a probe compatibility defect; it does not establish a defect in the existing staging application, whose guard already resolves the root.

Correction accepts only the exact expected root and that root with a single trailing slash. It continues to deny other roots, traversal spellings, relative paths, wrong identities/loaders and non-managed listeners. Nine local tests pass, including equivalent-root acceptance and foreign/traversal denial. Fixed executable hash:08bfc6e8d1408f8a690343cea66c74f565d781a939c4792d333e98ab02d322b7. This corrected executable has not run on the host.

The probe was disabled, subscription suspended and every original setting restored by92386ms. Reconciliation found no additional owned Node processes; the four owner-only refusal journals are retained as evidence. Structured evidence: `evidence/t19-plesk-lifecycle/diagnostic-attempt-20261028.json`. Runtime startup remains NO-GO on the tested revision; no heartbeat/restart, accounting, provider or financial acceptance is inferred.

## HTTPS retry and startup diagnostics

The owner installed the free certificate. Strict certificate verification passed for both the canonical hostname and its www alias using TLS1.3, with expiry26January2027. The bounded retry then returned503 and no private probe journal. Plesk's log browser exposed access records and an empty (0-byte) Apache error log, without a startup diagnostic. The protected managed configuration returnedEACCES; no bypass was attempted. Root cause remains undetermined; neither a startup-guard defect nor a host-supervision defect is established.

The test application was disabled and subscription846 suspended by194569ms; all original settings were restored by234616ms. Read-only reconciliation found no additional owned Node processes outside the CLI command chain and no private entries. The owner-installed certificate was retained. Structured evidence: `evidence/t19-plesk-lifecycle/https-attempt-20261028.json`.

Source now adds a bounded startup-refusal diagnostic containing a fixed stage and boolean comparisons only. It never serializes environment, argv, errors or request data. A refused process under the expected UID may write only through the same protected exclusive journal mechanism; foreign identities do not attempt a private write. Authorization and listener checks are unchanged. This updated source has not yet been run on the host and is not runtime acceptance.

## Actual approved attempt and correction

The owner approved the exact five-minute test in this conversation. The probe source/hash and empty private directory passed preflight. Only subscription846 was activated and its Node application enabled with the documented temporary settings. No accounting service, database, provider or Docker operation was performed.

The workspace could not connect to the assigned HTTP address. A same-host127.0.0.1 request returned Plesk's internal service page, not this virtual host. A request to the assigned104.238.222.122 address with the exact custody Host returned301 to `https://www.custody-staging.faraios.com/`; no probe journals appeared. Thus cold-start/readiness was not established and no restart/heartbeat acceptance was attempted. The earlier assumption below that plain loopback HTTP would reach the managed application was wrong; this record supersedes it. No certificate warning or TLS verification was bypassed.

The new subscription was suspended by157658milliseconds and all original startup/root/version settings restored by217397milliseconds from the activation-operation start, within the approved five minutes. Readback: Suspended, Node disabled,25.9.0,/httpdocs roots,app.js. Private journals0; read-only process reconciliation found no additional Node processes underuid10521 outside the diagnostic command chain. The staged, hash-verified source and empty public directory remain inactive for a later separately authorized test. Plesk generated its nodejs_error_docs directory during enablement; it was retained as a platform-managed resource, not deleted. The main staging source fingerprint and disabled accounting state remain unchanged.

Further read-only checks: both custody hostnames resolve to104.238.222.122; strict TLS verification for the redirected www hostname failed withERR_TLS_CERT_ALTNAME_INVALID. Plesk Hosting Settings confirms preferred domainwww, SSL and forced HTTPS checked, certificateNot selected; the domain certificate repository has0items. This establishes a concrete DNS/HTTP/TLS route prerequisite failure, not an accounting-code defect or proof that the process manager cannot work. It does not establish whether any separate startup guard would pass after routing is repaired.

Structured evidence: `evidence/t19-plesk-lifecycle/hosted-attempt-20261028.json`. Runtime route NO-GO; process lifecycle NOT VERIFIED; observed rollback PASS. FullT19 remains NO-GO; T20 Not started. Source CI796total/778PASS/0FAIL/18explicit skips and dedicated native/Windows/backup/security checks passed on source8cbf3d3; those results do not replace this failed hosted route attempt.

Before another activation, prepare and separately authorize valid HTTPS for the exact custody hostname and its selected www alias (or a reviewed canonical-host correction), retain forced HTTPS and certificate verification, then repeat the same bounded lifecycle procedure. Do not relax TLS, issue/upload keys, alter preferred-domain settings or reactivate the test under the exhausted probe approval. No paid certificate/server purchase is authorized.

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
3. Temporarily configure only subscription846: Node24.22.1, app root `/t19-lifecycle-probe`, document root `/t19-lifecycle-probe/public`, startup `probe.cjs`. Activate this otherwise empty subscription and enable this credential-free Node application for the test. Use the assigned IP with the exact www Host and TLS server name, strict certificate verification, and the owner-installed certificate. Loopback plain HTTP returned an internal service page in the first attempt and is not a valid route. No accounting security acceptance is claimed by this inert403 test.
4. Send a credential-free request to this new virtual host. Require fixed403 and a new private ready record withuid10521 and verified Unix socket. Wait at least20seconds and read the private heartbeat. This proves only that observed interval, not indefinite availability or startup after a server reboot.
5. Before75seconds, use the Plesk restart control for this application only. Trigger a second request. Require a new nonce/PID and verify the original PID/start-time identity is absent using read-only `/proc` metadata. Record whether graceful termination was observed; absence of a graceful event is not a PASS for database drain/recovery. No direct kill, pkill or Docker call is included.
6. Each process is bounded to120seconds; the whole operational test is limited to5minutes. Disable the test Node application and suspend only subscription846; restore its original startup/root/version settings. Reconcile exact probe instance records and owned files. Never remove an uncertain resource, real private config or unrelated file. Preserve the private journals and sanitized runtime evidence.

No production or existing staging app configuration, database/grants/Vault, OAuth, real credentials, background schedule, invoice/payment or existing Docker container may be changed. Creating the dedicated identity did not authorize this temporary test activation. Approval for this bounded probe does not authorize accounting activation or credentials.

## Acceptance after the probe

Record cold-start, observed lifetime, stop/restart, old-instance absence, public denial and final parked-state results separately. Any failure remains NO-GO for managed custody. Even a PASS here still needs actual custody composition, mTLS/client-identity denials, hosted database grants/recovery, protected credentials, Gate2 requirements, approved TEST provider operations and final reconciliation before fullT19 acceptance. T20 remains Not started.
