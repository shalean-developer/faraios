"""Disposable PG/PHP: scoped customer sessions, branding persistence and owner isolation."""
import json,re,unittest,urllib.request,urllib.parse,urllib.error,os,subprocess
from journey import ROOT
from seo import SEO
from journey import lit
class BusinessHeader(SEO):
 def test_header_and_customer_sessions(self):
  p=self.doc();p['presentation']=dict(accent='navy',font='sans',whatsapp='',street='',city='',region='',postal='',country='',logo_size='80',show_name='no')
  def valid(d):return self.sql('select public.business_profile_valid('+lit(json.dumps(d))+'::jsonb)')
  self.assertEqual(valid(p),'t')
  for key,value in [('logo_size','999'),('logo_size',80),('show_name',False),('show_name','hide')]:
   bad=json.loads(json.dumps(p));bad['presentation'][key]=value;self.assertEqual(valid(bad),'f')
  for uid,bid,slug in zip(self.ids,self.bids,['header-one','header-two']):
   self.sql('set role authenticated;set request.jwt.claim.sub='+lit(uid)+";set request.jwt.claims='{\"is_anonymous\":false}';select public.business_profile_save("+lit(bid)+",'preview',"+lit(slug)+','+lit(json.dumps(p))+"::jsonb,0);select public.business_profile_publish("+lit(bid)+",'preview',1)")
  before=self.sql("select md5(string_agg(row_to_json(t)::text,'' order by business_id,environment)) from public.business_profiles t")
  a='/preview/account/customer.php?slug=header-one';b='/preview/account/customer.php?slug=header-two'
  # Match the host's exact entrypoint-based private configuration router.
  original_config=self.preview_config
  routed=original_config.replace('<?php return ', "<?php if(($_SERVER['SCRIPT_NAME']??'')!=='/preview/account/index.php')throw new RuntimeException('Account configuration is unavailable.');return ")
  self.private_config.write_text(routed)
  self.assertEqual(self.get(a)[0],200)
  self.private_config.write_text(original_config)
  # Owner session alone must never appear in a customer header.
  self.post('/preview/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  self.assertFalse(json.loads(self.get(a+'&mode=header')[1])['authenticated'])
  self.assertIn('logo-size-80',self.get('/preview/b/header-one')[1]);self.assertIn('<span>SEO Example</span>',self.get('/preview/b/header-one')[1])
  html=self.post(a+'&return=services',email='a@example.test',password='test-long-password');self.assertNotIn('Customer sign in</h1>',html)
  self.assertTrue(json.loads(self.get(a+'&mode=header')[1])['authenticated'])
  self.assertFalse(json.loads(self.get(b+'&mode=header')[1])['authenticated'])
  self.assertTrue(json.loads(self.get('/preview/account/header-session.php')[1])['authenticated'])
  self.assertIn('booking history and profile management are not available',self.get(a)[1])
  self.assertIn('href="'+self.url+'/preview/b/header-one"',self.get(a+'&return=https://evil.test')[1])
  # Header is GET only, CSRF rejects unsigned logout, customer remains signed in.
  def raw_post(path,data):
   try:r=self.client.open(urllib.request.Request(self.url+path,data=urllib.parse.urlencode(data).encode()))
   except urllib.error.HTTPError as e:r=e
   return r.code,r.read().decode()
  self.assertEqual(raw_post(a+'&mode=header',{})[0],405)
  self.assertIn('form has expired',raw_post(a,{'action':'logout','csrf':'wrong'})[1])
  self.assertTrue(json.loads(self.get(a+'&mode=header')[1])['authenticated'])
  self.post(a+'&return=contact',action='logout')
  self.assertFalse(json.loads(self.get(a+'&mode=header')[1])['authenticated'])
  self.assertTrue(json.loads(self.get('/preview/account/header-session.php')[1])['authenticated'])
  self.assertEqual(self.get('/preview/account/customer.php?slug=unknown')[0],404)
  self.assertEqual(self.get('/preview/account/customer.php?slug=../bad')[0],404)
  self.private_config.write_text(self.live_config)
  self.assertEqual(self.get('/account/customer.php?slug=header-one')[0],404) # preview slug never resolves live
  self.private_config.write_text(self.preview_config)
  self.assertEqual(before,self.sql("select md5(string_agg(row_to_json(t)::text,'' order by business_id,environment)) from public.business_profiles t"))
  if os.environ.get('BROWSER_BIN'):
   subprocess.run(['node',str(ROOT/'tests/customer-login-browser.cjs')],env=dict(os.environ,CUSTOMER_TEST_URL=self.url),check=True)
  # Real owner editor save/reload, no publication until explicit owner action.
  fields=dict(action='save',version=1,slug='header-one',**{k:p[k] for k in ['name','description','email','phone','website','areas']})
  fields.update({'presentation[logo_size]':'32','presentation[show_name]':'no'})
  self.assertIn('Draft saved',self.post('/preview/account/profile.php',**fields))
  self.assertIn('value="32" selected',self.get('/preview/account/profile.php')[1]);self.assertIn('logo-size-80',self.get('/preview/b/header-one')[1])
  self.assertIn('is published',self.post('/preview/account/profile.php',action='publish',version=2,confirm_public='on'))
  self.assertIn('logo-size-32',self.get('/preview/b/header-one')[1])
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([BusinessHeader('test_header_and_customer_sessions')]));raise SystemExit(not result.wasSuccessful())
