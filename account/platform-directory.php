<?php
declare(strict_types=1);
// Include-only foundation. No route, configuration load or database connection on include.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__.'/platform-core.php';

final class PlatformDirectoryError extends RuntimeException {
 public function __construct(public readonly int $status, string $message) { parent::__construct($message); }
}
final class PlatformDirectory {
 // Callbacks are server wiring, never values supplied by a request.
 public function __construct(private readonly Closure $identity, private readonly Closure $settings, private readonly Closure $reader) {}
 public function read(string $method, string $resource, array $query): array {
  try { $identity=($this->identity)(); $settings=($this->settings)(); }
  catch (Throwable $e) { throw new PlatformDirectoryError(401,'Sign in again to continue.'); }
  if (!is_array($identity)||!is_array($settings)||!platform_authorized($identity,$settings)) {
   throw new PlatformDirectoryError(403,'Platform owner access required.');
  }
  if ($method!=='GET') throw new PlatformDirectoryError(405,'This directory is read-only.');
  if (!in_array($resource,['businesses','users'],true)) throw new PlatformDirectoryError(404,'Page unavailable.');
  $request=self::query($query);
  try { $data=($this->reader)($resource,$request); }
  catch (Throwable $e) { throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.'); }
  return self::page($resource,$request,$data);
 }
 public static function query(array $q): array {
  if (array_diff(array_keys($q),['page','q'])) throw new PlatformDirectoryError(400,'Check the directory filters.');
  $page=$q['page']??'1'; $search=$q['q']??'';
  if (!is_string($page)||!preg_match('/\A[1-9][0-9]{0,3}\z/D',$page)||!is_string($search)||strlen($search)>100||!preg_match('//u',$search)||preg_match('/[\x00-\x1f\x7f]/',$search)) {
   throw new PlatformDirectoryError(400,'Check the directory filters.');
  }
  return ['page'=>(int)$page,'limit'=>25,'offset'=>((int)$page-1)*25,'q'=>trim($search),'environment'=>'live'];
 }
 private static function text(mixed $v,int $max): string {
  if (!is_string($v)||strlen($v)>$max||!preg_match('//u',$v)||preg_match('/[\x00-\x1f\x7f]/',$v)) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
  return $v;
 }
 private static function uuid(mixed $v): string {
  $v=self::text($v,36);
  if (!preg_match('/\A[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/D',$v)) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
  return $v;
 }
 private static function date(mixed $v): string {
  $v=self::text($v,40);
  // ISO timestamp with explicit offset; never silently use server local time.
  if (!preg_match('/\A\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)\z/D',$v)) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
  try { $d=new DateTimeImmutable($v); } catch(Throwable $e) { throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.'); }
  if (DateTimeImmutable::getLastErrors()!==false) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
  return $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
 }
 private static function fact(mixed $v): ?bool {
  if ($v!==null&&!is_bool($v)) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
  return $v;
 }
 private static function page(string $resource,array $request,mixed $data): array {
  if (!is_array($data)||!is_array($data['rows']??null)||!array_is_list($data['rows'])||count($data['rows'])>25||!is_bool($data['has_more']??null)) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
  $rows=[]; $seen=[];
  foreach($data['rows'] as $r) {
   if (!is_array($r)) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
   $id=self::uuid($r['id']??null);
   if (isset($seen[$id])) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
   $seen[$id]=true;
   $row=['id'=>$id,'registered_at'=>self::date($r['registered_at']??null)];
   if ($resource==='businesses') {
    $row['name']=self::text($r['name']??null,480); // DB permits120 Unicode characters (up to4 UTF-8 bytes each).
    foreach(['location_configured','service_configured','profile_saved','published'] as $fact) $row[$fact]=self::fact($r[$fact]??null);
   } else {
    $row['email_verified']=self::fact($r['email_verified']??null);
    $links=$r['business_associations']??null;
    if ($links!==null) {
     if (!is_array($links)||!array_is_list($links)||count($links)>100) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
     $out=[]; $linkKeys=[];
     foreach($links as $link) {
      if (!is_array($link)||!in_array($link['role']??null,['owner','manager','receptionist','worker'],true)||!is_bool($link['active']??null)) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
      $business=self::uuid($link['business_id']??null); $key=$business.':'.$link['role'];
      if(isset($linkKeys[$key])) throw new PlatformDirectoryError(503,'Directory data is unavailable. Try again later.');
      $linkKeys[$key]=true;
      $out[]=['business_id'=>$business,'role'=>$link['role'],'active'=>$link['active']];
     }
     $links=$out;
    }
    $row['business_associations']=$links;
   }
   $rows[]=$row; // Explicit projection: credentials and extra provider fields cannot escape.
  }
  return ['schema'=>'faraios.owner-directory.v1','environment'=>'live','page'=>$request['page'],'page_size'=>25,'has_more'=>$data['has_more'],'observed_at'=>self::date($data['observed_at']??null),'rows'=>$rows];
 }
}
function platform_directory(): PlatformDirectory {
 return new PlatformDirectory(static function(): array {
  // Production adapter is mandatory. Never silently fall back to preview configuration.
  if (!is_file(__DIR__.'/platform-session.php')) throw new RuntimeException('Production session adapter unavailable.');
  require_once __DIR__.'/platform-session.php';
  start(); return user(); // Existing user() performs managed Auth verification per request.
 },static fn():array=>platform_settings(),static function(string $resource,array $query):array {
  if ((platform_settings()['directory_transport']??'https')==='https') {
   require_once __DIR__.'/platform-directory-https.php';
   return (platform_directory_https_reader())($resource,$query);
  }
  require_once __DIR__.'/platform-directory-reader.php';
  return (platform_directory_reader())($resource,$query);
 });
}
function platform_directory_headers(): void {
 header('Cache-Control: no-store'); header('X-Robots-Tag: noindex, nofollow');
 header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: same-origin');
}
function platform_directory_escape(string $value): string { return htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
function platform_directory_navigation(array $enabled=[]): string {
 // Enable links only after the corresponding page has passed acceptance.
 $html='';
 foreach(['businesses'=>'Businesses','users'=>'Users'] as $key=>$label) {
  if (($enabled[$key]??false)!==true) continue;
  $html.='<a href="platform-directory-page.php?view='.$key.'">'.$label.'</a>';
 }
 return $html===''?'':'<details class="nav-group" open><summary>Platform</summary><div class="nav-children">'.$html.'</div></details>';
}
