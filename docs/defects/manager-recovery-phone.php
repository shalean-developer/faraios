<?php
// CLI-only one-use synthetic invitation preparation. No live configuration changes.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';$dir=$private.'/manager-recovery-phone-20261116';
try{
 if(!is_dir($dir)){mkdir($dir,0700,true);}chmod($dir,0700);
 if(file_exists($dir.'/attempt.json')||file_exists($dir.'/phone-invitation.json'))throw new RuntimeException('Invitation already prepared; inspect instead of replay');
 $helper=$private.'/defect-preview-20261116/acceptance.php';if(hash_file('sha256',$helper)!=='ac894f7456eeafab9e1270dbed5adf0b8cd31fa5d2e5b13f07fe65f629154a89')throw new RuntimeException('Helper drift');$source=file_get_contents($helper);eval(substr($source,5,strpos($source,'try{')-5));
 $dir=$private.'/manager-recovery-phone-20261116';$_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$c=require $private.'/config.php';$f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true);$a='2f16e658-e031-4c4a-930a-2731ec1d1492';ck($f['_business_a']===$a&&$f['owner_a']['id']==='8a68ef34-a924-4035-be53-6af84b8fe1f9','registered_owner');
 [$s,$auth]=hx(null,'/auth/v1/token?grant_type=password',['email'=>$f['owner_a']['email'],'password'=>$f['owner_a']['password']]);ck($s===200&&($auth['user']['id']??'')===$f['owner_a']['id'],'owner_auth');$state['owner_a']=['token'=>$auth['access_token']];
 $scope=['p_business'=>$a,'p_environment'=>'preview'];$sid='a56d5621-36bd-419d-b5f1-be288c1799c0';$uid='f356bc93-6d64-4e4e-9004-0b2e0fd8ac51';$customer='00000000-0000-4000-8000-000000000126';
 $members=rpc('owner_a','business_access_list',$scope);$target=array_values(array_filter($members['members'],fn($m)=>$m['user_id']===$uid));ck(count($target)===1&&$target[0]['active']&&$target[0]['role']==='worker','current_worker');
 $existing=rpc('owner_a','business_staff_invite_list',$scope);foreach($existing as $i)ck(($i['status']??'Pending')!=='Pending','no_pending_invitation');
 [$s,$staff]=hx('owner_a','/rest/v1/business_staff?id=eq.'.$sid.'&business_id=eq.'.$a.'&environment=eq.preview&select=id,email,active',null,$a);ck($s===200&&count($staff)===1&&$staff[0]['email']==='faraic3@gmail.com'&&$staff[0]['active'],'existing_synthetic_staff');
 [$s,$rows]=hx('owner_a','/rest/v1/business_customers?id=eq.'.$customer.'&select=id',null,$a);ck($s===200&&count($rows)===0,'customer_absent');
 putj($dir.'/attempt.json',['customer'=>$customer,'staff'=>$sid,'user'=>$uid,'business'=>$a,'environment'=>'preview','recipient'=>'faraic3@gmail.com','at'=>gmdate('c')]);
 rpc('owner_a','business_membership_revoke',$scope+['p_user'=>$uid]);
 rpc('owner_a','business_customer_write',$scope+['p_id'=>$customer,'p_version'=>0,'p_details'=>['name'=>'Synthetic manager recovery check','email'=>'manager-recovery@example.test','phone'=>'','address'=>'Synthetic preview address','notes'=>'Baseline recovery note'],'p_confirm'=>false]);
 $mail=require '/var/www/vhosts/shalean.com/private/faraios-staff-invite/worker.php';$token=bin2hex(random_bytes(32));$sealed=base64_encode(sodium_crypto_box_seal($token,hex2bin($mail['public_key'])));$i=rpc('owner_a','business_staff_invite',['p_business'=>$a,'p_environment'=>'preview','p_staff'=>$sid,'p_role'=>'manager','p_hash'=>hash('sha256',$token),'p_sealed'=>$sealed,'p_replace'=>null]);
 putj($dir.'/phone-invitation.json',['status'=>'prepared','id'=>$i['id'],'business'=>$a,'environment'=>'preview','staff'=>$sid,'recipient'=>'faraic3@gmail.com','role'=>'manager','mail_sent'=>false,'at'=>gmdate('c')]);echo json_encode(['status'=>'PASS','phone_invitation_prepared'=>true,'id'=>$i['id'],'manager_membership_not_activated'=>true,'mail_sent'=>false]);
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','error'=>$e->getMessage()])."\n");exit(1);}
