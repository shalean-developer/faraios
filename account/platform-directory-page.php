<?php
declare(strict_types=1);
require_once __DIR__.'/platform-directory.php';
require_once __DIR__.'/platform-navigation.php';
platform_directory_headers();
$resource=$_GET['view']??'businesses';
$resource=is_string($resource)?$resource:'';
$query=$_GET;unset($query['view']);
$data=null;$error='';$status=200;
try {$data=platform_directory()->read($_SERVER['REQUEST_METHOD']??'GET',$resource,$query);}
catch(PlatformDirectoryError $e){$status=$e->status;$error=$e->getMessage();}
catch(Throwable $e){$status=503;$error='Directory data is unavailable. Try again later.';}
http_response_code($status);
if($status===405)header('Allow: GET');
if(session_status()===PHP_SESSION_ACTIVE)session_write_close();
$title=['businesses'=>'Businesses','users'=>'Users'][$resource]??'Directory';
$search=is_string($query['q']??null)&&strlen($query['q'])<=100?$query['q']:'';
function directory_fact(?bool $value):string{return $value===null?'Unknown':($value?'Yes':'No');}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=platform_directory_escape($title)?> | FaraiOS platform</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="platform.css?v=20261116-group1"><link rel="stylesheet" href="platform-directory.css?v=20261118"></head><body>
<a class="skip" href="#main">Skip to content</a><header class="top"><a href="platform.php" aria-label="FaraiOS platform home"><img src="../FaraiOS-logo.svg" alt="FaraiOS" width="153" height="45"></a><span class="workspace-label">Platform owner</span><a class="account-link" href="index.php?page=welcome">My account <span aria-hidden="true">↗</span></a></header>
<div class="shell"><aside><p class="nav-label">WORKSPACE</p><?=platform_workspace_navigation($resource,$data!==null)?><div class="sidebar-note"><strong>Build. Grow. Manage.</strong><p>Your path to a dependable first release.</p></div></aside><main id="main" tabindex="-1">
<div class="heading"><div><p class="eyebrow">Platform · read-only</p><h1><?=platform_directory_escape($title)?></h1><p class="intro">Registration and setup facts. These records cannot be edited here.</p></div><a href="platform.php?view=overview">Back to development</a></div>
<?php if($error):?><section class="panel"><h2><?=$status===403?'Platform owner access required':'Directory unavailable'?></h2><p role="alert"><?=platform_directory_escape($error)?></p><?php if($status===401):?><a class="button" href="index.php?page=signin">Sign in again</a><?php else:?><a href="platform-directory-page.php?view=<?=in_array($resource,['businesses','users'],true)?$resource:'businesses'?>">Reload directory</a><?php endif;?></section>
<?php else:?>
<form method="get" class="filters" role="search"><input type="hidden" name="view" value="<?=platform_directory_escape($resource)?>"><label for="directory-search"><?=$resource==='businesses'?'Search business name or ID':'Search user ID'?><input id="directory-search" name="q" type="search" maxlength="100" value="<?=platform_directory_escape($search)?>"></label><button class="button secondary" type="submit">Search</button><a href="platform-directory-page.php?view=<?=$resource?>">Clear</a></form>
<p class="muted">Checked <time datetime="<?=platform_directory_escape($data['observed_at'])?>"><?=platform_directory_escape($data['observed_at'])?></time> · UTC. Setup facts are independent; a saved profile does not mean it is published.</p>
<section class="tasks" aria-label="<?=platform_directory_escape($title)?> results">
<?php foreach($data['rows'] as $row):?><article class="task-card directory-record"><h2><?=platform_directory_escape($resource==='businesses'?$row['name']:'User '.$row['id'])?></h2><p class="directory-id"><?=platform_directory_escape($row['id'])?></p><p class="muted">Registered <time datetime="<?=platform_directory_escape($row['registered_at'])?>"><?=platform_directory_escape($row['registered_at'])?></time></p>
<?php if($resource==='businesses'):?><dl class="directory-facts"><?php foreach(['location_configured'=>'Location configured','service_configured'=>'Service configured','profile_saved'=>'Profile saved','published'=>'Published'] as $key=>$label):?><div><dt><?=$label?></dt><dd><?=directory_fact($row[$key])?></dd></div><?php endforeach;?></dl>
<?php else:?><p>Email verified: <strong><?=directory_fact($row['email_verified'])?></strong></p><h3>Business associations</h3><?php if($row['business_associations']===null):?><p>Unknown</p><?php elseif(!$row['business_associations']):?><p>No business associations recorded.</p><?php else:?><ul class="directory-associations"><?php foreach($row['business_associations'] as $association):?><li><span class="directory-id"><?=platform_directory_escape($association['business_id'])?></span> · <?=platform_directory_escape(ucfirst($association['role']))?> · <?=$association['active']?'Active':'Inactive'?></li><?php endforeach;?></ul><?php endif;endif;?></article><?php endforeach;?>
<?php if(!$data['rows']):?><div class="panel"><h2>No matching records</h2><p>Clear your search or return to the first page.</p><a href="platform-directory-page.php?view=<?=$resource?>">First page</a></div><?php endif;?></section>
<nav class="pager" aria-label="Directory pages"><?php foreach(['Previous'=>-1,'Next'=>1] as $label=>$step):$target=$data['page']+$step;$available=$target>=1&&$target<=9999&&($step<0||$data['has_more']);if($available):?><a class="button secondary" href="platform-directory-page.php?<?=platform_directory_escape(http_build_query(['view'=>$resource,'page'=>$target,'q'=>$search]))?>"><?=$label?></a><?php else:?><span class="button secondary disabled" aria-disabled="true"><?=$label?></span><?php endif;endforeach;?><span>Page <?=$data['page']?> · Up to <?=$data['page_size']?> records</span></nav>
<?php endif;?><footer class="workspace-footer">FaraiOS · Platform workspace <span>Read-only registration and setup information.</span></footer></main></div></body></html>
