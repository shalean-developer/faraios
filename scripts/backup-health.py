#!/usr/bin/env python3
"""Read-only GitHub backup heartbeat. Fixed reason codes; no outbound alerts."""
import os,json,sys,urllib.request,datetime
REPO='shalean-developer/faraios'
def assess(runs,now,max_hours):
 completed=[r for r in runs if r['status']=='completed']
 successful=[r for r in completed if r['conclusion']=='success']
 if not successful:return 'no_success'
 if completed[0]['conclusion']!='success':return 'latest_completed_failed'
 when=datetime.datetime.fromisoformat(successful[0]['updated_at'].replace('Z','+00:00'))
 if (now-when).total_seconds()>max_hours*3600:return 'stale'
 return 'ok'
def get(path):
 req=urllib.request.Request('https://api.github.com/repos/'+REPO+'/'+path,headers={'Authorization':'Bearer '+os.environ['GITHUB_TOKEN'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'})
 with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
def main(latest=False):
 backup=get('actions/workflows/database-backup.yml/runs?branch=main&per_page=30')['workflow_runs']
 success=next((r for r in backup if r['status']=='completed' and r['conclusion']=='success'),None)
 if latest:
  if not success:raise ValueError('No successful backup')
  print(int(success['id']));return
 restore=get('actions/workflows/database-restore-check.yml/runs?branch=main&per_page=30')['workflow_runs']
 now=datetime.datetime.now(datetime.timezone.utc)
 states={'backup':assess(backup,now,30),'restore':assess(restore,now,8*24)}
 if success:
  artifacts=get('actions/runs/'+str(int(success['id']))+'/artifacts')['artifacts']
  if not any(a['name']=='faraios-encrypted-backup-'+str(int(success['id'])) and not a['expired'] for a in artifacts):states['backup']='artifact_missing_or_expired'
 print(json.dumps(states));sys.exit(any(s!='ok' for s in states.values()))
if __name__=='__main__':
 try:main(len(sys.argv)==2 and sys.argv[1]=='latest')
 except (KeyError,ValueError,OSError):print('Backup health unknown; GitHub status could not be verified.',file=sys.stderr);sys.exit(1)
