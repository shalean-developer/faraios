"""Real browser + PHP + PG image save with local transport and disposable records."""
import base64,json,unittest,os,subprocess,re,urllib.request,io
from pathlib import Path
from seo import SEO
from journey import ROOT,lit,PGBIN
class ProfileImages(SEO):
 @classmethod
 def sql(cls,q,role=False):
  # Realistic image documents exceed Linux per-argument limits; stream SQL over stdin.
  result=subprocess.run([str(PGBIN/'psql'),'-XAtq','-h','127.0.0.1','-p',str(cls.pgport),'-d','postgres','-v','ON_ERROR_STOP=1'],input=('set role service_role; ' if role else '')+q,env=cls.env,capture_output=True,text=True)
  if result.returncode:raise RuntimeError(result.stderr)
  return result.stdout.strip()

 def test_image_upload_and_preservation(self):
  p=self.doc();p['homepage']={'headline':'Existing headline','introduction':'Existing introduction','image_alt':'Genuine fixture','benefits':[],'image':None};p['seo']={'pages':{},'image_alt':'Genuine sharing fixture','image':None}
  self.sql('set role authenticated;set request.jwt.claim.sub='+lit(self.ids[0])+";set request.jwt.claims='{\"is_anonymous\":false}';select public.business_profile_save("+lit(self.bids[0])+",'preview','image-test',"+lit(json.dumps(p))+"::jsonb,0);select public.business_profile_publish("+lit(self.bids[0])+",'preview',1)")
  before=self.sql("select row_to_json(t)::text from public.business_public_pages t where slug='image-test'")
  from PIL import Image
  import random
  image=self.private/'source.png';source=Image.frombytes('RGB',(2200,1200),random.Random(12).randbytes(2200*1200*3)).convert('RGBA');alpha=Image.new('L',source.size,255);alpha.paste(0,(0,0,200,1200));source.putalpha(alpha);source.save(image);self.assertGreater(image.stat().st_size,650000);self.assertLess(image.stat().st_size,10000000)
  result=subprocess.run(['node',str(ROOT/'tests/profile-images-browser.cjs')],env=dict(os.environ,PROFILE_TEST_URL=self.url,PROFILE_TEST_IMAGE=str(image)),capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stdout+result.stderr);print(result.stdout)
  self.post('/preview/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  failed=self.post('/preview/account/profile.php',action='save',version=1,description='x'*650001)
  self.assertIn('The images are too large',failed);self.assertIn('Remove saved hero image',failed);self.assertIn('Remove saved sharing image',failed)
  row=json.loads(self.sql("select draft from public.business_profiles where business_id="+lit(self.bids[0])+" and environment='preview'"))
  for image in [row['logo'],row['homepage']['image'],row['seo']['image']]:
   self.assertEqual(image['mime'],'image/webp');self.assertLessEqual(len(base64.b64decode(image['data'])),150000);self.assertEqual(Image.open(io.BytesIO(base64.b64decode(image['data']))).convert('RGBA').getextrema()[3],(0,255))
  self.assertEqual(row['name'],p['name']);self.assertEqual(row['homepage']['headline'],'Existing headline');self.assertEqual(before,self.sql("select row_to_json(t)::text from public.business_public_pages t where slug='image-test'"))
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([ProfileImages('test_image_upload_and_preservation')]));raise SystemExit(not result.wasSuccessful())
