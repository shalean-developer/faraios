"""Homepage content persistence and validation in disposable PostgreSQL; no hosted writes."""
import json,unittest
import profiles
from journey import lit
class Homepage(profiles.Profiles):
 def test_05_homepage_configuration(self):
  bid=self.bids[0];uid=self.ids[0]
  d={'name':'Independent Example','description':'Our own business.','email':'hello@example.test','phone':'','website':'','areas':'Newlands','hours':[None]*7,'logo':None}
  hp={'headline':'Your space, cared for.','introduction':'Owner introduction','image_alt':'','benefits':['Owner supplied benefit'],'image':None}
  self.assertEqual(self.sql('select public.business_profile_valid('+lit(json.dumps(d))+'::jsonb)'),'t')
  d['homepage']=hp
  d['pages']={key:{'title':'Custom title','introduction':'Owner intro','body':'Owner body'} for key in ['services','how-it-works','areas','contact']}
  d['pages']['how-it-works']['steps']=[['One','First'],['Two','Second'],['Three','Third']]
  self.assertEqual(self.sql('select public.business_profile_valid('+lit(json.dumps(d))+'::jsonb)'),'t')
  for key,value in [('benefits',['x']*7),('headline','x'*161),('image',{'mime':'image/svg+xml','data':'PHN2Zz4='})]:
   bad=json.loads(json.dumps(d));bad['homepage'][key]=value
   self.assertEqual(self.sql('select public.business_profile_valid('+lit(json.dumps(bad))+'::jsonb)'),'f')
  for bad in [dict(d,pages={'unknown':{}}),dict(d,pages={'services':{'title':'x'*121,'introduction':'','body':''}}),dict(d,pages={'how-it-works':{'title':'','introduction':'','body':'','steps':[['One','Text']]}})]:
   self.assertEqual(self.sql('select public.business_profile_valid('+lit(json.dumps(bad))+'::jsonb)'),'f')
  version='0'
  prefix='set role authenticated;set request.jwt.claim.sub='+lit(uid)+";set request.jwt.claims='{\"is_anonymous\":false}';"
  self.sql(prefix+'select public.business_profile_save('+lit(bid)+",'preview','homepage-example',"+lit(json.dumps(d))+'::jsonb,'+version+')')
  result=self.sql(prefix+'select draft->\'homepage\' from public.business_profiles where business_id='+lit(bid)+" and environment='preview'")
  self.assertEqual(json.loads(result),hp)
  self.assertEqual(json.loads(self.sql(prefix+'select draft->\'pages\' from public.business_profiles where business_id='+lit(bid)+" and environment='preview'")),d['pages'])
  with self.assertRaises(RuntimeError):self.sql('set role authenticated;set request.jwt.claim.sub='+lit(self.ids[1])+';select public.business_profile_save('+lit(bid)+",'preview','homepage-example',"+lit(json.dumps(d))+'::jsonb,'+str(int(version)+1)+')')
if __name__=='__main__':
 suite=unittest.TestSuite(Homepage(n) for n in ['test_01_profile_journey','test_02_native_isolation','test_03_logo_validation','test_04_logo_save_reload','test_05_homepage_configuration']);result=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not result.wasSuccessful())
