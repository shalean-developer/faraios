"""Real Auth/PostgREST recovery on disposable Docker targets. No hosted connections.
Only aggregate evidence leaves the runner. All HTTP bodies/tokens stay in memory.
"""
import json,os,re,secrets,subprocess,time,uuid,pathlib,base64,hmac,hashlib
AUTH_IMAGE='supabase/gotrue:v2.197.0'
REST_IMAGE='postgrest/postgrest:v14.18'
HTTP_IMAGE='curlimages/curl:8.17.0'
DB_IMAGE='postgres:17.11'
class AuthRecoveryError(Exception):pass

def safe_run(args,env,data=None,timeout=180):
 try:p=subprocess.run(args,env=env,input=data,capture_output=True,timeout=timeout)
 except (OSError,subprocess.TimeoutExpired):raise AuthRecoveryError('Isolated service command unavailable or timed out') from None
 if p.returncode:
  if args[:2]==['docker','build']:
   # Build context contains public source/public key only, before any data mounts.
   print(p.stderr.decode(errors='replace')[-5000:],file=__import__('sys').stderr)
  stage='image download' if args[:2]==['docker','pull'] else ('database query' if 'psql' in args else 'container command')
  detail=p.stderr.decode(errors='replace');reason='private output suppressed'
  for pattern,label in [('manifest unknown','image tag unavailable'),('permission denied','permission denied'),('already exists','object already exists'),('does not exist','required object missing'),('connection refused','connection refused'),('syntax error','SQL syntax error')]:
   if pattern in detail:reason=label;break
  raise AuthRecoveryError('Isolated '+stage+' failed: '+reason)
 return p.stdout

def database_image(env):
 if os.environ.get('RESTORE_PROVIDER_LIBRARIES')!='true':
  safe_run(['docker','pull',DB_IMAGE],env);return DB_IMAGE
 image='faraios/recovery-postgres:17.11-provider-v1';root=pathlib.Path(__file__).resolve().parents[1]
 safe_run(['docker','build','--file',str(root/'config/recovery-postgres.Dockerfile'),'--tag',image,str(root/'config')],env,timeout=600)
 return image

