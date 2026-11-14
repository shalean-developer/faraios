<?php
declare(strict_types=1);
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
function homepage_header(array $p,string $url,string $base,string $logo): void { ?>
<a class="home-skip" href="#homepage">Skip to content</a>
<header class="home-header booking-header">
 <a class="home-brand" href="<?=esc($url)?>"><?php if(!empty($p['logo'])):?><img src="<?=esc($logo)?>" alt="" width="40" height="40"><?php else:?><span class="home-mark" aria-hidden="true"><?=esc(strtoupper(substr($p['name'],0,1)))?></span><?php endif;?><span><?=esc($p['name'])?></span></a>
 <nav aria-label="Business navigation"><a href="#services">Services</a><a href="#how-it-works">How it works</a><?php if(!empty($p['areas'])):?><a href="#areas">Areas</a><?php endif;?><a href="#contact">Contact</a></nav>
 <div class="home-header-actions"><div class="booking-identity" data-header-session="<?=esc($base.'/account/header-session.php')?>" data-account-url="<?=esc($base.'/account/index.php')?>"><a class="booking-auth-button" href="<?=esc($base.'/account/index.php?page=signin')?>">Sign in</a></div><a class="home-button" href="<?=esc($url.'?booking=1')?>">Book now</a></div>
</header>
<?php }
function homepage_render(array $p,array $catalogue,string $zone,string $url,string $image,bool $enquire=true): void {
 $h=$p['homepage']??[];$items=array_filter($catalogue['items']??[],fn($s)=>!empty($s['visible'])&&empty($s['archived']));?>
<div class="business-home" id="homepage">
<section class="home-hero">
 <div class="home-hero-copy"><p class="home-eyebrow"><?=esc($p['name'])?></p><h1><?=esc(trim($h['headline']??'')?:$p['name'])?></h1>
 <?php $intro=trim($h['introduction']??'')?:($p['description']??'');if($intro!==''):?><p class="home-intro"><?=nl2br(esc($intro))?></p><?php endif;?>
 <div class="home-actions"><a class="home-button" href="<?=esc($url.'?booking=1')?>">Book now <span aria-hidden="true">↗</span></a><a class="home-text-link" href="#services">Explore services <span aria-hidden="true">→</span></a></div><p class="home-note">Choose a service and request your preferred time.</p>
 </div>
 <?php if(!empty($h['image'])):?><div class="home-hero-image"><img src="<?=esc($image)?>" alt="<?=esc($h['image_alt']??'')?>" width="1000" height="900" fetchpriority="high"></div><?php else:?><div class="home-hero-art" aria-hidden="true"><div class="home-orbit"></div><span class="home-art-letter"><?=esc(strtoupper(substr($p['name'],0,1)))?></span><div class="home-art-caption">A little more time<br>for what matters.</div></div><?php endif;?>
</section>
<section class="home-section" id="services"><div class="home-section-heading"><div><p class="home-eyebrow">OUR SERVICES</p><h2>Find the right service for you.</h2></div><p>Explore our services, then tell us what you need.</p></div>
 <?php if($items):?><div class="home-service-grid"><?php foreach($items as $i=>$s):?><article class="home-service-card"><span class="home-service-number" aria-hidden="true"><?=str_pad((string)($i+1),2,'0',STR_PAD_LEFT)?></span><h3><?=esc($s['name'])?></h3><p><?=nl2br(esc($s['description']??''))?></p><div class="home-service-bottom"><strong><?=esc($s['mode']==='quote'?'Quote required':services_price($s,$catalogue['currency']))?></strong><span><?=(int)$s['duration']?> minutes</span></div><?php if(!empty($s['options'])):?><small>Rooms and extras may change your total.</small><?php endif;?><a class="home-text-link" href="<?=esc($url.'?booking=1')?>">Choose service <span aria-hidden="true">→</span><span class="home-sr">: <?=esc($s['name'])?></span></a></article><?php endforeach;?></div><?php else:?><p>Contact us to discuss the service you need.</p><?php endif;?>
</section>
<?php if(!empty($h['benefits'])):?><section class="home-section home-benefits"><p class="home-eyebrow">WHY CHOOSE US</p><h2>What makes us different.</h2><ul><?php foreach($h['benefits'] as $benefit):?><li><span aria-hidden="true">✓</span><?=esc($benefit)?></li><?php endforeach;?></ul></section><?php endif;?>
<section class="home-section home-how" id="how-it-works"><p class="home-eyebrow">HOW IT WORKS</p><h2>A few steps. A simpler day.</h2><ol><?php foreach([['Choose service','Find the service that fits your needs.'],['Request a time','Share your details and preferred date and time.'],['Get confirmation','The business reviews your request and confirms with you.']] as $i=>$step):?><li><span class="home-step"><?=$i+1?></span><h3><?=$step[0]?></h3><p><?=$step[1]?></p></li><?php endforeach;?></ol><p class="home-note">A request is pending until the business confirms it.</p></section>
<?php if(!empty($p['areas'])):?><section class="home-section home-areas" id="areas"><div><p class="home-eyebrow">CLOSE TO YOU</p><h2>Service areas</h2><p>Check our coverage before requesting a visit.</p></div><p class="home-area-copy"><?=nl2br(esc($p['areas']))?></p></section><?php endif;?>
<section class="home-section home-contact" id="contact"><div><p class="home-eyebrow">LET’S TALK</p><h2>How can we help?</h2><p>Ask about a service or discuss your requirements.</p><div class="home-contact-links"><?php if(!empty($p['email'])):?><a href="mailto:<?=esc($p['email'])?>"><?=esc($p['email'])?></a><?php endif;?><?php if(!empty($p['phone'])):?><a href="tel:<?=esc(preg_replace('/[^+0-9]/','',$p['phone']))?>"><?=esc($p['phone'])?></a><?php endif;?><?php if(!empty($p['website'])):?><a href="<?=esc($p['website'])?>" rel="nofollow noopener noreferrer">Visit website ↗</a><?php endif;?></div>
<?php if(array_filter($p['hours']??[])):?><details><summary>Opening hours</summary><p><?=esc(str_replace('_',' ',$zone))?></p><dl class="hours-list"><?php foreach(profile_days() as $i=>$day):?><div><dt><?=$day?></dt><dd><?=!empty($p['hours'][$i])?esc(implode(' – ',$p['hours'][$i])):'Closed'?></dd></div><?php endforeach;?></dl></details><?php endif;?></div>
<div class="home-enquiry-slot"><?php if($enquire&&isset($GLOBALS['homepage_enquiry'])):call_user_func($GLOBALS['homepage_enquiry']);else:?><p>Enquiries are available on the published business page.</p><?php endif;?></div></section>
<footer class="home-footer"><div><strong><?=esc($p['name'])?></strong><p><?=date('Y')?> · <a href="<?=esc(cfg()['base_url'].'/privacy.html')?>">Privacy</a></p></div><a href="#homepage">Back to top ↑</a><span>Powered by FaraiOS</span></footer>
</div>
<?php }
