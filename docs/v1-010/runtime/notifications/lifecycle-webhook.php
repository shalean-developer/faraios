<?php
declare(strict_types=1);
require __DIR__.'/lifecycle-config.php';
header('Content-Type: application/json');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: no-referrer');header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
try{
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST')lifecycle_json(['error'=>'Method not allowed'],405);
 $c=lifecycle_config();$secret=$c['webhook_secret']??'';
 if(($c['enabled']??false)!==true||!str_starts_with($secret,'whsec_'))lifecycle_json(['error'=>'Not configured'],503);
 if((int)($_SERVER['CONTENT_LENGTH']??0)>262144)lifecycle_json(['error'=>'Payload too large'],413);
 $raw=file_get_contents('php://input',false,null,0,262145);
 if(strlen($raw)>262144)lifecycle_json(['error'=>'Payload too large'],413);
 if(!lifecycle_webhook_valid($raw,$_SERVER['HTTP_SVIX_ID']??'',$_SERVER['HTTP_SVIX_TIMESTAMP']??'',$_SERVER['HTTP_SVIX_SIGNATURE']??'',$secret))lifecycle_json(['error'=>'Invalid signature'],400);
 $e=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
 if(in_array($e['type']??'',['email.delivered','email.bounced','email.complained','email.failed','email.suppressed'],true)&&is_string($e['data']['email_id']??null))lifecycle_rpc($c,'business_communication_delivery',['p_event_id'=>$_SERVER['HTTP_SVIX_ID'],'p_provider_id'=>$e['data']['email_id'],'p_event'=>$e['type']]);
 lifecycle_json(['received'=>true]);
}catch(JsonException $e){lifecycle_json(['error'=>'Invalid payload'],400);}catch(Throwable $e){lifecycle_json(['error'=>'Please retry later'],503);}
