<?php
declare(strict_types=1);
require __DIR__ . '/core.php';
wl_headers();
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') wl_json(['error' => 'Method not allowed'], 405);
    $secret = wl_config()['webhook_secret'] ?? '';
    if (!str_starts_with($secret, 'whsec_')) wl_json(['error' => 'Not configured'], 503);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 262144) wl_json(['error' => 'Payload too large'], 413);
    $raw = file_get_contents('php://input', false, null, 0, 262145);
    if (strlen($raw) > 262144) wl_json(['error' => 'Payload too large'], 413);
    if (!wl_webhook_valid($raw, $_SERVER['HTTP_SVIX_ID'] ?? '', $_SERVER['HTTP_SVIX_TIMESTAMP'] ?? '', $_SERVER['HTTP_SVIX_SIGNATURE'] ?? '', $secret)) wl_json(['error' => 'Invalid signature'], 400);
    $event = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    $kind = $event['type'] ?? '';
    $providerId = $event['data']['email_id'] ?? '';
    if (in_array($kind, ['email.delivered','email.bounced','email.complained','email.failed','email.suppressed'], true) && is_string($providerId) && $providerId !== '') {
        wl_db()->rpc('waitlist_delivery', ['p_event_id' => $_SERVER['HTTP_SVIX_ID'], 'p_provider_id' => $providerId, 'p_event_type' => $kind]);
    }
    wl_json(['received' => true]);
} catch (JsonException $e) { wl_json(['error' => 'Invalid payload'], 400);
} catch (Throwable $e) { error_log('FaraiOS delivery event failed'); wl_json(['error' => 'Please retry later'], 503); }
