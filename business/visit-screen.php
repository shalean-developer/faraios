<?php
if (realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(404);exit;}
$titles=['service'=>'Choose a cleaning service','details'=>'Your cleaning details','schedule'=>'Choose a time','review'=>'Review your visit','payment'=>'Pay for your visit'];
$showBookingSummary = $s && $step !== 'payment';
$layoutClass = ['service'=>'service-entry','payment'=>'payment-layout'][$step] ?? 'layout';
if ($step === 'payment') {
    $received = in_array($record['state'], ['confirmed', 'reconcile'], true);
    $canPay = $record['state'] === 'held' && (int)$record['expires'] > time();
    if ($received) {
        $titles['payment'] = $record['state'] === 'confirmed' ? 'Test booking confirmed' : 'Test payment received';
    } elseif ($record['state'] === 'eft_pending') {
        $titles['payment'] = 'Awaiting payment verification';
    } elseif (!$canPay) {
        $titles['payment'] = 'Booking hold expired';
    }
}
$self=visit_url($step,$service);$labels=['details'=>'Details','schedule'=>'Schedule','review'=>'Review','payment'=>'Payment'];
?><!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title><?=esc($titles[$step].' · '.$company)?></title><link rel="stylesheet" href="/business/visit-form.css?v=11"><link rel="stylesheet" href="/account/booking-location-ui.css?v=2">
<script src="/business/visit-room-picker.js?v=2" defer></script><script src="/business/visit-form.js?v=4" defer></script></head>
<body<?=$step==='service'?' class="launch-page"':''?>><header class="booking-header"><div class="header-inner"><div class="brand-row"><a class="visit-brand" href="/b/shalean-cleaning-services"><?php if(!empty($row['document']['logo'])):?><img src="/b/shalean-cleaning-services?logo=1" alt="<?=esc($company)?>"><?php else:?><?=esc($company)?><?php endif;?></a>
<?php if($step!=='service'):?><nav aria-label="Booking steps"><ol><?php $past=true;$number=0; foreach($labels as $key=>$label):?><li class="<?=$past?'current':''?>" <?=$key===$step?'aria-current="step"':''?>><b><?=++$number?></b><span><?=$label?></span></li><?php if($key===$step)$past=false;endforeach;?></ol></nav><?php endif;?>
<details class="help"><summary>Booking help</summary><p>Choose a service and an available start in South African time. This checkout uses Paystack Test. Use synthetic contact details.</p></details></div></div></header>
<div class="outer"><main><div class="<?=$layoutClass?>"><section><h1<?=$step==='details'?' class="details-heading"':''?>><?=esc($titles[$step])?></h1>
<?php if($message!==''):?><p role="alert"><?=esc($message)?></p><?php endif;?>
<?php if($showBookingSummary):?><details class="mobile-summary"><summary>Booking summary</summary><?php visit_summary($s,$draft,$step,$q);?></details><?php endif;?>
<?php if($step==='service'):?>
<div class="service-tiles">
<?php foreach($catalogue as $id=>$item):
    $description = preg_split('/(?<=[.!?])\s+/u', trim($item['description'] ?? ''), 2)[0] ?? '';
    $priceLabel = 'Request a quote';
    if ($item['mode'] !== 'quote') {
        try {
            $cents = visit_quote($item, [])['cents'];
            $priceLabel = ($item['mode'] === 'from' ? 'From ' : '') . 'R' . number_format($cents / 100, $cents % 100 ? 2 : 0);
        } catch (RuntimeException $exception) {
            // This configuration requires a custom quote.
        }
    }
?>
<a class="service-tile" href="<?=esc(visit_url('details',$id))?>">
    <?php if(!empty($item['photo']) || !empty($item['image'])):?><img alt="" width="68" height="68" src="/b/shalean-cleaning-services?service_image=<?=esc($id)?>"><?php endif;?>
    <span class="service-copy"><strong><?=esc($item['name'])?></strong>
        <?php if($description !== ''):?><span class="service-description"><?=esc($description)?></span><?php endif;?>
        <span class="service-price"><?=esc($priceLabel)?></span>
    </span>
    <span class="service-arrow" aria-hidden="true">›</span>
