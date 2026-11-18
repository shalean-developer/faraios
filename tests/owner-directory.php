<?php
declare(strict_types=1);
require __DIR__.'/../account/platform-directory.php';
$count=0;
function ok(bool $v,string $label):void {global $count;if(!$v)throw new RuntimeException($label);$count++;}
function deny(callable $f,int $status):void {try{$f();}catch(PlatformDirectoryError $e){ok($e->status===$status,'wrong denial');return;}throw new RuntimeException('Expected denial');}
$owner='11111111-1111-4111-8111-111111111111'; $business='22222222-2222-4222-8222-222222222222';
$identity=['id'=>$owner,'email_confirmed_at'=>'2026-11-18','is_anonymous'=>false];
$settings=['enabled'=>true,'owner_ids'=>[$owner]]; $calls=0; $lookups=0;
$row=['id'=>$business,'name'=>'<script>alert(1)</script>','registered_at'=>'2026-11-18T10:00:00+02:00','location_configured'=>true,'service_configured'=>false,'profile_saved'=>true,'published'=>false,'secret'=>'never exposed'];
$data=['rows'=>[$row],'has_more'=>false,'observed_at'=>'2026-11-18T08:00:00Z','provider_token'=>'never exposed'];
$d=new PlatformDirectory(function()use(&$identity,&$lookups){$lookups++;if($identity===null)throw new RuntimeException('expired token secret');return $identity;},function()use(&$settings){return $settings;},function($resource,$q)use(&$calls,&$data){$calls++;ok($q['environment']==='live'&&$q['limit']===25,'fixed scope');return $data;});
$result=$d->read('GET','businesses',[]);
ok($result['rows'][0]['registered_at']==='2026-11-18T08:00:00Z','timezone');
ok(!str_contains(json_encode($result),'secret')&&!str_contains(json_encode($result),'token'),'projection');
ok($result['rows'][0]['published']===false&&$result['rows'][0]['service_configured']===false,'facts independent');
ok(str_contains(platform_directory_escape($row['name']),'&lt;script&gt;'),'html escaped');
$original=$identity;
foreach([[],['id'=>$owner],$original+['role'=>'owner']] as $i=>$bad){if($i===2)$bad['id']=$business;$identity=$bad;$before=$calls;deny(fn()=>$d->read('GET','businesses',[]),403);ok($calls===$before,'denied before read');}
foreach(['owner','manager','receptionist','worker'] as $role){$identity=$original;$identity['id']=$business;$identity['user_metadata']=['role'=>$role,'platform_owner'=>true];deny(fn()=>$d->read('GET','users',[]),403);}
$identity=$original;$identity['is_anonymous']=true;deny(fn()=>$d->read('GET','users',[]),403);
$identity=null;deny(fn()=>$d->read('GET','users',[]),401);$identity=$original;
$settings['enabled']=false;deny(fn()=>$d->read('GET','users',[]),403);$settings['enabled']=true;
$settings['owner_ids']=[];deny(fn()=>$d->read('GET','users',[]),403);$settings['owner_ids']=[$owner];
foreach(['POST','PUT','DELETE','PATCH','HEAD','OPTIONS']as$method)deny(fn()=>$d->read($method,'businesses',[]),405);
deny(fn()=>$d->read('GET','../../config',[]),404);
foreach([['page'=>'0'],['page'=>'-1'],['page'=>'10000'],['page'=>[]],['page'=>1],['q'=>[]],['q'=>str_repeat('a',101)],['q'=>"a\nb"],['q'=>"\xff"],['environment'=>'preview'],['sort'=>'secret'],['export'=>'1']]as$q)deny(fn()=>$d->read('GET','users',$q),400);
ok(PlatformDirectory::query(['page'=>'2','q'=>' a%_ '])===['page'=>2,'limit'=>25,'offset'=>25,'q'=>'a%_','environment'=>'live'],'literal bounded search');
$before=$lookups;$d->read('GET','businesses',[]);$d->read('GET','businesses',[]);ok($lookups===$before+2,'no authorization cache');
$baseline=$data;
foreach([['rows'=>array_fill(0,26,$row)],['rows'=>[$row,$row]],['has_more'=>'false'],['observed_at'=>'2026-02-30T00:00:00Z'],['rows'=>[['id'=>'bad']]],['rows'=>[$row+[]]]]as$i=>$change){if($i===5)$change['rows'][0]['published']='true';$data=array_replace($baseline,$change);deny(fn()=>$d->read('GET','businesses',[]),503);}
$data=$baseline;$data['rows'][0]['published']=null;ok($d->read('GET','businesses',[])['rows'][0]['published']===null,'unknown preserved');
$data=['rows'=>[['id'=>$owner,'registered_at'=>'2026-11-18T08:00:00Z','email_verified'=>false,'email'=>'private@example.invalid','password'=>'secret','business_associations'=>[['business_id'=>$business,'role'=>'worker','active'=>true,'phone'=>'secret']]]],'has_more'=>false,'observed_at'=>'2026-11-18T08:00:00Z'];
$u=$d->read('GET','users',[]);ok(!str_contains(json_encode($u),'secret')&&!str_contains(json_encode($u),'@'),'user allowlist');
$data['rows'][0]['business_associations'][0]['role']='platform_owner';deny(fn()=>$d->read('GET','users',[]),503);
$data['rows'][0]['business_associations']=[];ok($d->read('GET','users',[])['rows'][0]['business_associations']===[],'no business');
$data['rows'][0]['business_associations']=null;ok($d->read('GET','users',[])['rows'][0]['business_associations']===null,'unknown business');
$failure=new PlatformDirectory(fn()=>$original,fn()=>$settings,function(){throw new RuntimeException('secret upstream URL');});
try{$failure->read('GET','users',[]);}catch(PlatformDirectoryError $e){ok($e->status===503&&!str_contains($e->getMessage(),'secret'),'error redacted');}
ok(platform_directory_navigation()==='','no dead links by default');
ok(platform_directory_navigation(['users'=>'true','businesses'=>1])==='','strict enablement');
ok(!str_contains(platform_directory_navigation(['businesses'=>true]),'view=users'),'only accepted links');
ok(!str_contains(platform_directory_navigation(['evil'=>true]),'evil'),'navigation allowlist');
echo json_encode(['status'=>'PASS','assertions'=>$count,'production_reads'=>0,'production_writes'=>0]).PHP_EOL;
