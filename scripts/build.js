'use strict';
/*
 * Genera la versión para clientes en dist/almacen-laberit:
 *  - servidor compilado a bytecode de V8 (bytenode): sin los .js originales
 *  - interfaz ofuscada (javascript-obfuscator)
 *  - control de licencias activado
 *  - sin herramientas internas (licencias, pruebas, actualizador desde GitHub)
 * IMPORTANTE: el bytecode solo funciona con la MISMA versión de Node con la que se compila.
 * Compila con la versión de Node que tendrán los servidores de los clientes.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const root = path.join(__dirname, '..'), NAME = 'almacen', dist = path.join(root, 'dist', NAME);
// Versión: «npm run build -- 1.2.0» la fija en package.json antes de compilar.
const args = process.argv.slice(2), arg = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const want = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
// Actualizaciones desde la web: --url <carpeta pública donde se publican las versiones>, --privada <clave> para firmarlas
const UPDATE_URL = arg('url') || process.env.ALMACEN_UPDATE_URL || '', PRIV = arg('privada') || process.env.LICENCIAS_PRIVADA || '', NOTAS = arg('notas') || '';
if (want) {
  if (!/^\d+\.\d+\.\d+$/.test(want)) { console.error('La versión debe tener el formato 1.2.0'); process.exit(1); }
  for (const f of ['package.json', 'package-lock.json']) { const fp = path.join(root, f); if (!fs.existsSync(fp)) continue; const j = JSON.parse(fs.readFileSync(fp, 'utf8')); j.version = want; if (j.packages && j.packages['']) j.packages[''].version = want; fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n'); }
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
// Marca genérica: la versión para clientes no lleva ninguna referencia a Laberit ni a sus clientes.
const BRAND = [[/IVCEvidensia/g, 'Cliente de ejemplo'], [/ivcevidensia\.es/g, 'cliente.com'], [/@ivce\.es/g, '@cliente.com'], [/laberit\.com/g, 'tuempresa.com'], [/laberit\.local/g, 'tuempresa.local'],
  [/almacen-laberit/g, NAME], [/laberit-almacen/g, 'almacen-app'], [/AlmacenLaberit/g, 'Almacen'], [/Laberit/g, 'TuEmpresa'], [/laberit/g, 'empresa']];
const debrand = f => { let t = fs.readFileSync(f, 'utf8'); BRAND.forEach(([a, b]) => { t = t.replace(a, b); }); fs.writeFileSync(f, t); };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'vendor' || e.name === 'fonts' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const log = m => console.log('· ' + m);
if (!fs.existsSync(path.join(root, 'lib', 'licencia-publica.pem'))) { console.error('Falta lib/licencia-publica.pem. Crea las claves con: node scripts/licencias.js claves <carpeta-segura>'); process.exit(1); }
const bytenode = require('bytenode'), Obf = require('javascript-obfuscator');

fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
const copy = (rel, filter) => fs.cpSync(path.join(root, rel), path.join(dist, rel), { recursive: true, filter: filter || (() => true) });

// 1) Archivos (sin la herramienta de garantías ni nada interno)
['public', 'lib', 'deploy'].forEach(d => copy(d));
['LICENSE', '.env.example'].forEach(f => fs.existsSync(path.join(root, f)) && copy(f));
copy('docs/INSTALACION.md'); fs.renameSync(path.join(dist, 'docs', 'INSTALACION.md'), path.join(dist, 'INSTALACION.md')); fs.rmSync(path.join(dist, 'docs'), { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'scripts'));
['admin.js', 'backup.js', 'actualizar-version.sh'].forEach(f => copy(path.join('scripts', f)));
copy('server.js');
fs.rmSync(path.join(dist, 'lib', 'warranty.js'), { force: true });
fs.writeFileSync(path.join(dist, 'lib', 'build-info.json'), JSON.stringify({ enforce: true, node: process.version, version: pkg.version, fecha: new Date().toISOString().slice(0, 10), updateUrl: UPDATE_URL }, null, 2));
if (fs.existsSync(path.join(dist, 'deploy', 'almacen-laberit.service'))) fs.renameSync(path.join(dist, 'deploy', 'almacen-laberit.service'), path.join(dist, 'deploy', NAME + '.service'));
walk(dist).filter(f => /\.(js|html|json|svg|service|conf|ps1|config|md|sh|example)$|LICENSE$/.test(f) && !/i18n[\\/]en\.js$/.test(f)).forEach(debrand);
log('archivos copiados y marca genérica aplicada (TuEmpresa)');

// 2) Interfaz ofuscada
['public/app.js', 'public/boot.js', 'public/splash.js'].forEach(rel => {
  const f = path.join(dist, rel), src = fs.readFileSync(f, 'utf8');
  const out = Obf.obfuscate(src, { compact: true, target: 'browser', stringArray: true, stringArrayThreshold: 0.75, stringArrayEncoding: ['base64'], stringArrayRotate: true, stringArrayShuffle: true,
    renameGlobals: false, identifierNamesGenerator: 'hexadecimal', controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, numbersToExpressions: false, simplify: true, transformObjectKeys: false, unicodeEscapeSequence: false });
  fs.writeFileSync(f, out.getObfuscatedCode());
});
log('interfaz ofuscada');

// 3) Servidor compilado
const jsFiles = ['server.js', 'scripts/admin.js', 'scripts/backup.js', ...fs.readdirSync(path.join(dist, 'lib')).filter(f => f.endsWith('.js')).map(f => 'lib/' + f)];
for (const rel of jsFiles) {
  const f = path.join(dist, rel);
  bytenode.compileFile({ filename: f, output: f.replace(/\.js$/, '.jsc') });
  fs.rmSync(f);
}
// Lanzadores que cargan el bytecode y comprueban la versión de Node
const loader = (target, up) => `'use strict';\nconst need = require('${up}lib/build-info.json').node;\nif (process.version !== need) { console.error('Esta versión necesita Node ' + need + ' (tienes ' + process.version + ').'); process.exit(1); }\nrequire('bytenode');\nrequire('./${target}');\n`;
// Lanzador del servidor: tras una actualización desde la web, si la versión nueva no arranca en 3 intentos, restaura la anterior.
fs.writeFileSync(path.join(dist, 'server.js'), `'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let dataDir = process.env.DATA_DIR;
if (!dataDir) { try { const m = /^\\s*DATA_DIR\\s*=\\s*(.+)$/m.exec(fs.readFileSync(path.join(__dirname, '.env'), 'utf8')); if (m) dataDir = m[1].trim().replace(/^["']|["']$/g, ''); } catch {} }
const flag = path.join(path.resolve(__dirname, dataDir || 'data'), 'actualizacion.json');
try {
  const u = JSON.parse(fs.readFileSync(flag, 'utf8'));
  if (u.pendiente && !u.revertida) {
    u.intentos = (u.intentos || 0) + 1;
    if (u.intentos > 3 && u.programa && fs.existsSync(u.programa)) {
      const keep = new Set(['data', 'backups', 'certs', 'logs', 'node_modules', '.env']);
      for (const e of fs.readdirSync(__dirname)) if (!keep.has(e)) fs.rmSync(path.join(__dirname, e), { recursive: true, force: true });
      execFileSync('tar', ['-xzf', u.programa], { cwd: __dirname });
      u.revertida = true; fs.writeFileSync(flag, JSON.stringify(u, null, 2));
      console.error('La versión ' + u.hacia + ' no arranca: se ha restaurado la ' + u.desde + '.'); process.exit(1);
    }
    fs.writeFileSync(flag, JSON.stringify(u, null, 2));
  }
} catch {}
const need = require('./lib/build-info.json').node;
if (process.version !== need) { console.error('Esta versión necesita Node ' + need + ' (tienes ' + process.version + ').'); process.exit(1); }
require('bytenode');
require('./server.jsc');
`);
fs.writeFileSync(path.join(dist, 'scripts', 'admin.js'), loader('admin.jsc', '../'));
fs.writeFileSync(path.join(dist, 'scripts', 'backup.js'), loader('backup.jsc', '../'));
log('servidor compilado a bytecode (' + process.version + ')');

// 4) package.json para clientes
const dp = { name: NAME, version: pkg.version, private: true, description: 'Control de inventario de almacén: equipos, monitores, soportes, switches y firewalls, con mapa 3D.', license: 'SEE LICENSE IN LICENSE', engines: { node: process.version.slice(1) },
  scripts: { start: 'node server.js', admin: 'node scripts/admin.js', backup: 'node scripts/backup.js' }, dependencies: pkg.dependencies };
fs.writeFileSync(path.join(dist, 'package.json'), JSON.stringify(dp, null, 2) + '\n');
if (fs.existsSync(path.join(root, 'package-lock.json'))) { copy('package-lock.json'); debrand(path.join(dist, 'package-lock.json')); }
// Paquete para entregar al cliente
const pkgFile = `${NAME}-${pkg.version}.tar.gz`;
try { execSync(`tar -czf "${pkgFile}" ${NAME}`, { cwd: path.join(root, 'dist'), stdio: 'ignore' }); log(`paquete para entregar: dist/${pkgFile}`); }
catch { log('no se ha podido crear el .tar.gz (falta «tar»): entrega la carpeta dist/' + NAME + ' comprimida'); }
// Información de la versión, firmada, para las actualizaciones desde la web
if (PRIV && fs.existsSync(path.join(root, 'dist', pkgFile))) {
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dist', pkgFile))).digest('hex');
  const firma = crypto.sign(null, Buffer.from(`${pkgFile}\n${pkg.version}\n${sha256}`), crypto.createPrivateKey(fs.readFileSync(PRIV))).toString('base64url');
  fs.writeFileSync(path.join(root, 'dist', 'latest.json'), JSON.stringify({ version: pkg.version, fecha: new Date().toISOString().slice(0, 10), archivo: pkgFile, sha256, firma, node: process.version, notas: NOTAS }, null, 2));
  log('firmada: dist/latest.json (publícalo junto al paquete' + (UPDATE_URL ? ' en ' + UPDATE_URL : '') + ')');
} else if (UPDATE_URL) log('AVISO: sin --privada no se genera latest.json y las instalaciones no podrán actualizarse desde la web');
log(`listo: versión ${pkg.version}, compilada con Node ${process.version}`);
