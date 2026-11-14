<?php
function esc($s){return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');}
function cfg(){return ['base_url'=>'https://example.test'];}
require dirname(__DIR__).'/account/profile-core.php';
require dirname(__DIR__).'/account/services-core.php';
require dirname(__DIR__).'/business/homepage.php';
$p=['name'=>'Independent Example','description'=>'Owner supplied introduction.','areas'=>'Newlands','email'=>'hello@example.test','phone'=>'','website'=>'','logo'=>null,'hours'=>array_fill(0,7,null)];
if(($argv[1]??'')==='custom')$p['homepage']=['headline'=>'Your space, cared for.','introduction'=>'A custom introduction.','image'=>['data'=>'fixture'],'image_alt'=>'An owner supplied photograph','benefits'=>['Owner supplied benefit','<script>unsafe</script>']];
$d=['currency'=>'ZAR','items'=>[['id'=>str_repeat('a',32),'name'=>'Standard cleaning','description'=>'Routine cleaning','mode'=>'fixed','amount'=>50500,'duration'=>120,'visible'=>true,'archived'=>false],['name'=>'Hidden service','visible'=>false],['name'=>'Archived service','visible'=>true,'archived'=>true],['name'=>'Deep cleaning','description'=>'Detailed cleaning','mode'=>'from','amount'=>95000,'duration'=>240,'visible'=>true,'archived'=>false],['name'=>'Office cleaning','description'=>'Workspace cleaning','mode'=>'quote','amount'=>null,'duration'=>180,'visible'=>true,'archived'=>false]]];
echo '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="homepage-page">';homepage_header($p,'https://example.test/b/example','https://example.test','?logo=1');echo '<main class="home-main">';homepage_render($p,$d,'Africa/Johannesburg','https://example.test/b/example','/hero.png',false);echo '</main>';
