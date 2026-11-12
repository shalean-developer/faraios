<?php
declare(strict_types=1);

const WL_CONSENT_VERSION = '2026-11-12-v1';
const WL_CONSENT = 'I agree to receive FaraiOS waitlist, launch and early-access updates about my selected interests by email. I can unsubscribe at any time.';
const WL_INTERESTS = ['business-management', 'website-builder', 'website-creation', 'hosting', 'seo', 'marketing'];
const WL_BUSINESSES = ['cleaning', 'beauty-wellness', 'home-maintenance-trades', 'other', 'starting-business'];

function wl_config(): array {
    static $config;
    if ($config !== null) return $config;
    $dir = getenv('FARAIOS_WAITLIST_DIR') ?: dirname(__DIR__, 2) . '/private/faraios-waitlist';
    if (!is_dir($dir) || !is_file($dir . '/config.php')) throw new RuntimeException('Waitlist is not configured');
    $real = realpath($dir);
    $public = realpath(dirname(__DIR__));
    if (!$real || $real === $public || str_starts_with($real . '/', $public . '/')) throw new RuntimeException('Storage must be outside website');
    $docroot = PHP_SAPI === 'cli' ? $public : (realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: $public);
    if ($real === $docroot || str_starts_with($real . '/', $docroot . '/')) throw new RuntimeException('Storage must be outside document root');
    $config = require $real . '/config.php';
    if (!is_array($config) || strlen($config['secret'] ?? '') < 32) throw new RuntimeException('Invalid private configuration');
    $config['dir'] = $real;
    $config += ['enabled' => false, 'environment' => 'production', 'transport' => 'resend', 'base_url' => 'https://www.faraios.com', 'sender' => 'hello@notify.faraios.com', 'reply_to' => 'hello@faraios.com', 'owner_email' => 'hello@faraios.com', 'resend_url' => 'https://api.resend.com', 'min_seconds' => 3, 'global_hourly_limit' => 30];
    $url = parse_url($config['base_url']);
    $local = in_array($url['host'] ?? '', ['localhost', '127.0.0.1'], true);
    if (($url['scheme'] ?? '') !== 'https' && !($config['environment'] === 'test' && $local)) throw new RuntimeException('HTTPS required');
    foreach (['sender','reply_to','owner_email'] as $field) if (!filter_var($config[$field], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $config[$field])) throw new RuntimeException('Invalid email configuration');
    $localTest = $config['environment'] === 'test';
    $dbHost = parse_url($config['supabase_url'] ?? '', PHP_URL_HOST) ?: '';
    if (!preg_match('/^[a-z]{20}\.supabase\.co$/D', $dbHost) && !($localTest && in_array($dbHost,['127.0.0.1','localhost'],true))) throw new RuntimeException('Invalid database endpoint');
    if (strlen($config['supabase_key'] ?? '') < 20) throw new RuntimeException('Database credential missing');
    if (!$localTest && (!str_starts_with($config['supabase_url'], 'https://') || $config['resend_url'] !== 'https://api.resend.com')) throw new RuntimeException('Invalid service endpoint');
    if (!in_array($config['transport'], ['resend','capture'],true)) throw new RuntimeException('Invalid mail transport');
    if ($config['transport'] === 'resend' && strlen($config['resend_key'] ?? '') < 20) throw new RuntimeException('Email credential missing');
    if ($config['transport'] === 'capture' && $config['environment'] !== 'test') throw new RuntimeException('Capture is test only');
    return $config;
}

final class WLStore {
    public function rpc(string $name, array $params = []): mixed {
        $c = wl_config();
        $result = wl_http($c['supabase_url'] . '/rest/v1/rpc/' . $name, $params, [
            'apikey: ' . $c['supabase_key'], 'Authorization: Bearer ' . $c['supabase_key']
        ]);
        if ($result['status'] < 200 || $result['status'] >= 300) throw new RuntimeException('Database request failed');
        return $result['body'];
    }
}

function wl_db(): WLStore { return new WLStore(); }

