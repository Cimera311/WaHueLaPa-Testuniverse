// Windows local test bootstrap; never changes game saves or the cloud.
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
export const container='supabase_edge_runtime_WahuelapaTest';
export function cpuLimits(soft=30,hard=60){
 soft=Number(soft);hard=Number(hard);
 if(!Number.isInteger(soft)||!Number.isInteger(hard)||soft<1||hard<soft||hard>300)throw Error('CPU-Limits: ganze Sekunden, 1 <= soft <= hard <= 300.');
 return {softMs:soft*1000,hardMs:hard*1000};
}
export function patchLimits(source,limits){
 if(!source.includes('EdgeRuntime.userWorkers.create('))throw Error('Unbekannter Runtime-Startcode.');
 for(const [key,value] of Object.entries({cpuTimeSoftLimitMs:limits.softMs,cpuTimeHardLimitMs:limits.hardMs})){
  const re=new RegExp('\\b'+key+'\\s*:\\s*(?:[A-Za-z_$][\\w$]*|[0-9]+(?:e[0-9]+)?)(?=\\s*[,}])','g');
  if([...source.matchAll(re)].length!==1)throw Error('CPU-Limit im Runtime-Code nicht eindeutig: '+key);
  source=source.replace(re,key+':'+value);
 }
 return source;
}
export function assertTarget(info,dir){
 if(info?.Name!=='/'+container||info.Config?.Labels?.['com.supabase.cli.project']!=='WahuelapaTest'||resolve(info.Config?.Labels?.['com.supabase.cli.workdir']||'')!==resolve(dir))throw Error('Runtime gehoert nicht zum ausgewaehlten lokalen WahuelapaTest-Projekt.');
}
function docker(args,input){
 const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024,windowsHide:true});
 if(r.error||r.status!==0)throw Error('Docker-Aufruf fehlgeschlagen: '+args[0]);
 return r.stdout;
}
function inspect(){
 const r=spawnSync('docker',['inspect','--type','container',container],{encoding:'utf8',timeout:10000,windowsHide:true});
 return r.status===0?JSON.parse(r.stdout)[0]:null;
}
export async function startTestEdge(dir,envFile,limits){
 if(process.platform!=='win32')throw Error('Dieser Teststarter unterstuetzt Windows.');
 dir=resolve(dir);
 if(!/^project_id\s*=\s*"WahuelapaTest"\s*$/m.test(readFileSync(join(dir,'supabase/config.toml'),'utf8')))throw Error('Falsches Supabase-Projekt.');
 const launcher=join(dir,'node_modules/supabase/dist/supabase.js');
 readFileSync(launcher);readFileSync(envFile);
 const old=inspect();if(old)assertTarget(old,dir);
 // CLI regenerates /root/index.ts. Bootstrap, then force-detach this exact
 // process tree before restarting Docker; CLI cleanup otherwise removes it.
 const cli=spawn(process.execPath,[launcher,'functions','serve','swift-handler','--no-verify-jwt','--env-file',resolve(envFile)],{cwd:dir,windowsHide:true,stdio:['ignore','pipe','pipe']});
 cli.stdout.resume();cli.stderr.resume();
 let spawnError;cli.on('error',e=>{spawnError=e;});let detached=false;
 const detach=()=>{
  if(detached||!cli.pid)return;
  const r=spawnSync('taskkill',['/PID',String(cli.pid),'/T','/F'],{encoding:'utf8',timeout:10000,windowsHide:true});
  if(r.status!==0&&cli.exitCode===null){
   try{process.kill(cli.pid,0);}catch(e){if(e.code==='ESRCH'){detached=true;return;}throw e;}
   throw Error('Test-CLI-Prozessbaum konnte nicht getrennt werden.');
  }
  detached=true;
 };
 try{
  let ready;const deadline=Date.now()+60000;
  while(Date.now()<deadline){
   if(spawnError||cli.exitCode!==null)throw Error('Supabase functions serve konnte nicht gestartet werden.');
   const info=inspect();
   if(info){
    assertTarget(info,dir);
    if(info.State.Running&&(!old||info.Id!==old.Id)){
     const r=spawnSync('docker',['exec',container,'cat','/root/index.ts'],{encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024,windowsHide:true});
     if(r.status===0&&r.stdout.includes('EdgeRuntime.userWorkers.create(')){ready=info;break;}
    }
   }
   await new Promise(r=>setTimeout(r,300));
  }
  if(!ready)throw Error('Neue Test-Edge-Runtime wurde nicht innerhalb von 60 Sekunden bereit.');
  detach();
  const before=docker(['exec',container,'cat','/root/index.ts']),after=patchLimits(before,limits);
  docker(['exec',container,'cp','/root/index.ts','/root/index.cpu-default.ts']);
  docker(['exec','-i',container,'sh','-c','cat > /root/index.ts'],after);
  docker(['restart',container]);
  const current=inspect();assertTarget(current,dir);
  if(current.Id!==ready.Id||!current.State.Running||docker(['exec',container,'cat','/root/index.ts'])!==after)throw Error('CPU-Limits nach Neustart nicht bestaetigt.');
  const started=Date.now();
  while(true){
   try{const r=await fetch('http://127.0.0.1:54321/functions/v1/swift-handler',{signal:AbortSignal.timeout(3000)});if(r.status===405)break;}catch{}
   if(Date.now()-started>20000)throw Error('Test-Edge-Funktion nach Neustart nicht erreichbar.');
   await new Promise(r=>setTimeout(r,300));
  }
  console.log('TEST-Edge bereit. CPU-Limits verifiziert: soft='+limits.softMs/1000+'s, hard='+limits.hardMs/1000+'s.');
 }finally{detach();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const [dir,env,soft,hard]=process.argv.slice(2);await startTestEdge(dir,env,cpuLimits(soft,hard));}
 catch(e){console.error('Test-Edge-Start fehlgeschlagen: '+e.message);process.exitCode=1;}
}
