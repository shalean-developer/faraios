"""Disposable native PostgreSQL + real PHP HTTP; no hosted writes or emails."""
from profiles import Profiles
from journey import lit
import json,unittest,re,uuid
class Workflow(Profiles):
 def test_workflow(self):
  a,b=self.ids;bid=self.bids[0];eid=str(uuid.uuid4())
  self.sql("update enquiry_private.ingress set enabled=true where environment='live';update quote_private.ingress set enabled=true where environment='live'")
  prefix='Verified customer requirements.\n';req=(prefix*129)[:3999]+'.'
  self.scope(a,"select public.business_enquiry_create("+','.join(map(lit,[bid,'live',eid,'Fictional Enquiry','a@example.test','',req]))+")")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/enquiries.php?id='+eid
  self.assertIn('Private notes',self.get(path)[1])
  # A browser POST normalizes textarea newlines to CRLF. Manual intake must keep its 4000-character promise.
  self.assertIn('Enquiry created',self.post('/account/enquiry-new.php',id=str(uuid.uuid4()),name='Multiline test',email='multiline@example.test',phone='',requirements=req.replace('\n','\r\n')))
  fields=dict(id=eid,version=1,status='Contacted',private_notes='PRIVATE <script>internal</script>',follow_up_on='2026-11-14')
  self.assertIn('Enquiry saved',self.post(path,**fields))
  html=self.get(path)[1];self.assertIn('PRIVATE &lt;script&gt;',html);self.assertNotIn('PRIVATE <script>',html)
  self.assertIn('Reload before updating',self.post(path,**fields))
  self.assertIn('valid follow-up',self.post(path,**(fields|dict(version=2,follow_up_on='2026-02-30'))))
  self.assertEqual(self.scope(a,f"select version from public.business_enquiries where id='{eid}'"),'2')
  self.assertIn('Fictional Enquiry',self.get('/account/enquiries.php?due=1')[1])
  dashboard=json.loads(self.scope(a,f"select public.business_dashboard('{bid}','live',null)"));self.assertEqual(dashboard['followups_due'],1)
  quote='/account/quotes.php?new=1&enquiry='+eid
  self.assertIn(req,self.get(quote)[1]);self.assertNotIn('PRIVATE',self.get(quote)[1])
  data=dict(action='save',version=0,enquiry=eid,name='Fictional Enquiry',email='a@example.test',phone='',notes=req.replace('\n','\r\n'),expires_on='2026-11-28',item_name_0='Service',quantity_0='1',price_0='500')
  saved=self.post(quote,**data);self.assertTrue('Draft saved' in saved,re.findall(r'<p class="alert"[^>]*>(.*?)</p>',saved))
  q=json.loads(self.scope(a,f"select to_jsonb(q) from public.business_quotes q where enquiry_id='{eid}'"));qid=q['id']
  self.assertEqual(q['document']['notes'],req);self.assertEqual(len(req),4000)
  self.assertIn(qid,self.get(path)[1]);self.assertIn('Source enquiry',self.get('/account/quotes.php?enquiry='+eid)[1])
  self.post('/account/quotes.php?id='+qid,id=qid,version=1,action='send',confirm_send='on')
  token=self.scope(a,f"select share_token from public.business_quotes where id='{qid}'")
  pub=json.loads(self.sql("set role anon;select public.business_quote_customer('live',"+lit(token)+",'Accepted')"));self.assertNotIn('PRIVATE',json.dumps(pub));self.assertEqual(pub['document']['notes'],req)
  self.assertIn('Compose quote email',self.get('/account/quotes.php?id='+qid)[1]);self.assertIn('Accepted',self.get(path)[1]);self.assertEqual(self.scope(a,f"select status from public.business_enquiries where id='{eid}'"),'Contacted')
  args=','.join(map(lit,[bid,'live',eid,2,'Closed','PRIVATE saved', '2026-11-14']))
  self.scope(a,'select public.business_enquiry_workflow_save('+args+')')
  self.assertNotIn('Fictional Enquiry',self.get('/account/enquiries.php?due=1')[1])
  self.assertEqual(json.loads(self.scope(a,f"select public.business_dashboard('{bid}','live',null)"))['followups_due'],0)
  self.scope(a,'select public.business_enquiry_workflow_save('+','.join(map(lit,[bid,'live',eid,3,'Contacted','',None]))+')')
  self.assertEqual(self.scope(a,f"select follow_up_on is null from public.business_enquiries where id='{eid}'"),'t')
  ws=json.loads(self.scope(a,f"select public.business_enquiry_workspace('{bid}','live','{eid}',1)"));self.assertEqual(len(ws['activity']),4)
  # Pagination, immutable activity and environment/business isolation.
  from pathlib import Path
  import os
  if output:=os.environ.get('ENQUIRY_HTML_FIXTURE'):Path(output).write_text(self.get(path)[1])
  for i in range(22):self.scope(a,f"update public.business_enquiries set private_notes='revision {i}' where id='{eid}'")
  self.assertEqual(len(json.loads(self.scope(a,f"select public.business_enquiry_workspace('{bid}','live','{eid}',1)"))['activity']),21)
  self.assertEqual(len(json.loads(self.scope(a,f"select public.business_enquiry_workspace('{bid}','live','{eid}',2)"))['activity']),6)
  for query in [f"select public.business_enquiry_workspace('{bid}','preview','{eid}',1)",f"insert into public.business_enquiry_activity(enquiry_id,event,status,private_notes) values('{eid}','Forged','New','bad')",'delete from public.business_enquiry_activity']:
   with self.assertRaises(RuntimeError):self.scope(a,query)
  self.assertEqual(self.scope(b,'select count(*) from public.business_enquiry_activity'),'0')
  for query in [f"select public.business_enquiry_workspace('{bid}','live','{eid}',1)",'select public.business_enquiry_workflow_save('+args+')']:
   with self.assertRaises(RuntimeError):self.scope(b,query)
  with self.assertRaises(RuntimeError):self.sql('set role anon;select * from public.business_enquiry_activity')
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('PRIVATE',self.get(path)[1])
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Workflow('test_workflow')]));raise SystemExit(not result.wasSuccessful())
