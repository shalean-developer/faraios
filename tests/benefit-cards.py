"""Native SQL validation, owner isolation and PHP draft/publish lifecycle for benefit cards."""
from profiles import Profiles
from journey import lit
import json,unittest
class Benefits(Profiles):
 def test_benefits(self):
  a,b=self.ids;bid=self.bids[0]
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  d=dict(name='Benefit Example',description='Cleaning services',email='a@example.test',phone='',website='',areas='Cape Town',hours=[None]*7,logo=None,homepage=dict(headline='',introduction='',image_alt='',benefits=['Original benefit'],image=None))
  self.scope(a,f"select public.business_profile_save('{bid}','live','benefit-example',"+lit(json.dumps(d))+"::jsonb,0)");self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  fields=dict(action='save',version=1,name=d['name'],description=d['description'],email=d['email'],phone='',website='',areas='Cape Town',slug='benefit-example',headline='',introduction='',image_alt='',benefit_editor='1',show_benefits='on',benefit_heading='Cleaning that fits your life.',**{'benefit_cards[0][icon]':'home','benefit_cards[0][title]':'Care for every space','benefit_cards[0][description]':'Homes, rentals and workplaces.'})
  path='/account/profile.php';self.assertIn('Original benefit',self.get(path)[1]);self.assertIn('Draft saved',self.post(path,**fields));saved=json.loads(self.scope(a,f"select draft from public.business_profiles where business_id='{bid}'"));section=saved['homepage']['benefit_section']
  self.assertEqual(saved['homepage']['benefits'],['Original benefit']);self.assertEqual(section['cards'][0]['icon'],'home');self.assertIn('Care for every space',self.get(path)[1]);self.assertNotIn('Care for every space',self.get('/b/index.php?slug=benefit-example')[1])
  self.post(path,action='publish',version=2,confirm_public='on');self.assertIn('Care for every space',self.get('/b/index.php?slug=benefit-example')[1])
  hidden=fields|{'version':2};hidden.pop('show_benefits');self.post(path,**hidden);self.assertIn('Care for every space',self.get('/b/index.php?slug=benefit-example')[1]);self.post(path,action='publish',version=3,confirm_public='on');self.assertNotIn('Care for every space',self.get('/b/index.php?slug=benefit-example')[1]);self.assertIn('Care for every space',self.get(path)[1])
  for change in [{'visible':'yes'},{'title':'x'*121},{'cards':[{'icon':'bad','title':'Title','description':''}]},{'cards':[{'icon':'home','title':'','description':''}]},{'cards':section['cards']*7},{'cards':[dict(section['cards'][0],unexpected='no')]}]:
   bad=json.loads(json.dumps(saved));bad['homepage']['benefit_section'].update(change);self.assertEqual(self.sql('select public.business_profile_valid('+lit(json.dumps(bad))+'::jsonb)'),'f')
  empty=json.loads(json.dumps(saved));empty['homepage']['benefit_section']['cards']=[];self.assertEqual(self.sql('select public.business_profile_valid('+lit(json.dumps(empty))+'::jsonb)'),'t')
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_profile_save('{bid}','live','benefit-example',"+lit(json.dumps(saved))+"::jsonb,3)")
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Benefits('test_benefits')]));raise SystemExit(not result.wasSuccessful())