def rehearse(db,env,sql,check_business=False):
 # Fail closed: no arbitrary host/project, no published ports or pre-existing network.
 if not re.fullmatch(r'faraios-(?:restore|auth)-[a-f0-9]{32}',db):raise AuthRecoveryError('Disposable target required')
 info=json.loads(safe_run(['docker','inspect',db],env))[0]
 if info['HostConfig']['NetworkMode']!='none' or info['HostConfig'].get('PortBindings') or set(info.get('NetworkSettings',{}).get('Networks',{}))!={'none'}:raise AuthRecoveryError('Target isolation prerequisite failed')
 network='faraios-auth-'+uuid.uuid4().hex;auth=network+'-auth';rest=network+'-rest'
 dbpass=secrets.token_hex(24);restpass=secrets.token_hex(24);jwt=secrets.token_hex(32);provider=os.environ.get('RESTORE_PROVIDER_LIBRARIES')=='true';api_role='authenticator' if provider else 'faraios_recovery_'+uuid.uuid4().hex[:12]
 users=[{'email':'recovery-'+uuid.uuid4().hex+'@example.invalid','password':secrets.token_urlsafe(32)} for _ in range(2)]
 settings=json.loads((pathlib.Path(__file__).resolve().parents[1]/'config/auth-recovery-settings.json').read_text())
 # Images fetched before the isolated network exists. No credentials/data sent to registry.
 for image in [AUTH_IMAGE,REST_IMAGE,HTTP_IMAGE]:safe_run(['docker','pull',image],env)
 def start_auth(secret):
  values={'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':'9999','API_EXTERNAL_URL':'http://'+auth+':9999',
   'GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':'postgres://supabase_auth_admin:'+dbpass+'@'+db+':5432/postgres?sslmode=disable',
   'GOTRUE_SITE_URL':settings['site_url'],'GOTRUE_URI_ALLOW_LIST':','.join(settings['redirect_urls']),
   'GOTRUE_DISABLE_SIGNUP':'false','GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'false',
   'GOTRUE_MAILER_OTP_EXP':str(settings['otp_expiry']),'GOTRUE_MAILER_OTP_LENGTH':str(settings['otp_length']),'GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED':'true',
   'GOTRUE_EXTERNAL_PHONE_ENABLED':'false','GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED':'false',
   'GOTRUE_JWT_SECRET':secret,'GOTRUE_JWT_AUD':'authenticated','GOTRUE_JWT_ADMIN_ROLES':'service_role',
   'GOTRUE_JWT_DEFAULT_GROUP_NAME':'authenticated','GOTRUE_JWT_EXP':'3600','GOTRUE_SMTP_HOST':'127.0.0.1',
   'GOTRUE_SMTP_PORT':'1','GOTRUE_SMTP_ADMIN_EMAIL':'nobody@example.invalid','GOTRUE_LOG_LEVEL':'error'}
  args=['docker','run','--detach','--name',auth,'--network',network,'--memory=512m','--cpus=1','--cap-drop=ALL','--security-opt=no-new-privileges']
  for k,v in values.items():args+=['--env',k+'='+v]
  safe_run(args+[AUTH_IMAGE],env)
 def http(url,method='GET',payload=None,token=None):
  # Dedicated client avoids depending on utilities inside a service image.
  url=url.replace('http://localhost:9999','http://'+auth+':9999')
  args=['docker','run','--rm','-i','--name',network+'-http','--network',network,'--memory=64m','--cpus=1','--cap-drop=ALL','--security-opt=no-new-privileges',HTTP_IMAGE,'--silent','--show-error','--max-time','3','--write-out','\\n%{http_code}','--header','Content-Type: application/json']
  if token:args+=['--header','Authorization: Bearer '+token]
  if method=='POST':args+=['--request','POST','--data-binary','@-']
  args+=[url]
  try:p=subprocess.run(args,env=env,input=json.dumps(payload or {}).encode() if method=='POST' else None,capture_output=True,timeout=20)
  except (OSError,subprocess.TimeoutExpired):return 0,None
  raw,_,status=p.stdout.rpartition(b'\n');code=int(status) if status.isdigit() else 0
  try:body=json.loads(raw)
  except ValueError:body=None
  return code,body
 def ready(url):
  target=rest if url.startswith('http://'+rest+':') else auth
  last_code=0;last_body=None
  for _ in range(15):
   state=subprocess.run(['docker','inspect','--format','{{.State.Running}}',target],env=env,capture_output=True,timeout=15)
   if state.stdout.strip()!=b'true':break
   last_code,last_body=http(url)
   if last_code==200:return
   time.sleep(1)
  logs=subprocess.run(['docker','logs',target],env=env,capture_output=True,timeout=15)
  if target==rest:
   pglogs=subprocess.run(['docker','logs',db],env=env,capture_output=True,timeout=15)
   for line in (pglogs.stdout+pglogs.stderr).decode(errors='replace').splitlines():
    if 'FATAL:' in line and any(x in line for x in ['could not access file','could not load library','invalid value for parameter','unrecognized configuration parameter']):print(line[-600:],file=__import__('sys').stderr)
  detail=(logs.stdout+logs.stderr).decode(errors='replace');labels=[]
  for pattern,label in [('SSL is not enabled','isolated database does not support TLS'),('uuid_generate_v4','UUID extension dependency'),('permission denied','migration permission'),('does not exist','missing migration dependency'),('failed to parse','configuration parse failure'),('migration','migration failure'),('connection refused','database connection refused')]:
   if pattern in detail:labels.append(label)
  labels+=re.findall(r'SQLSTATE [0-9A-Z]{5}',detail)
  labels+=re.findall(r'PGRST[0-9]{3}',detail)
  labels+=['missing '+x for x in re.findall(r'(?:relation|schema|type|function) "?([a-z_][a-z0-9_.]*)"?(?:\([^)]*\))? does not exist',detail.replace('\\"','"'))]
  provider_code=last_body.get('code') if isinstance(last_body,dict) else None
  if isinstance(provider_code,str) and re.fullmatch('[A-Z0-9]{5,10}',provider_code):labels.append(provider_code)
  raise AuthRecoveryError('Isolated '+('API' if target==rest else 'Auth')+' service did not become ready (HTTP '+str(last_code)+'): '+(', '.join(dict.fromkeys(labels)) or 'private details suppressed'))
 def login(user):
  code,result=http('http://localhost:9999/token?grant_type=password','POST',user)
  if code!=200 or not isinstance(result,dict) or not result.get('access_token') or not result.get('refresh_token'):raise AuthRecoveryError('Restored password sign-in failed')
  return result
 try:
  safe_run(['docker','network','create','--internal',network],env)
  safe_run(['docker','network','disconnect','none',db],env)
  safe_run(['docker','network','connect',network,db],env)
  if not json.loads(safe_run(['docker','network','inspect',network],env))[0]['Internal']:raise AuthRecoveryError('Internal network required')
  # Only isolated role passwords are replaced. No source config/credential is accepted.
  original_api_settings=sql("SELECT coalesce(rolconfig::text,'') FROM pg_roles WHERE rolname='authenticator'")
  sql("ALTER ROLE supabase_auth_admin LOGIN PASSWORD '"+dbpass+"';")
  if provider:sql("ALTER ROLE authenticator LOGIN PASSWORD '"+restpass+"';")
  else:sql("CREATE ROLE "+api_role+" LOGIN NOINHERIT NOBYPASSRLS PASSWORD '"+restpass+"';GRANT anon,authenticated TO "+api_role+";ALTER ROLE "+api_role+" SET default_transaction_read_only=on;")
  print('Auth rehearsal: start service',file=__import__('sys').stderr)
  start_auth(jwt);ready('http://localhost:9999/health')
  code,applied=http('http://localhost:9999/settings')
  if code!=200 or applied.get('mailer_autoconfirm') is not False or applied.get('disable_signup') is not False or applied.get('external',{}).get('email') is not True or applied.get('external',{}).get('anonymous_users') is not False:raise AuthRecoveryError('Recovered Auth settings were not applied')
  env_state=json.loads(safe_run(['docker','inspect',auth],env))[0]['Config']['Env']
  if 'GOTRUE_SITE_URL='+settings['site_url'] not in env_state or 'GOTRUE_URI_ALLOW_LIST='+','.join(settings['redirect_urls']) not in env_state:raise AuthRecoveryError('Recovered callback configuration mismatch')
  def encoded(data):return base64.urlsafe_b64encode(json.dumps(data,separators=(',',':')).encode()).rstrip(b'=')
  signing=encoded({'alg':'HS256','typ':'JWT'})+b'.'+encoded({'aud':'authenticated','role':'service_role','sub':str(uuid.uuid4()),'exp':int(time.time())+3600})
  admin=(signing+b'.'+base64.urlsafe_b64encode(hmac.new(jwt.encode(),signing,hashlib.sha256).digest()).rstrip(b'=')).decode()
  for user in users:
   code,result=http('http://localhost:9999/admin/users','POST',user|{'email_confirm':True},admin)
   if code!=200 or not isinstance(result,dict):raise AuthRecoveryError('Synthetic identity setup failed')
   user['id']=(result.get('user') or result).get('id')
   if not user['id']:raise AuthRecoveryError('Synthetic identity missing')
  unconfirmed={'email':'recovery-'+uuid.uuid4().hex+'@example.invalid','password':secrets.token_urlsafe(32)}
  code,result=http('http://localhost:9999/admin/users','POST',unconfirmed|{'email_confirm':False},admin)
  if code!=200:raise AuthRecoveryError('Unconfirmed synthetic identity setup failed')
  code,result=http('http://localhost:9999/token?grant_type=password','POST',unconfirmed)
  if code not in (400,403) or result.get('error_code')!='email_not_confirmed':raise AuthRecoveryError('Email confirmation policy bypassed')
  print('Auth rehearsal: synthetic identities created',file=__import__('sys').stderr)
  first=login({k:users[0][k] for k in ['email','password']})
  # Fixture has real Auth subjects, an actual owner policy and one row per synthetic user.
  sql("CREATE TABLE public.recovery_scope_probe(owner_id uuid NOT NULL, marker text NOT NULL);ALTER TABLE public.recovery_scope_probe ENABLE ROW LEVEL SECURITY;CREATE POLICY recovery_owner ON public.recovery_scope_probe TO authenticated USING (owner_id=auth.uid());GRANT SELECT ON public.recovery_scope_probe TO authenticated;INSERT INTO public.recovery_scope_probe VALUES ('"+users[0]['id']+"','owner-a'),('"+users[1]['id']+"','owner-b');")
  if provider:sql("GRANT DELETE ON public.recovery_scope_probe TO authenticated;CREATE FUNCTION public.recovery_guard_probe() RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN DELETE FROM public.recovery_scope_probe;RETURN true;END $$;GRANT EXECUTE ON FUNCTION public.recovery_guard_probe() TO authenticated;")
  # Stop service, make a DB archive containing synthetic password/session state, and
  # restore it into a fresh database in this same disposable container.
  safe_run(['docker','rm','--force',auth],env)
  dump=safe_run(['docker','exec',db,'pg_dump','-U','postgres','-d','postgres','-Fc'],env)
  safe_run(['docker','exec','-i',db,'psql','-U','postgres','-d','template1','-Xq','-v','ON_ERROR_STOP=1'],env,b'DROP DATABASE postgres WITH (FORCE);CREATE DATABASE postgres;')
  safe_run(['docker','exec','-i',db,'pg_restore','-U','postgres','-d','postgres','--exit-on-error'],env,dump);del dump
  # Default schema initial privileges are not fully emitted by pg_dump.
  sql('GRANT USAGE ON SCHEMA public TO anon,authenticated;')
  # A new signing secret makes prior access tokens invalid. Password hashes remain usable.
  print('Auth rehearsal: isolated database restored',file=__import__('sys').stderr)
  jwt=secrets.token_hex(32);start_auth(jwt);ready('http://localhost:9999/health')
  code,rejected=http('http://localhost:9999/user',token=first['access_token'])
  if code not in (401,403) or not isinstance(rejected,dict) or rejected.get('error_code')!='bad_jwt':raise AuthRecoveryError('Prior signing-key rejection not verified')
  tokens=[]
  for user in users:
   signed=login({k:user[k] for k in ['email','password']})
   code,identity=http('http://localhost:9999/user',token=signed['access_token'])
   if code!=200 or identity.get('id')!=user['id']:raise AuthRecoveryError('Recovered identity mismatch')
   code,refreshed=http('http://localhost:9999/token?grant_type=refresh_token','POST',{'refresh_token':signed['refresh_token']})
   if code!=200 or not refreshed.get('access_token'):raise AuthRecoveryError('Recovered refresh failed')
   user['refresh_token']=refreshed['refresh_token']
   tokens.append(refreshed['access_token'])
  if http('http://localhost:9999/token?grant_type=password','POST',{'email':users[0]['email'],'password':'incorrect-recovery-password'})[0] not in (400,401):raise AuthRecoveryError('Wrong password accepted')
  args=['docker','run','--detach','--name',rest,'--network',network,'--memory=256m','--cpus=1','--cap-drop=ALL','--security-opt=no-new-privileges']
  values={'PGRST_DB_URI':'postgres://'+api_role+':'+restpass+'@'+db+':5432/postgres?sslmode=disable','PGRST_DB_SCHEMAS':'public','PGRST_DB_ANON_ROLE':'anon','PGRST_JWT_SECRET':jwt,'PGRST_DB_CONFIG':'false','PGRST_DB_EXTRA_SEARCH_PATH':'public','PGRST_DB_POOL':'2','PGRST_DB_TX_END':'rollback'}
  for k,v in values.items():args+=['--env',k+'='+v]
  safe_run(args+[REST_IMAGE],env);ready('http://'+rest+':3000/')
  for n,token in enumerate(tokens):
   code,rows=http('http://'+rest+':3000/recovery_scope_probe?select=marker',token=token)
   if code!=200 or rows!=[{'marker':'owner-'+('a' if n==0 else 'b')}]:raise AuthRecoveryError('Real JWT owner policy failed')
  if provider:
   code,rejected=http('http://'+rest+':3000/rpc/recovery_guard_probe','POST',{},tokens[0])
   if code!=400 or not isinstance(rejected,dict) or rejected.get('code')!='21000':raise AuthRecoveryError('Provider unqualified-delete guard failed')
   code,rows=http('http://'+rest+':3000/recovery_scope_probe?select=marker',token=tokens[0])
   if code!=200 or rows!=[{'marker':'owner-a'}]:raise AuthRecoveryError('Guard test changed scoped records')
  if http('http://'+rest+':3000/recovery_scope_probe?select=marker',token=first['access_token'])[0]!=401:raise AuthRecoveryError('REST accepted prior signing-key token')
  code,rows=http('http://'+rest+':3000/business_invoices?select=id',token=tokens[0])
  if code==200 and rows!=[]:raise AuthRecoveryError('Synthetic outsider saw existing invoices')
  if code!=200 and (check_business or code!=404):raise AuthRecoveryError('Business isolation API check failed')
  code,_=http('http://localhost:9999/logout','POST',{},tokens[0])
  if code not in (200,204):raise AuthRecoveryError('Recovered sign-out failed')
  if http('http://localhost:9999/token?grant_type=refresh_token','POST',{'refresh_token':users[0]['refresh_token']})[0] not in (400,401):raise AuthRecoveryError('Signed-out refresh remained usable')
  if sql("SELECT coalesce(rolconfig::text,'') FROM pg_roles WHERE rolname='authenticator'")!=original_api_settings:raise AuthRecoveryError('Managed API role settings changed')
  return {'status':'auth_service_recovery_verified','auth_image':AUTH_IMAGE,'rest_image':REST_IMAGE,'synthetic_users':3,'auth_configuration_reapplied':True,'email_confirmation_enforced':True,'callbacks_restored':2,'password_sign_in':True,'refresh':True,'sign_out':True,'signed_out_refresh_denied':True,'old_signing_key_rejected':True,'real_jwt_tenant_isolation':True,'existing_invoice_scope_checked':check_business,'api_mode':'restored-authenticator-with-provider-libraries' if provider else 'temporary-read-only-authenticator','provider_delete_guard_checked':provider,'managed_authenticator_settings_preserved':True,'network':'internal-only','published_ports':0,'outbound_email':False,'production_credentials_forwarded':False,'limitations':['Self-hosted Auth/API rehearsal; hosted project configuration and SMTP delivery not restored','Fresh temporary signing keys and role passwords; existing users were not logged in','Provider libraries rebuilt from pinned source; exact managed server build is not claimed' if provider else 'API uses a temporary read-only login; managed supautils/safeupdate behavior not exercised']}
 finally:
  for name in [network+'-http',auth,rest]:subprocess.run(['docker','rm','--force',name],env=env,capture_output=True,timeout=30)
  subprocess.run(['docker','network','disconnect','--force',network,db],env=env,capture_output=True,timeout=30)
  subprocess.run(['docker','network','connect','none',db],env=env,capture_output=True,timeout=30)
  subprocess.run(['docker','network','rm',network],env=env,capture_output=True,timeout=30)

