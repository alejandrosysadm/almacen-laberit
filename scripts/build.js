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
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist', 'almacen-laberit');
const pkg = require(path.join(root, 'package.json'));
const log = m => console.log('· ' + m);
if (!fs.existsSync(path.join(root, 'lib', 'licencia-publica.pem'))) { console.error('Falta lib/licencia-publica.pem. Crea las claves con: node scripts/licencias.js claves <carpeta-segura>'); process.exit(1); }
const bytenode = require('bytenode'), Obf = require('javascript-obfuscator');

fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
const copy = (rel, filter) => fs.cpSync(path.join(root, rel), path.join(dist, rel), { recursive: true, filter: filter || (() => true) });

// 1) Archivos
['public', 'lib', 'deploy'].forEach(d => copy(d));
['README.md', 'LICENSE', '.env.example'].forEach(f => fs.existsSync(path.join(root, f)) && copy(f));
fs.mkdirSync(path.join(dist, 'scripts'));
['admin.js', 'backup.js'].forEach(f => copy(path.join('scripts', f)));
copy('server.js');
fs.rmSync(path.join(dist, 'lib', 'warranty.js'), { force: true });
fs.writeFileSync(path.join(dist, 'lib', 'build-info.json'), JSON.stringify({ enforce: true, node: process.version, version: pkg.version, fecha: new Date().toISOString().slice(0, 10) }, null, 2));
log('archivos copiados');

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
fs.writeFileSync(path.join(dist, 'server.js'), loader('server.jsc', './'));
fs.writeFileSync(path.join(dist, 'scripts', 'admin.js'), loader('admin.jsc', '../'));
fs.writeFileSync(path.join(dist, 'scripts', 'backup.js'), loader('backup.jsc', '../'));
log('servidor compilado a bytecode (' + process.version + ')');

// 4) package.json para clientes
const dp = { name: pkg.name, version: pkg.version, private: true, description: pkg.description, license: 'SEE LICENSE IN LICENSE', engines: { node: process.version.slice(1) },
  scripts: { start: 'node server.js', admin: 'node scripts/admin.js', backup: 'node scripts/backup.js' }, dependencies: pkg.dependencies };
fs.writeFileSync(path.join(dist, 'package.json'), JSON.stringify(dp, null, 2) + '\n');
if (fs.existsSync(path.join(root, 'package-lock.json'))) copy('package-lock.json');
log('listo: dist/almacen-laberit (instalar con «npm ci --omit=dev»)');
