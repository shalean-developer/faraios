<?php
declare(strict_types=1);
require_once __DIR__.'/service-options.php';
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function quote_uuid(): string {$s=bin2hex(random_bytes(16));return substr($s,0,8).'-'.substr($s,8,4).'-'.substr($s,12,4).'-'.substr($s,16,4).'-'.substr($s,20);}
function quote_status(array $q,array $b): string {return $q['status']==='Sent'&&$q['expires_on']<(new DateTimeImmutable('now',new DateTimeZone($q['sender']['time_zone']??$b['time_zone'])))->format('Y-m-d')?'Expired':$q['status'];}
function quote_money(int $n,string $c): string {return $c.' '.number_format($n/100,in_array($c,['JPY','UGX','RWF'],true)?0:2,'.',',');}
function quote_values(string $currency): array {
 $d=['currency'=>$currency];foreach(['name'=>120,'email'=>254,'phone'=>40,'notes'=>2000] as $k=>$max){$s=$_POST[$k]??'';if(!is_string($s)||!preg_match('//u',$s)||mb_len(trim($s))>$max||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$s))throw new RuntimeException('Check customer details.');$d[$k]=trim($s);}
 if(mb_len($d['name'])<2)throw new RuntimeException('Enter the customer name.');
 if(($d['email']===''&&$d['phone']==='')||($d['email']!==''&&!filter_var($d['email'],FILTER_VALIDATE_EMAIL))||($d['phone']!==''&&(!preg_match('/\A[+0-9 ()-]{5,40}\z/',$d['phone'])||strlen(preg_replace('/\D/','',$d['phone']))<5)))throw new RuntimeException('Enter a valid customer email or phone.');
 $d['items']=[];$total=0;
 foreach(range(0,19) as $i){$name=trim((string)($_POST['item_name_'.$i]??''));$qty=trim((string)($_POST['quantity_'.$i]??''));$price=trim((string)($_POST['price_'.$i]??''));if($name===''&&$qty===''&&$price==='')continue;
 if(mb_len($name)<2||mb_len($name)>120||!preg_match('//u',$name)||preg_match('/[\x00-\x1f\x7f]/',$name)||!preg_match('/\A[0-9]{1,4}\z/',$qty)||(int)$qty<1)throw new RuntimeException('Each item needs a name and a whole quantity from 1 to 9999.');
 if(!preg_match(in_array($currency,['JPY','UGX','RWF'],true)?'/\A[0-9]{1,7}\z/':'/\A[0-9]{1,7}(?:\.[0-9]{1,2})?\z/',$price))throw new RuntimeException('Check item prices for '.$currency.'.');
 $parts=explode('.',$price);$minor=(int)$parts[0]*100+(int)str_pad($parts[1]??'',2,'0');$total+=(int)$qty*$minor;$d['items'][]=['name'=>$name,'quantity'=>(int)$qty,'price'=>$minor];
 }
 if(!$d['items']||$total>999999999)throw new RuntimeException('Add at least one item. The maximum total is 9,999,999.99.');return $d;
}
function quote_render(array $d): void {
 $total=0;echo '<div class="quote-items">';foreach($d['items'] as $s){$line=$s['quantity']*$s['price'];$total+=$line;echo '<article class="service-card"><h3>'.esc($s['name']).'</h3><p>'.(int)$s['quantity'].' × '.esc(quote_money($s['price'],$d['currency'])).'</p><strong>'.esc(quote_money($line,$d['currency'])).'</strong></article>';}
 echo '</div><p class="quote-total">Total '.esc(quote_money($total,$d['currency'])).'</p>';if($d['notes']!=='')echo '<h3>Notes</h3><p class="description">'.nl2br(esc($d['notes'])).'</p>';scope_render($d);
}
