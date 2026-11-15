"""Build a separate live-role preparation candidate; never deploy or enable it."""
import importlib.util,shutil,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def stage(destination):
 spec=importlib.util.spec_from_file_location('shared',ROOT/'docs/sc04/shared.py')
 shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
 target=shared.stage(destination)
 for name in ['access.php','join.php','workspace.css']:
  shutil.copyfile(ROOT/'docs/sc04'/name,target/'account'/name)
 # Keep platform UI aligned with the server-selected environment, including GET selection.
 p=target/'account/context.php';s=p.read_text()
 needle="if($_SERVER['REQUEST_METHOD']==='POST'){"
 s=s.replace(needle,"$environment=(parse_url(cfg()['base_url'],PHP_URL_PATH)?:'')===''?'live':'preview';$contexts=array_values(array_filter($contexts,fn($c)=>$c['environment']===$environment));\n "+needle)
 p.write_text(s)
 p=target/'account/context.php';s=p.read_text().replace('<a href="index.php?page=business">Create your business</a>','<a href="join.php">Join a business</a> · <a href="index.php?page=business">Create your business</a>');p.write_text(s)
 p=target/'account/account-view.php';s=p.read_text().replace('<h1>Account</h1>','<h1>Account</h1><p><a href="access.php">Manage access</a> · <a href="join.php">Join a business</a></p>',1);p.write_text(s)
 p=target/'account/layout.php';s=p.read_text();s=s.replace(" ?><a class=", " $links['Access']=['access.php','M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7z'];\n ?><a class=",1);p.write_text(s)
 p=target/'account/core.php';s=p.read_text();needle="  if(str_starts_with($path,'/rest/v1/rpc/business_invoice_'))"
 safe="""  if(in_array($path,['/rest/v1/rpc/business_delegate_command','/rest/v1/rpc/business_delegate_read','/rest/v1/rpc/business_invite_create','/rest/v1/rpc/business_invite_accept','/rest/v1/rpc/business_invite_revoke','/rest/v1/rpc/business_membership_revoke','/rest/v1/rpc/business_access_list','/rest/v1/rpc/business_worker_link'],true)){
   if($status===401)throw new AccountSessionExpired('Your session has expired. Please sign in again.');
   if($status===403)throw new RuntimeException('Access is unavailable for this business or action.');
   throw new RuntimeException('The record changed or the details are invalid. Reload and check before trying again.');
  }
"""
 if needle not in s:raise ValueError('API error source drift')
 p.write_text(s.replace(needle,safe+needle,1))
 p=target/'account/delegated.php';s=p.read_text();start=s.index('<style>');end=s.index('</style>',start)+len('</style>');s=s[:start]+'<link rel="stylesheet" href="workspace.css">'+s[end:];s=s.replace('<main>','<main class="role-workspace">',1);p.write_text(s)
 return target
if __name__=='__main__':stage(Path(sys.argv[1]))
