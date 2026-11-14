<?php
// Isolated PHP submission contract: transport captured, no database or provider writes.
declare(strict_types=1);
require dirname(__DIR__).'/account/requests-core.php';
function mb_len(string $s): int {return preg_match_all('/./us',$s);}
function cfg(): array{return ['base_url'=>'http://localhost'];}
function profile_env(): string{return 'preview';}
function enquiry_text(string $key,int $min,int $max): string {$v=$_POST[$key]??'';if(!is_string($v)||mb_len(trim($v))<$min||mb_len(trim($v))>$max)throw new RuntimeException('Check '.$key);return trim($v);}
function enquiry_ticket(string $key): array {return $GLOBALS['ticket'];}
function enquiry_ip_limit(): void {}
function api(string $path,array $data): array {
 if(($GLOBALS['mode']??'')!=='good')throw new RuntimeException('Invalid request reached transport');
 if($data['p_requirements']!=="Service area: Claremont\n\nPlease clean the home.")throw new RuntimeException('Area not saved with request');
 if($data['p_service_snapshot']!==$GLOBALS['service'])throw new RuntimeException('Service snapshot changed');
 echo "PASS configured area preserved; snapshot unchanged\n";exit(0);
}
$mode=$argv[1]??'good';$GLOBALS['mode']=$mode;
$areas=request_areas("Claremont · Newlands · Rondebosch\nCape Town’s Southern Suburbs");
if($areas!==['Claremont','Newlands','Rondebosch','Cape Town’s Southern Suburbs'])throw new RuntimeException('Area splitting failed');
$service=['id'=>str_repeat('1',32),'name'=>'Standard','visible'=>true,'archived'=>false];
$snapshot=['services'=>['currency'=>'ZAR','items'=>[$service]],'zone'=>'Africa/Johannesburg','areas'=>$areas];
$row=['document'=>['areas'=>"Claremont · Newlands · Rondebosch\nCape Town’s Southern Suburbs"]];
if($mode==='stale')$snapshot['areas']=['Old area'];
$GLOBALS['service']=$service;$GLOBALS['ticket']=['snapshot'=>$snapshot,'csrf'=>'test','time'=>time()-3,'request'=>'11111111-1111-4111-8111-111111111111'];
$_POST=['csrf'=>'test','snapshot_hash'=>hash('sha256',json_encode($snapshot,JSON_THROW_ON_ERROR)),'website'=>'','service'=>str_repeat('1',32),'name'=>'Fictional Area Test','email'=>'area@example.test','phone'=>'','requirements'=>'Please clean the home.','address'=>'123 Fictional Road','unit'=>'','date'=>'2090-01-01','time'=>'10:00','service_area'=>'Claremont'];
if($mode==='bad')$_POST['service_area']='Unknown area';
if($mode==='long')$_POST['requirements']=str_repeat('x',1990);
try{request_submit('fictional-area-test',$row);throw new RuntimeException('Missing submission result');}
catch(RuntimeException $e){$expected=['bad'=>'Choose a configured service area.','stale'=>'Service areas changed. Reload before submitting.','long'=>'Shorten your requirements to fit the selected service area.'];if(($expected[$mode]??null)!==$e->getMessage())throw $e;echo 'PASS '.$mode." rejection\n";}
