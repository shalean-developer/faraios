"""Bounded presentation repair over captured runtime and accepted overlays. No hosted I/O."""
import importlib.util,shutil,unittest,subprocess
from journey import ROOT
spec=importlib.util.spec_from_file_location('v1016_base',ROOT/'tests/lifecycle-communications.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Accessibility(base.Communications):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  for p in (ROOT/'docs/v1-016/runtime').rglob('*'):
   if p.is_file():shutil.copyfile(p,cls.webroot/p.relative_to(ROOT/'docs/v1-016/runtime'))
  cls.restart_php()
 def test_error_hooks_and_cache_version(self):
  self.login(self.ids[0])
  html=self.get('/account/index.php?page=confirm')[1]
  self.assertIn('account.js?v=20261117-v1016',html)
  html=self.get('/account/quotes.php?new=1')[1]
  self.assertIn('error-focus.js?v=20261117-v1016',html)
  html=self.post('/account/quotes.php?new=1',action='save',version='0',name='Synthetic validation',email='',phone='',expires_on='2090-01-01')
  self.assertIn('Enter a valid customer email or phone.',html)
  self.assertIn('value="Synthetic validation"',html)
  self.assertIn('role="alert"',html)
  self.assertIn('error-focus.js?v=20261117-v1016',html)
if __name__=='__main__':
 names=['test_error_hooks_and_cache_version','test_07_owner_php_settings_and_failed_assignment_retains_input','test_08_fresh_independent_za_request_to_paid_and_correction_history']
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Accessibility(n)for n in names));raise SystemExit(not r.wasSuccessful())
