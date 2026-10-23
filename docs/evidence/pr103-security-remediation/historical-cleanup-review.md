# Independent historical cleanup provenance review

Reviewer: separate Codex agent /root/pr103_cleanup_audit. Read-only investigation of the prior public TLS run evidence. No detected value, credential, raw daemon log or run identifier is reproduced here.

## Finding

Historical ownership provenance remains **NOT VERIFIED for two of four recorded volumes**. The prior mount snapshot directly establishes the database and restore-container mappings for two volumes. Two other recorded volume-unmount events contain container IDs but lack retained container-name rows. The original operator query reportedly selected those IDs by the exact task run name, but the mapping was not saved. The subsequent retained container-events file is empty. The operator statement is evidence of the procedure followed, not independent reconstruction of the missing rows.

## Supplementary read-only investigation

The reviewer searched nine rotated Docker VM log files and twelve contemporaneous rotated Docker backend/monitor host logs. Searches used the existing missing container IDs and run identifier only in memory, returning filenames, line numbers, counts and boolean matches. The active zero-byte VM log could not be read because it was locked; rotated logs were readable.

Both missing container IDs appeared in retained VM/backend/monitor logs. No exact task run identifier or fixture name was present in the searched logs. These findings support container lifecycle existence, but do not establish the missing task ownership mapping. Raw log content was neither copied into evidence nor printed. No global data/secret search was performed.

Docker's official documentation states that historical event retrieval returns only the last 256 events: https://docs.docker.com/reference/cli/docker/system/events/ . Thus a late query is not a durable audit trail. The exact eviction sequence for this run cannot be reconstructed, and this review does not claim that eviction was independently proven as the sole cause of the empty later response.

## Confirmed evidence-process defect and bounded correction

The retained files show that only two long-lived fixtures were inspected before deletion, while the later query preserved volume events without their container-name provenance. This is an evidence-retention defect. A corrected harness should synchronously persist an allowlisted ownership ledger before deleting each resource: fixture role, container ID, attached volume IDs and network ID. It should verify no remaining attachment before removing exact task-owned volumes and record absence afterward. Environment variables, credential values and raw inspect output must not enter the ledger. Broad prefix deletion and volume pruning are inappropriate.

A separate bounded **offline-only** cleanup regression can verify the corrected lifecycle and evidence capture for four fixtures, success/failure paths and unrelated-resource preservation. It requires no public TLS probe. A new passing regression would provide prospective assurance; it cannot retroactively repair the missing historical ownership rows.

## Decision

Historical exhaustive 4/4 ownership mapping: **NOT VERIFIED / NO-GO for an unqualified historical cleanup PASS**. Preserve the original orphan-volume observation, subsequent targeted-removal records, operator provenance statement and prior independent QA. The earlier public TLS and transport assertion results are separate and are not invalidated by this evidence limitation.

No provider contact, test execution, Docker mutation, repository source change, incident action, scanning change, billing change or merge was performed by this reviewer. This report is the only file written for the preservation request. T19 remains In progress; accounting activation NO-GO.
