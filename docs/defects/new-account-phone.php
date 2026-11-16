<?php
// CLI-only one-use synthetic invitation preparation. No live configuration changes.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';$dir=$private.'/new-account-phone-20261116';
try{
 if(!is_dir($dir)){mkdir($dir,0700,true);}chmod($dir,0700);
 if(file_exists($dir.'/attempt.json')||file_exists($dir.'/phone-invitation.json'))throw new RuntimeException('Invitation already prepared; inspect instead of replay');
 $helper=$private.'/defect-preview-20261116/acceptance.php';if(hash_file('sha256',$helper)!=='ac894f7456eeafab9e1270dbed5adf0b8cd31fa5d2e5b13f07fe65f629154a89')throw new RuntimeException('Helper drift');$source=file_get_contents($helper);eval(substr($source,5,strpos($source,'try{')-5));
 $dir=$private.'/new-account-phone-20261116';$_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$c=require $private.'/config.php';$f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true);$a='2f16e658-e031-4c4a-930a-2731ec1d1492';ck($f['_business_a']===$a&&$f['owner_a']['id']==='8a68ef34-a924-4035-be53-6af84b8fe1f9','registered_owner');
 [$s,$auth]=hx(null,'/auth/v1/token?grant_type=password',['email'=>$f['owner_a']['email'],'password'=>$f['owner_a']['password']]);ck($s===200&&($auth['user']['id']??'')===$f['owner_a']['id'],'owner_auth');$state['owner_a']=['token'=>$auth['access_token']];
 $members=rpc('owner_a','business_access_list',['p_business'=>$a,'p_environment'=>'preview']);foreach($members['members'] as $m)ck(!$m['active']||$m['role']==='owner','delegates_closed');
 $existing=rpc('owner_a','business_staff_invite_list',['p_business'=>$a,'p_environment'=>'preview']);foreach($existing as $i)ck(($i['status']??'Pending')!=='Pending','no_pending_invitation');
 [$s,$rows]=hx('owner_a','/rest/v1/business_staff?business_id=eq.'.$a.'&environment=eq.preview&email=eq.faraic3%40gmail.com&select=id',null,$a);ck($s===200&&count($rows)===0,'new_profile');
 $sid=uuid();putj($dir.'/attempt.json',['staff'=>$sid,'business'=>$a,'environment'=>'preview','recipient'=>'faraic3@gmail.com','at'=>gmdate('c')]);
 rpc('owner_a','business_staff_write',['p_business'=>$a,'p_environment'=>'preview','p_id'=>$sid,'p_version'=>0,'p_name'=>'Synthetic new-account phone worker','p_email'=>'faraic3@gmail.com','p_phone'=>'','p_active'=>true]);
 $mail=require '/var/www/vhosts/shalean.com/private/faraios-staff-invite/worker.php';$token=bin2hex(random_bytes(32));$sealed=base64_encode(sodium_crypto_box_seal($token,hex2bin($mail['public_key'])));$i=rpc('owner_a','business_staff_invite',['p_business'=>$a,'p_environment'=>'preview','p_staff'=>$sid,'p_role'=>'worker','p_hash'=>hash('sha256',$token),'p_sealed'=>$sealed,'p_replace'=>null]);
 putj($dir.'/phone-invitation.json',['status'=>'prepared','id'=>$i['id'],'business'=>$a,'environment'=>'preview','staff'=>$sid,'recipient'=>'faraic3@gmail.com','role'=>'worker','mail_sent'=>false,'at'=>gmdate('c')]);echo json_encode(['status'=>'PASS','phone_invitation_prepared'=>true,'id'=>$i['id'],'worker_membership_not_activated'=>true,'mail_sent'=>false]);
}catch(Throwable $e){fwrite(STDERR,json_encode(['status'=>'STOP','error'=>$e->getMessage()])."\n");exit(1);}
