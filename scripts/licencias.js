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
 *
 *   node scripts/licencias.js listar <carpeta-segura>
 *       Muestra todas las licencias emitidas.
 *
 * Cada licencia emitida se guarda automáticamente junto a la clave privada:
 *   <carpeta-segura>/licencias/<cliente>/<LIC-…>.lic   (el texto, por si hay que reenviarlo)
 *   <carpeta-segura>/registro-licencias.json y .csv     (el registro de todas)
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
  // Registro de licencias emitidas, junto a la clave privada
  const dir = path.dirname(path.resolve(privPath));
  const slug = cliente.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'cliente';
  const licDir = path.join(dir, 'licencias', slug); fs.mkdirSync(licDir, { recursive: true });
  const licPath = path.join(licDir, `${payload.id}.lic`); fs.writeFileSync(licPath, text + '\n');
  const regJson = path.join(dir, 'registro-licencias.json');
  let reg = []; try { reg = JSON.parse(fs.readFileSync(regJson, 'utf8')); } catch {}
  reg.push({ ...payload, archivo: path.relative(dir, licPath) }); fs.writeFileSync(regJson, JSON.stringify(reg, null, 2));
  const regCsv = path.join(dir, 'registro-licencias.csv'), q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  if (!fs.existsSync(regCsv)) fs.writeFileSync(regCsv, '\ufeffID;Cliente;Emitida;Válida hasta;Usuarios;Almacenes;Instalación;Notas;Archivo\n');
  fs.appendFileSync(regCsv, [payload.id, cliente, payload.emitida, hasta || 'Sin caducidad', payload.usuarios || 'Sin límite', payload.almacenes || 'Sin límite', payload.instalacion || '', payload.notas || '', path.relative(dir, licPath)].map(q).join(';') + '\n');
  console.log(JSON.stringify(payload, null, 2)); console.log('\nTexto de la licencia (para pegar en Ajustes → Licencia):\n\n' + text + '\n');
  if (out) console.log('Guardada en ' + out);
  console.log(`Registrada en ${regJson} (y .csv) y guardada en ${licPath}`);
} else if (cmd === 'listar') {
  const dir = rest[0]; if (!dir) die('Indica la carpeta segura (la de la clave privada).');
  let reg = []; try { reg = JSON.parse(fs.readFileSync(path.join(dir, 'registro-licencias.json'), 'utf8')); } catch { die('No hay licencias registradas en esa carpeta.'); }
  const hoy = new Date().toISOString().slice(0, 10), en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  console.log(['ID'.padEnd(13), 'Cliente'.padEnd(28), 'Emitida'.padEnd(11), 'Hasta'.padEnd(12), 'Usu.'.padEnd(5), 'Alm.'.padEnd(5), 'Estado'].join(' '));
  reg.forEach(l => { const st = !l.hasta ? 'sin caducidad' : l.hasta < hoy ? 'CADUCADA' : l.hasta <= en30 ? 'caduca pronto' : 'activa';
    console.log([l.id.padEnd(13), String(l.cliente).slice(0, 28).padEnd(28), l.emitida.padEnd(11), (l.hasta || '—').padEnd(12), String(l.usuarios || '∞').padEnd(5), String(l.almacenes || '∞').padEnd(5), st].join(' ')); });
  console.log(`\n${reg.length} licencias emitidas.`);
} else if (cmd === 'ver') {
  const t = fs.readFileSync(rest[0], 'utf8').trim(); console.log(JSON.parse(Buffer.from(t.split('.')[0], 'base64url').toString()));
} else {
  console.log('Uso:\n  node scripts/licencias.js listar <carpeta-segura>\n  node scripts/licencias.js claves <carpeta-segura>\n  node scripts/licencias.js crear --privada <clave.pem> --cliente "Empresa" [--hasta AAAA-MM-DD] [--usuarios N] [--almacenes N] [--instalacion ID] [--salida archivo.lic]\n  node scripts/licencias.js ver <archivo.lic>');
}
