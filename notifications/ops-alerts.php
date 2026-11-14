<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}

// Fixed operator mail only. Never consumes the customer notification queue.
function ops_alert_message(string $state): array {
 $subject=$state==='test'?'FaraiOS alerts verification':($state==='healthy'?'FaraiOS preview recovered':'FaraiOS preview needs attention');
 $text=$state==='test'?'This verifies the FaraiOS alerts address. Alerts are delivered to your existing FaraiOS mailbox.':($state==='healthy'?'The preview monitor has recovered.':'The preview monitor reports an unavailable check, application errors, or incomplete monitoring evidence. Review the private monitor before taking action.');
 return ['from'=>'FaraiOS <notifications@notify.faraios.com>','to'=>['alerts@faraios.com'],'reply_to'=>'support@faraios.com','subject'=>$subject,'text'=>$text."\n\nEnvironment: accounts-preview\nhttps://www.faraios.com/_accounts-preview/account/index.php?page=signin\n\nThis is a platform operations notification. No business or customer records are included."];
}

function ops_alert_save(string $path,array $data): void {
 if(is_link($path))throw new RuntimeException();
 $tmp=tempnam(dirname($path),'.alert-');if(!$tmp)throw new RuntimeException();
 try{if(!chmod($tmp,0600)||file_put_contents($tmp,json_encode($data,JSON_THROW_ON_ERROR))===false||!rename($tmp,$path))throw new RuntimeException();}
 finally{if(is_file($tmp))unlink($tmp);}
}

// Caller supplies a private directory, a fresh monitor result, and an injected transport.
// Persist the exact message/key before sending; an uncertain response retries that same pair.
function ops_alert_dispatch(string $dir,array $report,callable $send,bool $test=false,?int $now=null): array {
 $now??=time();$lockPath=$dir.'/alert.lock';$path=$dir.'/alert-state.json';
 if(is_link($lockPath)||is_link($path))throw new RuntimeException();
 $lock=fopen($lockPath,'c');if(!$lock||!chmod($lockPath,0600)||!flock($lock,LOCK_EX))throw new RuntimeException();
 try{
  $s=[];
  if(is_file($path)){$s=json_decode(file_get_contents($path),true);if(!is_array($s)||($s['schema']??'')!=='faraios.ops.alert.v1')throw new RuntimeException();}
  $s['schema']='faraios.ops.alert.v1';
  $at=strtotime((string)($report['time']??''));
  $state=($report['schema']??'')==='faraios.ops.monitor.v1'&&($report['environment']??'')==='preview'&&$at!==false&&$at<=$now+60&&$at>=$now-600&&in_array($report['state']??'', ['healthy','attention','unknown'],true)?$report['state']:'unknown';
  $pending=$s['pending']??null;
  if(!$pending){
   if($test&&($s['test_accepted']??false))return ['state'=>'already_verified','alert_sent'=>false];
   if(!$test&&$state==='healthy'&&in_array($s['notified_state']??'healthy',['healthy'],true))return ['state'=>'quiet','alert_sent'=>false];
   if(!$test&&$state!=='healthy'&&in_array($s['notified_state']??'', ['attention','unknown'],true)&&$now-(int)($s['accepted_at']??0)<3600)return ['state'=>'suppressed','alert_sent'=>false];
   $pending=['key'=>'faraios-preview-ops/'.bin2hex(random_bytes(16)),'state'=>$test?'test':$state,'created_at'=>$now,'next_at'=>$now,'attempts'=>0];
   $s['pending']=$pending;ops_alert_save($path,$s);
  }
  if($test&&$pending['state']!=='test')return ['state'=>'requires_review','alert_sent'=>false];
  // Never retry beyond the provider's 24-hour idempotency window or after a hard rejection.
  if(($pending['blocked']??false)||$now-(int)$pending['created_at']>=82800)return ['state'=>'requires_review','alert_sent'=>false];
  if($now<(int)$pending['next_at'])return ['state'=>'retry_wait','alert_sent'=>false];
  $s['pending']['attempts']++;$s['pending']['next_at']=$now+min(3600,300*(2**min(4,$s['pending']['attempts']-1)));
  ops_alert_save($path,$s);
  try{$r=$send(ops_alert_message($pending['state']),$pending['key']);}catch(Throwable $e){$r=['status'=>0];}
  $status=(int)($r['status']??0);$id=$r['body']['id']??null;
  if($status>=200&&$status<300&&is_string($id)&&preg_match('/^[a-zA-Z0-9-]{1,100}$/',$id)){
   if($pending['state']==='test')$s['test_accepted']=true;else{$s['notified_state']=$pending['state'];$s['accepted_at']=$now;}
   $s['last_provider_id']=$id;unset($s['pending']);ops_alert_save($path,$s);
   return ['state'=>'accepted','alert_sent'=>true,'provider_id'=>$id];
  }
  if($status!==0&&$status!==429&&$status<500){$s['pending']['blocked']=true;ops_alert_save($path,$s);}
  return ['state'=>'send_failed','alert_sent'=>false];
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}

function ops_alert_transport(string $file): callable {
 $path=realpath($file);$web=realpath(dirname(__DIR__));
 if(!$path||$path===$web||str_starts_with($path,$web.'/'))throw new RuntimeException();
 $c=require $path;
 if(!is_array($c)||($c['sender']??'')!=='notifications@notify.faraios.com'||strlen((string)($c['resend_key']??''))<20)throw new RuntimeException();
 $key=$c['resend_key'];unset($c);
 return static function(array $message,string $idempotency)use($key): array {
  $raw=@file_get_contents('https://api.resend.com/emails',false,stream_context_create(['http'=>['method'=>'POST','header'=>"Content-Type: application/json\r\nAuthorization: Bearer ".$key."\r\nIdempotency-Key: ".$idempotency,'content'=>json_encode($message,JSON_THROW_ON_ERROR),'timeout'=>12,'ignore_errors'=>true,'follow_location'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]));
  preg_match('/\s(\d{3})\s/',$http_response_header[0]??'',$m);return ['status'=>(int)($m[1]??0),'body'=>json_decode($raw?:'',true)];
 };
}
