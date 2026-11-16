"""V1-012: invariant, concurrent-writer and history proof on disposable native PG."""
import importlib.util,json,uuid,unittest
from concurrent.futures import ThreadPoolExecutor
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('financial_workflow',ROOT/'tests/workflow-repairs.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Financial(base.Workflow):
 sc04_report_name='financial-safeguards.json'
 def ctx(self):return dict(p_business=self.bids[0],p_environment='preview')
 def doc(self,total=10000):return self.document()|dict(name='Synthetic V1012 customer',items=[dict(name='Synthetic financial service',quantity=1,price=total)])
 def make(self,total=10000,booking=None,issue=True):
  iid=str(uuid.uuid4());result=self.call(self.ids[0],'write',**self.ctx(),p_id=iid,p_version=0,p_action='save',p_document=self.doc(total),p_booking=booking,p_due=self.sql('select current_date+14'))
  iid=result['id']
  if issue:self.call(self.ids[0],'write',**self.ctx(),p_id=iid,p_version=1,p_action='issue')
  return iid
 def row(self,iid):return json.loads(self.sql('select to_jsonb(i) from public.business_invoice_list i where id='+lit(iid)))
 def snap(self,iid):return {t:self.sql("select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from public."+t+' t where '+('id'if t=='business_invoices'else'invoice_id')+'='+lit(iid)) for t in ['business_invoices','business_invoice_payments','business_invoice_events']}
 def payment(self,iid,amount=1000,reference='SYNTH-V1012-RECEIPT',pid=None,**extra):
  args=self.ctx()|dict(p_invoice=iid,p_id=pid or str(uuid.uuid4()),p_amount=amount,p_paid_on=self.sql('select current_date'),p_reference=reference)|extra
  return args
 def test_01_one_active_booking_invoice_under_concurrent_create_and_retry(self):
  bid=self.booking();before=self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid))
  with ThreadPoolExecutor(max_workers=4)as pool:ids=list(pool.map(lambda _:self.make(booking=bid,issue=False),range(4)))
  self.assertEqual(len(set(ids)),1);iid=ids[0];self.call(self.ids[0],'write',**self.ctx(),p_id=iid,p_version=1,p_action='issue');original=self.snap(iid)
  self.assertEqual(self.make(booking=bid,issue=False),iid);self.assertEqual(self.snap(iid),original)
  self.assertEqual(self.sql("select count(*) from public.business_invoices where booking_id="+lit(bid)+" and state<>'Void'"),'1');self.assertEqual(self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid)),before)
 def test_02_unique_monotonic_numbering_and_issue_retry(self):
  start=int(self.sql("select coalesce(max(substring(number from 5)::bigint),0) from public.business_invoices where business_id="+lit(self.bids[0])+" and environment='preview'"));ids=[self.make(issue=False)for _ in range(4)]
  with ThreadPoolExecutor(max_workers=4)as pool:list(pool.map(lambda i:self.call(self.ids[0],'write',**self.ctx(),p_id=i,p_version=1,p_action='issue'),ids))
  numbers=[self.row(i)['number']for i in ids];self.assertEqual(sorted(int(n[4:])for n in numbers),list(range(start+1,start+5)));self.assertTrue(all(n.startswith('INV-')and len(n)>=10 for n in numbers))
  for i in ids:
   before=self.snap(i)
   with self.assertRaises(RuntimeError):self.call(self.ids[0],'write',**self.ctx(),p_id=i,p_version=1,p_action='issue')
   self.assertEqual(self.snap(i),before)
 def test_03_partial_full_balance_and_duplicate_payload_denials(self):
  iid=self.make(53050);a=self.payment(iid,20000,'SYNTH-V1012-PART');self.call(self.ids[0],'payment',**a);r=self.row(iid);self.assertEqual((r['total'],r['paid'],r['balance'],r['status']),(53050,20000,33050,'Part Paid'));original=self.snap(iid)
  self.call(self.ids[0],'payment',**a);self.assertEqual(self.snap(iid),original)
  for change in [dict(p_id=str(uuid.uuid4()),p_reference='synth-v1012-part'),dict(p_amount=20001),dict(p_reference='Changed original key'),dict(p_id=str(uuid.uuid4()),p_amount=33051,p_reference='Too much')]:
   with self.assertRaises(RuntimeError):self.call(self.ids[0],'payment',**(a|change))
   self.assertEqual(self.snap(iid),original)
  self.call(self.ids[0],'payment',**self.payment(iid,33050,'SYNTH-V1012-REST'));r=self.row(iid);self.assertEqual((r['total'],r['paid'],r['balance'],r['status']),(53050,53050,0,'Paid'));before=self.snap(iid)
  with self.assertRaises(RuntimeError):self.call(self.ids[0],'payment',**self.payment(iid,1,'SYNTH-V1012-OVER'))
  self.assertEqual(self.snap(iid),before)
 def test_04_competing_distinct_payments_cannot_overpay_last_balance(self):
  iid=self.make(10000);args=[self.payment(iid,6000,'SYNTH-V1012-RACE-'+str(n))for n in range(2)]
  def pay(a):
   try:self.call(self.ids[0],'payment',**a);return True
   except RuntimeError as e:self.assertIn('outstanding balance',str(e));return False
  with ThreadPoolExecutor(max_workers=2)as pool:results=list(pool.map(pay,args))
  self.assertEqual(sorted(results),[False,True]);r=self.row(iid);self.assertEqual((r['paid'],r['balance']),(6000,4000));self.assertEqual(self.sql('select count(*) from public.business_invoice_payments where invoice_id='+lit(iid)),'1')
 def test_05_append_only_reversal_and_single_replacement_chain(self):
  bid=self.booking();iid=self.make(booking=bid);a=self.payment(iid,1000,'SYNTH-V1012-TRACE');self.call(self.ids[0],'payment',**a);receipt=self.sql('select to_jsonb(p) from public.business_invoice_payments p where id='+lit(a['p_id']));before=self.snap(iid)
  with self.assertRaises(RuntimeError):self.call(self.ids[0],'write',**self.ctx(),p_id=iid,p_version=self.row(iid)['version'],p_action='void',p_reason='Synthetic correction requested')
  self.assertEqual(self.snap(iid),before)
  reversal=a|dict(p_id=str(uuid.uuid4()),p_reversal=a['p_id'],p_reason='Synthetic entry correction');self.call(self.ids[0],'payment',**reversal);before=self.snap(iid);self.call(self.ids[0],'payment',**reversal);self.assertEqual(self.snap(iid),before)
  with self.assertRaises(RuntimeError):self.call(self.ids[0],'payment',**(reversal|dict(p_id=str(uuid.uuid4()))))
  self.assertEqual(self.snap(iid),before);r=self.row(iid);self.assertEqual((r['paid'],r['balance'],r['status']),(0,r['total'],'Unpaid'));self.assertEqual(self.sql('select to_jsonb(p) from public.business_invoice_payments p where id='+lit(a['p_id'])),receipt)
  self.call(self.ids[0],'write',**self.ctx(),p_id=iid,p_version=r['version'],p_action='void',p_reason='Synthetic document correction');version=self.row(iid)['version'];old=self.snap(iid);booking=self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid))
  def replace(_):return self.call(self.ids[0],'write',**self.ctx(),p_id=iid,p_version=version,p_action='replace',p_reason='Synthetic document correction')['id']
  with ThreadPoolExecutor(max_workers=4)as pool:children=list(pool.map(replace,range(4)))
  self.assertEqual(len(set(children)),1);child=children[0];self.assertEqual(self.row(child)['replaces_id'],iid);self.assertEqual(self.snap(iid)['business_invoices'],old['business_invoices']);self.assertEqual(self.snap(iid)['business_invoice_payments'],old['business_invoice_payments'])
  self.call(self.ids[0],'write',**self.ctx(),p_id=child,p_version=1,p_action='save',p_document=self.doc(27525),p_due=self.sql('select current_date+14'),p_booking=bid);self.call(self.ids[0],'write',**self.ctx(),p_id=child,p_version=2,p_action='issue')
  self.assertEqual(self.row(child)['total'],27525);self.assertNotEqual(self.row(child)['number'],self.row(iid)['number']);self.assertEqual(self.snap(iid)['business_invoices'],old['business_invoices']);self.assertEqual(self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid)),booking)
  self.assertEqual(self.sql("select count(*) from public.business_invoices where booking_id="+lit(bid)+" and state<>'Void'"),'1')
  events=json.loads(self.snap(iid)['business_invoice_events']);self.assertTrue(any(e['action']=='replacement'and e['detail']['replacement']==child for e in events))
 def test_06_scope_role_and_direct_write_denials_preserve_history(self):
  self.enable();iid=self.make();m=self.member('manager');args=self.payment(iid)
  self.command(m,'business_invoice_payment',{k:v for k,v in args.items()if k not in ['p_business','p_environment']});before=self.snap(iid)
  for role in ['receptionist','worker']:
   u=self.member(role)
   with self.assertRaises(RuntimeError):self.command(u,'business_invoice_payment',{k:v for k,v in args.items()if k not in ['p_business','p_environment']})
  with self.assertRaises(RuntimeError):self.command(m,'business_invoice_payment',dict(p_invoice=iid,p_id=str(uuid.uuid4()),p_amount=1000,p_paid_on=args['p_paid_on'],p_reference=args['p_reference'],p_reversal=args['p_id'],p_reason='Forbidden manager reversal'))
  with self.assertRaises(RuntimeError):self.call(self.ids[1],'payment',**args)
  for table in ['business_invoices','business_invoice_payments','business_invoice_events']:
   with self.assertRaises(RuntimeError):self.legacy(self.ids[0],'delete from public.'+table)
  self.assertEqual(self.snap(iid),before);self.enable(False)
if __name__=='__main__':
 names=[n for n in Financial.__dict__ if n.startswith('test_')];r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Financial(n)for n in names));raise SystemExit(not r.wasSuccessful())
