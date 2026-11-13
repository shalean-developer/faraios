<?php
declare(strict_types=1);
class AccountSessionExpired extends RuntimeException {}
function cfg(): array {
 static $c; if ($c !== null) return $c;
 $dir=getenv('FARAIOS_ACCOUNT_DIR') ?: '/var/www/vhosts/shalean.com/private/faraios-account';
 $c=is_file($dir.'/config.php') ? require $dir.'/config.php' : [];
 if (!is_array($c) || !($c['enabled']??false)) throw new RuntimeException('Account setup is not available yet. Please try again later.');
 $test=($c['environment']??'')==='test';
 if (!$test && (($c['supabase_url']??'')!=='https://rxelmugnucfajrqmphhe.supabase.co' || !str_starts_with($c['base_url']??'', 'https://www.faraios.com'))) throw new RuntimeException('Account configuration is unavailable.');
 if (!$test && !str_starts_with($_SERVER['SCRIPT_NAME']??'', (parse_url($c['base_url'],PHP_URL_PATH)?:'').'/account/')) throw new RuntimeException('Account configuration is unavailable.');
 if (empty($c['publishable_key'])) throw new RuntimeException('Account configuration is unavailable.');
 return $c;
}
function esc(string $s): string {return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function start(): void {
 $c=cfg(); $secure=($c['environment']??'')!=='test';
 header('Cache-Control: no-store'); header('Referrer-Policy: same-origin');header('X-Content-Type-Options: nosniff');header('X-Robots-Tag: noindex, nofollow');
 header("Content-Security-Policy: default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
 ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1');
 session_name('faraios_account_'.substr(hash('sha256',$c['base_url']),0,12));
 session_set_cookie_params(['lifetime'=>0,'path'=>(parse_url($c['base_url'],PHP_URL_PATH)?:'').'/account/','secure'=>$secure,'httponly'=>true,'samesite'=>'Lax']);
 if (!session_start()) throw new RuntimeException('Secure session storage is unavailable. Please try again later.'); $_SESSION['csrf']??=bin2hex(random_bytes(32));
 if (isset($_SESSION['touched']) && time()-$_SESSION['touched']>1800) {$_SESSION=['csrf'=>bin2hex(random_bytes(32))];session_regenerate_id(true);}
 $_SESSION['touched']=time();
}
function api(string $path,array $body=[],string $method='POST',?string $token=null): array {
 $c=cfg(); $headers=['apikey: '.$c['publishable_key'],'Content-Type: application/json','Accept: application/json','Prefer: return=representation'];
 if ($token) $headers[]='Authorization: Bearer '.$token;
 $opts=['http'=>['method'=>$method,'header'=>implode("\r\n",$headers),'ignore_errors'=>true,'timeout'=>15,'follow_location'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]];
 if ($method!=='GET') $opts['http']['content']=json_encode($body,JSON_THROW_ON_ERROR);
 $raw=@file_get_contents($c['supabase_url'].$path,false,stream_context_create($opts));
 preg_match('/\s(\d{3})\s/',$http_response_header[0]??'', $m); $status=(int)($m[1]??0);
 $data=json_decode($raw?:'{}',true); if(!is_array($data)) $data=[];
 if ($status<200||$status>=300) {
  if (str_starts_with($path,'/rest/v1/rpc/business_services_') && ($data['message']??'')==='Services changed. Reload before saving or publishing.') throw new RuntimeException($data['message']);
  if (str_starts_with($path,'/rest/v1/rpc/business_profile_')) {
   if (($data['code']??'')==='23505') throw new RuntimeException('This page address is already taken. Choose another address, or reload if you already saved a draft.');
   $safe=['Draft changed. Reload before saving or publishing.','Add a description, service areas and at least one public contact before publishing.','Complete business country and time zone first.'];
   if (in_array($data['message']??'', $safe,true)) throw new RuntimeException($data['message']);
  }
  if (($token && $status===401) || (str_starts_with($path,'/auth/v1/token?grant_type=refresh_token') && in_array($status,[400,401,403],true))) throw new AccountSessionExpired('Your session has expired. Please sign in again.');
  $code=(string)($data['error_code']??$data['code']??'');
  if (in_array($code,['invalid_credentials','invalid_login_credentials'],true)) throw new RuntimeException('Your email or password is incorrect. Try again or reset your password.');
  if ($code==='email_not_confirmed') throw new RuntimeException('Verify your email before signing in. You can request another verification email below.');
  if (str_starts_with($path,'/auth/v1/verify') && in_array($status,[400,401,403,422],true)) throw new RuntimeException('This email link is invalid, expired or already used. Request a new verification or password reset email.');
  if($status===429) throw new RuntimeException('Too many attempts. Please wait a few minutes and try again.');
  if($status===400||$status===401||$status===403||$status===422) throw new RuntimeException('Please check your details. For sign-in, verify your email first or reset your password. Email links may have expired; request a new one.');
  throw new RuntimeException('We could not connect right now. Please try again.');
 }
 return $data;
}
function csrf(): void {
 $c=cfg();$origin=parse_url($c['base_url'],PHP_URL_SCHEME).'://'.parse_url($c['base_url'],PHP_URL_HOST);$port=parse_url($c['base_url'],PHP_URL_PORT);if($port)$origin.=':'.$port;
 if (!hash_equals($_SESSION['csrf'],(string)($_POST['csrf']??'')) || (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN']!==$origin)) throw new RuntimeException('This form has expired. Reload the page and try again.');
 if((int)($_SERVER['CONTENT_LENGTH']??0)>8192) throw new RuntimeException('This form is too large.');
}
function email(): string {$e=strtolower(trim((string)($_POST['email']??'')));if(strlen($e)>254||!filter_var($e,FILTER_VALIDATE_EMAIL))throw new RuntimeException('Enter a valid email address.');return $e;}
function password(): string {$p=(string)($_POST['password']??'');if(strlen($p)<12||strlen($p)>128)throw new RuntimeException('Use a password between 12 and 128 characters.');return $p;}
function field(string $key,int $max): string {$v=trim((string)($_POST[$key]??''));if(!preg_match('/\A.{2,'.$max.'}\z/us',$v)||preg_match('/[\x00-\x1f\x7f]/u',$v))throw new RuntimeException('Enter a valid '.str_replace('_',' ',$key).'.');return $v;}
function store_session(array $s): void {if(empty($s['access_token'])||empty($s['refresh_token']))throw new RuntimeException('Please verify your email before signing in.');session_regenerate_id(true);$_SESSION['auth']=$s;$_SESSION['csrf']=bin2hex(random_bytes(32));}
function user(): array {
 if(empty($_SESSION['auth'])) {go('signin');}
 $s=$_SESSION['auth'];
 if((int)($s['expires_at']??0)<time()+60) { $s=api('/auth/v1/token?grant_type=refresh_token',['refresh_token'=>$s['refresh_token']]);$s['expires_at']=time()+(int)($s['expires_in']??3600);$_SESSION['auth']=$s; }
 $u=api('/auth/v1/user',[],'GET',$s['access_token']);
 if(empty($u['email_confirmed_at']))throw new RuntimeException('Verify your email before continuing.');
 return $u;
}
function business(): ?array {$b=api('/rest/v1/businesses?select=id,name,business_type,country,time_zone&limit=1',[],'GET',$_SESSION['auth']['access_token']);return $b[0]??null;}
function go(string $p): never {header('Location: index.php?page='.$p,true,303);exit;}
function form_start(): void {echo '<form method="post"><input type="hidden" name="csrf" value="'.esc($_SESSION['csrf']).'">';}
function input(string $name,string $label,string $type='text',string $auto='',int $max=120): void {echo '<label for="'.$name.'">'.$label.'</label><div class="input-row"><input id="'.$name.'" name="'.$name.'" type="'.$type.'" autocomplete="'.$auto.'" maxlength="'.$max.'" required'.($type==='password'?' minlength="12"':'').' value="'.($type==='password'?'':esc((string)($_POST[$name]??''))).'">'.($type==='password'?'<button class="show" type="button" aria-controls="'.$name.'" aria-pressed="false">Show</button>':'').'</div>';}

function regions(): array {static $data; return $data ??= json_decode(file_get_contents(__DIR__.'/regions.json'),true,512,JSON_THROW_ON_ERROR);}
function location_details(): array {
 $country=(string)($_POST['country']??'');$zone=(string)($_POST['time_zone']??'');
 if(!isset(regions()['countries'][$country]))throw new RuntimeException('Choose your country.');
 if(!in_array($zone,regions()['time_zones'],true))throw new RuntimeException('Choose a valid time zone.');
 return ['country'=>$country,'time_zone'=>$zone];
}
function setup_complete(array $b): bool {return isset(regions()['countries'][$b['country']??'']) && in_array($b['time_zone']??'',regions()['time_zones'],true);}
function location_fields(?array $b): void {
 $country=(string)($_POST['country']??$b['country']??'');$zone=(string)($_POST['time_zone']??$b['time_zone']??'');
 echo '<label for="country">Country</label><select id="country" name="country" autocomplete="country" required><option value="">Choose your country</option>';
 foreach(regions()['countries'] as $key=>$label)echo '<option value="'.esc($key).'" data-zones="'.esc(implode(' ',regions()['country_zones'][$key]??[])).'"'.($country===$key?' selected':'').'>'.esc($label).'</option>';
 echo '</select><label for="time_zone">Time zone</label><select id="time_zone" name="time_zone" required><option value="">Choose your time zone</option>';
 foreach(regions()['time_zones'] as $key)echo '<option value="'.esc($key).'"'.($zone===$key?' selected':'').'>'.esc(str_replace('_',' ',$key)).'</option>';
 echo '</select><small>We suggest a time zone when you choose a country. Check it before saving.</small>';
}
