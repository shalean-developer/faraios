"""V1-022: real PG/PHP; synthetic local data only, no hosted writes or mail."""
from profiles import Profiles
from journey import ROOT,lit
import unittest,json,uuid,datetime,os,urllib.request,urllib.error,re,subprocess
class Privacy(Profiles):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  if not os.getenv('V1022_BASELINE'):cls.sql((ROOT/'docs/v1-022/customer-document-privacy.sql').read_text())
  cls.sql("update quote_private.ingress set enabled=true;update invoice_private.ingress set enabled=true;update customer_private.ingress set enabled=true")
  cls.fixtures=[];due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat()
  for index,(owner,bid) in enumerate(zip(cls.ids,cls.bids)):
   cid=str(uuid.uuid4());private=dict(name='Private profile',email='profile@example.test',phone='',address='PRIVATE-ADDRESS',notes='PRIVATE-PROFILE-NOTE')
   cls.scope(owner,'select public.business_customer_write('+','.join(map(lit,[bid,'live',cid,0]))+','+lit(json.dumps(private))+'::jsonb,true)')
   for n in range(2):
    d=dict(name=f'Guest customer {index}-{n}',email='HIDDEN-CONTACT@example.test',phone='+27820001111',notes='Agreed customer scope <script>never run</script>',currency='ZAR',items=[dict(name=f'Only item {index}-{n}',quantity=1,price=12345)])
    qid,iid=str(uuid.uuid4()),str(uuid.uuid4())
    cls.scope(owner,'select public.business_customer_quote_create('+','.join(map(lit,[bid,'live',qid,0,'save']))+','+lit(json.dumps(d))+'::jsonb,'+lit(due)+',null,'+lit(cid)+')')
    cls.scope(owner,'select public.business_quote_write('+','.join(map(lit,[bid,'live',qid,1,'send']))+',null,'+lit(due)+')')
    cls.scope(owner,'select public.business_invoice_write('+','.join(map(lit,[bid,'live',iid,0,'save']))+','+lit(json.dumps(d))+'::jsonb,'+lit(due)+');select public.business_invoice_write('+','.join(map(lit,[bid,'live',iid,1,'issue']))+')')
    cls.scope(owner,'select public.business_invoice_payment('+','.join(map(lit,[bid,'live',iid,str(uuid.uuid4()),100,datetime.date.today().isoformat(),'PRIVATE-PAYMENT-REFERENCE']))+')')
    cls.sql('update public.business_quotes set sender=sender || '+lit(json.dumps({'account_email':'PRIVATE-SENDER-ACCOUNT'}))+'::jsonb where id='+lit(qid)+';update public.business_invoices set sender=sender || '+lit(json.dumps({'account_email':'PRIVATE-SENDER-ACCOUNT'}))+'::jsonb where id='+lit(iid))
    cls.fixtures.append(dict(owner=owner,bid=bid,cid=cid,qid=qid,iid=iid,doc=d,quote=cls.sql('select share_token from public.business_quotes where id='+lit(qid)),invoice=cls.sql('select share_token from public.business_invoices where id='+lit(iid))))
 def rpc(self,kind,token,env='live',response='',owner=None):
  call='select public.business_'+kind+'_customer('+lit(env)+','+lit(token)+(','+lit(response) if kind=='quote' else '')+')'
  return json.loads(self.scope(owner,call) if owner else self.sql('set role anon;'+call))
 def request(self,path,method='GET',fields=None,headers=None):
  req=urllib.request.Request(self.url+path,method=method,data=fields,headers={'Origin':self.url}|(headers or {}))
  try:r=self.client.open(req)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.headers,r.read().decode()
 def fingerprint(self):
  return self.sql("select md5(string_agg(s,'' order by s)) from ("+' union all '.join('select to_jsonb(t)::text s from public.'+t+' t' for t in ['business_quotes','business_invoices','business_invoice_payments','business_invoice_events','business_customers'])+")x")
 def test_01_projection_and_preservation(self):
  before=self.fingerprint()
  for f in self.fixtures:
   for kind in ['quote','invoice']:
    data=self.rpc(kind,f[kind]);self.assertEqual(set(data['document']),{'name','items','notes','currency'})
    self.assertEqual(data['document'],{k:f['doc'][k] for k in ['name','items','notes','currency']})
    if kind=='invoice':self.assertEqual((data['total'],data['paid'],data['balance']),(12345,100,12245))
    self.assertEqual(set(data['sender']),{'name','email','phone','time_zone'})
    raw=json.dumps(data)
    for hidden in ['HIDDEN-CONTACT','27820001111','PRIVATE-PROFILE','PRIVATE-ADDRESS',f['bid'],f['cid'],f['qid'],f['iid'],f[kind],'created_by','void_reason','replaces_id','staff_ids','payment_reference','PRIVATE-PAYMENT-REFERENCE','PRIVATE-SENDER-ACCOUNT']:self.assertNotIn(hidden,raw)
    # Signing in to another business does not turn a document capability into history access.
    self.assertEqual(self.rpc(kind,f[kind],owner=self.ids[1]),data)
    for other in self.fixtures:
     if other is not f:self.assertNotIn(other['doc']['name'],raw)
  self.assertEqual(before,self.fingerprint())
 def test_02_altered_links_and_direct_tables(self):
  before=self.fingerprint()
  for f in self.fixtures:
   for kind in ['quote','invoice']:
    for token in [None,'','f'*64,f[kind][:-1],f[kind][:-1]+('0' if f[kind][-1]!='0' else '1'),f['qid'],f['iid'],f['cid'],f['invoice' if kind=='quote' else 'quote']]:self.assertEqual(self.rpc(kind,token),{})
    for env in ['preview','invalid',None]:self.assertEqual(self.rpc(kind,f[kind],env),{})
    for query in ['id='+f['qid'],'customer_id='+f['cid'],'token[]=bad','token=bad','token='+f[kind]+'&id='+self.fixtures[-1]['qid']]:
     status,_,html=self.request('/'+kind+'/index.php?'+query)
     self.assertEqual(status,200 if query.startswith('token='+f[kind]) else 404)
     if status==200:self.assertIn(f['doc']['name'],html)
  for table in ['business_quotes','business_quote_list','business_invoices','business_invoice_list','business_invoice_payments','business_invoice_events','business_customers','business_staff','business_bookings']:
   with self.assertRaises(RuntimeError):self.sql('set role anon;select * from public.'+table)
   self.assertEqual(self.scope(self.ids[1],'select count(*) from public.'+table+' where business_id='+lit(self.bids[0])),'0')
  self.assertEqual(before,self.fingerprint())
 def test_03_http_policy_and_actions(self):
  f=self.fixtures[0]
  for kind in ['quote','invoice']:
   path='/'+kind+'/index.php?token='+f[kind];status,h,html=self.request(path)
   self.assertEqual(status,200);self.assertEqual(h['Referrer-Policy'],'no-referrer');self.assertIn('no-store',h['Cache-Control']);self.assertIn('noindex',h['X-Robots-Tag']);self.assertIn("frame-ancestors 'none'",h['Content-Security-Policy'])
   for hidden in ['HIDDEN-CONTACT','27820001111','PRIVATE-PROFILE','PRIVATE-ADDRESS','Record payment','Payment history']:self.assertNotIn(hidden,html)
   self.assertIn('&lt;script&gt;',html)
   for method in (['PUT','DELETE','PATCH'] if kind=='quote' else ['POST','PUT','DELETE','PATCH']):self.assertEqual(self.request(path,method,b'')[0],405)
  before=self.fingerprint();path='/quote/index.php?token='+f['quote']
  self.assertEqual(self.request(path,'POST',b'response=Accepted&confirm_response=on')[0],503);self.assertEqual(before,self.fingerprint())
  # no-referrer browsers send opaque Origin; only same-origin Fetch Metadata plus session CSRF may pass.
  csrf=re.search('name="csrf" value="([^"]+)"',self.get(path)[1])[1]
  raw=__import__('urllib.parse',fromlist=['urlencode']).urlencode(dict(csrf=csrf,response='Accepted',confirm_response='on')).encode()
  for headers in [{'Origin':'null'},{'Origin':'null','Sec-Fetch-Site':'cross-site'},{'Origin':'null','Sec-Fetch-Site':'same-site'},{'Origin':'https://evil.example','Sec-Fetch-Site':'same-origin'}]:
   self.assertEqual(self.request(path,'POST',raw,headers)[0],503);self.assertEqual(before,self.fingerprint())
  self.assertEqual(self.request(path,'POST',raw.replace(csrf.encode(),b'invalid'),{'Origin':'null','Sec-Fetch-Site':'same-origin'})[0],503);self.assertEqual(before,self.fingerprint())
  html=self.post(path,response='Accepted',confirm_response='on');self.assertIn('has been accepted',html)
  self.assertEqual(self.rpc('quote',f['quote'])['status'],'Accepted');self.assertEqual(self.rpc('quote',f['quote'],response='Accepted')['status'],'Accepted')
  with self.assertRaises(RuntimeError):self.rpc('quote',f['quote'],response='Declined')
  self.assertEqual(self.rpc('quote',self.fixtures[1]['quote'])['status'],'Sent')
  self.assertNotIn('Accept quote',self.get(path)[1])
 def test_05_drafts_expiry_gates_and_scope(self):
  f=self.fixtures[-1];owner=f['owner'];bid=f['bid'];due=self.sql('select current_date+14')
  service=dict(id='1'*32,name='Scoped service',description='',duration=90,mode='fixed',amount=12345,visible=True,archived=False,options=[dict(id='2'*32,name='Bedrooms',kind='bedrooms',minimum=0,maximum=10,included=1,price=0,minutes=0)])
  scope=json.loads(self.sql('select request_private.calculate('+lit(json.dumps(service))+"::jsonb,'ZAR',"+lit(json.dumps([dict(id='2'*32,quantity=2)]))+'::jsonb)'))
  d=f['doc']|dict(scope=scope);qid,iid=str(uuid.uuid4()),str(uuid.uuid4())
  # Operator-seeded disposable frozen scope; no request/publication/intake fixture needed.
  self.sql('insert into public.business_quotes(id,business_id,environment,document,expires_on) values('+','.join([lit(qid),lit(bid),lit('live'),lit(json.dumps(d))+'::jsonb',lit(due)])+');insert into public.business_invoices(id,business_id,environment,document,due_on) values('+','.join([lit(iid),lit(bid),lit('live'),lit(json.dumps(d))+'::jsonb',lit(due)])+')')
  for kind,rid,table in [('quote',qid,'business_quotes'),('invoice',iid,'business_invoices')]:
   self.assertEqual(self.sql('select share_token is null from public.'+table+' where id='+lit(rid)),'t');self.assertEqual(self.rpc(kind,rid),{})
  self.scope(owner,'select public.business_quote_write('+','.join(map(lit,[bid,'live',qid,1,'send']))+',null,'+lit(due)+');select public.business_invoice_write('+','.join(map(lit,[bid,'live',iid,1,'issue']))+')')
  for kind,rid,table in [('quote',qid,'business_quotes'),('invoice',iid,'business_invoices')]:
   token=self.sql('select share_token from public.'+table+' where id='+lit(rid));self.assertEqual(self.rpc(kind,token)['document']['scope'],scope)
   self.assertIn('Bedrooms: 2',self.get('/'+kind+'/index.php?token='+token)[1])
   self.sql('update '+kind+"_private.ingress set enabled=false where environment='live'")
   try:self.assertEqual(self.rpc(kind,token),{})
   finally:self.sql('update '+kind+"_private.ingress set enabled=true where environment='live'")
  token=self.sql('select share_token from public.business_quotes where id='+lit(qid));self.sql('update public.business_quotes set expires_on=current_date-1 where id='+lit(qid));before=self.fingerprint()
  self.assertEqual(self.rpc('quote',token)['status'],'Expired')
  for response in ['Accepted','Declined','Paid']:
   with self.assertRaises(RuntimeError):self.rpc('quote',token,response=response)
  self.assertNotIn('Accept quote',self.get('/quote/index.php?token='+token)[1]);self.assertEqual(before,self.fingerprint())
 def test_04_browser(self):
  if not os.getenv('V1022_BROWSER'):self.skipTest('optional local browser')
  fixtures=[dict(quote=self.url+'/quote/index.php?token='+self.fixtures[1]['quote'],invoice=self.url+'/invoice/index.php?token='+self.fixtures[1]['invoice'])]
  result=subprocess.run(['node',str(ROOT/'tests/document-privacy-browser.cjs')],input=json.dumps(fixtures),text=True,capture_output=True,env=os.environ)
  self.assertEqual(result.returncode,0,result.stdout+result.stderr)
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Privacy(n) for n in ['test_01_projection_and_preservation','test_02_altered_links_and_direct_tables','test_03_http_policy_and_actions','test_04_browser','test_05_drafts_expiry_gates_and_scope']));raise SystemExit(not r.wasSuccessful())
