"""Select a retained ciphertext configuration artifact; never reads plaintext secrets."""
import os,json,sys,subprocess
from importlib.machinery import SourceFileLoader
from pathlib import Path
health=SourceFileLoader('health',str(Path(__file__).with_name('backup-health.py'))).load_module()
try:
 found=[]
 for page in range(1,6):
  rows=health.get('actions/artifacts?per_page=100&page='+str(page))['artifacts']
  found += [x for x in rows if x['name']=='faraios-private-config' and not x['expired']]
  if found or len(rows)<100:break
 if not found:raise ValueError()
 chosen=max(found,key=lambda x:x['created_at']);run_id=int(chosen['workflow_run']['id'])
 result=subprocess.run([sys.executable,str(Path(__file__).with_name('backup-health.py'))],capture_output=True,text=True,timeout=60)
 try:states=json.loads(result.stdout)
 except ValueError:states={}
 with open(os.environ['GITHUB_OUTPUT'],'a') as out:out.write('run_id='+str(run_id)+'\nhealth='+json.dumps(states,separators=(',',':'))+'\n')
 print('Retained encrypted configuration selected; backup status checked.')
except Exception:print('Configuration/backup status unavailable; private API output suppressed.',file=sys.stderr);raise SystemExit(1)
