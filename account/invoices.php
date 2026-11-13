<?php
require __DIR__.'/core.php';require __DIR__.'/profile-core.php';require __DIR__.'/services-core.php';require __DIR__.'/quotes-core.php';require __DIR__.'/invoices-core.php';
$_SERVER['SCRIPT_NAME']=preg_replace('~/account/invoices.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
$error='';$notice='';$b=null;$q=null;$rows=[];$edit=false;$catalogue=null;$currency='ZAR';$source=null;$filter=(string)($_GET['status']??'');$page=max(1,min(100000,(int)($_GET['page']??1)));
try{
 start();$u=user();$b=business();if(!$b)go('business');$catalogue=services_load($b);$currency=$catalogue['draft']['currency']??'ZAR';
 $notice=(string)($_SESSION['invoice_notice']??'');unset($_SESSION['invoice_notice']);
 $id=(string)($_GET['id']??$_POST['id']??'');$edit=isset($_GET['new']);
 $prefix='/rest/v1/business_invoice_list?business_id=eq.'.rawurlencode($b['id']).'&environment=eq.'.profile_env();
 if($id!==''&&(!$edit||$_SERVER['REQUEST_METHOD']==='POST')){if(!preg_match('/\A[0-9a-f-]{36}\z/',$id))throw new RuntimeException('Invoice unavailable.');$r=api($prefix.'&id=eq.'.rawurlencode($id).'&select=*',[],'GET',$_SESSION['auth']['access_token']);$q=$r[0]??null;if(!$q&&!$edit)throw new RuntimeException('Invoice unavailable.');if($q)$edit=$q['state']==='Draft';}
 if($edit&&!$q){
 $booking=(string)($_GET['booking']??$_POST['booking']??'');
 if($booking!==''){
 if(!preg_match('/\A[0-9a-f-]{36}\z/',$booking))throw new RuntimeException('Booking unavailable.');
 $existing=api($prefix.'&booking_id=eq.'.rawurlencode($booking).'&select=id',[],'GET',$_SESSION['auth']['access_token']);
 if($existing){header('Location: invoices.php?id='.rawurlencode($existing[0]['id']),true,303);exit;}
 $r=api('/rest/v1/business_bookings?business_id=eq.'.rawurlencode($b['id']).'&environment=eq.'.profile_env().'&id=eq.'.rawurlencode($booking).'&select=*',[],'GET',$_SESSION['auth']['access_token']);$source=$r[0]??null;
 if(!$source||$source['status']==='Cancelled')throw new RuntimeException('Booking unavailable or cancelled.');
 }
 $q=['id'=>$id!==''?$id:($_SESSION['new_invoice_id']??=quote_uuid()),'version'=>0,'state'=>'Draft','status'=>'Draft','due_on'=>(new DateTimeImmutable('now',new DateTimeZone($b['time_zone'])))->modify('+14 days')->format('Y-m-d'),'booking_id'=>$source['id']??null,'document'=>$source['document']??['name'=>'','email'=>'','phone'=>'','notes'=>'','currency'=>$currency,'items'=>[]]];
 }
 if($q)$currency=$q['document']['currency'];
 if($_SERVER['REQUEST_METHOD']==='POST'){
 csrf();if(!$q)throw new RuntimeException('Invoice unavailable.');$action=(string)($_POST['action']??'');
 if($action==='payment'||$action==='reverse'){
 if(!isset($_POST['confirm_payment']))throw new RuntimeException('Confirm this payment record or correction.');
 $payments=invoice_payments($b,$q['id']);$original=null;
 if($action==='reverse')foreach($payments as $p)if($p['id']===($_POST['reversal']??'')&&$p['reversal_of']===null)$original=$p;
 if($action==='reverse'&&!$original)throw new RuntimeException('Payment unavailable.');
 $key=$original?'reverse_'.$original['id']:'payment';
 $pid=(string)($_POST['payment_id']??'');if(!preg_match('/\A[0-9a-f-]{36}\z/',$pid))throw new RuntimeException('Reload the payment form.');
 profile_rpc('business_invoice_payment',['p_business'=>$b['id'],'p_environment'=>profile_env(),'p_invoice'=>$q['id'],'p_id'=>$pid,'p_amount'=>$original?(int)$original['amount']:invoice_amount((string)($_POST['amount']??''),$currency),'p_paid_on'=>$original?$original['paid_on']:invoice_date((string)($_POST['paid_on']??'')),'p_reference'=>$original?$original['reference']:trim((string)($_POST['reference']??'')),'p_reversal'=>$original['id']??null,'p_reason'=>$original?trim((string)($_POST['reason']??'')):'']);
 unset($_SESSION['invoice_keys'][$q['id']][$key]);
 }else{
 if(!in_array($action,['save','issue','void'],true))throw new RuntimeException('Choose a valid invoice action.');
 if($action==='issue'&&!isset($_POST['confirm_issue']))throw new RuntimeException('Confirm the saved invoice is ready to issue.');
 if($action==='void'&&!isset($_POST['confirm_void']))throw new RuntimeException('Confirm voiding this invoice.');
 $d=$action==='save'?($q['booking_id']?$q['document']:quote_values($currency)):$q['document'];
 $r=profile_rpc('business_invoice_write',['p_business'=>$b['id'],'p_environment'=>profile_env(),'p_id'=>$q['id'],'p_version'=>(int)($_POST['version']??-1),'p_action'=>$action,'p_document'=>$d,'p_due'=>invoice_date($action==='save'?(string)($_POST['due_on']??''):$q['due_on']),'p_booking'=>$q['booking_id'],'p_reason'=>trim((string)($_POST['reason']??''))]);
 unset($_SESSION['new_invoice_id']);
 }
 $_SESSION['invoice_notice']=match($action){'save'=>'Draft saved.','issue'=>'Invoice issued. Copy the customer link below.','void'=>'Invoice voided. History retained.','reverse'=>'Payment reversed in the ledger. No money was refunded.',default=>'Payment recorded.'};header('Location: invoices.php?id='.rawurlencode($r['id']??$q['id']),true,303);exit;
 }
 if(!$q){if(!in_array($filter,['','Draft','Unpaid','Part Paid','Paid','Void'],true))throw new RuntimeException('Choose a valid status.');$rows=api($prefix.($filter!==''?'&status=eq.'.rawurlencode($filter):'').'&select=*&order=created_at.desc,id.desc&limit=21&offset='.(($page-1)*20),[],'GET',$_SESSION['auth']['access_token']);}
}catch(AccountSessionExpired $e){$_SESSION=['csrf'=>bin2hex(random_bytes(32)),'notice'=>$e->getMessage()];session_regenerate_id(true);go('signin');}
catch(Throwable $e){$error=$e instanceof RuntimeException?$e->getMessage():'Invoices unavailable. Please try again.';}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoices | FaraiOS</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="../business/profile.css?v=invoices-20261113"><link rel="stylesheet" href="layout.css?v=20261113-2"><script src="layout.js?v=20261113-2" defer></script></head><body><?php require_once __DIR__.'/layout.php';app_layout('Invoices',$b);?><main id="app-main" tabindex="-1" class="editor-main">
<?php if(profile_env()==='preview'):?><p class="preview-banner">Isolated preview · Fictional invoices only</p><?php endif;?>
<?php if($error):?><p class="alert" role="alert"><?=esc($error)?></p><?php endif;?><?php if($notice):?><p class="notice" role="status"><?=esc($notice)?></p><?php endif;?>
<?php if($b):?><div class="editor-heading"><div><p class="eyebrow"><?=esc($b['name'])?></p><h1>Invoices</h1><p class="muted">Invoices and manual payments · <?=esc($currency)?></p></div><a href="invoices.php?new=1">Create invoice</a></div>
<?php if($q):?><a href="invoices.php">← All invoices</a><section class="panel"><div class="service-title"><h2><?=$edit?'Invoice draft':'Invoice '.esc(strtoupper(substr($q['id'],0,8)))?></h2><span class="badge"><?=esc($q['status'])?></span></div>
<?php if($q['booking_id']):?><p>From booking <a href="bookings.php?id=<?=esc($q['booking_id'])?>"><?=esc(strtoupper(substr($q['booking_id'],0,8)))?></a> · Agreed details are preserved.</p><?php endif;?><?php if($edit): $d=$q['document']; if(!$q['booking_id']&&$_SERVER['REQUEST_METHOD']==='POST'&&($_POST['action']??'')==='save'){foreach(['name','email','phone','notes'] as $k)if(is_string($_POST[$k]??null))$d[$k]=substr($_POST[$k],0,8000);} form_start();?>
<input type="hidden" name="id" value="<?=esc($q['id'])?>"><input type="hidden" name="booking" value="<?=esc($q['booking_id']??'')?>"><input type="hidden" name="version" value="<?=(int)$q['version']?>"><input type="hidden" name="action" value="save">
<?php if(!$q['booking_id']):foreach(['name'=>'Customer name','email'=>'Email address','phone'=>'Phone number'] as $k=>$label):?><label for="<?=$k?>"><?=$label?></label><input id="<?=$k?>" name="<?=$k?>" type="<?=$k==='email'?'email':($k==='phone'?'tel':'text')?>" maxlength="<?=$k==='email'?254:($k==='phone'?40:120)?>" <?=$k==='name'?'required':''?> value="<?=esc($d[$k])?>"><?php endforeach;endif;?><small>Provide an email address or phone number for manual invoices.</small>
<label for="due_on">Due on</label><input id="due_on" type="date" name="due_on" required value="<?=esc((string)($_POST['due_on']??$q['due_on']))?>"><small>Payment due on this date in <?=esc(str_replace('_',' ',$b['time_zone']))?>.</small>
<?php if($q['booking_id']):?><h3><?=esc($d['name'])?></h3><?php quote_render($d);else:?><h3>Items · <?=esc($currency)?></h3><p class="muted">Whole quantities. All prices are the final amounts offered to the customer.</p>
<?php for($i=0;$i<20;$i++):$s=$d['items'][$i]??['name'=>'','quantity'=>'','price'=>null];$posted=$_SERVER['REQUEST_METHOD']==='POST'&&($_POST['action']??'')==='save';$name=$posted?(string)($_POST['item_name_'.$i]??''):$s['name'];$qty=$posted?(string)($_POST['quantity_'.$i]??''):(string)$s['quantity'];$price=$posted?(string)($_POST['price_'.$i]??''):($s['price']===null?'':number_format($s['price']/100,in_array($currency,['JPY','UGX','RWF'],true)?0:2,'.',''));?>
<?php if($i>=max(3,count($d['items']))):?><details class="quote-extra"><summary>Add item <?=$i+1?></summary><?php endif;?><fieldset class="quote-line"><legend>Item <?=$i+1?></legend><label for="item_name_<?=$i?>">Service or item</label><input id="item_name_<?=$i?>" name="item_name_<?=$i?>" list="services" maxlength="120" value="<?=esc($name)?>"><div class="quote-numbers"><div><label for="quantity_<?=$i?>">Quantity</label><input id="quantity_<?=$i?>" name="quantity_<?=$i?>" type="number" min="1" max="9999" step="1" value="<?=esc($qty)?>"></div><div><label for="price_<?=$i?>">Unit price · <?=esc($currency)?></label><input id="price_<?=$i?>" name="price_<?=$i?>" inputmode="decimal" value="<?=esc($price)?>"></div></div></fieldset><?php if($i>=max(3,count($d['items']))):?></details><?php endif;?>
<?php endfor;?><datalist id="services"><?php foreach($catalogue['draft']['items']??[] as $s)if(!$s['archived']):?><option value="<?=esc($s['name'])?>"><?=esc(services_price($s,$currency))?></option><?php endif;?></datalist>
<label for="notes">Notes / requirements</label><textarea id="notes" name="notes" rows="4" maxlength="2000"><?=esc($d['notes'])?></textarea><?php endif;?><button class="button">Save draft</button></form>
<?php if($q['version']>0):?><section class="quote-saved"><h3>Saved invoice</h3><?php quote_render($q['document']);form_start();?><input type="hidden" name="id" value="<?=esc($q['id'])?>"><input type="hidden" name="version" value="<?=(int)$q['version']?>"><input type="hidden" name="action" value="issue"><label class="check"><input type="checkbox" name="confirm_issue" required> The saved invoice is ready to issue. Issuing locks these details.</label><button class="button">Issue invoice &amp; get link</button></form></section><?php endif;?>
<?php else:$d=$q['document'];?><h3><?=esc($q['number'])?></h3><h3><?=esc($d['name'])?></h3><p><?=esc($d['email'])?> <?=esc($d['phone'])?></p><p>Due on <?=esc($q['due_on'])?></p><?php quote_render($d);invoice_balances($q);?>
<label for="share-link">Customer link</label><input id="share-link" readonly value="<?=esc(cfg()['base_url'].'/invoice/index.php?token='.$q['share_token'])?>"><a href="<?=esc(cfg()['base_url'].'/invoice/index.php?token='.$q['share_token'])?>" target="_blank" rel="noopener noreferrer">Open customer invoice ↗</a><p class="muted">Anyone with this link can view the invoice and balance. Share it only with the intended customer. No email is sent.</p>
<?php invoice_payment_forms($b,$q);endif;?></section>
<?php elseif(!$error):?><form method="get" class="enquiry-filter"><label for="status">Status</label><select id="status" name="status"><option value="">All invoices</option><?php foreach(['Draft','Unpaid','Part Paid','Paid','Void'] as $s):?><option <?=$filter===$s?'selected':''?>><?=$s?></option><?php endforeach;?></select><button class="button secondary">Filter</button></form><section class="panel"><?php $shown=0;foreach(array_slice($rows,0,20) as $r):$st=$r['status'];if($filter!==''&&$st!==$filter)continue;$shown++;?><article class="service-card"><div class="service-title"><h2><a href="invoices.php?id=<?=esc($r['id'])?>"><?=esc($r['document']['name'])?></a></h2><span class="badge"><?=esc($st)?></span></div><p><?=esc($r['number']??'Draft')?> · Due on <?=esc($r['due_on'])?></p><?php quote_render($r['document']);invoice_balances($r);?></article><?php endforeach;if(!$shown):?><h2>No invoices<?=$filter?' on this page with this status':' yet'?></h2><p class="muted">Create one manually or from a booking.</p><?php endif;?></section><nav class="enquiry-pagination" aria-label="Invoice pages"><?php if($page>1):?><a href="?page=<?=$page-1?>&amp;status=<?=esc($filter)?>">Previous</a><?php endif;if(count($rows)>20):?><a href="?page=<?=$page+1?>&amp;status=<?=esc($filter)?>">Next</a><?php endif;?></nav><?php endif;endif;?></main><footer>© <?=date('Y')?> FaraiOS</footer></body></html>
