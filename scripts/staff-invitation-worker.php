<?php
// CLI only. Configuration and credentials live outside the web root. Does not use waitlist credentials.
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require __DIR__.'/../notifications/staff-invitation.php';
function mail_http(string $url,array $body,array $headers): array {
 $raw=@file_get_contents($url,false,stream_context_create(['http'=>['method'=>'POST','header'=>implode("\r\n",array_merge(['Content-Type: application/json'],$headers)),'content'=>json_encode($body,JSON_THROW_ON_ERROR),'timeout'=>12,'ignore_errors'=>true,'follow_location'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]));
 preg_match('/\s(\d{3})\s/',$http_response_header[0]??'',$m);return ['status'=>(int)($m[1]??0),'body'=>json_decode($raw?:'{}',true)];
}
function mail_rpc(array $c,string $name,array $args): array {
 $r=mail_http($c['supabase_url'].'/rest/v1/rpc/'.$name,$args,['apikey: '.$c['service_key'],'Authorization: Bearer '.$c['service_key']]);return staff_mail_rpc_result($name,$r);
}
try {
 $path=getenv('FARAIOS_STAFF_MAIL_CONFIG')?:'/var/www/vhosts/shalean.com/private/faraios-staff-invite/worker.php';
 if(!is_file($path)){fwrite(STDOUT,"Staff invitation mail disabled: no configuration.\n");exit(0);}
 $real=realpath($path);$root=realpath(dirname(__DIR__));if(!$real||str_starts_with($real,$root.'/'))throw new RuntimeException('Configuration must be outside website');
 $c=require $real;if(!is_array($c)||($c['enabled']??false)!==true){fwrite(STDOUT,"Staff invitation mail disabled.\n");exit(0);}
 if(!in_array($c['environment']??'',['preview','live'],true)||($c['supabase_url']??'')!=='https://rxelmugnucfajrqmphhe.supabase.co'||($c['base_url']??'')!==('https://www.faraios.com'.($c['environment']==='preview'?'/_accounts-preview':''))||($c['sender']??'')!=='notifications@notify.faraios.com'||preg_match('/[\r\n]/',$c['sender'])||strlen($c['service_key']??'')<20||strlen($c['resend_key']??'')<20||!preg_match('/^[a-f0-9]{64}$/',$c['secret_key']??'')||!preg_match('/^[a-f0-9]{64}$/',$c['public_key']??''))throw new RuntimeException('Invalid mail configuration');
 $processed=staff_mail_dispatch($c,fn($name,$args)=>mail_rpc($c,$name,$args),fn($message,$key)=>mail_http('https://api.resend.com/emails',$message,['Authorization: Bearer '.$c['resend_key'],'Idempotency-Key: '.$key]));fwrite(STDOUT,"Processed {$processed} staff invitations. Provider acceptance does not confirm inbox delivery.\n");
}catch(Throwable $e){fwrite(STDERR,"Staff invitation mail worker failed. Check private configuration and queue outcomes.\n");exit(1);}
