import importlib.util,datetime,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('health',Path(__file__).resolve().parents[1]/'scripts/backup-health.py');health=importlib.util.module_from_spec(spec);spec.loader.exec_module(health)
class Health(unittest.TestCase):
 def test_failure_recovery_and_missed_schedule(self):
  now=datetime.datetime.now(datetime.timezone.utc)
  def run(outcome,hours=0,status='completed'):return dict(status=status,conclusion=outcome,created_at=(now-datetime.timedelta(hours=hours)).isoformat(),updated_at=now.isoformat())
  self.assertEqual(health.assess([],now,30),'no_success')
  self.assertEqual(health.assess([run('failure'),run('success',1)],now,30),'latest_completed_failed')
  self.assertEqual(health.assess([run('success'),run('failure',1)],now,30),'ok')
  self.assertEqual(health.assess([run('success',31)],now,30),'stale')
  self.assertEqual(health.assess([run(None,status='in_progress'),run('success',2)],now,30),'ok')
  self.assertEqual(health.assess([run('cancelled'),run('success',1)],now,30),'latest_completed_failed')
  self.assertEqual(health.assess([run('success',13)],now,12),'stale')
  self.assertEqual(health.assess([run('success',-1)],now,12),'invalid_timestamp')
 def test_monitor_cannot_reset_restore_age(self):
  rows=[dict(name='faraios-private-config',expired=False,workflow_run={'id':9}),dict(name='isolated-restore-evidence-8',expired=True,workflow_run={'id':8}),dict(name='isolated-restore-evidence-7',expired=False,workflow_run={'id':7}),dict(name='isolated-restore-evidence-6',expired=False,workflow_run={'id':6})]
  def api(path):
   if path.startswith('actions/artifacts?'):return {'artifacts':rows}
   n=int(path.rsplit('/',1)[1]);return dict(id=n,head_branch='main' if n==6 else 'test',status='completed',conclusion='success',path='.github/workflows/database-restore-check.yml')
  self.assertEqual(health.verified_restore(api)['id'],6)
  self.assertIsNone(health.verified_restore(lambda path:{'artifacts':rows[:2]}))
unittest.main()
