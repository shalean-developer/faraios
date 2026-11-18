<?php
declare(strict_types=1);
require __DIR__.'/../account/platform-directory.php';
require __DIR__.'/../account/platform-directory-https.php';
$n=0;function yes(bool $v):void{global $n;if(!$v)throw new RuntimeException('Assertion failed');$n++;}
$uid='10000000-0000-4000-8000-000000000001';$calls=0;
$row=['id'=>$uid,'registered_at'=>'2026-11-18T10:00:00+00:00','email_verified'=>true,'business_associations'=>[],'secret'=>'hidden'];
$data=['rows'=>[$row],'observed_at'=>'2026-11-18T10:00:00Z'];
$r=new PlatformDirectoryHttpsReader(function($args)use(&$data,&$calls){$calls++;yes(array_keys($args)===['p_resource','p_page','p_search']);return $data;},['countries'=>[],'time_zones'=>[]]);
$d=new PlatformDirectory(fn()=>['id'=>$uid,'email_confirmed_at'=>'yes'],fn()=>['enabled'=>true,'owner_ids'=>[$uid]],Closure::fromCallable($r));
yes(!str_contains(json_encode($d->read('GET','users',[])),'hidden'));
foreach([['rows'=>array_fill(0,27,$row)],['rows'=>'bad'],['rows'=>[['id'=>'bad']]],['rows'=>[$row],'observed_at'=>'bad']]as$bad){$data=$bad;try{$d->read('GET','users',[]);throw new LogicException('accepted malformed');}catch(PlatformDirectoryError $e){yes($e->status===503);}}
foreach([['supabase_url'=>'http://evil','publishable_key'=>'sb_publishable_test'],['supabase_url'=>'https://rxelmugnucfajrqmphhe.supabase.co','publishable_key'=>'service_role_secret']]as$c){try{platform_directory_https_request([],$c,'a.b.c');throw new LogicException('accepted unsafe config');}catch(RuntimeException $e){yes($e->getMessage()==='Directory connection unavailable.');}}
try{platform_directory_https_request([],['supabase_url'=>'https://rxelmugnucfajrqmphhe.supabase.co','publishable_key'=>'sb_publishable_test'],"bad\r\ntoken");throw new LogicException('accepted injected token');}catch(RuntimeException $e){yes(true);}
$blocked=new PlatformDirectory(fn()=>['id'=>$uid],fn()=>['enabled'=>true,'owner_ids'=>[$uid]],Closure::fromCallable($r));$before=$calls;try{$blocked->read('GET','users',[]);}catch(PlatformDirectoryError $e){yes($e->status===403&&$calls===$before);}
echo json_encode(['status'=>'PASS','assertions'=>$n,'network_calls'=>0]).PHP_EOL;
