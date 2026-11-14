<?php
declare(strict_types=1);
function benefit_icons(): array {return ['home'=>'House','calendar'=>'Calendar','message'=>'Message','check'=>'Check','heart'=>'Heart','star'=>'Star'];}
function benefit_section(array $h): array {
 if(isset($h['benefit_section']))return $h['benefit_section'];
 return ['title'=>'What makes us different.','visible'=>true,'cards'=>array_map(fn($v)=>['icon'=>'check','title'=>$v,'description'=>''],$h['benefits']??[])];
}
function benefit_form_values(): array {
 $cards=[];foreach(is_array($_POST['benefit_cards']??null)?$_POST['benefit_cards']:[] as $row){$row=is_array($row)?$row:[];$card=[];foreach(['icon','title','description'] as $key)$card[$key]=is_string($row[$key]??null)?trim($row[$key]):'';if($card['title']!==''||$card['description']!=='')$cards[]=$card;}
 return ['title'=>is_string($_POST['benefit_heading']??null)?trim($_POST['benefit_heading']):'','visible'=>isset($_POST['show_benefits']),'cards'=>$cards];
}
function benefit_values(): array {
 if(!is_array($_POST['benefit_cards']??null)||count($_POST['benefit_cards'])>6)throw new RuntimeException('Add up to six benefit cards.');
 $section=benefit_form_values();business_page_text_valid($section['title'],120);if(preg_match('/[\x00-\x1f\x7f]/',$section['title']))throw new RuntimeException('Keep the section heading on one line.');
 foreach($section['cards'] as $card){if(!isset(benefit_icons()[$card['icon']])||$card['title']==='')throw new RuntimeException('Choose an icon and add a title for each benefit.');foreach(['title','description'] as $key){business_page_text_valid($card[$key],200);if(preg_match('/[\x00-\x1f\x7f]/',$card[$key]))throw new RuntimeException('Use a single line for each benefit field.');}}
 return $section;
}
function benefit_icon(string $name): string {
 $paths=['home'=>'M3 10 12 3l9 7v11h-6v-7H9v7H3Z','calendar'=>'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2','message'=>'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1-1-4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6','check'=>'m5 12 4 4L19 6','heart'=>'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z','star'=>'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z'];
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="'.($paths[$name]??$paths['check']).'"/></svg>';
}
function benefit_editor(array $h): void {
 $section=benefit_section($h);?>
<fieldset class="benefit-editor"><legend>Why choose us</legend><input type="hidden" name="benefit_editor" value="1">
<label class="check"><input type="checkbox" name="show_benefits" <?=$section['visible']?'checked':''?>>Show this section</label>
<label for="benefit-heading">Section heading</label><input id="benefit-heading" name="benefit_heading" maxlength="120" placeholder="What makes us different." value="<?=esc($section['title'])?>"><small>Add up to six cards. Leave unused cards blank. Empty sections are hidden.</small>
<?php for($i=0;$i<6;$i++):$card=$section['cards'][$i]??['icon'=>'check','title'=>'','description'=>''];?><details class="benefit-editor-card"><summary>Benefit <?=$i+1?></summary>
<label for="benefit-icon-<?=$i?>">Icon</label><select id="benefit-icon-<?=$i?>" name="benefit_cards[<?=$i?>][icon]"><?php foreach(benefit_icons() as $value=>$label):?><option value="<?=$value?>" <?=$card['icon']===$value?'selected':''?>><?=$label?></option><?php endforeach;?></select>
<label for="benefit-title-<?=$i?>">Title</label><input id="benefit-title-<?=$i?>" name="benefit_cards[<?=$i?>][title]" maxlength="200" value="<?=esc($card['title'])?>">
<label for="benefit-description-<?=$i?>">Short description</label><input id="benefit-description-<?=$i?>" name="benefit_cards[<?=$i?>][description]" maxlength="200" value="<?=esc($card['description'])?>">
</details><?php endfor;?>
</fieldset>
<?php }
