<?php
require __DIR__.'/../account/platform-overview.php';
$n=0;function ok($b,$m){global $n;if(!$b)throw new Exception($m);$n++;}
function rejects($f,$status){try{$f();}catch(PlatformDirectoryError $e){ok($e->status===$status,'status');return;}throw new Exception('Expected rejection');}
$uid='11111111-1111-4111-8111-111111111111';$now=time();
$d=['observed_at'=>gmdate('Y-m-d\TH:i:s\Z',$now)];
foreach(['businesses'=>['total'=>3,'published'=>1,'draft'=>2,'in_progress'=>0,'not_started'=>0,'unknown'=>0],'users'=>['total'=>3,'verified'=>2,'unverified'=>1,'no_business'=>1]] as $r=>$v){$d[$r]['all']=$v;$d[$r]['known_test']=array_fill_keys(array_keys($v),0);$d[$r]['other']=$v;}
$identity=fn()=>['id'=>$uid,'email_confirmed_at'=>'2026-11-18'];$settings=fn()=>['enabled'=>true,'owner_ids'=>[$uid]];
$make=fn($data)=>new PlatformOverview($identity,$settings,fn()=>$data,fn()=>$now);
$o=$make($d);ok($o->read('GET',[])===$d,'exact projection');
$private=$d;$private['token']='SECRET';$private['users']['all']['email']='private@example.test';ok(!str_contains(json_encode($make($private)->read('GET',[])),'SECRET')&&!str_contains(json_encode($make($private)->read('GET',[])),'private@'),'allowlist');
foreach(['POST','PUT','DELETE'] as $m)rejects(fn()=>$o->read($m,[]),405);
foreach([['q'=>'x'],['business_id'=>$uid],['export'=>'1'],['scope'=>'preview']] as $q)rejects(fn()=>$o->read('GET',$q),400);
foreach(['owner','manager','receptionist','worker'] as $role){$bad=new PlatformOverview(fn()=>['id'=>'22222222-2222-4222-8222-222222222222','email_confirmed_at'=>'2026-11-18','user_metadata'=>['role'=>$role,'platform_owner'=>true]],$settings,fn()=>throw new Exception('Reader must not run'),fn()=>$now);rejects(fn()=>$bad->read('GET',[]),403);}
$expired=new PlatformOverview(fn()=>throw new Exception('SECRET'),$settings,fn()=>$d,fn()=>$now);rejects(fn()=>$expired->read('GET',[]),401);
foreach([null,[],array_replace($d,['observed_at'=>gmdate('Y-m-d\TH:i:s\Z',$now-301)]),array_replace($d,['observed_at'=>gmdate('Y-m-d\TH:i:s\Z',$now+31)]),array_replace($d,['observed_at'=>'2026-02-31T12:00:00Z'])] as $bad)rejects(fn()=>$make($bad)->read('GET',[]),503);
foreach([-1,'3',null,1.5] as $v){$bad=$d;$bad['businesses']['all']['total']=$v;rejects(fn()=>$make($bad)->read('GET',[]),503);}
$bad=$d;$bad['users']['known_test']['total']=1;rejects(fn()=>$make($bad)->read('GET',[]),503);
$bad=$d;$bad['users']['all']['no_business']=4;rejects(fn()=>$make($bad)->read('GET',[]),503);
$empty=$d;foreach(['users','businesses'] as $r)foreach($empty[$r] as &$group)foreach($group as &$v)$v=0;unset($group,$v);ok($make($empty)->read('GET',[])===$empty,'confirmed zero counts');
echo json_encode(['status'=>'PASS','assertions'=>$n,'network_calls'=>0]);
