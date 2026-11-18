import pathlib,runpy,tempfile,shutil,time,json,sys,os,hashlib
r=pathlib.Path('/var/www/vhosts/shalean.com/private/faraios-account/mon01-scheduler-v1')
assert hashlib.sha256((r/'schedule-runner.py').read_bytes()).hexdigest()=='26306160c5400be0d828b3655750eff4b8fb8d4201e30450b7b9c3886db2bd5f'
marker=r/'alert-test-20261118.json'
if marker.exists():sys.exit(0)
m=runpy.run_path(str(r/'schedule-runner.py'))
with tempfile.TemporaryDirectory(prefix='synthetic-check-',dir=r) as d:
 p=pathlib.Path(d);p.chmod(0o700);shutil.copyfile(r/'schedule-fallback.py',p/'schedule-fallback.py');h=m['load_helper'](p);now=time.time()
 h.save(p/'latest-receipt.json',{'started_at':now-1200,'finished_at':now-1190,'exit_code':0})
 issues,notify=m['check_timer'](p,h,now)
 assert issues==['missed_timer_runs'] and notify
 issues2,notify2=m['check_timer'](p,h,now+1)
 assert not notify2
 h.save(p/'latest-receipt.json',{'started_at':now,'finished_at':now,'exit_code':0})
 assert m['check_timer'](p,h,now+2)==([],False)
 h.save(marker,{'test':'MON01-ALERT-20261118','at':now,'missed_run_detected':True,'duplicate_suppressed':True,'recovery_detected':True,'production_state_unchanged':True,'stderr_test_emitted':True,'delivery_verified':False})
print('TEST MON01-ALERT-20261118: synthetic missed timer detected; duplicate suppressed; recovery detected. Production scheduler was not stopped. Please confirm receipt to complete operator alert delivery verification.',file=sys.stderr)
sys.exit(1)
