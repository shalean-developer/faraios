<?php
declare(strict_types=1);
require __DIR__.'/../account/platform-support.php';
$n=0;function ck(bool $v,string $label):void{global $n;if(!$v)throw new RuntimeException($label);$n++;}
$id='11111111-1111-4111-8111-111111111111';$owner=['id'=>$id,'email_confirmed_at'=>'2026-11-18'];$settings=['enabled'=>true,'owner_ids'=>[$id]];
$service=new PlatformSupport(fn()=>$owner,fn()=>$settings);$data=$service->read('GET',[]);
ck($data['case_source']==='unavailable'&&$data['cases']===null&&$data['case_count']===null&&$data['case_checked']===null,'unknown not zero/empty/fresh');
ck($data['email']==='hello@faraios.com'&&$data['timezone']==='Africa/Johannesburg','published route/timezone');
foreach(['manager','receptionist','worker','business-owner'] as $role){$u=['id'=>'22222222-2222-4222-8222-222222222222','email_confirmed_at'=>'2026-11-18','role'=>$role];try{(new PlatformSupport(fn()=>$u,fn()=>$settings))->read('GET',[]);throw new Exception('allowed role');}catch(PlatformDirectoryError $e){ck($e->status===403,'deny business roles');}}
foreach([[],array_merge($owner,['is_anonymous'=>true]),array_merge($owner,['email_confirmed_at'=>null]),['id'=>'22222222-2222-4222-8222-222222222222','email_confirmed_at'=>'2026-11-18','email'=>'owner@faraios.com']] as $u){try{(new PlatformSupport(fn()=>$u,fn()=>$settings))->read('GET',[]);throw new Exception('identity allowed');}catch(PlatformDirectoryError $e){ck($e->status===403,'deny invalid identity/email impersonation');}}
foreach([['enabled'=>false,'owner_ids'=>[$id]],['enabled'=>true,'owner_ids'=>[]]] as $p){try{(new PlatformSupport(fn()=>$owner,fn()=>$p))->read('GET',[]);throw new Exception('revoked allowed');}catch(PlatformDirectoryError $e){ck($e->status===403,'disabled/revoked denied');}}
foreach(['POST','PUT','DELETE','PATCH'] as $method){try{$service->read($method,[]);throw new Exception('write allowed');}catch(PlatformDirectoryError $e){ck($e->status===405,'write denied');}}
foreach([['case'=>'private'],['url'=>'https://evil.example'],['q'=>[]]] as $q){try{$service->read('GET',$q);throw new Exception('query allowed');}catch(PlatformDirectoryError $e){ck($e->status===400,'unsupported query denied');}}
try{(new PlatformSupport(fn()=>throw new Exception('credential secret'),fn()=>$settings))->read('GET',[]);throw new Exception('expired allowed');}catch(PlatformDirectoryError $e){ck($e->status===401&&!str_contains($e->getMessage(),'secret'),'expired/redacted');}
$u=$owner+['email'=>'private@example.test','access_token'=>'secret','customer_notes'=>'sensitive'];$out=(new PlatformSupport(fn()=>$u,fn()=>$settings))->read('GET',[]);ck(!str_contains(json_encode($out),'private@example')&&!str_contains(json_encode($out),'secret')&&!str_contains(json_encode($out),'sensitive'),'sensitive identity fields excluded');
require __DIR__.'/../account/platform-navigation.php';$nav=platform_workspace_navigation('support',true);ck(str_contains($nav,'platform-support-page.php" aria-current="page"'),'active support');ck(substr_count($nav,' open')===1,'one nav group expanded');
$source=file_get_contents(__DIR__.'/../account/platform-support-page.php');ck(str_contains($source,'Case status unavailable')&&str_contains($source,'Sources and freshness'),'unavailable/freshness rendering');
echo "$n support assertions passed\n";
