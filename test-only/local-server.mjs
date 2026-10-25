import {createServer} from 'node:http';
import {readFileSync, realpathSync, statSync} from 'node:fs';
import {resolve, relative, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const localUrls = ['http://127.0.0.1:54321', 'http://localhost:54321'];
export function validateConfig(config) {
  if (!localUrls.includes(config.url) || config.commandFunction !== 'swift-handler' ||
      config.redirectUrl !== 'http://localhost:3000/' || config.enabled !== true ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) {
    throw Error('Nur lokale URL, Port 54321 und ein Publishable Key sind erlaubt.');
  }
  return {enabled:true, url:config.url, publishableKey:config.publishableKey,
    redirectUrl:config.redirectUrl, commandFunction:'swift-handler'};
}

// Keep the live game's module intact on disk; adapt only the known URL guard.
// Unknown future guards must be reviewed, rather than silently removed.
export function localCloudModule(source) {
  const guards = [
    String.raw`if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url)||!config.publishableKey)throw Error('Cloud-Konfiguration fehlt oder ist ungültig.');`,
    `if(!['http://127.0.0.1:54321','http://localhost:54321'].includes(config.url)||!config.publishableKey)throw Error('Cloud-Konfiguration fehlt oder ist ungültig.');`,
    String.raw`if(!/^(https:\/\/[a-z0-9-]+\.supabase\.co|http:\/\/(127\.0\.0\.1|localhost):54321)\/?$/i.test(config.url)||!config.publishableKey)throw Error('Cloud-Konfiguration fehlt oder ist ungültig.');`
  ];
  const found = guards.filter(guard => source.includes(guard));
  if (found.length !== 1 || source.split(found[0]).length !== 2) {
    throw Error('cloud.js hat eine unbekannte URL-Pruefung. Lokalen Adapter pruefen.');
  }
  return source.replace(found[0], guards[1]);
}

const mime = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png',
  '.webp':'image/webp', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2'};

export function createLocalServer(root, rawConfig) {
  const config = validateConfig(rawConfig);
  root = realpathSync(root);
  localCloudModule(readFileSync(resolve(root, 'src/cloud.js'), 'utf8')); // fail before listen
  return createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, body, type='text/plain; charset=utf-8') => {
      res.writeHead(status, {'Content-Type':type});
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['GET','HEAD'].includes(req.method)) return reply(405, 'Nur GET/HEAD');
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) return reply(403, 'Lokaler Host erforderlich');
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path === '/src/cloud-config.js') {
        return reply(200, `export const CLOUD_CONFIG=${JSON.stringify(config)};\n`, mime['.js']);
      }
      // No SQL backups, .env, .git, test settings or prebundled START_HERE.html.
      if (path !== '/' && path !== '/index.html' && !/^\/(src|assets)\//.test(path)) return reply(404, 'Nicht gefunden');
      if (path.includes('\\') || path.split('/').some(p => p.startsWith('.'))) return reply(403, 'Nicht erlaubt');
      const file = realpathSync(resolve(root, '.' + (path === '/' ? '/index.html' : path)));
      const rel = relative(root, file);
      if (rel.startsWith('..' + sep) || rel === '..' || !statSync(file).isFile()) return reply(403, 'Nicht erlaubt');
      const type = mime[extname(file)];
      if (!type) return reply(404, 'Nicht gefunden');
      let body = readFileSync(file);
      if (path === '/src/cloud.js') body = localCloudModule(body.toString('utf8'));
      if (path === '/' || path === '/index.html') body = body.toString('utf8').replace('<title>WaHueLaPa Universe</title>', '<title>LOKAL TEST - WaHueLaPa Universe</title>');
      reply(200, body, type);
    } catch (error) {
      reply(error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Nicht gefunden' : 'Lokaler Serverfehler; Terminal pruefen.');
      if (error.code !== 'ENOENT') console.error(error.message);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
    const config = JSON.parse(readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
    const server = createLocalServer(root, config);
    server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port 3000 belegt. Alten Webserver mit Strg+C beenden.' : error.message); process.exitCode=1; });
    server.listen(3000, '127.0.0.1', () => console.log('LOKAL TEST: http://localhost:3000/ - Beenden mit Strg+C'));
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
