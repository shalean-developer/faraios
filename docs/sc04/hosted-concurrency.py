"""Manual, fenced synthetic hosted SQL lock proof. Never accepts arbitrary targets/users."""
import json,os,select,subprocess,time
from concurrent.futures import ThreadPoolExecutor
A='2f16e658-e031-4c4a-930a-2731ec1d1492';B='4627f805-8243-4890-bf18-a14fdf3fd21b'
OWNER='8a68ef34-a924-4035-be53-6af84b8fe1f9'
USERS={'manager':'75aa0ef2-a949-4b15-b57e-5548021afd0d','receptionist':'af9eb381-74b5-45dc-a87e-167f98d87e91','worker':'d715ad2c-b8e8-4b6e-a1d5-8502fc561b24'}
ENV=dict(os.environ,PGSSLMODE='require',PGCONNECT_TIMEOUT='10')
PSQL=['psql','-XAtq','-v','ON_ERROR_STOP=1']
def sql(q,deny=False):
 r=subprocess.run(PSQL+['-c',q],env=ENV,capture_output=True,text=True,timeout=25)
 if deny:
  if r.returncode==0 or 'Business context denied' not in r.stderr:raise RuntimeError('Expected post-revocation denial missing')
 elif r.returncode:raise RuntimeError('Fenced database operation failed')
 return r.stdout.strip()
def prefix(u):
 return "set local statement_timeout='15s';set local role authenticated;set local request.jwt.claim.sub='"+u+"';set local request.jwt.claims='{\"is_anonymous\":false}';set local request.headers='"+json.dumps({'x-faraios-business':A,'x-faraios-environment':'preview'})+"';"
def close():
 sql("begin;update authorization_private.delegation_gate set enabled=false;update public.business_memberships set active=false where environment='preview' and role<>'owner' and business_id in ('"+A+"','"+B+"');commit;")
def main():
 if os.environ.get('FARAIOS_HOSTED_SC04_CONFIRM')!='rxelmugnucfajrqmphhe:two-registered-preview-businesses':raise RuntimeError('Explicit synthetic execution scope required')
 scope="""do $$begin
 if (select count(*) from authorization_private.preview_businesses)<>2 or exists(select 1 from authorization_private.preview_businesses where business_id not in ('%s','%s')) then raise exception 'Scope drift';end if;
 if (select count(*) from public.business_memberships m join auth.users u on u.id=m.user_id where m.business_id in ('%s','%s') and environment='preview' and m.role<>'owner' and u.email like '%%@example.test')<>4 then raise exception 'Fixture drift';end if;
 if not exists(select 1 from public.businesses where id='%s' and owner_id='%s') then raise exception 'Owner drift';end if;
 if (select count(*) from public.business_memberships where business_id in ('%s','%s') and environment='preview' and role<>'owner')<>4 then raise exception 'Actor count drift';end if;
 if exists(select 1 from public.business_memberships where business_id='%s' and environment='preview' and role<>'owner' and user_id not in ('%s','%s','%s')) then raise exception 'Actor drift';end if;
end$$;"""%(A,B,A,B,A,OWNER,A,B,A,*USERS.values())
 sql(scope)
 report={'scope':'two registered synthetic preview businesses','transport':'direct PostgreSQL role sessions; managed Auth/API/HTTP tested separately','roles':[],'secrets_printed':False}
 try:
  sql("begin;"+scope+"update public.business_memberships set active=true where business_id='"+A+"' and environment='preview' and user_id in ('"+"','".join(USERS.values())+"') and role<>'owner';insert into authorization_private.events(business_id,environment,actor,action,subject) select business_id,environment,null,'acceptance.concurrent_rearmed',user_id from public.business_memberships where business_id='"+A+"' and environment='preview' and role<>'owner';update authorization_private.delegation_gate set enabled=true;commit;")
  for role,u in USERS.items():
   resource='visits' if role=='worker' else 'customers'
   read="select jsonb_array_length(public.business_delegate_read('"+A+"','preview','"+resource+"'))"
   p=subprocess.Popen(PSQL,env=ENV,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
   try:
    p.stdin.write('\\o /dev/null\nbegin;'+prefix(u)+read+';\n\\o\n\\echo LOCKED\n');p.stdin.flush()
    while True:
     if not select.select([p.stdout],[],[],10)[0]:raise RuntimeError('Reader readiness timeout')
     if p.stdout.readline().strip()=='LOCKED':break
     if p.poll() is not None:raise RuntimeError('Reader session ended')
    with ThreadPoolExecutor(max_workers=1) as pool:
     start=time.monotonic();f=pool.submit(sql,"begin;"+prefix(OWNER)+"select public.business_membership_revoke('"+A+"','preview','"+u+"');commit;")
     time.sleep(.35)
     if f.done():raise RuntimeError('Revocation did not wait for reader lock')
     p.stdin.write('commit;\n\\q\n');p.stdin.flush();p.stdin.close();p.wait(timeout=10)
     if p.returncode:raise RuntimeError('Reader commit failed')
     f.result(timeout=15);waited=time.monotonic()-start
    sql('begin;'+prefix(u)+read+';commit;',deny=True)
    report['roles'].append({'role':role,'reader_lock_observed':True,'revocation_waited':True,'seconds':round(waited,3),'subsequent_denied':True})
   finally:
    if p.poll() is None:p.kill();p.wait()
    p.stdout.close();p.stderr.close()
  report['status']='PASS';report['gate_left_for_same_token_checks']=True
 except BaseException:
  close();raise
 print(json.dumps(report))
if __name__=='__main__':main()
