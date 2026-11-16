<?php
declare(strict_types=1);
require __DIR__.'/runtime/notifications/lifecycle.php';
function check($value){if(!$value)throw new RuntimeException('Synthetic transport assertion failed');}
$c=['enabled'=>true,'environment'=>'preview','base_url'=>'https://www.faraios.com/_accounts-preview','sender'=>'notifications@notify.faraios.com','allow_recipients'=>['owner@example.test']];
$j=['id'=>'synthetic-stable-id','environment'=>'preview','recipient'=>'owner@example.test','lease'=>'synthetic-lease','payload'=>['business'=>'Synthetic <script>','event'=>'booking.cancelled','reference'=>'SYNTH010','local'=>'24 Nov 2026 10:00','zone'=>'Africa/Johannesburg','duration'=>90,'address'=>'123 Fictional Road','status'=>'Cancelled','link'=>'']];
$finish=[];$sent=[];
$rpc=function($name,$args)use(&$j,&$finish){static $claim=0;if($name==='business_communication_claim')return ++$claim<=2?$j:[];$finish[]=$args;return [];};
$send=function($message,$key)use(&$sent){$sent[]=[$message,$key];return count($sent)===1?['status'=>0,'body'=>[]]:['status'=>200,'body'=>['id'=>'synthetic-provider-id']];};
check(lifecycle_dispatch($c,$rpc,$send)===2);check($sent[0]===$sent[1]);check($finish[0]['p_retry']===true);check($finish[1]['p_provider_id']==='synthetic-provider-id');check(str_contains($sent[0][0]['text'],'does not void an invoice'));check(!str_contains($sent[0][0]['html'],'<script>'));check(str_contains($sent[0][0]['html'],'&lt;script&gt;'));
$called=false;check(lifecycle_dispatch($c+[],fn()=>[],function()use(&$called){$called=true;})===0);check(!$called);
check(lifecycle_dispatch(array_replace($c,['enabled'=>false]),function(){throw new RuntimeException('Disabled dispatcher claimed');},function(){throw new RuntimeException('Disabled dispatcher sent');})===0);
$j['payload']['link']='https://evil.test/token';try{lifecycle_message($j,$c);throw new LogicException('Bad link allowed');}catch(RuntimeException $e){}
$j['payload']['link']='';$finish=[];$count=0;
lifecycle_dispatch(array_replace($c,['allow_recipients'=>[]]),function($name,$args)use(&$count,&$j,&$finish){if($name==='business_communication_claim')return ++$count===1?$j:[];$finish[]=$args;return [];},function(){throw new LogicException('Unapproved recipient sent');});check($finish[0]['p_error']==='Recipient blocked');
echo "PASS: injected timeout/retry, stable bytes/key, no disabled/unapproved send, escaped HTML and confidential-link validation\n";

require __DIR__.'/runtime/notifications/lifecycle-config.php';
$key=str_repeat('S',32);$secret='whsec_'.base64_encode($key);$raw='{"type":"email.delivered","data":{"email_id":"synthetic-id"}}';$eid='synthetic-event';$ts=(string)time();$sig='v1,'.base64_encode(hash_hmac('sha256',$eid.'.'.$ts.'.'.$raw,$key,true));
check(lifecycle_webhook_valid($raw,$eid,$ts,$sig,$secret));check(!lifecycle_webhook_valid($raw.'changed',$eid,$ts,$sig,$secret));check(!lifecycle_webhook_valid($raw,$eid,(string)(time()-600),$sig,$secret));check(!lifecycle_webhook_valid($raw,$eid,$ts,'v1,bad',$secret));
echo "PASS: signed webhook verification rejects tampered, expired and invalid signatures\n";