</a>
<?php endforeach;?>
</div>
<?php elseif($step==='details'):
?><script type="application/json" id="visit-pricing"><?=json_encode(['name'=>$s['name'],'mode'=>$s['mode'],'amount'=>$s['amount'],'duration'=>$s['duration'],'options'=>$s['options']??[]],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_QUOT|JSON_HEX_APOS|JSON_THROW_ON_ERROR)?></script><?php
visit_form_start($self,$csrf,'details');?><div id="visit-address" tabindex="-1"><?php booking_address_row($draft['address']??'',$draft['unit']??'');booking_service_area($areas,$draft['area']);?></div>
<?php foreach(['Rooms'=>['bedrooms','bathrooms','room'],'Extra tasks'=>['extra','toggle']] as $legend=>$kinds):
$opts=array_filter($s['options']??[],fn($o)=>in_array($o['kind'],$kinds,true)&&$o['minimum']!==$o['maximum']);if(!$opts)continue;?>
<fieldset class="room-choice-list"><legend><?=esc($legend)?></legend><?php foreach($opts as $o):$oid=$o['id'];$v=$q['values'][$oid];?>
<div class="room-choice-row" <?= $o['kind'] === 'toggle' ? 'data-extra-toggle' : 'data-room-picker' ?>><label id="room-<?=esc($oid)?>-label" for="room-<?=esc($oid)?>"><?=esc($o['name'])?></label>
<select id="room-<?=esc($oid)?>" name="options[<?=esc($oid)?>]" data-charge="<?=intval($o['price'])?>" data-minutes="<?=intval($o['minutes'])?>" data-included="<?=intval($o['included'])?>" aria-describedby="hint-<?=esc($oid)?>">
<?php for($i=(int)$o['minimum'];$i<=(int)$o['maximum'];$i++):?><option value="<?=$i?>" <?=$i===$v?'selected':''?>><?=$i?></option><?php endfor;?></select>
<small id="hint-<?=esc($oid)?>"><?=(int)$o['included']?> included · +<?=esc(visit_money((int)$o['price']))?> per additional unit · +<?=(int)$o['minutes']?> min</small></div><?php endforeach;?></fieldset><?php endforeach;?>
<button data-contact-trigger hidden aria-haspopup="dialog" aria-controls="visit-contact">Choose a time</button>
<dialog id="visit-contact" class="visit-contact" open aria-labelledby="contact-title">
<h2 id="contact-title">Your contact details</h2>
<fieldset data-contact-fields>
<label>Your name<input name="name" autocomplete="name" required minlength="2" maxlength="120" value="<?=esc($draft['name']??'')?>"></label>
<label>Contact email<input name="email" type="email" autocomplete="email" required maxlength="254" value="<?=esc($draft['email']??'')?>"></label>
<label>Phone number (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="40" value="<?=esc($draft['phone']??'')?>"></label>
</fieldset>
<div class="contact-actions"><button type="button" class="secondary" data-contact-close hidden>Back</button>
<button type="submit">Continue to schedule</button></div>
</dialog></form>
<?php elseif($step==='schedule'):?>
<a href="<?=esc(visit_url('details',$service))?>">Back to details</a>
<?php visit_form_start($self,$csrf,'date');?>
<label>Visit date<input id="visit-date" data-date type="date" name="date" min="<?=$min?>" max="<?=$max?>" value="<?=esc($draft['date'])?>" required></label>
<button data-date-fallback>Show start times</button>
<?php if($slots):?><fieldset class="booking-starts"><legend>Available starts / SAST</legend><div class="booking-start-row"><?php foreach($slots as $clock):?><label><input type="radio" name="time" value="<?=esc($clock)?>" <?=($draft['time']===$clock||count($slots)===1)?'checked':''?> required><span><?=esc($clock)?></span></label><?php endforeach;?></div></fieldset>
<?php elseif(!$message):?><p role="status"><?=$configured?'No start times are available for the full visit on this date.':'Shalean has not opened any online booking times yet.'?></p>
<?php if($alternatives):?><dialog open class="date-alternatives"><h2>Choose an available date</h2><?php foreach($alternatives as $day):?><button type="button" data-alternative="<?=esc($day)?>"><?=esc($day)?></button><?php endforeach;?><button type="button" data-close>Close</button></dialog><?php endif;endif;?>
<section><h2>Extras and access notes (optional)</h2><div class="booking-access-row"><?php booking_dropdown('pets','Pets (optional)',['No pets','Pets present'],$draft['pets']??null,'Choose if applicable');booking_dropdown('equipment','Cleaning equipment (optional)',['Available','Partly available','Unavailable'],$draft['equipment']??null,'Choose if applicable');?></div><label>Instructions (optional)<textarea name="notes" maxlength="1900"><?=esc($draft['notes']??'')?></textarea></label></section>
<?php if($slots):?><button name="action" value="review">Review this visit</button><?php endif;?></form>
<?php elseif($step==='review'):?>
<h2>Visit details</h2>
<div class="visit-details">
    <div><strong>Service:</strong> One-time</div>
    <div><strong>Address:</strong> <?=esc(implode(', ',array_filter([$draft['address'],$draft['unit'],$draft['area']])))?></div>
    <div><strong>Visit:</strong> <?=esc($draft['date'].' · '.$draft['time'])?> SAST · <?=esc(visit_duration($q['minutes']))?></div>
    <?php foreach(['pets'=>'Pets at the property','equipment'=>'Cleaning equipment','notes'=>'Instructions'] as $k=>$v):if(!empty($draft[$k])):?>
    <div><strong><?=esc($v)?>:</strong> <?=esc($draft[$k])?></div>
    <?php endif;endforeach;?>
    <div><strong>Contact:</strong> <?=esc(implode(' · ',array_filter([$draft['name'],$draft['email'],$draft['phone']])))?></div>
</div>
<h3 id="visit-costs" tabindex="-1">Price breakdown</h3><ul><?php foreach($q['parts'] as [$label,$cost]):?><li><?=esc($label)?> · <?=esc(visit_money($cost))?></li><?php endforeach;?></ul>
<p><strong>Test payment amount · <?=esc(visit_money($q['cents']))?></strong></p>
<button type="button" class="booking-policy-trigger" popovertarget="visit-policy">Cancellation and refunds</button>
<div class="booking-policy" id="visit-policy" popover="auto" role="dialog" aria-labelledby="policy-title"><h2 id="policy-title">Cancellation and refunds</h2>
<p>Cancel before the visit starts for a full refund. If the business cancels, you may choose a full refund or agree to a new time. The business reviews no-shows and visits already underway individually. Your statutory rights apply.</p>
<p>If your payment arrives and the visit cannot be confirmed, you receive a full refund. The business initiates approved refunds to the original payment method within two business days. Refunds stay pending until the provider confirms them.</p>
<button type="button" class="booking-policy-close" popovertarget="visit-policy" popovertargetaction="hide">Close</button></div>
<?php if($s['mode']==='quote'):?><p>This service requires a quote before payment.</p><?php else: visit_form_start($self,$csrf,'hold');?><button>Hold slot &amp; continue</button></form><?php endif;?>
<a href="<?=esc(visit_url('schedule',$service))?>">Edit visit</a>
<?php elseif ($step === 'payment'): ?>
<p><strong>Payee:</strong> <?=esc($company)?></p>
<?php if ($received): ?>
    <p><strong>Test amount paid:</strong> <?=esc(visit_money((int)$record['cents']))?></p>
    <?php if ($record['state'] === 'confirmed'): ?>
        <p role="status">Synthetic payment verified and test booking confirmed.</p>
        <p><strong>Booking reference:</strong> <?=esc($record['ref'])?></p>
    <?php else: ?>
        <p role="status">Your test payment was received after the slot became unavailable. The booking could not be confirmed.</p>
        <p><strong>Payment reference:</strong> <?=esc($record['ref'])?></p>
    <?php endif; ?>
    <?php visit_form_start($self,$csrf,'restart'); ?><button>Start another booking</button></form>
<?php elseif ($record['state'] === 'eft_pending'): ?>
<p role="status">Shalean has received your test transfer report. Your booking will be confirmed after Shalean verifies receipt and checks availability.</p>
<p><strong>Amount reported:</strong> <?=esc(visit_money((int)$record['cents']))?></p>
<p><strong>Transfer reference:</strong> <?=esc($record['ref'])?></p>
<a href="<?=esc($self)?>">Refresh payment status</a>
<?php elseif ($canPay): ?>
    <p><strong>Amount due:</strong> <?=esc(visit_money((int)$record['cents']))?></p>
    <p class="hold">Your slot is held until <?=esc((new DateTimeImmutable('@'.$record['expires']))->setTimezone(new DateTimeZone(VISIT_TZ))->format('H:i:s'))?> SAST.</p>
    <?php visit_form_start($self,$csrf,'pay'); ?><button>Pay with Paystack Test</button></form>
    <?php if (empty($record['url'])): ?>
    <details class="hold"><summary>Manual EFT</summary>
        <p>Test bank transfer only. Do not send money.</p>
        <p><strong>Account holder:</strong> <?=esc($company)?><br>
        <strong>Test account number:</strong> TEST-ONLY<br>
        <strong>Transfer reference:</strong> <?=esc($record['ref'])?></p>
        <?php visit_form_start($self,$csrf,'report_eft'); ?><button>Report test transfer</button></form>
    </details>
    <?php endif; ?>
    <?php visit_form_start($self,$csrf,'release'); ?><button class="secondary">Release hold and edit booking</button></form>
<?php else: ?>
    <p role="status">Your hold has expired. Choose another available start time.</p>
    <?php visit_form_start($self,$csrf,'release'); ?><button>Choose another time</button></form>
<?php endif; ?>
<?php endif; ?>
</section><?php if($showBookingSummary):?><aside class="visit-summary-card" aria-label="Booking summary"><h2>Booking summary</h2><?php visit_summary($s,$draft,$step,$q);?></aside><?php endif;?></div></main><footer class="booking-footer">
    <a href="/b/shalean-cleaning-services">© <?=date('Y')?> <?=esc($company)?></a>
    <nav aria-label="Booking footer">
        <a href="/privacy.html#overview">Privacy</a>
        <a href="/">Powered by <strong>FaraiOS</strong></a>
    </nav>
</footer></div></body></html>
