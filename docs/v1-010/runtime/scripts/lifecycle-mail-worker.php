<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require __DIR__.'/../notifications/lifecycle.php';require __DIR__.'/../notifications/lifecycle-config.php';
try{
 $c=lifecycle_config();if(($c['enabled']??false)!==true){fwrite(STDOUT,"Lifecycle sending disabled.\n");exit(0);}
 $count=lifecycle_dispatch($c,fn($name,$args)=>lifecycle_rpc($c,$name,$args),fn($message,$key)=>lifecycle_http('https://api.resend.com/emails',$message,['Authorization: Bearer '.$c['resend_key'],'Idempotency-Key: '.$key]));
 fwrite(STDOUT,"Processed {$count} lifecycle messages. Provider acceptance is not delivery.\n");
}catch(Throwable $e){fwrite(STDERR,"Lifecycle worker failed. Review private configuration and message outcomes.\n");exit(1);}
