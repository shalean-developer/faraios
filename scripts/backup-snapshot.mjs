// T30: PostgreSQL 17 synchronized snapshot for one bounded capture attempt.
// No source data, SQL results, snapshot token or credentials are logged.
// Caller must preserve the existing operator write-freeze and archive safeguards.
export const snapshotIdPattern=/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{8}-[0-9]+$/;

export function validateSnapshotId(id){
 if(typeof id!=='string'||!snapshotIdPattern.test(id)||id.length>96)throw Error('BACKUP_SNAPSHOT_INVALID');
 return id;
}

// The snapshot token is a trusted backend-issued identifier, not arbitrary SQL.
// Metadata must BEGIN before SET TRANSACTION SNAPSHOT, as PostgreSQL requires.
export function bindManifestSnapshot(sql,snapshot){
 const id=validateSnapshotId(snapshot);
 const begin='begin transaction isolation level repeatable read read only;';
 if(typeof sql!=='string'||sql.split(begin).length!==2)throw Error('BACKUP_MANIFEST_SQL_CHANGED');
 return sql.replace(begin,begin+"\nset transaction snapshot '"+id+"';");
}

export function snapshotDumpFlag(snapshot){
 return '--snapshot='+validateSnapshotId(snapshot);
}

export async function openSnapshotKeeper({host,port,user,database,password,ca,clientFactory=null,signal}){
 if(signal?.aborted)throw Error('BACKUP_CANCELLED');
 if(typeof host!=='string'||!host||typeof user!=='string'||!user||
    database!=='postgres'||port!==5432||typeof password!=='string'||!password||
    typeof ca!=='string'||!ca.startsWith('-----BEGIN CERTIFICATE-----'))throw Error('BACKUP_SNAPSHOT_CONFIG_INVALID');
 const factory=clientFactory??((options)=>new ((await import('pg')).default.Client)(options));
 const client=await factory({
  host,port,user,database,password,
  ssl:{ca,rejectUnauthorized:true,servername:host},
  application_name:'faraios-t30-snapshot-keeper',
  connectionTimeoutMillis:15000,query_timeout:600000
 });
 let connected=false,closed=false,broken=false;
 const errorHandler=()=>{broken=true;};
 client.on?.('error',errorHandler);
 client.on?.('end',errorHandler);
 const close=async()=>{
  if(closed)return;closed=true;
  try{if(connected)await client.query('ROLLBACK');}catch{}
  try{await client.end();}catch{}
 };
 try{
  await client.connect();connected=true;
  if(signal?.aborted)throw Error('BACKUP_CANCELLED');
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const result=await client.query('SELECT pg_export_snapshot() AS snapshot, current_setting(\'transaction_read_only\') AS readonly');
  if(result.rows?.length!==1||result.rows[0]?.readonly!=='on')throw Error('BACKUP_SNAPSHOT_READONLY_REQUIRED');
  const id=validateSnapshotId(result.rows[0].snapshot);
  if(broken||signal?.aborted)throw Error('BACKUP_SNAPSHOT_INTERRUPTED');
  return Object.freeze({
   id,
   assertAlive(){if(closed||broken||signal?.aborted)throw Error('BACKUP_SNAPSHOT_INTERRUPTED');},
   close
  });
 }catch(error){await close();throw error;}
}
