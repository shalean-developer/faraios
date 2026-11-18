<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(404);exit;}
require_once __DIR__.'/platform-directory.php';
final class PlatformSeo {
 public const GROUPS=['site'=>'Site fixes and audit checks','indexing'=>'Google indexing and processing','backlinks'=>'Backlink review'];
 public function __construct(private readonly Closure $identity,private readonly Closure $settings,private readonly Closure $reader){}
 public function read(string $method,array $query):array {
  try{$u=($this->identity)();$p=($this->settings)();}catch(Throwable $e){throw new PlatformDirectoryError(401,'Sign in again to continue.');}
  if(!platform_authorized($u,$p))throw new PlatformDirectoryError(403,'Platform owner access required.');
  if($method!=='GET')throw new PlatformDirectoryError(405,'SEO progress is read-only.');
  if(array_diff(array_keys($query),['group'])||!is_string($query['group']??'all')||!in_array($query['group']??'all',['all',...array_keys(self::GROUPS)],true))throw new PlatformDirectoryError(400,'Choose a valid SEO section.');
  try{$store=($this->reader)();$out=self::project($store);$out['group']=$query['group']??'all';return $out;}catch(Throwable $e){throw new PlatformDirectoryError(503,'Live SEO records are unavailable. Try again later.');}
 }
 public static function project(array $store):array {
  platform_valid_store($store);$rows=[];$seen=[];$counts=array_fill_keys(array_keys(self::GROUPS),0);
  foreach($store['tasks'] as $t){
   if(!is_array($t)||!is_string($t['title']??null)||!preg_match('/\ASEO-(\d+):/',$t['title'],$m))continue;
   if(!is_string($t['id']??null)||!preg_match('/\ATASK-[A-F0-9]{10}\z/D',$t['id'])||isset($seen[$t['id']])||!in_array($t['status']??null,PLATFORM_STATUSES,true)||!is_array($t['checks']??null)||count($t['checks'])>30)throw new RuntimeException('Invalid SEO record');
   foreach(['title'=>160,'summary'=>3000,'evidence_note'=>3000,'evidence_url'=>1000] as $k=>$max)if(!is_string($t[$k]??null)||strlen($t[$k])>$max||!preg_match('//u',$t[$k]))throw new RuntimeException('Invalid SEO text');
   $done=0;foreach($t['checks'] as $c){if(!is_array($c)||!is_bool($c['done']??null))throw new RuntimeException('Invalid acceptance');if($c['done'])$done++;}
   $url=$t['evidence_url'];if($url!==''&&(!filter_var($url,FILTER_VALIDATE_URL)||parse_url($url,PHP_URL_SCHEME)!=='https'||parse_url($url,PHP_URL_USER)!==null||parse_url($url,PHP_URL_PASS)!==null))$url='';
   $at=$t['updated_at']??'';$validDate=is_string($at)&&preg_match('/\A\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)\z/D',$at);if($validDate){try{new DateTimeImmutable($at);$validDate=DateTimeImmutable::getLastErrors()===false;}catch(Throwable $e){$validDate=false;}}
   $group=(int)$m[1]===6?'indexing':((int)$m[1]===8?'backlinks':'site');$seen[$t['id']]=true;$counts[$group]++;
   $rows[]=['id'=>$t['id'],'number'=>(int)$m[1],'title'=>$t['title'],'summary'=>$t['summary'],'status'=>$t['status'],'done'=>$done,'total'=>count($t['checks']),'group'=>$group,'updated'=>$validDate?$at:null,'evidence'=>$t['evidence_note'],'source'=>$url];
  }
  usort($rows,fn($a,$b)=>$a['number']<=>$b['number']);return ['rows'=>$rows,'counts'=>$counts,'revision'=>$store['revision'],'read_at'=>gmdate('c')];
 }
}
function platform_seo():PlatformSeo {
 return new PlatformSeo(static function():array {
  if(!is_file(__DIR__.'/platform-session.php'))throw new RuntimeException('Production session adapter unavailable');
  require_once __DIR__.'/platform-session.php';start();return user();
 },static fn():array=>platform_settings(),static function():array {
  if((cfg()['base_url']??'')!=='https://www.faraios.com')throw new RuntimeException('Live source required');
  $root=realpath(getenv('FARAIOS_ACCOUNT_DIR')?:'/var/www/vhosts/shalean.com/private/faraios-account');if(!$root)throw new RuntimeException('Missing tracker');
  $dir=$root.'/platform-tracker-'.substr(hash('sha256',cfg()['base_url']),0,12);$file=$dir.'/tracker.json';
  if(is_link($dir)||is_link($file)||!is_file($file)||filesize($file)>12000000)throw new RuntimeException('Missing tracker');
  return platform_load($dir);
 });
}
