<?php
declare(strict_types=1);
// Returns the initial audit snapshot; direct HTTP requests emit no task data.
return json_decode(<<<'PLATFORM_AUDIT'
{
  "schema": 1,
  "revision": 0,
  "audited_at": "2026-11-16",
  "source": "4cea37e553edd3d6b1faae277a3286f7134c3801",
  "repair_head": "04c336861c3dd46ed57cbc7e799a0e3ee9cc6c9a",
  "scope": "Read-only live UI, main source, PR68 evidence, Foundation Plan v71 and Defect Plan v22. No retained business writes, provider sends or new physical-phone tests.",
  "tasks": [
    {
      "id": "V1-001",
      "title": "Release the tested D01\u2013D06 repairs",
      "kind": "Defect",
      "priority": "Critical",
      "status": "Preview",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "The repaired pagination, time zones, record selectors, forms and staff joining are still preview-only.",
      "notes": "Owner v1.0.0 checklist item 01 of 20.",
      "evidence_note": "PR68 final-release-review.md; Foundation Plan v71.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/68",
      "checks": [
        {
          "text": "Complete remaining phone acceptance",
          "done": false
        },
        {
          "text": "Review exact six-file and SQL scope",
          "done": false
        },
        {
          "text": "Authorize, deploy and verify live",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-002",
      "title": "Prove new-account verification on a phone",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Existing-account invitations passed; a genuinely new account signup and verification phone journey remains unaccepted.",
      "notes": "Owner v1.0.0 checklist item 02 of 20.",
      "evidence_note": "Foundation Plan v71, final review.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/68",
      "checks": [
        {
          "text": "Register a new synthetic account",
          "done": false
        },
        {
          "text": "Confirm email and land in the intended flow",
          "done": false
        },
        {
          "text": "Recover expired verification and password-reset links",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-003",
      "title": "Accept stale forms and connection recovery",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Automated safeguards exist; deliberate physical-phone stale-version and interrupted-submit cases remain open.",
      "notes": "Owner v1.0.0 checklist item 03 of 20.",
      "evidence_note": "Foundation Plan v71.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/68",
      "checks": [
        {
          "text": "Reject stale saves without overwriting newer data",
          "done": false
        },
        {
          "text": "Retain entered fields after recoverable errors",
          "done": false
        },
        {
          "text": "Retry without duplicate customers, bookings or payments",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-004",
      "title": "Accept payment replay and cross-page assignments",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Basic phone payment and selection passed; deliberate replay and cross-page assignment acceptance remain open.",
      "notes": "Owner v1.0.0 checklist item 04 of 20.",
      "evidence_note": "PR68 acceptance evidence.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/68",
      "checks": [
        {
          "text": "Same payment retry creates one ledger entry",
          "done": false
        },
        {
          "text": "Assignments survive browsing multiple staff pages",
          "done": false
        },
        {
          "text": "Stale assignment rejected without data loss",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-005",
      "title": "Define and enforce launch scheduling constraints",
      "kind": "Capability",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Current assignment code reports overlapping jobs after assignment; complete atomic availability is a planned shared-core package.",
      "notes": "Owner v1.0.0 checklist item 05 of 20.",
      "evidence_note": "staff_booking_assignment.sql staff_private.assign and business_booking_schedule; SC08 planned.",
      "evidence_url": "https://github.com/shalean-developer/faraios/blob/main/supabase/migrations/20261113103036_staff_booking_assignment.sql",
      "checks": [
        {
          "text": "Agree launch rules for hours, leave, capacity and buffers",
          "done": false
        },
        {
          "text": "Reject conflicting confirmation or assignment atomically",
          "done": false
        },
        {
          "text": "Prove simultaneous confirmation and time-zone boundaries",
          "done": false
        }
      ],
      "dependencies": [
        "V1-006"
      ],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-006",
      "title": "Agree the exact v1.0.0 product promise",
      "kind": "Decision",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Use request-first service management, guest document links and manual payment recording as the proposed initial scope. Cross-industry expansion needs separate pilot proof.",
      "notes": "Owner v1.0.0 checklist item 06 of 20.",
      "evidence_note": "Foundation Plan SC01 and this audit recommendation.",
      "evidence_url": "https://chatgpt.com/library?file_id=libfile_5f8898a27afc81919b224c0039a9a738&account_id=personal",
      "checks": [
        {
          "text": "Approve supported operating model and countries/currencies",
          "done": false
        },
        {
          "text": "Record optional features excluded from v1.0.0",
          "done": false
        },
        {
          "text": "Align all release acceptance criteria",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-007",
      "title": "Align public availability statements with live behavior",
      "kind": "Defect",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Features says booking intake is excluded and live access is owner-only. Live booking entry and the owner Access screen both expose those capabilities. Public claims are stale.",
      "notes": "Owner v1.0.0 checklist item 07 of 20.",
      "evidence_note": "Observed /features on 16 November; Foundation Plan current intake section.",
      "evidence_url": "https://www.faraios.com/features",
      "checks": [
        {
          "text": "Reconcile actual live capabilities and flags",
          "done": false
        },
        {
          "text": "Update homepage, Features, About, Pricing and walkthrough consistently",
          "done": false
        },
        {
          "text": "Verify public claims against the deployed release",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-008",
      "title": "Audit every supported role against the final live candidate",
      "kind": "Verification",
      "priority": "Critical",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Preview role tests are substantial; final live release acceptance must remain distinct from source implementation and marketing claims.",
      "notes": "Owner v1.0.0 checklist item 08 of 20.",
      "evidence_note": "PR68 final release scope; source/main and hosted runtime differ.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/68",
      "checks": [
        {
          "text": "Owner, manager, receptionist and worker permitted paths pass",
          "done": false
        },
        {
          "text": "Cross-business and direct API denials pass",
          "done": false
        },
        {
          "text": "Revocation and financial-field filtering pass",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-009",
      "title": "Prove a complete independent-business pilot",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Empty live screens load successfully, but that does not establish the whole operational journey.",
      "notes": "Owner v1.0.0 checklist item 09 of 20.",
      "evidence_note": "Read-only live Bokkie account screens; no business records mutated.",
      "evidence_url": "https://www.faraios.com/account/dashboard.php",
      "checks": [
        {
          "text": "New owner configures services and publishes a site",
          "done": false
        },
        {
          "text": "Guest request becomes deliberately priced accepted work",
          "done": false
        },
        {
          "text": "Assign, complete, invoice and record payment with history intact",
          "done": false
        },
        {
          "text": "Repeat cancellation, correction and denied-access paths",
          "done": false
        }
      ],
      "dependencies": [
        "V1-006"
      ],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-010",
      "title": "Complete essential booking lifecycle communication",
      "kind": "Capability",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Enquiry and invitation transport exist; quote/invoice screens use manual customer-link sharing. Full lifecycle communications remain SC10.",
      "notes": "Owner v1.0.0 checklist item 10 of 20.",
      "evidence_note": "account/quotes.php and invoices.php; Foundation Plan SC10.",
      "evidence_url": "https://github.com/shalean-developer/faraios/blob/main/account/quotes.php",
      "checks": [
        {
          "text": "Agree which events send automatically and which are manual",
          "done": false
        },
        {
          "text": "Show confirmation, change and cancellation information",
          "done": false
        },
        {
          "text": "Deduplicate retries and expose failures with recovery",
          "done": false
        }
      ],
      "dependencies": [
        "V1-006"
      ],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-011",
      "title": "Validate service configuration for the launch model",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Fixed, from and quote pricing exist. Generic capability profiles and typed intake across models remain planned.",
      "notes": "Owner v1.0.0 checklist item 11 of 20.",
      "evidence_note": "account/services.php; SC05 planned.",
      "evidence_url": "https://github.com/shalean-developer/faraios/blob/main/account/services.php",
      "checks": [
        {
          "text": "Prove fixed/from/quote, extras and duration for the launch pilot",
          "done": false
        },
        {
          "text": "Preserve agreed scope and prices after catalogue edits",
          "done": false
        },
        {
          "text": "Do not advertise untested industry workflows",
          "done": false
        }
      ],
      "dependencies": [
        "V1-006"
      ],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-012",
      "title": "Financial safeguards",
      "kind": "Verification",
      "priority": "Critical",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Existing regression covers financial controls; final release needs evidence for its exact deployed candidate.",
      "notes": "Owner v1.0.0 checklist item 12 of 20.",
      "evidence_note": "F02/F03/F04 history and PR68.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/68",
      "checks": [
        {
          "text": "Issued originals and payment reversals remain traceable",
          "done": false
        },
        {
          "text": "No duplicate active invoice or overpayment on retry",
          "done": false
        },
        {
          "text": "Verify invoice numbering, totals, balances, reversals and duplicate prevention",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-013",
      "title": "Review fresh database restore evidence",
      "kind": "Verification",
      "priority": "High",
      "status": "Verified",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Fresh isolated database restore is successful. The plans still show the earlier queued state; this tracker records the verified current run.",
      "notes": "",
      "evidence_note": "GitHub run43843901476 concluded success on16 November.",
      "evidence_url": "https://github.com/shalean-developer/faraios/actions/runs/43843901476",
      "checks": [
        {
          "text": "Fresh isolated restore run completes successfully",
          "done": true
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-014",
      "title": "Confirm support, monitoring and recovery ownership",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Backups/monitoring have implementation evidence. Release readiness still needs agreed ownership, recovery targets and a usable support route.",
      "notes": "Owner v1.0.0 checklist item 15 of 20.",
      "evidence_note": "Foundation Plan F06; operational evidence.",
      "evidence_url": "https://chatgpt.com/library?file_id=libfile_5f8898a27afc81919b224c0039a9a738&account_id=personal",
      "checks": [
        {
          "text": "Name the person responsible for failed jobs and alerts",
          "done": false
        },
        {
          "text": "Record recovery time/data-loss objectives and instructions",
          "done": false
        },
        {
          "text": "Verify support contact and an incident recovery drill",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-015",
      "title": "Complete privacy, export and account lifecycle review",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Initial customer access uses secure guest links. Account restriction, export and retention behavior need explicit launch decisions. This is a readiness gap, not a legal certification.",
      "notes": "Owner v1.0.0 checklist item 16 of 20.",
      "evidence_note": "Foundation Plan platform operations boundary.",
      "evidence_url": "https://www.faraios.com/privacy.html",
      "checks": [
        {
          "text": "Document retained data and account closure process",
          "done": false
        },
        {
          "text": "Provide an accountable support/export process",
          "done": false
        },
        {
          "text": "Confirm draft/private/public data separation",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-016",
      "title": "Verify mobile usability and accessible controls",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Marketing headers passed; this does not accept all application forms. Test full launch journeys at320/390/768/1280.",
      "notes": "Owner v1.0.0 checklist item 17 of 20.",
      "evidence_note": "Header release PR70; PR68 partial phone acceptance.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/70",
      "checks": [
        {
          "text": "Keyboard and phone navigation remain usable",
          "done": false
        },
        {
          "text": "Labels, error focus and touch targets work",
          "done": false
        },
        {
          "text": "No horizontal overflow or invisible actions",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-017",
      "title": "Establish one reproducible release manifest",
      "kind": "Verification",
      "priority": "Critical",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Main Git source and the deliberately transformed hosted account runtime are not identical. A whole-repository pull must not replace staged role files.",
      "notes": "Owner v1.0.0 checklist item 18 of 20.",
      "evidence_note": "Current deployment method; PR68 exact scope.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/68",
      "checks": [
        {
          "text": "Inventory actual live runtime, schema and enabled capabilities",
          "done": false
        },
        {
          "text": "Pin the complete v1.0.0 candidate and migration set",
          "done": false
        },
        {
          "text": "Rehearse rollback preserving new records",
          "done": false
        },
        {
          "text": "Run required CI against the exact combined candidate",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-018",
      "title": "Activate your platform-owner tracker",
      "kind": "Dashboard",
      "priority": "High",
      "status": "In progress",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Dashboard is being built with deny-by-default owner access. The platform-owner sign-in email has not yet been supplied. Business ownership never grants platform access.",
      "notes": "Owner v1.0.0 checklist item 19 of 20.",
      "evidence_note": "This work package.",
      "evidence_url": "",
      "checks": [
        {
          "text": "Identify and verify your exact owner account",
          "done": false
        },
        {
          "text": "Test unauthorized, expired-session and CSRF denial",
          "done": false
        },
        {
          "text": "Prove task edits persist with conflict protection and history",
          "done": false
        },
        {
          "text": "Accept preview before any live dashboard release",
          "done": false
        },
        {
          "text": "Include private task history in encrypted recovery and prove restore",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-019",
      "title": "Keep marketing design and navigation consistent",
      "kind": "Verification",
      "priority": "Normal",
      "status": "Verified",
      "blocking": false,
      "release": "v1.0.0",
      "summary": "Shared header deployed across21 public pages; live logo and signup/signin checks passed.",
      "notes": "",
      "evidence_note": "PR70 bounded release24 files,441 protected.",
      "evidence_url": "https://github.com/shalean-developer/faraios/pull/70",
      "checks": [
        {
          "text": "Shared template applied to21 relevant pages",
          "done": true
        },
        {
          "text": "Live logo and account navigation pass",
          "done": true
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-020",
      "title": "Add online payment collection",
      "kind": "Later",
      "priority": "Normal",
      "status": "To do",
      "blocking": false,
      "release": "Later",
      "summary": "Optional after v1.0.0 when the launch explicitly offers manual recording only.",
      "notes": "",
      "evidence_note": "Deferred scope recommendation.",
      "evidence_url": "",
      "checks": [
        {
          "text": "Separate provider, refund and reconciliation design",
          "done": false
        },
        {
          "text": "Independent security and financial acceptance",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-021",
      "title": "Expand industry models, recurring automation and AI",
      "kind": "Later",
      "priority": "Normal",
      "status": "To do",
      "blocking": false,
      "release": "Later",
      "summary": "Defer broad expansion until the first operating model is proven.",
      "notes": "",
      "evidence_note": "Foundation Plan defer section.",
      "evidence_url": "",
      "checks": [
        {
          "text": "Separate operating-model pilots",
          "done": false
        },
        {
          "text": "Scope recurring services and specialist workflows",
          "done": false
        },
        {
          "text": "Add AI only with a tested purpose",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T10:35:00Z"
    },
    {
      "id": "V1-022",
      "title": "Customer document privacy",
      "kind": "Verification",
      "priority": "Critical",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Ensure guest links expose only the intended document and permitted customer actions.",
      "notes": "Owner v1.0.0 checklist item 13 of 20.",
      "evidence_note": "v1.0.0 checklist approved for entry by the owner, 16 November 2026.",
      "evidence_url": "",
      "checks": [
        {
          "text": "Quote and invoice links reveal only their intended document",
          "done": false
        },
        {
          "text": "Another business or guessed record cannot expose customer history",
          "done": false
        },
        {
          "text": "Private notes and staff/finance fields remain restricted",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T00:00:00Z"
    },
    {
      "id": "V1-023",
      "title": "Final release backup and recovery",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Retain the successful database restore as evidence, then verify the exact final release including private configuration and dashboard task history.",
      "notes": "Owner v1.0.0 checklist item 14 of 20.",
      "evidence_note": "v1.0.0 checklist approved for entry by the owner, 16 November 2026.",
      "evidence_url": "",
      "checks": [
        {
          "text": "Retain successful database restore evidence",
          "done": false
        },
        {
          "text": "Include private dashboard state in encrypted backup or verified recovery export",
          "done": false
        },
        {
          "text": "Restore the final release safely and record recovery targets",
          "done": false
        }
      ],
      "dependencies": [],
      "updated_at": "2026-11-16T00:00:00Z"
    },
    {
      "id": "V1-024",
      "title": "Pilot acceptance and v1.0.0 launch",
      "kind": "Verification",
      "priority": "High",
      "status": "To do",
      "blocking": true,
      "release": "v1.0.0",
      "summary": "Resolve serious findings from the complete independent-business pilot, accept documented limits, authorize rollout and verify live operation.",
      "notes": "Owner v1.0.0 checklist item 20 of 20.",
      "evidence_note": "v1.0.0 checklist approved for entry by the owner, 16 November 2026.",
      "evidence_url": "",
      "checks": [
        {
          "text": "Complete happy-path and rejected-path pilot journeys",
          "done": false
        },
        {
          "text": "Resolve critical security, data-loss and financial defects",
          "done": false
        },
        {
          "text": "Owner accepts documented launch limitations",
          "done": false
        },
        {
          "text": "Authorize bounded rollout and verify the live release",
          "done": false
        }
      ],
      "dependencies": [
        "V1-009",
        "V1-017",
        "V1-023"
      ],
      "updated_at": "2026-11-16T00:00:00Z"
    }
  ],
  "history": []
}
PLATFORM_AUDIT
,true,128,JSON_THROW_ON_ERROR);
