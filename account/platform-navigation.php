<?php
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__) {http_response_code(404);exit;}
function platform_workspace_navigation(string $current, bool $directory=false): string {
 $html='<nav aria-label="Platform"><details class="nav-group" open><summary><span class="nav-symbol" aria-hidden="true">▣</span>Development<span class="nav-chevron" aria-hidden="true">›</span></summary><div class="nav-children">';
 foreach(['overview'=>'Overview','tasks'=>'Tasks','defects'=>'Defects','releases'=>'Releases','history'=>'History','review'=>'UI review'] as $key=>$label) {
  $html.='<a href="platform.php?view='.$key.'"'.($current===$key?' aria-current="page"':'').'>'.$label.'</a>';
 }
 $html.='</div></details>';
 if ($directory) {
  $html.='<details class="nav-group" open><summary><span class="nav-symbol" aria-hidden="true">◫</span>Platform<span class="nav-chevron" aria-hidden="true">›</span></summary><div class="nav-children">';
  $html.='<a href="platform-overview-page.php"'.($current==='platform-overview'?' aria-current="page"':'').'>Platform overview</a>';
  $html.='<a href="platform-monitoring-page.php"'.($current==='monitoring'?' aria-current="page"':'').'>Monitoring</a>';
  foreach(['businesses'=>'Businesses','users'=>'Users'] as $key=>$label) $html.='<a href="platform-directory-page.php?view='.$key.'"'.($current===$key?' aria-current="page"':'').'>'.$label.'</a>';
  $html.='</div></details>';
 }
 return $html.'</nav>';
}
