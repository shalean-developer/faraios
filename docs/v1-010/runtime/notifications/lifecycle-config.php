<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function lifecycle_config(): array {
 $path=getenv('FARAIOS_LIFECYCLE_CONFIG')?:'/var/www/vhosts/shalean.com/private/faraios-lifecycle/config.php';
 if(!is_file($path))return ['enabled'=>false];
 $real=realpath($path);$root=realpath(dirname(__DIR__));if(!$real||str_starts_with($real,$root.'/'))throw new RuntimeException('Invalid private configuration');
 $c=require $real;if(!is_array($c)||($c['enabled']??false)!==true)return ['enabled'=>false];
 if(!in_array($c['environment']??'',['preview','live'],true)||($c['supabase_url']??'')!=='https://rxelmugnucfajrqmphhe.supabase.co'||($c['base_url']??'')!==('https://www.faraios.com'.($c['environment']==='preview'?'/_accounts-preview':''))||($c['sender']??'')!=='notifications@notify.faraios.com'||strlen($c['service_key']??'')<20||strlen($c['resend_key']??'')<20||!is_array($c['allow_recipients']??null)||!$c['allow_recipients'])throw new RuntimeException('Invalid private configuration');
 return $c;
}
function lifecycle_http(string $url,array $body,array $headers): array {
 $raw=@file_get_contents($url,false,stream_context_create(['http'=>['method'=>'POST','header'=>implode("\r\n",array_merge(['Content-Type: application/json'],$headers)),'content'=>json_encode($body,JSON_THROW_ON_ERROR),'timeout'=>12,'ignore_errors'=>true,'follow_location'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]));
 preg_match('/\s(\d{3})\s/',$http_response_header[0]??'',$m);return ['status'=>(int)($m[1]??0),'body'=>json_decode($raw?:'{}',true)];
}
function lifecycle_rpc(array $c,string $name,array $args): array {
 if(!in_array($name,['business_communication_claim','business_communication_finish','business_communication_delivery'],true))throw new RuntimeException('Invalid operation');
 $r=lifecycle_http($c['supabase_url'].'/rest/v1/rpc/'.$name,$args,['apikey: '.$c['service_key'],'Authorization: Bearer '.$c['service_key']]);
 if($r['status']!==200||!is_array($r['body']))throw new RuntimeException('Communication queue unavailable');return $r['body'];
}

// Same timestamp/HMAC contract as the existing transport, with a separate secret.
function lifecycle_webhook_valid(string $raw,string $id,string $timestamp,string $signatures,string $secret): bool {
 if(strlen($id)>200||$id===''||!preg_match('/^[0-9]{1,12}$/D',$timestamp)||abs(time()-(int)$timestamp)>300||!str_starts_with($secret,'whsec_'))return false;
 $key=base64_decode(substr($secret,6),true);if($key===false||strlen($key)<16)return false;
 $expected=base64_encode(hash_hmac('sha256',$id.'.'.$timestamp.'.'.$raw,$key,true));
 foreach(explode(' ',$signatures)as $signature)if(str_starts_with($signature,'v1,')&&hash_equals($expected,substr($signature,3)))return true;
 return false;
}
function lifecycle_json(array $body,int $status=200): never {http_response_code($status);echo json_encode($body,JSON_THROW_ON_ERROR);exit;}
