"""Snapshot SEO contract: disposable native PG + real PHP HTTP. No hosted writes."""
import json,re,sys,unittest,urllib.request,urllib.error,urllib.parse,xml.etree.ElementTree as ET
from html.parser import HTMLParser
import profiles
from journey import lit
class Head(HTMLParser):
 def __init__(self,html):
  super().__init__();self.meta={};self.canonical=[];self.schemas=[];self.ld=False;self.title='';self.in_title=False;self.feed(html)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
  if tag=='script' and a.get('type')=='application/ld+json':self.ld=True
  if tag=='title':self.in_title=True
 def handle_endtag(self,tag):
  if tag=='script':self.ld=False
  if tag=='title':self.in_title=False
 def handle_data(self,data):
  if self.ld:self.schemas.append(json.loads(data))
  if self.in_title:self.title+=data
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**k):return None
class SEO(profiles.Profiles):
 @classmethod
 def setUpClass(cls):
  super().setUpClass();cls.private_config=cls.private/'profiles/config.php';cls.live_config=cls.private_config.read_text();cls.preview_config=cls.live_config.replace("'base_url'=>'"+cls.url+"'","'base_url'=>'"+cls.url+"/preview'");cls.private_config.write_text(cls.preview_config)
  (cls.private/'profiles/router.php').write_text("<?php $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);$root="+repr(str(profiles.ROOT))+";if(preg_match('~^/(?:preview/)?sitemap(?:\\.xml|\\.php)$~',$path)){$_SERVER['SCRIPT_NAME']=str_replace('sitemap.xml','sitemap.php',$path);require $root.'/sitemap.php';return true;}if(preg_match('~^/preview/account/([a-z-]+\\.php)$~',$path,$m)){$_SERVER['SCRIPT_NAME']=$path;require $root.'/account/'.$m[1];return true;}if(preg_match('~^/((?:preview/)?b)(?:/.*)?$~',$path,$m)){$_SERVER['SCRIPT_NAME']='/'.$m[1].'/index.php';require $root.'/b/index.php';return true;}return false;")
 def request(self,path):
  try:r=urllib.request.build_opener(NoRedirect).open(self.url+path)
  except urllib.error.HTTPError as e:r=e
  return r.code,r.headers,r.read().decode()
 def doc(self):return dict(name='SEO Example',description='Owner business description',email='public@example.test',phone='+27 21 000 0000',website='',areas='Newlands',hours=[None]*7,logo=None)
 def test_01_seo_persistence_and_isolation(self):
  self.post('/preview/account/index.php?page=signin',email='a@example.test',password='test-long-password');path='/preview/account/profile.php'
  data=dict(action='save',version=0,name='SEO Example',description='Owner business description',email='public@example.test',phone='',website='',areas='Newlands',slug='seo-example')
  data.update({'seo[pages][home][title]':'Original homepage title','seo[pages][home][description]':'Owner original homepage description','seo[pages][services][title]':'Services <script>unsafe</script>','seo[pages][services][description]':'Owner original service description'})
  self.assertIn('Draft saved',self.post(path,**data));self.assertIn('Original homepage title',self.get(path)[1]);self.assertEqual(self.get('/preview/b/seo-example')[0],404)
  self.assertIn('is published',self.post(path,action='publish',version=1,confirm_public='on'))
  for page in ['','services','how-it-works','areas','contact']:
   url='/preview/b/seo-example'+('/'+page if page else '');status,headers,html=self.request(url);head=Head(html)
   self.assertEqual(status,200);self.assertIn('noindex',headers['X-Robots-Tag']);self.assertEqual(head.meta['robots'],'noindex,nofollow');self.assertEqual(head.canonical,[self.url+url]);self.assertEqual(head.meta['og:url'],self.url+url);self.assertTrue(head.meta['description']);self.assertEqual(head.meta['og:title'],head.title)
   graph=head.schemas[0]['@graph'];org=graph[0];self.assertEqual(org['name'],'SEO Example');self.assertEqual(org['@type'],'Organization');self.assertEqual(org['email'],'public@example.test');self.assertNotIn('address',org);self.assertNotIn('aggregateRating',org);self.assertNotIn('PRIVATE-',json.dumps(graph));self.assertEqual(graph[1]['itemListElement'][-1]['item'],self.url+url)
  head=Head(self.request('/preview/b/seo-example/services')[2]);self.assertEqual(head.title,'Services <script>unsafe</script>');self.assertEqual(head.meta['description'],'Owner original service description');self.assertNotIn('<script>unsafe</script>',self.request('/preview/b/seo-example/services')[2])
  # Save/reload a sharing image through the actual owner multipart form (local only).
  data['version']=1;data['seo[image_alt]']='Our own sharing image';data['seo[pages][home][title]']='Private changed title';html=self.get(path)[1];csrf=re.search('name="csrf" value="([^\"]+)"',html)[1];data['csrf']=csrf
  import base64
  png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');boundary='SEOSyntheticBoundary';body=b''
  for k,v in data.items():body+=('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+str(v)+'\r\n').encode()
  body+=('--'+boundary+'\r\nContent-Disposition: form-data; name="social_image"; filename="own.png"\r\nContent-Type: image/png\r\n\r\n').encode()+png+('\r\n--'+boundary+'--\r\n').encode()
  self.assertIn('Draft saved',self.client.open(urllib.request.Request(self.url+path,data=body,headers={'Origin':self.url,'Content-Type':'multipart/form-data; boundary='+boundary})).read().decode());self.assertIn('Our own sharing image',self.get(path)[1]);self.assertEqual(Head(self.request('/preview/b/seo-example')[2]).title,'Original homepage title')
  self.assertIn('Draft changed',self.post(path,**data));self.assertIn('is published',self.post(path,action='publish',version=2,confirm_public='on'));head=Head(self.request('/preview/b/seo-example')[2]);self.assertEqual(head.title,'Private changed title');self.assertEqual(head.meta['og:image'],self.url+'/preview/b/seo-example?social=1');self.assertEqual(head.meta['og:image:alt'],'Our own sharing image');self.assertEqual(head.meta['og:image:width'],'1')
  image=self.client.open(self.url+'/preview/b/seo-example?social=1');self.assertEqual(image.read(),png);self.assertIn('noindex',image.headers['X-Robots-Tag'])
  self.post('/preview/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('Private changed title',self.get(path)[1]);self.assertNotIn('Our own sharing image',self.get(path)[1])
  with self.assertRaises(RuntimeError):self.scope(self.ids[1],f"select public.business_profile_save('{self.bids[0]}','preview','stolen','{{}}'::jsonb,2)")
 def test_02_normalization_indexing_and_failures(self):
  for path in ['/preview/b/seo-example/','/preview/b/SEO-EXAMPLE','/preview/b/seo-example?utm_source=test','/preview/b/index.php?slug=seo-example','/preview/b/seo-example?slug=other&page=contact','/preview/b/seo-example/services/','/preview/b/SEO-EXAMPLE/SERVICES/']:
   status,headers,html=self.request(path);self.assertEqual(status,301,path);expected='/preview/b/seo-example/services' if '/services' in path.lower() else '/preview/b/seo-example';self.assertEqual(headers['Location'],self.url+expected)
  for path in ['/preview/b/seo-example/no-such-page','/preview/b/unknown','/preview/b/index.php?slug[]=bad','/preview/b/index.php?slug=seo-example&page[]=contact']:
   status,headers,html=self.request(path);self.assertEqual(status,404,path);self.assertIn('noindex',headers['X-Robots-Tag']);self.assertFalse(Head(html).canonical)
  req=urllib.request.Request(self.url+'/preview/b/seo-example',headers={'Host':'untrusted.example.test'})
  try:r=urllib.request.build_opener(NoRedirect).open(req)
  except urllib.error.HTTPError as e:r=e
  self.assertEqual(r.code,301);self.assertEqual(r.headers['Location'],self.url+'/preview/b/seo-example')
  for method in ['POST']:
   req=urllib.request.Request(self.url+'/preview/b/seo-example/services',data=b'',method=method)
   try:r=urllib.request.build_opener(NoRedirect).open(req)
   except urllib.error.HTTPError as e:r=e
   if method=='POST':self.assertEqual(r.code,405);self.assertIn('noindex',r.headers['X-Robots-Tag']);self.assertFalse(Head(r.read().decode()).canonical)
  for query in ['booking=1','booking=1&step=service','booking=1&step=address','booking=1&step=requirements','booking=1&step=schedule','booking=1&step=details','step=details']:
   status,headers,html=self.request('/preview/b/seo-example?'+query);
   if query.startswith('booking=1'):
    self.assertEqual(status,303);self.assertEqual(headers['Location'],self.url+'/preview/b/seo-example/contact#enquire');continue
   self.assertEqual(status,200);self.assertIn('noindex',headers['X-Robots-Tag']);head=Head(html);self.assertFalse(head.canonical);self.assertFalse(head.schemas);self.assertNotIn('og:url',head.meta)
  status,headers,xml=self.request('/preview/sitemap.xml');self.assertEqual(status,200);self.assertEqual(len(ET.fromstring(xml)),0)
  # Simulated backend failure must return 503, not a missing business or an empty successful sitemap.
  self.sql('alter table public.business_public_pages rename to temporary_pages')
  try:self.assertEqual(self.request('/preview/b/seo-example')[0],503)
  finally:self.sql('alter table public.temporary_pages rename to business_public_pages')
 def test_03_live_sitemap_and_snapshot_rules(self):
  self.private_config.write_text(self.live_config)
  try:
   self.assertEqual(len(ET.fromstring(self.request('/sitemap.xml')[2])),1) # platform homepage only; preview rows excluded
   d=self.doc();d['name']='Live genuine owner';self.scope(self.ids[0],f"select public.business_profile_save('{self.bids[0]}','live','live-example',"+lit(json.dumps(d))+"::jsonb,0)");self.scope(self.ids[0],f"select public.business_profile_publish('{self.bids[0]}','live',1)")
   status,headers,xml=self.request('/sitemap.xml');self.assertEqual(status,200);locs=[e.text for e in ET.fromstring(xml).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')];self.assertEqual(locs,[self.url+'/']+[self.url+'/b/live-example'+suffix for suffix in ['', '/services','/how-it-works','/areas','/contact']]);self.assertNotIn('preview',xml);self.assertNotIn('booking',xml);self.assertIn('/b/live-example/services',xml)
   status,headers,html=self.request('/b/live-example');self.assertEqual(status,200);self.assertNotIn('noindex',headers.get('X-Robots-Tag',''));self.assertEqual(Head(html).meta['robots'],'index,follow');self.assertEqual(Head(html).canonical,[self.url+'/b/live-example'])
   d['description']='PRIVATE-DRAFT-REVISION';self.scope(self.ids[0],f"select public.business_profile_save('{self.bids[0]}','live','live-example',"+lit(json.dumps(d))+"::jsonb,1)");self.assertNotIn('PRIVATE-DRAFT-REVISION',self.request('/b/live-example')[2]);self.assertEqual(self.request('/b/live-example/services')[0],200)
   for bid,uid,slug in [(self.bids[1],self.ids[1],'other-business')]:
    d=self.doc();d['name']='Other business';self.scope(uid,f"select public.business_profile_save('{bid}','live','{slug}',"+lit(json.dumps(d))+"::jsonb,0)");self.scope(uid,f"select public.business_profile_publish('{bid}','live',1)")
   self.assertIn('other-business',self.request('/sitemap.xml')[2]);self.assertNotIn('Other business',self.request('/b/live-example')[2]);self.assertNotIn('Live genuine owner',self.request('/b/other-business')[2]);self.scope(self.ids[1],f"select public.business_profile_unpublish('{self.bids[1]}','live')");self.assertNotIn('other-business',self.request('/sitemap.xml')[2]);self.assertEqual(self.request('/b/other-business')[0],404)
   self.sql('alter table public.business_public_pages rename to temporary_pages')
   try:self.assertEqual(self.request('/sitemap.xml')[0],503)
   finally:self.sql('alter table public.temporary_pages rename to business_public_pages')
  finally:self.private_config.write_text(self.preview_config)
 def test_04_sitemap_pagination(self):
  self.private_config.write_text(self.live_config)
  try:
   # 501 synthetic independent businesses test real keyset pagination beyond the batch limit.
   self.sql("insert into auth.users select gen_random_uuid() from generate_series(1,501)")
   self.sql("insert into public.businesses(owner_id,name,business_type,country,time_zone) select id,'Pagination Test','cleaning','ZA','UTC' from auth.users where id not in (select owner_id from public.businesses)")
   self.sql("insert into public.business_public_pages(business_id,environment,slug,document,time_zone) select b.id,'live','pagination-'||lpad(row_number() over(order by b.id)::text,4,'0'),p.document,'UTC' from public.businesses b cross join (select document from public.business_public_pages where environment='live' and slug='live-example') p where b.name='Pagination Test'")
   status,headers,xml=self.request('/sitemap.xml');self.assertEqual(status,200);locs=[e.text for e in ET.fromstring(xml).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')];self.assertEqual(len(locs),2511);self.assertEqual(len(set(locs)),2511);self.assertIn(self.url+'/b/pagination-0501',locs)
  finally:self.private_config.write_text(self.preview_config)
 def test_05_native_validation(self):
  d=self.doc();d['seo']={'pages':{'home':{'title':'É 😀 owner title','description':'Real description','image':'auto'}},'image':None,'image_alt':''}
  def valid(doc):return self.sql('select public.business_profile_valid('+lit(json.dumps(doc))+'::jsonb)')
  self.assertEqual(valid(d),'t')
  for change in [{'pages':{'private':{}}},{'image_alt':'x'*201},{'image':{'mime':'image/svg+xml','data':'PHN2Zz4='}},{'image':{'mime':'image/png','data':'AA=='},'image_alt':''},{'pages':{'home':{'title':'x'*121,'description':'','image':'auto'}}},{'pages':{'home':{'title':'ok','description':'x'*301,'image':'auto'}}},{'pages':{'home':{'title':'ok','description':'fine','image':'https://evil.test'}}},{'pages':{'home':{'title':'ok','description':'fine','image':'auto','private_email':'secret'}}},{'pages':{'home':{'title':'bad\x01','description':'fine','image':'auto'}}}]:
   bad=json.loads(json.dumps(d));bad['seo'].update(change);self.assertEqual(valid(bad),'f',str(change))
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(SEO(n) for n in ['test_01_seo_persistence_and_isolation','test_02_normalization_indexing_and_failures','test_03_live_sitemap_and_snapshot_rules','test_04_sitemap_pagination','test_05_native_validation']));sys.exit(not result.wasSuccessful())
