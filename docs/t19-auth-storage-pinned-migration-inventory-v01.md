# T19 Auth/Storage pinned SQL source inventory — v0.1 (2026-10-27)

**SOURCE INVENTORY PASS / SHA-256 AND EXECUTION NO-GO.** Source-only; never run this SQL. Exact upstream tag->commit refs verified through GitHub: Auth v2.197.0 -> `4eee58f296d9698a1c2c0ae14d7a0b379c7622d3`; Storage v1.84.23 -> `d2836fe9e8157f4fc558af0071a7671d373ff3ef`.

The 149 entries below enumerate all direct .sql files in the pinned migration directories using non-truncated Git trees. **Git blob SHA-1 is not file SHA-256**. SHA-256 is explicitly **PENDING** for every row until the pinned exact bytes have been independently fetched, their Git blob identity rechecked, and SHA-256 calculated. Tree enumeration is not proof of migration execution order, completeness of other service migrations or original actor. Storage's `00010` name requires checking runner-specific version ordering rather than assuming simple lexicographic order.

## Auth — 75 files

| Path | Git blob SHA-1 | SHA-256 |
|---|---|---|
| `migrations/00_init_auth_schema.up.sql` | `a040095ae1e55f43bc35535e892a3cfc4c5981f9` | PENDING |
| `migrations/20210710035447_alter_users.up.sql` | `fc8de129da43eca351100b1d222b2809f1367fe8` | PENDING |
| `migrations/20210722035447_adds_confirmed_at.up.sql` | `aabd42e98760541a59f61a054918c66e922819d4` | PENDING |
| `migrations/20210730183235_add_email_change_confirmed.up.sql` | `dc92c9cfae6f671013b4a5b7e2e26a831c36debc` | PENDING |
| `migrations/20210909172000_create_identities_table.up.sql` | `2f3a5357012d59ea94f8d895024a1c4a09f6979b` | PENDING |
| `migrations/20210927181326_add_refresh_token_parent.up.sql` | `a2b1c73fea2e3dd3e3ba07f93cce4bcbda26e2e3` | PENDING |
| `migrations/20211122151130_create_user_id_idx.up.sql` | `d259aae6b8c892dce84ebfba2a095b05fc00a5fe` | PENDING |
| `migrations/20211124214934_update_auth_functions.up.sql` | `2fb784bbb4cc07361bdd3f22af068bb215e21221` | PENDING |
| `migrations/20211202183645_update_auth_uid.up.sql` | `3ecadfd5cb2fae1e94028c2be53f36c0cf4785ee` | PENDING |
| `migrations/20220114185221_update_user_idx.up.sql` | `02fe76a07cd92f3fec21927aaf2da515d8769373` | PENDING |
| `migrations/20220114185340_add_banned_until.up.sql` | `7530a7c1bb36042417107d0c43b8ab67de67e1a5` | PENDING |
| `migrations/20220224000811_update_auth_functions.up.sql` | `4be423739aa3bf07bc3769aea5cc7751959ad53e` | PENDING |
| `migrations/20220323170000_add_user_reauthentication.up.sql` | `277dbdb5a06d10c15804bb49a689adcfeeb2edd5` | PENDING |
| `migrations/20220429102000_add_unique_idx.up.sql` | `9d7644df2ccb53f8f9021a7d41dcd1dfa2945084` | PENDING |
| `migrations/20220531120530_add_auth_jwt_function.up.sql` | `11f84e85f16ebbc01864a646bd4272f5d34857be` | PENDING |
| `migrations/20220614074223_add_ip_address_to_audit_log.postgres.up.sql` | `a1a66b4b3b1c513ceff3f9c1c20f3638af87dc2c` | PENDING |
| `migrations/20220811173540_add_sessions_table.up.sql` | `c16ef3ca56d2d0f585a8716e86d77bb413593896` | PENDING |
| `migrations/20221003041349_add_mfa_schema.up.sql` | `26c4e4b69b7124c977de4a1100527d43e1a4e0dc` | PENDING |
| `migrations/20221003041400_add_aal_and_factor_id_to_sessions.up.sql` | `426a42f591325301166436df6b918d9b26af7240` | PENDING |
| `migrations/20221011041400_add_mfa_indexes.up.sql` | `def57a299f0b7a0a11b591930b854668e3acb377` | PENDING |
| `migrations/20221020193600_add_sessions_user_id_index.up.sql` | `f5ba0425774ad841872934ca3b249bf025e7d688` | PENDING |
| `migrations/20221021073300_add_refresh_tokens_session_id_revoked_index.up.sql` | `0c47d4a75c72a3b4b1bf766b7f14d0e1a8db0a6e` | PENDING |
| `migrations/20221021082433_add_saml.up.sql` | `30ac3d03a989ca9b7f06b706487ec32a2234c0b7` | PENDING |
| `migrations/20221027105023_add_identities_user_id_idx.up.sql` | `12e7aa5562b49dce88c2847df2f56777e68dd7af` | PENDING |
| `migrations/20221114143122_add_session_not_after_column.up.sql` | `c729911c1e52d39ef1643d386146329b0d7f9349` | PENDING |
| `migrations/20221114143410_remove_parent_foreign_key_refresh_tokens.up.sql` | `62d207848bca6ff99865fb20129dfd0f4e7bc0ff` | PENDING |
| `migrations/20221125140132_backfill_email_identity.up.sql` | `cd06425c040821b78394cc1770fb8cc2edcc1abf` | PENDING |
| `migrations/20221208132122_backfill_email_last_sign_in_at.up.sql` | `8975f1eb9783cac03e23581dc941cea1fe592262` | PENDING |
| `migrations/20221215195500_modify_users_email_unique_index.up.sql` | `c12de04f657811527fafa9d940eea195f4938140` | PENDING |
| `migrations/20221215195800_add_identities_email_column.up.sql` | `eb60334c4c7c5d037d019e15b3ea75cc29716d4b` | PENDING |
| `migrations/20221215195900_remove_sso_sessions.up.sql` | `228302d01bfe0be5f19a265d091e05b5aae36295` | PENDING |
| `migrations/20230116124310_alter_phone_type.up.sql` | `6cafd60f06520fa1ae96bbc5c730e99d304c0fc8` | PENDING |
| `migrations/20230116124412_add_deleted_at.up.sql` | `999abaa88de4ab4f61f06c37c7ea7785b187a9e8` | PENDING |
| `migrations/20230131181311_backfill_invite_identities.up.sql` | `2fcb3582849bac38c661af2ae082d05592cfa385` | PENDING |
| `migrations/20230322519590_add_flow_state_table.up.sql` | `c54455f90360d3fb11976d55cbff86afc7187433` | PENDING |
| `migrations/20230402418590_add_authentication_method_to_flow_state_table.up.sql` | `e83af856687c08f60523aa99fb02c4a91450ec22` | PENDING |
| `migrations/20230411005111_remove_duplicate_idx.up.sql` | `dc23931c772e23b85743ddfdf939aa9c04de65cb` | PENDING |
| `migrations/20230508135423_add_cleanup_indexes.up.sql` | `162acee1598ab39dc0edfa731f875a487a24f37b` | PENDING |
| `migrations/20230523124323_add_mfa_challenge_cleanup_index.up.sql` | `667d5020be0c5f6d32e1b1a8241ed649961b6e14` | PENDING |
| `migrations/20230818113222_add_flow_state_to_relay_state.up.sql` | `f940e706cc93ae5063aa57ce3fd0c827682d0410` | PENDING |
| `migrations/20230914180801_add_mfa_factors_user_id_idx.up.sql` | `805c97cb8e3f30d6d960c43676f7c94fce0496f4` | PENDING |
| `migrations/20231027141322_add_session_refresh_columns.up.sql` | `79efba9bcfb7cdf40294035e8c4eec3f17fcb2af` | PENDING |
| `migrations/20231114161723_add_sessions_tag.up.sql` | `7acf1bb9dd8484c0037c4f0283e5711a61b79bdd` | PENDING |
| `migrations/20231117164230_add_id_pkey_identities.up.sql` | `31ed280d3b76f084b9b5e8ffda05343f86c4036b` | PENDING |
| `migrations/20240115144230_remove_ip_address_from_saml_relay_state.up.sql` | `169ec37b29bbe7317f6ee058ba5b847481551a25` | PENDING |
| `migrations/20240214120130_add_is_anonymous_column.up.sql` | `6ef963f5736e54ea6c2d6c6fabbcb6b4880709e6` | PENDING |
| `migrations/20240306115329_add_issued_at_to_flow_state.up.sql` | `d6eff157ae6ab363e49323268351d6941a262709` | PENDING |
| `migrations/20240314092811_add_saml_name_id_format.up.sql` | `0196250d20ddf717e766a92376fc4df5add5a4e0` | PENDING |
| `migrations/20240427152123_add_one_time_tokens_table.up.sql` | `38100c08cf1d6cd65db11b637243787d1e997319` | PENDING |
| `migrations/20240612123726_enable_rls_update_grants.up.sql` | `9201e84962a98fbb9069bbd320554198a41482b8` | PENDING |
| `migrations/20240729123726_add_mfa_phone_config.up.sql` | `ec94d7bcbe2f07768efb3fd2420577d49b9c7195` | PENDING |
| `migrations/20240802193726_add_mfa_factors_column_last_challenged_at.up.sql` | `bc3eea989450d8e4875b80aa7fc372ea68ad104e` | PENDING |
| `migrations/20240806073726_drop_uniqueness_constraint_on_phone.up.sql` | `ade27eaf66d48b0be341e20b3fc407595054e12c` | PENDING |
| `migrations/20241009103726_add_web_authn.up.sql` | `04d897265385938764df88155b8bd9edfd2ca9d8` | PENDING |
| `migrations/20250717082212_add_disabled_to_sso_providers.up.sql` | `13285394743f4577c2ddfdaee40eb2a3688bec94` | PENDING |
| `migrations/20250731150234_add_oauth_clients_table.up.sql` | `9abf69a496ba1f75287e7446c788531dcb743891` | PENDING |
| `migrations/20250804100000_add_oauth_authorizations_consents.up.sql` | `a74b4305cbf4b707a4e5c2b18340b2dab3cd89fd` | PENDING |
| `migrations/20250901200500_add_oauth_client_type.up.sql` | `a9712a704b998dc5981c3172eb09854473ff1458` | PENDING |
| `migrations/20250903112500_remove_oauth_client_id_column.up.sql` | `273ff9e2576de7f2308daa610f1223c7a8b1ad34` | PENDING |
| `migrations/20250904133000_add_oauth_client_id_to_session.up.sql` | `5ad7a74a6bb4237779670afa70f0367f12ae75e5` | PENDING |
| `migrations/20250925093508_add_last_webauthn_challenge_data.up.sql` | `e78d1722565ac6f47b64cabe7c56296ed33274ce` | PENDING |
| `migrations/20251007112900_add_session_refresh_token_columns.up.sql` | `5b1ca2b3e39be14e918e085a90044212b8381136` | PENDING |
| `migrations/20251104100000_add_nonce_to_oauth_authorizations.up.sql` | `cdbd514c93c7262b07c5902938142c0ab2226b3b` | PENDING |
| `migrations/20251111201300_add_scopes_to_sessions.up.sql` | `f869fdce3f1a964d765410c6281fec343148d6ee` | PENDING |
| `migrations/20251201000000_add_oauth_client_states_table.up.sql` | `6bece1a570247091e1aaa2715462e40f7f628d82` | PENDING |
| `migrations/20260115000000_add_flow_state_oauth_context.up.sql` | `225b13d0168d3562f1af6a0758da02c7885d893b` | PENDING |
| `migrations/20260121000000_add_token_endpoint_auth_method.up.sql` | `a50a942844de6fe757b9034424c99049b30089df` | PENDING |
| `migrations/20260219120000_add_custom_oauth_providers.up.sql` | `0755f7c48495ec763e35f3e1a6b4febf1318a034` | PENDING |
| `migrations/20260302000000_add_passkeys.up.sql` | `efea0965325ed5710d4e0b3240674c1a45bd86ac` | PENDING |
| `migrations/20260625000000_add_custom_claims_allowlist.up.sql` | `928a02fb5e38c0162fa35ec4ea17250fa76945f7` | PENDING |
| `migrations/20260821000000_add_scim_users.up.sql` | `03178f3acce26d7510070981fa49aef4a5dddb0b` | PENDING |
| `migrations/20260821010000_add_scim_tokens.up.sql` | `6b45799c2b46b4f4365ca938323d2fdc93f9f5db` | PENDING |
| `migrations/20260824000000_add_recovery_codes_factor_type.up.sql` | `d559aded3aa0175f768c2b866787190009f01e70` | PENDING |
| `migrations/20260824000001_add_recovery_codes_tables.up.sql` | `9aa5d032fde23ec19aa8b26e4c00c492a0077b6b` | PENDING |
| `migrations/20260831180000_add_expires_at_to_one_time_tokens.up.sql` | `e0afcc3dca66e5b14d91e13b656550b54956a6c0` | PENDING |

