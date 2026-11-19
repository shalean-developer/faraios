<?php
declare(strict_types=1);
require __DIR__.'/core.php';
require __DIR__.'/profile-core.php';
require dirname(__DIR__).'/business/visit-store.php';

try {
 start();
 $owner = user();
 $rows = api('/rest/v1/businesses?id=eq.'.VISIT_EFT_BUSINESS.'&owner_id=eq.'.rawurlencode($owner['id']).'&select=id', [], 'GET', $_SESSION['auth']['access_token']);
 if (profile_env() !== 'live' || ($rows[0]['id'] ?? null) !== VISIT_EFT_BUSINESS) {
  http_response_code(403); exit('Only the Shalean business owner can verify these test transfers.');
 }
 $notice = '';
 if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  csrf();
  $ref = $_POST['reference'] ?? '';
  if (!is_string($ref) || !preg_match('/^fosb-[a-f0-9]{32}$/D',$ref)) throw new RuntimeException('Invalid transfer reference.');
  $state = visit_verify_eft($ref,$owner['id']);
  $_SESSION['eft_notice'] = $state === 'confirmed' ? 'Test receipt verified and booking confirmed.' : 'Test receipt verified. The slot is unavailable and the payment needs reconciliation.';
  header('Location: manual-eft.php',true,303); exit;
 }
 $notice = $_SESSION['eft_notice'] ?? '';
 unset($_SESSION['eft_notice']);
 $pending = visit_stmt('SELECT v.ref,v.cents,v.day,v.clock FROM visit_eft_reports e JOIN visits v USING(ref) WHERE e.verified_at IS NULL ORDER BY e.reported_at')->fetchAll();
 $conflicts = visit_stmt("SELECT v.ref,v.cents FROM visits v JOIN visit_eft_reports e USING(ref) WHERE v.state='reconcile' ORDER BY e.verified_at DESC")->fetchAll();
} catch (Throwable $e) {
 http_response_code(503); exit('Transfer verification is unavailable. Refresh and try again.');
}
?>
<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manual EFT · Shalean</title><link rel="stylesheet" href="../business/visit-form.css?v=4"></head><body><main>
<a href="bookings.php">Bookings</a><h1>Manual EFT verification</h1>
<p>Shalean test transfers only. Match the reference and amount before verifying receipt.</p>
<?php if ($notice !== ''): ?><p role="status"><?=esc($notice)?></p><?php endif; ?>
<?php if (!$pending): ?><p>No test transfers awaiting verification.</p><?php endif; ?>
<?php foreach ($pending as $r): ?><section class="hold"><h2><?=esc($r['ref'])?></h2>
<p>ZAR <?=number_format((int)$r['cents']/100,2)?> · <?=esc($r['day'].' · '.$r['clock'])?> SAST</p>
<?php form_start(); ?><input type="hidden" name="reference" value="<?=esc($r['ref'])?>"><button>Verify test receipt</button></form></section><?php endforeach; ?>
<?php if ($conflicts): ?><h2>Verified transfers without a booking</h2><ul>
<?php foreach ($conflicts as $r): ?><li><?=esc($r['ref'])?> · ZAR <?=number_format((int)$r['cents']/100,2)?></li><?php endforeach; ?></ul><?php endif; ?>
</main></body></html>
