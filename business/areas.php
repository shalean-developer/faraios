<?php
declare(strict_types=1);
// Area pages are authored, never inferred from the coverage list.
function area_pages(array $p,bool $draft=false): array {return array_filter($p['area_pages']??[],fn($a)=>$draft||($a['published']??false)===true);}
function area_page_key(string $page): string {return str_starts_with($page,'areas/')?substr($page,6):'';}
function area_page_find(array $p,string $name,bool $draft=false): ?array {foreach(area_pages($p,$draft) as $a)if($a['name']===$name)return $a;return null;}
function area_pages_values(array $old): array {
 if(!isset($_POST['area_editor']))return $old['area_pages']??[];
 $rows=$_POST['area_pages']??[];if(!is_array($rows)||count($rows)>20)throw new RuntimeException('Add up to 20 area pages.');
 $out=[];$names=[];foreach($rows as $row){if(!is_array($row))throw new RuntimeException('Check the area page.');$a=[];
 foreach(['slug'=>64,'name'=>120,'title'=>120,'introduction'=>600,'coverage'=>3000,'seo_title'=>120,'seo_description'=>300,'action'=>80] as $k=>$limit){$v=$row[$k]??'';if(!is_string($v))throw new RuntimeException('Check your area text.');$a[$k]=trim($v);business_page_text_valid($a[$k],$limit);}
 if(implode('',array_values($a))==='')continue;
 if(!preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/',$a['slug'])||strlen($a['slug'])<2||isset($out[$a['slug']])||isset($names[$a['name']])||$a['name']==='')throw new RuntimeException('Use a unique area name and lowercase page address.');
 $a['published']=isset($row['published']);$a['services']=$row['services']??[];
 if(!is_array($a['services'])||count($a['services'])>50||count(array_unique($a['services'],SORT_REGULAR))!==count($a['services']))throw new RuntimeException('Choose valid services.');
 foreach($a['services'] as $id)if(!is_string($id)||!preg_match('/\A[a-f0-9]{32}\z/',$id))throw new RuntimeException('Choose a valid service.');
 if($a['published']&&($a['title']===''||$a['introduction']===''||$a['coverage']===''||$a['action']===''))throw new RuntimeException('Complete the title, introduction, coverage and enquiry label before marking an area ready to publish.');
 $names[$a['name']]=true;$out[$a['slug']]=$a;
 }return $out;
}
function area_pages_editor(array $p,array $catalogue): void {
 echo '<details><summary>Area pages</summary><p>Write useful, original coverage details. Names must match coverage chips exactly to link them. Save and preview first. Ready to publish pages become public only when you explicitly publish the business draft. Unchecked pages stay private. This also publishes other saved business changes.</p><input type="hidden" name="area_editor" value="1">';
 $rows=array_values($p['area_pages']??[]);if(count($rows)<20)$rows[]=[];
 foreach($rows as $i=>$a){echo '<details class="benefit-editor-card"><summary>'.esc($a['name']??'Add area page').'</summary>';
 foreach(['slug'=>['Page address',64],'name'=>['Exact coverage area name',120],'title'=>['Title',120],'introduction'=>['Introduction',600],'coverage'=>['Coverage details',3000],'seo_title'=>['SEO title',120],'seo_description'=>['SEO description',300],'action'=>['Enquiry button label',80]] as $k=>$v){$id='area-'.$i.'-'.$k;echo '<label for="'.$id.'">'.$v[0].'</label><textarea id="'.$id.'" name="area_pages['.$i.']['.$k.']" maxlength="'.$v[1].'" rows="'.($v[1]>300?3:1).'">'.esc($a[$k]??'').'</textarea>';}
 echo '<fieldset><legend>Available services</legend>';foreach($catalogue['items']??[] as $s)if(!empty($s['visible'])&&empty($s['archived']))echo '<label class="check"><input type="checkbox" name="area_pages['.$i.'][services][]" value="'.esc($s['id']).'" '.(in_array($s['id'],$a['services']??[],true)?'checked':'').'>'.esc($s['name']).'</label>';echo '</fieldset><label class="check"><input type="checkbox" name="area_pages['.$i.'][published]" '.(!empty($a['published'])?'checked':'').'>Ready to publish with business draft</label>';
 if(!empty($a['slug']))echo '<p><a href="profile.php?view=preview&amp;area='.esc($a['slug']).'">Preview saved area draft</a></p>';echo '</details>';}
 echo '</details>';
}
function area_page_render(array $p,array $a,array $catalogue,string $root,bool $draft=false): void {
 echo '<div class="business-home business-standalone'.esc(business_style_classes($p)).'"><nav class="home-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="'.esc($draft?'profile.php?view=preview':$root).'">'.esc($p['name']).'</a></li><li><a href="'.esc($draft?'profile.php?view=preview&section=areas':$root.'/areas').'">Areas</a></li><li aria-current="page">'.esc($a['name']).'</li></ol></nav><article class="home-page-intro"><h1>'.esc($a['title']?:$a['name']).'</h1><p class="home-intro">'.nl2br(esc($a['introduction'])).'</p><h2>Coverage details</h2><div class="home-page-body">'.nl2br(esc($a['coverage'])).'</div><h2>Available services</h2><ul>';
 foreach($catalogue['items']??[] as $s)if(!empty($s['visible'])&&empty($s['archived'])&&in_array($s['id'],$a['services'],true))echo '<li><a href="'.esc($draft?'profile.php?view=preview&section=services':$root.'/services#service-'.$s['id']).'">'.esc($s['name']).'</a></li>';
 echo '</ul><p><a class="home-button" href="'.esc($draft?'profile.php?view=preview&section=contact':$root.'/contact#enquire').'">'.esc($a['action']?:'Enquire').'</a></p></article></div>';
}
