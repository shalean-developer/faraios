"""Compare original profile fields in two verified encrypted snapshots, never hosted writes.
Only field hashes and publication timestamps leave the isolated restore processes.
"""
import json,os,pathlib,subprocess,sys,tempfile
A='2f16e658-e031-4c4a-930a-2731ec1d1492';B='4627f805-8243-4890-bf18-a14fdf3fd21b'
QUERY="select coalesce(jsonb_agg(jsonb_build_object('business_id',t.business_id,'environment',t.environment,'published_at',t.published_at,'fields',(select jsonb_object_agg(key,md5(value::text)) from jsonb_each(to_jsonb(t)))) order by t.business_id,t.environment),'[]'::jsonb) from public.business_profiles t where t.business_id not in ('"+A+"','"+B+"')"
def main():
 if len(sys.argv)!=4:raise RuntimeError('Provide staged restore checker and two local ciphertext directories')
 checker=pathlib.Path(sys.argv[1]).resolve();source=checker.read_text()
 marker='   auth=None\n';report='   report=dict(status='
 if source.count(marker)!=1 or source.count(report)!=1:raise RuntimeError('Restore instrumentation source drift')
 source=source.replace(marker,'   profile_metadata=json.loads(sql('+repr(QUERY)+'))\n'+marker,1)
 marker='  finally:\n   # Removes only the generated disposable container; production is never a target.'
 if source.count(marker)!=1:raise RuntimeError('Restore report source drift')
 source=source.replace(marker,"   report['profile_metadata']=profile_metadata\n"+marker,1)
 target=checker.with_name('sc04_profile_snapshot.py');target.write_text(source)
 reports=[]
 try:
  for directory in sys.argv[2:]:
   result=subprocess.run([sys.executable,str(target),directory],capture_output=True,text=True,timeout=600)
   if result.returncode:raise RuntimeError('Isolated snapshot verification failed; private output suppressed')
   report=json.loads(result.stdout)
   if report['status']!='restore_verified' or not report['snapshot_fingerprints_match'] or report['network']!='none' or report['published_ports'] or report['production_credentials_forwarded']:raise RuntimeError('Isolation or snapshot equality failed')
   reports.append(report)
 finally:target.unlink(missing_ok=True)
 old,current=reports
 def keyed(r):return {(x['business_id'],x['environment']):x for x in r['profile_metadata']}
 left,right=keyed(old),keyed(current)
 if left.keys()!=right.keys():raise RuntimeError('Original profile scope set changed')
 changes=[]
 for key in sorted(left):
  a,b=left[key],right[key]
  fields=sorted(k for k in set(a['fields'])|set(b['fields']) if a['fields'].get(k)!=b['fields'].get(k))
  if fields:changes.append(dict(business_id=key[0],environment=key[1],fields=fields,before_published_at=a['published_at'],after_published_at=b['published_at']))
 expected=len(changes)==1 and changes[0]['business_id']=='89d76ecc-5489-4c87-be0c-7114d43d7fa0' and changes[0]['environment']=='live' and changes[0]['fields']==['published_at'] and changes[0]['after_published_at'].startswith('2026-11-15T07:19:22.444227')
 output=dict(status='PASS' if expected else 'REVIEW',original_profiles=len(left),changes=changes,old_snapshot=old['backup_created_utc'],current_snapshot=current['backup_created_utc'],verified_tables=[old['table_count'],current['table_count']],owner_scopes=[old['owner_scopes_checked'],current['owner_scopes_checked']],network='none',published_ports=0,production_credentials_forwarded=False,profile_content_printed=False,live_writes=False,actor_attribution='not established by snapshot comparison')
 print(json.dumps(output));return 0 if expected else 1
if __name__=='__main__':
 try:raise SystemExit(main())
 except (RuntimeError,OSError,ValueError,KeyError,subprocess.SubprocessError) as e:
  print('Profile reconciliation stopped: '+str(e),file=sys.stderr);raise SystemExit(1)
