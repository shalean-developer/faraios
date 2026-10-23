# Independent QA — approved public TLS and full transport execution

Reviewer: separate Codex agent `/root/pr103_tls_run_qa`. Review only; no provider request, test rerun, remote mutation or incident action performed by this reviewer. Approved/tested head: `81588da0de91e092463a18920f7c8522ec360c95`. The user's fresh approval covered one probe under the reviewed plan; the earlier plan baseline `37b3681b95c43ff3057b30c93503894f903d10b8` differs only by the plan document.

## Source, isolation and one-run evidence

The approved source function sends only the eight-byte PostgreSQL SSLRequest, then validates TLS using the pinned CA and hostname with rejectUnauthorized=true and a twenty-second deadline. It destroys the connection before PostgreSQL startup/authentication/SQL. No application retry is present. The full unchanged transport script retains the synthetic local assertions.

The archive SHA256 independently matches `b1411634749d8988dd9376a72616adb312867afd89ad7c377ffebc23d6ff0ff8`. Four directly compared files (probe, backup helper, pinned CA and workflow) exactly match approved Git content after newline normalization. The exported files contain CRLF while Git blobs contain LF; raw byte equality is not claimed. Exact hashes, byte counts and CRLF counts are retained in `source-identity.json`. The DER certificate pin is unaffected by PEM newlines. No implementation delta from the tested source candidate was found.

The recorded environment is Ubuntu 26.04 under WSL, Node 24.22.1, OpenSSL 3.5.5, Docker Desktop's local Linux engine, and PostgreSQL 17.11 pinned image `sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826`. The reviewed Docker bridge changes bind-path/environment forwarding, not test assertions. These local conditions differ from GitHub-hosted Ubuntu.

The outer wrapper uses env-i with a small allowlist and isolated HOME/TMPDIR, clears inherited credential/TLS override configuration, disables tracing, uses a noclobber one-invocation marker, and imposes a ten-minute deadline. Its guarded temporary-directory cleanup covers the unchanged script's early-probe-failure gap. Identity and cleanup metadata record one invocation marker and one public PASS marker. This is an evidence review, not a packet-capture claim of every OS-level connection attempt.

## Actual outcome

The complete log runs from 2026-10-23T07:49:27Z to 07:52:11Z and contains **24 PASS marker lines**, including:

- `T11_PUBLIC_POOLER_CA_AND_HOSTNAME=PASS` — the formerly omitted public subgate.
- Trusted metadata and six dump modes.
- Native restore, ACL/RLS, rollback, diagnostic and guarded-resume assertions.
- Seven untrusted-CA, seven wrong-hostname and seven plaintext-server refusals.
- Timeout/cancellation cleanup, unrelated-sentinel preservation and fixture cleanup.

`transport.exit.txt` is 0; the log records `TRANSPORT_EXIT=0` and `OUTER_TMP_REMAINING=0`. Public TLS and full local workflow-command assertions: **PASS**. Policy/Windows suites were not rerun and no fresh claim is made for them.

## Cleanup evidence and its limits

The initial `cleanup.json` is preserved honestly: containers/network/temp were absent, but two observed anonymous PostgreSQL volumes remained. The script's PASS marker alone therefore was not proof of complete host-volume cleanup. Supplemental targeted cleanup was needed; no source fix or retry occurred.

`owned-containers.json` directly maps the database and restore fixtures to two volumes. `owned-volume-events.json` retains three unmount events, and `volume-cleanup.json` records the union of four volumes as detached before removal and absent afterwards. The database/restore mapping is directly auditable. The other two event rows contain container IDs but no names; the later `owned-container-events.json` is empty. The original full id-to-name mapping for those two events is therefore not independently recoverable from the retained files. Docker event retention must not be represented as exhaustive.

`final-cleanup.json` reports zero task containers/networks and removal of the private build root; no shared images were removed. Reviewer confirms the files' recorded outcome but **cannot certify an exhaustive anonymous-volume inventory** from the available historical snapshots/events. Preserve this evidence limitation in the closeout. Do not silently relabel the initial orphan-volume finding as a wholly clean first-pass teardown.

## Log safety and remaining gates

The two .log files were reviewed: environment/version/image/hash metadata and synthetic assertion results only. Scans found zero credential-bearing PostgreSQL URLs, private-key headers or provider-token shapes. No runtime fixture credential, real service credential or accounting data was observed. These bounded logs are suitable to publish; this is not a global secret-exposure certification.

The public TLS and full local transport execution are PASS. Cleanup assurance is bounded as above; exhaustive historical volume mapping remains NOT VERIFIED. A statement that the unchanged script itself cleaned every anonymous volume would be unsupported.

Hosted CI remains distinct and blocked unless separately observed running. Owner no-spend exception approval, protection/reviewer confirmation, applicable formal reviews, actual GitGuardian success on any new evidence head and separate merge authorization remain gates. No CI exception, merge or incident 38407534 disposition is approved by this review. PR #103 stays Draft; T19 In progress; accounting activation NO-GO.
