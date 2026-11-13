"""Service HTTP lifecycle plus real PostgreSQL ownership and snapshot assertions."""
from profiles import Profiles
from journey import lit
import json,unittest,sys
class Services(Profiles):
 def test_services(self):
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/services.php';data=dict(action='save',id='new',version=0,name='Standard clean',description='<script>evil</script>',duration=120,mode='fixed',amount='505.25',visible='on')
  self.assertIn('at least 2',self.post(path,**(data|{'name':'x'})))
  self.assertIn('duration from',self.post(path,**(data|{'duration':0})))
  self.assertIn('decimal places',self.post(path,**(data|{'amount':'1.123'})))
  self.assertIn('Draft saved',self.post(path,**data));self.assertIn('ZAR 505.25',self.get(path)[1])
  a,b=self.ids;bid=self.bids[0];q=f"select draft from public.business_service_catalogues where business_id='{bid}'";d=json.loads(self.scope(a,q));sid=d['items'][0]['id']
  self.assertEqual(self.scope(b,'select count(*) from public.business_service_catalogues'),'0')
  with self.assertRaises(RuntimeError):self.sql('set role anon;select draft from public.business_service_catalogues')
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_services_publish('{bid}','live',1)")
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_services_save('{bid}','live',"+lit(json.dumps(d))+"::jsonb,1)")
  self.assertIn('Confirm that',self.post(path,action='publish',version=1))
  self.assertIn('Services published',self.post(path,action='publish',version=1,confirm_public='on'))
  self.assertEqual(self.scope(a,'select count(*) from public.business_public_pages'),'0')
  # Profile creation carries previously published services, without exposing newer drafts.
  profile=dict(name='Test page',description='Public description',email='hello@example.test',phone='',website='',areas='Cape Town',hours=[None]*7,logo=None)
  self.scope(a,f"select public.business_profile_save('{bid}','live','service-test',"+lit(json.dumps(profile))+"::jsonb,0)")
  self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  public='/b/index.php?slug=service-test';html=self.get(public)[1];self.assertIn('ZAR 505.25',html);self.assertIn('&lt;script&gt;',html);self.assertNotIn('PRIVATE-',html)
  self.assertIn('Draft saved',self.post(path,**(data|{'id':sid,'version':1,'amount':'750','name':'Private edited service'})))
  self.assertNotIn('Private edited service',self.get(public)[1])
  self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  self.assertNotIn('Private edited service',self.get(public)[1])
  self.assertIn('Services changed',self.post(path,**(data|{'id':sid,'version':1})))
  self.assertIn('Services changed',self.post(path,action='publish',version=1,confirm_public='on'))
  self.post(path,action='publish',version=2,confirm_public='on');self.assertIn('Private edited service',self.get(public)[1])
  self.post(path,action='archive',id=sid,version=2);self.assertIn('Private edited service',self.get(public)[1]);self.assertIn('Archived',self.get(path)[1])
  self.post(path,action='publish',version=3,confirm_public='on');self.assertNotIn('Private edited service',self.get(public)[1])
  self.post(path,action='restore',id=sid,version=3);self.assertIn('Private',self.get(path)[1]);self.assertNotIn('Private edited service',self.get(path+'?view=preview')[1])
  self.assertIn('Confirm the currency',self.post(path,action='currency',version=4,currency='USD'))
  self.post(path,action='currency',version=4,currency='USD',confirm_currency='on')
  self.post(path,**(data|{'id':sid,'version':5,'mode':'from','amount':'42.99'}));self.assertIn('From USD 42.99',self.get(path)[1])
  self.post(path,**(data|{'id':'new','version':6,'mode':'quote','amount':'ignored','name':'Quote service'}));self.assertIn('Request a quote',self.get(path)[1])
  self.assertIn('whole-number',self.post(path,action='currency',version=7,currency='JPY',confirm_currency='on'))
  self.post(path,action='publish',version=7,confirm_public='on');self.assertIn('From USD 42.99',self.get(public)[1]);self.assertIn('Quote service',self.get(public)[1])
  self.scope(a,f"select public.business_profile_unpublish('{bid}','live')");self.assertEqual(self.get(public)[0],404)
  self.scope(a,f"select public.business_profile_publish('{bid}','live',1)");self.assertIn('Quote service',self.get(public)[1])
  # Whole-number currencies must reopen with input the same validator accepts.
  for i,currency in enumerate(['JPY','UGX','RWF']):
   whole=dict(currency=currency,items=[d['items'][0]|{'amount':10000}])
   self.scope(a,f"select public.business_services_save('{bid}','live',"+lit(json.dumps(whole))+f"::jsonb,{7+2*i})")
   edit=self.get(path+'?edit='+sid)[1];self.assertIn('name="amount" type="text" inputmode="decimal" value="100"',edit)
   self.assertIn('Draft saved',self.post(path,**(data|{'id':sid,'version':8+2*i,'amount':'100','name':'Renamed whole price'})))
  for change in [{'currency':'BAD'},{'items':[d['items'][0]|{'duration':0}]},{'items':[d['items'][0]|{'private_email':'bad'}]}]:
   with self.assertRaises(RuntimeError):self.scope(a,f"select public.business_services_save('{bid}','live',"+lit(json.dumps(d|change))+"::jsonb,7)")
  self.assertEqual(self.sql("set role anon;select count(*) from public.business_public_pages where environment='preview'"),'0')
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Services('test_services')]));sys.exit(not r.wasSuccessful())