## Storage — 74 files

| Path | Git blob SHA-1 | SHA-256 |
|---|---|---|
| `migrations/tenant/0001-initialmigration.sql` | `6bb32b4a8190a761bfcd15280914407c78d45bb0` | PENDING |
| `migrations/tenant/00010-search-files-search-function.sql` | `fe580846993333603ae6b078655d586417b6d916` | PENDING |
| `migrations/tenant/0002-storage-schema.sql` | `aaa5999b9f23fd8e9ecfc4f90c094ce748f12a7f` | PENDING |
| `migrations/tenant/0003-pathtoken-column.sql` | `4468ff92396fa6380e575133625532d8e76ffc4b` | PENDING |
| `migrations/tenant/0004-add-migrations-rls.sql` | `695ec3648b4ad04c35f5f89edb4bcb604a83f6dd` | PENDING |
| `migrations/tenant/0005-add-size-functions.sql` | `178413a5e86de4f8ca2c0c6c9137f08b2e835b99` | PENDING |
| `migrations/tenant/0006-change-column-name-in-get-size.sql` | `a4f4836f30d36cf15d17e168b438a7c52793b3bb` | PENDING |
| `migrations/tenant/0007-add-rls-to-buckets.sql` | `a2140f35acf20575e9e911546d288ccffff1cea3` | PENDING |
| `migrations/tenant/0008-add-public-to-buckets.sql` | `13b1f49f4ae8f5f35ef0ddd6576dd2557844bb33` | PENDING |
| `migrations/tenant/0009-fix-search-function.sql` | `f68c91718a0abd29f2eb8080d653c5c88a61e04b` | PENDING |
| `migrations/tenant/0011-add-trigger-to-auto-update-updated_at-column.sql` | `9aa77236e619c3e172dd8f50d8ba574160861eb7` | PENDING |
| `migrations/tenant/0012-add-automatic-avif-detection-flag.sql` | `d04abd59c733cb1f63b837fd6b3dfa31166efda6` | PENDING |
| `migrations/tenant/0013-add-bucket-custom-limits.sql` | `9ade83678f8d5f31dfbccfa07a8866997c1c1bb1` | PENDING |
| `migrations/tenant/0014-use-bytes-for-max-size.sql` | `a975d964cba5c1487e7bfd823549def6a7e3d02c` | PENDING |
| `migrations/tenant/0015-add-can-insert-object-function.sql` | `35aa6fef531932415b5d484ffe51918b4c19182e` | PENDING |
| `migrations/tenant/0016-add-version.sql` | `336731188e3ab321aefee5438d8fffa0c88eab78` | PENDING |
| `migrations/tenant/0017-drop-owner-foreign-key.sql` | `4de2228ba5720d6f0fd76a138cd1ee23a0f02fc7` | PENDING |
| `migrations/tenant/0018-add_owner_id_column_deprecate_owner.sql` | `1c492de9c39143e4cd20a89c8a6363093466a007` | PENDING |
| `migrations/tenant/0019-alter-default-value-objects-id.sql` | `cae125d3a774a3cf6a1a8760b8540fb1fb10b45e` | PENDING |
| `migrations/tenant/0020-list-objects-with-delimiter.sql` | `bd24c297bb1d8baead81dc55db9c42aeb3a77e22` | PENDING |
| `migrations/tenant/0021-s3-multipart-uploads.sql` | `8b6f614e69fdff594e8fef4fcf012de6be5731cb` | PENDING |
| `migrations/tenant/0022-s3-multipart-uploads-big-ints.sql` | `86a765f8e37dbda82312d16ef965e0109641b9fc` | PENDING |
| `migrations/tenant/0023-optimize-search-function.sql` | `7721d46fa9f82ca99b105b9aa39d8f66a100cc06` | PENDING |
| `migrations/tenant/0024-operation-function.sql` | `e098225c28f194af5eed52d141bc2fb5a57a14f2` | PENDING |
| `migrations/tenant/0025-custom-metadata.sql` | `a379a5f8697dd81db6d79ac78cbe23c7942726e0` | PENDING |
| `migrations/tenant/0026-objects-prefixes.sql` | `97cbeaee70d5bbcadbe6caacd49518d78fca5f3b` | PENDING |
| `migrations/tenant/0027-search-v2.sql` | `9e74d60d89b1c63237fd1c204331bc7f8661434c` | PENDING |
| `migrations/tenant/0028-object-bucket-name-sorting.sql` | `cca3493c186e950b903d662661427aba6819adc2` | PENDING |
| `migrations/tenant/0029-create-prefixes.sql` | `8ddff8b13c4132676732f590ff7089be76f2b35c` | PENDING |
| `migrations/tenant/0030-update-object-levels.sql` | `ffcb21384aab7d61b38e75e90edf40c42fb8cda9` | PENDING |
| `migrations/tenant/0031-objects-level-index.sql` | `af81ba3e6dc0cd3db349a54493de0f4b57139a74` | PENDING |
| `migrations/tenant/0032-backward-compatible-index-on-objects.sql` | `4e042ab44df8e7b421a9066de0f6f402f658bb70` | PENDING |
| `migrations/tenant/0033-backward-compatible-index-on-prefixes.sql` | `35d1c7184ff2c2b3ad242c7541739ed344e63819` | PENDING |
| `migrations/tenant/0034-optimize-search-function-v1.sql` | `9c5e3486c6e6f1467268dcc220ba5b3ed9abb39a` | PENDING |
| `migrations/tenant/0035-add-insert-trigger-prefixes.sql` | `801bb0d4bceefb74801d2d79a82ab607cb34f1fb` | PENDING |
| `migrations/tenant/0036-optimise-existing-functions.sql` | `789922a3afd63cf68a6a9d0848b1968824f70839` | PENDING |
| `migrations/tenant/0037-add-bucket-name-length-trigger.sql` | `95e1cc08b2451becf089d8001003a4a270cc03a5` | PENDING |
| `migrations/tenant/0038-iceberg-catalog-flag-on-buckets.sql` | `072319575f1891781278942ddeba8cf8b09fa0b3` | PENDING |
| `migrations/tenant/0039-add-search-v2-sort-support.sql` | `16f4fdc73b49738699020857f4cd3fd490768408` | PENDING |
| `migrations/tenant/0040-fix-prefix-race-conditions-optimized.sql` | `4692f5e2a34f1ebba886a951d1b68c0e3239b310` | PENDING |
| `migrations/tenant/0041-add-object-level-update-trigger.sql` | `2ad3134faef0f34f0060289fb100b04f05039ca2` | PENDING |
| `migrations/tenant/0042-rollback-prefix-triggers.sql` | `8370d68f0da784f9bbcb1297f7e10373d1001fa1` | PENDING |
| `migrations/tenant/0043-fix-object-level.sql` | `dc0cf69e0a76d298e776fa5ae20bbe7d499501af` | PENDING |
| `migrations/tenant/0044-vector-bucket-type.sql` | `6ba4ec587c7382a0d8616bd75e4eabfc0e4fc61c` | PENDING |
| `migrations/tenant/0045-vector-buckets.sql` | `23152dfd0721ead898a25526c3bd96d46adc9981` | PENDING |
| `migrations/tenant/0046-buckets-objects-grants.sql` | `45c3a621f36e588fca12dfff76b776fdee0e543e` | PENDING |
| `migrations/tenant/0047-iceberg-table-metadata.sql` | `e37d877421f1daca30e329e0b89bdc8ab64ad4ce` | PENDING |
| `migrations/tenant/0048-iceberg-catalog-ids.sql` | `188b4a961d07b646143ba1c3d2398147cc42ddd2` | PENDING |
| `migrations/tenant/0049-buckets-objects-grants-postgres.sql` | `e81a70da621065ac0c819ca6fc74e43b285c11a9` | PENDING |
| `migrations/tenant/0050-search-v2-optimised.sql` | `4d616a3f50071f94ef353b2b55ba5e69a9321281` | PENDING |
| `migrations/tenant/0051-index-backward-compatible-search.sql` | `11ea6093ba52405d7626365c78e2f9a5786bfb27` | PENDING |
| `migrations/tenant/0052-drop-not-used-indexes-and-functions.sql` | `660931f1dc8abbf6470c0ce98fbdbfa3ef9b472d` | PENDING |
| `migrations/tenant/0053-drop-index-lower-name.sql` | `88d90a8022249f0b8c56a8e6e9215e8717ba338b` | PENDING |
| `migrations/tenant/0054-drop-index-object-level.sql` | `7c8ef75e47147a0967c41d416d3441d1c37f6280` | PENDING |
| `migrations/tenant/0055-prevent-direct-deletes.sql` | `15119ffe63c55a398482ade2bd0bd28091003ef6` | PENDING |
| `migrations/tenant/0056-fix-optimized-search-function.sql` | `2af963cce0e29d5471655d0fbeb48f9f1cafedcb` | PENDING |
| `migrations/tenant/0057-s3-multipart-uploads-metadata.sql` | `ef9496bb870e1ebd375fd7be1ceb5c9c80c48e94` | PENDING |
| `migrations/tenant/0058-operation-ergonomics.sql` | `61b4d690940c4d6a6f0324b8546e5d9d66f68f13` | PENDING |
| `migrations/tenant/0059-drop-unused-functions.sql` | `1639de8af2902aebf1145f3a81fb61d7929b1733` | PENDING |
| `migrations/tenant/0060-optimize-existing-functions-again.sql` | `8e39c784c4b073640fa56e2f87f5f70f0a4fa189` | PENDING |
| `migrations/tenant/0061-mark-filename-immutable.sql` | `473f19ac94419f9cd3f25f2e40c97cefafb2798d` | PENDING |
| `migrations/tenant/0062-object-versioning-core.sql` | `280cd4501195ebd0c653195db355e0cf2bec90b3` | PENDING |
| `migrations/tenant/0063-fix-search-name-relative-to-prefix.sql` | `11c38a5896f22a2a2b6a588abbbc43306f5b8867` | PENDING |
| `migrations/tenant/0064-fix-search-by-timestamp-sqli.sql` | `e3689e05ac48d366b85b1d7133b631616edd90b9` | PENDING |
| `migrations/tenant/0065-objects-key-version-index.sql` | `d7873db4d7e83d64fcfbc0a32c1d1104124f72b1` | PENDING |
| `migrations/tenant/0066-objects-current-version-index.sql` | `40375f3090aff5e7fd6583c22ce7fe9abe1e6695` | PENDING |
| `migrations/tenant/0067-objects-null-version-index.sql` | `0105a83304bc342385f3f2ca1a3265be82b7d7cc` | PENDING |
| `migrations/tenant/0068-bucket-lifecycle-configuration.sql` | `dac36c0f7326600e4919b1fb63ac8803c1a2cd5b` | PENDING |
| `migrations/tenant/0069-validate-bucket-lifecycle-constraints.sql` | `9873c3d842913e0b98247e9133b9c811e6d414e0` | PENDING |
| `migrations/tenant/0070-list-objects-with-versions.sql` | `b33be25a918178126ef2f43f98612af7f0e2a813` | PENDING |
| `migrations/tenant/0071-objects-delete-marker-index.sql` | `9eb6360b0ced14dedf766c8144cfb510e6d4bfe5` | PENDING |
| `migrations/tenant/0072-drop-bucketid-objname-index.sql` | `875683493857c72809de2a1a880f0bada5490eb7` | PENDING |
| `migrations/tenant/0073-revoke-grants-to-unused-operations.sql` | `d22763e1cd75740155d11510fba13320fb49dbd5` | PENDING |
| `migrations/tenant/0074-unlock-object-versioning.sql` | `d0e28135e866601b78de24dee901c026fcb4a2eb` | PENDING |

## Unverified source/runtime prerequisites

- Pinned vendor image registry manifest digest vs local image-config ID; image source/tag-to-commit mapping.
- Actual Auth migration runner set and index-worker flag/execution identity; four source Auth indexes valid/ready.
- Actual Storage tenant migration order; `storage.install_roles`, `storage.super_user` context, owner/grantor/grant-option history.
- PostgreSQL 17.11.0.003 image bootstrap source mapping, two grant-option migration SHA-256 values and execution principal.
- Vault v0.3.1 extension binary, signatures and runtime ACL behavior; full managed catalog and isolation/resource/restore controls.

Never mark a PENDING digest PASS based on a Git SHA-1, image ID or untrusted name alone. T19 In progress; A12 unresolved; managed execution, restore and Zoho activation NO-GO; T20 Not started.
