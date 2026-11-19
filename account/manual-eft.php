<?php
declare(strict_types=1);
require __DIR__.'/core.php';
require __DIR__.'/profile-core.php';
require dirname(__DIR__).'/business/visit-store.php';

$_SERVER['SCRIPT_NAME'] = preg_replace('~/account/manual-eft\.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
$failure = 'The account session could not be opened.';
try {
 start();
 $failure = 'Your sign-in could not be verified. Sign in again to continue.';
 $owner = user();
 $failure = 'Shalean ownership could not be checked.';
 $rows = api('/rest/v1/businesses?id=eq.'.VISIT_EFT_BUSINESS.'&owner_id=eq.'.rawurlencode($owner['id']).'&select=id', [], 'GET', $_SESSION['auth']['access_token']);
 if (profile_env() !== 'live' || ($rows[0]['id'] ?? null) !== VISIT_EFT_BUSINESS) {
  http_response_code(403); exit('Only the Shalean business owner can verify these test transfers.');
 }
 $failure = 'The test transfer ledger is unavailable.';
 $ledger = ' FROM visit_eft_reports e JOIN visits v USING(ref) ';
 $fields = 'SELECT v.ref,v.cents,v.day,v.clock,v.minutes,v.state,v.worker,v.provider_id,e.reported_at,e.verified_at,e.verified_by';
 if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  csrf();
  $ref = $_POST['reference'] ?? '';
  if (!is_string($ref) || !preg_match('/^fosb-[a-f0-9]{32}$/D',$ref)) throw new RuntimeException('Invalid transfer reference.');
  $failure = 'The transfer could not be verified. Check its reference and retry.';
  visit_verify_eft($ref,$owner['id']);
  $_SESSION['eft_notice_ref'] = $ref;
  header('Location: manual-eft.php',true,303); exit;
 }
 $noticeRef = $_SESSION['eft_notice_ref'] ?? '';
 unset($_SESSION['eft_notice_ref'],$_SESSION['eft_notice']);
 $receipt = $noticeRef ? visit_stmt($fields.$ledger.'WHERE v.ref=? AND e.verified_at IS NOT NULL',[$noticeRef])->fetch() : null;
 $bookingRef = is_string($_GET['booking'] ?? null) ? $_GET['booking'] : '';
 $booking = null;
 if ($bookingRef !== '') {
  $booking = visit_stmt($fields.$ledger."WHERE v.ref=? AND v.state='confirmed' AND e.verified_at IS NOT NULL",[$bookingRef])->fetch();
  if (!$booking) { http_response_code(404); exit('Confirmed test booking not found.'); }
 }
 $pending = visit_stmt($fields.$ledger.'WHERE e.verified_at IS NULL ORDER BY e.reported_at,v.ref')->fetchAll();
 $conflicts = visit_stmt($fields.$ledger."WHERE v.state='reconcile' ORDER BY e.verified_at DESC")->fetchAll();
 $search = is_string($_GET['q'] ?? null) ? substr(trim($_GET['q']),0,64) : '';
 $verified = $ledger.'WHERE e.verified_at IS NOT NULL AND instr(lower(v.ref),lower(?))>0';
 $size = 10;
 $count = (int)visit_stmt('SELECT count(*)'.$verified,[$search])->fetchColumn();
 $pages = max(1,(int)ceil($count/$size));
 $page = max(1,min($pages,(int)($_GET['page'] ?? 1)));
 $offset = ($page-1)*$size;
 $history = visit_stmt($fields.$verified." ORDER BY e.verified_at DESC,v.ref LIMIT $size OFFSET $offset",[$search])->fetchAll();
} catch (AccountSessionExpired $e) {
 go('signin');
} catch (Throwable $e) {
 http_response_code(503); exit($failure);
}
function eft_amount(array $r): string {
 return 'ZAR '.number_format((int)$r['cents']/100,2);
}
function eft_time(int $unix): string {
 return (new DateTimeImmutable('@'.$unix))->setTimezone(new DateTimeZone(VISIT_TZ))->format('d M Y · H:i').' SAST';
}
function eft_verifier(array $r,array $owner): string {
 if ($r['verified_by'] !== $owner['id']) return 'Owner account '.$r['verified_by'];
 return $owner['email'] ?? 'Shalean business owner';
}
function eft_booking_link(string $ref): void { ?>
 <a href="?booking=<?=rawurlencode($ref)?>">View booking</a>
<?php }
?>
<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manual EFT · Shalean</title><link rel="stylesheet" href="../business/visit-form.css?v=4"></head>
<body><div class="outer"><main><section class="payment-layout">
<?php if ($booking): ?>
<a href="manual-eft.php">Back to EFT verification</a>
<h1>Confirmed test booking</h1>
<p><strong>Booking reference:</strong> <?=esc($booking['ref'])?></p>
<p><strong>Visit:</strong> <?=esc($booking['day'].' · '.$booking['clock'])?> SAST · <?=(int)$booking['minutes']?> min</p>
<p><strong>Manual EFT received:</strong> <?=eft_amount($booking)?></p>
<p><strong>Verified:</strong> <?=eft_time((int)$booking['verified_at'])?> · <?=esc(eft_verifier($booking,$owner))?></p>
<p><strong>Payment reference:</strong> <?=esc($booking['provider_id'])?></p>
<p><strong>Worker assignment:</strong> <?=esc($booking['worker'])?></p>
<?php else: ?>
<a href="bookings.php">Bookings</a><h1>Manual EFT verification</h1>
<p>Shalean test transfers only. Match the reference and amount before verifying receipt.</p>
<?php if ($receipt): ?><div role="status" class="hold"><strong><?=eft_amount($receipt)?> receipt verified</strong>
<p><?=esc($receipt['ref'])?></p>
<?php if ($receipt['state'] === 'confirmed'): ?>Booking confirmed. <?php eft_booking_link($receipt['ref']); ?>
<?php else: ?>Slot unavailable. This payment needs reconciliation.<?php endif; ?></div><?php endif; ?>
<h2>Awaiting verification (<?=count($pending)?>)</h2>
<?php if (!$pending): ?><p>No test transfers awaiting verification.</p><?php endif; ?>
<?php foreach ($pending as $r): ?><section class="hold"><h3><?=eft_amount($r)?></h3>
<p><strong>Reference:</strong> <?=esc($r['ref'])?></p>
<p><strong>Visit:</strong> <?=esc($r['day'].' · '.$r['clock'])?> SAST<br>
<strong>Transfer reported:</strong> <?=eft_time((int)$r['reported_at'])?></p>
<?php form_start(); ?><input type="hidden" name="reference" value="<?=esc($r['ref'])?>"><button>Verify test receipt</button></form></section><?php endforeach; ?>
<?php if ($conflicts): ?><h2>Verified transfers without a booking</h2><ul>
<?php foreach ($conflicts as $r): ?><li><?=esc($r['ref'])?> · <?=eft_amount($r)?></li><?php endforeach; ?></ul><?php endif; ?>
<h2 id="history">Verification history</h2>
<form action="manual-eft.php#history" method="get" role="search"><label>Search by transfer reference<input type="search" name="q" maxlength="64" value="<?=esc($search)?>"></label><button>Search receipts</button></form>
<?php if (!$history): ?><p><?=$search === '' ? 'No verified test receipts yet.' : 'No verified receipts match that reference.'?></p><?php endif; ?>
<?php foreach ($history as $r): ?><section class="hold"><h3><?=eft_amount($r)?> · <?=$r['state']==='confirmed'?'Booking confirmed':'Needs reconciliation'?></h3>
<p><?=esc($r['ref'])?></p><p><strong>Verified:</strong> <?=eft_time((int)$r['verified_at'])?><br><strong>Verified by:</strong> <?=esc(eft_verifier($r,$owner))?></p>
<?php if ($r['state']==='confirmed') eft_booking_link($r['ref']); ?></section><?php endforeach; ?>
<?php if ($pages>1): ?><nav aria-label="Receipt pages"><?php if ($page>1): ?><a href="?<?=esc(http_build_query(['q'=>$search,'page'=>$page-1]))?>#history">Previous</a><?php endif; ?>
 Page <?=$page?> of <?=$pages?>
<?php if ($page<$pages): ?><a href="?<?=esc(http_build_query(['q'=>$search,'page'=>$page+1]))?>#history">Next</a><?php endif; ?></nav><?php endif; ?>
<?php endif; ?>
</section></main></div></body></html>
