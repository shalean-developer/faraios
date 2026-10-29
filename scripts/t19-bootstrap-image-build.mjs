// Copy-only owner-host image build. No container start, SQL, restore or pull.
import {spawnSync} from 'node:child_process';
import {readFile,mkdtemp,mkdir,writeFile,readdir} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {canonical,digest,requireTrue} from './t19-bootstrap-engine.mjs';
import {protectedPath,snapshot} from './t19-bootstrap-host.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PLAN='config/t19-bootstrap-image-build.json';
export async function recipeInputs(){
 const plan=JSON.parse(await readFile(join(ROOT,PLAN),'utf8'));
 requireTrue(plan.version===1&&plan.runtimeActivationAllowed===false&&plan.recipes.length===2,'BUILD_PLAN');
 const recipes=[];
 for(const r of plan.recipes){
  requireTrue(['postgres','storage'].includes(r.component)&&/^test-support\/t19-[a-z-]+$/.test(r.context)&&/^sha256:[a-f0-9]{64}$/.test(r.baseId),'RECIPE_SHAPE');
  const files=[];
  for(const [name,hash] of Object.entries(r.files)){
   requireTrue(/^[a-zA-Z0-9.-]+$/.test(name),'BUILD_FILE_NAME');
   const bytes=await readFile(join(ROOT,r.context,name));
   requireTrue(digest(bytes)===hash,'BUILD_FILE_CHANGED');files.push({name,bytes});
  }
  recipes.push({...r,files});
 }
 return recipes;
}
export async function buildBundleDigest(){
 const recipes=await recipeInputs();
 const paths=[PLAN,'scripts/t19-bootstrap-image-build.mjs','scripts/t19-bootstrap-host.mjs','scripts/t19-bootstrap-engine.mjs','scripts/t19-bootstrap-env.mjs','scripts/t19-storage-tenant-migrate.mjs','scripts/t19-custody-recovery-compare.mjs',...recipes.flatMap(r=>r.files.map(f=>r.context+'/'+f.name))];
 return digest(await Promise.all(paths.map(async p=>[p,digest(await readFile(join(ROOT,p)))])));
}
export function verifyDerivedImage(base,image,recipe){
 requireTrue(image?.Os==='linux'&&image.Architecture==='amd64'&&/^sha256:[a-f0-9]{64}$/.test(image.Id)&&image.Id!==base.Id,'BUILT_IMAGE_IDENTITY');
 requireTrue(canonical(image.Config)===canonical(base.Config),'BUILT_CONFIG_CHANGED');
 requireTrue(base.RootFS?.Layers?.length===recipe.baseLayers&&image.RootFS?.Layers?.length===recipe.baseLayers+recipe.addedLayers&&canonical(image.RootFS.Layers.slice(0,recipe.baseLayers))===canonical(base.RootFS.Layers),'BUILT_LAYERS_CHANGED');
}
async function main(){
 requireTrue(process.argv.length===3&&process.argv[2]==='--build','USAGE_BUILD');
 requireTrue(process.platform==='linux'&&process.getuid()===0&&process.version==='v24.22.1'&&digest(await readFile(process.execPath))==='e32e2d16081cf644f88392934288086e7662529d0d43277c34f7aad2207cfafb','WRONG_RUNTIME');
 await protectedPath(ROOT,true);await protectedPath('/etc/faraios/t19-gate2-trust.json');
 const trust=JSON.parse(await readFile('/etc/faraios/t19-gate2-trust.json','utf8'));
 await protectedPath(trust.dockerBinary);
 requireTrue(trust.context==='default'&&digest(await readFile(trust.dockerBinary))==='cb92457611ccecae73e395a97673de28e397eaf020f807d91153960bbfe41b01','DOCKER_TRUST');
 const run=async args=>{
  const r=spawnSync(trust.dockerBinary,['--context','default',...args],{encoding:null,timeout:120000,maxBuffer:16777216,env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C'},stdio:['ignore','pipe','pipe']});
  requireTrue(!r.error&&r.signal===null&&Number.isInteger(r.status),'BUILD_COMMAND_OUTCOME_UNKNOWN');
  return {code:r.status,stdout:r.stdout,stderr:r.stderr};
 };
 const must=async args=>{const r=await run(args);requireTrue(r.code===0,'BUILD_DOCKER_COMMAND_FAILED');return r.stdout;};
 const inspect=async ref=>JSON.parse((await must(['image','inspect',ref])).toString())[0];
 const recipes=await recipeInputs(),bundleBefore=await buildBundleDigest();
 for(const r of recipes)for(const f of r.files)await protectedPath(join(ROOT,r.context,f.name));
 const context=JSON.parse((await must(['context','inspect','default'])).toString());
 requireTrue(context.length===1&&context[0].Endpoints?.docker?.Host==='unix:///var/run/docker.sock','WRONG_CONTEXT');
 const before=await snapshot(run);
 requireTrue(before.containers.length===13&&before.containers.every(c=>c.State==='exited')&&!before.containers.some(c=>c.Names.startsWith('t19-bootstrap-'))&&!before.networks.some(n=>n.Name.startsWith('t19-bootstrap-')),'BUILD_BASELINE_REFUSED');
 for(const r of recipes){
  r.base=await inspect(r.baseId);
  requireTrue(r.base.Id===r.baseId&&r.base.Os==='linux'&&r.base.Architecture==='amd64'&&r.base.RootFS?.Layers?.length===r.baseLayers,'BASE_IMAGE_CHANGED');
  const output=await run(['image','inspect',r.outputTag]);
  requireTrue(output.code===1&&/No such image/i.test(output.stderr.toString()),'OUTPUT_TAG_EXISTS_OR_UNKNOWN');
  const alias=await run(['image','inspect',r.baseTag]);
  if(alias.code===0)requireTrue(JSON.parse(alias.stdout)[0].Id===r.baseId,'BASE_TAG_CONFLICT');
  else requireTrue(alias.code===1&&/No such image/i.test(alias.stderr.toString()),'BASE_TAG_LOOKUP_UNKNOWN');
  r.aliasPresent=alias.code===0;
 }
 const dir=await mkdtemp('/root/t19-bootstrap-image-build-');
 const results=[];
 for(const r of recipes){
  const ctx=join(dir,r.component);await mkdir(ctx,{mode:0o700});
  for(const f of r.files)await writeFile(join(ctx,f.name),f.bytes,{flag:'wx',mode:0o600});
  requireTrue((await readdir(ctx)).length===r.files.length,'BUILD_CONTEXT_CHANGED');
  if(!r.aliasPresent)await must(['image','tag',r.baseId,r.baseTag]);
  await must(['build','--pull=false','--network=none','--provenance=false','--tag',r.outputTag,ctx]);
  const image=await inspect(r.outputTag);verifyDerivedImage(r.base,image,r);
  results.push({component:r.component,imageId:image.Id,baseImageId:r.baseId,inheritedConfigurationUnchanged:true,addedLayers:r.addedLayers});
 }
 const after=await snapshot(run);requireTrue(canonical(after)===canonical(before),'BUILD_BASELINE_CHANGED');
 requireTrue(await buildBundleDigest()===bundleBefore,'BUILD_SOURCE_CHANGED');
 const result={status:'BOOTSTRAP_DERIVATIVES_BUILT_NOT_ACTIVATED',buildBundleSha256:bundleBefore,images:results,originalContainerCount:after.containers.length,originalBaselineUnchanged:true,checkpointUsed:false,restoreAttempted:false,runtimeCompatibilityVerified:false};
 await writeFile(join(dir,'result.json'),canonical(result),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({...result,evidenceDirectory:dir},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error('T19_IMAGE_BUILD_STOP '+(/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNCLASSIFIED_FAILURE'));process.exitCode=1;});
