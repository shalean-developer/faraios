<?php
declare(strict_types=1);
// Snapshot-only SEO. No credentials, private records or request host values enter output.
function business_website_enabled(string $environment): bool {return in_array($environment,['preview','live'],true);}
function business_seo_keys(): array {return ['home'=>'Homepage']+array_map(fn($v)=>$v['label'],business_page_defaults());}
function business_seo_form_values(): array {
 $s=['pages'=>[],'image_alt'=>is_string($_POST['seo']['image_alt']??null)?substr($_POST['seo']['image_alt'],0,800):''];
 foreach(business_seo_keys() as $key=>$label){$s['pages'][$key]=[];foreach(['title','description','image'] as $field)$s['pages'][$key][$field]=is_string($_POST['seo']['pages'][$key][$field]??null)?substr($_POST['seo']['pages'][$key][$field],0,2000):($field==='image'?'auto':'');}
 return $s;
}
function business_seo_values(array $old): array {
 $s=business_seo_form_values();foreach($s['pages'] as &$page){foreach(['title'=>120,'description'=>300] as $key=>$limit){$page[$key]=trim($page[$key]);business_page_text_valid($page[$key],$limit);}if(!in_array($page['image'],['auto','hero','logo','none'],true))throw new RuntimeException('Choose a sharing image.');}unset($page);
 $s['image_alt']=trim($s['image_alt']);business_page_text_valid($s['image_alt'],200);
 $s['image']=isset($_POST['remove_social'])?null:($old['image']??null);$f=$_FILES['social_image']??null;
 if($f&&$f['error']!==UPLOAD_ERR_NO_FILE){if($f['error']!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name']))throw new RuntimeException('The sharing image could not upload.');$s['image']=profile_logo(file_get_contents($f['tmp_name']));}
 if($s['image']&&$s['image_alt']==='')throw new RuntimeException('Describe your sharing image.');return $s;
}
function business_seo_text(string $text,int $limit): string {
 $text=trim(preg_replace('/\s+/u',' ',$text)??'');preg_match_all('/./us',$text,$chars);return implode('',array_slice($chars[0],0,$limit));
}
function business_page_url(string $base,string $slug,string $page=''): string {return rtrim($base,'/').'/b/'.$slug.($page!==''?'/'.$page:'');}
function business_seo_metadata(array $p,string $page,string $url,string $root): array {
 $key=$page?:'home';$content=$page!==''?business_page_content($p,$page):null;$settings=$p['seo']['pages'][$key]??[];
 $title=trim($settings['title']??'')?:($content?$content['title'].' | '.$p['name']:$p['name']);
 $description=trim($settings['description']??'')?:($content?$content['introduction'].' '.$p['name'].'.':(trim($p['homepage']['introduction']??'')?:($p['description']??'')));
 if(trim($description)==='')$description='Explore services and contact '.$p['name'].'.';
 $choice=$settings['image']??'auto';$image=null;$alt='';
 if($choice==='auto'&&!empty($p['seo']['image'])){$image='social';$alt=$p['seo']['image_alt'];}
 elseif(in_array($choice,['auto','hero'],true)&&!empty($p['homepage']['image'])){$image='hero';$alt=$p['homepage']['image_alt'];}
 elseif(in_array($choice,['auto','logo'],true)&&!empty($p['logo'])){$image='logo';$alt=$p['name'].' logo';}
 $blob=$image==='social'?($p['seo']['image']??null):($image==='hero'?($p['homepage']['image']??null):($image==='logo'?($p['logo']??null):null));
 $dimensions=$blob?@getimagesizefromstring(base64_decode($blob['data'],true)?:''):false;
 return ['title'=>business_seo_text($title,120),'description'=>business_seo_text($description,300),'url'=>$url,'image'=>$image?$root.'?'.$image.'=1':'','alt'=>$alt,'width'=>$dimensions?$dimensions[0]:null,'height'=>$dimensions?$dimensions[1]:null];
}
function business_schema(array $p,string $page,string $root,string $url,array $meta): array {
 // No address is collected. Organization avoids fabricating a LocalBusiness address or eligibility.
 $org=['@type'=>'Organization','@id'=>$root.'#business','name'=>$p['name'],'url'=>$root];
 foreach(['description'=>'description','email'=>'email','phone'=>'telephone','areas'=>'areaServed'] as $field=>$property)if(trim($p[$field]??'')!=='')$org[$property]=$p[$field];
 if(!empty($p['logo']))$org['logo']=$root.'?logo=1';if($meta['image']!=='')$org['image']=$meta['image'];
 $crumbs=[['@type'=>'ListItem','position'=>1,'name'=>$p['name'],'item'=>$root]];
 if($page!=='')$crumbs[]=['@type'=>'ListItem','position'=>2,'name'=>business_page_content($p,$page)['title'],'item'=>$url];
 return ['@context'=>'https://schema.org','@graph'=>[$org,['@type'=>'BreadcrumbList','@id'=>$url.'#breadcrumbs','itemListElement'=>$crumbs],['@type'=>$page==='contact'?'ContactPage':($page==='services'?'CollectionPage':'WebPage'),'@id'=>$url.'#page','url'=>$url,'name'=>$meta['title'],'description'=>$meta['description'],'about'=>['@id'=>$root.'#business'],'breadcrumb'=>['@id'=>$url.'#breadcrumbs']]]];
}
function business_seo_head(?array $p,string $page,string $base,string $slug,bool $indexable,bool $booking=false): void {
 echo '<meta name="robots" content="'.($indexable?'index,follow':'noindex,nofollow').'">';
 if(!$p){echo '<title>'.(http_response_code()===503?'Page temporarily unavailable':'Page not found').' | FaraiOS</title>';return;}
 $root=business_page_url($base,$slug);$url=business_page_url($base,$slug,$page);$meta=business_seo_metadata($p,$page,$url,$root);
 echo '<title>'.esc($booking?'Request a booking | '.$p['name']:$meta['title']).'</title>';
 if($booking)return; // Booking URLs have no content-page canonical, social metadata or schema.
 echo '<meta name="description" content="'.esc($meta['description']).'"><link rel="canonical" href="'.esc($url).'">';
 foreach(['og:type'=>'website','og:site_name'=>$p['name'],'og:title'=>$meta['title'],'og:description'=>$meta['description'],'og:url'=>$url,'twitter:card'=>$meta['image']!==''?'summary_large_image':'summary','twitter:title'=>$meta['title'],'twitter:description'=>$meta['description']] as $key=>$value)echo '<meta '.(str_starts_with($key,'og:')?'property':'name').'="'.$key.'" content="'.esc($value).'">';
 if($meta['image']!==''){foreach(['og:image'=>$meta['image'],'og:image:alt'=>$meta['alt'],'twitter:image'=>$meta['image'],'twitter:image:alt'=>$meta['alt']] as $key=>$value)echo '<meta '.(str_starts_with($key,'og:')?'property':'name').'="'.$key.'" content="'.esc($value).'">';if($meta['width'])echo '<meta property="og:image:width" content="'.$meta['width'].'"><meta property="og:image:height" content="'.$meta['height'].'">';}
 echo '<script type="application/ld+json">'.json_encode(business_schema($p,$page,$root,$url,$meta),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR).'</script>';
}
// Only GET/HEAD content URLs normalize. Never redirect POSTs or alter booking state/query strings.
function business_normalize_url(string $base,string $slug,string $page,array $query,string $uri,string $method,string $authority='',string $scheme=''): ?string {
 if(!in_array($method,['GET','HEAD'],true)||isset($query['booking'])||isset($query['step'])||isset($query['hero'])||isset($query['logo'])||isset($query['social']))return null;
 $url=business_page_url($base,$slug,$page);$path=parse_url($uri,PHP_URL_PATH);$canonicalPath=parse_url($url,PHP_URL_PATH);
 $expectedAuthority=parse_url($base,PHP_URL_HOST).(($port=parse_url($base,PHP_URL_PORT))?':'.$port:'');
 if(($authority!==''&&$authority!==$expectedAuthority)||($scheme!==''&&$scheme!==parse_url($base,PHP_URL_SCHEME))||$path!==$canonicalPath||parse_url($uri,PHP_URL_QUERY)!==null)return $url;return null;
}
function business_sitemap_urls(array $rows,string $base,string $environment): array {
 if($environment!=='live')return [];
 $urls=[];foreach($rows as $row){$slug=$row['slug']??'';if(!is_string($slug)||!preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/',$slug)||strlen($slug)<3||strlen($slug)>64)continue;
 $urls[]=business_page_url($base,$slug);
 // Only reachable live website routes are included; preview environments return above.
 if(business_website_enabled($environment))foreach(business_page_defaults() as $key=>$unused)$urls[]=business_page_url($base,$slug,$key);
 }return array_values(array_unique($urls));
}
