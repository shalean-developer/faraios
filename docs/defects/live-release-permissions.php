<?php
// Read-only live RPC verification using registered, revoked synthetic fixture identities.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';$releaseDir=$private.'/live-d0106-20261116';
try{
 $helper=$private.'/defect-preview-20261116/acceptance.php';$src=file_get_contents($helper);if(hash('sha256',$src)!=='ac894f7456eeafab9e1270dbed5adf0b8cd31fa5d2e5b13f07fe65f629154a89')throw new RuntimeException('Helper drift');eval(substr($src,5,strpos($src,'try{')-5));$_SERVER['SCRIPT_NAME']='/account/index.php';$c=require $private.'/config.php';$f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true);$a='2f16e658-e031-4c4a-930a-2731ec1d1492';
 foreach(['manager','receptionist','worker']as $role){[$s,$auth]=hx(null,'/auth/v1/token?grant_type=password',['email'=>$f[$role]['email'],'password'=>$f[$role]['password']]);ck($s===200&&($auth['user']['id']??'')===$f[$role]['id'],'valid_auth:'.$role);$state[$role]=['token'=>$auth['access_token']];
  [$status,$body]=hx($role,'/rest/v1/rpc/business_delegate_page',['p_business'=>$a,'p_environment'=>'preview','p_resource'=>$role==='worker'?'visits':'customers','p_page'=>1,'p_size'=>10],$a);ck($status===403&&($body['code']??'')==='42501','canonical_page_revoked:'.$role);
  [$status,$body]=hx($role,'/rest/v1/rpc/business_delegate_command',['p_business'=>$a,'p_environment'=>'preview','p_operation'=>'business_customer_search','p_arguments'=>['p_query'=>'Synthetic release denial']],$a);ck($status===403&&($body['code']??'')==='42501','canonical_command_revoked:'.$role);
  [$status,$contexts]=hx($role,'/rest/v1/rpc/business_contexts',['p_discovery'=>true]);ck($status===200&&count(array_filter($contexts,fn($r)=>$r['business_id']===$a&&$r['environment']==='preview'))===0,'closed_context:'.$role);
 }
 [$status,$body]=hx(null,'/rest/v1/rpc/business_delegate_page',['p_business'=>$a,'p_environment'=>'preview','p_resource'=>'customers','p_page'=>1,'p_size'=>10],$a);ck(in_array($status,[401,403],true)&&($body['code']??'')==='42501','canonical_page_anonymous_denied');
 [$s,$auth]=hx(null,'/auth/v1/token?grant_type=password',['email'=>$f['owner_a']['email'],'password'=>$f['owner_a']['password']]);ck($s===200&&($auth['user']['id']??'')===$f['owner_a']['id'],'owner_auth');$state['owner_a']=['token'=>$auth['access_token']];[$s,$rows]=hx('owner_a','/rest/v1/business_customers?id=eq.00000000-0000-4000-8000-000000000126&business_id=eq.'.$a.'&environment=eq.preview&select=id,version',null,$a);ck($s===200&&count($rows)===1&&$rows[0]['version']===2,'owner_scoped_read_preserved');
 $result=['status'=>'PASS','checks'=>count($checks),'results'=>$checks,'canonical_rpcs_available'=>true,'new_membership_or_business_writes'=>false,'at'=>gmdate('c')];putj($releaseDir.'/permissions.json',$result);echo json_encode(['release_permissions'=>'PASS','checks'=>count($checks),'canonical_rpcs_available'=>true,'revoked_and_anonymous_denied'=>true,'owner_scoped_read_preserved'=>true,'business_writes'=>false]);
}catch(Throwable $e){echo json_encode(['status'=>'STOP','error'=>$e->getMessage()]);exit(1);}