/** Bounded HTTPS requests, with no redirects and no credentials in logs or exceptions. */
function wl_http(string $url, array $body, array $headers): array {
    $context = stream_context_create(['http' => [
        'method' => 'POST', 'header' => implode("\r\n", array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers)),
        'content' => json_encode($body ?: new stdClass(), JSON_THROW_ON_ERROR),
        'timeout' => 12, 'ignore_errors' => true, 'follow_location' => 0, 'max_redirects' => 0
    ], 'ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT]]);
    $raw = @file_get_contents($url, false, $context, 0, 1048576);
    $responseHeaders = $http_response_header ?? [];
    preg_match('/^HTTP\/\S+ (\d+)/', $responseHeaders[0] ?? '', $match);
    if ($raw === false) return ['status' => 0, 'body' => null];
    try { $decoded = $raw === '' ? null : json_decode($raw, true, 64, JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { $decoded = null; }
    return ['status' => (int)($match[1] ?? 0), 'body' => $decoded];
}

function wl_headers(): void {
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    header('X-Robots-Tag: noindex, nofollow');
}

function wl_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $c = wl_config();
    $dir = $c['dir'] . '/sessions';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('Session storage unavailable');
    session_save_path($dir);
    session_name('faraios_waitlist');
    $cookiePath = rtrim(parse_url($c['base_url'], PHP_URL_PATH) ?: '', '/') . '/waitlist/';
    session_set_cookie_params(['lifetime' => 0, 'path' => $cookiePath, 'secure' => str_starts_with($c['base_url'], 'https://'), 'httponly' => true, 'samesite' => 'Strict']);
    ini_set('session.use_strict_mode', '1');
    session_cache_limiter('');
    session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(24));
    $_SESSION['opened'] ??= time();
}

function wl_json(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_THROW_ON_ERROR);
    exit;
}

function wl_rate(WLStore $db, string $key, int $limit, int $seconds): bool {
    $bucket = hash_hmac('sha256', $key . ':' . intdiv(time(), $seconds), wl_config()['secret']);
    return $db->rpc('waitlist_rate', ['p_bucket' => $bucket, 'p_limit' => $limit, 'p_seconds' => $seconds]) === true;
}

