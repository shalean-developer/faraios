// Read-only diagnostics. No permission changes, connection attempts or credentials.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
exports.parseAccessAcl=function(text){
  const lines=text.split('\n').map(l=>l.trim()).filter(Boolean),entries=new Map();
  const fail=()=>{throw new Error('Unrecognized access ACL');};
  for(const line of lines){
    const match=line.match(/^(user|group|mask|other):([0-9]*):([r-][w-][x-])(?:\s+#effective:([r-][w-][x-]))?$/);
    if(!match)fail();
    const [,kind,id,permissions,effective]=match;
    if(id&&(kind!=='user'&&kind!=='group'||!Number.isSafeInteger(Number(id))||Number(id)>4294967294||String(Number(id))!==id))fail();
    const key=kind+':'+id;if(entries.has(key))fail();
    entries.set(key,{kind,id,permissions,effective});
  }
  for(const key of ['user:','group:','other:'])if(!entries.has(key))fail();
  const mask=entries.get('mask:')?.permissions;
  if([...entries.values()].some(e=>e.id)&&!mask)fail();
  for(const e of entries.values())if(e.effective){
    if(!mask||e.kind==='other'||e.kind==='mask'||e.kind==='user'&&!e.id)fail();
    const expected=[...e.permissions].map((c,i)=>mask[i]!=='-'?c:'-').join('');
    if(e.effective!==expected)fail();
  }
  return lines;
};
exports.inspectSocketAccess=function(socketPath){
  const result={complete:false,applicationUid:process.getuid(),applicationGid:process.getgid(),applicationGroups:process.getgroups(),supervisors:[],chain:[]};
  if(typeof socketPath!=='string'||!path.isAbsolute(socketPath)||/[\0\r\n]/.test(socketPath))return result;
  const deadline=Date.now()+5000;
  let pid=process.ppid;
  for(let depth=0;pid>1&&depth<5&&Date.now()<deadline;depth++){
    try{const status=fs.readFileSync('/proc/'+pid+'/status','utf8'),uid=Number(status.match(/^Uid:\s+\d+\s+(\d+)/m)?.[1]);let rootOwnedLsExecutable=false;
      try{const executable=fs.readlinkSync('/proc/'+pid+'/exe'),st=fs.statSync(executable);rootOwnedLsExecutable=executable.startsWith('/usr/local/lsws/')&&st.uid===0&&(st.mode&0o022)===0;}catch{}
      result.supervisors.push({depth,uid,rootOwnedLsExecutable});pid=Number(status.match(/^PPid:\s+(\d+)/m)?.[1]??0);
    }catch{break;}
  }
  try{
    const executable=fs.statSync('/usr/bin/getfacl');
    if(!executable.isFile()||executable.uid!==0||(executable.mode&0o022)!==0)return result;
    let current=socketPath;
    for(let depth=0;depth<32;depth++){
      if(Date.now()>=deadline)throw new Error('Access metadata deadline');
      const before=fs.lstatSync(current);
      const response=spawnSync('/usr/bin/getfacl',['-acpn','--',current],{encoding:'utf8',timeout:Math.max(1,Math.min(2000,deadline-Date.now())),env:{PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C'},maxBuffer:16384,stdio:['ignore','pipe','ignore']});
      if(response.status!==0)throw new Error('Access ACL unavailable');
      const acl=exports.parseAccessAcl(response.stdout),after=fs.lstatSync(current);
      if(['dev','ino','uid','gid','mode'].some(k=>before[k]!==after[k]))throw new Error('Changing socket metadata');
      result.chain.push({depth,uid:before.uid,gid:before.gid,mode:(before.mode&0o7777).toString(8),socket:before.isSocket(),directory:before.isDirectory(),symlink:before.isSymbolicLink(),acl});
      if(current==='/'){result.complete=true;return result;}
      current=path.dirname(current);
    }
  }catch{}
  return result;
};
