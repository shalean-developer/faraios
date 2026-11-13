<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function booking_statuses(): array {return ['Scheduled','In Progress','Completed','Cancelled'];}
function booking_local(array $r,?string $zone=null): DateTimeImmutable {return (new DateTimeImmutable($r['starts_at']))->setTimezone(new DateTimeZone($zone??$r['time_zone']));}
function booking_schedule(array $r,?string $zone=null): string {$s=booking_local($r,$zone);$e=$s->setTimestamp($s->getTimestamp()+$r['duration_minutes']*60);return $s->format('d M Y · H:i').' – '.$e->format($s->format('Y-m-d')===$e->format('Y-m-d')?'H:i':'d M Y H:i');}
function booking_fields(): array {
 $date=(string)($_POST['date']??'');$time=(string)($_POST['time']??'');$local=$date.' '.$time;
 $dt=DateTimeImmutable::createFromFormat('!Y-m-d H:i',$local,new DateTimeZone('UTC'));
 if(!$dt||$dt->format('Y-m-d H:i')!==$local||$date<'2000-01-01'||$date>'2099-12-31')throw new RuntimeException('Choose a valid date and start time between 2000 and 2099.');
 $duration=(string)($_POST['duration']??'');if(!preg_match('/\A[0-9]{1,5}\z/',$duration)||(int)$duration<1||(int)$duration>10080)throw new RuntimeException('Choose a duration from 1 to 10080 minutes.');
 $address=trim((string)($_POST['address']??''));if(!preg_match('//u',$address)||mb_len($address)<5||mb_len($address)>1000||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$address))throw new RuntimeException('Enter a service address from 5 to 1000 characters.');
 $status=(string)($_POST['status']??'Scheduled');if(!in_array($status,booking_statuses(),true))throw new RuntimeException('Choose a valid booking status.');
 return ['p_local'=>$local.':00','p_duration'=>(int)$duration,'p_address'=>$address,'p_status'=>$status];
}
