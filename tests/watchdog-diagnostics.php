<?php
require dirname(__DIR__).'/scripts/operations-watchdog.php';
$n=0;function verify($ok){global $n;$n++;if(!$ok)throw new RuntimeException('assertion '.$n);}
$url='https://www.faraios.com/';
$secret='SENSITIVE-COOKIE-CREDENTIAL';
$headers="HTTP/1.1 200 Connection established\r\nServer: nginx\r\nCF-Ray: 0123456789abcdef-JNB\r\n\r\nHTTP/2 403\r\nServer: LiteSpeed $secret\r\nSet-Cookie: session=$secret\r\nAuthorization: $secret\r\nLocation: https://example.test/?token=$secret\r\nCF-Mitigated: challenge\r\nRetry-After: 120\r\nX-Request-ID: $secret\r\n";
$d=watchdog_diagnostic($url,0,403,$headers,"<h1>Forbidden</h1>$secret");
verify($d['http_status']===403);verify($d['headers']===['server'=>'litespeed','cf-mitigated'=>'challenge','retry-after'=>'120']);verify($d['markers']===['forbidden']);verify(!str_contains(json_encode($d),$secret));verify(strlen($d['body_sha256'])===64);
verify(watchdog_diagnostic('https://rxelmugnucfajrqmphhe.supabase.co/auth/v1/health',0,403,$headers,$secret)===[]);
verify(watchdog_diagnostic($url.'?token='.$secret,0,403,$headers,$secret)===[]);
$d=watchdog_diagnostic($url,28,0,"CF-Ray: invalid $secret\nRetry-After: $secret\n",'');verify($d['headers']===[]);verify($d['curl_exit']===28);
$d=watchdog_diagnostic($url,0,403,"HTTP/2 403\nCF-Ray: 0123456789abcdef-JNB\n",str_repeat('x',65536).'captcha');verify($d['headers']['cf-ray']==='0123456789abcdef-JNB');verify($d['markers']===[]);
// Real fetch adapter with a deterministic curl stand-in; no network or messages.
$dir=sys_get_temp_dir().'/watchdog-fixture-'.bin2hex(random_bytes(6));mkdir($dir,0700);$old=getenv('PATH');
file_put_contents($dir.'/curl',<<<'SH'
#!/bin/sh
if [ "$1" != "--dump-header" ]; then exit 99; fi
printf 'HTTP/2 403\r\nServer: LiteSpeed\r\nSet-Cookie: SECRET\r\n\r\n' > "$2"
printf 'Forbidden SECRET\n403'
exit "${FAKE_CURL_EXIT:-0}"
SH
);chmod($dir.'/curl',0700);putenv('PATH='.$dir.':'.$old);
try {
 [$code,$body,$diag]=watchdog_fetch($url);verify($code===403);verify($body==='Forbidden SECRET');verify($diag['http_status']===403);verify(!str_contains(json_encode($diag),'SECRET'));
 putenv('FAKE_CURL_EXIT=28');[$code,$body,$diag]=watchdog_fetch($url);verify($code===0);verify($body==='');verify($diag['curl_exit']===28);verify($diag['http_status']===403);
 putenv('FAKE_CURL_EXIT=0');[$code,$body,$diag]=watchdog_fetch('https://rxelmugnucfajrqmphhe.supabase.co/auth/v1/health',['apikey: SECRET']);verify($diag===[]);
} finally {putenv('PATH='.$old);putenv('FAKE_CURL_EXIT');unlink($dir.'/curl');rmdir($dir);}
echo "PASS $n diagnostic privacy, parser and fetch assertions; no network or sends.\n";
