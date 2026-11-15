"""Scope-aware native recovery assertions shared by candidate and tests."""
import json

def verify_owner_scopes(sql):
 from database_recovery import literal,ident
 contexts=json.loads(sql("select coalesce(jsonb_agg(jsonb_build_object('business',b.id,'owner',b.owner_id,'environment',e) order by b.id,e),'[]') from public.businesses b cross join unnest(array['preview','live']) e"))
 tables=['business_quotes','business_bookings','business_invoices','business_invoice_payments','business_enquiries']
 for ctx in contexts:
  for outsider in [False,True]:
   owner='ffffffff-ffff-ffff-ffff-ffffffffffff' if outsider else ctx['owner']
   headers={'x-faraios-business':ctx['business'],'x-faraios-environment':ctx['environment']}
   scope="set role authenticated;set request.jwt.claim.sub="+literal(owner)+";set request.jwt.claims="+literal(json.dumps({'is_anonymous':False}))+";set request.headers="+literal(json.dumps(headers))+";"
   for table in tables:
    expected='0' if outsider else sql('select count(*) from public.'+ident(table)+' t where t.business_id='+literal(ctx['business'])+'::uuid and t.environment='+literal(ctx['environment']))
    if sql(scope+'select count(*) from public.'+ident(table))!=expected:raise ValueError('SC04 effective owner isolation mismatch')
 return len(contexts)*2
