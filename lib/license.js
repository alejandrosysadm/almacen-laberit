'use strict';
/*
 * Licencia de uso.
 * Solo se exige en la versión compilada para clientes (lib/build-info.json con enforce: true).
 * La licencia es un texto «datos.firma» firmado con Ed25519. La clave pública va en lib/licencia-publica.pem;
 * la privada la guarda solo quien emite las licencias (scripts/licencias.js, que no se distribuye).
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const TRIAL_DAYS = 30, GRACE_DAYS = 15;

module.exports = function setupLicense(dataDir, db) {
  let build = {}; try { build = require('./build-info.json'); } catch {}
  const enforce = !!build.enforce;
  let pub = null; try { pub = crypto.createPublicKey(fs.readFileSync(path.join(__dirname, 'licencia-publica.pem'))); } catch {}
  const licFile = path.join(dataDir, 'licencia.lic'), idFile = path.join(dataDir, 'instalacion.json');

  // Identificador de esta instalación (se crea la primera vez): sirve para emitir licencias ligadas a ella.
  // Se guarda en un archivo y también en la base de datos; se usa la fecha más antigua de las dos,
  // para que borrar el archivo no reinicie el periodo de prueba.
  let fileInst = null, dbInst = null;
  try { fileInst = JSON.parse(fs.readFileSync(idFile, 'utf8')); } catch {}
  try { const r = db && db.prepare("SELECT v FROM settings WHERE k = 'instalacion'").get(); if (r) dbInst = JSON.parse(r.v); } catch {}
  let inst = dbInst || fileInst;
  if (!inst || !inst.id) inst = { id: crypto.randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g).join('-'), creada: new Date().toISOString() };
  const dates = [dbInst, fileInst].filter(x => x && x.creada).map(x => x.creada).sort();
  if (dates.length) inst.creada = dates[0];
  try { fs.writeFileSync(idFile, JSON.stringify(inst, null, 2)); } catch {}
  try { if (db) db.prepare("INSERT INTO settings (k, v) VALUES ('instalacion', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(JSON.stringify(inst)); } catch {}

  function parse(text) {
    const t = String(text || '').trim().replace(/\s+/g, '');
    const [a, b] = t.split('.'); if (!a || !b) throw new Error('El texto no es una licencia.');
    if (!pub) throw new Error('Esta instalación no tiene clave para verificar licencias.');
    const ok = crypto.verify(null, Buffer.from(a), pub, Buffer.from(b, 'base64url'));
    if (!ok) throw new Error('La firma de la licencia no es válida.');
    const p = JSON.parse(Buffer.from(a, 'base64url').toString('utf8'));
    if (p.instalacion && p.instalacion !== inst.id) throw new Error(`Esta licencia es para otra instalación (${p.instalacion}).`);
    return p;
  }
  const dayMs = 86400000, today = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  function status() {
    if (!enforce) return { mode: 'libre', enforce: false, instalacion: inst.id };
    let lic = null, error = '';
    try { if (fs.existsSync(licFile)) lic = parse(fs.readFileSync(licFile, 'utf8')); } catch (e) { error = e.message; }
    const base = { enforce: true, instalacion: inst.id, build: { version: build.version || '', fecha: build.fecha || '' } };
    if (!lic) {
      const end = new Date(new Date(inst.creada).getTime() + TRIAL_DAYS * dayMs), left = Math.ceil((end - Date.now()) / dayMs);
      return { ...base, mode: left > 0 ? 'prueba' : 'caducada', prueba: true, dias: Math.max(0, left), hasta: end.toISOString().slice(0, 10), error, escritura: left > 0 };
    }
    const out = { ...base, cliente: lic.cliente || '', id: lic.id || '', emitida: lic.emitida || '', hasta: lic.hasta || '', usuarios: lic.usuarios || 0, almacenes: lic.almacenes || 0, notas: lic.notas || '' };
    if (!lic.hasta) return { ...out, mode: 'activa', escritura: true };
    const left = Math.round((new Date(lic.hasta + 'T00:00:00Z') - today()) / dayMs);
    if (left >= 0) return { ...out, mode: 'activa', dias: left, escritura: true };
    if (left >= -GRACE_DAYS) return { ...out, mode: 'gracia', dias: GRACE_DAYS + left, escritura: true };
    return { ...out, mode: 'caducada', dias: 0, escritura: false };
  }
  function install(text) { const p = parse(text); fs.writeFileSync(licFile, String(text).trim() + '\n'); return p; }
  return { status, install, enforce, inst };
};
