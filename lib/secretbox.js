'use strict';
// Cifrado AES-256-GCM para los secretos del doble factor.
// La clave se toma de APP_SECRET (64 caracteres hex) o se genera en data/secret.key la primera vez.
// IMPORTANTE: si restauras la base de datos en otro servidor, copia también data/secret.key.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let KEY = null;
function init(dataDir) {
  if (process.env.APP_SECRET && /^[0-9a-fA-F]{64}$/.test(process.env.APP_SECRET)) { KEY = Buffer.from(process.env.APP_SECRET, 'hex'); return; }
  const file = path.join(dataDir, 'secret.key');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex') + '\n', { mode: 0o600 });
  KEY = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
  if (KEY.length !== 32) throw new Error('data/secret.key no es válido');
}
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return `v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${ct.toString('base64')}`;
}
function decrypt(box) {
  const [v, iv, tag, ct] = String(box || '').split(':');
  if (v !== 'v1') throw new Error('Formato cifrado desconocido');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}
module.exports = { init, encrypt, decrypt };
