<?php
function esc($s){return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');}
function cfg(){return ['base_url'=>'https://example.test'];}
require dirname(__DIR__).'/account/profile-core.php';
require dirname(__DIR__).'/account/services-core.php';
require dirname(__DIR__).'/business/homepage.php';
require dirname(__DIR__).'/account/enquiries-core.php';$_SESSION=['forms'=>[]];$_POST=[];
$p=['name'=>'Independent Example','description'=>'Owner supplied introduction.','areas'=>'Newlands','email'=>'hello@example.test','phone'=>'','website'=>'','logo'=>null,'hours'=>array_fill(0,7,null)];
if(($argv[1]??'')==='custom')$p['homepage']=['headline'=>'Your space, cared for.','introduction'=>'A custom introduction.','image'=>['data'=>'fixture'],'image_alt'=>'An owner supplied photograph','benefits'=>['Owner supplied benefit','<script>unsafe</script>']];
if(($argv[1]??'')==='custom'&&getenv('FARAIOS_TEST_HERO_FILE'))$p['homepage']['image']=['mime'=>'image/jpeg','data'=>base64_encode(file_get_contents(getenv('FARAIOS_TEST_HERO_FILE')))];
$d=['currency'=>'ZAR','items'=>[['id'=>str_repeat('a',32),'name'=>'Standard cleaning','description'=>'Routine cleaning','mode'=>'fixed','amount'=>50500,'duration'=>120,'visible'=>true,'archived'=>false],['name'=>'Hidden service','visible'=>false],['name'=>'Archived service','visible'=>true,'archived'=>true],['name'=>'Deep cleaning','description'=>'Detailed cleaning','mode'=>'from','amount'=>95000,'duration'=>240,'visible'=>true,'archived'=>false],['name'=>'Office cleaning','description'=>'Workspace cleaning','mode'=>'quote','amount'=>null,'duration'=>180,'visible'=>true,'archived'=>false]]];
foreach($d['items'] as $i=>&$service)$service['id']=str_pad((string)$i,32,'0',STR_PAD_LEFT);unset($service);
$page=$argv[2]??'';
if(($argv[1]??'')==='custom'){foreach(business_page_defaults() as $key=>$default)$p['pages'][$key]=['title'=>'Custom '.$default['label'],'introduction'=>'Owner supplied introduction for '.$key,'body'=>'Owner supplied details <script>unsafe</script>'];$p['pages']['how-it-works']['steps']=[['Custom step one','Owner step one'],['Custom step two','Owner step two'],['Custom step three','Owner step three']];}
$GLOBALS['homepage_enquiry']=function()use($d,$page,$p){enquiry_form('example',$d,'',false,true,$page,$p['name']);};
echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';business_seo_head($p,$page,'https://example.test','example',false);echo '</head><body class="homepage-page">';homepage_header($p,'https://example.test/b/example','https://example.test','?logo=1',$page);echo '<main class="home-main">';homepage_render($p,$d,'Africa/Johannesburg','https://example.test/b/example','/hero.png',true,$page);echo '</main>';

echo '</body></html>';
