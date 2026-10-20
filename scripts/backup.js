'use strict';
/*
 * Copia en caliente de la base de datos (no hace falta parar el servicio).
 *   npm run backup                 -> ./backups/almacen-AAAAMMDD-HHMM.db
 *   npm run backup -- D:\Copias     -> en la carpeta indicada
 * Conserva las últimas BACKUP_KEEP copias (30 por defecto). Prográmalo con cron o el Programador de tareas.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
require('../lib/env')(root);
const { openDb } = require('../lib/db');

const dest = path.resolve(process.argv[2] || process.env.BACKUP_DIR || path.join(root, 'backups'));
const keep = +(process.env.BACKUP_KEEP || 30);
fs.mkdirSync(dest, { recursive: true });
const d = new Date(); const p = n => String(n).padStart(2, '0');
const file = path.join(dest, `almacen-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.db`);
const db = openDb(path.resolve(root, process.env.DATA_DIR || 'data'));
db.backup(file).then(() => {
  db.close();
  console.log('Copia creada: ' + file);
  // La clave que cifra los secretos del doble factor: sin ella, una restauración en otro servidor obligaría a reactivarlo.
  const key = path.join(path.resolve(root, process.env.DATA_DIR || 'data'), 'secret.key');
  if (fs.existsSync(key)) { fs.copyFileSync(key, path.join(dest, 'secret.key')); try { fs.chmodSync(path.join(dest, 'secret.key'), 0o600); } catch {} }
  const old = fs.readdirSync(dest).filter(f => /^almacen-\d{8}-\d{4}\.db$/.test(f)).sort().reverse().slice(keep);
  old.forEach(f => { fs.unlinkSync(path.join(dest, f)); console.log('Eliminada copia antigua: ' + f); });
}).catch(e => { console.error('Error en la copia: ' + e.message); process.exit(1); });
