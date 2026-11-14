"""Native production activation/rollback rehearsal; entirely disposable, no hosted writes."""
from invoices import Invoices
from journey import ROOT,lit
from foundation import Foundation
from concurrent.futures import ThreadPoolExecutor
import unittest,json,datetime,uuid
class Activation(Foundation):
 def snapshot(self):
  tables=self.sql("select schemaname||'.'||tablename from pg_tables where schemaname in ('public','invoice_private','quote_private','booking_private','enquiry_private') order by 1").splitlines()
  return {t:self.sql('select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),\'[]\') from '+t+' t') for t in tables}
 def test_activation(self):
  # Establish issued/void documents, numbering and payment/reversal history first.
  self.test_invoices()
  before=self.snapshot()
  for _ in range(2):self.sql((ROOT/'release/activate-foundation.sql').read_text())
  self.assertEqual(before,self.snapshot())
  a,b=self.ids;bid=self.bids[0];ctx=dict(p_business=bid,p_environment='live')
  self.sql("update quote_private.ingress set enabled=true where environment='live';update invoice_private.ingress set enabled=true where environment='live'")
  due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat()
  doc=dict(name='Fictional activation client',email='fixture@example.test',phone='',notes='',currency='ZAR',items=[dict(name='Free consultation',quantity=1,price=0)])
  def rpc(owner,name,**kw):return json.loads(self.scope(owner,'select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if isinstance(v,dict) else lit(v)) for k,v in kw.items())+')'))
  qid=str(uuid.uuid4());rpc(a,'business_quote_write',**ctx,p_id=qid,p_version=0,p_action='save',p_document=doc,p_expiry=due)
  with self.assertRaises(RuntimeError):rpc(a,'business_quote_write',**ctx,p_id=qid,p_version=1,p_action='send',p_document=doc,p_expiry=due)
  for owner,extra in [(a,dict(p_free_confirmed=False)),(a,dict(p_free_confirmed=None)),(b,dict(p_free_confirmed=True)),(a,dict(p_environment='invalid',p_free_confirmed=True))]:
   with self.assertRaises(RuntimeError):rpc(owner,'business_quote_send',**(ctx|dict(p_id=qid,p_version=1)|extra))
  config=self.private/'profiles/config.php';original_config=config.read_text()
  config.write_text(original_config.replace("'enabled'=>true", "'enabled'=>true,'foundation_release'=>true"))
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/quotes.php?id='+qid
  self.assertIn('deliberately a free quote',self.post(path,action='send',version=1,confirm_send='on'))
  sent=self.post(path,action='send',version=1,confirm_send='on',confirm_free='on')
  self.assertTrue('Quote marked sent' in sent,repr(self.rpc_requests[-2:]))
  self.assertEqual(self.scope(a,f"select status from public.business_quotes where id='{qid}'"),'Sent')
  iid=self.scope(a,"select id from public.business_invoices where state='Void' limit 1")
  version=int(self.scope(a,'select version from public.business_invoices where id='+lit(iid)))
  original=self.sql('select to_jsonb(t) from public.business_invoices t where id='+lit(iid))
  ledger=self.sql('select jsonb_agg(to_jsonb(t) order by id) from public.business_invoice_payments t')
  def replace(owner=a):return self.call(owner,'write',**ctx,p_id=iid,p_version=version,p_action='replace',p_reason='Fictional activation correction')
  with self.assertRaises(RuntimeError):replace(b)
  with ThreadPoolExecutor(max_workers=4) as ex:results=list(ex.map(lambda _:replace(),range(4)))
  self.assertEqual(len({str(r) for r in results}),1)
  child=self.scope(a,'select id from public.business_invoices where replaces_id='+lit(iid))
  self.assertEqual(self.scope(a,'select count(*) from public.business_invoices where replaces_id='+lit(iid)),'1')
  self.call(a,'write',**ctx,p_id=child,p_version=1,p_action='save',p_document=doc|dict(items=[dict(name='Corrected work',quantity=1,price=32100)]),p_due=due)
  self.call(a,'write',**ctx,p_id=child,p_version=2,p_action='issue')
  self.assertEqual(self.sql('select to_jsonb(t) from public.business_invoices t where id='+lit(iid)),original)
  self.assertEqual(self.sql('select jsonb_agg(to_jsonb(t) order by id) from public.business_invoice_payments t'),ledger)
  config.write_text(original_config)
  before=self.snapshot();self.sql((ROOT/'release/deactivate-foundation.sql').read_text());self.assertEqual(before,self.snapshot())
  with self.assertRaises(RuntimeError):replace()
  # Re-activation retains corrected documents and all history.
  self.sql((ROOT/'release/activate-foundation.sql').read_text());self.assertEqual(before,self.snapshot())
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Activation('test_activation')]));raise SystemExit(not r.wasSuccessful())
