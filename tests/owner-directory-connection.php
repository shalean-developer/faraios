<?php
declare(strict_types=1);
require __DIR__.'/../account/platform-directory-reader.php';
$n=0;
function check(bool $v,string $label):void{global $n;if(!$v)throw new RuntimeException($label);$n++;}
$base=['enabled'=>true,'mode'=>'session','host'=>'aws-1-eu-west-1.pooler.supabase.com','port'=>5432,'database'=>'postgres','password'=>'synthetic;password'];
$c=platform_directory_connection($base,'/private/owner03');
check($c['username']==='faraios_owner_reader.rxelmugnucfajrqmphhe','qualified restricted identity');
check(str_contains($c['dsn'],'sslmode=verify-full;sslrootcert=/private/owner03/platform-directory-root.crt;connect_timeout=5'),'verified trust and timeout');
check(!str_contains($c['dsn'],$base['password']),'password is not DSN text');
check($c['options'][PDO::ATTR_EMULATE_PREPARES]===false && $c['options'][PDO::ATTR_PERSISTENT]===false,'native nonpersistent connection');
$direct=$base;$direct['host']='db.rxelmugnucfajrqmphhe.supabase.co';unset($direct['mode']);
check(platform_directory_connection($direct,'/private/owner03')['username']==='faraios_owner_reader','legacy direct mode retains role');
foreach([
 ['mode'=>'transaction'],['mode'=>null],['mode'=>[]],['port'=>6543],['port'=>'5432'],['host'=>'evil.example'],
 ['host'=>'aws-1-eu-west-1.pooler.supabase.com.evil.example'],['host'=>"aws-1-eu-west-1.pooler.supabase.com;sslmode=disable"],
 ['database'=>'other'],['enabled'=>false],['password'=>''],['password'=>"bad\0password"],['password'=>[]],
 ['username'=>'postgres.rxelmugnucfajrqmphhe'],['sslmode'=>'disable'],['project_ref'=>'other'],['mode'=>'direct']
] as $patch){
 try {platform_directory_connection(array_replace($base,$patch),'/private/owner03');throw new LogicException('accepted unsafe configuration');}
 catch(RuntimeException $e){check($e->getMessage()==='Reader configuration unavailable.','redacted configuration rejection');}
}
try{platform_directory_connection($base,'/private/x;sslmode=disable');throw new LogicException('accepted path injection');}catch(RuntimeException $e){check(true,'path injection denied');}
echo json_encode(['status'=>'PASS','assertions'=>$n,'hosted_connections'=>0]).PHP_EOL;
