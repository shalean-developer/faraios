"""Build a disposable application candidate; never edits the source runtime or deploys."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[2]
def stage(destination):
 destination=Path(destination)
 if destination.exists():raise ValueError('Candidate destination must not exist')
 shutil.copytree(ROOT,destination,ignore=shutil.ignore_patterns('.git','test-results','__pycache__'))
 core=destination/'account/core.php';s=core.read_text()
 old="function business(): ?array {$b=api('/rest/v1/businesses?select=id,name,business_type,country,time_zone&limit=1',[],'GET',$_SESSION['auth']['access_token']);return $b[0]??null;}"
 new="""function business(): ?array {
 $environment=(parse_url(cfg()['base_url'],PHP_URL_PATH)?:'')===''?'live':'preview';
 $contexts=api('/rest/v1/rpc/business_contexts',['p_discovery'=>true],'POST',$_SESSION['auth']['access_token']);
 $contexts=array_values(array_filter($contexts,fn($c)=>($c['environment']??null)===$environment));
 $selected=$_SESSION['business_context']??null;
 $matches=array_values(array_filter($contexts,fn($c)=>$selected&&$c['business_id']===($selected['business_id']??null)&&$c['environment']===($selected['environment']??null)));
 if(!$matches){unset($_SESSION['business_context']);if(!$contexts)return null;if(count($contexts)!==1||$contexts[0]['role']!=='owner'){header('Location: context.php',true,303);exit;}$matches=$contexts;}
 $_SESSION['business_context']=$matches[0];
 if($matches[0]['role']!=='owner'){
  if(!in_array(basename($_SERVER['SCRIPT_FILENAME']??''),['delegated.php','context.php'],true)){header('Location: delegated.php',true,303);exit;}
  return ['id'=>$matches[0]['business_id']]+$matches[0];
 }
 $b=api('/rest/v1/businesses?id=eq.'.rawurlencode($matches[0]['business_id']).'&select=id,name,business_type,country,time_zone',[],'GET',$_SESSION['auth']['access_token']);
 if(count($b)!==1){unset($_SESSION['business_context']);throw new RuntimeException('Business context unavailable.');}return $b[0];
}"""
 if s.count(old)!=1:raise ValueError('Core lookup source drift')
 s=s.replace(old,new)
 marker=" if ($token) $headers[]='Authorization: Bearer '.$token;"
 addition="""
 if($token&&str_starts_with($path,'/rest/v1/')&&!empty($_SESSION['business_context'])){
  $ctx=$_SESSION['business_context'];
  if(!preg_match('/\\A[0-9a-f-]{36}\\z/',(string)($ctx['business_id']??''))||!in_array($ctx['environment']??'', ['preview','live'],true))throw new RuntimeException('Business context unavailable.');
  $headers[]='x-faraios-business: '.$ctx['business_id'];$headers[]='x-faraios-environment: '.$ctx['environment'];
 }
"""
 if s.count(marker)!=1:raise ValueError('API source drift')
 core.write_text(s.replace(marker,marker+addition))
 index=destination/'account/index.php';s=index.read_text()
 old="api('/rest/v1/businesses',array_merge(['owner_id'=>$u['id'],'name'=>$name,'business_type'=>$type],$details),'POST',$_SESSION['auth']['access_token']);"
 new="api('/rest/v1/rpc/business_context_create',['p_name'=>$name,'p_type'=>$type,'p_country'=>$details['country'],'p_zone'=>$details['time_zone']],'POST',$_SESSION['auth']['access_token']);unset($_SESSION['business_context']);"
 if s.count(old)!=1:raise ValueError('Business creation source drift')
 index.write_text(s.replace(old,new))
 for name in ['context.php','delegated.php','workspace.css']:
  shutil.copyfile(ROOT/'docs/sc04'/name,destination/'account'/name)
 # The private authorization schema must travel with its tables, functions and ACLs.
 p=destination/'scripts/database-backup.py';s=p.read_text();marker="schemas=SCHEMAS+optional"
 if s.count(marker)!=1:raise ValueError('Backup source drift')
 p.write_text(s.replace(marker,"schemas=SCHEMAS+optional+(['authorization_private'] if sql(\"select exists(select 1 from pg_namespace where nspname='authorization_private')\").strip()=='t' else [])"))
 # The recovery checker must select explicit contexts too, including positive
 # owner reads; a universal empty result is not successful recovery.
 shutil.copyfile(ROOT/'docs/sc04/recovery.py',destination/'scripts/sc04_recovery.py')
 p=destination/'scripts/database-restore-check.py';s=p.read_text()
 start=s.index('   owners=json.loads(');end=s.index('   if sql("select has_table_privilege',start)
 s=s[:start]+"   from sc04_recovery import verify_owner_scopes\n   checked_scopes=verify_owner_scopes(sql)\n   owners=[] # count below uses explicit verified scopes\n"+s[end:]
 s=s.replace('owner_scopes_checked=len(owners)+1','owner_scopes_checked=checked_scopes')
 s=s.replace("   if os.environ.get('RESTORE_AUTH_REHEARSAL')=='true':", "   if os.environ.get('RESTORE_AUTH_REHEARSAL')=='true':\n    raise RestoreError('SC04 managed Auth adapter requires its separate acceptance gate')")
 p.write_text(s)
 return destination
if __name__=='__main__':
 import sys
 stage(sys.argv[1])
