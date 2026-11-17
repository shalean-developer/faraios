# V1-016 bounded guest-focus release

Prepared for authorization; NOT installed. V1-016 In progress; launch HOLD.

Plesk read-only checks on 17 November 2026 established the manifest preimage hashes. Saved source copies were matched byte-for-byte by SHA-256. Existing four scheduled jobs remain unchanged; the inspection form was cancelled without saving.

Targets: `b/index.php`, `_accounts-preview/b/index.php`, `_accounts-preview/account/layout.php`, and new `_accounts-preview/account/error-focus.js`. Three PHP targets only gain a deferred focus-helper script tag. Existing preview overlays are retained. The helper is identical to the previously approved live helper. No database calls, publication, messages, merge or main changes.

Review `patch.diff` and `manifest.json`. Installer rejects target or dependency drift, captures a private full-web hash census and seven private configuration fingerprints, backs up target contents/modes, lints staged PHP, rechecks the census, and installs atomically per file. Post-checks preserve every non-target hash; guarded rollback restores only this patch on failure. The original live four-file repair is not reinstalled. Installation is not a multi-file transaction: stop and reconcile the private receipt if interrupted.

Authorization is required before running `install.php` on the host. Do not upload this installer or backup into a publicly served directory. The intended private receipt directory is `/var/www/vhosts/shalean.com/private/faraios-account/v1016-guest-a1ca7e1-20261117`.

After installation, test repaired guest rejection and scheduling validation focus plus active booking/availability at 320/390/768/1280. Complete remaining LoopPhone Android 16 Chrome acceptance, preserving earlier accepted checks. Update both plans and the owner tracker; retain In progress and HOLD until all original criteria pass.
