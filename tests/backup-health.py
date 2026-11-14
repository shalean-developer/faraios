import importlib.util,datetime,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('health',Path(__file__).resolve().parents[1]/'scripts/backup-health.py');health=importlib.util.module_from_spec(spec);spec.loader.exec_module(health)
class Health(unittest.TestCase):
 def test_failure_recovery_and_missed_schedule(self):
  now=datetime.datetime.now(datetime.timezone.utc)
  def run(outcome,hours=0,status='completed'):return dict(status=status,conclusion=outcome,updated_at=(now-datetime.timedelta(hours=hours)).isoformat())
  self.assertEqual(health.assess([],now,30),'no_success')
  self.assertEqual(health.assess([run('failure'),run('success',1)],now,30),'latest_completed_failed')
  self.assertEqual(health.assess([run('success'),run('failure',1)],now,30),'ok')
  self.assertEqual(health.assess([run('success',31)],now,30),'stale')
  self.assertEqual(health.assess([run(None,status='in_progress'),run('success',2)],now,30),'ok')
  self.assertEqual(health.assess([run('cancelled'),run('success',1)],now,30),'latest_completed_failed')
unittest.main()
