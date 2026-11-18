<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(404);exit;}
require_once __DIR__.'/platform-directory.php';
final class PlatformOverview {
 public function __construct(private readonly Closure $identity,private readonly Closure $settings,private readonly Closure $reader,private readonly Closure $clock){}
 public function read(string $method,array $query):array{
  try{$id=($this->identity)();$settings=($this->settings)();}catch(Throwable $e){throw new PlatformDirectoryError(401,'Sign in again to continue.');}
  if(!is_array($id)||!is_array($settings)||!platform_authorized($id,$settings))throw new PlatformDirectoryError(403,'Platform owner access required.');
  if($method!=='GET')throw new PlatformDirectoryError(405,'This overview is read-only.');
  if($query!==[])throw new PlatformDirectoryError(400,'Check the overview address.');
  try{return self::project(($this->reader)(),($this->clock)());}catch(Throwable $e){throw new PlatformDirectoryError(503,'Overview data is unavailable or out of date. Try again later.');}
 }
 public static function project(mixed $data,int $now):array{
  if(!is_array($data)||!is_string($data['observed_at']??null)||!preg_match('/\A\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\z/D',$data['observed_at']))throw new RuntimeException('Invalid snapshot');
  $date=new DateTimeImmutable($data['observed_at']);if(DateTimeImmutable::getLastErrors()!==false||$now-$date->getTimestamp()>300||$date->getTimestamp()-$now>30)throw new RuntimeException('Stale snapshot');
  $out=['observed_at'=>$data['observed_at']];
  foreach(['businesses'=>['total','published','draft','in_progress','not_started','unknown'],'users'=>['total','verified','unverified','no_business']] as $resource=>$fields){
   foreach(['all','known_test','other'] as $cohort){
    foreach($fields as $field){$n=$data[$resource][$cohort][$field]??null;if(!is_int($n)||$n<0||$n>1000000000)throw new RuntimeException('Invalid count');$out[$resource][$cohort][$field]=$n;}
    $r=$out[$resource][$cohort];
    if(($resource==='businesses'&&array_sum($r)-$r['total']!==$r['total'])||($resource==='users'&&($r['verified']+$r['unverified']!==$r['total']||$r['no_business']>$r['total'])))throw new RuntimeException('Inconsistent total');
   }
   foreach($fields as $field)if($out[$resource]['all'][$field]!==$out[$resource]['known_test'][$field]+$out[$resource]['other'][$field])throw new RuntimeException('Inconsistent cohort');
  }
  return $out;
 }
}
function platform_overview():PlatformOverview{
 return new PlatformOverview(static function():array{require_once __DIR__.'/platform-session.php';start();return user();},static fn():array=>platform_settings(),static function():array{
  require_once __DIR__.'/platform-directory-https.php';
  $f=require __DIR__.'/platform-overview-fixtures.php';
  $args=[];foreach(['businesses','users'] as $r){if(!is_array($f[$r]??null)||count($f[$r])>100)throw new RuntimeException('Invalid fixture registry');foreach($f[$r] as $id)if(!is_string($id)||!preg_match('/\A[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/D',$id))throw new RuntimeException('Invalid fixture');$args['p_test_'.$r]='{'.implode(',',$f[$r]).'}';}
  return platform_directory_https_request($args,cfg(),$_SESSION['auth']['access_token']??'','platform_owner_overview_read');
 },static fn():int=>time());
}
