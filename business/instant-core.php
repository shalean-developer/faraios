<?php
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

function instant_enabled(): bool {
    return profile_env() === 'preview' && (cfg()['instant_test_enabled'] ?? false) === true;
}

function instant_db(): PDO {
    static $db;
    if (!instant_enabled()) throw new RuntimeException('Test checkout unavailable.');
    return $db ??= new PDO(cfg()['instant_dsn'], cfg()['instant_user'], cfg()['instant_password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
}

function instant_query(string $sql, array $args): array {
    $statement = instant_db()->prepare($sql);
    $statement->execute($args);
    $value = $statement->fetchColumn();
    return $value === false ? [] : json_decode($value, true, 32, JSON_THROW_ON_ERROR);
}

function instant_entry(string $slug): void {
    if (!instant_enabled()) return;
    try {
        $offer = instant_query("select jsonb_build_object('id',service->>'id','areas',areas) from instant_private.config(?)", [$slug]);
    } catch (Throwable $e) { return; }
    if (!$offer) return;
    echo '<button type="button" id="instant-start" hidden data-service="'.esc($offer['id']).'" data-areas="'.esc(json_encode($offer['areas'])).'" data-target="'.esc(cfg()['base_url'].'/b/instant.php?slug='.rawurlencode($slug)).'">See available times · test checkout</button>';
}

function instant_reference(): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 15) | 64);
    $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function instant_provider(string $path, ?array $body = null): array {
    $key = cfg()['instant_paystack_key'] ?? '';
    if (!instant_enabled() || !str_starts_with($key, 'sk_test_')) throw new RuntimeException('Test checkout unavailable.');
    $ctx = stream_context_create(['http' => [
        'method' => $body === null ? 'GET' : 'POST', 'timeout' => 12, 'follow_location' => 0,
        'header' => "Authorization: Bearer ".$key."\r\nContent-Type: application/json",
        'content' => $body === null ? '' : json_encode($body, JSON_THROW_ON_ERROR)
    ]]);
    $base = 'https://api.paystack.co';
    // A loopback fixture is available only in the repository's isolated test runtime.
    if ((cfg()['environment'] ?? '') === 'test' && preg_match('~^http://127\.0\.0\.1:[0-9]+$~D', cfg()['instant_fixture'] ?? ''))
        $base = cfg()['instant_fixture'];
    $raw = @file_get_contents($base.'/transaction/'.$path, false, $ctx);
    $reply = json_decode($raw ?: '{}', true);
    if (($reply['status'] ?? false) !== true || !is_array($reply['data'] ?? null)) throw new RuntimeException('Payment service unavailable.');
    return $reply['data'];
}

function instant_verify(string $reference): array {
    $receipt = instant_provider('verify/'.rawurlencode($reference));
    if (($receipt['domain'] ?? '') !== 'test' || ($receipt['reference'] ?? '') !== $reference ||
        ($receipt['status'] ?? '') !== 'success' || ($receipt['currency'] ?? '') !== 'ZAR' || !is_int($receipt['amount'] ?? null))
        throw new RuntimeException('Successful test payment has not been verified.');
    return instant_query('select instant_private.settle(?::uuid,?::int)', [substr($reference,3),$receipt['amount']]);
}

function instant_checkout_url(array $reply, string $reference): string {
    $url = $reply['authorization_url'] ?? '';
    $fixture = (cfg()['environment'] ?? '') === 'test' && isset(cfg()['instant_fixture'])
        && str_starts_with($url, cfg()['instant_fixture'].'/checkout/');
    if (($reply['reference'] ?? '') !== $reference || (!$fixture && !preg_match('~^https://checkout\.paystack\.com/[A-Za-z0-9_-]+$~D',$url)))
        throw new RuntimeException('Test checkout unavailable.');
    return $url;
}
