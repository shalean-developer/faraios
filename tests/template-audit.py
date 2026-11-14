"""Isolated PostgreSQL/PHP template, snapshot and availability regression."""
import json,unittest
from profiles import Profiles
from journey import lit
from seo import Head,SEO
class TemplateAudit(SEO):
 def test_template_options_and_availability(self):
  bid=self.bids[0];uid=self.ids[0]
  prefix='set role authenticated;set request.jwt.claim.sub='+lit(uid)+";set request.jwt.claims='{\"is_anonymous\":false}';"
  p={'name':'Genuine Example','description':'Actual business description','email':'public@example.test','phone':'+27 21 555 0123','website':'','areas':'Area one · Area two\nArea three','hours':[['08:00','17:00']]+[None]*6,'logo':None,'presentation':{'accent':'navy','font':'sans','whatsapp':'27825550123','street':'10 Example Road','city':'Test City','region':'Test Region','postal':'1234','country':'ZA'}}
  valid=lambda d:self.sql('select public.business_profile_valid('+lit(json.dumps(d))+'::jsonb)')
  self.assertEqual(valid(p),'t')
  for k,v in [('accent','red;url(evil)'),('font','<script>'),('whatsapp','+270123'),('country','ZAR'),('street','x'*201)]:
   bad=json.loads(json.dumps(p));bad['presentation'][k]=v;self.assertEqual(valid(bad),'f')
  self.sql(prefix+'select public.business_profile_save('+lit(bid)+",'preview','template-audit',"+lit(json.dumps(p))+"::jsonb,0)")
  self.assertEqual(self.sql("set role anon;select public.business_booking_available('preview','template-audit')->>'available'"),'false')
  self.sql(prefix+'select public.business_profile_publish('+lit(bid)+",'preview',1)")
  status,headers,html=self.request('/preview/b/template-audit');self.assertEqual(status,200);self.assertIn('theme-navy',html);self.assertIn('font-sans',html);self.assertIn('https://wa.me/27825550123',html);self.assertNotIn('id="service"',html);self.assertIn('Make an enquiry',html);self.assertNotIn('>Book now',html)
  schema=Head(html).schemas[0]['@graph'][0];self.assertEqual(schema['@type'],'LocalBusiness');self.assertEqual(schema['address']['streetAddress'],'10 Example Road');self.assertEqual(schema['openingHoursSpecification'][0]['opens'],'08:00')
  self.assertIn('no-store',headers['Cache-Control'])
  service={'id':'a'*32,'name':'Actual service','description':'Scope','mode':'fixed','amount':10000,'duration':60,'visible':True,'archived':False,'options':[]}
  self.sql(prefix+'select public.business_services_save('+lit(bid)+",'preview',"+lit(json.dumps({'currency':'ZAR','items':[service]}))+"::jsonb,0)");self.sql(prefix+'select public.business_services_publish('+lit(bid)+",'preview',1)")
  self.assertEqual(self.sql("set role anon;select public.business_booking_available('preview','template-audit')->>'available'"),'true')
  html=self.request('/preview/b/template-audit')[2];self.assertIn('?booking=1&amp;service='+'a'*32,html)
  booking=self.request('/preview/b/template-audit?booking=1&service='+'a'*32)[2];self.assertIn('required checked',booking)
  other=self.request('/preview/b/template-audit?booking=1&service='+'b'*32)[2];self.assertNotIn('required checked',other)
  self.sql("update request_private.ingress set enabled=false where environment='preview'")
  self.assertEqual(self.sql("set role anon;select public.business_booking_available('preview','template-audit')->>'available'"),'false');self.assertNotIn('>Book now',self.request('/preview/b/template-audit')[2])
  self.sql("update request_private.ingress set enabled=true where environment='preview'")
  self.assertEqual(self.sql("set role anon;select public.business_booking_available('live','template-audit')->>'available'"),'false')
  self.assertEqual(self.sql("set role anon;select public.business_booking_available('preview','unknown')->>'available'"),'false')
  # Draft edits must not appear publicly. Cross-owner save remains denied.
  p['presentation']['street']='PRIVATE DRAFT STREET'
  self.sql(prefix+'select public.business_profile_save('+lit(bid)+",'preview','template-audit',"+lit(json.dumps(p))+"::jsonb,1)")
  self.assertNotIn('PRIVATE DRAFT STREET',self.request('/preview/b/template-audit')[2])
  with self.assertRaises(RuntimeError):self.sql('set role authenticated;set request.jwt.claim.sub='+lit(self.ids[1])+';select public.business_profile_save('+lit(bid)+",'preview','template-audit',"+lit(json.dumps(p))+"::jsonb,2)")
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([TemplateAudit('test_template_options_and_availability')]));raise SystemExit(not result.wasSuccessful())
