"""Live-mode website release journey on disposable PostgreSQL/PHP only; no hosted writes."""
import base64,json,re,urllib.request,unittest,sys
from seo import SEO,Head
class Release(SEO):
 def test_live_website_editor_publication(self):
  self.private_config.write_text(self.live_config)
  gate_sql="select jsonb_agg(t order by name,environment) from (select 'enquiries' name,environment,enabled from enquiry_private.ingress union all select 'requests',environment,enabled from request_private.ingress) t"
  gates=self.sql(gate_sql)
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/profile.php';html=self.get(path)[1]
  for label in ['Homepage content','Website pages','Search &amp; sharing']:self.assertIn(label,html)
  self.assertNotIn('class="preview-banner"',html)
  data=dict(action='save',version=0,name='Live Website Test',description='Genuine owner description',email='owner-public@example.test',phone='',website='',areas='Newlands',slug='live-website-release',headline='Owner live hero',image_alt='Owner hero image')
  data.update({'pages[services][title]':'Owner live services','pages[services][introduction]':'Owner services intro','seo[pages][home][title]':'Owner live SEO title','seo[pages][home][description]':'Owner live SEO description','seo[pages][services][title]':'Owner services SEO title','seo[image_alt]':'Owner sharing image'})
  data['csrf']=re.search('name="csrf" value="([^\"]+)"',html)[1];boundary='LiveWebsiteSyntheticBoundary';body=b''
  for k,v in data.items():body+=('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+str(v)+'\r\n').encode()
  png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
  for name in ['hero_image','social_image']:body+=('--'+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"; filename="own.png"\r\nContent-Type: image/png\r\n\r\n').encode()+png+b'\r\n'
  body+=('--'+boundary+'--\r\n').encode()
  result=self.client.open(urllib.request.Request(self.url+path,data=body,headers={'Origin':self.url,'Content-Type':'multipart/form-data; boundary='+boundary})).read().decode();self.assertIn('Draft saved',result)
  saved=self.get(path)[1]
  for value in ['Owner live hero','Owner live services','Owner live SEO title','Owner live SEO description','Owner sharing image']:self.assertIn(value,saved)
  private=self.client.open(self.url+path+'?view=preview&section=services');self.assertIn('noindex',private.headers['X-Robots-Tag']);self.assertIn('<h1>Owner live services</h1>',private.read().decode())
  root='/b/live-website-release';self.assertEqual(self.request(root)[0],404)
  self.assertIn('is published',self.post(path,action='publish',version=1,confirm_public='on'))
  for suffix in ['','/services','/how-it-works','/areas','/contact']:
   status,headers,html=self.request(root+suffix);head=Head(html);self.assertEqual(status,200);self.assertEqual(head.meta['robots'],'index,follow');self.assertEqual(head.canonical,[self.url+root+suffix]);self.assertEqual(head.meta['og:url'],self.url+root+suffix);self.assertNotIn('Preview publication',html)
  html=self.request(root)[2];self.assertIn('<h1>Owner live hero</h1>',html);head=Head(html);self.assertEqual(head.title,'Owner live SEO title');self.assertEqual(head.meta['description'],'Owner live SEO description');self.assertEqual(head.meta['og:image'],self.url+root+'?social=1')
  self.assertEqual(Head(self.request(root+'/services')[2]).title,'Owner services SEO title')
  for image in ['hero','social']:
   response=self.client.open(self.url+root+'?'+image+'=1');self.assertEqual(response.headers['Content-Type'],'image/png');self.assertEqual(response.read(),png)
  sitemap=self.request('/sitemap.xml')[2]
  for suffix in ['','/services','/how-it-works','/areas','/contact']:self.assertIn(self.url+root+suffix,sitemap)
  self.assertNotIn('preview',sitemap);self.assertNotIn('booking',sitemap)
  data.update(version=1,slug='private-new-address',headline='Private revised hero');data['seo[pages][home][title]']='Private revised SEO'
  self.assertIn('Draft saved',self.post(path,**data));public=self.request(root)[2];self.assertNotIn('Private revised',public);self.assertEqual(self.request('/b/private-new-address')[0],404)
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('Private revised SEO',self.get(path)[1])
  self.assertEqual(self.sql(gate_sql),gates)
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Release('test_live_website_editor_publication')]));sys.exit(not result.wasSuccessful())
