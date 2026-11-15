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
try{
 $_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$_SERVER['REQUEST_URI']=$_SERVER['SCRIPT_NAME'];
 $c=require $private.'/config.php';check(($c['supabase_url']??'')==='https://rxelmugnucfajrqmphhe.supabase.co','exact_project');check(($c['base_url']??'')==='https://www.faraios.com/_accounts-preview','exact_preview');
 $f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true,512,JSON_THROW_ON_ERROR);$a=$f['_business_a'];$b=$f['_business_b'];$ids=$f['_ids'];
 check($a==='2f16e658-e031-4c4a-930a-2731ec1d1492'&&$b==='4627f805-8243-4890-bf18-a14fdf3fd21b','synthetic_scope');
 $stateFile=$private.'/sc04-acceptance-state.json';$state=is_file($stateFile)?json_decode(file_get_contents($stateFile),true,512,JSON_THROW_ON_ERROR):[];
 $roles=['owner_a','owner_b','manager','receptionist','worker'];
 if($phase==='setup'){
  check(!($state['_setup_complete']??false),'setup_not_completed');
  foreach($roles as $role){check(str_ends_with($f[$role]['email'],'@example.test'),'synthetic_email:'.$role);$r=httpx(null,'/auth/v1/token?grant_type=password',['email'=>$f[$role]['email'],'password'=>$f[$role]['password']]);check($r[0]===200&&($r[1]['user']['id']??'')===$f[$role]['id']&&isset($r[1]['access_token']),'real_auth:'.$role);$state[$role]=['token'=>$r[1]['access_token']];}
  foreach(['manager','receptionist','worker'] as $role){$x=rpc('owner_a','business_invite_create',['p_business'=>$a,'p_environment'=>'preview','p_recipient'=>$f[$role]['id'],'p_role'=>$role],$a);rpc('owner_b','business_invite_accept',['p_business'=>$a,'p_environment'=>'preview','p_token'=>$x['token']],$a,'preview',true);rpc($role,'business_invite_accept',['p_business'=>$a,'p_environment'=>'preview','p_token'=>$x['token']],$a);rpc($role,'business_invite_accept',['p_business'=>$a,'p_environment'=>'preview','p_token'=>$x['token']],$a,'preview',true);readx($role,'customers',null,null,'preview',true);}
  $x=rpc('owner_b','business_invite_create',['p_business'=>$b,'p_environment'=>'preview','p_recipient'=>$f['manager']['id'],'p_role'=>'receptionist'],$b);rpc('manager','business_invite_accept',['p_business'=>$b,'p_environment'=>'preview','p_token'=>$x['token']],$b);
  rpc('owner_a','business_membership_revoke',['p_business'=>$a,'p_environment'=>'preview','p_user'=>$f['owner_a']['id']],$a,'preview',true);
  $r=httpx('owner_a','/rest/v1/businesses?id=eq.'.$a.'&select=id',null,null,'preview','GET');check($r[0]===200&&count($r[1])===1,'legacy_headerless_owner_read');
  $r=httpx('owner_b','/rest/v1/businesses?id=eq.'.$a.'&select=id',null,null,'preview','GET');check($r[0]===200&&$r[1]===[],'legacy_foreign_owner_denied');
  rpc('owner_a','business_staff_write',['p_business'=>$a,'p_environment'=>'preview','p_id'=>$ids['staff'],'p_version'=>0,'p_name'=>'Synthetic SC04 worker','p_email'=>'sensitive-staff@example.test','p_phone'=>'','p_active'=>true],$a);
  $doc=['name'=>'Synthetic SC04 customer','email'=>'synthetic-customer@example.test','phone'=>'','notes'=>'SYNTHETIC PRIVATE SALES NOTES','currency'=>'ZAR','items'=>[['name'=>'Synthetic fixed service','quantity'=>1,'price'=>50500]]];$state['_document']=$doc;
  foreach([['booking',$a,'owner_a'],['unassigned',$a,'owner_a'],['foreign_booking',$b,'owner_b']] as [$key,$scope,$owner])rpc($owner,'business_booking_write',['p_business'=>$scope,'p_environment'=>'preview','p_id'=>$ids[$key],'p_version'=>0,'p_quote'=>null,'p_document'=>$doc,'p_address'=>'Synthetic acceptance address','p_local'=>gmdate('Y-m-d',time()+172800).' 09:00','p_zone'=>'Africa/Johannesburg','p_duration'=>90,'p_status'=>'Scheduled'],$scope);
  rpc('owner_a','business_worker_link',['p_business'=>$a,'p_environment'=>'preview','p_user'=>$f['worker']['id'],'p_staff'=>$ids['staff']],$a);
  rpc('owner_a','business_staff_assign',['p_business'=>$a,'p_environment'=>'preview','p_booking'=>$ids['booking'],'p_version'=>0,'p_staff'=>[$ids['staff']]],$a);
 }elseif($phase==='exercise'){
  check(count($state)>0,'existing_auth_tokens');
  foreach($roles as $role){$r=httpx($role,'/auth/v1/user',null,null,'preview','GET');check($r[0]===200&&($r[1]['id']??'')===$f[$role]['id'],'retained_auth:'.$role);}
  $contexts=rpc('manager','business_contexts',[]);check(count($contexts)===2&&count(array_filter($contexts,fn($x)=>$x['role']==='manager'))===1&&count(array_filter($contexts,fn($x)=>$x['role']==='receptionist'))===1,'explicit_two_business_contexts');
  foreach(['manager','receptionist','worker'] as $role){foreach(['businesses','business_quotes','business_bookings','business_customers','business_staff','business_invoices','business_invoice_list','business_quote_list','business_booking_schedule'] as $table){$r=httpx($role,'/rest/v1/'.$table.'?select=*',null,$a,'preview','GET');check($r[0]===200&&$r[1]===[],'raw_denied:'.$role.':'.$table);}foreach($f['_legacy'] as $ep){$args=[];foreach($ep['args'] as $arg)$args[$arg]=$arg==='p_business'?$a:($arg==='p_environment'?'preview':(in_array($arg,['p_page','p_activity_page'])?1:($arg==='p_search'?'':null)));rpc($role,$ep['name'],$args,$a,'preview',true);}readx($role,'bookings',null,$a,'live',true);$r=httpx($role,'/rest/v1/rpc/business_delegate_read',['p_business'=>$a,'p_environment'=>'preview','p_resource'=>'bookings'],null);check($r[0]>=400,'missing_context:'.$role);}
  $r=httpx(null,'/rest/v1/rpc/business_delegate_read',['p_business'=>$a,'p_environment'=>'preview','p_resource'=>'bookings'],$a);check($r[0]>=400,'anonymous_denied');
  $rows=readx('worker','visits');check(count($rows)===1&&$rows[0]['id']===$ids['booking'],'worker_exact_assignment');$keys=array_keys($rows[0]);sort($keys);$expected=['id','version','status','address','starts_at','time_zone','duration_minutes','customer_name','services'];sort($expected);check($keys===$expected,'worker_field_allowlist');check(!str_contains(json_encode($rows),'50500')&&!str_contains(json_encode($rows),'PRIVATE SALES')&&!str_contains(json_encode($rows),'@example.test'),'worker_sensitive_fields_filtered');
  readx('worker','invoices',null,null,'preview',true);readx('worker','visits',null,$b,'preview',true);
  foreach(['manager','receptionist'] as $role){readx($role,'customers');readx($role,'bookings');}
  foreach(['invoices','payments'] as $res){readx('manager',$res);readx('receptionist',$res,null,null,'preview',true);}
  cmd('manager','business_customer_write',['p_id'=>$ids['customer'],'p_version'=>0,'p_details'=>['name'=>'Synthetic API acceptance customer','email'=>'api-customer@example.test','phone'=>'','address'=>'Synthetic address','notes'=>'Synthetic private note'],'p_confirm'=>true]);
  $doc=$state['_document'];$due=gmdate('Y-m-d',time()+1209600);
  foreach(['manager','receptionist'] as $role)cmd($role,'business_quote_write',['p_id'=>$ids[$role==='receptionist'?'reception_quote':'manager_quote'],'p_version'=>0,'p_action'=>'save','p_document'=>$doc,'p_expiry'=>$due]);
  $bad=$doc;$bad['items'][0]['price']=60000;cmd('receptionist','business_quote_write',['p_id'=>$ids['reception_quote'],'p_version'=>1,'p_action'=>'save','p_document'=>$bad,'p_expiry'=>$due,'authorization_reason'=>'Synthetic forbidden override'],null,'preview',true);
  cmd('manager','business_quote_write',['p_id'=>$ids['manager_quote'],'p_version'=>1,'p_action'=>'save','p_document'=>$bad,'p_expiry'=>$due,'authorization_reason'=>'Synthetic approved acceptance override']);
  cmd('receptionist','business_invoice_write',['p_id'=>$ids['invoice'],'p_version'=>0,'p_action'=>'save','p_document'=>$doc,'p_due'=>$due,'p_booking'=>$ids['booking']]);cmd('receptionist','business_invoice_write',['p_id'=>$ids['invoice'],'p_version'=>1,'p_action'=>'issue']);$exact=readx('receptionist','invoice',$ids['invoice']);check($exact['state']==='Issued'&&!isset($exact['share_token'])&&!isset($exact['payments']),'agreed_invoice_projection');
  cmd('manager','business_invoice_payment',['p_invoice'=>$ids['invoice'],'p_id'=>$ids['payment'],'p_amount'=>10000,'p_paid_on'=>gmdate('Y-m-d'),'p_reference'=>'Synthetic manual acceptance only']);
  foreach(['manager','receptionist','worker'] as $role){cmd($role,'business_invoice_payment',['p_invoice'=>$ids['invoice'],'p_id'=>$ids['availability'],'p_amount'=>10000,'p_paid_on'=>gmdate('Y-m-d'),'p_reference'=>'Synthetic forbidden','p_reversal'=>$ids['payment'],'p_reason'=>'Synthetic reversal denied'],null,'preview',true);foreach(['void','replace'] as $op)cmd($role,'business_invoice_write',['p_id'=>$ids['invoice'],'p_version'=>3,'p_action'=>$op,'p_reason'=>'Synthetic forbidden correction'],null,'preview',true);rpc($role,'business_membership_revoke',['p_business'=>$a,'p_environment'=>'preview','p_user'=>$f['owner_a']['id']],$a,'preview',true);}
  cmd('receptionist','business_staff_write',['p_id'=>$ids['staff'],'p_version'=>1,'p_name'=>'Forbidden identity edit','p_email'=>'','p_phone'=>'','p_active'=>true],null,'preview',true);
  cmd('receptionist','visit.execute',['id'=>$ids['booking'],'version'=>1,'status'=>'In Progress'],null,'preview',true);cmd('worker','visit.execute',['id'=>$ids['unassigned'],'version'=>1,'status'=>'In Progress'],null,'preview',true);
  cmd('worker','availability.request',['id'=>$ids['availability'],'starts_at'=>gmdate('c',time()+86400),'ends_at'=>gmdate('c',time()+90000)]);
  cmd('worker','visit.execute',['id'=>$ids['booking'],'version'=>1,'status'=>'In Progress']);cmd('worker','visit.execute',['id'=>$ids['booking'],'version'=>2,'status'=>'Completed']);cmd('manager','terminal.correct',['id'=>$ids['booking'],'version'=>3,'status'=>'Scheduled','reason'=>'Synthetic acceptance correction']);
  cmd('manager','business_staff_assign',['p_booking'=>$ids['booking'],'p_version'=>1,'p_staff'=>[]]);check(readx('worker','visits')===[],'unassignment_immediate');cmd('worker','visit.execute',['id'=>$ids['booking'],'version'=>4,'status'=>'In Progress'],null,'preview',true);cmd('manager','business_staff_assign',['p_booking'=>$ids['booking'],'p_version'=>2,'p_staff'=>[$ids['staff']]]);
  cmd('manager','business_staff_write',['p_id'=>$ids['staff'],'p_version'=>1,'p_name'=>'Synthetic SC04 worker','p_email'=>'sensitive-staff@example.test','p_phone'=>'','p_active'=>false]);check(readx('worker','visits')===[],'inactive_staff_immediate');cmd('manager','business_staff_write',['p_id'=>$ids['staff'],'p_version'=>2,'p_name'=>'Synthetic SC04 worker','p_email'=>'sensitive-staff@example.test','p_phone'=>'','p_active'=>true]);check(count(readx('worker','visits'))===1,'worker_access_restored_after_reassignment');
 }elseif($phase==='revoke'){
  foreach(['manager','receptionist','worker'] as $role){rpc('owner_a','business_membership_revoke',['p_business'=>$a,'p_environment'=>'preview','p_user'=>$f[$role]['id']],$a);readx($role,'bookings',null,null,'preview',true);cmd($role,'business_customer_search',['p_search'=>'','p_page'=>1],null,'preview',true);}
  rpc('owner_b','business_membership_revoke',['p_business'=>$b,'p_environment'=>'preview','p_user'=>$f['manager']['id']],$b);readx('manager','customers',null,$b,'preview',true);
 }else throw new RuntimeException('Unknown phase');
 if($phase==='setup')$state['_setup_complete']=true;
 file_put_contents($stateFile,json_encode($state),LOCK_EX);chmod($stateFile,0600);
 $out=['status'=>'PASS','phase'=>$phase,'checks'=>count($report),'results'=>$report,'synthetic_only'=>true,'secrets_printed'=>false];
 file_put_contents($private.'/sc04-result-'.$phase.'.json',json_encode($out),LOCK_EX);chmod($private.'/sc04-result-'.$phase.'.json',0600);
 echo json_encode(['status'=>'PASS','phase'=>$phase,'checks'=>count($report),'synthetic_only'=>true,'secrets_printed'=>false])."\n";
}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
