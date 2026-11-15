"""Verify preserved owner RLS with explicit query filters, not header-only claims."""
import json
def verify_owner_scopes(sql):
 from database_recovery import literal,ident
 contexts=json.loads(sql("select coalesce(jsonb_agg(jsonb_build_object('business',b.id,'owner',b.owner_id,'environment',e) order by b.id,e),'[]') from public.businesses b cross join unnest(array['preview','live']) e"))
 for ctx in contexts:
  for outsider in [False,True]:
   owner='ffffffff-ffff-ffff-ffff-ffffffffffff' if outsider else ctx['owner']
   prefix="set role authenticated;set request.jwt.claim.sub="+literal(owner)+";set request.jwt.claims='{\"is_anonymous\":false}';reset request.headers;"
   expected='0' if outsider else '1'
   if sql(prefix+'select count(*) from public.businesses where id='+literal(ctx['business']))!=expected:raise ValueError('Legacy owner visibility failed')
   for table in ['business_quotes','business_bookings','business_invoices','business_invoice_payments','business_enquiries']:
    query='select count(*) from public.'+ident(table)+' where business_id='+literal(ctx['business'])+'::uuid and environment='+literal(ctx['environment'])
    expected='0' if outsider else sql(query)
    if sql(prefix+query)!=expected:raise ValueError('Legacy owner query isolation failed')
 return len(contexts)*2
