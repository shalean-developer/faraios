"""Disposable native Postgres and PHP; no hosted data changes."""
from profiles import Profiles
from journey import lit
import json,unittest
class Areas(Profiles):
 def test_area_lifecycle(self):
  a,b=self.ids;bid=self.bids[0];path='/account/profile.php'
  d=dict(name='Area Example',description='Cleaning services',email='a@example.test',phone='',website='',areas='Claremont · Newlands\nOther area',hours=[None]*7,logo=None)
  area=dict(slug='claremont',name='Claremont',title='Claremont cleaning enquiries',introduction='Discuss your property requirements.',coverage='Confirm the address and preferred time with the business.',seo_title='Claremont cleaning | Area Example',seo_description='Ask Area Example about coverage for your Claremont property.',action='Ask about Claremont',services=[],published=False)
  d['area_pages']={'claremont':area}
  self.scope(a,f"select public.business_profile_save('{bid}','live','area-example',"+lit(json.dumps(d))+"::jsonb,0)")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  self.assertIn('Claremont cleaning enquiries',self.get(path+'?view=preview&area=claremont')[1])
  self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  pub=json.loads(self.sql("set role anon;select document from public.business_public_pages where slug='area-example'"))
  self.assertEqual(pub['area_pages'],{});self.assertNotIn('Discuss your property',json.dumps(pub))
  self.assertEqual(self.get('/b/index.php?slug=area-example&page=areas/claremont')[0],404)
  self.assertNotIn('/areas/claremont',self.get('/b/index.php?slug=area-example')[1])
  fields=dict(action='save',version=1,slug='area-example',area_editor='1',**{k:d[k] for k in ['name','description','email','phone','website','areas']})
  fields.update({'area_pages[0]['+k+']':v for k,v in area.items() if k not in ['services','published']});fields['area_pages[0][published]']='on'
  self.assertIn('Draft saved',self.post(path,**fields))
  self.assertIn('Ask about Claremont',self.get(path)[1]);self.assertEqual(self.get('/b/index.php?slug=area-example&page=areas/claremont')[0],404)
  self.assertIn('is published',self.post(path,action='publish',version=2,confirm_public='on'))
  status,html=self.get('/b/index.php?slug=area-example&page=areas/claremont');self.assertEqual(status,200);self.assertIn('Ask about Claremont',html);self.assertIn('/areas/claremont',html);self.assertIn('BreadcrumbList',html);self.assertIn('Claremont cleaning | Area Example',html)
  home=self.get('/b/index.php?slug=area-example')[1];self.assertIn('/areas/claremont',home);self.assertNotIn('/areas/newlands',home)
  self.assertIn('/areas/claremont',self.get('/sitemap.php')[1]);self.assertNotIn('/areas/newlands',self.get('/sitemap.php')[1])
  saved=json.loads(self.scope(a,f"select draft from public.business_profiles where business_id='{bid}'"))
  for change in [{'published':'yes'},{'title':''},{'slug':'wrong'},{'services':['bad']},{'extra':'no'},{'coverage':'x'*3001}]:
   bad=json.loads(json.dumps(saved));bad['area_pages']['claremont'].update(change);self.assertEqual(self.sql('select public.business_profile_valid('+lit(json.dumps(bad))+'::jsonb)'),'f')
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_profile_save('{bid}','live','area-example',"+lit(json.dumps(saved))+"::jsonb,2)")
  self.assertEqual(self.scope(b,f"select count(*) from public.business_profiles where business_id='{bid}'"),'0')
  fields['version']=2;fields.pop('area_pages[0][published]');self.assertIn('Draft saved',self.post(path,**fields));self.assertEqual(self.get('/b/index.php?slug=area-example&page=areas/claremont')[0],200)
  self.post(path,action='publish',version=3,confirm_public='on');self.assertEqual(self.get('/b/index.php?slug=area-example&page=areas/claremont')[0],404);self.assertNotIn('/areas/claremont',self.get('/sitemap.php')[1]);self.assertIn('Claremont cleaning enquiries',self.get(path+'?view=preview&area=claremont')[1])
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Areas('test_area_lifecycle')]));raise SystemExit(not result.wasSuccessful())
