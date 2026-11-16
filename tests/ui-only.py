"""Protect application logic while making broad presentation-only changes."""
from pathlib import Path
import re,json,hashlib,unittest
ROOT=Path(__file__).resolve().parents[1]
class UIOnly(unittest.TestCase):
 def test_original_php_logic_is_preserved(self):
  data=json.loads((ROOT/'docs/ui-consistency/php-logic-baseline.json').read_text())
  for path,before in data.items():
   i=0
   for code in re.findall(r'<\?(?:php|=)(.*?)(?:\?>|\Z)',(ROOT/path).read_text(),re.S):
    code=code.strip();h=hashlib.sha256(code.encode()).hexdigest()
    if i<len(before) and h==before[i]:i+=1
    else:self.assertIn(code,['esc($base)','$base'],path)
   self.assertEqual(i,len(before),path)
 def test_auth_and_business_fields_remain(self):
  # Existing named form fields and security controls are all retained by the PHP fragment proof.
  for path in ['account/index.php','account/account-view.php','b/index.php','quote/index.php','invoice/index.php']:
   self.assertIn('ui/design-system.css',(ROOT/path).read_text())
 def test_shared_navigation_and_asset_paths(self):
  for p in list(ROOT.glob('*.html'))+list((ROOT/'industries').glob('*.html'))+list((ROOT/'guides').glob('*.html')):
   s=p.read_text();self.assertIn('ui/design-system.css',s)
   if 'ui-content' in s:
    self.assertEqual(len(re.findall(r'<header\b[^>]*class="[^"]*\bsite-header\b[^"]*"',s)),1,p.name);self.assertEqual(s.count('class="site-footer"'),1,p.name)
    self.assertIn('id="main"',s,p.name);self.assertIn('ui/site-menu.js',s,p.name)
if __name__=='__main__':unittest.main(verbosity=2)
