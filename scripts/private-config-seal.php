<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require __DIR__.'/private_config.php';
try{
 $o=getopt('',['public-key:']);$pub=file_get_contents($o['public-key']??dirname(__DIR__).'/config/recovery-public.pem');
 $packet=pc_seal('/var/www/vhosts/shalean.com/private',$pub);
 $name='configuration-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4)).'.packet';
 pc_write('/var/www/vhosts/shalean.com/private/faraios-account/ops-preview/'.$name,json_encode($packet,JSON_THROW_ON_ERROR));
 echo json_encode(['status'=>'private_configuration_sealed','file'=>$name,'plaintext_printed'=>false])."\n";
}catch(Throwable $e){fwrite(STDERR,"Private configuration sealing failed; no configuration values printed.\n");exit(1);}
