<?php
declare(strict_types=1);
// Disposable local PostgreSQL only. Requires an empty database named owner03_fixture.
// Never accept an arbitrary remote DSN or production credentials in this test.
require __DIR__.'/../account/platform-directory.php';
require __DIR__.'/../account/platform-directory-reader.php';
$port=getenv('OWNER03_TEST_PORT')?:'55433';
if (!preg_match('/\A[0-9]{4,5}\z/D',$port)) throw new RuntimeException('Invalid local port.');
$dsn='pgsql:host=127.0.0.1;port='.$port.';dbname=owner03_fixture';
$admin=new PDO($dsn,getenv('USER')?:'agent',null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if ((int)$admin->query("SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")->fetchColumn()!==0) throw new RuntimeException('Use an empty disposable fixture database.');
$admin->exec(<<<'SQL'
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
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
$admin->exec('ALTER ROLE faraios_owner_reader LOGIN'); // Local fixture only; no password, loopback trust auth.
$n=0;
function assert_ok(bool $v,string $label):void{global $n;if(!$v)throw new RuntimeException($label);$n++;}
function fails(callable $f,string $label):void{try{$f();}catch(Throwable $e){assert_ok(true,$label);return;}throw new RuntimeException('Expected failure: '.$label);}
$connect=fn():PDO=>new PDO($dsn,'faraios_owner_reader',null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$reader=new PlatformDirectoryReader($connect,json_decode(file_get_contents(__DIR__.'/../account/regions.json'),true));
$owner=['id'=>'10000000-0000-4000-8000-000000000001','email_confirmed_at'=>'2026-11-18','is_anonymous'=>false];
$settings=['enabled'=>true,'owner_ids'=>[$owner['id']]];
$directory=new PlatformDirectory(fn()=>$owner,fn()=>$settings,Closure::fromCallable($reader));
$one=$directory->read('GET','businesses',[]);$two=$directory->read('GET','businesses',['page'=>'2']);
assert_ok(count($one['rows'])===25&&$one['has_more'],'26-row lookahead');
assert_ok(count($two['rows'])===5&&!$two['has_more'],'last page');
assert_ok(!array_intersect(array_column($one['rows'],'id'),array_column($two['rows'],'id')),'stable tie ordering');
assert_ok($one===$directory->read('GET','businesses',[])||$one['rows']===$directory->read('GET','businesses',[])['rows'],'repeat ordering');
$literal=$directory->read('GET','businesses',['q'=>'%_!']);
assert_ok(count($literal['rows'])===1,'literal wildcard search');
assert_ok($literal['rows'][0]['location_configured']&&$literal['rows'][0]['service_configured']&&$literal['rows'][0]['profile_saved']&&!$literal['rows'][0]['published'],'independent live setup facts');
assert_ok($directory->read('GET','businesses',['q'=>"' OR 1=1 --"])['rows']===[],'SQL injection is data');
assert_ok($directory->read('GET','businesses',['q'=>'000000000002'])['rows'][0]['service_configured']===false,'preview catalogue excluded');
assert_ok($directory->read('GET','businesses',['q'=>'000000000003'])['rows'][0]['service_configured']===null,'malformed catalogue unknown');
$users=$directory->read('GET','users',['page'=>'2']);assert_ok(count($users['rows'])===5,'anonymous users excluded');
$user=$directory->read('GET','users',['q'=>$owner['id']]);
assert_ok($user['rows'][0]['email_verified']===true&&count($user['rows'][0]['business_associations'])===2,'ownership and deduplicated live membership');
assert_ok(!preg_match('/SECRET|private@|encrypted_password|country|time_zone/',json_encode([$one,$two,$user])),'private fields excluded');
$db=$connect();
foreach(['auth.users','public.businesses','public.business_service_catalogues'] as $table) fails(fn()=>$db->query('SELECT * FROM '.$table),'raw table denied');
foreach(['anon','authenticated'] as $role){$admin->exec('SET ROLE '.$role);fails(fn()=>$admin->query('SELECT * FROM faraios_owner_directory.users'),'public roles denied');$admin->exec('RESET ROLE');}
fails(fn()=>$db->exec("UPDATE faraios_owner_directory.businesses SET name='changed'"),'write denied');
$db->exec('SET default_transaction_read_only=off');
fails(fn()=>$db->exec("UPDATE faraios_owner_directory.businesses SET name='changed'"),'ACL denies writes even without read-only default');
$broad=new PlatformDirectoryReader(fn()=>$admin,[]);fails(fn()=>$broad('users',PlatformDirectory::query([])),'privileged account rejected');
$admin->exec('GRANT SELECT ON auth.users TO faraios_owner_reader');
fails(fn()=>$directory->read('GET','users',[]),'new broad grant rejected');
$admin->exec('REVOKE SELECT ON auth.users FROM faraios_owner_reader');
$admin->exec("CREATE FUNCTION public.fixture_leak() RETURNS text LANGUAGE sql SECURITY DEFINER AS 'SELECT ''secret''::text'");
fails(fn()=>$directory->read('GET','users',[]),'inherited PUBLIC security-definer function rejected');
$admin->exec('DROP FUNCTION public.fixture_leak()');
assert_ok(count($directory->read('GET','users',[])['rows'])===25,'recovery after restricted grants restored');
$admin->beginTransaction();
$admin->exec('LOCK TABLE public.businesses IN ACCESS EXCLUSIVE MODE');
$started=microtime(true);
fails(fn()=>$directory->read('GET','businesses',[]),'lock timeout fails closed');
assert_ok(microtime(true)-$started<2,'lock wait bounded');
$admin->rollBack();
assert_ok(count($directory->read('GET','businesses',[])['rows'])===25,'recovery after lock released');
$admin->exec('REVOKE SELECT ON faraios_owner_directory.users FROM faraios_owner_reader');
try{$directory->read('GET','users',[]);throw new RuntimeException('Expected503');}catch(PlatformDirectoryError $e){assert_ok($e->status===503&&!str_contains($e->getMessage(),'permission'),'denied query gives redacted503');}
// Rollback rehearsal: containment commits even if RESTRICT detects unexpected objects.
$db=null;
$before=$admin->query("SELECT md5(string_agg(row_to_json(b)::text,',' ORDER BY id)) FROM public.businesses b")->fetchColumn();
$authBefore=$admin->query("SELECT md5(string_agg(row_to_json(u)::text,',' ORDER BY id)) FROM auth.users u")->fetchColumn();
$admin->exec(file_get_contents(__DIR__.'/../docs/owner-03/disable-reader.sql'));
assert_ok($admin->query("SELECT rolcanlogin FROM pg_roles WHERE rolname='faraios_owner_reader'")->fetchColumn()===false,'containment disables login');
assert_ok($admin->query("SELECT has_table_privilege('faraios_owner_reader','faraios_owner_directory.businesses','SELECT')")->fetchColumn()===false,'containment revokes reads');
fails(fn()=>$connect(),'new login denied after containment');
$admin->exec('CREATE VIEW faraios_owner_directory.unexpected_dependency AS SELECT id FROM faraios_owner_directory.businesses');
fails(fn()=>$admin->exec(file_get_contents(__DIR__.'/../docs/owner-03/uninstall-reader.sql')),'RESTRICT preserves unexpected dependent objects');
$admin->rollBack();
assert_ok($admin->query("SELECT rolcanlogin FROM pg_roles WHERE rolname='faraios_owner_reader'")->fetchColumn()===false,'failed uninstall does not undo containment');
$admin->exec('DROP VIEW faraios_owner_directory.unexpected_dependency');
$admin->exec(file_get_contents(__DIR__.'/../docs/owner-03/uninstall-reader.sql'));
assert_ok($admin->query("SELECT count(*) FROM pg_namespace WHERE nspname='faraios_owner_directory'")->fetchColumn()===0,'directory schema removed');
assert_ok($admin->query("SELECT count(*) FROM pg_roles WHERE rolname='faraios_owner_reader'")->fetchColumn()===0,'reader role removed');
assert_ok($before===$admin->query("SELECT md5(string_agg(row_to_json(b)::text,',' ORDER BY id)) FROM public.businesses b")->fetchColumn(),'business data unchanged after rollback');
assert_ok($authBefore===$admin->query("SELECT md5(string_agg(row_to_json(u)::text,',' ORDER BY id)) FROM auth.users u")->fetchColumn(),'auth data unchanged after rollback');
echo json_encode(['status'=>'PASS','assertions'=>$n,'database'=>'disposable local PostgreSQL','hosted_writes'=>0]).PHP_EOL;
