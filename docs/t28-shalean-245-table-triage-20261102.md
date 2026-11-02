# T28 — Shalean source-table classification (read-only metadata)

**Source:** Connected Shalean production Supabase `paqjwfulwywtsyyvdxrq` information_schema public BASE TABLE names on 2026-11-02. **245 tables**. The assignment below is a **provisional name-based triage**, not a verified field-to-field mapping or approved legacy retention decision. Every source row is accounted for; no data rows accessed and no production mutation.

Codes: MAP_REVIEW = V1 operational mapping requires fields/ownership proof; FINANCE_REVIEW = financial reconciliation and original obligations; EVIDENCE_REVIEW = auth/audit/notification retention and access scope; LEGACY_RETAIN_CANDIDATE = website/marketing etc. likely retained in source subject to owner policy and financial exceptions; OPERATIONS_REVIEW = operational auxiliary data requires dependency review; OPEN_UNMATCHED = not yet classified safely. Four manual follow-up tables were explicitly classified after name-only triage: cleaner_booking_track_points (privacy/operational), customer_care_case_events (evidence), customer_care_cases (service obligation), customer_monthly_billing_terms (financial).

| # | Source public table | Family | Provisional treatment | Gate |
|---:|---|---|---|---|
| 1 | `accounting_invoice_sync` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 2 | `accounting_sync_records` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 3 | `admin_access_reviews` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 4 | `admin_api_idempotency` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 5 | `admin_audit_events` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 6 | `admin_billing_idempotency` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 7 | `admin_booking_create_idempotency` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 8 | `admin_branch_assignments` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 9 | `admin_earnings_actions` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 10 | `admin_money_action_proposals` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 11 | `admin_permissions` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 12 | `admin_request_dedupe` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 13 | `admin_role_permissions` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 14 | `admin_roles` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 15 | `admin_team_assignments` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 16 | `admin_user_roles` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 17 | `ai_decision_logs` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 18 | `ai_experiment_exposures` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 19 | `ai_feature_store` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 20 | `ai_model_weights` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 21 | `birthday_rewards` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 22 | `blog_authors` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 23 | `blog_categories` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 24 | `blog_editor_save_receipts` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 25 | `blog_post_revisions` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 26 | `blog_post_tags` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 27 | `blog_posts` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 28 | `blog_posts_draft_backup_202609` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 29 | `blog_posts_draft_backup_20260910` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 30 | `blog_tags` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 31 | `booking_changes` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 32 | `booking_cleaner_earnings_snapshot` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 33 | `booking_cleaner_earnings_snapshot_lines` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 34 | `booking_cleaners` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 35 | `booking_demand_events` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 36 | `booking_events` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 37 | `booking_lifecycle_jobs` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 38 | `booking_line_items` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 39 | `booking_payment_recovery_jobs` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 40 | `booking_roster_member_payouts` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 41 | `booking_service_checklists` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 42 | `booking_service_photos` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 43 | `booking_team_assignments` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 44 | `booking_totals` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 45 | `bookings` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 46 | `business_health_scores` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 47 | `campaign_assets` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 48 | `campaign_content` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 49 | `campaign_templates` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 50 | `cities` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 51 | `city_configs` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 52 | `cleaner_applications` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 53 | `cleaner_auth_links` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 54 | `cleaner_availability` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 55 | `cleaner_booking_track_points` | Operational auxiliary | Retain location evidence with privacy/retention controls; verify required dispatch history | OPERATIONS_REVIEW |
| 56 | `cleaner_change_requests` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 57 | `cleaner_compliance_records` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 58 | `cleaner_early_finish_requests` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 59 | `cleaner_earnings` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 60 | `cleaner_earnings_adjustments` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 61 | `cleaner_earnings_disbursements` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 62 | `cleaner_earnings_disputes` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 63 | `cleaner_job_issue_report_idempotency` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 64 | `cleaner_job_issue_reports` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 65 | `cleaner_job_lifecycle_idempotency` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 66 | `cleaner_locations` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 67 | `cleaner_payment_details` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 68 | `cleaner_payout_runs` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 69 | `cleaner_payouts` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 70 | `cleaner_preferences` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 71 | `cleaner_report_feedback` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 72 | `cleaner_training_assignments` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 73 | `cleaners` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 74 | `cleaning_credit_reservations` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 75 | `cleaning_credit_transactions` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 76 | `conversion_deferred_payment_link_emails` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 77 | `conversion_experiment_results` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 78 | `conversion_experiments` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 79 | `cron_http_targets` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 80 | `cron_run_leases` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 81 | `cron_runs` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 82 | `customer_care_case_events` | Access, audit, communications | Retain customer-care audit and link to complaint evidence; no assumed V1 case equivalent | EVIDENCE_REVIEW |
| 83 | `customer_care_cases` | Operational auxiliary | Retain unresolved customer-service obligations; agree case handling if active | OPERATIONS_REVIEW |
| 84 | `customer_contact_health` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 85 | `customer_earnings_policies` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 86 | `customer_identity_aliases` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 87 | `customer_memberships` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 88 | `customer_monthly_billing_terms` | Financial obligations | Compare current billing agreements, due dates and outstanding invoicing with T19 | FINANCE_REVIEW |
| 89 | `customer_saved_addresses` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 90 | `customer_segment` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 91 | `customers` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 92 | `daily_booking_funnel_metrics` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 93 | `daily_conversion_metrics` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 94 | `daily_payment_metrics` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 95 | `daily_service_metrics` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 96 | `data_retention_settings` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 97 | `dispatch_experiment_snapshots` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 98 | `dispatch_logs` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 99 | `dispatch_metrics` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 100 | `dispatch_offer_exposure_dedupe` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 101 | `dispatch_offer_timeout_metric_emitted` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 102 | `dispatch_offers` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 103 | `dispatch_retry_queue` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 104 | `earnings_disbursement_transfers` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 105 | `email_campaign_attributions` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 106 | `email_campaign_sends` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 107 | `email_campaigns` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 108 | `email_delivery_events` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 109 | `email_outbound_messages` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 110 | `email_suppressions` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 111 | `expense_accounts` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 112 | `expense_approval_events` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 113 | `expense_approval_limits` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 114 | `expense_categories` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 115 | `expense_vendors` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 116 | `expenses` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 117 | `failed_jobs` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 118 | `faqs` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 119 | `finance_budget_lines` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 120 | `finance_budgets` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 121 | `finance_chart_of_accounts` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 122 | `finance_notifications` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 123 | `fleet_vehicles` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 124 | `growth_action_outcomes` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 125 | `growth_customer_touch` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 126 | `inventory_equipment_issues` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 127 | `inventory_items` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 128 | `inventory_movements` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 129 | `invoice_adjustments` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 130 | `lifecycle_email_metrics` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 131 | `lifecycle_email_settings` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 132 | `location_gsc_metrics` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 133 | `location_gsc_queries` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 134 | `location_gsc_sync_meta` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 135 | `locations` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 136 | `marketing_automation_rules` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 137 | `marketing_publish_idempotency` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 138 | `marketing_spend` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 139 | `membership_plans` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 140 | `monthly_invoice_events` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 141 | `monthly_invoice_paystack_charge_dedup` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 142 | `monthly_invoices` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 143 | `newsletter_subscribers` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 144 | `notification_alerts` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 145 | `notification_idempotency_claims` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 146 | `notification_logs` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 147 | `notification_runtime_flags` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 148 | `office_email_verification_challenges` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 149 | `payment_link_delivery_events` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 150 | `payment_transactions` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 151 | `payout_audit_events` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 152 | `payout_transfer_outbox` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 153 | `payout_transfers` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 154 | `pricing_booking_config` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 155 | `pricing_catalog_audit` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 156 | `pricing_changes` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 157 | `pricing_extra_bundles` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 158 | `pricing_extras` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 159 | `pricing_metrics` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 160 | `pricing_rules` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 161 | `pricing_services` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 162 | `pricing_slot_adjustments` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 163 | `pricing_tiers` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 164 | `pricing_versions` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 165 | `promotion_audit_log` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 166 | `promotion_bundles` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 167 | `promotion_events` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 168 | `promotion_redemptions` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 169 | `promotion_telemetry_rate_limit_buckets` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 170 | `promotions` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 171 | `quality_inspection_defects` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 172 | `quality_inspection_events` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 173 | `quality_inspections` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 174 | `recurring_bookings` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 175 | `recurring_expenses` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 176 | `recurring_prepaid_allocations` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 177 | `recurring_prepaid_packages` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 178 | `referral_discount_redemptions` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 179 | `referral_events` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 180 | `referral_program_settings` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 181 | `referral_submissions` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 182 | `referrals` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 183 | `refund_accounting_records` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 184 | `review_homepage_publications` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 185 | `review_sms_prompt_queue` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 186 | `reviews` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 187 | `sales_document_paystack_charge_dedup` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 188 | `sales_documents` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 189 | `sales_opportunity_activities` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 190 | `sales_quote_acceptance_snapshots` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 191 | `seo_auto_apply_audit` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 192 | `seo_auto_hub_ui_patch` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 193 | `seo_auto_title_variant` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 194 | `seo_backlink_imports` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 195 | `seo_backlink_opportunities` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 196 | `seo_backlinks` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 197 | `seo_competitor_rankings` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 198 | `seo_competitors` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 199 | `seo_content_refresh_history` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 200 | `seo_content_refreshes` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 201 | `seo_indexing_runs` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 202 | `seo_indexing_states` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 203 | `seo_insights_recommendations` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 204 | `seo_local_visibility` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 205 | `seo_local_visibility_snapshots` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 206 | `seo_recommendation_status_history` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 207 | `seo_serp_features` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 208 | `seo_serp_snapshots` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 209 | `seo_structured_data_audits` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 210 | `seo_tracked_keywords` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 211 | `seo_web_vitals_snapshots` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 212 | `service_earning_caps` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 213 | `services` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 214 | `site_gsc_metrics` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 215 | `social_accounts` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 216 | `social_publish_history` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 217 | `social_publish_jobs` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 218 | `subscriptions` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 219 | `system_logs` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 220 | `system_metrics` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 221 | `team_daily_capacity_usage` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 222 | `team_job_member_payouts` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 223 | `team_members` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 224 | `teams` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 225 | `templates` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 226 | `transport_cost_entries` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 227 | `transport_drivers` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 228 | `transport_runs` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 229 | `transport_stops` | V1 core operations | Candidate T12–T18/T22/T24 mapping; verify individual fields and histories | MAP_REVIEW |
| 230 | `travel_route_cache` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 231 | `user_behavior` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 232 | `user_events` | Legacy site/growth | Retain source/website unless required V1 records/obligations identified | LEGACY_RETAIN_CANDIDATE |
| 233 | `user_notifications` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 234 | `user_profiles` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 235 | `user_push_tokens` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 236 | `whatsapp_cleaner_unmatched_intent_log` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 237 | `whatsapp_delivery_events` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 238 | `whatsapp_inbound_feedback_dedupe` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 239 | `whatsapp_logs` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 240 | `whatsapp_marketing_consent` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 241 | `whatsapp_provider_events` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 242 | `whatsapp_queue` | Access, audit, communications | T08–T11/T24–T27 or retain immutable evidence; verify actor/consent | EVIDENCE_REVIEW |
| 243 | `workforce_training_modules` | Operational auxiliary | Classify dependent operational evidence and transitional retention | OPERATIONS_REVIEW |
| 244 | `zoho_expense_period_mirror` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |
| 245 | `zoho_integration_settings` | Financial obligations | Review ledger/source authority → T19–T23 or legacy financial retention | FINANCE_REVIEW |

## Acceptance limitations
- No per-table precise source columns, keys, counts, relationships, RLS, lifecycle state or provider reconciliation have been reviewed in this classification.
- For any legacy-only candidate, preserve records and access in existing Shalean systems until owner agrees a transition. Bokkie decision T28-BOK-DEV-01 does not automatically authorize Shalean retention choices.
- Required V1 records need source column→destination column, stable crosswalk, business ownership, transformation, date/time and cents interpretation, historical/future status, and reconciliation rule.
- Sensitive financial/credit/refund/invoice data cannot be treated as nonessential because a module is outside V1. No deletion, archival action, import or production switch is authorized.
- **Classification coverage is 245/245 by name, but T28 acceptance mapping coverage is not 245/245.**
