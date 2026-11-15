<?php
// Local/operator CLI: creates only encryption keys, never prints private material.
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$directory=$argv[1]??'';$root=realpath(dirname(__DIR__));
if($directory===''||$directory[0]!=='/'||is_dir($directory)||str_starts_with($directory,$root.'/')){fwrite(STDERR,"Choose a new absolute private directory outside the website.\n");exit(1);}
if(!mkdir($directory,0700,true))exit(1);
$p=sodium_crypto_box_keypair();$public=bin2hex(sodium_crypto_box_publickey($p));$secret=bin2hex(sodium_crypto_box_secretkey($p));
$web="<?php return ['enabled'=>false,'public_key'=>'{$public}'];\n";
$worker="<?php return ['enabled'=>false,'environment'=>'preview','base_url'=>'https://www.faraios.com/_accounts-preview','supabase_url'=>'https://rxelmugnucfajrqmphhe.supabase.co','sender'=>'notifications@notify.faraios.com','public_key'=>'{$public}','secret_key'=>'{$secret}','allow_recipients'=>[],'service_key'=>'','resend_key'=>''];\n";
foreach(['web.php'=>$web,'worker.php'=>$worker] as $name=>$bytes){file_put_contents($directory.'/'.$name,$bytes,LOCK_EX);chmod($directory.'/'.$name,0600);}
fwrite(STDOUT,"Disabled private configuration created. Populate credentials privately and allow only approved preview recipients before enabling.\n");
