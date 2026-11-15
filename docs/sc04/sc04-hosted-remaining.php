<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';
$report=[];$phase=getopt('',['phase:'])['phase']??'setup';
function check(bool $ok,string $label):void{global $report;if(!$ok)throw new RuntimeException('Check failed: '.$label);$report[]=['check'=>$label,'passed'=>true];}
function httpx(?string $who,string $path,$body=null,?string $b=null,string $e='preview',string $method='POST',array $extra=[]):array{
 global $c,$state;
 $h=['apikey: '.$c['publishable_key'],'Content-Type: application/json','Accept: application/json'];
 if($who!==null)$h[]='Authorization: Bearer '.$state[$who]['token'];
 if($b!==null){$h[]='x-faraios-business: '.$b;$h[]='x-faraios-environment: '.$e;}
 $h=array_merge($h,$extra);$opts=['http'=>['method'=>$method,'header'=>implode("\r\n",$h),'ignore_errors'=>true,'timeout'=>25,'follow_location'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]];
 if($body!==null)$opts['http']['content']=json_encode($body,JSON_THROW_ON_ERROR);
 $raw=@file_get_contents($c['supabase_url'].$path,false,stream_context_create($opts));preg_match('/\s(\d{3})\s/',$http_response_header[0]??'',$m);
 return [(int)($m[1]??0),json_decode($raw?:'null',true)];
}
function rpc(string $who,string $name,array $args,?string $b=null,string $e='preview',bool $deny=false){global $phase,$state,$stateFile;$key=hash('sha256',json_encode([$who,$name,$args,$b,$e,$deny]));if($phase==='setup'&&isset($state['_setup_cache'][$key]))return $state['_setup_cache'][$key]['value'];$r=httpx($who,'/rest/v1/rpc/'.$name,(object)$args,$b,$e);check($deny?($r[0]>=400&&$r[0]<500):($r[0]>=200&&$r[0]<300),$who.':'.$name.':'.($args['p_operation']??$args['p_resource']??$args['p_action']??'').':'.($deny?'denied':'allowed').':HTTP'.$r[0]);if($phase==='setup'){$state['_setup_cache'][$key]=['value'=>$r[1]];file_put_contents($stateFile,json_encode($state),LOCK_EX);chmod($stateFile,0600);}return $r[1];}
function readx(string $who,string $res,?string $id=null,?string $b=null,string $e='preview',bool $deny=false){global $a;return rpc($who,'business_delegate_read',['p_business'=>$b??$a,'p_environment'=>$e,'p_resource'=>$res,'p_id'=>$id],$b??$a,$e,$deny);}
function cmd(string $who,string $op,array $args=[],?string $b=null,string $e='preview',bool $deny=false){global $a;return rpc($who,'business_delegate_command',['p_business'=>$b??$a,'p_environment'=>$e,'p_operation'=>$op,'p_arguments'=>(object)$args],$b??$a,$e,$deny);}

