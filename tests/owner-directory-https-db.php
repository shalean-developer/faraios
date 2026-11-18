<?php
declare(strict_types=1);
// Disposable local PostgreSQL only. Requires an empty database named owner03_fixture.
// Never accept an arbitrary remote DSN or production credentials in this test.
require __DIR__.'/../account/platform-directory.php';
require __DIR__.'/../account/platform-directory-https.php';
$port=getenv('OWNER03_TEST_PORT')?:'55433';
if (!preg_match('/\A[0-9]{4,5}\z/D',$port)) throw new RuntimeException('Invalid local port.');
$dsn='pgsql:host=127.0.0.1;port='.$port.';dbname=owner03_fixture';
$admin=new PDO($dsn,getenv('USER')?:'agent',null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if ((int)$admin->query("SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")->fetchColumn()!==0) throw new RuntimeException('Use an empty disposable fixture database.');
$admin->exec(<<<'SQL'
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,created_at timestamptz,email_confirmed_at timestamptz,is_anonymous boolean,email text,encrypted_password text);
CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid,name text,created_at timestamptz,country text,time_zone text);
CREATE TABLE public.business_service_catalogues(business_id uuid,environment text,draft jsonb,PRIMARY KEY(business_id,environment));
CREATE TABLE public.business_profiles(business_id uuid,environment text,PRIMARY KEY(business_id,environment));
CREATE TABLE public.business_public_pages(business_id uuid,environment text,PRIMARY KEY(business_id,environment));
CREATE TABLE public.business_memberships(business_id uuid,environment text,user_id uuid,role text,active boolean);
INSERT INTO auth.users SELECT ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'2026-11-18 08:00:00Z',CASE WHEN i=1 THEN '2026-11-18 08:01:00Z'::timestamptz ELSE NULL END,false,'private@example.invalid','SECRET' FROM generate_series(1,30) i;
INSERT INTO auth.users VALUES('10000000-0000-4000-8000-999999999999',now(),NULL,true,'anonymous@example.invalid','SECRET');
INSERT INTO public.businesses SELECT ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,CASE WHEN i=1 THEN 'A%_! literal' ELSE 'Business '||i END,'2026-11-18 08:00:00Z','ZA','Africa/Johannesburg' FROM generate_series(1,30) i;
INSERT INTO public.business_service_catalogues VALUES('20000000-0000-4000-8000-000000000001','live','{"items":[{"archived":false,"private":"SECRET"}]}'),('20000000-0000-4000-8000-000000000002','preview','{"items":[{"archived":false}]}'),('20000000-0000-4000-8000-000000000003','live','{"items":null}');
INSERT INTO public.business_profiles VALUES('20000000-0000-4000-8000-000000000001','live');
INSERT INTO public.business_public_pages VALUES('20000000-0000-4000-8000-000000000001','preview');
INSERT INTO public.business_memberships VALUES('20000000-0000-4000-8000-000000000002','live','10000000-0000-4000-8000-000000000001','worker',true),('20000000-0000-4000-8000-000000000002','live','10000000-0000-4000-8000-000000000001','worker',false),('20000000-0000-4000-8000-000000000003','preview','10000000-0000-4000-8000-000000000001','manager',true);
SQL);
$admin->exec(file_get_contents(__DIR__.'/../supabase/migrations/20261118092848_owner_directory_restricted_reader.sql'));
$admin->exec(<<<'SQL'
ALTER TABLE auth.users ADD COLUMN deleted_at timestamptz, ADD COLUMN banned_until timestamptz;
CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,not_after timestamptz);
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
SQL);
$admin->exec(file_get_contents(__DIR__.'/../supabase/migrations/20261118101850_owner_directory_https_gateway.sql'));
// Hosted postgres cannot delegate managed auth-schema USAGE to custom roles.
$admin->exec('REVOKE USAGE ON SCHEMA auth FROM faraios_owner_api');
$admin->exec(file_get_contents(__DIR__.'/../supabase/migrations/20261118104000_owner_directory_claims_compatibility.sql'));
$n=0;
function good(bool $v,string $m):void{global $n;if(!$v)throw new RuntimeException($m);$n++;}
function denied(callable $f,string $m):void{try{$f();}catch(PDOException $e){good(in_array($e->getCode(),['42501','22023'],true),$m.' SQLSTATE '.$e->getCode());return;}throw new RuntimeException('Expected denial: '.$m);}
$uid='10000000-0000-4000-8000-000000000001';$other='10000000-0000-4000-8000-000000000002';
$sid='30000000-0000-4000-8000-000000000001';
$claims=['sub'=>$uid,'session_id'=>$sid,'role'=>'authenticated','exp'=>time()+3600];
$call=function(array $jwt,string $resource='businesses',int $page=1,string $search='',string $role='authenticated',bool $helper=false)use($admin):array{
 $admin->exec('SET ROLE '.$role);
 try{
  $s=$admin->prepare("SELECT set_config('request.jwt.claims',:claims,false)");$s->execute(['claims'=>json_encode($jwt)]);
  $f=$helper?'faraios_owner_directory.read_https':'public.platform_owner_directory_read';
  $q=$admin->prepare('SELECT '.$f.'(:r,:p,:s)');$q->execute(['r'=>$resource,'p'=>$page,'s'=>$search]);
  return json_decode($q->fetchColumn(),true,128,JSON_THROW_ON_ERROR);
 }finally{try{$admin->exec('RESET ROLE');}catch(PDOException $e){if($e->getCode()!=='25P02')throw $e;}}
};
denied(fn()=>$call($claims),'empty allowlist');
$admin->exec("INSERT INTO faraios_owner_directory.owner_access VALUES ('$uid',true)");
denied(fn()=>$call($claims),'missing session');
$admin->exec("INSERT INTO auth.sessions VALUES('$sid','$uid',NULL)");
$b=$call($claims);good(count($b['rows'])===26,'bounded lookahead');
good(count($call($claims,'businesses',2)['rows'])===5,'second page');
good(count($call($claims,'businesses',1,'%_!')['rows'])===1,'literal search');
good($call($claims,'businesses',1,"' OR 1=1 --")['rows']===[],'search injection');
$u=$call($claims,'users');good(count($u['rows'])===26,'users lookahead');
good(!preg_match('/SECRET|private@|encrypted_password|refresh_token/',json_encode([$b,$u])),'no sensitive payload');
$region=json_decode(file_get_contents(__DIR__.'/../account/regions.json'),true);
$reader=new PlatformDirectoryHttpsReader(fn($a)=>$call($claims,$a['p_resource'],$a['p_page'],$a['p_search']),$region);
$directory=new PlatformDirectory(fn()=>['id'=>$uid,'email_confirmed_at'=>'2026-11-18'],fn()=>['enabled'=>true,'owner_ids'=>[$uid]],Closure::fromCallable($reader));
$result=$directory->read('GET','businesses',[]);good(count($result['rows'])===25&&$result['has_more'],'end to end projection');
good(!str_contains(json_encode($result),'country'),'internal fields removed');
foreach(['owner','manager','receptionist','worker']as$r){$bad=$claims;$bad['sub']=$other;$bad['user_metadata']=['role'=>$r,'platform_owner'=>true];denied(fn()=>$call($bad),'business-role denial');}
foreach([[],array_replace($claims,['exp'=>time()-1]),array_replace($claims,['role'=>'anon']),array_replace($claims,['session_id'=>'bad']),array_replace($claims,['session_id'=>'30000000-0000-4000-8000-000000000099'])]as$bad)denied(fn()=>$call($bad),'bad claims');
denied(fn()=>$call($claims,'users',1,'','anon'),'anon ACL');
denied(fn()=>$call(array_replace($claims,['sub'=>$other]),'users',1,'','authenticated',true),'helper cannot bypass gate');
foreach([['UPDATE faraios_owner_directory.owner_access SET enabled=false','disabled owner'],["UPDATE auth.users SET email_confirmed_at=NULL WHERE id='$uid'",'unverified'],["UPDATE auth.users SET is_anonymous=true WHERE id='$uid'",'anonymous'],["UPDATE auth.users SET deleted_at=now() WHERE id='$uid'",'deleted'],["UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id='$uid'",'banned'],["UPDATE auth.sessions SET not_after=now()-interval '1 hour'",'session expiry'],["UPDATE auth.sessions SET user_id='$other'",'session ownership'],['DELETE FROM auth.sessions','revoked session']]as[$sql,$label]){
 $admin->beginTransaction();$admin->exec($sql);denied(fn()=>$call($claims),$label);$admin->rollBack();
}
foreach([['businesses',0,''],['businesses',10000,''],['invalid',1,''],['users',1,str_repeat('a',101)],['users',1,"bad\n"]]as$args)denied(fn()=>$call($claims,...$args),'invalid filters');
$admin->exec('SET ROLE authenticated');
foreach(['faraios_owner_directory.owner_access','faraios_owner_directory.session_gate','faraios_owner_directory.businesses','auth.users']as$table)denied(fn()=>$admin->query('SELECT * FROM '.$table),'no raw SELECT');
denied(fn()=>$admin->exec("UPDATE faraios_owner_directory.owner_access SET enabled=true"),'cannot self enroll');$admin->exec('RESET ROLE');
good($admin->query("SELECT rolcanlogin FROM pg_roles WHERE rolname='faraios_owner_api'")->fetchColumn()===false,'executor cannot login');
good($admin->query("SELECT has_table_privilege('faraios_owner_api','auth.users','SELECT')")->fetchColumn()===false,'executor cannot read raw auth');
good($admin->query("SELECT has_table_privilege('faraios_owner_api','public.businesses','UPDATE')")->fetchColumn()===false,'executor cannot mutate businesses');
$before=$admin->query("SELECT md5(string_agg(row_to_json(b)::text,',' ORDER BY id)) FROM public.businesses b")->fetchColumn();
$admin->exec(file_get_contents(__DIR__.'/../docs/owner-03/disable-https.sql'));
denied(fn()=>$call($claims),'disabled API rejects previous owner');
$admin->exec(file_get_contents(__DIR__.'/../docs/owner-03/uninstall-https.sql'));
good($admin->query("SELECT to_regprocedure('public.platform_owner_directory_read(text,integer,text)')")->fetchColumn()===null,'wrapper removed');
good($admin->query("SELECT count(*) FROM pg_roles WHERE rolname='faraios_owner_api'")->fetchColumn()===0,'executor removed');
good($before===$admin->query("SELECT md5(string_agg(row_to_json(b)::text,',' ORDER BY id)) FROM public.businesses b")->fetchColumn(),'business fixtures unchanged');
// Rehearse installation/removal as a managed-style non-superuser CREATEROLE
// installer. Auth schema USAGE cannot be delegated by this installer.
$admin->exec(<<<'SQL'
CREATE ROLE fixture_installer NOLOGIN NOSUPERUSER CREATEROLE;
GRANT USAGE ON SCHEMA auth TO fixture_installer;
GRANT SELECT ON auth.users,auth.sessions TO fixture_installer;
GRANT ALL ON SCHEMA public,faraios_owner_directory TO fixture_installer WITH GRANT OPTION;
GRANT SELECT ON faraios_owner_directory.businesses,faraios_owner_directory.users TO fixture_installer WITH GRANT OPTION;
SET ROLE fixture_installer;
SQL);
$admin->exec(file_get_contents(__DIR__.'/../supabase/migrations/20261118101850_owner_directory_https_gateway.sql'));
$admin->exec(file_get_contents(__DIR__.'/../supabase/migrations/20261118104000_owner_directory_claims_compatibility.sql'));
good($admin->query("SELECT has_schema_privilege('faraios_owner_api','auth','USAGE')")->fetchColumn()===false,'managed Auth schema grant unavailable');
good((int)$admin->query("SELECT count(*) FROM pg_auth_members WHERE roleid=(SELECT oid FROM pg_roles WHERE rolname='faraios_owner_api') AND (inherit_option OR set_option)")->fetchColumn()===0,'temporary execution membership removed');
$admin->exec(file_get_contents(__DIR__.'/../docs/owner-03/disable-https.sql'));
$admin->exec(file_get_contents(__DIR__.'/../docs/owner-03/uninstall-https.sql'));
$admin->exec('RESET ROLE');
good($admin->query("SELECT count(*) FROM pg_roles WHERE rolname='faraios_owner_api'")->fetchColumn()===0,'managed installer can remove executor');
echo json_encode(['status'=>'PASS','assertions'=>$n,'hosted_writes'=>0]).PHP_EOL;
