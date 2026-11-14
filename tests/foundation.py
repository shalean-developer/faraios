"""First-batch behavioral regression with native PostgreSQL and real PHP HTTP.
Auth/REST transports simulated. All fixtures disposable, no provider sends.
"""
from invoices import Invoices
from journey import lit
from concurrent.futures import ThreadPoolExecutor
import uuid,json,datetime,unittest,re,urllib.request,urllib.parse
from pathlib import Path
class Foundation(Invoices):
 @classmethod
 def post(cls,path,**fields):
  html=cls.get(path)[1];fields['csrf']=re.search('name="csrf" value="([^"]+)"',html)[1]
  parsed=urllib.parse.urlsplit(cls.url);origin=parsed.scheme+'://'+parsed.netloc
  return cls.client.open(urllib.request.Request(cls.url+path,data=urllib.parse.urlencode(fields).encode(),headers={'Origin':origin})).read().decode()

 def test_foundation(self):
  a,b=self.ids;bid=self.bids[0];due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat();today=datetime.date.today().isoformat()
  self.sql("update quote_private.ingress set enabled=true where environment='live';update invoice_private.ingress set enabled=true where environment='live';update booking_private.ingress set enabled=true where environment='live'")
  doc=dict(name='Fictional Field Service',email='preview@example.test',phone='',notes='Agreed site work',currency='ZAR',items=[dict(name='Site assessment',quantity=1,price=0)])
  def rpc(owner,name,**kw):return json.loads(self.scope(owner,'select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if isinstance(v,dict) else lit(v)) for k,v in kw.items())+')'))
  ctx=dict(p_business=bid,p_environment='preview');qid=str(uuid.uuid4())
  rpc(a,'business_quote_write',**ctx,p_id=qid,p_version=0,p_action='save',p_document=doc,p_expiry=due)
  # Existing send API cannot bypass free confirmation. Wrong owner, env, stale/null/false reject.
  with self.assertRaises(RuntimeError):rpc(a,'business_quote_write',**ctx,p_id=qid,p_version=1,p_action='send',p_document=doc,p_expiry=due)
  for owner,changes in [(a,dict(p_free_confirmed=False)),(a,dict(p_free_confirmed=None)),(b,dict(p_free_confirmed=True)),(a,dict(p_environment='live',p_free_confirmed=True)),(a,dict(p_version=0,p_free_confirmed=True))]:
   with self.assertRaises(RuntimeError):rpc(owner,'business_quote_send',**(ctx|dict(p_id=qid,p_version=1)|changes))
  self.assertEqual(self.scope(a,f"select free_confirmed_at is null from public.business_quotes where id='{qid}'"),'t')
  rpc(a,'business_quote_send',**ctx,p_id=qid,p_version=1,p_free_confirmed=True)
  self.assertEqual(self.scope(a,f"select free_confirmed_at is not null from public.business_quotes where id='{qid}'"),'t')
  token=self.scope(a,f"select share_token from public.business_quotes where id='{qid}'")
  self.sql("set role anon;select public.business_quote_customer('preview',"+lit(token)+",'Accepted')")
  booking=str(uuid.uuid4())
  self.scope(a,'select public.business_booking_write('+','.join(map(lit,[bid,'preview',booking,0,qid]))+','+lit(json.dumps(doc))+'::jsonb,'+','.join(map(lit,['1 Fictional Road','2026-12-01 09:00','Africa/Johannesburg',60,'Scheduled']))+')')
  self.assertEqual(self.scope(a,f"select document->'items'->0->>'price' from public.business_bookings where id='{booking}'"),'0')
  # Positive booking invoice, payment/reversal, void, correction chain and concurrent replacement.
  paid_doc=doc|dict(items=[dict(name='Agreed repair',quantity=2,price=12550)])
  booking2=str(uuid.uuid4());self.scope(a,'select public.business_booking_write('+','.join(map(lit,[bid,'preview',booking2,0,None]))+','+lit(json.dumps(paid_doc))+'::jsonb,'+','.join(map(lit,['2 Fictional Road','2026-12-02 09:00','Africa/Johannesburg',60,'Scheduled']))+')')
  iid=str(uuid.uuid4());self.call(a,'write',**ctx,p_id=iid,p_version=0,p_action='save',p_document=paid_doc,p_due=due,p_booking=booking2)
  self.call(a,'write',**ctx,p_id=iid,p_version=1,p_action='issue')
  pid=str(uuid.uuid4());pay=ctx|dict(p_invoice=iid,p_id=pid,p_amount=10000,p_paid_on=today,p_reference='Fictional transfer')
  self.call(a,'payment',**pay)
  with self.assertRaises(RuntimeError):self.call(a,'write',**ctx,p_id=iid,p_version=3,p_action='replace',p_reason='Correct agreed amount')
  with self.assertRaises(RuntimeError):self.call(a,'write',**ctx,p_id=iid,p_version=3,p_action='void',p_reason='Correct agreed amount')
  self.call(a,'payment',**(pay|dict(p_id=str(uuid.uuid4()),p_reversal=pid,p_reason='Correct ledger record')))
  self.call(a,'write',**ctx,p_id=iid,p_version=4,p_action='void',p_reason='Correct agreed amount')
  original=self.sql(f"select to_jsonb(i) from public.business_invoices i where id='{iid}'");ledger=self.sql(f"select jsonb_agg(to_jsonb(p) order by id) from public.business_invoice_payments p where invoice_id='{iid}'")
  replacement=ctx|dict(p_id=iid,p_version=5,p_action='replace',p_reason='Correct agreed amount')
  for owner,changes in [(b,{}),(a,dict(p_environment='live')),(a,dict(p_version=4)),(a,dict(p_reason='bad'))]:
   with self.assertRaises(RuntimeError):self.call(owner,'write',**(replacement|changes))
  with ThreadPoolExecutor(max_workers=4) as ex:results=list(ex.map(lambda _:self.call(a,'write',**replacement),range(4)))
  self.assertEqual(len({r['id'] for r in results}),1);child=results[0]['id']
  self.assertEqual(self.scope(a,f"select replaces_id from public.business_invoices where id='{child}'"),iid)
  corrected=paid_doc|dict(items=[dict(name='Corrected repair',quantity=3,price=10000)])
  self.call(a,'write',**ctx,p_id=child,p_version=1,p_action='save',p_document=corrected,p_due=due,p_booking=booking2)
  self.call(a,'write',**ctx,p_id=child,p_version=2,p_action='issue')
  self.assertEqual(self.scope(a,f"select total from public.business_invoice_list where id='{child}'"),'30000')
  self.assertEqual(self.scope(a,f"select number from public.business_invoices where id='{child}'"),'INV-000002')
  self.assertEqual(self.sql(f"select to_jsonb(i) from public.business_invoices i where id='{iid}'"),original)
  self.assertEqual(self.sql(f"select jsonb_agg(to_jsonb(p) order by id) from public.business_invoice_payments p where invoice_id='{iid}'"),ledger)
  self.assertEqual(json.loads(self.scope(a,f"select document from public.business_bookings where id='{booking2}'")),paid_doc)
  self.assertEqual(self.scope(b,'select count(*) from public.business_invoice_list'),'0')
  # New endpoints remain preview-only; anonymous claims and direct DML cannot bypass controls.
  for query in ["set role anon;select public.business_quote_send("+','.join(map(lit,[bid,'preview',qid,1,True]))+")", "set role authenticated;update public.business_quotes set free_confirmed_at=now()"]:
   with self.assertRaises(RuntimeError):self.sql(query)
  with self.assertRaises(RuntimeError):self.sql("set role authenticated;set request.jwt.claim.sub="+lit(a)+";set request.jwt.claims='{\"is_anonymous\":true}';select public.business_quote_send("+','.join(map(lit,[bid,'preview',qid,1,True]))+")")
  with self.assertRaises(RuntimeError):self.call(a,'write',**(replacement|dict(p_environment='live')))
  self.assertEqual(self.scope(a,f"select count(*) from public.business_invoices where booking_id='{booking2}' and state<>'Void'"),'1')
  # A further correction forms a chain, not a fork, with unique numbering.
  self.call(a,'write',**ctx,p_id=child,p_version=3,p_action='void',p_reason='Further correction required')
  grandchild=self.call(a,'write',**ctx,p_id=child,p_version=4,p_action='replace',p_reason='Further correction required')['id']
  self.assertEqual(self.scope(a,f"select replaces_id from public.business_invoices where id='{grandchild}'"),child)
  # Real form journey: zero total requires an extra confirmation, then shares normally.
  private=self.private/'profiles';config=private/'config.php';config.write_text(config.read_text().replace(self.url,self.url+'/preview'))
  (private/'router.php').write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(Path(__file__).resolve().parents[1]))+".$path;require $_SERVER['SCRIPT_FILENAME'];return true;")
  type(self).url+='/preview'
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  html=self.post('/account/quotes.php?new=1',action='save',version=0,name=doc['name'],email=doc['email'],phone='',notes='',expires_on=due,item_name_0='Free consultation',quantity_0='1',price_0='0')
  self.assertIn('Draft saved',html)
  qnew=self.scope(a,"select id from public.business_quotes where document->'items'->0->>'name'='Free consultation'");path='/account/quotes.php?id='+qnew
  self.assertIn('deliberately offer',html)
  self.assertIn('deliberately a free quote',self.post(path,action='send',version=1,confirm_send='on'))
  self.assertIn('Quote marked sent',self.post(path,action='send',version=1,confirm_send='on',confirm_free='on'))
  # Manual correction HTTP creates one linked editable draft; reload keeps old records accessible.
  self.assertIn('original invoice',self.get('/account/invoices.php?id='+child)[1])
  self.assertIn('Replacement:',self.get('/account/invoices.php?id='+iid)[1])
  invoicepath='/account/invoices.php?id='+grandchild
  saved=self.post(invoicepath,action='save',version=1,name=doc['name'],email=doc['email'],phone='',notes='Corrected document',due_on=due,item_name_0='Final corrected work',quantity_0='1',price_0='275.25')
  self.assertIn('Draft saved',saved);self.assertIn('275.25',saved)
  self.assertIn('Invoice issued',self.post(invoicepath,action='issue',version=2,confirm_issue='on'))
  self.assertIn('INV-000003',self.get(invoicepath)[1])
  self.assertEqual(self.sql(f"select to_jsonb(i) from public.business_invoices i where id='{iid}'"),original)

if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Foundation('test_foundation')]));raise SystemExit(not r.wasSuccessful())
