<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require __DIR__.'/private_config.php';
try{
 $o=getopt('',['public-key:']);$pub=file_get_contents($o['public-key']??dirname(__DIR__).'/config/recovery-public.pem');
 $packet=pc_seal('/var/www/vhosts/shalean.com/private',$pub);
 echo 'FARAIOS_SEALED_CONFIGURATION='.base64_encode(json_encode($packet,JSON_THROW_ON_ERROR))."\n";
}catch(Throwable $e){fwrite(STDERR,"Private configuration sealing failed; no configuration values printed.\n");exit(1);}
