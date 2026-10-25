// Local read-only comparison: temporary RPC installation is rolled back atomically.
// Never prints IDs, saves, reports or tokens. No command is committed.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {processWorld,projectPvP} from '../src/server-world.js';
const install=readFileSync(new URL('../supabase/pvp-snapshot-compact.sql',import.meta.url),'utf8').replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'');
const scope=process.argv.includes('--all')?'':'limit 1';
const sql=`begin isolation level repeatable read;
set local statement_timeout='20s';
${install}
select jsonb_agg(jsonb_build_object('uid',g.user_id,'legacy',public.imperium_pvp_snapshot(g.user_id,null),'compact',public.imperium_pvp_snapshot_compact(g.user_id,null)))
from (select user_id from public.game_saves order by user_id ${scope}) g;
rollback;`;
const raw=execFileSync('docker',['exec','-i','supabase_db_WahuelapaTest','psql','-X','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',maxBuffer:64*1024*1024,timeout:30000,windowsHide:true});
const pairs=JSON.parse(raw.trim());
const comparisons=pairs.map(pair=>{pair.compact.now=pair.legacy.now;
const old=processWorld(pair.legacy,pair.uid,{type:'sync'}),next=processWorld(pair.compact,pair.uid,{type:'sync'});
try{assert.deepEqual(projectPvP(next,pair.uid),projectPvP(old,pair.uid));}catch{throw Error('O3 browser projections differ; private details suppressed');}
const priorReturned=new Set(pair.legacy.attacks.filter(m=>m.status==='returned').map(m=>m.id));
const normalize=world=>{const {attackReports,snapshotFormat,...w}=world;return {...w,attacks:w.attacks.filter(m=>!priorReturned.has(m.id))};};
try{assert.deepEqual(normalize(next),normalize(old));}catch{throw Error('O3 authoritative world results differ; private details suppressed');}
const bytes=value=>Buffer.byteLength(JSON.stringify(value));
const {attackReports,snapshotFormat,...commit}=next;
const before=bytes(pair.legacy),after=bytes(pair.compact),oldCommit=bytes(old),newCommit=bytes(commit);
return {snapshot:{legacyBytes:before,compactBytes:after,reductionPercent:Math.round((1-after/before)*10000)/100},commit:{legacyWorldBytes:oldCommit,compactWorldBytes:newCommit,reductionPercent:Math.round((1-newCommit/oldCommit)*10000)/100},rows:{legacyAttacks:pair.legacy.attacks.length,compactActiveAttacks:pair.compact.attacks.length,ownHistoricalCards:pair.compact.attackReports.length},sameSimulation:true,sameBrowserProjection:true};});
console.log(JSON.stringify({kind:'o3_snapshot_comparison',capturedAt:new Date().toISOString(),players:comparisons.length,mode:'frozen input per player; temporary SQL and side effects rolled back; no commit',comparisons},null,2));
