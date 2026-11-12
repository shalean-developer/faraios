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
    $docroot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: $public;
    if ($real === $docroot || str_starts_with($real . '/', $docroot . '/')) throw new RuntimeException('Storage must be outside document root');
    $config = require $real . '/config.php';
    if (!is_array($config) || strlen($config['secret'] ?? '') < 32) throw new RuntimeException('Invalid private configuration');
    $config['dir'] = $real;
    $config += ['enabled' => false, 'environment' => 'production', 'transport' => 'mail', 'base_url' => 'https://www.faraios.com', 'sender' => 'hello@faraios.com', 'min_seconds' => 3, 'global_hourly_limit' => 30];
    $url = parse_url($config['base_url']);
    $local = in_array($url['host'] ?? '', ['localhost', '127.0.0.1'], true);
    if (($url['scheme'] ?? '') !== 'https' && !($config['environment'] === 'test' && $local)) throw new RuntimeException('HTTPS required');
    if (!filter_var($config['sender'], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $config['sender'])) throw new RuntimeException('Invalid sender');
    if ($config['transport'] === 'capture' && $config['environment'] !== 'test') throw new RuntimeException('Capture is test only');
    return $config;
}

function wl_db(): PDO {
    static $db;
    if ($db) return $db;
    $c = wl_config();
    umask(0077);
    $db = new PDO('sqlite:' . $c['dir'] . '/waitlist.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
    $db->exec("CREATE TABLE IF NOT EXISTS subscribers (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
        business_type TEXT NOT NULL, interests TEXT NOT NULL, status TEXT NOT NULL,
        consent_version TEXT NOT NULL, consent_text TEXT NOT NULL, created_at INTEGER NOT NULL,
        confirmed_at INTEGER, withdrawn_at INTEGER, last_request_at INTEGER NOT NULL,
        confirm_hash TEXT UNIQUE, confirm_expires INTEGER, withdraw_hash TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY, subscriber_id TEXT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
        payload TEXT, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL, next_attempt INTEGER NOT NULL, sent_at INTEGER, last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL);");
    return $db;
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

function wl_rate(PDO $db, string $key, int $limit, int $seconds): bool {
    $now = time();
    $bucket = hash_hmac('sha256', $key . ':' . intdiv($now, $seconds), wl_config()['secret']);
    $s = $db->prepare('INSERT INTO rate_limits(bucket,hits,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits');
    $s->execute([$bucket, $now + $seconds]);
    return (int)$s->fetchColumn() <= $limit;
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

function wl_signup(PDO $db, array $fields): ?string {
    [$name, $email, $type, $interests] = $fields;
    $now = time();
    $db->exec('BEGIN IMMEDIATE');
    try {
        $s = $db->prepare('SELECT * FROM subscribers WHERE email=?');
        $s->execute([$email]);
        $old = $s->fetch();
        // Never overwrite someone else's confirmed details or undo an unsubscribe.
        if ($old && ($old['status'] !== 'pending' || $old['last_request_at'] > $now - 3600)) {
            $db->exec('COMMIT');
            return null;
        }
        $id = $old['id'] ?? bin2hex(random_bytes(16));
        $token = bin2hex(random_bytes(32));
        $withdraw = bin2hex(random_bytes(32));
        if ($old) {
            $s = $db->prepare('UPDATE subscribers SET confirm_hash=?,confirm_expires=?,withdraw_hash=?,last_request_at=? WHERE id=?');
            $s->execute([hash('sha256', $token), $now + 86400, hash('sha256', $withdraw), $now, $id]);
            $s = $db->prepare("UPDATE outbox SET status='cancelled',payload=NULL WHERE subscriber_id=? AND status IN ('pending','retry')");
            $s->execute([$id]);
        } else {
            $s = $db->prepare("INSERT INTO subscribers(id,email,name,business_type,interests,status,consent_version,consent_text,created_at,last_request_at,confirm_hash,confirm_expires,withdraw_hash) VALUES(?,?,?,?,?,'pending',?,?,?,?,?,?,?)");
            $s->execute([$id, $email, $name, $type, json_encode($interests), WL_CONSENT_VERSION, WL_CONSENT, $now, $now, hash('sha256', $token), $now + 86400, hash('sha256', $withdraw)]);
        }
        $job = bin2hex(random_bytes(16));
        $s = $db->prepare('INSERT INTO outbox(id,subscriber_id,payload,created_at,next_attempt) VALUES(?,?,?,?,?)');
        $s->execute([$job, $id, json_encode(['confirm' => $token, 'withdraw' => $withdraw]), $now, $now]);
        $db->exec('COMMIT');
        return $job;
    } catch (Throwable $e) {
        $db->exec('ROLLBACK');
        throw $e;
    }
}

function wl_transition(PDO $db, string $action, string $token): bool {
    if (!preg_match('/^[a-f0-9]{64}$/D', $token)) return false;
    $now = time();
    $db->exec('BEGIN IMMEDIATE');
    try {
        if ($action === 'confirm') {
            $s = $db->prepare("UPDATE subscribers SET status='confirmed',confirmed_at=?,confirm_hash=NULL,confirm_expires=NULL WHERE confirm_hash=? AND status='pending' AND confirm_expires>=?");
            $s->execute([$now, hash('sha256', $token), $now]);
        } else {
            $s = $db->prepare("UPDATE subscribers SET status='withdrawn',withdrawn_at=?,confirm_hash=NULL,confirm_expires=NULL,withdraw_hash=NULL WHERE withdraw_hash=? AND status IN ('pending','confirmed')");
            $s->execute([$now, hash('sha256', $token)]);
        }
        $changed = $s->rowCount() === 1;
        $db->exec("UPDATE outbox SET status='cancelled',payload=NULL WHERE status IN ('pending','retry') AND subscriber_id IN (SELECT id FROM subscribers WHERE status!='pending')");
        $db->exec('COMMIT');
        return $changed;
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

function wl_message(array $row): array {
    $c = wl_config();
    $payload = json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
    $confirm = $c['base_url'] . '/waitlist/confirm.php#token=' . $payload['confirm'];
    $withdraw = $c['base_url'] . '/waitlist/unsubscribe.php#token=' . $payload['withdraw'];
    $text = "Confirm your FaraiOS waitlist request\n\nPlease confirm that you want FaraiOS waitlist, launch and early-access updates about your selected interests.\n\nConfirm your email (expires in 24 hours):\n$confirm\n\nYou are not on the active waitlist until you confirm. If you did not request this, ignore this email.\n\nCancel this request or unsubscribe later:\n$withdraw\n\nQuestions or privacy requests: hello@faraios.com\nFaraiOS — Build. Grow. Manage.\n";
    return ['to' => $row['email'], 'subject' => 'Confirm your FaraiOS waitlist request', 'text' => $text, 'id' => $row['id']];
}

function wl_send(array $message): bool {
    $c = wl_config();
    if ($c['transport'] === 'capture') {
        file_put_contents($c['dir'] . '/captured.jsonl', json_encode($message) . "\n", FILE_APPEND | LOCK_EX);
        return true;
    }
    if ($c['transport'] === 'fail' && $c['environment'] === 'test') return false;
    if ($c['transport'] !== 'mail') throw new RuntimeException('Unknown mail transport');
    return mail($message['to'], $message['subject'], $message['text'], [
        'From' => 'FaraiOS <' . $c['sender'] . '>', 'Reply-To' => $c['sender'],
        'MIME-Version' => '1.0', 'Content-Type' => 'text/plain; charset=UTF-8',
        'Message-ID' => '<waitlist-' . $message['id'] . '@faraios.com>',
        'Auto-Submitted' => 'auto-generated'
    ], '-f' . escapeshellarg($c['sender']));
}

function wl_process(PDO $db, ?string $only = null): int {
    $c = wl_config();
    $lock = fopen($c['dir'] . '/worker.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return 0;
    $sent = 0;
    try {
        // A process crash after handing off email is ambiguous: do not send it twice.
        $db->exec("UPDATE outbox SET status='uncertain',payload=NULL,last_error='Worker interrupted; manual review required' WHERE status='sending' AND next_attempt < " . (time() - 300));
        $sql = "SELECT o.*,s.email,s.status AS subscriber_status,s.confirm_expires FROM outbox o JOIN subscribers s ON s.id=o.subscriber_id WHERE o.status IN ('pending','retry') AND o.next_attempt<=?";
        $args = [time()];
        if ($only !== null) { $sql .= ' AND o.id=?'; $args[] = $only; }
        $s = $db->prepare($sql . ' ORDER BY o.created_at LIMIT 10');
        $s->execute($args);
        foreach ($s->fetchAll() as $row) {
            if ($row['subscriber_status'] !== 'pending' || $row['confirm_expires'] <= time()) {
                $db->prepare("UPDATE outbox SET status='cancelled',payload=NULL WHERE id=?")->execute([$row['id']]);
                continue;
            }
            if (!wl_rate($db, 'outgoing', (int)$c['global_hourly_limit'], 3600)) break;
            $db->prepare("UPDATE outbox SET status='sending',attempts=attempts+1,next_attempt=? WHERE id=?")->execute([time(), $row['id']]);
            $ok = wl_send(wl_message($row));
            if ($ok) {
                $db->prepare("UPDATE outbox SET status='sent',payload=NULL,sent_at=?,last_error=NULL WHERE id=?")->execute([time(), $row['id']]);
                $sent++;
            } else {
                $attempt = $row['attempts'] + 1;
                $state = $attempt >= 4 ? 'failed' : 'retry';
                $db->prepare("UPDATE outbox SET status=?,next_attempt=?,last_error='Mail server did not accept message',payload=CASE WHEN ?='failed' THEN NULL ELSE payload END WHERE id=?")
                    ->execute([$state, time() + (60 * (2 ** $attempt)), $state, $row['id']]);
            }
        }
    } finally { flock($lock, LOCK_UN); fclose($lock); }
    return $sent;
}

function wl_cleanup(PDO $db): void {
    $db->prepare('DELETE FROM rate_limits WHERE expires<?')->execute([time()]);
    $db->prepare("DELETE FROM subscribers WHERE status='pending' AND last_request_at<?")->execute([time() - 7 * 86400]);
    $db->prepare("DELETE FROM subscribers WHERE status='withdrawn' AND withdrawn_at<?")->execute([time() - 30 * 86400]);
    $db->prepare("DELETE FROM outbox WHERE created_at<? AND status IN ('sent','failed','cancelled','uncertain')")->execute([time() - 30 * 86400]);
    // Renew consent instead of retaining a dormant waitlist indefinitely.
    $db->prepare("DELETE FROM subscribers WHERE status='confirmed' AND confirmed_at<?")->execute([time() - 365 * 86400]);
    foreach (glob(wl_config()['dir'] . '/sessions/sess_*') ?: [] as $file) if (filemtime($file) < time() - 86400) @unlink($file);
}
