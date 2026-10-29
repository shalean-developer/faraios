# T19 Storage denied-request evidence

The owner reported /root/t19-bootstrap-run-rGtF85g5 against staging 94f0b10dabfb790052bbe86314207321f95a1a1d. It passed managed catalog equality (no differing components) and inactive custody checks, then stopped at STORAGE_DENIED_REQUEST_FAILED. Cleanup was verified, no checkpoint was used and no restore or operational custody installation occurred. The previous HTTP helper discarded error bodies and did not journal the failed assertion's HTTP result, so the historical response cannot be reconstructed or treated as a security PASS.

The inspected vendor source at supabase/storage commit d2836fe9e8157f4fc558af0071a7671d373ff3ef explains a possible mismatch: src/http/error-handler.ts maps renderable non-500 errors to HTTP 400 unless configured otherwise, while preserving statusCode and code in JSON. src/internal/errors/codes.ts defines AccessDenied with status 403. This is an explanation to test, not a claim about the discarded owner-host response.

The probe now retains only the HTTP status and two allowlisted values (statusCode 403 and code AccessDenied). Bodies are bounded to 4096 bytes and arbitrary messages, tokens and returned data are excluded from evidence. A failed request is journalled before assertion. A generic HTTP 400, validation error, timeout, 500 or successful response cannot qualify as denial. The vendor wrapper qualifies only with the exact structured 403/AccessDenied pair, plus database proof that the denied bucket is absent, the permitted bucket remains and exactly one bucket exists. Direct HTTP 401/403 also require the same database state proof. The permitted fixture must still be removed and the later empty-data, stable-catalog and full resource cleanup gates must pass.

Tests cover exact wrapped denial, direct denial, wrong status/code/state, response evidence allowlisting and record-before-failure. This changes only the isolated synthetic harness; it does not alter hosted permissions, RLS, image pins, migration boundaries, archives or historical receipts. A fresh owner signature is required for runtime verification. The protected restore project remains untouched; T20 is excluded.

References:
- https://github.com/supabase/storage/blob/d2836fe9e8157f4fc558af0071a7671d373ff3ef/src/http/error-handler.ts
- https://github.com/supabase/storage/blob/d2836fe9e8157f4fc558af0071a7671d373ff3ef/src/internal/errors/codes.ts
