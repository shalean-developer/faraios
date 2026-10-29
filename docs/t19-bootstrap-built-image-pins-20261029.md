# T19 owner-built derivative pins — 29 October 2026

The owner reported BOOTSTRAP_DERIVATIVES_BUILT_NOT_ACTIVATED from the pinned builder at staging commit 1ac68964ba070b9cd8c6e51fc9a2cd3804f9d782. The historical build bundle was 8bc082614a49fb51a3d6811668872bf7bf9f0a73fe96509720a7d5ec4fb50c41. Preserve that source checkout and private build evidence unchanged; later source digests do not replace its receipt.

- PostgreSQL derivative: sha256:d1b45b411b9513a3eb3a4d0e78a9d0f404d6f1f5fe89d79239ee3af3e1ee6e3f. Parent is the accepted key-path derivative 2b3159aa…; two copy layers were added and inherited configuration was unchanged.
- Storage derivative: sha256:d1ad18d4afde8f08ae8b18f0aede17737d83fb3f189664a741f626329e5e6b97. Parent is the original b8f956b6… image; two copy layers were added and inherited configuration was unchanged.
- Original container/network/volume inventory remained identical, with 13 original containers. No checkpoint, restore, startup or runtime compatibility test occurred in that build.

The synthetic harness now pins these immutable IDs. Its input gate checks the PostgreSQL chain through both the 30-layer key-path parent and 29-layer original base, and Storage through its 14-layer original base. Every ancestor must match its exact ID, platform, full configuration and complete layer prefix. Auth stays on its original six-layer pin. The lineage policy joins the signed source bundle.

Exactly three expected image-file hashes change: PostgreSQL migrate.sh and Storage tenant migrations 0002/0062. All other audited SQL, binaries, controls and startup files remain bound to the previous expectations. Before advancing beyond PostgreSQL startup, the harness must now verify the three core extension versions/schema/owners and that privileged-extension redirection is restored. Subsequent full managed equality remains mandatory.

This is source preparation for a new owner-signed synthetic run, not permission to reuse an old approval. The source-only Storage proposal remains a historical record; it is not rewritten to claim that its initial publication built an image. A fresh protected staging capture, nonce and signature must bind the current bundle, new images, host/daemon and original inventory before execution.

No runtime qualification or recovery PASS is claimed. Complete isolation, PostgreSQL, helper/dependency/Realtime initialization, Auth, Storage, full managed equality, custody/security, stability and cleanup remain required before any checkpoint use. The protected restore project and T20 remain excluded.
