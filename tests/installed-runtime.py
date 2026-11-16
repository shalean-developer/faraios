"""Exact installed runtime with native synthetic finance and real PHP forms."""
import importlib.util,unittest,json,tempfile,shutil,hashlib
from pathlib import Path
from journey import ROOT
spec=importlib.util.spec_from_file_location('release_finance',ROOT/'tests/financial-safeguards.py');f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
spec=importlib.util.spec_from_file_location('release_build',ROOT/'docs/v1-017/reconstruct.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Installed(f.Financial):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  with tempfile.TemporaryDirectory()as d:
   runtime=Path(d)/'runtime';cls.expected=m.runtime(runtime);shutil.copytree(runtime,cls.webroot,dirs_exist_ok=True)
  for p,h in cls.expected.items():
   if hashlib.sha256((cls.webroot/p).read_bytes()).hexdigest()!=h:raise AssertionError('Installed runtime drift '+p)
  for row in json.load(open(ROOT/'docs/v1-017/installed-functions.json')):cls.sql(row['definition'])
  cls.restart_php()
 def test_exact_owner_and_manager_php_forms(self):
  self.login(self.ids[0])
  for page in ['customers','bookings','invoices','staff']:
   status,html=self.get('/account/'+page+'.php');self.assertEqual(status,200);self.assertNotIn('Fatal error',html)
  self.enable();manager=self.member('manager');self.login(manager)
  for view in ['customers','bookings','invoices','staff']:
   status,html=self.get('/account/delegated.php?view='+view);self.assertEqual(status,200);self.assertIn('manager workspace',html.lower());self.assertNotIn('Fatal error',html)
  self.enable(False)
if __name__=='__main__':
 names=[n for n in f.Financial.__dict__ if n.startswith('test_')]+['test_exact_owner_and_manager_php_forms'];r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Installed(n)for n in names));raise SystemExit(not r.wasSuccessful())
