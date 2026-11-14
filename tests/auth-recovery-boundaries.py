"""Recovery must reject arbitrary targets and suppress private command failures."""
import importlib.util,json,subprocess,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('auth_recovery',Path(__file__).resolve().parents[1]/'scripts/auth_recovery.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Boundaries(unittest.TestCase):
 def test_non_disposable_target_rejected(self):
  for target in ['postgres','production','rxelmugnucfajrqmphhe','faraios-restore-../live']:
   with patch.object(m,'safe_run') as run:
    with self.assertRaises(m.AuthRecoveryError):m.rehearse(target,{},lambda q:None)
    run.assert_not_called()
 def test_network_or_ports_rejected(self):
  for host in [{'NetworkMode':'bridge','PortBindings':{}},{'NetworkMode':'none','PortBindings':{'5432/tcp':[{'HostPort':'5432'}]}}]:
   with patch.object(m,'safe_run',return_value=json.dumps([{'HostConfig':host}]).encode()) as run:
    with self.assertRaises(m.AuthRecoveryError):m.rehearse('faraios-restore-'+'a'*32,{},lambda q:None)
    self.assertEqual(run.call_count,1)
 def test_failure_keeps_private_output_private(self):
  result=subprocess.CompletedProcess([],1,b'PRIVATE CUSTOMER',b'permission denied PRIVATE PASSWORD TOKEN')
  with patch.object(m.subprocess,'run',return_value=result):
   with self.assertRaises(m.AuthRecoveryError) as e:m.safe_run(['docker','exec','private','psql'],{})
   self.assertNotIn('PRIVATE',str(e.exception));self.assertNotIn('PASSWORD',str(e.exception));self.assertIn('permission denied',str(e.exception))
if __name__=='__main__':unittest.main()
