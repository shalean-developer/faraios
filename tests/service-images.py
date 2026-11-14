"""Real multipart PHP + disposable Postgres service-media lifecycle and tenant isolation."""
from profiles import Profiles
from journey import lit
import io,json,re,unittest,urllib.request,urllib.error
from PIL import Image
class ServiceImages(Profiles):
 def upload(self,path,fields,image,mime='image/png'):
  fields=dict(fields,csrf=re.search('name="csrf" value="([^"]+)"',self.get(path)[1])[1]);boundary='FaraiOSServiceImageTest';parts=[]
  for key,value in fields.items():parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+'"\r\n\r\n'+str(value)+'\r\n').encode())
  parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="service_image"; filename="service.png"\r\nContent-Type: '+mime+'\r\n\r\n').encode()+image+('\r\n--'+boundary+'--\r\n').encode())
  return self.client.open(urllib.request.Request(self.url+path,data=b''.join(parts),headers={'Origin':self.url,'Content-Type':'multipart/form-data; boundary='+boundary})).read().decode()
 def test_images(self):
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password');a,b=self.ids;bid=self.bids[0]
  path='/account/services.php?edit=new';fields=dict(action='save',id='new',version=0,name='Image service',description='Short summary. Full details retained.',duration=120,mode='from',amount='250',visible='on',image_alt='Cleaner caring for a home')
  image=io.BytesIO();Image.effect_noise((120,120),100).convert('RGB').save(image,format='PNG');png=image.getvalue();self.assertGreater(len(png),8192)
  self.assertIn('Describe your service image',self.upload(path,fields|{'image_alt':''},png));self.assertEqual(self.sql('select count(*) from public.business_service_images'),'0')
  self.assertIn('PNG, JPG or WebP service image',self.upload(path,fields,b'<svg onload="evil()"/>','image/svg+xml'))
  self.assertIn('Draft saved',self.upload(path,fields,png));self.assertEqual(self.sql('select count(*) from public.business_service_images'),'1')
  draft=json.loads(self.scope(a,f"select draft from public.business_service_catalogues where business_id='{bid}'"));service=draft['items'][0];sid=service['id'];photo=service['photo'];edit='/account/services.php?edit='+sid
  self.assertEqual(photo['alt'],fields['image_alt']);self.assertNotIn('data',photo);self.assertLess(len(json.dumps(service)),1000)
  self.assertIn('Remove saved service image',self.get(edit)[1]);r=self.client.open(self.url+'/account/services.php?image='+sid);self.assertEqual(r.read(),png);self.assertEqual(r.headers['Cache-Control'],'no-store')
  # Transaction rolls back the immutable image insert if catalogue version is stale.
  with self.assertRaises(RuntimeError):self.scope(a,f"select public.business_services_save_image('{bid}','live',"+lit(json.dumps(draft))+"::jsonb,0,"+lit(sid)+","+lit(json.dumps({'mime':'image/png','data':__import__('base64').b64encode(png).decode()}))+"::jsonb,'New alt')")
  self.assertEqual(self.sql('select count(*) from public.business_service_images'),'1')
  self.assertEqual(self.scope(b,'select count(*) from public.business_service_images'),'0')
  with self.assertRaises(RuntimeError):self.sql('set role anon;select image from public.business_service_images')
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_services_save_image('{bid}','live',"+lit(json.dumps(draft))+"::jsonb,1,"+lit(sid)+",'{}'::jsonb,'Other')")
  with self.assertRaises(RuntimeError):self.scope(a,'update public.business_service_images set image=image')
  profile=dict(name='Media business',description='Cleaning services',email='hello@example.test',phone='',website='',areas='Cape Town',hours=[None]*7,logo=None)
  self.scope(a,f"select public.business_profile_save('{bid}','live','media-business',"+lit(json.dumps(profile))+"::jsonb,0)")
  self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  self.assertEqual(self.sql("set role anon;select public.business_service_image('live','media-business',"+lit(sid)+")"),'{}')
  self.post('/account/services.php',action='publish',version=1,confirm_public='on')
  imageurl=self.url+'/b/index.php?slug=media-business&service_image='+sid
  r=self.client.open(imageurl);self.assertEqual(r.headers['Content-Type'],'image/png');self.assertEqual(r.read(),png)
  self.assertEqual(self.sql("set role anon;select public.business_service_image('preview','media-business',"+lit(sid)+")"),'{}')
  # Replacement remains private until publication; saved immutable prior image stays public.
  replacement=io.BytesIO();Image.new('RGB',(80,50),'navy').save(replacement,format='PNG');second=replacement.getvalue()
  self.assertIn('Draft saved',self.upload(edit,fields|{'id':sid,'version':1,'image_alt':'Second image'},second));self.assertEqual(self.client.open(imageurl).read(),png)
  self.assertEqual(self.client.open(self.url+'/account/services.php?image='+sid).read(),second)
  self.post('/account/services.php',action='publish',version=2,confirm_public='on');self.assertEqual(self.client.open(imageurl).read(),second)
  self.post(edit,**(fields|{'id':sid,'version':2,'remove_image':'on','image_alt':''}));self.assertEqual(self.client.open(imageurl).read(),second)
  self.post('/account/services.php',action='publish',version=3,confirm_public='on');self.assertEqual(self.get('/b/index.php?slug=media-business&service_image='+sid)[0],404)
  self.assertEqual(self.sql('select count(*) from public.business_service_images'),'2')
  # Forged cross-business references cannot expose an image through another page.
  other=self.bids[1];forged=draft['items'][0]|{'photo':photo};otherdraft={'currency':'ZAR','items':[forged]}
  self.scope(b,f"select public.business_services_save('{other}','live',"+lit(json.dumps(otherdraft))+"::jsonb,0)")
  self.scope(b,f"select public.business_services_publish('{other}','live',1)")
  self.scope(b,f"select public.business_profile_save('{other}','live','other-media',"+lit(json.dumps(profile))+"::jsonb,0)");self.scope(b,f"select public.business_profile_publish('{other}','live',1)")
  self.assertEqual(self.sql("set role anon;select public.business_service_image('live','other-media',"+lit(sid)+")"),'{}')
  for photo_bad in [{'id':photo['id'],'alt':''},{'id':'bad','alt':'Text'},dict(photo,extra='bad')]:
   bad={'currency':'ZAR','items':[service|{'photo':photo_bad}]};self.assertEqual(self.sql('select public.business_services_valid('+lit(json.dumps(bad))+'::jsonb)'),'f')
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([ServiceImages('test_images')]));raise SystemExit(not result.wasSuccessful())
