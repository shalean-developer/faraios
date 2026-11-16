# Owner dashboard live release — 16 November 2026

The owner explicitly authorized this dashboard deployment after preview review. Live entry: https://www.faraios.com/account/platform.php . No full-site pull, PR merge, SQL, role, provider-send or business-record change was performed. PR68 repairs remain separate.

## Release and preservation

The private CLI installer pinned the five runtime files to 49509da913f952208c3e257427e95a6e5316c4b4. It preserved all 55 pre-existing account files and the three private configuration files, copied all 24 tasks and revision-1 history unchanged from preview to live, and retained an encrypted initial state packet. It rehearsed restoration of the actual task/history bytes with a disposable key in private isolated storage and removed the temporary plaintext.

Live verification exposed the new entry reading preview configuration. A separate additive platform-session.php was derived from the existing live core, changing only its configuration filename from config.php to production.php and adding a direct-request denial. The platform entry uses this adapter only when installed; preview/tests continue to use the existing core. No existing account core or private configuration was changed. The bounded recipe is live-session-patch.php in this folder.

Installed entry SHA256: d7ac087c3568b7032214118130f173bdc963d6568d84c0715f3d3aa30fb0128b

Installed adapter SHA256: 01bb9fdec84ed397470ce9d7136a959975dcae182bad2e60448706a26edb8508

Original core SHA256, preserved: 20de2c9c307a14255494dcd46cecf6b838990215592989023236190cda7c164d

The adapter operation preserved the other 59 account files (including the four installed support files) and all private configuration hashes. The initial install receipt predates this adapter; do not rerun the original installer expecting its old entry hash to match.

## Validation

- Foundation CI run 43868639177: all 93 application regression checks passed, plus isolated tracker browser acceptance. Database backup run 43868639216 and configuration recovery run 43868639117 passed.
- Local tracker tests passed after the session adapter selection change; isolated configuration selection fixture chose production.php while preserving the preview config file. PHP syntax passed.
- Real verified owner session opened the live overview, task editor and UI review. UI review retains the 43 synthetic preview links plus its original catalogue link.
- Live V1-018 update saved and persisted after reload. Host check verified 24 tasks, revision 2, two history records, a matching encrypted recovery snapshot, and owner configuration mode0600.
- Grouped Development menu, selected page and independent content scrolling verified. Earlier preview desktop/mobile checks passed.

## Limits and rollback

This deploys the task/release workspace, not tenant administration or v1.0.0 itself. V1-018 is Live rather than Verified; hosted expiry/CSRF recheck remains open. Each saved revision has a private AES-GCM snapshot wrapped to the existing RSA recovery public key. Restoring retained packets requires the owner's existing private key/passphrase. Hosted actual-history rehearsal used a disposable key; the retained production private key was not accessed. Host-local packets still require independent secure retention to protect against complete host loss.

Rollback removes/disables the newly added dashboard entry/support files and production session adapter, retaining private tracker state and recovery packets. It does not replace core.php, private configuration, business records or preview state.