function wl_validate(array $data): array {
    foreach (['name', 'email', 'business_type', 'consent', 'website', 'csrf'] as $k) {
        if (isset($data[$k]) && !is_string($data[$k])) throw new InvalidArgumentException('Please check the form fields.');
    }
    $name = trim($data['name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $type = $data['business_type'] ?? '';
    $interests = $data['interests'] ?? [];
    if (strlen($name) < 2 || strlen($name) > 120 || preg_match('/[\x00-\x1F\x7F]/', $name) || !preg_match('//u', $name)) throw new InvalidArgumentException('Enter your name (2–120 characters).');
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) throw new InvalidArgumentException('Enter a valid email address.');
    if (!in_array($type, WL_BUSINESSES, true)) throw new InvalidArgumentException('Choose your business type.');
    if (!is_array($interests) || !$interests || count($interests) > 6 || array_filter($interests, fn($v) => !is_string($v) || !in_array($v, WL_INTERESTS, true))) throw new InvalidArgumentException('Choose at least one interest.');
    if (($data['consent'] ?? '') !== 'yes') throw new InvalidArgumentException('Please agree to waitlist updates to join.');
    return [$name, $email, $type, array_values(array_unique($interests))];
}

function wl_signup(WLStore $db, array $fields): ?string {
    [$name, $email, $type, $interests] = $fields;
    return $db->rpc('waitlist_signup', [
        'p_name' => $name, 'p_email' => $email, 'p_business_type' => $type, 'p_interests' => $interests,
        'p_consent_version' => WL_CONSENT_VERSION, 'p_consent_text' => WL_CONSENT,
        'p_confirm' => bin2hex(random_bytes(32)), 'p_withdraw' => bin2hex(random_bytes(32))
    ]);
}

function wl_transition(WLStore $db, string $action, string $token): bool {
    if (!preg_match('/^[a-f0-9]{64}$/D', $token)) return false;
    $changed = $db->rpc('waitlist_transition', ['p_action' => $action, 'p_token' => $token]) === true;
    if ($changed && $action === 'confirm') {
        try { wl_process($db); } catch (Throwable $e) { error_log('FaraiOS owner notification queued for retry'); }
    }
    return $changed;
}

require_once __DIR__ . '/email.php';

function wl_message(array $row): array {
    $c = wl_config();
    $p = $row['payload'];
    if ($row['kind'] === 'owner') {
        $to = $c['owner_email'];
        $subject = 'New confirmed FaraiOS waitlist signup';
        $text = "A visitor confirmed their FaraiOS waitlist request.\n\nName: " . $p['name'] . "\nEmail: " . $p['email'] . "\nBusiness: " . $p['business_type'] . "\nInterests: " . implode(', ', $p['interests']) . "\nConfirmed: " . $p['confirmed_at'] . "\n\nView records in your private Supabase Table Editor. This is an owner notification, not a marketing email.\n";
    } else {
        $to = $p['to'];
        $subject = 'Confirm your FaraiOS waitlist request';
        $confirm = $c['base_url'] . '/waitlist/confirm.php#token=' . $p['confirm'];
        $withdraw = $c['base_url'] . '/waitlist/unsubscribe.php#token=' . $p['withdraw'];
        $text = "Confirm your FaraiOS waitlist request\n\nPlease confirm that you want FaraiOS waitlist, launch and early-access updates about your selected interests.\n\nConfirm your email (expires in 24 hours):\n$confirm\n\nYou are not on the active waitlist until you confirm. If you did not request this, ignore this email.\n\nCancel this request or unsubscribe later:\n$withdraw\n\nQuestions or privacy requests: hello@faraios.com\nFaraiOS — Build. Grow. Manage.\n";
    }
    return ['from' => 'FaraiOS <' . $c['sender'] . '>', 'to' => [$to], 'reply_to' => $c['reply_to'], 'subject' => $subject, 'text' => $text] + ($row['kind'] === 'owner' ? [] : ['html' => wl_confirmation_html($confirm, $withdraw)]);
}

function wl_send(array $message, string $id): array {
    $c = wl_config();
    if ($c['transport'] === 'capture') {
        file_put_contents($c['dir'] . '/captured.jsonl', json_encode(['id' => $id, 'message' => $message]) . "\n", FILE_APPEND | LOCK_EX);
        return ['outcome' => 'sent', 'provider_id' => $id];
    }
    $r = wl_http($c['resend_url'] . '/emails', $message, ['Authorization: Bearer ' . $c['resend_key'], 'Idempotency-Key: faraios-waitlist/' . $id]);
    if ($r['status'] >= 200 && $r['status'] < 300 && is_string($r['body']['id'] ?? null)) return ['outcome' => 'sent', 'provider_id' => $r['body']['id']];
    // Network ambiguity, 429 and provider 5xx are safe to retry with the same key.
    return ['outcome' => $r['status'] === 0 || $r['status'] === 429 || $r['status'] >= 500 ? 'retry' : 'failed', 'provider_id' => null];
}

function wl_process(WLStore $db, ?string $only = null): int {
    $sent = 0;
    for ($i = 0; $i < ($only ? 1 : 10); $i++) {
        if (!wl_rate($db, 'outgoing', (int)wl_config()['global_hourly_limit'], 3600)) break;
        $job = $db->rpc('waitlist_claim', ['p_only' => $only]);
        if (!$job) break;
        $result = wl_send(wl_message($job), $job['id']);
        $db->rpc('waitlist_ack', ['p_id' => $job['id'], 'p_lease' => $job['lease'], 'p_outcome' => $result['outcome'], 'p_provider_id' => $result['provider_id']]);
        if ($result['outcome'] === 'sent') $sent++;
    }
    return $sent;
}

function wl_cleanup(WLStore $db): void {
    $db->rpc('waitlist_cleanup');
    foreach (glob(wl_config()['dir'] . '/sessions/sess_*') ?: [] as $file) if (filemtime($file) < time() - 86400) @unlink($file);
}

function wl_webhook_valid(string $raw, string $id, string $timestamp, string $signatures, string $secret): bool {
    if (strlen($id)>200 || $id==='' || !preg_match('/^[0-9]{1,12}$/D', $timestamp) || abs(time()-(int)$timestamp)>300 || !str_starts_with($secret,'whsec_')) return false;
    $key = base64_decode(substr($secret,6),true);
    if ($key===false || strlen($key)<16) return false;
    $expected = base64_encode(hash_hmac('sha256',$id.'.'.$timestamp.'.'.$raw,$key,true));
    foreach (explode(' ', $signatures) as $signature) if (str_starts_with($signature,'v1,') && hash_equals($expected,substr($signature,3))) return true;
    return false;
}
