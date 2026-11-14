<?php
declare(strict_types=1);
// Public fields are explicit; account metadata and private contact details never enter this payload.
function profile_env(): string {return (parse_url(cfg()['base_url'],PHP_URL_PATH)?:'')===''?'live':'preview';}
function profile_rpc(string $name,array $args=[],bool $public=false): array {return api('/rest/v1/rpc/'.$name,$args,'POST',$public?null:$_SESSION['auth']['access_token']);}
function profile_load(array $b): ?array {$r=api('/rest/v1/business_profiles?business_id=eq.'.rawurlencode($b['id']).'&environment=eq.'.profile_env().'&select=*',[],'GET',$_SESSION['auth']['access_token']);return $r[0]??null;}
function profile_logo(string $raw): array {
 $size=@getimagesizefromstring($raw);$mime=$size['mime']??'';
 if(strlen($raw)>150000||!in_array($mime,['image/png','image/jpeg','image/webp'],true)||!$size||$size[0]>2000||$size[1]>2000)throw new RuntimeException('Choose a PNG, JPG or WebP logo up to 150 KB and 2000 × 2000 pixels.');
 return ['mime'=>$mime,'data'=>base64_encode($raw)];
}
function profile_form_values(array $old): array {
 // Display-only recovery after validation errors; never bypass profile_values() when saving.
 foreach(['name','description','email','phone','website','areas'] as $key)if(isset($_POST[$key])&&is_string($_POST[$key]))$old[$key]=substr($_POST[$key],0,8000);
 if(profile_env()==='preview')$old['homepage']=homepage_form_values();
 $old['hours']=[];foreach(profile_days() as $i=>$day)$old['hours'][]=isset($_POST['open_'.$i])?[(string)($_POST['from_'.$i]??''),(string)($_POST['to_'.$i]??'')]:null;
 return $old;
}
function profile_values(array $old): array {
 $p=[];foreach(['name'=>120,'description'=>2000,'email'=>254,'phone'=>40,'website'=>500,'areas'=>1000] as $key=>$max){$v=trim((string)($_POST[$key]??''));if(preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$v)||mb_len($v)>$max)throw new RuntimeException('Check your '. $key.'.');$p[$key]=$v;}
 if(mb_len($p['name'])<2)throw new RuntimeException('Enter a public business name.');
 if($p['email']!==''&&!filter_var($p['email'],FILTER_VALIDATE_EMAIL))throw new RuntimeException('Enter a valid public email.');
 if($p['phone']!==''&&!preg_match('/\A[+0-9 ()-]{5,40}\z/',$p['phone']))throw new RuntimeException('Enter a valid public phone number.');
 if($p['website']!==''&&(!filter_var($p['website'],FILTER_VALIDATE_URL)||parse_url($p['website'],PHP_URL_SCHEME)!=='https'||parse_url($p['website'],PHP_URL_USER)!==null))throw new RuntimeException('Enter a website starting with https://.');
 $p['hours']=[];foreach(profile_days() as $i=>$day){if(!isset($_POST['open_'.$i])){$p['hours'][]=null;continue;}$from=(string)($_POST['from_'.$i]??'');$to=(string)($_POST['to_'.$i]??'');if(!preg_match('/\A(?:[01][0-9]|2[0-3]):[0-5][0-9]\z/',$from)||!preg_match('/\A(?:[01][0-9]|2[0-3]):[0-5][0-9]\z/',$to)||$from>=$to)throw new RuntimeException('Check '.$day.' hours. Closing time must be after opening time.');$p['hours'][]=[$from,$to];}
 $p['logo']=$old['logo']??null;if(isset($_POST['remove_logo']))$p['logo']=null;
 $f=$_FILES['logo']??null;if($f&&$f['error']!==UPLOAD_ERR_NO_FILE){if($f['error']!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name']))throw new RuntimeException('The logo could not upload. Choose a file up to 150 KB.');$p['logo']=profile_logo(file_get_contents($f['tmp_name']));}
 if(profile_env()==='preview')$p['homepage']=homepage_values($old['homepage']??[]);
 return $p;
}
function mb_len(string $s): int {return preg_match_all('/./us',$s);}
function profile_days(): array {return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];}
function profile_empty(array $b): array {return ['name'=>$b['name'],'description'=>'','email'=>'','phone'=>'','website'=>'','areas'=>'','hours'=>array_fill(0,7,null),'logo'=>null];}
function profile_render(array $p,string $zone,string $logo): void {
 echo '<article class="public-card"><div class="business-heading">';if($p['logo'])echo '<img class="business-logo" src="'.esc($logo).'" alt="'.esc($p['name']).' logo" width="88" height="88">';else echo '<div class="monogram" aria-hidden="true">'.esc(strtoupper(substr($p['name'],0,1))).'</div>';
 echo '<div><p class="eyebrow">LOCAL SERVICES</p><h1>'.esc($p['name']).'</h1></div></div>';
 if($p['description']!=='')echo '<p class="description">'.nl2br(esc($p['description'])).'</p>';
 if($p['email']!==''||$p['phone']!==''||$p['website']!==''){echo '<section><h2>Get in touch</h2><div class="contact-links">';if($p['email']!=='')echo '<a href="mailto:'.esc($p['email']).'">'.esc($p['email']).'</a>';if($p['phone']!=='')echo '<a href="tel:'.esc(preg_replace('/[^+0-9]/','',$p['phone'])).'">'.esc($p['phone']).'</a>';if($p['website']!==''&&str_starts_with($p['website'],'https://'))echo '<a href="'.esc($p['website']).'" rel="nofollow noopener noreferrer">Visit website ↗</a>';echo '</div></section>';}
 if($p['areas']!=='')echo '<section><h2>Service areas</h2><p class="description">'.nl2br(esc($p['areas'])).'</p></section>';
 echo '<section><h2>Opening hours</h2><p class="muted">'.esc(str_replace('_',' ',$zone)).'</p><dl class="hours-list">';foreach(profile_days() as $i=>$day)echo '<div><dt>'.$day.'</dt><dd>'.($p['hours'][$i]?esc(implode(' – ',$p['hours'][$i])):'Closed').'</dd></div>';echo '</dl></section></article>';
}
