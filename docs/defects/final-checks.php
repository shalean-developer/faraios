<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$private='/var/www/vhosts/shalean.com/private/faraios-account';$root='/var/www/vhosts/shalean.com/faraios.com';$finalDir=$private.'/final-checks-20261116';
try{
 $manifest=json_decode(file_get_contents($finalDir.'/manifest.json'),true);$files=[];$dependencies=[];
 foreach($manifest['preview']as $p=>$hash){if(hash_file('sha256',$root.'/_accounts-preview/'.$p)!==$hash)throw new RuntimeException('Preview source drift: '.$p);$files[$p]=['preview'=>$hash,'live'=>is_file($root.'/'.$p)?hash_file('sha256',$root.'/'.$p):null];}
 foreach($manifest['dependencies']as $p=>$hash)$dependencies[$p]=['candidate'=>$hash,'preview'=>hash_file('sha256',$root.'/_accounts-preview/'.$p),'live'=>hash_file('sha256',$root.'/'.$p)];
 $original=json_decode(file_get_contents($private.'/defect-preview-20261116/before.json'),true);foreach($original['configuration']as $p=>$hash)if(hash_file('sha256',$private.'/'.$p)!==$hash)throw new RuntimeException('Original private config drift');
 $join=json_decode(file_get_contents($private.'/worker-join-20261116/before.json'),true);foreach($join['configs']as $p=>$hash)if(hash_file('sha256',dirname($private).'/'.$p)!==$hash)throw new RuntimeException('Invitation config drift');
 $src=file_get_contents($private.'/defect-preview-20261116/acceptance.php');if(hash('sha256',$src)!=='ac894f7456eeafab9e1270dbed5adf0b8cd31fa5d2e5b13f07fe65f629154a89')throw new RuntimeException('Helper drift');eval(substr($src,5,strpos($src,'try{')-5));
 $_SERVER['SCRIPT_NAME']='/_accounts-preview/account/index.php';$c=require $private.'/config.php';$f=json_decode(file_get_contents($private.'/sc04-acceptance.json'),true);$a='2f16e658-e031-4c4a-930a-2731ec1d1492';
 foreach(['manager','receptionist','worker']as $role){[$s,$auth]=hx(null,'/auth/v1/token?grant_type=password',['email'=>$f[$role]['email'],'password'=>$f[$role]['password']]);ck($s===200&&($auth['user']['id']??'')===$f[$role]['id'],'valid_auth:'.$role);$state[$role]=['token'=>$auth['access_token']];rpc($role,'business_delegate_page_preview_d0106',['p_business'=>$a,'p_environment'=>'preview','p_resource'=>$role==='worker'?'visits':'customers','p_page'=>1,'p_size'=>10],true);[$status,$contexts]=hx($role,'/rest/v1/rpc/business_contexts',['p_discovery'=>true]);ck($status===200&&count(array_filter($contexts,fn($r)=>$r['business_id']===$a&&$r['environment']==='preview'))===0,'closed_context:'.$role);}
 rpc(null,'business_delegate_page_preview_d0106',['p_business'=>$a,'p_environment'=>'preview','p_resource'=>'customers','p_page'=>1,'p_size'=>10],true);
 $receipt=['status'=>'PASS','checks'=>count($checks),'results'=>$checks,'runtime'=>$files,'dependencies'=>$dependencies,'private_configs_preserved'=>true,'no_business_mutation'=>true,'at'=>gmdate('c')];putj($finalDir.'/hosted-final.json',$receipt);echo json_encode($receipt);
}catch(Throwable $e){echo json_encode(['status'=>'STOP','error'=>$e->getMessage()]);exit(1);}
