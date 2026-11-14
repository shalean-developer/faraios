"""Privacy navigation/purpose contracts; renders local templates without submitting forms."""
import subprocess,os,unittest
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1];PHP=os.environ.get('PHP_BIN','php')
class Document(HTMLParser):
 def __init__(self,text):
  super().__init__();self.ids=[];self.links=[];self.headings=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='a':self.links.append(a)
  if tag in ['h1','h2','h3']:self.headings.append(int(tag[1]))
class Privacy(unittest.TestCase):
 def test_notice_sections(self):
  text=(ROOT/'privacy.html').read_text();d=Document(text)
  self.assertEqual(len(d.ids),len(set(d.ids)));self.assertEqual(d.headings.count(1),1)
  for key in ['overview','accounts','enquiries','bookings','business-records','waitlist','cookies','storage','rights']:self.assertIn(key,d.ids)
  for a in d.links:
   if a.get('href','').startswith('#'):self.assertIn(a['href'][1:],d.ids)
  for phrase in ['session storage','30 minutes','pending until','no payment','does not subscribe','business’s behalf','Ireland','Information Regulator']:self.assertIn(phrase,text)
 def test_context_links(self):
  expected={'index.html':'#overview','business/homepage.php':'#overview','account/index.php':'#accounts','account/enquiries-core.php':'#enquiries','account/requests-core.php':'#bookings','waitlist.html':'#waitlist','waitlist/action-page.php':'#waitlist'}
  for name,anchor in expected.items():self.assertIn('privacy.html'+anchor,(ROOT/name).read_text())
  for name in ['account/enquiries-core.php','account/requests-core.php']:
   text=(ROOT/name).read_text();self.assertIn('rel="noopener noreferrer"',text);self.assertIn('(opens in a new tab)',text)
 def test_rendered_business_notice(self):
  text=subprocess.check_output([PHP,str(ROOT/'tests/homepage-fixture.php'),'legacy','contact'],text=True,env=os.environ);d=Document(text)
  link=next(a for a in d.links if a.get('href','').endswith('#enquiries'));self.assertEqual(link['href'],'https://example.test/privacy.html#enquiries');self.assertEqual(link['target'],'_blank');self.assertIn('noopener',link['rel']);self.assertIn('Your details are shared privately with Independent Example',text)
 def test_email_environment_and_escaping(self):
  # Exercise wl_message itself with a synthetic config; neither mail transport nor database is called.
  import tempfile
  for base in ['https://www.faraios.com','https://www.faraios.com/_waitlist-preview','https://www.faraios.com/_accounts-preview']:
   with tempfile.TemporaryDirectory() as directory:
    config="<?php return ['secret'=>'"+'x'*64+"','environment'=>'test','transport'=>'capture','base_url'=>'"+base+"','supabase_url'=>'http://127.0.0.1','supabase_key'=>'"+'test_'+'x'*32+"'];"
    Path(directory,'config.php').write_text(config)
    code="require 'waitlist/core.php';echo json_encode(wl_message(['kind'=>'confirmation','payload'=>['to'=>'synthetic@example.test','confirm'=>str_repeat('a',64),'withdraw'=>str_repeat('b',64)]]));"
    raw=subprocess.check_output([PHP,'-r',code],text=True,cwd=ROOT,env=dict(os.environ,FARAIOS_WAITLIST_DIR=directory));import json;mail=json.loads(raw);url=base+'/privacy.html#waitlist';self.assertIn(url,mail['html']);self.assertIn(url,mail['text']);self.assertNotIn('/privacy.html#accounts',mail['html'])
  code="require 'waitlist/email.php';echo wl_confirmation_html('https://example.test/confirm','https://example.test/unsubscribe','https://example.test/privacy.html?x=1&y=2#waitlist');"
  html=subprocess.check_output([PHP,'-r',code],text=True,cwd=ROOT);self.assertIn('?x=1&amp;y=2#waitlist',html)
if __name__=='__main__':unittest.main(verbosity=2)
