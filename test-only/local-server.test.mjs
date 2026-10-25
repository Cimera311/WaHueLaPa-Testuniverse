import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {get} from 'node:http';
import {createLocalServer, validateConfig, localCloudModule} from './local-server.mjs';

const config = {enabled:true, url:'http://127.0.0.1:54321', publishableKey:'sb_publishable_test', redirectUrl:'http://localhost:3000/', commandFunction:'swift-handler'};
const cloud = readFileSync(new URL('../src/cloud.js', import.meta.url), 'utf8');
test('local adapter preserves game logic and rejects unknown guards', () => {
  const adapted = localCloudModule(cloud);
  assert.match(adapted, /includes\(config.url\)/);
  assert.equal(localCloudModule(adapted), adapted);
  assert.throws(() => localCloudModule('export function connectCloud(){}'), /unbekannte/);
  assert.throws(() => localCloudModule(cloud + cloud), /unbekannte/);
});
test('reject remote targets, wrong function and secret keys before listening', () => {
  for (const patch of [{url:'https://qavlbxbkhahjbpgcmazd.supabase.co'}, {url:'http://localhost:9999'},
    {publishableKey:'sb_secret_bad'}, {publishableKey:'eyJ_service_role'}, {commandFunction:'other'},
    {redirectUrl:'https://example.com'}, {enabled:false}]) {
    assert.throws(() => validateConfig({...config,...patch}));
  }
  assert.deepEqual(validateConfig({...config, SERVICE_ROLE_KEY:'must never escape'}), config);
});
test('HTTP serves local config with JS MIME and hides backups/settings/bundles', async t => {
  const root = mkdtempSync(join(tmpdir(), 'wahuelapa-local-'));
  t.after(() => rmSync(root, {recursive:true,force:true}));
  mkdirSync(join(root,'src')); mkdirSync(join(root,'assets')); mkdirSync(join(root,'test-only'));
  writeFileSync(join(root,'src/cloud.js'), cloud);
  writeFileSync(join(root,'src/cloud-config.js'), 'LIVE CONFIG MUST NEVER BE SERVED');
  writeFileSync(join(root,'index.html'), '<title>WaHueLaPa Universe</title>');
  writeFileSync(join(root,'START_HERE.html'), 'OLD LIVE BUNDLE');
  writeFileSync(join(root,'test-only/secret.json'), 'SECRET');
  const server = createLocalServer(root, config);
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(url + '/src/cloud-config.js?v=old');
  assert.match(response.headers.get('content-type'), /text\/javascript/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const text = await response.text();
  assert.match(text, /127\.0\.0\.1:54321/); assert.doesNotMatch(text, /LIVE|SECRET/);
  assert.match(await (await fetch(url+'/')).text(), /LOKAL TEST/);
  assert.match(await (await fetch(url+'/src/cloud.js')).text(), /includes\(config.url\)/);
  assert.equal(readFileSync(join(root,'src/cloud.js'),'utf8'), cloud);
  for (const path of ['/START_HERE.html','/test-only/secret.json','/.git/config','/backups/data.sql','/src/../test-only/secret.json','/src/.env']) {
    assert.ok([403,404].includes((await fetch(url+path)).status), path);
  }
  const hostStatus = await new Promise((resolve,reject) => get(url+'/', {headers:{Host:'example.com'}}, res => {res.resume(); resolve(res.statusCode);}).on('error',reject));
  assert.equal(hostStatus,403);
  assert.equal((await fetch(url+'/', {method:'POST'})).status,405);
  assert.equal(await (await fetch(url+'/src/cloud-config.js', {method:'HEAD'})).text(),'');
});
