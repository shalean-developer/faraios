<?php
declare(strict_types=1);
require __DIR__.'/../account/platform-seo.php';
$n=0;function ck(bool $v,string $label):void{global $n;if(!$v)throw new RuntimeException($label);$n++;}
$id='11111111-1111-4111-8111-111111111111';$owner=['id'=>$id,'email_confirmed_at'=>'2026-11-18'];$settings=['enabled'=>true,'owner_ids'=>[$id]];
function row(int $num):array{return ['id'=>'TASK-'.str_pad((string)$num,10,'0',STR_PAD_LEFT),'title'=>'SEO-'.sprintf('%02d',$num).': <script>example</script>','summary'=>'Recorded finding','status'=>'In progress','checks'=>[['done'=>true],['done'=>false]],'evidence_note'=>'Source dated16 Nov; no live scan','evidence_url'=>'https://example.com/source','updated_at'=>'2026-11-18T18:00:00+00:00'];}
$store=['schema'=>1,'revision'=>3,'tasks'=>[row(1),row(6),row(8)],'history'=>[]];$reads=0;
$reader=function()use(&$reads,$store){$reads++;return $store;};$service=new PlatformSeo(fn()=>$owner,fn()=>$settings,$reader);
$d=$service->read('GET',[]);ck(count($d['rows'])===3,'three source records');ck($d['counts']===['site'=>1,'indexing'=>1,'backlinks'=>1],'separate categories');ck($d['revision']===3,'source revision');ck($d['rows'][0]['done']===1&&$d['rows'][0]['total']===2,'actual checks');ck(str_contains(platform_directory_escape($d['rows'][0]['title']),'&lt;script&gt;'),'output escaped');
foreach(['POST','PUT','DELETE'] as $m){$before=$reads;try{$service->read($m,[]);throw new Exception('accepted write');}catch(PlatformDirectoryError $e){ck($e->status===405,'read-only');}ck($reads===$before,'no read on write');}
foreach(['manager','receptionist','worker','business-owner'] as $role){$u=['id'=>'22222222-2222-4222-8222-222222222222','email_confirmed_at'=>'2026-11-18','role'=>$role];$s=new PlatformSeo(fn()=>$u,fn()=>$settings,$reader);$before=$reads;try{$s->read('GET',[]);throw new Exception('allowed role');}catch(PlatformDirectoryError $e){ck($e->status===403,'owner isolation');}ck($reads===$before,'no source access denied');}
foreach([[],array_merge($owner,['is_anonymous'=>true]),array_merge($owner,['email_confirmed_at'=>null])] as $u){try{(new PlatformSeo(fn()=>$u,fn()=>$settings,$reader))->read('GET',[]);throw new Exception('allowed identity');}catch(PlatformDirectoryError $e){ck($e->status===403,'identity denied');}}
foreach([['group'=>[]],['group'=>'bad'],['url'=>'https://evil.example']] as $q){try{$service->read('GET',$q);throw new Exception('bad query allowed');}catch(PlatformDirectoryError $e){ck($e->status===400,'query rejected');}}
ck($service->read('GET',['group'=>'backlinks'])['group']==='backlinks','filter');
$empty=$store;$empty['tasks']=[];ck(PlatformSeo::project($empty)['rows']===[],'empty valid');
$bad=$store;$bad['tasks'][0]['updated_at']='2026-99-99T00:00:00Z';ck(PlatformSeo::project($bad)['rows'][0]['updated']===null,'unknown invalid date');
$bad=$store;$bad['tasks'][0]['evidence_url']='javascript:alert(1)';ck(PlatformSeo::project($bad)['rows'][0]['source']==='','unsafe link excluded');
try{(new PlatformSeo(fn()=>$owner,fn()=>$settings,fn()=>throw new Exception('private secret')))->read('GET',[]);throw new Exception('missing data accepted');}catch(PlatformDirectoryError $e){ck($e->status===503&&!str_contains($e->getMessage(),'secret'),'unavailable sanitized');}
$bad=$store;$bad['tasks'][]=$bad['tasks'][0];try{PlatformSeo::project($bad);throw new Exception('duplicate accepted');}catch(RuntimeException $e){ck($e->getMessage()==='Invalid SEO record','duplicate rejected');}
ck(!str_contains(file_get_contents(__DIR__.'/../account/platform-seo.php'),'platform_save('),'no mutation path');
echo "$n SEO assertions passed\n";
