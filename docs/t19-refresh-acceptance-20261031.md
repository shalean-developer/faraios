# T19 Shalean staging automatic refresh — 31 October 2026

Decision: PASS for expired-token automatic refresh and fresh-process persistence only. T19 remains In progress; T20 Not started.

The running source fingerprint matched 2a9be96b53925b0cac83b58e4985d11bf42bd0f5301c2c2274354271a06184bb (staging merge 387fcc61c07a72539b51c8f1772d0d64c0921c79).

Two bounded independent Plesk Node24 executions composed the deployed standard config loader, backend client, HTTPS store, cipher, provider and connection modules. The existing protected configuration was read only on the server. No owner login/session was supplied. The provider operation was organisation-list verification only.

| Probe | Expired before | Refresh calls | Persisted valid encrypted token | Same generation | Verified organisation |
|---|---|---|---|---|---|
| First fresh process | true | 1 | true | true | 943440851 |
| Second fresh process | false | 0 | true | true | 943440851 |

Both returned PASS. The first naturally expired access token exercised ordinary connection.access refresh under its durable lock and encrypted store update. The second process successfully decrypted and reused the persisted token. No clock manipulation or artificial token expiry was used. No secret values were printed.

A browser read timed out after the second execution. Existing result list items were read successfully without repeating execution. The scheduler form was cancelled, not saved; no recurring task or invoice worker was activated.

This evidence does not establish safe provider disconnect/reconnect, periodic background scheduling, invoice creation, retry/interruption reconciliation, independent Bokkie acceptance or final owner UAT. Those remain open. No financial write or production action occurred. Results are also recorded in the canonical T19 tracker note.
