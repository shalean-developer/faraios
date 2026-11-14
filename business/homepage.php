<?php
declare(strict_types=1);
require_once __DIR__.'/seo.php';
// All content comes from the selected business snapshot. No tenant lookup or private metadata.
function homepage_form_values(): array {
 $out=[];foreach(['headline','introduction','image_alt'] as $k)$out[$k]=is_string($_POST[$k]??null)?$_POST[$k]:'';
 $out['benefits']=preg_split('/\R/u',is_string($_POST['benefits']??null)?$_POST['benefits']:'')?:[];return $out;
}
function homepage_values(array $old): array {
 $h=homepage_form_values();foreach(['headline'=>160,'introduction'=>600,'image_alt'=>200] as $k=>$max){$h[$k]=trim($h[$k]);if(!preg_match('//u',$h[$k])||mb_len($h[$k])>$max||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$h[$k]))throw new RuntimeException('Check your homepage '.$k.'.');}
 $h['benefits']=array_values(array_filter(array_map('trim',$h['benefits']),fn($v)=>$v!==''));
 if(count($h['benefits'])>6)throw new RuntimeException('Add up to six benefits.');
 foreach($h['benefits'] as $v)if(!preg_match('//u',$v)||mb_len($v)>200||preg_match('/[\x00-\x1f\x7f]/',$v))throw new RuntimeException('Keep each benefit within 200 characters.');
 $h['image']=isset($_POST['remove_hero'])?null:($old['image']??null);$f=$_FILES['hero_image']??null;
 if($f&&$f['error']!==UPLOAD_ERR_NO_FILE){if($f['error']!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name']))throw new RuntimeException('The hero image could not upload. Choose an image up to 150 KB.');$h['image']=profile_logo(file_get_contents($f['tmp_name']));}
 if($h['image']&&$h['image_alt']==='')throw new RuntimeException('Describe your hero image for customers using screen readers.');
 return $h;
}
function homepage_image_response(?array $image): never {
 if(!$image){http_response_code(404);exit;}
 try{$raw=base64_decode($image['data'],true);$valid=profile_logo($raw?:'');header('Content-Type: '.$valid['mime']);header('X-Content-Type-Options: nosniff');echo $raw;}catch(Throwable $e){http_response_code(404);}exit;
}
function business_presentation_form_values(array $old=[]): array {
 foreach(['accent','font','whatsapp','street','city','region','postal','country'] as $key)if(is_string($_POST['presentation'][$key]??null))$old[$key]=substr($_POST['presentation'][$key],0,800);return $old;
}
function business_presentation_values(array $old=[]): array {
 $out=[];foreach(['accent'=>12,'font'=>8,'whatsapp'=>16,'street'=>200,'city'=>100,'region'=>100,'postal'=>20,'country'=>2] as $key=>$limit){
  $v=$_POST['presentation'][$key]??($old[$key]??'');if(!is_string($v))throw new RuntimeException('Check your website settings.');$v=trim($v);business_page_text_valid($v,$limit);$out[$key]=$v;
 }
 if(!in_array($out['accent'],['','forest','navy','plum'],true)||!in_array($out['font'],['','serif','sans'],true))throw new RuntimeException('Choose a website style.');
 if($out['whatsapp']!==''&&!preg_match('/\A[1-9][0-9]{6,14}\z/',$out['whatsapp']))throw new RuntimeException('Use a WhatsApp country code and number, digits only.');
 if($out['country']!==''&&!preg_match('/\A[A-Z]{2}\z/',$out['country']))throw new RuntimeException('Use a two-letter uppercase country code.');return $out;
}
function business_booking_available(string $slug): bool {
 try{$r=api('/rest/v1/rpc/business_booking_available',['p_environment'=>profile_env(),'p_slug'=>$slug]);return ($r['available']??false)===true;}catch(Throwable $e){return false;}
}
function business_style_classes(array $p): string {
 $o=$p['presentation']??[];return (in_array($o['accent']??'', ['forest','navy','plum'],true)?' theme-'.$o['accent']:'').(($o['font']??'')==='sans'?' font-sans':'');
}
// Availability is supplied by the caller; presentation never activates intake.
function homepage_action(string $url,bool $booking,?string $service=null): string {
 return $booking?$url.'?booking=1'.($service!==null?'&service='.rawurlencode($service):''):$url.'/contact#enquire';
}
function homepage_heading(array $p,string $key,string $fallback): string {return trim($p['pages'][$key]['title']??'')?:$fallback;}
function homepage_initial(string $name): string {preg_match('/./us',$name,$m);return strtoupper($m[0]??'');}
function homepage_header(array $p,string $url,string $base,string $logo,string $page='',bool $draft=false,bool $booking=false): void { ?>
<a class="home-skip" href="#homepage">Skip to content</a>
<header class="home-header booking-header<?=esc(business_style_classes($p))?>">
 <a class="home-brand" href="<?=esc($draft?'profile.php?view=preview':$url)?>"><?php if(!empty($p['logo'])):?><img src="<?=esc($logo)?>" alt="" width="<?=($brandDims=@getimagesizefromstring(base64_decode($p['logo']['data'],true)?:''))?$brandDims[0]:160?>" height="<?=$brandDims?$brandDims[1]:48?>"><?php else:?><span class="home-mark" aria-hidden="true"><?=esc(homepage_initial($p['name']))?></span><?php endif;?><span><?=esc($p['name'])?></span></a>
 <nav aria-label="Business navigation"><?php foreach(business_page_defaults() as $key=>$content):?><a href="<?=esc($draft?'profile.php?view=preview&section='.$key:$url.'/'.$key)?>" <?=$page===$key?'aria-current="page"':''?>><?=esc($content['label'])?></a><?php endforeach;?></nav>
 <div class="home-header-actions"><div class="booking-identity" data-header-session="<?=esc($base.'/account/header-session.php')?>" data-account-url="<?=esc($base.'/account/index.php')?>"><a class="booking-auth-button" href="<?=esc($base.'/account/index.php?page=signin')?>">Sign in</a></div><a class="home-button" href="<?=esc(homepage_action($url,$booking))?>"><?= $booking?'Book now':'Enquire' ?></a></div>
</header>
<?php }
function homepage_render(array $p,array $catalogue,string $zone,string $url,string $image,bool $enquire=true,string $page='',bool $booking=false): void {
 $h=$p['homepage']??[];$content=$page!==''?business_page_content($p,$page):null;$items=array_values(array_filter($catalogue['items']??[],fn($s)=>!empty($s['visible'])&&empty($s['archived'])));?>
<div class="business-home<?=($page!==''?' business-standalone':'').esc(business_style_classes($p))?>" id="homepage" tabindex="-1">
<?php if($page!==''):?><nav class="home-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="<?=esc($enquire?$url:'profile.php?view=preview')?>"><?=esc($p['name'])?></a></li><li aria-current="page"><?=esc($content['title'])?></li></ol></nav><section class="home-page-intro"><p class="home-eyebrow"><?=esc($p['name'])?></p><h1><?=esc($content['title'])?></h1><p class="home-intro"><?=nl2br(esc($content['introduction']))?></p><?php if($content['body']!==''):?><div class="home-page-body"><?=nl2br(esc($content['body']))?></div><?php endif;?></section><?php endif;?>
<?php if($page===''):?><section class="home-hero">
 <div class="home-hero-copy"><p class="home-eyebrow"><?=esc($p['name'])?></p><h1><?=esc(trim($h['headline']??'')?:$p['name'])?></h1>
 <?php $intro=trim($h['introduction']??'')?:($p['description']??'');if($intro!==''):?><p class="home-intro"><?=nl2br(esc($intro))?></p><?php endif;?>
 <div class="home-actions"><a class="home-button" href="<?=esc(homepage_action($url,$booking))?>"><?= $booking?'Book now':'Enquire' ?> <span aria-hidden="true">↗</span></a><a class="home-text-link" href="<?=esc($enquire?$url.'/services':'profile.php?view=preview&section=services')?>">Explore services <span aria-hidden="true">→</span></a></div><p class="home-note"><?= $booking?'Choose a service and request your preferred time.':'Tell us what you need. We will discuss the next steps with you.' ?></p>
 </div>
 <?php if(!empty($h['image'])):?><div class="home-hero-image"><img src="<?=esc($image)?>" alt="<?=esc($h['image_alt']??'')?>" width="<?=($dims=@getimagesizefromstring(base64_decode($h['image']['data'],true)?:''))?$dims[0]:1000?>" height="<?=$dims?$dims[1]:900?>" fetchpriority="high" decoding="async"></div><?php else:?><div class="home-hero-art" aria-hidden="true"><div class="home-orbit"></div><span class="home-art-letter"><?=esc(homepage_initial($p['name']))?></span><div class="home-art-caption"></div></div><?php endif;?>
</section>
<?php endif;?>
<?php if($page===''||$page==='services'):?><section class="home-section" id="services"><div class="home-section-heading"><div><p class="home-eyebrow">OUR SERVICES</p><h2><?=esc(homepage_heading($p,'services','Our services'))?></h2></div><p>Explore our services, then tell us what you need.</p></div>
 <?php if($items):?><div class="home-service-grid"><?php foreach($items as $i=>$s):?><article class="home-service-card"><span class="home-service-number" aria-hidden="true"><?=str_pad((string)($i+1),2,'0',STR_PAD_LEFT)?></span><<?=$page!==''?'h2':'h3'?>><?=esc($s['name'])?></<?=$page!==''?'h2':'h3'?>><p><?=nl2br(esc($s['description']??''))?></p><div class="home-service-bottom"><strong><?=esc($s['mode']==='quote'?'Quote required':services_price($s,$catalogue['currency']))?></strong><span><?=(int)$s['duration']?> minutes</span></div><?php if(!empty($s['options'])):?><small>Rooms and extras may change your total.</small><?php endif;?><a class="home-text-link" href="<?=esc(homepage_action($url,$booking,$s['id']))?>"><?= $booking?'Choose service':'Enquire about service' ?> <span aria-hidden="true">→</span><span class="home-sr">: <?=esc($s['name'])?></span></a></article><?php endforeach;?></div><?php else:?><p>Contact us to discuss the service you need.</p><a class="home-text-link" href="<?=esc($url.'/contact#enquire')?>">Make an enquiry →</a><?php endif;?>
<?php if($page===''):?><a class="home-text-link" href="<?=esc($enquire?$url.'/services':'profile.php?view=preview&section=services')?>">All services →</a><?php endif;?></section>
<?php endif;?>
<?php if($page===''&&!empty($h['benefits'])):?><section class="home-section home-benefits"><p class="home-eyebrow">WHY CHOOSE US</p><h2>What makes us different.</h2><ul><?php foreach($h['benefits'] as $benefit):?><li><span aria-hidden="true">✓</span><?=esc($benefit)?></li><?php endforeach;?></ul></section><?php endif;?>
<?php if($page===''||$page==='how-it-works'):?><section class="home-section home-how" id="how-it-works"><p class="home-eyebrow">HOW IT WORKS</p><h2><?=esc(homepage_heading($p,'how-it-works','How it works'))?></h2><ol><?php foreach(business_page_steps($p,$booking) as $i=>$step):?><li><span class="home-step"><?=$i+1?></span><<?=$page!==''?'h2':'h3'?>><?=esc($step[0])?></<?=$page!==''?'h2':'h3'?>><p><?=esc($step[1])?></p></li><?php endforeach;?></ol><p class="home-note"><?= $booking?'A request is pending until the business confirms it.':'An enquiry does not reserve a service or confirm a booking.' ?></p></section>
<?php endif;?>
<?php if(($page===''||$page==='areas')&&!empty($p['areas'])):?><section class="home-section home-areas" id="areas"><div><p class="home-eyebrow">CLOSE TO YOU</p><h2><?=esc(homepage_heading($p,'areas','Service areas'))?></h2><p>Check our coverage before requesting a visit.</p></div><?php if($page===''):?><a class="home-text-link" href="<?=esc($enquire?$url.'/areas':'profile.php?view=preview&section=areas')?>">View coverage details →</a><?php endif;?><div class="home-area-groups"><?php foreach(array_filter(array_map('trim',preg_split('/[\r\n]+/u',$p['areas'])?:[])) as $group):?><ul class="home-area-list"><?php foreach(array_values(array_unique(array_filter(array_map('trim',preg_split('/[·•]+/u',$group)?:[])))) as $area):?><li><?=esc($area)?></li><?php endforeach;?></ul><?php endforeach;?></div></section><?php endif;?>
<?php if($page===''||$page==='contact'):?><section class="home-section home-contact" id="contact"><div><p class="home-eyebrow">LET’S TALK</p><h2><?=esc(homepage_heading($p,'contact','How can we help?'))?></h2><p>Ask about a service or discuss your requirements.</p><div class="home-contact-links"><?php if(!empty($p['email'])):?><a href="mailto:<?=esc($p['email'])?>"><?=esc($p['email'])?></a><?php endif;?><?php if(!empty($p['phone'])):?><a href="tel:<?=esc(preg_replace('/[^+0-9]/','',$p['phone']))?>"><?=esc($p['phone'])?></a><?php endif;?><?php if(!empty($p['presentation']['whatsapp'])):?><a href="<?=esc('https://wa.me/'.$p['presentation']['whatsapp'])?>" rel="noopener noreferrer">WhatsApp</a><?php endif;?><?php if(!empty($p['website'])):?><a href="<?=esc($p['website'])?>" rel="nofollow noopener noreferrer">Visit website ↗</a><?php endif;?></div>
<?php $address=array_filter(array_map(fn($key)=>trim($p['presentation'][$key]??''),['street','city','region','postal','country']));if($address):?><address><?=esc(implode(', ',$address))?></address><?php endif;?>
<?php if(array_filter($p['hours']??[])):?><details><summary>Opening hours</summary><p><?=esc(str_replace('_',' ',$zone))?></p><dl class="hours-list"><?php foreach(profile_days() as $i=>$day):?><div><dt><?=$day?></dt><dd><?=!empty($p['hours'][$i])?esc(implode(' – ',$p['hours'][$i])):'Closed'?></dd></div><?php endforeach;?></dl></details><?php endif;?></div>
<div class="home-enquiry-slot"><?php if($enquire&&isset($GLOBALS['homepage_enquiry'])):call_user_func($GLOBALS['homepage_enquiry']);else:?><p>Enquiries are available on the published business page.</p><?php endif;?></div></section>
<?php endif;?>
<footer class="home-footer"><div><strong><?=esc($p['name'])?></strong><p><?=date('Y')?> · <a href="<?=esc(cfg()['base_url'].'/privacy.html#overview')?>">Privacy</a></p></div><nav aria-label="Footer navigation"><?php foreach(business_page_defaults() as $key=>$unused):?><a href="<?=esc($enquire?$url.'/'.$key:'profile.php?view=preview&section='.$key)?>"><?=esc($unused['label'])?></a><?php endforeach;?></nav><a href="#homepage">Back to top ↑</a><span>Powered by FaraiOS</span></footer>
</div>
<?php }

function business_page_defaults(): array {
 return [
 'services'=>['label'=>'Services','title'=>'Services','introduction'=>'Explore our services, then tell us what you need.','body'=>''],
 'how-it-works'=>['label'=>'How it works','title'=>'How it works','introduction'=>'Tell us what you need, discuss your requirements and agree the next steps with the business.','body'=>''],
 'areas'=>['label'=>'Areas','title'=>'Service areas','introduction'=>'Check our coverage before requesting a visit.','body'=>''],
 'contact'=>['label'=>'Contact','title'=>'Contact us','introduction'=>'Ask about a service or discuss your requirements.','body'=>'']];
}
function business_page_content(array $p,string $key): array {
 $content=business_page_defaults()[$key];foreach(['title','introduction','body'] as $field){$v=trim($p['pages'][$key][$field]??'');if($v!=='')$content[$field]=$v;}return $content;
}
function business_page_steps(array $p,bool $booking=true): array {
 if(!$booking)return [['Send an enquiry','Tell us what you need and how to contact you.'],['Discuss your requirements','The business will respond to discuss the details.'],['Agree next steps','Confirm the service arrangements directly with the business.']];
 $default=[['Choose service','Find the service that fits your needs.'],['Request a time','Share your details and preferred date and time.'],['Get confirmation','The business reviews your request and confirms with you.']];
 foreach($default as $i=>&$step)foreach([0,1] as $j){$value=trim($p['pages']['how-it-works']['steps'][$i][$j]??'');if($value!=='')$step[$j]=$value;}unset($step);return $default;
}
function business_pages_form_values(): array {
 $pages=[];foreach(business_page_defaults() as $key=>$default){$pages[$key]=[];foreach(['title','introduction','body'] as $field)$pages[$key][$field]=is_string($_POST['pages'][$key][$field]??null)?substr($_POST['pages'][$key][$field],0,12000):'';}
 $pages['how-it-works']['steps']=[];for($i=0;$i<3;$i++){$pages['how-it-works']['steps'][$i]=[];for($j=0;$j<2;$j++)$pages['how-it-works']['steps'][$i][$j]=is_string($_POST['pages']['how-it-works']['steps'][$i][$j]??null)?substr($_POST['pages']['how-it-works']['steps'][$i][$j],0,2400):'';}
 return $pages;
}
function business_pages_values(): array {
 $pages=business_pages_form_values();foreach($pages as $key=>&$content){foreach(['title'=>120,'introduction'=>600,'body'=>3000] as $field=>$limit){$content[$field]=trim($content[$field]);business_page_text_valid($content[$field],$limit);}
 if(isset($content['steps']))foreach($content['steps'] as &$step)foreach($step as $j=>&$value){$value=trim($value);business_page_text_valid($value,$j===0?120:600);}unset($value,$step);
 }unset($content);return $pages;
}
function business_page_text_valid(string $value,int $limit): void {
 if(!preg_match('//u',$value)||mb_len($value)>$limit||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$value))throw new RuntimeException('Check page content length and characters.');
}
