# T20 TEST staging runtime preparation

1 November 2026 SAST. T20 only; T19 Done and T21 Not started. Follows source-only PR284. This package prepares hosting composition; it does not change Plesk startup, private files, account enrollments or shared SQL.

## Concrete composition

The separate _test_payments.cjs launcher preserves the standard accounting runtime and supplies an optional payment handler. Existing _standard_accounting.cjs remains unchanged. Default hosted startup keeps payment dispatch disabled. The explicit launcher is admitted only by the existing reviewed LiteSpeed/Passenger runtime checks. Its bytes are included in the hosted source fingerprint.

src/t20-payment-runtime.js reads only the fixed private T20 root outside the web directory. It rejects symlinks, non-owner readable files, hard links, oversized/malformed JSON, changed file identity and writable ancestor directories. No private-file/network operation occurs on import. Disabled configuration reads no account key files and performs no authentication. Enabled configuration requires exact staging/TEST shapes and an explicitly selected nonempty business list; the controller rejects duplicate keys/accounts and malformed IDs. Startup checks each exact backend enrollment and closes its session on failure.

The hosted SDK gains a payments=false default capability permitting only t20_payment_owner when an actual payment handler is supplied. It still denies the backend/checkout RPCs, private tables, external providers and schema overrides. Dedicated backend credentials use their separate restricted transport. Existing accounting flags and permissions remain intact.

The server mounts /payments/ only with the injected handler and rejects that injection in local/restore modes. Its global Origin gate exempts only POST to the exact business webhook path, with no query; the payment handler then authenticates raw signatures and verifies provider status. Other writes retain Origin enforcement. Health reports test-only only when a payment handler is mounted; otherwise disabled. This is not production activation.

## Evidence and execution boundary

New tests exercise disabled no-auth behaviour, exact enrollment health and session cleanup, private-file read/permission/symlink/size/JSON checks, narrow SDK allowlisting and actual HTTP Origin/mount behaviour. Local hosting regression retains two known EPERM Unix-socket failures; CI must run those checks on its eligible host before source acceptance. Full tests/native checkout checks remain required.

After source qualification: verify exact deployed hashes, actual private file permissions and disabled settings, then apply the reviewed additive checkout SQL with collision refusal; verify private RLS/ACLs/empty counts and unchanged T19 state. Configure each business only through authorized owner operations; enroll the dedicated backend against those exact accounts. Enable the private TEST files deliberately, change Plesk startup to the explicit TEST launcher, restart and verify health/denial/transport. Do not replace an existing Paystack webhook blindly: inspect its TEST-only use and prepare routing before any approved change. Existing production/live settings are excluded.

No checkout creation is authorized by this source preparation. Prepare a specific synthetic invoice/reference/amount for owner approval before the first provider POST. Prove both business mappings with actual TEST records and wrong-account denial, then success/failure/replay/delay acceptance. T20 stays In progress until owner acceptance. No extra feature or independent review requirement is introduced.

Rollback: retain existing accounting launcher; switch back to _standard_accounting.cjs and disable the private T20 flags if the TEST launcher fails. Never reset/delete claimed checkout or payment records; reconcile them. Empty-only additive SQL rollback is available before any checkout claim exists. Source revert restores original transport/server defaults and removes only the explicit TEST launcher/runtime/tests.
