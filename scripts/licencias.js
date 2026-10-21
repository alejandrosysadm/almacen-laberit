'use strict';
/*
 * Herramienta del proveedor para emitir licencias. NO se incluye en la versión para clientes.
 *
 *   node scripts/licencias.js claves <carpeta-segura>
 *       Crea la pareja de claves (una sola vez). La privada se guarda en <carpeta-segura> y NUNCA debe
 *       subirse al repositorio ni salir de tu equipo. La pública se copia a lib/licencia-publica.pem.
 *
 *   node scripts/licencias.js crear --privada <ruta.pem> --cliente "Empresa SL" [--hasta 2027-12-31]
 *       [--usuarios 10] [--almacenes 2] [--instalacion XXXX-XXXX-XXXX-XXXX] [--notas "..."] [--salida archivo.lic]
 *
 *   node scripts/licencias.js ver <archivo.lic>
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [cmd, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : undefined; };
const die = m => { console.error('Error: ' + m); process.exit(1); };

if (cmd === 'claves') {
  const dir = rest[0]; if (!dir) die('Indica la carpeta segura donde guardar la clave privada.');
  fs.mkdirSync(dir, { recursive: true });
  const priv = path.join(dir, 'licencias-privada.pem');
  if (fs.existsSync(priv)) die(`Ya existe ${priv}. No la sobrescribas: invalidaría todas las licencias emitidas.`);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(priv, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(path.join(__dirname, '..', 'lib', 'licencia-publica.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
  console.log(`Clave privada: ${priv}  (haz una copia en un lugar seguro: si la pierdes, no podrás emitir licencias)`);
  console.log('Clave pública: lib/licencia-publica.pem  (esta sí va en el repositorio)');
} else if (cmd === 'crear') {
  const privPath = opt('privada'); if (!privPath) die('Falta --privada <ruta de la clave privada>.');
  const cliente = opt('cliente'); if (!cliente) die('Falta --cliente "Nombre del cliente".');
  const hasta = opt('hasta') || null; if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) die('--hasta debe tener el formato AAAA-MM-DD.');
  const payload = { id: 'LIC-' + crypto.randomBytes(4).toString('hex').toUpperCase(), cliente, emitida: new Date().toISOString().slice(0, 10), hasta,
    usuarios: Number(opt('usuarios')) || 0, almacenes: Number(opt('almacenes')) || 0, instalacion: opt('instalacion') || undefined, notas: opt('notas') || undefined };
  const a = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.sign(null, Buffer.from(a), crypto.createPrivateKey(fs.readFileSync(privPath))).toString('base64url');
  const text = `${a}.${sig}`;
  const out = opt('salida'); if (out) fs.writeFileSync(out, text + '\n');
  console.log(JSON.stringify(payload, null, 2)); console.log('\nTexto de la licencia (para pegar en Ajustes → Licencia):\n\n' + text + '\n');
  if (out) console.log('Guardada en ' + out);
} else if (cmd === 'ver') {
  const t = fs.readFileSync(rest[0], 'utf8').trim(); console.log(JSON.parse(Buffer.from(t.split('.')[0], 'base64url').toString()));
} else {
  console.log('Uso:\n  node scripts/licencias.js claves <carpeta-segura>\n  node scripts/licencias.js crear --privada <clave.pem> --cliente "Empresa" [--hasta AAAA-MM-DD] [--usuarios N] [--almacenes N] [--instalacion ID] [--salida archivo.lic]\n  node scripts/licencias.js ver <archivo.lic>');
}
