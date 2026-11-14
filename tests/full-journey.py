"""One cross-industry enquiry→quote→booking→invoice/payment journey; native RLS + PHP."""
from seo import SEO
from journey import lit
import unittest,json,uuid,datetime
class FullJourney(SEO):
 def rpc(self,owner,name,**args):
  return json.loads(self.scope(owner,'select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if isinstance(v,dict) else lit(v)) for k,v in args.items())+')'))
 def seed_journey(self):
  a,b=self.ids;bid=self.bids[0];ctx=dict(p_business=bid,p_environment='preview');due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat()
  self.sql("update public.businesses set business_type='home-maintenance-trades' where id="+lit(bid))
  p=self.doc()|dict(name='Fictional Field Service',description='Site assessment and maintenance service')
  self.rpc(a,'business_profile_save',**ctx,p_slug='journey-field-service',p_draft=p,p_version=0)
  self.rpc(a,'business_profile_publish',**ctx,p_version=1)
  original=self.sql("select document from public.business_public_pages where slug='journey-field-service' and environment='preview'")
  self.rpc(a,'business_profile_save',**ctx,p_slug='journey-field-service',p_draft=p|dict(description='PRIVATE draft description'),p_version=1)
  self.assertEqual(original,self.sql("select document from public.business_public_pages where slug='journey-field-service' and environment='preview'"))
  eid=str(uuid.uuid4());self.rpc(a,'business_enquiry_create',**ctx,p_id=eid,p_name='Fictional Journey Customer',p_email='journey@example.test',p_phone='',p_requirements='Assess and repair the fictional site.')
  self.rpc(a,'business_enquiry_workflow_save',**ctx,p_id=eid,p_version=1,p_status='Contacted',p_notes='PRIVATE callback instructions',p_follow_up=datetime.date.today().isoformat())
  self.post('/preview/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/preview/account/quotes.php?new=1&enquiry='+eid
  html=self.get(path)[1];self.assertIn('Assess and repair',html);self.assertNotIn('PRIVATE callback',html)
  html=self.post(path,action='save',version=0,enquiry=eid,name='Fictional Journey Customer',email='journey@example.test',phone='',notes='Assess and repair the fictional site.',expires_on=due,item_name_0='Site assessment',quantity_0='2',price_0='175.25')
  self.assertIn('Draft saved',html)
  qid=self.scope(a,'select id from public.business_quotes where enquiry_id='+lit(eid));qpath='/preview/account/quotes.php?id='+qid
  self.assertIn('Quote marked sent',self.post(qpath,action='send',version=1,confirm_send='on'))
  token=self.scope(a,'select share_token from public.business_quotes where id='+lit(qid))
  self.sql("set role anon;select public.business_quote_customer('preview',"+lit(token)+",'Accepted')")
  booking=str(uuid.uuid4());doc=json.loads(self.scope(a,'select document from public.business_quotes where id='+lit(qid)))
  args=ctx|dict(p_id=booking,p_version=0,p_quote=qid,p_document=doc,p_address='12 Fictional Test Road',p_local='2026-12-15 09:00',p_zone='Africa/Johannesburg',p_duration=60,p_status='Scheduled')
  self.rpc(a,'business_booking_write',**args)
  self.rpc(a,'business_booking_write',**(args|dict(p_version=1,p_status='Completed')))
  invoice=str(uuid.uuid4());self.rpc(a,'business_invoice_write',**ctx,p_id=invoice,p_version=0,p_action='save',p_document=doc,p_due=due,p_booking=booking)
  self.rpc(a,'business_invoice_write',**ctx,p_id=invoice,p_version=1,p_action='issue')
  payment=str(uuid.uuid4());self.rpc(a,'business_invoice_payment',**ctx,p_invoice=invoice,p_id=payment,p_amount=35050,p_paid_on=datetime.date.today().isoformat(),p_reference='FICTIONAL journey receipt')
  self.assertEqual(self.scope(a,'select status from public.business_invoice_list where id='+lit(invoice)),'Paid')
  self.assertEqual(json.loads(self.scope(a,'select document from public.business_invoices where id='+lit(invoice))),doc)
  for table in ['business_enquiries','business_quotes','business_bookings','business_invoices','business_invoice_payments','business_enquiry_activity']:
   self.assertEqual(self.scope(b,'select count(*) from public.'+table),'0')
  with self.assertRaises(RuntimeError):self.rpc(b,'business_invoice_write',**ctx,p_id=invoice,p_version=3,p_action='void',p_reason='Forbidden correction')
  self.assertEqual(self.sql("select enabled from request_private.ingress where environment='live'"),'f')
  with self.assertRaises(RuntimeError):self.rpc(a,'business_quote_send',**ctx,p_id=qid,p_version=1,p_free_confirmed=False)
  self.assertEqual(self.scope(a,'select status from public.business_enquiries where id='+lit(eid)),'Contacted')
  self.assertEqual(self.sql('select count(*) from enquiry_private.mail_outbox'),'0')
  self.journey_ids=dict(enquiry=eid,quote=qid,booking=booking,invoice=invoice,payment=payment)
  return self.journey_ids
 def test_journey(self):self.seed_journey()
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([FullJourney('test_journey')]));raise SystemExit(not r.wasSuccessful())
