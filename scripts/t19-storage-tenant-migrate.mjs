// Executed with node -e inside the bound nonroot Storage migration container.
// It invokes only the vendor tenant migrator, never the API/control-DB server.
export const STORAGE_TENANT_MIGRATE_CODE=`
const fail=()=>{console.error('T19_STORAGE_TENANT_MIGRATIONS_FAILED');process.exit(1);};
(async()=>{
 if(process.env.MULTI_TENANT!=='true'||process.env.DB_INSTALL_ROLES!=='false'||process.env.DB_ALLOW_MIGRATION_REFRESH!=='false'||process.env.VECTOR_STORE_MIGRATIONS_ENABLED!=='false'||process.env.DB_MIGRATIONS_FREEZE_AT!=='revoke-grants-to-unused-operations')throw Error('CONFIG');
 const url=new URL(process.env.DATABASE_URL);
 if(url.protocol!=='postgres:'||url.hostname!==process.env.T19_EXPECTED_DATABASE_HOST||url.port!=='5432'||url.pathname!=='/postgres'||url.username!=='supabase_storage_admin'||url.search)throw Error('TARGET');
 const {runMigrationsOnTenant}=require('./dist/internal/database/migrations/index.js');
 await runMigrationsOnTenant({databaseUrl:process.env.DATABASE_URL,tenantId:'t19-synthetic',waitForLock:true,upToMigration:'revoke-grants-to-unused-operations'});
 process.stdout.write('T19_STORAGE_TENANT_MIGRATIONS_PASS\\n',()=>process.exit(0));
})().catch(fail);
`;
