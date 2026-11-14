<?php
function esc($s){return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');}
function cfg(){return ['base_url'=>'https://example.test'];}
function enquiry_ticket($k){return ['csrf'=>'synthetic','request'=>'00000000-0000-0000-0000-000000000001'];}
function services_price($s,$c){return $c.' '.number_format(($s['amount']??0)/100,2);}
$_SERVER['REQUEST_METHOD']='GET';$_SESSION=[];
require dirname(__DIR__).'/account/requests-core.php';
$row=['time_zone'=>'Africa/Johannesburg','document'=>['areas'=>'Claremont · Newlands · Rondebosch'],'services'=>['currency'=>'ZAR','items'=>[['id'=>str_repeat('a',32),'name'=>'Standard cleaning','description'=>'','amount'=>50500,'mode'=>'fixed','duration'=>120,'visible'=>true,'archived'=>false,'options'=>[['id'=>str_repeat('b',32),'name'=>'Bedrooms','kind'=>'bedrooms','minimum'=>0,'maximum'=>10,'included'=>1,'price'=>6000,'minutes'=>20],['id'=>str_repeat('c',32),'name'=>'Inside oven','kind'=>'toggle','minimum'=>0,'maximum'=>1,'included'=>0,'price'=>10000,'minutes'=>45]]]]]];
echo '<header class="topbar booking-header">';request_progress();echo '</header><main class="public-main">';request_form('example',$row,'',false);echo '</main>';
