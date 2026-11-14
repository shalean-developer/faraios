<?php
// Parser and editor preservation regression; no hosted records or outbound requests.
require __DIR__.'/../account/core.php';
require __DIR__.'/../account/profile-core.php';
require __DIR__.'/../business/homepage.php';
function check(bool $ok,string $message): void {if(!$ok)throw new RuntimeException($message);}
$a=['slug'=>'test-area','name'=>'Test area','title'=>'Test','introduction'=>'Intro','coverage'=>'Coverage','seo_title'=>'','seo_description'=>'','action'=>'Ask','published'=>false,'services'=>[str_repeat('a',32),str_repeat('b',32),str_repeat('c',32)]];
$p=['area_pages'=>['test-area'=>$a]];
$catalogue=['items'=>[['id'=>str_repeat('a',32),'name'=>'Visible','visible'=>true,'archived'=>false],['id'=>str_repeat('b',32),'name'=>'Hidden','visible'=>false,'archived'=>false],['id'=>str_repeat('c',32),'name'=>'Archived','visible'=>true,'archived'=>true]]];
ob_start();area_pages_editor($p,$catalogue);$html=ob_get_clean();
check(substr_count($html,'type="hidden" name="area_pages[0][services][]"')===2,'Unavailable selections retained');
check(!str_contains($html,'>Hidden</label>')&&!str_contains($html,'>Archived</label>'),'Unavailable service labels not offered');
check(str_contains($html,'Private draft')&&str_contains($html,'Publish saved draft'),'Publication boundary explained');
$_POST=[];check(area_pages_values($p)===$p['area_pages'],'Unrelated saves retain areas');
$_POST=['area_editor'=>'1','area_pages'=>[$a]];check(area_pages_values($p)['test-area']['services']===$a['services'],'Selections survive save');
foreach([['area_editor'=>'1'],['area_editor'=>'1','area_pages'=>'bad'],['area_editor'=>'1','area_pages'=>[['published'=>'on']]],['area_editor'=>'1','area_pages'=>[['services'=>[str_repeat('a',32)]]]]] as $bad){
 $_POST=$bad;$rejected=false;try{area_pages_values($p);}catch(RuntimeException $e){$rejected=true;}check($rejected,'Malformed submission rejected');
}
$_POST=['area_editor'=>'1','area_pages'=>[[]]];check(area_pages_values($p)===[],'Blank add row ignored');
echo "PASS area editor: unavailable service preservation, draft guidance, malformed payload rejection and blank rows\n";
