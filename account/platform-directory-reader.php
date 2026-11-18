<?php
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

// This adapter has no raw-table query or Auth-admin fallback. Only the two reviewed
// private projection views are readable by its dedicated PostgreSQL role.
final class PlatformDirectoryReader {
 public function __construct(private readonly Closure $connect, private readonly array $regions) {}
 public function __invoke(string $resource, array $query): array {
  if (!in_array($resource,['businesses','users'],true)) throw new RuntimeException('Unsupported directory.');
  $checked=PlatformDirectory::query(['page'=>(string)($query['page']??''),'q'=>$query['q']??null]);
  if ($checked!==$query) throw new RuntimeException('Invalid reader scope.');
  $db=($this->connect)();
  if (!$db instanceof PDO || $db->getAttribute(PDO::ATTR_DRIVER_NAME)!=='pgsql' || $db->inTransaction()) throw new RuntimeException('Invalid reader connection.');
  $db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
  $db->setAttribute(PDO::ATTR_EMULATE_PREPARES,false);
  $db->beginTransaction();
  try {
   $db->exec("SET TRANSACTION READ ONLY");
   $db->exec("SET LOCAL statement_timeout='3000ms'");
   $db->exec("SET LOCAL lock_timeout='500ms'");
   $db->exec("SET LOCAL search_path=pg_catalog");
   // Reject accidental use of postgres/service-role or a privileged inherited role.
   $role=$db->query("SELECT current_user AS name, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid) AS member FROM pg_catalog.pg_roles r WHERE rolname=current_user")->fetch(PDO::FETCH_ASSOC);
   if (!$role || $role['name']!=='faraios_owner_reader' || $role['rolsuper'] || $role['rolbypassrls'] || $role['rolcreaterole'] || $role['rolcreatedb'] || $role['member']) throw new RuntimeException('Restricted reader required.');
   $broad=$db->query("SELECT
    EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind IN ('r','v','m','p','f')
      AND (n.nspname<>'faraios_owner_directory' OR c.relname NOT IN ('businesses','users'))
      AND (has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER')))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND p.prosecdef AND has_schema_privilege(current_user,n.oid,'USAGE') AND has_function_privilege(current_user,p.oid,'EXECUTE'))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND has_schema_privilege(current_user,n.oid,'CREATE'))
    OR has_table_privilege(current_user,'faraios_owner_directory.businesses','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
    OR has_table_privilege(current_user,'faraios_owner_directory.users','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') AS broad")->fetchColumn();
   if ($broad) throw new RuntimeException('Reader privileges exceed the contract.');
   $columns=$resource==='businesses'
    ? 'id, registered_at, name, country, time_zone, service_configured, profile_saved, published'
    : 'id, registered_at, email_verified, business_associations';
   $where=$resource==='businesses' ? "(name ILIKE :name_pattern ESCAPE '!' OR id::text ILIKE :id_pattern ESCAPE '!')" : "id::text ILIKE :id_pattern ESCAPE '!'";
   $sql='SELECT '.$columns.' FROM faraios_owner_directory.'.$resource.' WHERE '.$where.' ORDER BY registered_at DESC, id DESC LIMIT 26 OFFSET :row_offset';
   $stmt=$db->prepare($sql);
   $pattern='%'.strtr($query['q'],['!'=>'!!','%'=>'!%','_'=>'!_']).'%';
   $stmt->bindValue(':id_pattern',$pattern,PDO::PARAM_STR);
   if ($resource==='businesses') $stmt->bindValue(':name_pattern',$pattern,PDO::PARAM_STR);
   $stmt->bindValue(':row_offset',$query['offset'],PDO::PARAM_INT);
   $stmt->execute();
   $rows=$stmt->fetchAll(PDO::FETCH_ASSOC);
   $more=count($rows)>25;
   $rows=array_slice($rows,0,25);
   foreach ($rows as &$row) {
    $row['registered_at']=(new DateTimeImmutable($row['registered_at']))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    if ($resource==='businesses') {
     $row['location_configured']=isset($this->regions['countries'][$row['country']??'']) && in_array($row['time_zone'],$this->regions['time_zones'],true);
     unset($row['country'],$row['time_zone']);
    } else {
     $row['business_associations']=json_decode($row['business_associations'],true,128,JSON_THROW_ON_ERROR);
    }
   }
   unset($row);
   $db->commit();
   return ['rows'=>$rows,'has_more'=>$more,'observed_at'=>gmdate('Y-m-d\TH:i:s\Z')];
  } catch (Throwable $e) {
   if ($db->inTransaction()) $db->rollBack();
   throw $e; // PlatformDirectory maps this to a generic503, never the database exception.
  }
 }
}

// Only the reviewed FaraiOS project and session endpoint are accepted. Never take
// connection mode, username or DSN options from an HTTP request.
function platform_directory_connection(array $config, string $private): array {
 $mode=array_key_exists('mode',$config)?$config['mode']:'direct';
 $host=$mode==='direct'?'db.rxelmugnucfajrqmphhe.supabase.co':($mode==='session'?'aws-1-eu-west-1.pooler.supabase.com':null);
 $allowed=['enabled','mode','host','port','database','password'];
 if (array_diff(array_keys($config),$allowed) || ($config['enabled']??false)!==true || $host===null
  || ($config['host']??null)!==$host || ($config['port']??null)!==5432 || ($config['database']??null)!=='postgres'
  || !is_string($config['password']??null) || $config['password']==='' || str_contains($config['password'],"\0")
  || !preg_match('~\A/[a-zA-Z0-9_./-]+\z~D',$private)) throw new RuntimeException('Reader configuration unavailable.');
 return [
  'dsn'=>'pgsql:host='.$host.';port=5432;dbname=postgres;sslmode=verify-full;sslrootcert='.$private.'/platform-directory-root.crt;connect_timeout=5',
  'username'=>'faraios_owner_reader'.($mode==='session'?'.rxelmugnucfajrqmphhe':''),
  'options'=>[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_PERSISTENT=>false]
 ];
}

function platform_directory_reader(): PlatformDirectoryReader {
 // Load only after PlatformDirectory's per-request authorization. No credentials in
 // source, request parameters, webroot, tracker settings or browser responses.
 $private=realpath(getenv('FARAIOS_ACCOUNT_DIR')?:'/var/www/vhosts/shalean.com/private/faraios-account');
 $web=realpath(dirname(__DIR__));
 if (!$private || !$web || $private===$web || str_starts_with($private,$web.'/')) throw new RuntimeException('Reader configuration unavailable.');
 $path=$private.'/platform-directory-db.json';
 if (is_link($path) || !is_file($path) || (fileperms($path)&0077)!==0 || filesize($path)>4096) throw new RuntimeException('Reader configuration unavailable.');
 $config=json_decode(file_get_contents($path),true,16,JSON_THROW_ON_ERROR);
 if (!is_array($config)) throw new RuntimeException('Reader configuration unavailable.');
 $connection=platform_directory_connection($config,$private);
 // Explicit reviewed trust bundle for hosted libpq13; no sslmode=require fallback.
 $ca=$private.'/platform-directory-root.crt';
 if (is_link($ca) || !is_file($ca) || !is_readable($ca) || (fileperms($ca)&0022)!==0) throw new RuntimeException('Reader trust unavailable.');
 $regions=json_decode(file_get_contents(__DIR__.'/regions.json'),true,512,JSON_THROW_ON_ERROR);
 if (!is_array($regions['countries']??null) || !is_array($regions['time_zones']??null)) throw new RuntimeException('Regions unavailable.');
 return new PlatformDirectoryReader(static fn():PDO=>new PDO(
  $connection['dsn'],$connection['username'],$config['password'],$connection['options']
 ),$regions);
}
