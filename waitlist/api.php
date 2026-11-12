<?php
declare(strict_types=1);
require __DIR__ . '/core.php';
wl_headers();
try {
    $c = wl_config();
    if (!$c['enabled']) wl_json(['error' => 'The waitlist is not open yet. Please try again soon.'], 503);
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (!in_array($method, ['GET', 'POST'], true)) { header('Allow: GET, POST'); wl_json(['error' => 'Method not allowed.'], 405); }
    $db = wl_db();
    // Use the directly connected address, never a spoofable forwarding header.
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (!wl_rate($db, 'all:' . $ip, 60, 600)) wl_json(['error' => 'Too many requests. Please try again later.'], 429);
    wl_session();
    if ($method === 'GET') wl_json(['csrf' => $_SESSION['csrf'], 'consent_version' => WL_CONSENT_VERSION]);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $u = parse_url($c['base_url']);
    $expectedOrigin = $u['scheme'] . '://' . $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
    if ($origin !== $expectedOrigin) wl_json(['error' => 'Please submit the form from the FaraiOS website.'], 403);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) wl_json(['error' => 'Form is too large.'], 413);
    if (strtok($_SERVER['CONTENT_TYPE'] ?? '', ';') !== 'application/json') wl_json(['error' => 'Unsupported form format.'], 415);
    $data = json_decode(file_get_contents('php://input', false, null, 0, 8193), true, 16, JSON_THROW_ON_ERROR);
    if (!is_array($data)) wl_json(['error' => 'Please check the form.'], 422);
    if (!is_string($data['csrf'] ?? null) || !hash_equals($_SESSION['csrf'], $data['csrf'])) wl_json(['error' => 'Your form expired. Close and reopen it to try again.'], 403);
    if (!wl_rate($db, 'submit:' . $ip, 5, 3600)) wl_json(['error' => 'Too many attempts. Please try again in an hour.'], 429);
    $fields = wl_validate($data);
    $generic = ['message' => 'Check your inbox for a confirmation link. If you have already joined, your place is saved.'];
    if (trim($data['website'] ?? '') !== '') wl_json($generic);
    if (time() - $_SESSION['opened'] < $c['min_seconds']) wl_json(['error' => 'Please take a moment to check your details, then try again.'], 422);
    if (!wl_rate($db, 'email:' . $fields[1], 3, 86400)) wl_json($generic);
    $job = wl_signup($db, $fields);
    session_write_close();
    // The request is durable before mail handoff; the scheduled worker retries known failures.
    if ($job !== null) {
        try { wl_process($db, $job); }
        catch (Throwable $e) { error_log('FaraiOS waitlist mail handoff needs review: ' . get_class($e)); }
    }
    wl_json($generic);
} catch (InvalidArgumentException $e) { wl_json(['error' => $e->getMessage()], 422);
} catch (JsonException $e) { wl_json(['error' => 'Please check the form and try again.'], 422);
} catch (Throwable $e) { error_log('FaraiOS waitlist request failed: ' . get_class($e)); wl_json(['error' => 'We could not save your request. Please try again shortly.'], 503); }
