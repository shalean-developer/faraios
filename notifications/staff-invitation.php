<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function staff_mail_message(array $job,array $c): array {
 $sealed=base64_decode($job['sealed_token'],true);$pair=sodium_crypto_box_keypair_from_secretkey_and_publickey(hex2bin($c['secret_key']),hex2bin($c['public_key']));
 $token=$sealed===false?false:sodium_crypto_box_seal_open($sealed,$pair);
 if(!is_string($token)||!preg_match('/^[a-f0-9]{64}$/',$token))throw new RuntimeException('Invalid encrypted invitation');
 $url=$c['base_url'].'/account/staff-join.php#id='.rawurlencode($job['id']).'&token='.$token;
 $business=preg_replace('/[\r\n\t]+/u',' ',(string)$job['business']);$role=ucfirst($job['role']);
 $text="You are invited to join {$business} as {$role} ({$job['environment']}).\nSign in or create an account using {$job['recipient']}, verify that email and accept. You do not need to create a business.\nExpires: {$job['expires_at']}\n\nAccept invitation: {$url}\n\nIf unexpected, ignore this invitation. This is not a marketing subscription.";
 $e=fn($s)=>htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
 return ['from'=>$c['sender'],'to'=>[$job['recipient']],'subject'=>($job['environment']==='preview'?'[Preview] ':'').'Invitation to '.$business,'text'=>$text,'html'=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Team invitation</title></head><body style="font-family:Arial,sans-serif;color:#183047;line-height:1.6"><h1>Join '.$e($business).'</h1><p>Role: '.$e($role).' · '.$e($job['environment']).'</p><p>Sign in or create an account using '.$e($job['recipient']).'. Verify your email, then accept. You do not need to create a business.</p><p><a href="'.$e($url).'" style="background:#183c5d;color:white;padding:14px;display:inline-block">Accept invitation</a></p><p>Expires: '.$e($job['expires_at']).'</p><p>If unexpected, ignore this invitation. No marketing subscription is created.</p></body></html>'];
}
function staff_mail_dispatch(array $c,callable $rpc,callable $send): int {
 $n=0;for($i=0;$i<20;$i++){
  $j=$rpc('business_staff_mail_claim',['p_environment'=>$c['environment']]);if(empty($j['id']))break;
  $provider='';$retry=false;
  try{
   if($c['environment']==='preview'&&!in_array(strtolower($j['recipient']),array_map('strtolower',$c['allow_recipients']??[]),true))throw new RuntimeException('Preview recipient blocked');
   $r=$send(staff_mail_message($j,$c),'staff-invitation/'.$j['id']);
   if($r['status']>=200&&$r['status']<300&&is_string($r['body']['id']??null))$provider=$r['body']['id'];
   else $retry=$r['status']===0||$r['status']===429||$r['status']>=500;
  }catch(Throwable $e){$retry=false;}
  $rpc('business_staff_mail_finish',['p_id'=>$j['id'],'p_lease'=>$j['lease'],'p_provider'=>$provider,'p_retry'=>$retry]);$n++;
 }return $n;
}
