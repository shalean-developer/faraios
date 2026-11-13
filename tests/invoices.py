"""Disposable PG17 financial, authorization, concurrency and real PHP journey checks.
Only Auth/PostgREST transport is simulated. No outbound notifications or hosted writes.
"""
from profiles import Profiles
from journey import lit
from concurrent.futures import ThreadPoolExecutor
import json,re,uuid,unittest,sys,datetime
class Invoices(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles','staff_booking_assignment','invoices_payments']
 def call(self,owner,name,**args):
  return json.loads(self.scope(owner,'select public.business_invoice_'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if k=='p_document' else lit(v)) for k,v in args.items())+')'))
 def test_invoices(self):
  a,b=self.ids;bid=self.bids[0];today=datetime.date.today().isoformat();due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat()
  self.sql("update invoice_private.ingress set enabled=true where environment='live';update booking_private.ingress set enabled=true where environment='live'")
  args=dict(p_business=bid,p_environment='live');doc={'name':'Fictional Invoice Client','email':'client@example.test','phone':'','notes':'Agreed items','currency':'ZAR','items':[{'name':'Clean','quantity':2,'price':25025},{'name':'Extra','quantity':3,'price':1000}]}
  rid=str(uuid.uuid4());self.scope(a,'select public.business_booking_write('+','.join([lit(bid),lit('live'),lit(rid),'0','null',lit(json.dumps(doc))+'::jsonb',lit('1 Fictional Test Road'),lit('2026-12-01 08:00')+'::timestamp',lit('Africa/Johannesburg'),'120',lit('Scheduled')])+')')
  before=self.sql('select to_jsonb(t) from public.business_bookings t where id='+lit(rid))
  iid=str(uuid.uuid4());self.call(a,'write',**args,p_id=iid,p_version=0,p_action='save',p_document=doc|{'name':'Tampered'},p_due=due,p_booking=rid)
  self.assertEqual(json.loads(self.scope(a,'select document from public.business_invoices where id='+lit(iid))),doc)
  # Concurrent creation with distinct keys returns the one existing booking invoice.
  with ThreadPoolExecutor(max_workers=4) as ex:
   results=list(ex.map(lambda _:self.call(a,'write',**args,p_id=str(uuid.uuid4()),p_version=0,p_action='save',p_document=doc,p_due=due,p_booking=rid),range(4)))
  self.assertEqual({x['id'] for x in results},{iid})
  self.call(a,'write',**args,p_id=iid,p_version=1,p_action='issue')
  row=json.loads(self.scope(a,'select to_jsonb(t) from public.business_invoice_list t where id='+lit(iid)));self.assertEqual((row['total'],row['balance'],row['status'],row['number']),(53050,53050,'Unpaid','INV-000001'))
  for owner,kw in [(b,{}),(a,{'p_environment':'preview'})]:
   with self.assertRaises(RuntimeError):self.call(owner,'write',**(args|kw),p_id=iid,p_version=2,p_action='void',p_reason='Wrong business')
  for action in ['save','issue']:
   with self.assertRaises(RuntimeError):self.call(a,'write',**args,p_id=iid,p_version=2,p_action=action,p_document=doc,p_due=due)
  pid=str(uuid.uuid4());pay=dict(**args,p_invoice=iid,p_id=pid,p_amount=20000,p_paid_on=today,p_reference='TEST bank 001')
  with ThreadPoolExecutor(max_workers=4) as ex:results=list(ex.map(lambda _:self.call(a,'payment',**pay),range(4)))
  self.assertEqual(self.scope(a,'select count(*) from public.business_invoice_payments'),'1')
  self.assertEqual(self.scope(a,'select status from public.business_invoice_list'),'Part Paid')
  for change in [dict(p_id=str(uuid.uuid4())),dict(p_amount=20001),dict(p_id=str(uuid.uuid4()),p_amount=999999),dict(p_id=str(uuid.uuid4()),p_amount=-1),dict(p_environment='preview')]:
   with self.assertRaises(RuntimeError):self.call(a,'payment',**(pay|change))
  with self.assertRaises(RuntimeError):self.call(b,'payment',**pay)
  with self.assertRaises(RuntimeError):self.call(a,'write',**args,p_id=iid,p_version=3,p_action='void',p_reason='Wrong details')
  remainder=pay|dict(p_id=str(uuid.uuid4()),p_amount=33050,p_reference='TEST bank 002');self.call(a,'payment',**remainder)
  self.assertEqual(self.scope(a,'select status from public.business_invoice_list'),'Paid')
  reversal=pay|dict(p_id=str(uuid.uuid4()),p_reversal=pid,p_reason='Amount entered incorrectly');self.call(a,'payment',**reversal);self.call(a,'payment',**reversal)
  self.assertEqual(self.scope(a,'select balance from public.business_invoice_list'),'20000')
  with self.assertRaises(RuntimeError):self.call(a,'payment',**(reversal|dict(p_id=str(uuid.uuid4()))))
  self.call(a,'payment',**(remainder|dict(p_id=str(uuid.uuid4()),p_reversal=remainder['p_id'],p_reason='Wrong invoice payment')))
  self.call(a,'write',**args,p_id=iid,p_version=6,p_action='void',p_reason='Invoice created in error')
  self.assertEqual(self.scope(a,'select status from public.business_invoice_list'),'Void')
  self.assertEqual(self.sql('select to_jsonb(t) from public.business_bookings t where id='+lit(rid)),before)
  self.assertEqual(self.scope(a,'select count(*) from public.business_invoice_payments'),'4')
  public=json.loads(self.sql("set role anon;select public.business_invoice_customer('live',"+lit(row['share_token'])+')'))
  self.assertEqual(public['status'],'Void');self.assertNotIn('email',public['document']);self.assertNotIn('share_token',public);self.assertNotIn('PRIVATE',json.dumps(public))
  self.assertEqual(self.sql("set role anon;select public.business_invoice_customer('preview',"+lit(row['share_token'])+')'),'{}')
  for table in ['business_invoices','business_invoice_payments','business_invoice_events','business_invoice_list']:
   self.assertEqual(self.scope(b,'select count(*) from public.'+table),'0')
   for q in ['set role anon;select * from public.'+table,'set role authenticated;delete from public.'+table]:
    with self.assertRaises(RuntimeError):self.sql(q)
  # Manual invoices: concurrent issuance has unique, monotonic tenant numbers.
  mids=[str(uuid.uuid4()) for _ in range(4)]
  for mid in mids:self.call(a,'write',**args,p_id=mid,p_version=0,p_action='save',p_document=doc,p_due=due)
  with ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(lambda mid:self.call(a,'write',**args,p_id=mid,p_version=1,p_action='issue'),mids))
  self.assertEqual(self.scope(a,'select count(distinct number) from public.business_invoices'),'5')
  # Real PHP HTTP save/reload, validation, sharing, payment and correction.
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/invoices.php?new=1';html=self.get(path)[1];self.assertIn('Invoice draft',html);newid=re.search('name="id" value="([^"]+)"',html)[1]
  data=dict(id=newid,version=0,action='save',name='Fictional HTTP Client',email='client@example.test',phone='',notes='<script>note</script>',due_on=due,item_name_0='Service',quantity_0='3',price_0='123.45')
  self.assertIn('positive total',self.post(path,**(data|dict(price_0='0'))))
  self.assertIn('Draft saved',self.post(path,**data));self.assertIn('Invoice changed',self.post(path,**data));self.assertEqual(self.scope(a,'select count(*) from public.business_invoices where id='+lit(newid)),'1');path='/account/invoices.php?id='+newid
  self.assertIn('370.35',self.get(path)[1]);self.assertIn('Invoice issued',self.post(path,action='issue',version=1,confirm_issue='on'))
  html=self.get(path)[1];token=re.search('token=([a-f0-9]{64})',html)[1];publicpath='/invoice/index.php?token='+token
  self.assertIn('370.35',self.get(publicpath)[1]);self.assertNotIn('<script>note',self.get(publicpath)[1]);self.assertNotIn('Record payment',self.get(publicpath)[1])
  key=re.search('name="payment_id" value="([^"]+)"',html)[1]
  data=dict(action='payment',payment_id=key,amount='100.10',paid_on=today,reference='HTTP test transfer',confirm_payment='on')
  self.assertIn('Payment recorded',self.post(path,**data));self.assertIn('270.25',self.get(path)[1]);self.assertIn('Part Paid',self.get(publicpath)[1])
  self.assertIn('Payment recorded',self.post(path,**data));self.assertEqual(self.scope(a,'select count(*) from public.business_invoice_payments where invoice_id='+lit(newid)),'1')
  html=self.get(path)[1];rev=re.search('name="reversal" value="([^"]+)"',html)[1];key=re.search('name="action" value="reverse">.*?name="payment_id" value="([^"]+)"',html)[1]
  self.assertIn('Payment reversed',self.post(path,action='reverse',reversal=rev,payment_id=key,reason='Wrong payment amount',confirm_payment='on'))
  self.assertIn('Original retained',self.get(path)[1]);self.assertIn('Unpaid',self.get(publicpath)[1])
  self.assertEqual(self.get('/invoice/index.php?token='+'f'*64)[0],404);self.assertEqual(self.get('/account/invoices-core.php')[0],403)
  self.assertIn('INV-000001',self.get('/account/invoices.php?new=1&booking='+rid)[1])
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertIn('Invoice unavailable',self.get(path)[1]);self.assertNotIn('Fictional HTTP',self.get('/account/invoices.php')[1])
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Invoices('test_invoices')]));sys.exit(not r.wasSuccessful())
