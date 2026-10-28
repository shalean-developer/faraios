# T19 Docker environment ordering correction — 28 October 2026

Owner authorized the correction with “fix go ahead” after the signed owner-host run quarantined container ef4093f2cecca26fcb2dcaeaabadcf0ab7d91b33cca84519493ef7d083d7501e. The host reported created state, matching entrypoint/command and equal environment entries ignoring order. No runtime PASS is claimed.

Compare complete environment entries without regard to order, validating nonempty names, equals delimiters, string entries, absence of NUL and uniqueness of names on both sides. Preserve exact values, including empty values and embedded equals. Apply to image and container comparisons; retain all isolation, receipt, nonce and quarantine controls. Old signatures cannot authorize the changed bundle digest.

Validation: 41/41 affected integrated, execution-gateway and embedded SQL checks pass on Node 24.22.1. Docker was not invoked locally. One initial new assertion expected IMAGE_CONFIG_CHANGED for a null environment, but the existing isolation guard rejects it earlier as OWNERSHIP_OR_ISOLATION; the assertion was corrected without changing that guard.

Corrected module SHA-256: 754848cce4cc26070035157c7a6c9da7a41268692e464580d22d63fae246a8b4.

Installation, separately authorized quarantined-resource cleanup, original 13-container reconciliation and a fresh signed real test remain pending. Preserve the consumed nonce and original bundle; do not automatically restart or delete the quarantined resource. T19 remains in progress.
