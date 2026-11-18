<?php
declare(strict_types=1);
require dirname(__DIR__).'/platform-session.php';
require dirname(__DIR__).'/platform-core.php';
header('Cache-Control: no-store');
try {
    start();
    if (!platform_authorized(user(),platform_settings())) { http_response_code(403); exit; }
} catch (Throwable $e) { http_response_code(403); exit; }
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/refund-review.php';
function rh($s): string { return htmlspecialchars((string)$s, ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
function zar(int $v): string { return 'ZAR '.number_format($v/100,2); }
function local_time(?string $time): string {
    return $time ? (new DateTimeImmutable($time))->setTimezone(new DateTimeZone('Africa/Johannesburg'))->format('j M Y, H:i T') : 'Unavailable';
}
$method=$_SERVER['REQUEST_METHOD'];
if (!in_array($method,['GET','POST'],true)) { http_response_code(405); exit; }
$_SESSION['book05_refund_csrf']??=bin2hex(random_bytes(32));
$search=is_string($_GET['q']??'')?trim($_GET['q']??''):'';
$offset=filter_var($_GET['offset']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>2147483600]]);
$offset=$offset===false?0:$offset;
$rows=[]; $refunds=[]; $detail=null; $tx=null; $error=''; $hasMore=false; $state='';
try {
    if (strlen($search)>64) throw new DomainException('Enter a payment reference or transaction ID.');
    $rows=review_store('review',[$search,$offset]);
    $hasMore=count($rows)>10;
    $rows=array_slice($rows,0,10);
    if ($search!=='' && count($rows)===1) {
        $detail=$rows[0];
        $tx=review_transaction($detail);
        $refunds=review_refunds($detail);
        $state=review_status($detail['amount'],$refunds,$detail['refund_requested_at']);
    }
    if ($method==='POST') {
        if (!is_string($_POST['csrf']??null) || !hash_equals($_SESSION['book05_refund_csrf'],$_POST['csrf']) ||
            ($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site') { http_response_code(403); exit; }
        if (!$detail || !$tx || ($_POST['ref']??null)!==$detail['reference']) { http_response_code(400); exit; }
        review_request($detail,$tx,$refunds);
        header('Location: ?q='.rawurlencode($detail['transaction_id']),true,303);exit;
    }
} catch (DomainException $e) { $error=$e->getMessage(); }
catch (Throwable $e) {
    $error=$method==='POST'?'Refund response unavailable. Refresh the status and check Paystack before retrying.':'Status unavailable. Refresh to check again.';
}
$merchants=book05_merchants();
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unbooked payments · FaraiOS</title><link rel="stylesheet" href="payments.css"></head>
<body><main><a href="b/index.php">Private checkout</a><header><p>Operator · Test mode</p><h1>Unbooked payments</h1></header>
<form class="search" method="get"><label for="q">Paystack transaction ID or payment reference</label><div><input id="q" name="q" value="<?=rh($search)?>" maxlength="64"><button>Find payment</button></div></form>
<?php if ($error): ?><p role="alert"><?=rh($error)?></p><?php endif; ?>
<?php if ($search!==''): ?><a href="payments.php">All unbooked payments</a><?php endif; ?>
<?php if ($detail): ?><section><h2><?=rh($merchants[$detail['slug']]['name']??$detail['slug'])?></h2>
<p class="amount"><?=rh(zar($detail['amount']))?></p><p><strong><?=rh($state?:'Status unavailable')?></strong></p>
<dl><dt>Paystack transaction</dt><dd><?=rh($detail['transaction_id'])?></dd><dt>Payment reference</dt><dd>fi-<?=rh($detail['reference'])?></dd><dt>Booking</dt><dd>No booking created</dd><dt>Hold expired</dt><dd><?=rh(local_time($detail['expires_at']))?></dd>
<?php if ($tx): ?><dt>Payment received</dt><dd><?=rh(local_time($tx['paid_at']??null))?></dd><?php endif; ?>
<?php if ($detail['refund_requested_at']): ?><dt>Refund requested</dt><dd><?=rh(local_time($detail['refund_requested_at']))?></dd><?php endif; ?></dl>
<?php foreach ($refunds as $r): ?><article><h3>Refund #<?=rh($r['id'])?></h3><p><?=rh(zar($r['amount']))?> · <?=rh(ucfirst($r['status']))?></p><p>Last updated <?=rh(local_time($r['updated']))?></p></article><?php endforeach; ?>
<div class="actions"><?php if (!$error && $state==='Awaiting refund' && ($tx['status']??'')==='success'): ?><form method="post" action="?q=<?=rh($detail['transaction_id'])?>"><input type="hidden" name="csrf" value="<?=rh($_SESSION['book05_refund_csrf'])?>"><input type="hidden" name="ref" value="<?=rh($detail['reference'])?>"><button>Issue test refund of <?=rh(zar($detail['amount']))?></button></form><?php endif; ?>
<a href="?q=<?=rh($search)?>">Refresh status</a></div></section>
<?php else: ?><?php foreach ($rows as $row): ?><article><h2><?=rh($merchants[$row['slug']]['name']??$row['slug'])?></h2><p><?=rh(zar($row['amount']))?> · Hold expired <?=rh(local_time($row['expires_at']))?></p><p>Payment reference fi-<?=rh($row['reference'])?></p><a href="?q=<?=rh($row['reference'])?>">Review payment<?= $row['transaction_id'] ? ' '.rh($row['transaction_id']) : '' ?></a></article><?php endforeach; ?>
<?php if (!$rows && !$error): ?><p><?= $search===''?'No unbooked payments.':'No unbooked payment matches this search.' ?></p><?php endif; ?>
<nav><?php if ($offset>=10): ?><a href="?q=<?=rawurlencode($search)?>&amp;offset=<?=$offset-10?>">Previous</a><?php endif; ?> <?php if ($hasMore): ?><a href="?q=<?=rawurlencode($search)?>&amp;offset=<?=$offset+10?>">Next</a><?php endif; ?></nav>
<?php endif; ?></main></body></html>
