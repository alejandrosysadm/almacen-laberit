'use strict';
// Comprobación rápida antes de dar una versión por buena:
// 1) todo el código JavaScript es válido; 2) el servidor arranca con una base de datos vacía y responde.
const { execFileSync, spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const root = path.join(__dirname, '..');
let fallos = 0;
const ok = m => console.log('  ✓ ' + m), ko = m => { console.log('  ✗ ' + m); fallos++; };

console.log('Sintaxis del código');
const files = ['server.js', ...['lib', 'scripts'].flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.js')).map(f => path.join(d, f))), 'public/app.js'];
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); ok(f); }
  catch (e) { ko(`${f}: ${String(e.stderr || e.message).split('\n').slice(0, 4).join(' ')}`); }
}

console.log('Arranque del servidor');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-test-'));
const port = 18000 + Math.floor(Math.random() * 2000);
const env = { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: tmp, TLS_PFX: '', TLS_CERT: '', TLS_KEY: '', COOKIE_SECURE: '0', SMTP_HOST: '', NODE_ENV: 'test' };
const srv = spawn(process.execPath, [path.join(root, 'server.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
const fin = () => { srv.kill(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(fallos ? `\n${fallos} comprobaciones fallidas.` : '\nTodo correcto.'); process.exit(fallos ? 1 : 0); };
(async () => {
  for (let i = 0; i < 40; i++) { try { await get('/api/bootstrap'); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  try {
    const b = await get('/api/bootstrap'); b.status === 200 && JSON.parse(b.body) ? ok('responde /api/bootstrap') : ko('bootstrap: ' + b.status);
    const h = await get('/'); h.status === 200 && h.body.includes('<html') ? ok('sirve la página principal') : ko('página principal: ' + h.status);
    const a = await get('/app.js'); a.status === 200 && a.body.length > 10000 ? ok('sirve la aplicación') : ko('app.js: ' + a.status);
    const p = await get('/api/items'); p.status === 401 ? ok('protege los datos sin sesión') : ko('/api/items sin sesión devolvió ' + p.status);
  } catch (e) { ko('el servidor no responde: ' + e.message + '\n' + log.slice(-800)); }
  fin();
})();
setTimeout(() => { ko('tiempo de espera agotado\n' + log.slice(-800)); fin(); }, 25000);
