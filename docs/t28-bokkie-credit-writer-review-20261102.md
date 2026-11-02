# T28 — Bokkie credit-writer source review (2026-11-02)

Owner supplied public schema object-name listing: functions assign_voucher_to_user, create_referral_relationship, fix_missing_credits_for_verified_eft, get_or_create_referral_code, get_purchasable_vouchers, initialize_referral_code, initialize_user_credits, process_referral_rewards, purchase_voucher, record_discount_voucher_usage, redeem_credit_voucher, settle_credit_operation_private, update_credit_balance, validate_discount_voucher; triggers for updated_at on credit_transactions, pending_voucher_purchases, referral_codes, referrals, user_credits, vouchers.

This proves object existence/name only; it **does not** establish which function ran in December 2025 or caused the R50 continuity gap. Names do not prove behavior, and the updated_at trigger is not proof of an independent credit ledger event.

Connected GitHub Bokkie `main` read-only source review:
- `supabase/migrations/010_shalcred_system.sql` defines `update_credit_balance` changing `user_credits.balance` but without inserting a `credit_transactions` row inside that function, so calling it alone *could* create an unledgered change. This is a plausible architectural explanation, not proof of the actual live definition or invocation.
- Same migration has `initialize_user_credits` creating a zero balance only.
- `supabase/migrations/013_fix_incorrect_balance_values.sql` defines `recalculate_transaction_balance` that can UPDATE existing credit_transactions and is destructive; never execute this or other credit-repair functions as part of T28. The source also defines a read-only-oriented `identify_incorrect_balance_transactions`, but avoid calling any live function without audit/permission review.
- Actual live definition and write privileges may differ from repository migrations.

Owner supplied historical R50 gap: completed transactions 2025-12-14T17:54:06Z closing R3100; 2025-12-16T20:16:45Z next opening R3150. Protect current R64.75; continue only read-only definition/object privilege review, no function execution, repair or financial write.

Next metadata-only check: list `pg_proc` function signatures/security-definer flags and `pg_trigger` source table/event associations (not function arguments, source user IDs, or environment secrets), and review code references to credit balance mutation in GitHub. If full function bodies are needed, review privately to avoid exposing possible embedded secrets; do not paste raw secrets.
