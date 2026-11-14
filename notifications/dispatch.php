<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
// Transport injection keeps tests completely offline and preserves one stable provider key per job.
function enquiry_mail_dispatch(array $c,callable $rpc,callable $send): int {
 $processed=0;for($i=0;$i<20;$i++){
  $j=$rpc('business_enquiry_mail_claim',['p_environment'=>$c['environment']]);if(empty($j['id']))break;
  $id='';$retry=false;$error='';
  if($c['environment']==='preview'&&!in_array(strtolower($j['recipient']),array_map('strtolower',$c['allow_recipients']??[]),true))$error='Recipient blocked in preview';
  else{$r=$send(enquiry_mail_message($j,$c),'enquiry/'.$j['environment'].'/'.$j['id']);
   if($r['status']>=200&&$r['status']<300&&is_string($r['body']['id']??null))$id=$r['body']['id'];else{$retry=$r['status']===0||$r['status']===429||$r['status']>=500;$error=$retry?'Temporary provider failure':'Provider rejected message';}}
  $rpc('business_enquiry_mail_finish',['p_id'=>$j['id'],'p_lease'=>$j['lease'],'p_provider_id'=>$id,'p_retry'=>$retry,'p_error'=>$error]);$processed++;
 }return $processed;
}
