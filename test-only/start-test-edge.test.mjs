import test from 'node:test';
import assert from 'node:assert/strict';
import {cpuLimits,patchLimits,assertTarget,container} from './start-test-edge.mjs';
test('bounded seconds interface and defaults',()=>{
 assert.deepEqual(cpuLimits(),{softMs:30000,hardMs:60000});
 assert.deepEqual(cpuLimits('1','2'),{softMs:1000,hardMs:2000});
 for(const a of [[0,60],[30,20],[30,301],[1.5,2],['bad',60]])assert.throws(()=>cpuLimits(...a));
});
test('patch survives minifier names, numeric literals, repeated application and rollback',()=>{
 for(const fields of ['cpuTimeSoftLimitMs:y,cpuTimeHardLimitMs:S','cpuTimeSoftLimitMs:1e3,cpuTimeHardLimitMs:2e3','cpuTimeSoftLimitMs: softBudget, cpuTimeHardLimitMs: hardBudget']){
  const input='EdgeRuntime.userWorkers.create({'+fields+',envVars:privateEnvironment})';
  const out=patchLimits(input,cpuLimits());
  assert.match(out,/cpuTimeSoftLimitMs:30000/);assert.match(out,/cpuTimeHardLimitMs:60000/);
  assert.ok(out.endsWith(',envVars:privateEnvironment})'));
  assert.equal(patchLimits(out,cpuLimits()),out);
  assert.match(patchLimits(out,cpuLimits(1,2)),/cpuTimeHardLimitMs:2000/);
 }
});
test('unknown, missing and ambiguous runtime syntax rejected',()=>{
 for(const s of ['', 'cpuTimeSoftLimitMs:1,cpuTimeHardLimitMs:2','EdgeRuntime.userWorkers.create({cpuTimeSoftLimitMs:1})','EdgeRuntime.userWorkers.create({cpuTimeSoftLimitMs:1,cpuTimeSoftLimitMs:2,cpuTimeHardLimitMs:3})','EdgeRuntime.userWorkers.create({cpuTimeSoftLimitMs:compute(),cpuTimeHardLimitMs:2})'])assert.throws(()=>patchLimits(s,cpuLimits()));
});
test('only named local test container and selected workdir accepted',()=>{
 const dir=process.cwd(),info={Name:'/'+container,Config:{Labels:{'com.supabase.cli.project':'WahuelapaTest','com.supabase.cli.workdir':dir}}};
 assert.doesNotThrow(()=>assertTarget(info,dir));
 assert.throws(()=>assertTarget({...info,Name:'/supabase_db_WahuelapaTest'},dir));
 assert.throws(()=>assertTarget({...info,Config:{Labels:{'com.supabase.cli.project':'live'}}},dir));
 assert.throws(()=>assertTarget(info,dir+'/other'));
 assert.throws(()=>assertTarget(null,dir));
});
