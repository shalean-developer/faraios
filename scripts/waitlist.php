<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/waitlist/core.php';
$command = $argv[1] ?? 'help';
try {
    $db = wl_db();
    if ($command === 'work') {
        if (!wl_config()['enabled']) throw new RuntimeException('Waitlist is disabled');
        echo wl_process($db) . " message(s) accepted by transport.\n";
        wl_cleanup($db);
    } elseif ($command === 'cleanup') {
        wl_cleanup($db); echo "Retention applied.\n";
    } elseif ($command === 'status') {
        echo json_encode(['subscribers' => $db->query('SELECT status,COUNT(*) AS count FROM subscribers GROUP BY status')->fetchAll(), 'mail' => $db->query('SELECT status,COUNT(*) AS count FROM outbox GROUP BY status')->fetchAll()], JSON_PRETTY_PRINT) . "\n";
    } elseif ($command === 'export') {
        // Owner runs this via Plesk scheduled tasks/SSH; output stays in private storage.
        $file = wl_config()['dir'] . '/waitlist-export-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.csv';
        $out = fopen($file, 'x');
        if (!$out) throw new RuntimeException('Could not create export');
        chmod($file, 0600);
        fputcsv($out, ['Name','Email','Business type','Interests','Status','Consent version','Consent text','Requested UTC','Confirmed UTC','Withdrawn UTC'], ',', '"', '');
        foreach ($db->query('SELECT * FROM subscribers ORDER BY created_at') as $r) {
            $row = [$r['name'], $r['email'], $r['business_type'], implode('; ', json_decode($r['interests'], true)), $r['status'], $r['consent_version'], $r['consent_text'], gmdate('c', $r['created_at']), $r['confirmed_at'] ? gmdate('c', $r['confirmed_at']) : '', $r['withdrawn_at'] ? gmdate('c', $r['withdrawn_at']) : ''];
            $row = array_map(fn($v) => preg_match('/^[\s]*[=+@\-\t\r\n]/u', (string)$v) ? "'" . $v : $v, $row);
            fputcsv($out, $row, ',', '"', '');
        }
        fclose($out);
        echo 'Export created: ' . basename($file) . " (private storage only).\n";
    } else { echo "Commands: work | cleanup | status | export\n"; }
} catch (Throwable $e) { fwrite(STDERR, 'Waitlist command failed: ' . $e->getMessage() . "\n"); exit(1); }
