<?php
declare(strict_types=1);
require_once __DIR__.'/service-options.php';
function service_currencies(): array {return ['ZAR'=>'South African rand','USD'=>'US dollar','GBP'=>'British pound','EUR'=>'Euro','AUD'=>'Australian dollar','CAD'=>'Canadian dollar','NZD'=>'New Zealand dollar','BWP'=>'Botswana pula','NAD'=>'Namibian dollar','ZMW'=>'Zambian kwacha','KES'=>'Kenyan shilling','NGN'=>'Nigerian naira','GHS'=>'Ghanaian cedi','MUR'=>'Mauritian rupee','SZL'=>'Swazi lilangeni','LSL'=>'Lesotho loti','MZN'=>'Mozambican metical','UGX'=>'Ugandan shilling','TZS'=>'Tanzanian shilling','RWF'=>'Rwandan franc','JPY'=>'Japanese yen','INR'=>'Indian rupee','AED'=>'UAE dirham','CHF'=>'Swiss franc'];}
function services_load(array $b): ?array {$rows=api('/rest/v1/business_service_catalogues?business_id=eq.'.rawurlencode($b['id']).'&environment=eq.'.profile_env().'&select=*',[],'GET',$_SESSION['auth']['access_token']);return $rows[0]??null;}
function service_empty(): array {return ['id'=>bin2hex(random_bytes(16)),'name'=>'','description'=>'','duration'=>60,'mode'=>'fixed','amount'=>null,'visible'=>false,'archived'=>false];}
function service_values(array $s,string $currency): array {
 foreach(['name'=>120,'description'=>2000] as $key=>$max){$v=trim((string)($_POST[$key]??''));if(!preg_match('//u',$v)||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$v)||mb_len($v)>$max)throw new RuntimeException('Check the service '.$key.'.');$s[$key]=$v;}
 if(mb_len($s['name'])<2)throw new RuntimeException('Enter a service name with at least 2 characters.');
 $duration=(string)($_POST['duration']??'');if(!preg_match('/\A[0-9]+\z/',$duration)||(int)$duration<1||(int)$duration>10080)throw new RuntimeException('Enter a duration from 1 to 10080 minutes.');$s['duration']=(int)$duration;
 $s['mode']=(string)($_POST['mode']??'');if(!in_array($s['mode'],['fixed','from','quote'],true))throw new RuntimeException('Choose a pricing type.');
 $s['amount']=null;if($s['mode']!=='quote'){$a=trim((string)($_POST['amount']??''));$zero=in_array($currency,['JPY','UGX','RWF'],true);if(!preg_match($zero?'/\A[0-9]{1,7}\z/':'/\A[0-9]{1,7}(?:\.[0-9]{1,2})?\z/',$a))throw new RuntimeException($zero?'Enter a whole-number price of zero or more.':'Enter a price of zero or more with up to 2 decimal places.');$parts=explode('.',$a);$s['amount']=(int)$parts[0]*100+(int)str_pad($parts[1]??'',2,'0');if($s['amount']>999999999)throw new RuntimeException('The maximum price is 9,999,999.99.');}
 $s['visible']=isset($_POST['visible']);$options=options_values($currency);if($options||isset($s['options']))$s['options']=$options;return $s;
}
function services_price(array $s,string $currency): string {return $s['mode']==='quote'?'Request a quote':($s['mode']==='from'?'From ':'').$currency.' '.number_format($s['amount']/100,in_array($currency,['JPY','UGX','RWF'],true)?0:2,'.',',');}
function services_render(array $d): void {
 if(empty($d['items']))return;
 echo '<section class="services-public"><h2>Services</h2><p class="muted">Prices in '.esc($d['currency']).'</p><div class="service-list">';
 foreach($d['items'] as $s){if($s['archived']||!$s['visible'])continue;echo '<article class="service-card"><div class="service-title"><h3>'.esc($s['name']).'</h3><strong>'.esc(services_price($s,$d['currency'])).'</strong></div>';if($s['description']!=='')echo '<p class="description">'.nl2br(esc($s['description'])).'</p>';echo '<p class="muted">'.(int)$s['duration'].' minutes</p></article>';}
 echo '</div></section>';
}
