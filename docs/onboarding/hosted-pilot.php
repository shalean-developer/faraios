<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';$work=$private.'/staff-onboarding-20261115';
$src=file_get_contents($private.'/sc04-api-acceptance.php');eval(substr($src,5,strpos($src,'try{')-5));
$src=file_get_contents($private.'/sc04-hosted-sessions.php');eval(substr($src,5,strpos($src,'try{')-5));
$phase=getopt('',['phase:'])['phase']??'inspect';$report=[];$base='https://www.faraios.com/_accounts-preview/account/';
$stateFile=$work.'/pilot-auth.json';$pilotFile=$work.'/pilot.json';$cookieFile=$work.'/pilot-cookies.json';
$state=is_file($stateFile)?json_decode(file_get_contents($stateFile),true):[];$pilot=is_file($pilotFile)?json_decode(file_get_contents($pilotFile),true):[];$sessions=is_file($cookieFile)?json_decode(file_get_contents($cookieFile),true):[];
function persistpilot():void{global $stateFile,$pilotFile,$cookieFile,$state,$pilot,$sessions;foreach([$stateFile=>$state,$pilotFile=>$pilot,$cookieFile=>$sessions] as $p=>$v){file_put_contents($p,json_encode($v,JSON_THROW_ON_ERROR),LOCK_EX);chmod($p,0600);}}
function uidnew():string{$s=bin2hex(random_bytes(16));return substr($s,0,8).'-'.substr($s,8,4).'-4'.substr($s,13,3).'-a'.substr($s,17,3).'-'.substr($s,20);}
function transport(string $url,array $body,array $headers):array{$raw=@file_get_contents($url,false,stream_context_create(['http'=>['method'=>'POST','header'=>implode("\r\n",array_merge(['Content-Type: application/json'],$headers)),'content'=>json_encode($body,JSON_THROW_ON_ERROR),'timeout'=>20,'ignore_errors'=>true,'follow_location'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]));preg_match('/\s(\d{3})\s/',$http_response_header[0]??'',$m);return ['status'=>(int)($m[1]??0),'body'=>json_decode($raw?:'{}',true)];}
function tokenfor(string $id):string{global $pilot,$mail;$j=$pilot['jobs'][$id]??null;if(!$j)throw new RuntimeException('Delivery job not captured privately');$pair=sodium_crypto_box_keypair_from_secretkey_and_publickey(hex2bin($mail['secret_key']),hex2bin($mail['public_key']));$t=sodium_crypto_box_seal_open(base64_decode($j['sealed_token'],true),$pair);if(!is_string($t)||!preg_match('/^[a-f0-9]{64}$/',$t))throw new RuntimeException('Private decryption failed');return $t;}
function ownerinvite(string $owner,string $business,string $staff,string $role,?string $replace=null):string{
 global $pilot;
 $html=session_http($owner,'staff-access.php?staff='.$staff);$fields=['csrf'=>session_csrf($html),'action'=>'invite','staff'=>$staff,'role'=>$role];if($replace)$fields['replace']=$replace;
 $html=session_http($owner,'staff-access.php?staff='.$staff,$fields);check(str_contains($html,'Invitation queued.'),'native_owner_queued:'.$role);
 $rows=rpc($owner,'business_staff_invite_list',['p_business'=>$business,'p_environment'=>'preview'],$business);$rows=array_values(array_filter($rows,fn($i)=>$i['staff_id']===$staff&&$i['status']==='Pending'));check(count($rows)===1,'one_pending_invitation:'.$role);$id=$rows[0]['id'];$pilot['invitations'][$id]=['business'=>$business,'staff'=>$staff,'role'=>$role];persistpilot();return $id;
}
function sendpilot():void{
 global $mail,$pilot,$work;
 $rpc=function($name,$args)use(&$pilot,$mail){check(in_array($name,['business_staff_mail_claim','business_staff_mail_finish'],true),'mail_rpc_allowlist');$r=transport($mail['supabase_url'].'/rest/v1/rpc/'.$name,$args,['apikey: '.$mail['service_key'],'Authorization: Bearer '.$mail['service_key']]);$j=staff_mail_rpc_result($name,$r);check(true,'worker_rpc:'.$name);if($name==='business_staff_mail_claim'&&!empty($j['id'])){check(isset($pilot['invitations'][$j['id']])&&$j['recipient']==='support@faraios.com'&&$j['environment']==='preview','exact_owned_delivery_job');$pilot['jobs'][$j['id']]=$j;persistpilot();}return is_array($j)?$j:[];};
 $count=staff_mail_dispatch($mail,$rpc,function($message,$key)use($mail){check($message['to']===['support@faraios.com'],'only_controlled_inbox');return transport('https://api.resend.com/emails',$message,['Authorization: Bearer '.$mail['resend_key'],'Idempotency-Key: '.$key]);});check($count===1,'one_delivery_processed');
}
function acceptnative(string $id,string $business,string $role):void{
 global $pilot;
 $html=session_http('recipient','staff-join.php');$html=session_http('recipient','staff-join.php',['csrf'=>session_csrf($html),'action'=>'capture','invitation'=>$id,'token'=>tokenfor($id)]);
 if(str_contains($html,'Welcome back')){$html=session_http('recipient','index.php?page=signin',['csrf'=>session_csrf($html),'email'=>'support@faraios.com','password'=>$pilot['password']]);}
 check(str_contains($html,'Accept invitation')&&str_contains($html,$role)&&str_contains($html,'preview'),'native_accept_confirmation:'.$role);
 $html=session_http('recipient','staff-join.php',['csrf'=>session_csrf($html),'action'=>'accept']);check(str_contains($html,'Choose business'),'explicit_selection_after_accept:'.$role);
 $html=session_http('recipient','context.php',['csrf'=>session_csrf($html),'context'=>$business.':preview']);check(str_contains($html,$role.' · preview'),'native_workspace:'.$role);persistpilot();
}
function accountauth():void{global $pilot,$state;$r=httpx(null,'/auth/v1/token?grant_type=password',['email'=>'support@faraios.com','password'=>$pilot['password']]);check($r[0]===200&&isset($r[1]['access_token'])&&!empty($r[1]['user']['email_confirmed_at']),'managed_verified_recipient_auth');$state['recipient']=['token'=>$r[1]['access_token']];$pilot['recipient']=$r[1]['user']['id'];persistpilot();}
try{
 $_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$_SERVER['REQUEST_URI']=$_SERVER['SCRIPT_NAME'];$c=require $private.'/config.php';$mail=require dirname($private).'/faraios-staff-invite/worker.php';require '/var/www/vhosts/shalean.com/faraios.com/_accounts-preview/notifications/staff-invitation.php';
 $f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true);$a=$f['_business_a'];$b=$f['_business_b'];$ids=$f['_ids'];
 check($a==='2f16e658-e031-4c4a-930a-2731ec1d1492'&&$b==='4627f805-8243-4890-bf18-a14fdf3fd21b','registered_scopes');check($mail['environment']==='preview'&&$mail['allow_recipients']===['support@faraios.com'],'approved_preview_mail');
 if($phase==='prepare'){
  check(empty($pilot['prepared']),'not_already_prepared');
  foreach(['owner_a','owner_b'] as $owner){$r=httpx(null,'/auth/v1/token?grant_type=password',['email'=>$f[$owner]['email'],'password'=>$f[$owner]['password']]);check($r[0]===200&&($r[1]['user']['id']??'')===$f[$owner]['id'],'managed_owner_auth:'.$owner);$state[$owner]=['token'=>$r[1]['access_token']];persistpilot();$html=session_http($owner,'index.php?page=signin');session_http($owner,'index.php?page=signin',['csrf'=>session_csrf($html),'email'=>$f[$owner]['email'],'password'=>$f[$owner]['password']]);persistpilot();}
  $html=session_http('owner_a','staff.php?new=1');check(preg_match('/name="id" value="([a-f0-9-]+)"/',$html,$m)===1,'native_staff_id');$pilot['staff_a']=$m[1];persistpilot();
  $html=session_http('owner_a','staff.php?new=1',['csrf'=>session_csrf($html),'id'=>$pilot['staff_a'],'version'=>0,'name'=>'Synthetic invitation mailbox pilot','email'=>'support@faraios.com','phone'=>'','active'=>'on','invite_next'=>'1']);check(str_contains($html,'Staff access')&&str_contains($html,'Synthetic invitation mailbox pilot'),'save_then_invite_journey');
  $pilot['manager_original']=ownerinvite('owner_a',$a,$pilot['staff_a'],'manager');sendpilot();$pilot['prepared']=true;persistpilot();
 }elseif($phase==='resume_prepare'){
  check(empty($pilot['prepared'])&&isset($pilot['manager_original'],$pilot['staff_a']),'preparation_stopped_after_existing_invitation');
  $rows=rpc('owner_a','business_staff_invite_list',['p_business'=>$a,'p_environment'=>'preview'],$a);$found=array_values(array_filter($rows,fn($x)=>$x['id']===$pilot['manager_original']&&$x['staff_id']===$pilot['staff_a']&&$x['delivery']==='provider_accepted'&&$x['status']==='Pending'));check(count($found)===1&&isset($pilot['jobs'][$pilot['manager_original']]),'existing_single_delivery_verified_without_resend');$pilot['prepared']=true;persistpilot();
 }elseif($phase==='register'){
  check(($pilot['prepared']??false)&&empty($pilot['registered']),'registration_not_repeated');$id=$pilot['manager_original'];
  $html=session_http('recipient','staff-join.php');$html=session_http('recipient','staff-join.php',['csrf'=>session_csrf($html),'action'=>'capture','invitation'=>$id,'token'=>tokenfor($id)]);check(str_contains($html,'Welcome back'),'signed_out_invite_to_signin');
  $pilot['password']=bin2hex(random_bytes(20));persistpilot();$html=session_http('recipient','index.php?page=signup');$html=session_http('recipient','index.php?page=signup',['csrf'=>session_csrf($html),'name'=>'Synthetic mailbox pilot','email'=>'support@faraios.com','password'=>$pilot['password']]);check(str_contains($html,'Check your email'),'native_signup_confirmation_required');$pilot['registered']=true;persistpilot();
 }elseif($phase==='manager'){
  check(($pilot['registered']??false)&&empty($pilot['manager_done']),'manager_not_repeated');accountauth();
  $old=$pilot['manager_original'];$pilot['manager_current']=ownerinvite('owner_a',$a,$pilot['staff_a'],'manager',$old);sendpilot();
  rpc('recipient','business_staff_invite_accept',['p_id'=>$old,'p_environment'=>'preview','p_token'=>tokenfor($old)],$a,'preview',true);
  rpc('owner_b','business_staff_invite_accept',['p_id'=>$pilot['manager_current'],'p_environment'=>'preview','p_token'=>tokenfor($pilot['manager_current'])],$a,'preview',true);
  acceptnative($pilot['manager_current'],$a,'manager');foreach(['customers','bookings','invoices','payments'] as $res)readx('recipient',$res,null,$a);$pilot['manager_done']=true;persistpilot();
 }elseif($phase==='receptionist'){
  check(($pilot['manager_done']??false)&&empty($pilot['receptionist_done']),'receptionist_not_repeated');rpc('owner_a','business_membership_revoke',['p_business'=>$a,'p_environment'=>'preview','p_user'=>$pilot['recipient']],$a);
  $id=ownerinvite('owner_a',$a,$pilot['staff_a'],'receptionist');sendpilot();acceptnative($id,$a,'receptionist');readx('recipient','customers',null,$a);readx('recipient','invoices',null,$a,'preview',true);readx('recipient','payments',null,$a,'preview',true);$pilot['receptionist_done']=true;persistpilot();
 }elseif($phase==='worker'){
  check(($pilot['receptionist_done']??false)&&empty($pilot['worker_done']),'worker_not_repeated');rpc('owner_a','business_membership_revoke',['p_business'=>$a,'p_environment'=>'preview','p_user'=>$pilot['recipient']],$a);
  $id=ownerinvite('owner_a',$a,$pilot['staff_a'],'worker');sendpilot();acceptnative($id,$a,'worker');check(readx('recipient','visits',null,$a)===[],'worker_no_unassigned_jobs');
  $pilot['booking']=uidnew();persistpilot();$doc=['name'=>'Synthetic onboarding customer','email'=>'fixture@example.test','phone'=>'','notes'=>'SYNTHETIC SENSITIVE NOTE','currency'=>'ZAR','items'=>[['name'=>'Synthetic fixed service','quantity'=>1,'price'=>50500]]];
  rpc('owner_a','business_booking_write',['p_business'=>$a,'p_environment'=>'preview','p_id'=>$pilot['booking'],'p_version'=>0,'p_quote'=>null,'p_document'=>$doc,'p_address'=>'Synthetic onboarding address','p_local'=>gmdate('Y-m-d',time()+345600).' 10:00','p_zone'=>'Africa/Johannesburg','p_duration'=>90,'p_status'=>'Scheduled'],$a);
  cmd('recipient','visit.execute',['id'=>$pilot['booking'],'version'=>1,'status'=>'In Progress'],$a,'preview',true);
  rpc('owner_a','business_staff_assign',['p_business'=>$a,'p_environment'=>'preview','p_booking'=>$pilot['booking'],'p_version'=>0,'p_staff'=>[$pilot['staff_a']]],$a);
  $rows=readx('recipient','visits',null,$a);check(count($rows)===1&&$rows[0]['id']===$pilot['booking'],'automatic_link_exact_assignment');check(!str_contains(json_encode($rows),'50500')&&!str_contains(json_encode($rows),'SENSITIVE NOTE')&&!str_contains(json_encode($rows),'fixture@example.test'),'worker_field_filter');
  readx('recipient','invoices',null,$a,'preview',true);readx('recipient','visits',null,$b,'preview',true);
  foreach(['business_bookings','business_customers','business_invoices','business_invoice_payments'] as $table){$r=httpx('recipient','/rest/v1/'.$table.'?select=*',null,$a,'preview','GET');check($r[0]===200&&$r[1]===[],'raw_api_denied:'.$table);}
  cmd('recipient','visit.execute',['id'=>$pilot['booking'],'version'=>1,'status'=>'In Progress'],$a);$pilot['worker_done']=true;persistpilot();
 }elseif($phase==='close'){
  check(($pilot['worker_done']??false)&&empty($pilot['closed']),'close_not_repeated');rpc('owner_a','business_staff_offboard',['p_business'=>$a,'p_environment'=>'preview','p_staff'=>$pilot['staff_a']],$a);
  $r=httpx('recipient','/auth/v1/user',null,null,'preview','GET');check($r[0]===200&&$r[1]['id']===$pilot['recipient'],'same_token_still_valid');readx('recipient','visits',null,$a,'preview',true);cmd('recipient','visit.execute',['id'=>$pilot['booking'],'version'=>2,'status'=>'Completed'],$a,'preview',true);
  $html=session_http('recipient','delegated.php');check(str_contains($html,'No active business access.')&&!str_contains($html,'Synthetic onboarding address'),'same_cookie_immediate_revocation');$pilot['closed']=true;persistpilot();
 }else throw new RuntimeException('Choose prepare/register/manager/receptionist/worker/close');
 $result=['status'=>'PASS','phase'=>$phase,'checks'=>count($report),'results'=>$report,'synthetic_only'=>true,'mail_recipient'=>'support@faraios.com','secrets_printed'=>false];file_put_contents($work.'/pilot-result-'.$phase.'.json',json_encode($result));chmod($work.'/pilot-result-'.$phase.'.json',0600);echo json_encode(['status'=>'PASS','phase'=>$phase,'checks'=>count($report),'synthetic_only'=>true,'secrets_printed'=>false]);
}catch(Throwable $e){persistpilot();file_put_contents($work.'/pilot-stop-'.$phase.'.json',json_encode(['status'=>'STOP','phase'=>$phase,'reason'=>$e->getMessage(),'results'=>$report]));chmod($work.'/pilot-stop-'.$phase.'.json',0600);echo json_encode(['status'=>'STOP','phase'=>$phase,'reason'=>$e->getMessage(),'checks'=>count($report),'secrets_printed'=>false]);exit(1);}
