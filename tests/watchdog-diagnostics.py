"""Exercise the real CLI with local curl fixtures; never network or SMTP."""
import json, os, pathlib, subprocess, tempfile
root=pathlib.Path(__file__).resolve().parents[1]
php=os.environ.get('PHP_BIN','php')
with tempfile.TemporaryDirectory() as temp:
 p=pathlib.Path(temp);(p/'bin').mkdir();(p/'bundle').mkdir();(p/'restored/faraios-account').mkdir(parents=True)
 (p/'bin/curl').write_text('''#!/usr/bin/python3
import sys,os,pathlib
args=sys.argv[1:]; url=args[-1]
assert '--insecure' not in args and '--retry' not in args and '--location' not in args
assert args[args.index('--proto')+1]=='=https'
assert args[args.index('--max-time')+1]=='12'
assert args[args.index('--max-filesize')+1]=='2097152'
assert args[args.index('--user-agent')+1]=='Mozilla/5.0 (compatible; FaraiOSOperationsMonitor/1.0)'
header=args[args.index('--dump-header')+1]
pathlib.Path(header).write_text('HTTP/2 403\\r\\nServer: LiteSpeed\\r\\nSet-Cookie: SECRET-SESSION\\r\\n')
with open(os.environ['PROBE_FILES'],'a') as f:f.write(header+'\\n')
if 'supabase.co' in url: print('{"name":"GoTrue","private":"SECRET-AUTH"}\\n200');sys.exit(0)
mode=os.environ['CASE']
if mode=='healthy': print(('Sign in' if 'preview' in url else 'FaraiOS')+'\\n200')
elif mode=='content': print('Unexpected SECRET-BODY\\n200')
else: print('Forbidden SECRET-BODY\\n403')
if mode=='timeout':sys.exit(28)
''');(p/'bin/curl').chmod(0o700)
 env=dict(os.environ,PATH=str(p/'bin')+':'+os.environ['PATH'],BACKUP_HEALTH_JSON='{"backup":"ok","restore":"ok"}',PROBE_FILES=str(p/'probes'))
 import datetime
 (p/'bundle/receipt.json').write_text(json.dumps(dict(status='private_configuration_restored',hashes_match=True,captured_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())))
 for case in ['healthy','forbidden','timeout','content','later_failure']:
  env['CASE']=case
  (p/'probes').write_text('')
  (p/'bundle/monitor-state.json').write_text(json.dumps(dict(notified_state='healthy' if case=='healthy' else 'attention',sent_at=9999999999,test_notification_sent=True)))
  (p/'restored/faraios-account/production.php').write_text("'publishable_key'=>'abcdefghijklmnopqrstuv123456'" if case!='later_failure' else 'invalid')
  r=subprocess.run([php,str(root/'scripts/operations-watchdog.php'),'--bundle='+str(p/'bundle'),'--restored='+str(p/'restored'),'--report='+str(p/'report.json')],env=env,text=True,capture_output=True)
  assert r.returncode==({'healthy':0,'later_failure':2}.get(case,1)),(case,r.returncode)
  assert 'SECRET' not in r.stdout+r.stderr
  lines=[json.loads(line) for line in r.stdout.splitlines()]
  if case=='healthy':assert len(lines)==1 and lines[0]['state']=='healthy' and lines[0]['public_probe_failures']==[]
  else:
   assert lines[0]['schema']=='faraios.monitor-failure.v1' and len(lines[0]['failures'])==2
   if case=='timeout':assert all(d['curl_exit']==28 for d in lines[0]['failures'])
   if case!='later_failure':assert lines[-1]['state']=='attention' and lines[-1]['alert_decision']=='suppressed' and not lines[-1]['alert_sent']
  assert all(not pathlib.Path(f).exists() for f in (p/'probes').read_text().splitlines())
  print('PASS CLI '+case+': status, privacy, no notification, temporary-header cleanup')
