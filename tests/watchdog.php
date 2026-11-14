<?php
require dirname(__DIR__).'/scripts/operations-watchdog.php';
function check($v){if(!$v)throw new RuntimeException('failed');}
check(watchdog_decision(['state'=>'healthy'],[],1000)==='quiet');
check(watchdog_decision(['state'=>'attention'],[],1000)==='attention');
check(watchdog_decision(['state'=>'attention'],['notified_state'=>'attention','sent_at'=>1000],1001)==='suppressed');
check(watchdog_decision(['state'=>'attention'],['notified_state'=>'attention','sent_at'=>1000],4600)==='attention');
check(watchdog_decision(['state'=>'healthy'],['notified_state'=>'attention','sent_at'=>1000],1001)==='recovery');
echo "PASS independent monitor failure/reminder/recovery suppression; no network or sends.\n";
