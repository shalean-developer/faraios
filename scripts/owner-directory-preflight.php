<?php
declare(strict_types=1);
// Offline/host CLI read-only guard. Never deploy this as a web endpoint.
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
if ($argc!==3) { fwrite(STDERR,"Usage: php owner-directory-preflight.php WEBROOT MANIFEST\n"); exit(2); }
$root=realpath($argv[1]);
if (!$root || !is_dir($root)) { fwrite(STDERR,"Webroot unavailable\n"); exit(2); }
$m=json_decode(file_get_contents($argv[2]),true,32,JSON_THROW_ON_ERROR);
if (!is_array($m['must_preserve']??null) || !is_array($m['must_be_absent']??null)) throw new RuntimeException('Invalid manifest');
$failed=false;
foreach ($m['must_preserve'] as $path=>$expected) {
 if (!preg_match('~\Aaccount/[a-z.-]+\z~D',$path) || !preg_match('/\A[0-9a-f]{64}\z/D',$expected)) throw new RuntimeException('Invalid manifest');
 $file=$root.'/'.$path;
 $ok=is_file($file)&&!is_link($file)&&hash_equals($expected,hash_file('sha256',$file));
 echo ($ok?'MATCH ':'STOP ').$path.PHP_EOL; $failed=$failed||!$ok;
}
foreach ($m['must_be_absent'] as $path) {
 if (!in_array($path,['account/platform-directory.php','account/platform-directory-reader.php'],true)) throw new RuntimeException('Invalid new file');
 $ok=!file_exists($root.'/'.$path)&&!is_link($root.'/'.$path);
 echo ($ok?'ABSENT ':'STOP ').$path.PHP_EOL; $failed=$failed||!$ok;
}
echo $failed?"STOP: reconcile changed bytes or existing targets; do not overwrite.\n":"PASS: file preconditions only; database, runtime and authorization gates remain separate.\n";
exit($failed?1:0);
