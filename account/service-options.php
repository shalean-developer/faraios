<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function option_amount(string $v,string $currency): int {
 if(!preg_match(in_array($currency,['JPY','UGX','RWF'],true)?'/\A[0-9]{1,7}\z/':'/\A[0-9]{1,7}(?:\.[0-9]{1,2})?\z/',$v))throw new RuntimeException('Check room and extra prices.');
 $parts=explode('.',$v);$n=(int)$parts[0]*100+(int)str_pad($parts[1]??'',2,'0');if($n>999999999)throw new RuntimeException('Option price exceeds the maximum.');return $n;
}
function options_values(string $currency): array {
 $rows=[];$ids=[];$kinds=[];
 for($i=0;$i<19;$i++){
 if(!isset($_POST['option_enabled_'.$i]))continue;
 $o=[];foreach(['id','name','kind','minimum','maximum','included','price','minutes'] as $k){$v=$_POST['option_'.$k.'_'.$i]??'';if(!is_string($v))throw new RuntimeException('Check room and extra settings.');$o[$k]=trim($v);}
 if(!preg_match('/\A[a-f0-9]{32}\z/',$o['id'])||in_array($o['id'],$ids,true)||!in_array($o['kind'],['bedrooms','bathrooms','room','extra','toggle'],true)||!preg_match('//u',$o['name'])||preg_match('/[\x00-\x1f\x7f]/',$o['name'])||mb_len($o['name'])<2||mb_len($o['name'])>100)throw new RuntimeException('Check room and extra names and types.');
 foreach(['minimum','maximum','included','minutes'] as $k){if(!preg_match('/\A[0-9]{1,5}\z/',$o[$k]))throw new RuntimeException('Enter whole option quantities and minutes.');$o[$k]=(int)$o[$k];}
 if($o['minimum']>$o['maximum']||$o['maximum']>9999||$o['included']>$o['maximum']||$o['minutes']>10080||($o['kind']==='toggle'&&$o['maximum']!==1))throw new RuntimeException('Check option limits; selectable extras must have a maximum of 1.');
 if(in_array($o['kind'],['bedrooms','bathrooms'],true)&&in_array($o['kind'],$kinds,true))throw new RuntimeException('Use one Bedrooms and one Bathrooms option per service.');
 $o['price']=option_amount($o['price'],$currency);$rows[]=$o;$ids[]=$o['id'];$kinds[]=$o['kind'];
 }return $rows;
}
function options_editor(array $s,string $currency): void {
 echo '<section class="service-options"><h3>Rooms and extras</h3><p class="muted">Enable the options for this service. The base price includes the included quantities. Additional prices and minutes apply only above those quantities. Save draft, then publish.</p>';
 for($i=0;$i<19;$i++){
 $saved=$s['options'][$i]??null;$o=$saved??['id'=>bin2hex(random_bytes(16)),'name'=>$i===0?'Bedrooms':($i===1?'Bathrooms':''),'kind'=>$i===0?'bedrooms':($i===1?'bathrooms':'toggle'),'minimum'=>0,'maximum'=>$i<2?10:1,'included'=>0,'price'=>0,'minutes'=>0];
 $posted=$_SERVER['REQUEST_METHOD']==='POST'&&($_POST['action']??'')==='save';$enabled=$posted?isset($_POST['option_enabled_'.$i]):$saved!==null;
 if($posted)foreach(array_keys($o) as $k)if(is_string($_POST['option_'.$k.'_'.$i]??null))$o[$k]=$_POST['option_'.$k.'_'.$i];
 echo '<details class="option-editor"'.($enabled?' open':'').'><summary>'.esc($o['name']?:'Add room or extra').'</summary><label class="check"><input type="checkbox" name="option_enabled_'.$i.'"'.($enabled?' checked':'').'>Available for this service</label><input type="hidden" name="option_id_'.$i.'" value="'.esc($o['id']).'"><label for="option_name_'.$i.'">Name</label><input id="option_name_'.$i.'" name="option_name_'.$i.'" maxlength="100" value="'.esc($o['name']).'"><label for="option_kind_'.$i.'">Type</label><select id="option_kind_'.$i.'" name="option_kind_'.$i.'">';
 foreach(['bedrooms'=>'Bedrooms','bathrooms'=>'Bathrooms','room'=>'Extra room','extra'=>'Extra with quantity','toggle'=>'Selectable extra'] as $k=>$name)echo '<option value="'.$k.'"'.($o['kind']===$k?' selected':'').'>'.$name.'</option>';echo '</select><div class="option-fields">';
 foreach(['minimum'=>'Minimum quantity','maximum'=>'Maximum quantity','included'=>'Included quantity','price'=>'Additional unit price · '.$currency,'minutes'=>'Additional minutes per unit'] as $k=>$label){$v=$k==='price'&&!$posted?number_format((int)$o[$k]/100,in_array($currency,['JPY','UGX','RWF'],true)?0:2,'.',''):(string)$o[$k];echo '<div><label for="option_'.$k.'_'.$i.'">'.esc($label).'</label><input id="option_'.$k.'_'.$i.'" name="option_'.$k.'_'.$i.'" '.($k==='price'?'inputmode="decimal"':'type="number" min="0" step="1" max="'.($k==='minutes'?'10080':'9999').'"').' value="'.esc($v).'"></div>';}
 echo '</div></details>';
 }echo '<small>Up to 19 options per service. For selectable extras, use minimum 0 and maximum 1.</small></section>';
}
function scope_render(array $d): void {
 if(!isset($d['scope']))return;$s=$d['scope'];echo '<section class="saved-scope"><h3>Rooms and extras</h3><ul>';
 foreach($s['rows'] as $o)if($o['quantity']>0)echo '<li>'.esc($o['name']).': '.(int)$o['quantity'].' <span class="muted">('.(int)$o['included'].' included)</span></li>';
 echo '</ul><p class="muted">Requested duration: '.(int)$s['minutes'].' minutes. '.($s['service']['mode']==='quote'?'Quote required.':($s['service']['mode']==='from'?'Requested starting price; agreed items appear above.':'Captured service scope.')).'</p></section>';
}
