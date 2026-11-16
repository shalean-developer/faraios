<?php
require __DIR__.'/../notifications/staff-invitation.php';
function check($x){if(!$x)throw new RuntimeException('Invitation mail assertion failed');}
check(staff_mail_rpc_result('business_staff_mail_finish',['status'=>204,'body'=>null])===[]);
$denied=false;try{staff_mail_rpc_result('business_staff_mail_claim',['status'=>204,'body'=>null]);}catch(RuntimeException $e){$denied=true;}check($denied);
$pair=sodium_crypto_box_keypair();$public=sodium_crypto_box_publickey($pair);$secret=sodium_crypto_box_secretkey($pair);$token=str_repeat('a',64);
$c=['environment'=>'preview','base_url'=>'https://www.faraios.com/_accounts-preview','sender'=>'notifications@notify.faraios.com','public_key'=>bin2hex($public),'secret_key'=>bin2hex($secret),'allow_recipients'=>['invitee@example.test']];
$j=['id'=>'11111111-1111-1111-1111-111111111111','lease'=>'test-lease','recipient'=>'invitee@example.test','role'=>'worker','environment'=>'preview','business'=>'Synthetic <script>','expires_at'=>'2026-11-16','sealed_token'=>base64_encode(sodium_crypto_box_seal($token,$public))];
$m=staff_mail_message($j,$c);check(str_contains($m['html'],'&lt;script&gt;'));check(!str_contains($m['html'],'<script>'));check(str_contains($m['text'],'#id='));check(str_contains($m['text'],'token='.$token));
foreach([0,429,503,422,200] as $status){$q=[$j];$out=[];$sent=[];
 $rpc=function($name,$args)use(&$q,&$out){if($name==='business_staff_mail_claim')return array_shift($q)??[];$out[]=$args;return [];};
 $send=function($message,$key)use(&$sent,$status){$sent[]=[$message,$key];return ['status'=>$status,'body'=>['id'=>'provider-test']];};
 check(staff_mail_dispatch($c,$rpc,$send)===1);check($sent[0][1]==='staff-invitation/'.$j['id']);check($out[0]['p_retry']===in_array($status,[0,429,503]));check($out[0]['p_provider']===($status===200?'provider-test':''));
}
$q=[$j];$out=[];$sent=[];$blocked=$c;$blocked['allow_recipients']=[];staff_mail_dispatch($blocked,$rpc,$send);check(count($sent)===0);check($out[0]['p_retry']===false);
$q=[$j];$q[0]['sealed_token']='invalid';$out=[];$sent=[];staff_mail_dispatch($c,$rpc,$send);check(count($sent)===0);
echo "PASS invitation mail encryption, template, preview allowlist, retry and idempotency\n";
