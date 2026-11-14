<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
// Read-only checker; never sends alerts, changes queues or prints raw log lines.
$options=getopt('',['file:','minutes:','threshold:']);$minutes=filter_var($options['minutes']??15,FILTER_VALIDATE_INT);$threshold=filter_var($options['threshold']??5,FILTER_VALIDATE_INT);
$file=realpath((string)($options['file']??''));$root=realpath(dirname(__DIR__));
if(!$file||!is_file($file)||!is_readable($file)||str_starts_with($file,$root.'/')||$minutes===false||$minutes<1||$minutes>1440||$threshold===false||$threshold<1||$threshold>10000){echo json_encode(['state'=>'unknown','reason'=>'Check private log file and bounded window settings'])."\n";exit(2);}
$stream=fopen($file,'rb');if(!$stream){echo '{"state":"unknown"}';exit(2);}
$max=10*1024*1024;$size=filesize($file);$tail=$size>$max;if($tail){fseek($stream,-$max,SEEK_END);fgets($stream);}
$counts=['upstream_failure'=>0,'workflow_failure'=>0,'php_fatal'=>0];$now=time();
while(($line=fgets($stream,8192))!==false){$pos=strpos($line,'{"schema":"faraios.ops.v1"');if($pos===false)continue;$r=json_decode(substr($line,$pos),true);if(!is_array($r)||($r['environment']??'')!=='preview'||!array_key_exists($r['event']??'',$counts))continue;$at=strtotime((string)($r['time']??''));if($at===false||$at>$now+60||$at<$now-$minutes*60)continue;$counts[$r['event']]++;}
fclose($stream);$alert=$counts['php_fatal']>0||array_sum($counts)>=$threshold;
echo json_encode(['state'=>$alert?'attention':($tail?'partial_window':'no_events_observed'),'minutes'=>$minutes,'counts'=>$counts,'tail_limited'=>$tail,'note'=>'No events is not proof of service health; verify page, queue and worker checks'])."\n";exit($alert?1:($tail?2:0));
