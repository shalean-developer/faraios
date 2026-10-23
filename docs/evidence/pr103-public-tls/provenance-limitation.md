# Operator provenance statement — not independent raw event evidence

The initial read-only command used Docker events from 2026-10-23T07:49:20Z through 2026-10-23T07:52:30Z. It selected Type=container events where Actor.Attributes.name matched the exact run token a6ed4957f32a99c5d5c98cc3e9a8f8c8, collected Actor.ID, and then selected Type=volume events whose Actor.Attributes.container belonged to that ID set. It returned 3 task container IDs and 3 volume events. The latter were preserved in owned-volume-events.json. Together with the earlier two-server mount snapshot, their union identified four volumes.

The initial command did not preserve container-name rows. A later identical time-window query returned no matching events, so owned-container-events.json is empty. The reason for unavailable history is not established; do not assert complete Docker history coverage. No volume was selected solely by creation time or global prefix. All four exact volumes were detached before removal and absent afterward. Only two ownership mappings are independently reconstructable from the retained mount snapshot; two depend on this operator statement and the original filtering command visible in the task transcript.

No provider retry, broad prune, application fix or security setting change was performed to address this evidence limitation.
