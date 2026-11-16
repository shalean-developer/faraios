<?php
// CLI-only one-use closure of the controlled synthetic preview Manager and new pilot staff.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';$target=$private.'/manager-recovery-phone-20261116';
try{
 $helper=$private.'/defect-preview-20261116/acceptance.php';if(hash_file('sha256',$helper)!=='ac894f7456eeafab9e1270dbed5adf0b8cd31fa5d2e5b13f07fe65f629154a89')throw new RuntimeException('Helper drift');$source=file_get_contents($helper);eval(substr($source,5,strpos($source,'try{')-5));
 $dir=$target;ck(is_file($dir.'/phone-invitation.json')&&!file_exists($dir.'/close-attempt.json'),'prepared_not_bumped');$_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$c=require $private.'/config.php';$f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true);$a='2f16e658-e031-4c4a-930a-2731ec1d1492';ck($f['_business_a']===$a&&$f['owner_a']['id']==='8a68ef34-a924-4035-be53-6af84b8fe1f9','registered_owner');
 [$s,$auth]=hx(null,'/auth/v1/token?grant_type=password',['email'=>$f['owner_a']['email'],'password'=>$f['owner_a']['password']]);ck($s===200&&($auth['user']['id']??'')===$f['owner_a']['id'],'owner_auth');$state['owner_a']=['token'=>$auth['access_token']];$scope=['p_business'=>$a,'p_environment'=>'preview'];$id='00000000-0000-4000-8000-000000000126';
 $uid='f356bc93-6d64-4e4e-9004-0b2e0fd8ac51';$sid='a56d5621-36bd-419d-b5f1-be288c1799c0';
 $members=rpc('owner_a','business_access_list',$scope);$target=array_values(array_filter($members['members'],fn($m)=>$m['user_id']===$uid));ck(count($target)===1&&$target[0]['active']&&$target[0]['role']==='manager','only_controlled_manager');
 [$s,$staff]=hx('owner_a','/rest/v1/business_staff?id=eq.'.$sid.'&business_id=eq.'.$a.'&environment=eq.preview&select=id,name,email,phone,active,version',null,$a);ck($s===200&&count($staff)===1&&$staff[0]['version']===1&&$staff[0]['active']&&$staff[0]['email']==='faraic3@gmail.com','new_pilot_baseline');$r=$staff[0];putj($dir.'/close-attempt.json',['user'=>$uid,'staff'=>$r,'at'=>gmdate('c')]);
 rpc('owner_a','business_membership_revoke',$scope+['p_user'=>$uid]);rpc('owner_a','business_staff_write',$scope+['p_id'=>$sid,'p_version'=>1,'p_name'=>$r['name'],'p_email'=>$r['email'],'p_phone'=>$r['phone'],'p_active'=>false]);putj($dir.'/closed.json',['status'=>'PASS','user'=>$uid,'staff'=>$sid,'pilot_active'=>false,'phone_revocation_pending'=>true,'history_retained'=>true,'at'=>gmdate('c')]);echo json_encode(['status'=>'PASS','synthetic_manager_closed'=>true,'pilot_staff_inactive'=>true,'phone_refresh_pending'=>true]);
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','error'=>$e->getMessage()])."\n");exit(1);}
