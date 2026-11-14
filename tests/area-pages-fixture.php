<?php
function esc($v){return htmlspecialchars((string)$v,ENT_QUOTES,'UTF-8');}
function cfg(){return ['base_url'=>'https://example.test'];}
require __DIR__.'/../business/homepage.php';
$p=['name'=>'Example Cleaning','areas'=>"Claremont · Newlands\nOther area",'presentation'=>[]];
$a=['slug'=>'claremont','name'=>'Claremont','title'=>'Cleaning in Claremont','introduction'=>'Discuss cleaning requirements for your property with our team.','coverage'=>'Share the service address and preferred date so we can confirm coverage and availability.','action'=>'Enquire about Claremont','services'=>[str_repeat('a',32)],'published'=>true];
$p['area_pages']=['claremont'=>$a];$catalogue=['items'=>[['id'=>str_repeat('a',32),'name'=>'Standard cleaning','visible'=>true,'archived'=>false],['id'=>str_repeat('b',32),'name'=>'Private service','visible'=>false,'archived'=>false]]];
echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Area page preview</title><body><main>';
area_page_render($p,$a,$catalogue,'https://example.test/b/example');echo '</main></body></html>';
