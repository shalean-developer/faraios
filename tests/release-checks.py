"""Reproducible, offline application release gate. No hosted URLs, credentials or deploys."""
import json,os,subprocess,sys,time,re,platform
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/release';OUT.mkdir(parents=True,exist_ok=True)
suites=['sc02-baseline','sc02-native','sc03-native','sc04-native','sc04-delegated','accounts','profiles','services','customers','staff','enquiries','quotes','bookings','invoices','dashboard','requests','rooms','area-pages','website-release','customer-access','business-header','enquiry-workflow','foundation','production-activation','full-journey','enquiry-mail','enquiry-notifications','observability','ops-alerts','recovery']
def command(args):
 p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True);return p.stdout.strip() or p.stderr.strip()
env=dict(os.environ,RECOVERY_REPORT=str(OUT/'recovery.json'))
suites.insert(suites.index('sc04-delegated')+1,'sc04-shared')
suites.insert(suites.index('sc04-shared')+1,'sc04-readiness')
suites.insert(suites.index('sc04-readiness')+1,'staff-onboarding')
suites.insert(suites.index('staff-onboarding')+1,'defect-repairs')
suites.insert(suites.index('defect-repairs')+1,'workflow-repairs')
suites.insert(suites.index('staff-onboarding')+1,'staff-invitation-mail')
report={'source':command(['git','rev-parse','HEAD']),'worktree_dirty':bool(command(['git','status','--porcelain'])),'python':platform.python_version(),'php':command([os.environ.get('PHP_BIN','php'),'-v']).splitlines()[0],'postgres':command([str(Path(os.environ.get('PG_BIN','/usr/lib/postgresql/17/bin'))/'postgres'),'--version']),'scope':'disposable native database + PHP HTTP; simulated Auth/REST; no hosted writes or provider sends','suites':[]}
for name in suites:
 started=time.monotonic()
 try:
  args=[os.environ.get('PHP_BIN','php'),str(ROOT/'tests'/f'{name}.php')] if name in ['enquiry-mail','staff-invitation-mail'] else [sys.executable,str(ROOT/'tests'/f'{name}.py')]
  p=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True,timeout=120)
  output=p.stdout+p.stderr;code=p.returncode
 except subprocess.TimeoutExpired:output='Suite timeout';code=124
 (OUT/f'{name}.log').write_text(output)
 count=re.search(r'Ran (\d+) tests? in',output)
 report['suites'].append(dict(name=name,passed=code==0,tests=int(count[1]) if count else 0,seconds=round(time.monotonic()-started,3)))
 print(('PASS ' if code==0 else 'FAIL ')+name,flush=True)
 if code:print(output[-2500:],flush=True)
report['passed']=all(x['passed'] for x in report['suites']);report['tests']=sum(x['tests'] for x in report['suites']);(OUT/'summary.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'tests':report['tests'],'report':'test-results/release/summary.json'}));raise SystemExit(not report['passed'])
