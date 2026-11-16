<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function lifecycle_message(array $job,array $config): array {
 $p=$job['payload'];$event=$p['event']??'';
 $titles=['request.accepted'=>'Request accepted for review','request.declined'=>'Request declined','quote.sent'=>'Your quote is ready','quote.accepted'=>'Quote accepted','quote.declined'=>'Quote declined','booking.confirmation'=>'Booking recorded','booking.changed'=>'Booking changed','booking.scheduled'=>'Booking scheduled','booking.in_progress'=>'Booking in progress','booking.completed'=>'Booking completed','booking.cancelled'=>'Booking cancelled','invoice.issued'=>'Your invoice is ready','invoice.void'=>'Invoice voided'];
 if(!isset($titles[$event])||preg_match('/[\r\n]/',$job['recipient']))throw new RuntimeException('Invalid message');
 $business=preg_replace('/[\r\n\t]+/u',' ',(string)$p['business']);$title=$titles[$event];
 $text=$business."\n\n".$title."\nReference: ".$p['reference'];
 $info=['request.accepted'=>'Your request has been accepted for the next step. This message does not confirm a staffed visit. The business will confirm the agreed work and schedule separately.','request.declined'=>'The business cannot accept this request. No visit is reserved. Contact the business if you need help.','quote.sent'=>'Review the confidential quote link and deliberately accept or decline. A quote alone does not reserve staff or confirm a visit.','quote.accepted'=>'The customer accepted this quote. Review the request and arrange the booking and staff separately.','quote.declined'=>'The customer declined this quote. No booking is created by this decision.','booking.cancelled'=>'This visit is cancelled. Do not attend. Cancellation does not void an invoice or issue a refund. Contact the business about any financial correction.','booking.completed'=>'The visit is marked completed. This message is not an invoice or proof of payment.','invoice.issued'=>'Review the confidential invoice link for the issued document and current balance. No money is collected by this message.','invoice.void'=>'This invoice has been voided and remains available for history. This message does not issue a refund. A replacement, if issued, has its own link.'];
 $text.="\n\n".($info[$event]??'The business recorded this visit or changed its details. Staff allocation is managed separately; contact the business to confirm arrangements.');
 if(str_starts_with($event,'booking.')){
  if(isset($p['previous_local']))$text.="\n\nPrevious: ".$p['previous_local'].' '.$p['previous_zone'].'; '.$p['previous_duration'].' minutes; '.$p['previous_address'].'; '.$p['previous_status'];
  $text.="\n\nVisit: ".$p['local'].' '.$p['zone']."\nDuration: ".$p['duration']." minutes\nAddress: ".$p['address']."\nStatus: ".$p['status'];
 }
 if(isset($p['total_minor'])){$amount=(int)$p['total_minor'];$text.="\n\nDocument total: ".$p['currency'].' '.intdiv($amount,100).'.'.str_pad((string)($amount%100),2,'0',STR_PAD_LEFT);}
 if(isset($p['number']))$text.="\n\nInvoice: ".$p['number']."\nCurrency: ".$p['currency']."\nDue: ".$p['due_on'];
 if(isset($p['expires_on']))$text.="\n\nQuote valid through: ".$p['expires_on']."\nCurrency: ".$p['currency'];
 $link=$p['link']??'';
 if($link!==''){
  if(!preg_match('~\A/(quote|invoice)/index\.php\?token=[a-f0-9]{64}\z~',$link))throw new RuntimeException('Invalid message');
  $text.="\n\nConfidential document: ".$config['base_url'].$link."\nAnyone with this link can view this document. Share only with the intended recipient.";
 }
 $text.="\n\nContact the business for questions or changes. Sent by FaraiOS for this service record. No marketing subscription was created.";
 $escape=fn($s)=>htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
 return ['from'=>$config['sender'],'to'=>[$job['recipient']],'subject'=>($job['environment']==='preview'?'[Preview] ':'').$title.' | '.$business.' | '.$p['reference'],'text'=>$text,
 'html'=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial,sans-serif;color:#183047;line-height:1.6"><main style="max-width:580px;margin:auto;padding:24px"><h1>'.$escape($title).'</h1><p style="overflow-wrap:anywhere">'.nl2br($escape($text)).'</p></main></body></html>'];
}
// No network access here. Callers inject transport; a stable job ID pins retries.
function lifecycle_dispatch(array $config,callable $rpc,callable $send): int {
 if(($config['enabled']??false)!==true)return 0;
 $count=0;
 for($i=0;$i<20;$i++){
  $job=$rpc('business_communication_claim',['p_environment'=>$config['environment']]);if(empty($job['id']))break;
  $provider='';$retry=false;$error='';
  if(!filter_var($job['recipient'],FILTER_VALIDATE_EMAIL)||!in_array(strtolower($job['recipient']),array_map('strtolower',$config['allow_recipients']??[]),true))$error='Recipient blocked';
  else try{
   $message=lifecycle_message($job,$config);
   try{$r=$send($message,'lifecycle/'.$job['environment'].'/'.$job['id']);}catch(Throwable $transportError){$r=['status'=>0,'body'=>[]];}
   if($r['status']>=200&&$r['status']<300&&is_string($r['body']['id']??null)&&$r['body']['id']!=='')$provider=$r['body']['id'];
   else{$retry=$r['status']===0||$r['status']===429||$r['status']>=500;$error=$retry?'Temporary provider failure':'Provider rejected message';}
  }catch(Throwable $e){$error='Invalid message';}
  $rpc('business_communication_finish',['p_id'=>$job['id'],'p_lease'=>$job['lease'],'p_provider_id'=>$provider,'p_retry'=>$retry,'p_error'=>$error]);$count++;
 }
 return $count;
}
