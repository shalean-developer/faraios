## G2-02 single-use approval ledger — implementation and review limit

PR #209 adds a local exclusive nonce-consumption ledger using a per-nonce `.consumed` file opened with `wx`, written and fsync'd. Concurrent consumers on the same local filesystem yield at most one successful claim; the ledger intentionally never deletes consumed entries.

**This does not unlock execution.** The signer must be independently controlled; the signed run must be bound to the exact executable and reviewed arguments; `verifyExactRun` still returns `authorized:false`; trusted execution-key custody is not provided. Windows filesystem atomicity, directory fsync durability, symlink/reparse-point attacks, backup/restore replay, cross-host concurrence, and process crashes during an incomplete write all require independent testing and security review. A malformed/partial consumed file must **never** be reused or repaired automatically.

Proposed final acceptance: external qualified reviewer approves a trusted signer and replay ledger boundary, proves one-use approval across crash/restart, verifies immutable Docker invocation and no impact on 13 pre-existing containers, then owner separately approves one exact disposable run. No live Docker or SQL execution was authorized by this change.
