<?php
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__) {http_response_code(404);exit;}
const VISIT_STORE='/var/www/vhosts/shalean.com/private/faraios-booking-test';
const VISIT_TZ='Africa/Johannesburg';
function visit_db(): PDO {
 static $db;
 if ($db) return $db;
 $db=new PDO('sqlite:'.VISIT_STORE.'/visits.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $db->exec('PRAGMA busy_timeout=5000');
 $db->exec("CREATE TABLE IF NOT EXISTS visits (
 ref TEXT PRIMARY KEY, service TEXT NOT NULL, day TEXT NOT NULL, clock TEXT NOT NULL,
 worker TEXT NOT NULL, lo INTEGER NOT NULL, hi INTEGER NOT NULL, minutes INTEGER NOT NULL,
 cents INTEGER NOT NULL, expires INTEGER NOT NULL, state TEXT NOT NULL,
 provider_id TEXT UNIQUE, checkout TEXT, url TEXT)");
 $db->exec('CREATE INDEX IF NOT EXISTS visit_calendar ON visits(worker,lo,hi)');
 return $db;
}
function visit_stmt(string $sql,array $args=[]): PDOStatement {
 $q=visit_db()->prepare($sql);$q->execute($args);return $q;
}
function visit_record(string $ref): ?array {
 return visit_stmt('SELECT * FROM visits WHERE ref=?',[$ref])->fetch()?:null;
}
function visit_locked(callable $work) {
 $db=visit_db();$db->exec('BEGIN IMMEDIATE');
 try {$out=$work();$db->exec('COMMIT');return $out;}
 catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}
}
function visit_capacity(string $service,string $day,int $minutes): array {
 $token=trim(file_get_contents(VISIT_STORE.'/availability.token'));
 return profile_rpc('shalean_test_capacity',['p_token'=>$token,'p_service'=>$service,'p_date'=>$day,'p_minutes'=>$minutes],true);
}
function visit_bounds(string $day,string $clock,int $minutes,array $cap): array {
 $at=(new DateTimeImmutable($day.' '.$clock,new DateTimeZone(VISIT_TZ)))->getTimestamp();
 return [$at-60*(int)$cap['before'],$at+60*($minutes+(int)$cap['after'])];
}
function visit_free_workers(array $cap,string $day,string $clock,int $minutes): array {
 $workers=$cap['times'][$clock]??[];
 if (!$workers) return [];
 [$lo,$hi]=visit_bounds($day,$clock,$minutes,$cap);
 $used=visit_stmt("SELECT worker FROM visits WHERE lo<? AND hi>? AND
 (state='confirmed' OR (state='held' AND expires>?))",[$hi,$lo,time()])->fetchAll(PDO::FETCH_COLUMN);
 return array_values(array_diff($workers,$used));
}
function visit_times(array $cap,string $day,int $minutes): array {
 $slots=[];
 foreach(array_keys($cap['times']??[]) as $clock)
  if(visit_free_workers($cap,$day,$clock,$minutes))$slots[]=$clock;
 return $slots;
}
function visit_hold(array $draft,array $quote): array {
 $cap=visit_capacity($draft['service'],$draft['date'],$quote['minutes']);
 return visit_locked(function()use($draft,$quote,$cap) {
  $old=visit_record($draft['ref']);
  if($old && ($old['state']==='confirmed'||($old['state']==='held'&&(int)$old['expires']>time())))return $old;
  if($old)throw new RuntimeException('This hold has ended. Choose a time again.');
  $workers=visit_free_workers($cap,$draft['date'],$draft['time'],$quote['minutes']);
  if(!$workers)throw new RuntimeException('That start time is no longer available. Choose another time.');
  [$lo,$hi]=visit_bounds($draft['date'],$draft['time'],$quote['minutes'],$cap);
  $start=$lo+60*(int)$cap['before'];
  visit_stmt("INSERT INTO visits(ref,service,day,clock,worker,lo,hi,minutes,cents,expires,state) VALUES(?,?,?,?,?,?,?,?,?,?,'held')",
   [$draft['ref'],$draft['service'],$draft['date'],$draft['time'],$workers[0],$lo,$hi,$quote['minutes'],$quote['cents'],min(time()+600,$start)]);
  return visit_record($draft['ref']);
 });
}
function visit_key(): string {
 $c=require '/var/www/vhosts/shalean.com/private/faraios-checkout-preview/app/config.php';
 $key=$c['instant_paystack_key']??'';
 if(!is_string($key)||!str_starts_with($key,'sk_test_'))throw new RuntimeException('Test payments are unavailable.');
 return $key;
}
function visit_provider(string $path,?array $body=null): array {
 $ch=curl_init('https://api.paystack.co/transaction/'.$path);
 curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>12,CURLOPT_CONNECTTIMEOUT=>4,
  CURLOPT_HTTPHEADER=>['Authorization: Bearer '.visit_key(),'Content-Type: application/json']]);
 if($body!==null)curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body,JSON_THROW_ON_ERROR)]);
 $raw=curl_exec($ch);$code=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
 $json=json_decode($raw?:'{}',true);
 if($code!==200||($json['status']??false)!==true||!is_array($json['data']??null))throw new RuntimeException('The test payment could not be verified yet. Please retry.');
 return $json['data'];
}
function visit_pay(array $r,string $callback): string {
 return visit_locked(function()use($r,$callback){
  $r=visit_record($r['ref']);
  if(!$r||$r['state']!=='held'||$r['expires']<=time())throw new RuntimeException('This hold has expired. Choose a time again.');
  if($r['url'])return $r['url'];
  $data=visit_provider('initialize',['reference'=>$r['ref'],'amount'=>(int)$r['cents'],'currency'=>'ZAR',
    'email'=>'book05@example.com','callback_url'=>$callback,'metadata'=>['business'=>'shalean-cleaning-services','service'=>$r['service']]]);
  $url=$data['authorization_url']??'';
  if(($data['reference']??'')!==$r['ref']||!preg_match('~^https://checkout\.paystack\.com/[A-Za-z0-9_-]+$~D',$url))throw new RuntimeException('Unable to open test checkout.');
  visit_stmt('UPDATE visits SET url=? WHERE ref=?',[$url,$r['ref']]);return $url;
 });
}
function visit_verify(string $ref): array {
 if(!preg_match('/^fosb-[a-f0-9]{32}$/D',$ref)||!($r=visit_record($ref)))throw new RuntimeException('Unknown test payment.');
 if(in_array($r['state'],['confirmed','reconcile'],true))return $r;
 $d=visit_provider('verify/'.rawurlencode($ref));
 if(($d['domain']??'')!=='test'||($d['status']??'')!=='success'||($d['currency']??'')!=='ZAR'||($d['reference']??'')!==$ref||
    ($d['amount']??null)!==(int)$r['cents']||!is_int($d['id']??null))throw new RuntimeException('A successful test payment has not been verified.');
 $cap=visit_capacity($r['service'],$r['day'],(int)$r['minutes']);
 return visit_locked(function()use($ref,$d,$cap){
  $r=visit_record($ref);if($r['provider_id']!==null)return $r;
  $canConfirm=$r['state']==='held' && (int)$r['expires']>time() && in_array($r['worker'],$cap['times'][$r['clock']]??[],true);
  visit_stmt('UPDATE visits SET state=?,provider_id=? WHERE ref=?',[$canConfirm?'confirmed':'reconcile',(string)$d['id'],$ref]);
  return visit_record($ref);
 });
}

function visit_webhook(): void {
 if ($_SERVER['REQUEST_METHOD']!=='POST') {
  header('Allow: POST');http_response_code(405);return;
 }
 $raw=file_get_contents('php://input',false,null,0,262145);
 if ($raw===false||strlen($raw)>262144) {http_response_code(413);return;}
 try {
  $signature=$_SERVER['HTTP_X_PAYSTACK_SIGNATURE']??'';
  if (!hash_equals(hash_hmac('sha512',$raw,visit_key()),$signature)) {http_response_code(403);return;}
  $event=json_decode($raw,true);
  $ref=$event['data']['reference']??null;
  if (($event['event']??null)==='charge.success' && is_string($ref)
      && preg_match('/^fosb-[a-f0-9]{32}$/D',$ref) && visit_record($ref)) {
   visit_verify($ref);
  }
  http_response_code(200);
 } catch (Throwable $e) {http_response_code(503);}
}