def synthetic():
 env={k:v for k,v in os.environ.items() if k in ['PATH','HOME','LANG','LC_ALL','DOCKER_HOST','XDG_RUNTIME_DIR']}
 db='faraios-auth-'+uuid.uuid4().hex
 image=database_image(env)
 try:
  safe_run(['docker','run','--detach','--rm','--name',db,'--network=none','--memory=1g','--cpus=2','--tmpfs','/var/lib/postgresql/data:rw,size=768m','--env','POSTGRES_HOST_AUTH_METHOD=trust',image],env)
  def sql(q):return safe_run(['docker','exec','-i',db,'psql','-U','postgres','-d','postgres','-XAtq','-v','ON_ERROR_STOP=1'],env,q.encode()).decode().strip()
  for _ in range(60):
   if subprocess.run(['docker','exec',db,'pg_isready','-U','postgres'],env=env,capture_output=True).returncode==0:break
   time.sleep(1)
  else:raise AuthRecoveryError('Disposable database did not become ready')
  sql('CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE;CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE ROLE authenticator LOGIN NOINHERIT;GRANT anon,authenticated,service_role TO authenticator;GRANT ALL ON DATABASE postgres TO supabase_auth_admin;GRANT USAGE ON SCHEMA public TO anon,authenticated;')
  # Auth migrations must own/create uid(); precreating it as postgres prevents
  # the real service role from applying its initial CREATE OR REPLACE migration.
  sql('ALTER ROLE supabase_auth_admin SET search_path=auth;GRANT USAGE ON SCHEMA auth TO anon,authenticated;')
  if os.environ.get('RESTORE_PROVIDER_LIBRARIES')=='true':sql('ALTER ROLE authenticator SET session_preload_libraries TO supautils, safeupdate;')
  result=rehearse(db,env,sql);print(json.dumps(result))
 finally:subprocess.run(['docker','rm','--force',db],env=env,capture_output=True,timeout=30)
if __name__=='__main__':
 try:synthetic()
 except AuthRecoveryError as error:print(str(error),file=__import__('sys').stderr);raise SystemExit(1)
 except Exception:print('Isolated Auth recovery failed; private output suppressed.',file=__import__('sys').stderr);raise SystemExit(1)
