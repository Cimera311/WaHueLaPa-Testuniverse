// Read-only local comparison. No saves/IDs/reports are written or printed.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {advance} from '../src/engine.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const baseline=process.argv[2];
if(!/^[a-f0-9]{40}$/.test(baseline||''))throw Error('Aufruf: node test-only/compare-route-catchup.mjs <40-stelliger Basiscommit>');
let source=execFileSync('git',['show',baseline+':src/engine.js'],{cwd:root,encoding:'utf8',maxBuffer:2*1024*1024});
source=source.replace(/from '(\.\/[^']+)'/g,(_,path)=>"from '"+new URL('../src/'+path.slice(2),import.meta.url).href+"'");
const {advance:before}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const sql="begin isolation level repeatable read; select public.imperium_pvp_snapshot_compact(user_id,null) from public.game_saves order by user_id limit 1; rollback;";
const raw=execFileSync('docker',['exec','-i','supabase_db_WahuelapaTest','psql','-X','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',maxBuffer:16*1024*1024,timeout:30000,windowsHide:true});
const snapshot=JSON.parse(raw.trim()),results=[];
for(const hours of [1,24])for(const [index,row] of snapshot.saves.entries()){
 const a=structuredClone(row.state),b=structuredClone(row.state),now=row.state.time+hours*3600000;
 const run=(fn,state)=>{const t=performance.now();fn(state,now);return Math.round((performance.now()-t)*100)/100;};
 let oldMs,newMs;
 if(index%2){newMs=run(advance,b);oldMs=run(before,a);}else{oldMs=run(before,a);newMs=run(advance,b);}
 try{assert.deepEqual(b,a);}catch{throw Error('Nachhol-Ergebnis weicht ab; private Details unterdrueckt.');}
 results.push({playerIndex:index,hours,activeRoutes:row.state.missions.filter(m=>m.type==='route'&&!m.paused&&!m.awaitingUnload).length,oldMs,newMs,equal:true});
}
console.log(JSON.stringify({kind:'route_catchup_comparison',baseline,capturedAt:new Date().toISOString(),players:snapshot.saves.length,mode:'single paired Node wall-time runs on frozen copies; no commit; not an Edge CPU/capacity benchmark',results},null,2));
