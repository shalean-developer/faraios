<?php
require __DIR__.'/account/core.php';require __DIR__.'/account/profile-core.php';require __DIR__.'/business/homepage.php';
$_SERVER['SCRIPT_NAME']=preg_replace('~/sitemap.php$~','/account/index.php',$_SERVER['SCRIPT_NAME']);
header('Content-Type: application/xml; charset=UTF-8');header('X-Content-Type-Options: nosniff');header('Cache-Control: no-store');header('X-Robots-Tag: noindex');
try {
 $base=rtrim(cfg()['base_url'],'/');$environment=profile_env();$urls=[];
 if($environment==='live') {
  $urls[]=$base.'/';
  // Enumerate the public snapshot slug allowlist with stable keyset pagination. No drafts or IDs.
  $last='';$seen=[];
  do {
   $rows=api('/rest/v1/business_public_pages?environment=eq.live&select=slug&order=slug.asc&limit=500'.($last!==''?'&slug=gt.'.rawurlencode($last):''),[],'GET');
   foreach($rows as $row){if(!is_string($row['slug']??null)||$row['slug']<=$last||isset($seen[$row['slug']]))throw new RuntimeException('Invalid sitemap page');$seen[$row['slug']]=true;$last=$row['slug'];}
   $urls=array_merge($urls,business_sitemap_urls($rows,$base,$environment));
   // Never silently emit a truncated sitemap. A sitemap index is required beyond the protocol limit.
   if(count($urls)>50000)throw new RuntimeException('Sitemap index required');
  }while(count($rows)===500);
 }
 echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
 foreach($urls as $url)echo '<url><loc>'.htmlspecialchars($url,ENT_QUOTES|ENT_XML1,'UTF-8').'</loc></url>';
 echo '</urlset>';
} catch(Throwable $e){http_response_code(503);header('Retry-After: 60');echo '<?xml version="1.0" encoding="UTF-8"?><error>Sitemap temporarily unavailable</error>';}
