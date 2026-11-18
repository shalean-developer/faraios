<?php
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__) {http_response_code(404);exit;}

final class PlatformDirectoryHttpsReader {
 public function __construct(private readonly Closure $request,private readonly array $regions) {}
 public function __invoke(string $resource,array $query):array {
  if (!in_array($resource,['businesses','users'],true) || PlatformDirectory::query(['page'=>(string)($query['page']??''),'q'=>$query['q']??null])!==$query) throw new RuntimeException('Invalid directory scope.');
  $data=($this->request)(['p_resource'=>$resource,'p_page'=>$query['page'],'p_search'=>$query['q']]);
  if (!is_array($data)||!is_array($data['rows']??null)||!array_is_list($data['rows'])||count($data['rows'])>26) throw new RuntimeException('Invalid directory response.');
  $more=count($data['rows'])>25;$rows=array_slice($data['rows'],0,25);
  foreach($rows as &$row) {
   if (!is_array($row)) throw new RuntimeException('Invalid directory response.');
   if ($resource==='businesses') {
    $row['location_configured']=isset($this->regions['countries'][$row['country']??''])&&in_array($row['time_zone']??null,$this->regions['time_zones'],true);
    unset($row['country'],$row['time_zone']);
   }
  }
  unset($row);
  return ['rows'=>$rows,'has_more'=>$more,'observed_at'=>$data['observed_at']??null];
 }
}
function platform_directory_https_request(array $args,array $config,string $token):array {
 if (($config['supabase_url']??'')!=='https://rxelmugnucfajrqmphhe.supabase.co'
  || !is_string($config['publishable_key']??null) || !preg_match('/\Asb_publishable_[A-Za-z0-9_-]+\z/D',$config['publishable_key'])
  || !preg_match('/\A[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\z/D',$token)) throw new RuntimeException('Directory connection unavailable.');
 // Authentication uses the current user's JWT, never a service-role/database secret.
 $url=$config['supabase_url'].'/rest/v1/rpc/platform_owner_directory_read?'.http_build_query($args,'','&',PHP_QUERY_RFC3986);
 $context=stream_context_create(['http'=>['method'=>'GET','header'=>'apikey: '.$config['publishable_key']."\r\nAuthorization: Bearer ".$token."\r\nAccept: application/json",'timeout'=>5,'follow_location'=>0,'ignore_errors'=>true],
  'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
 $stream=@fopen($url,'rb',false,$context);
 if (!$stream) throw new RuntimeException('Directory connection unavailable.');
 try {$raw=stream_get_contents($stream,524289);$meta=stream_get_meta_data($stream);} finally {fclose($stream);}
 preg_match('/\AHTTP\/\S+ (\d{3})/',$meta['wrapper_data'][0]??'',$status);
 if (($status[1]??'')!=='200'||($meta['timed_out']??false)||$raw===false||strlen($raw)>524288) throw new RuntimeException('Directory connection unavailable.');
 $data=json_decode($raw,true,128,JSON_THROW_ON_ERROR);
 if (!is_array($data)) throw new RuntimeException('Directory connection unavailable.');
 return $data;
}
function platform_directory_https_reader():PlatformDirectoryHttpsReader {
 // Called only after managed Auth verification and local immutable-owner gate.
 $regions=json_decode(file_get_contents(__DIR__.'/regions.json'),true,512,JSON_THROW_ON_ERROR);
 if (!is_array($regions['countries']??null)||!is_array($regions['time_zones']??null)) throw new RuntimeException('Regions unavailable.');
 return new PlatformDirectoryHttpsReader(static fn(array $args):array=>platform_directory_https_request($args,cfg(),$_SESSION['auth']['access_token']??''),$regions);
}
