// Offline comparison only: never imports a database driver or opens a connection.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export function canonicalStructure(value){
 if(Array.isArray(value))return '['+value.map(canonicalStructure).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalStructure(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function structureHashes(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('CUSTODY_STRUCTURE_MISSING');
 return Object.fromEntries(Object.keys(value).sort().map(k=>[k,createHash('sha256').update(canonicalStructure(value[k])).digest('hex')]));
}
export function compareStructure(actual,expected){
 const hashes=structureHashes(actual);
 const keys=[...new Set([...Object.keys(hashes),...Object.keys(expected)])].sort();
 const differences=keys.filter(k=>hashes[k]!==expected[k]);
 return {status:differences.length?'CUSTODY_STRUCTURE_MISMATCH':'CUSTODY_STRUCTURE_MATCH',componentsCompared:keys.length,differingComponents:differences,roleAndMembershipReadbackRequired:true,restoreAttempted:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==3)throw Error('ONE_PRIVATE_EVIDENCE_FILE_REQUIRED');
  const captured=JSON.parse(await readFile(process.argv[2],'utf8'));
  const expected=JSON.parse(await readFile(new URL('../test-support/t19-custody-recovery-expected.json',import.meta.url),'utf8'));
  const result=compareStructure(captured?.custody?.custodyDefinition,expected);
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='CUSTODY_STRUCTURE_MATCH')process.exitCode=1;
 }catch{console.error('CUSTODY_STRUCTURE_COMPARISON_FAILED');process.exitCode=1;}
}