function remain_step(string $name,callable $run){global $state,$stateFile,$report;
 if(isset($state['_steps'][$name])){if($state['_steps'][$name]['status']!=='done')throw new RuntimeException('Inspect pending fixture step before retry: '.$name);return $state['_steps'][$name]['value'];}
 $state['_steps'][$name]=['status'=>'pending'];file_put_contents($stateFile,json_encode($state),LOCK_EX);chmod($stateFile,0600);
 $value=$run();$state['_steps'][$name]=['status'=>'done','value'=>$value];$state['_checks']=$report;file_put_contents($stateFile,json_encode($state),LOCK_EX);return $value;
}
function remaining_uuid():string{$s=bin2hex(random_bytes(16));return substr($s,0,8).'-'.substr($s,8,4).'-'.substr($s,12,4).'-'.substr($s,16,4).'-'.substr($s,20);}
try{
 $_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$_SERVER['REQUEST_URI']=$_SERVER['SCRIPT_NAME'];$c=require $private.'/config.php';
 check($c['supabase_url']==='https://rxelmugnucfajrqmphhe.supabase.co'&&$c['base_url']==='https://www.faraios.com/_accounts-preview','exact_preview_target');
 $f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true,512,JSON_THROW_ON_ERROR);$a=$f['_business_a'];$b=$f['_business_b'];
 check($a==='2f16e658-e031-4c4a-930a-2731ec1d1492'&&$b==='4627f805-8243-4890-bf18-a14fdf3fd21b','registered_synthetic_businesses');
 $stateFile=$private.'/sc04-remaining-state.json';$state=is_file($stateFile)?json_decode(file_get_contents($stateFile),true,512,JSON_THROW_ON_ERROR):[];$report=$state['_checks']??$report;
 $phase=getopt('',['phase:'])['phase']??'inspect';
 if($phase==='prepare'){
  check(!isset($state['_prepared']),'not_prepared_before');
  foreach(['owner_a','owner_b','manager','receptionist','worker'] as $role){check(str_ends_with($f[$role]['email'],'@example.test'),'reserved_identity:'.$role);$r=httpx(null,'/auth/v1/token?grant_type=password',['email'=>$f[$role]['email'],'password'=>$f[$role]['password']]);check($r[0]===200&&$r[1]['user']['id']===$f[$role]['id'],'managed_auth:'.$role);$state[$role]=['token'=>$r[1]['access_token']];}
  foreach(['manager','receptionist'] as $role)foreach(['customer','enquiry','quote','booking','request'] as $key)$state['_ids'][$role][$key]=remaining_uuid();foreach(['manager','receptionist'] as $role){$id=$state['_ids'][$role]['request'];remain_step('request_enquiry:'.$role,fn()=>rpc('owner_a','business_enquiry_create',['p_business'=>$a,'p_environment'=>'preview','p_id'=>$id,'p_name'=>'Synthetic remaining request','p_email'=>'remaining-request@example.test','p_phone'=>'','p_requirements'=>'Synthetic remaining request'],$a));}$state['_prepared']=true;$state['_checks']=$report;
 }elseif($phase==='exercise'){
  check(isset($state['_prepared'])&&!isset($state['_exercise_complete']),'prepared_unfinished_exercise');
  foreach(['manager','receptionist','worker'] as $role){$r=httpx($role,'/auth/v1/user',null,null,'preview','GET');check($r[0]===200&&$r[1]['id']===$f[$role]['id'],'unchanged_auth_before:'.$role);}
  $doc=['name'=>'Synthetic remaining acceptance','email'=>'remaining@example.test','phone'=>'','notes'=>'SYNTHETIC PRIVATE NOTES','currency'=>'ZAR','items'=>[['name'=>'Synthetic fixed service','quantity'=>1,'price'=>50500]]];$due=gmdate('Y-m-d',time()+1209600);
  foreach(['manager','receptionist'] as $role){$i=$state['_ids'][$role];$details=['name'=>'Synthetic remaining '.$role,'email'=>'remaining-'.$role.'@example.test','phone'=>'','address'=>'Synthetic address','notes'=>''];$d=$doc;$d['name']=$details['name'];$d['email']=$details['email'];
   remain_step($role.':customer',fn()=>cmd($role,'business_customer_write',['p_id'=>$i['customer'],'p_version'=>0,'p_details'=>$details,'p_confirm'=>true]));
   remain_step($role.':customer_stale',fn()=>cmd($role,'business_customer_write',['p_id'=>$i['customer'],'p_version'=>0,'p_details'=>$details+['notes'=>'stale'],'p_confirm'=>true],null,'preview',true));
   remain_step($role.':enquiry',fn()=>cmd($role,'business_enquiry_create',['p_id'=>$i['enquiry'],'p_name'=>$details['name'],'p_email'=>$details['email'],'p_phone'=>'','p_requirements'=>'Synthetic remaining requirements']));
   remain_step($role.':status',fn()=>cmd($role,'business_enquiry_status',['p_id'=>$i['enquiry'],'p_version'=>1,'p_status'=>'Contacted']));
   remain_step($role.':link',fn()=>cmd($role,'business_customer_link',['p_customer'=>$i['customer'],'p_kind'=>'enquiry','p_record'=>$i['enquiry'],'p_version'=>2]));
   remain_step($role.':followup',fn()=>cmd($role,'business_enquiry_workflow_save',['p_id'=>$i['enquiry'],'p_version'=>3,'p_status'=>'Contacted','p_notes'=>'Synthetic internal follow-up','p_follow_up'=>null]));
   remain_step($role.':workspace',fn()=>cmd($role,'business_enquiry_workspace',['p_id'=>$i['enquiry']]));
   remain_step($role.':customer_quote',fn()=>cmd($role,'business_customer_quote_create',['p_id'=>$i['quote'],'p_version'=>0,'p_action'=>'save','p_document'=>$d,'p_expiry'=>$due,'p_enquiry'=>$i['enquiry'],'p_customer'=>$i['customer']]));
   remain_step($role.':quote_send',fn()=>cmd($role,'business_quote_send',['p_id'=>$i['quote'],'p_version'=>1]));
   $owner=httpx('owner_a','/rest/v1/business_quotes?id=eq.'.$i['quote'].'&select=share_token',null,$a,'preview','GET');check($owner[0]===200&&count($owner[1])===1,'owner_exact_quote_capability:'.$role);$token=$owner[1][0]['share_token'];
   remain_step($role.':customer_decision',function()use($token){$r=httpx(null,'/rest/v1/rpc/business_quote_customer',['p_environment'=>'preview','p_token'=>$token,'p_response'=>'Accepted']);check($r[0]===200,'synthetic_exact_customer_capability');return true;});
   remain_step($role.':schedule',fn()=>cmd($role,'business_customer_booking_create',['p_id'=>$i['booking'],'p_version'=>0,'p_quote'=>$i['quote'],'p_document'=>$d,'p_address'=>'Synthetic agreed remaining address','p_local'=>'2026-12-06 09:00','p_zone'=>'Africa/Johannesburg','p_duration'=>90,'p_status'=>'Scheduled','p_customer'=>$i['customer']]));
   $rows=readx($role,'bookings',$i['booking']);check(count($rows)===1&&$rows[0]['customer_id']===$i['customer']&&$rows[0]['document']==$d,'actual_saved_agreement:'.$role);
   remain_step($role.':schedule_stale',fn()=>cmd($role,'business_booking_write',['p_id'=>$i['booking'],'p_version'=>0,'p_quote'=>$i['quote'],'p_document'=>$d,'p_address'=>'Synthetic stale','p_local'=>'2026-12-06 09:00','p_zone'=>'Africa/Johannesburg','p_duration'=>90,'p_status'=>'Scheduled'],null,'preview',true));
   $original=httpx('owner_a','/rest/v1/business_bookings?id=eq.'.$i['booking'].'&select=*',null,$a,'preview','GET');
   foreach(['manager','receptionist','worker'] as $actor){
    rpc($actor,'business_booking_write',['p_business'=>$a,'p_environment'=>'preview','p_id'=>$i['booking'],'p_version'=>1,'p_quote'=>$i['quote'],'p_document'=>$d,'p_address'=>'Synthetic valid unauthorized change','p_local'=>'2026-12-06 09:00','p_zone'=>'Africa/Johannesburg','p_duration'=>90,'p_status'=>'Scheduled'],$a,'preview',true);
    $raw=httpx($actor,'/rest/v1/business_bookings?id=eq.'.$i['booking'],['address'=>'Synthetic forbidden raw update'],$a,'preview','PATCH',['Prefer: return=representation']);check(($raw[0]>=400&&$raw[0]<500)||($raw[0]===200&&$raw[1]===[]),'valid_raw_mutation_denied:'.$actor);
    check(httpx('owner_a','/rest/v1/business_bookings?id=eq.'.$i['booking'].'&select=*',null,$a,'preview','GET')===$original,'exact_row_preserved:'.$actor);
   }
   remain_step($role.':alias_denied',fn()=>cmd($role,'business_booking_request_action',['p_id'=>$i['request'],'p_version'=>1,'p_action'=>'quote'],null,'preview',true));
   remain_step($role.':request_accept',fn()=>cmd($role,'business_booking_request_action',['p_id'=>$i['request'],'p_version'=>1,'p_action'=>'accept']));
   remain_step($role.':request_convert',fn()=>cmd($role,'business_booking_request_action',['p_id'=>$i['request'],'p_version'=>2,'p_action'=>'convert']));
  }
  cmd('manager','business_dashboard',[]);
  foreach(['manager','receptionist','worker'] as $role)foreach(['business_customer_write','business_enquiry_create','business_quote_write','business_booking_write','business_staff_assign','business_invoice_write','business_invoice_payment','visit.execute','terminal.correct'] as $op){cmd($role,$op,[],$a,'live',true);cmd($role,$op,[],$b,'live',true);}
  $state['_exercise_complete']=true;
 }elseif($phase==='revoke-check'){
  check(isset($state['_exercise_complete']),'exercise_completed_before_revoke');
  foreach(['manager','receptionist','worker'] as $role){$r=httpx($role,'/auth/v1/user',null,null,'preview','GET');check($r[0]===200&&$r[1]['id']===$f[$role]['id'],'same_token_managed_auth_valid_after_revoke:'.$role);readx($role,$role==='worker'?'visits':'bookings',null,null,'preview',true);cmd($role,'business_customer_search',['p_search'=>'','p_page'=>1],null,'preview',true);}
  remain_step('owner_b_revoke',fn()=>rpc('owner_b','business_membership_revoke',['p_business'=>$b,'p_environment'=>'preview','p_user'=>$f['manager']['id']],$b));readx('manager','customers',null,$b,'preview',true);$state['_revoked_checked']=true;
 }elseif($phase!=='inspect')throw new RuntimeException('Unknown phase');
 $state['_checks']=$report;file_put_contents($stateFile,json_encode($state),LOCK_EX);chmod($stateFile,0600);
 $out=['status'=>'PASS','phase'=>$phase,'checks'=>count($report),'synthetic_only'=>true,'secrets_printed'=>false,'fixture_ids'=>$state['_ids']??[],'completed_steps'=>array_keys(array_filter($state['_steps']??[],fn($v)=>$v['status']==='done'))];
 file_put_contents($private.'/sc04-remaining-result-'.$phase.'.json',json_encode($out+['results'=>$report]),LOCK_EX);chmod($private.'/sc04-remaining-result-'.$phase.'.json',0600);echo json_encode($out)."\n";
}catch(Throwable $e){$stop=['status'=>'STOP','error'=>$e->getMessage(),'phase'=>$phase??'unknown','inspect_before_retry'=>true];if(isset($stateFile))file_put_contents($private.'/sc04-remaining-stop.json',json_encode($stop));echo json_encode($stop)."\n";exit(1);}
