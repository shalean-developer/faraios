import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepare,sourcePlan} from '../scripts/t19-private-package.mjs';
import {verifyPackage,inventory,safePath,hash} from '../scripts/t19-private-package-verify.mjs';
const temporary=()=>fs.mkdtemp(join(tmpdir(),'t19-inactive-package-test-'));
test('curated source closure and production lock exclude credentials, SQL, dev dependencies and lifecycle scripts',async()=>{
 const p=await sourcePlan(),pkg=JSON.parse(p.payload.get('package.json')),lock=JSON.parse(p.payload.get('package-lock.json'));
 assert.deepEqual(pkg.dependencies,{'@supabase/supabase-js':'2.118.0',pg:'8.23.1'});
 assert.equal(pkg.scripts,undefined);assert.equal(pkg.devDependencies,undefined);
 assert.equal(Object.keys(lock.packages).length,24);assert.ok(Object.values(lock.packages).every(v=>!v.dev&&!v.hasInstallScript));
 assert.ok(![...p.payload.keys()].some(p=>/\.sql$|\.pem$|\.key$|custody\.json$|^test\/|^docs\/|\.env/.test(p)));
 assert.ok(p.payload.has('_custody.cjs'));assert.ok(p.payload.has('config/t19-hosting.json'));
});
test('preparation is exclusive and verifier requires an external digest and exact unchanged content',async()=>{
 const root=await temporary();try{
  const built=await prepare(root);const file=join(root,'custody-package-manifest.json');const original=await fs.readFile(file);
  const verified=await verifyPackage(root,built.manifestSha256,{manifestName:'custody-package-manifest.json'});assert.equal(verified.activationAuthorized,false);
  await assert.rejects(prepare(root),/EMPTY_REAL_OUTPUT_REQUIRED/);
  assert.deepEqual(await fs.readFile(file),original);
  await assert.rejects(verifyPackage(root,'0'.repeat(64),{manifestName:'custody-package-manifest.json'}),/PACKAGE_MANIFEST_MISMATCH/);
  await assert.rejects(verifyPackage(root,''),/EXTERNAL_PACKAGE_DIGEST_REQUIRED/);
  await fs.appendFile(join(root,'src/t19-custody-postgres.js'),'\n// tamper');
  await assert.rejects(verifyPackage(root,built.manifestSha256,{manifestName:'custody-package-manifest.json'}),/PACKAGE_CONTENT_MISMATCH/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('unsafe manifest paths and filesystem symlinks/hardlinks/empty additions are refused',async()=>{
 for(const path of ['../key','/root/key','src/../key','src//a','src/./a','C:\\key'])assert.equal(safePath(path),false);
 const root=await temporary();try{
  const built=await prepare(root);await fs.mkdir(join(root,'unexpected-empty'));
  await assert.rejects(verifyPackage(root,built.manifestSha256,{manifestName:'custody-package-manifest.json'}),/EMPTY_PACKAGE_DIRECTORY/);
  await fs.rmdir(join(root,'unexpected-empty'));await fs.symlink(join(root,'package.json'),join(root,'link'));
  await assert.rejects(inventory(root),/PACKAGE_SYMLINK_REFUSED/);await fs.unlink(join(root,'link'));
  await fs.link(join(root,'package.json'),join(root,'hardlink'));
  await assert.rejects(inventory(root),/PACKAGE_FILE_REFUSED/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('inactive installer rejects foreign identities and locations before host access',async()=>{
 const {installContext,PRIVATE}=await import('../scripts/t19-private-install.mjs');const expected='a'.repeat(64);
 const valid={platform:'linux',uid:10521,version:'v24.22.1',source:PRIVATE+'/package-'+expected,expected};
 installContext(valid);
 for(const patch of [{uid:0},{uid:10463},{platform:'win32'},{version:'v25.9.0'},{source:'/tmp/package'},{expected:'bad'}])assert.throws(()=>installContext({...valid,...patch}));
});
test('exclusive installation copies only verified bytes, refuses existing targets and preserves partial failures',async()=>{
 const {copyExclusive}=await import('../scripts/t19-private-install.mjs');
 const parent=await temporary(),source=join(parent,'source'),target=join(parent,'app');await fs.mkdir(source);
 try{
  const b=await prepare(source),old=JSON.parse(await fs.readFile(join(source,'custody-package-manifest.json')));
  // Synthetic final manifest: file-transfer behavior only, not vendor provenance.
  const files=await inventory(source);const m={...old,phase:'production-dependencies',files};
  const bytes=Buffer.from(JSON.stringify(m)),expected=hash(bytes);await fs.writeFile(join(source,'custody-production-manifest.json'),bytes);
  await copyExclusive(source,target,m);await verifyPackage(target,expected);
  await assert.rejects(copyExclusive(source,target,m),e=>e.code==='EEXIST');
  const partial=join(parent,'partial');await assert.rejects(copyExclusive(source,partial,m,{deadline:0}),/INSTALL_DEADLINE/);
  assert.ok((await fs.stat(partial)).isDirectory());assert.deepEqual(await fs.readdir(partial),[]);
  await assert.rejects(copyExclusive(source,join(parent,'unsafe'),{...m,files:[{path:'../outside'}]}),/INSTALL_PATH_REFUSED/);
  await assert.rejects(fs.stat(join(parent,'outside')),e=>e.code==='ENOENT');
 }finally{await fs.rm(parent,{recursive:true,force:true});}
});

test('production sealing preserves source evidence and rejects extras and repeated seals',async()=>{
 const {seal}=await import('../scripts/t19-private-package.mjs');const root=await temporary();
 try{
  const source=await prepare(root),before=await fs.readFile(join(root,'custody-package-manifest.json'));
  const lock=JSON.parse(await fs.readFile(join(root,'package-lock.json')));
  // Metadata-only vendor substitutes exercise sealing, not dependency provenance.
  for(const [path,pkg] of Object.entries(lock.packages)){if(!path)continue;await fs.mkdir(join(root,path),{recursive:true});await fs.writeFile(join(root,path,'package.json'),JSON.stringify({version:pkg.version}));}
  await fs.mkdir(join(root,'node_modules/extra'));await fs.writeFile(join(root,'node_modules/extra/package.json'),'{}');
  await assert.rejects(seal(root,source.manifestSha256),/INSTALLED_PACKAGE_SET_MISMATCH/);
  await fs.rm(join(root,'node_modules/extra'),{recursive:true});const final=await seal(root,source.manifestSha256);
  assert.equal(final.dependencyCount,23);await verifyPackage(root,final.manifestSha256);assert.deepEqual(await fs.readFile(join(root,'custody-package-manifest.json')),before);
  await assert.rejects(seal(root,source.manifestSha256),/PREPARED_SOURCE_CHANGED/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
