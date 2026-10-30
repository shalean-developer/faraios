// Local/CI package preparation only. No host installation, config or runtime import.
import fs from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {hash,canonical,check,regular,inventory,verifyPackage,safePath} from './t19-private-package-verify.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function sourcePlan(){
 const policyBytes=await regular(join(ROOT,'config/t19-private-package.json'));
 const policy=JSON.parse(policyBytes),pkgBytes=await regular(join(ROOT,'package.json')),lockBytes=await regular(join(ROOT,'package-lock.json'));
 const pkg=JSON.parse(pkgBytes),lock=JSON.parse(lockBytes);
 check(policy.version===1&&policy.activationAuthorized===false&&policy.purpose==='inactive-private-custody-source','SOURCE_POLICY');
 check(canonical(pkg.dependencies)===canonical(policy.dependencies)&&lock.lockfileVersion===3&&canonical(lock.packages[''].dependencies)===canonical(policy.dependencies),'DEPENDENCY_ROOT_MISMATCH');
 const payload=new Map();
 for(const p of policy.sourceFiles){check(safePath(p)&&(p==='_custody.cjs'||p==='config/t19-hosting.json'||p==='deploy/t19/custody-public/index.html'||['scripts/t19-private-package-verify.mjs','scripts/t19-private-install.mjs','scripts/t19-private-upgrade.mjs'].includes(p)||/^src\/[a-z0-9-]+\.(?:js|cjs)$/.test(p)),'SOURCE_PATH_REFUSED');const target=p==='deploy/t19/custody-public/index.html'?'public/index.html':p;check(!payload.has(target),'DUPLICATE_SOURCE');payload.set(target,await regular(join(ROOT,p)));}
 // Literal module graph is checked as a source contract; the installed dependency
 // smoke test additionally performs actual Node resolution without starting services.
 for(const [p,bytes] of payload){if(!/\.(js|cjs|mjs)$/.test(p))continue;
  for(const m of bytes.toString().matchAll(/(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)){
   const name=m[1];if(name.startsWith('.')){const target=resolve(ROOT,dirname(p),name);check(target.startsWith(ROOT+'/')&&payload.has(target.slice(ROOT.length+1)),'SOURCE_IMPORT_NOT_PACKAGED');}
   else check(name.startsWith('node:')||Object.hasOwn(policy.dependencies,name),'UNREVIEWED_EXTERNAL_IMPORT');
  }
 }
 const projection={name:pkg.name,version:pkg.version,private:true,type:'module',engines:pkg.engines,dependencies:policy.dependencies};
 const packages={};
 for(const [p,v] of Object.entries(lock.packages)){
  if(p===''){packages[p]={name:pkg.name,version:pkg.version,dependencies:policy.dependencies,engines:pkg.engines};continue;}
  if(v.dev===true)continue;
  check(/^node_modules\/(?:@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(p)&&!v.link&&!v.hasInstallScript&&/^https:\/\/registry\.npmjs\.org\//.test(v.resolved??'')&&/^sha512-[A-Za-z0-9+/]+=*$/.test(v.integrity??''),'UNREVIEWED_DEPENDENCY');packages[p]=v;
 }
 payload.set('package.json',Buffer.from(JSON.stringify(projection,null,2)+'\n'));
 payload.set('package-lock.json',Buffer.from(JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,requires:true,packages},null,2)+'\n'));
 return {policy,payload,provenance:{policySha256:hash(policyBytes),repositoryPackageSha256:hash(pkgBytes),repositoryLockSha256:hash(lockBytes)}};
}
async function write(root,name,bytes){await fs.mkdir(dirname(join(root,name)),{recursive:true,mode:0o700});const f=await fs.open(join(root,name),'wx',0o600);try{await f.writeFile(bytes);await f.sync();}finally{await f.close();}}
export async function prepare(root){
 root=resolve(root);check(await fs.realpath(root)===root&&(await fs.readdir(root)).length===0,'EMPTY_REAL_OUTPUT_REQUIRED');
 const plan=await sourcePlan();for(const [p,b] of plan.payload)await write(root,p,b);
 const files=await inventory(root);const m={version:1,purpose:plan.policy.purpose,activationAuthorized:false,phase:'source',target:plan.policy.target,provenance:plan.provenance,files};
 const bytes=Buffer.from(canonical(m));await write(root,'custody-package-manifest.json',bytes);return {manifestSha256:hash(bytes),files:files.length};
}
export async function seal(root,sourceDigest){
 root=resolve(root);const oldBytes=await regular(join(root,'custody-package-manifest.json'));check(hash(oldBytes)===sourceDigest,'SOURCE_MANIFEST_MISMATCH');const old=JSON.parse(oldBytes);
 const plan=await sourcePlan();check(old.phase==='source'&&canonical(old.provenance)===canonical(plan.provenance),'SOURCE_PLAN_CHANGED');
 const files=await inventory(root,{ignore:['custody-package-manifest.json']});
 check(canonical(files.filter(f=>!f.path.startsWith('node_modules/')))===canonical(old.files),'PREPARED_SOURCE_CHANGED');
 for(const [p,b] of plan.payload)check(hash(await regular(join(root,p)))===hash(b),'SOURCE_BYTES_CHANGED');
 const lock=JSON.parse(plan.payload.get('package-lock.json'));
 const expected=Object.keys(lock.packages).filter(Boolean).sort(),actual=[];
 for(const entry of await fs.readdir(join(root,'node_modules'))){
  if(entry==='.package-lock.json')continue;
  if(entry.startsWith('@'))for(const name of await fs.readdir(join(root,'node_modules',entry)))actual.push('node_modules/'+entry+'/'+name);
  else actual.push('node_modules/'+entry);
 }
 check(canonical(actual.sort())===canonical(expected),'INSTALLED_PACKAGE_SET_MISMATCH');
 for(const p of expected){const pkg=JSON.parse(await regular(join(root,p,'package.json')));check(pkg.version===lock.packages[p].version&&!pkg.scripts?.preinstall&&!pkg.scripts?.install&&!pkg.scripts?.postinstall,'INSTALLED_DEPENDENCY_MISMATCH');}
 check(files.every(f=>!f.path.startsWith('node_modules/')||!f.path.endsWith('.node')&&(f.path.match(/node_modules\//g)||[]).length===1),'NATIVE_OR_NESTED_DEPENDENCY_REFUSED');
 const m={...old,phase:'production-dependencies',sourceManifestSha256:sourceDigest,dependencyCount:expected.length,files};
 // Keep the original preparation manifest byte-for-byte; the production seal
 // is a new exclusive file, so reruns and existing evidence cannot be replaced.
 m.files.push({path:'custody-package-manifest.json',bytes:oldBytes.length,sha256:hash(oldBytes)});m.files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
 const bytes=Buffer.from(canonical(m));await write(root,'custody-production-manifest.json',bytes);await verifyPackage(root,hash(bytes));return {manifestSha256:hash(bytes),sourceManifestSha256:sourceDigest,files:m.files.length,dependencyCount:expected.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [mode,root,digest,...extra]=process.argv.slice(2);
 try{check(Number(process.versions.node.split('.')[0])===24&&root&&!extra.length&&(['--prepare','--seal'].includes(mode))&&(mode==='--prepare'?!digest:!!digest),'USAGE_PREPARE_OR_SEAL');const result=mode==='--prepare'?await prepare(root):await seal(root,digest);console.log(JSON.stringify({status:mode==='--prepare'?'INACTIVE_SOURCE_PACKAGE_PREPARED':'INACTIVE_PRODUCTION_PACKAGE_SEALED',...result,activationAuthorized:false,hostInstalled:false}));}
 catch(e){console.error('T19_PACKAGE_BUILD_STOP '+e.message);process.exitCode=1;}
}
