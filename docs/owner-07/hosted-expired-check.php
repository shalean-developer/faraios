<?php
if(PHP_SAPI!=='cli')exit(2);
$_SERVER['SCRIPT_NAME']='/account/platform-overview-page.php';
$_SERVER['SCRIPT_FILENAME']='/var/www/vhosts/shalean.com/faraios.com/account/platform-overview-page.php';
$_SERVER['REQUEST_METHOD']='GET';$_GET=[];
require '/var/www/vhosts/shalean.com/faraios.com/account/platform-session.php';
session_id(bin2hex(random_bytes(24)));start();
$_SESSION['auth']=['access_token'=>'expired.test.token','refresh_token'=>'invalid-controlled-acceptance-token','expires_at'=>time()-3600];
session_write_close();ob_start();require $_SERVER['SCRIPT_FILENAME'];$html=ob_get_clean();
$r=['status'=>http_response_code(),'no_totals'=>!str_contains($html,'overview-totals')];
if(session_status()!==PHP_SESSION_ACTIVE)session_start();$_SESSION=[];session_destroy();
echo json_encode($r);
