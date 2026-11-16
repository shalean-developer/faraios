"""Public metadata checks; no hosted writes or customer records."""
import json,os,re,subprocess,unittest
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
class Head(HTMLParser):
 def __init__(self,s):
  super().__init__();self.meta={};self.canonical=[];self.ld=False;self.schemas=[];self.feed(s.split('</head>')[0])
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='meta':self.meta[a.get('name',a.get('property'))]=a.get('content')
  if t=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
  if t=='script' and a.get('type')=='application/ld+json':self.ld=True
 def handle_endtag(self,t):
  if t=='script':self.ld=False
 def handle_data(self,s):
  if self.ld:self.schemas.append(json.loads(s))
class PublicSEO(unittest.TestCase):
 def test_public_heads(self):
  for name in ['index','about','contact','privacy','waitlist','marketplace','hosting','industries/gardening','industries/technology']:
   h=Head((ROOT/(name+'.html')).read_text());self.assertEqual(len(h.canonical),1,name)
   for key in ['og:type','og:title','og:description','og:image','og:url']:self.assertTrue(h.meta.get(key), (name,key))
   self.assertEqual(h.meta['og:url'],h.canonical[0]);self.assertEqual(h.meta['description'],h.meta['og:description']);self.assertTrue(h.schemas,name)
   if name!='privacy':self.assertTrue(120<=len(h.meta['description'])<=170,name)
 def test_body_preserved(self):
  delta=json.loads((ROOT/'docs/seo/source-delta.json').read_text())
  for path in delta:
   if not path.endswith('.html') or path=='ui/marketing-header.html':continue
   before=subprocess.check_output(['git','show','4cea37e:'+path],cwd=ROOT,text=True).split('</head>',1)[1]
   current=(ROOT/path).read_text()
   availability=json.loads((ROOT/'docs/v1-007/source-delta.json').read_text())
   if path in availability:
    import hashlib
    self.assertEqual(hashlib.sha256(current.encode()).hexdigest(),availability[path]['candidate_sha256'])
    current=subprocess.check_output(['git','show','66ae7dc8b667a218685ef23313d9124027cdb307:'+path],cwd=ROOT,text=True)
   after=current.split('</head>',1)[1]
   normalize=lambda s:re.sub(r'href="((?:\./|\.\./)?)index\.html(?=[#"])',lambda m:'href="'+(m[1] or './'),s)
   self.assertEqual(after,normalize(before),path)
 def test_business_owner_metadata_preserved(self):
  php=r'''require 'business/homepage.php';function esc($s){return htmlspecialchars($s,ENT_QUOTES);}$p=['name'=>'Example','description'=>'Owner description','homepage'=>[],'seo'=>['pages'=>['home'=>['description'=>'Owner custom description','image'=>'auto']]]];$a=business_seo_metadata($p,'','https://example.test/b/example','https://example.test/b/example');if($a['description']!=='Owner custom description'||$a['image']!=='https://example.test/social-preview.png'||!$a['platform_image'])exit(1);$p['seo']['pages']['home']['image']='none';$b=business_seo_metadata($p,'','https://example.test/b/example','https://example.test/b/example');if($b['image']!=='')exit(2);ob_start();business_seo_head(null,'','https://example.test','missing',false);$s=ob_get_clean();if(!str_contains($s,'noindex,nofollow')||str_contains($s,'og:image'))exit(3);echo 'PASS';'''
  out=subprocess.check_output([os.environ.get('PHP_BIN','php'),'-r',php],cwd=ROOT,text=True);self.assertEqual(out,'PASS')
if __name__=='__main__':unittest.main(verbosity=2)
