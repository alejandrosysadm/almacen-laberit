'use strict';
// Hash de contraseñas con scrypt (incluido en Node.js, sin dependencias nativas).
// Formato guardado: scrypt$N$r$p$salBase64$hashBase64
const crypto = require('crypto');
const N = 32768, R = 8, P = 1, KEYLEN = 64, MAXMEM = 128 * 1024 * 1024;

function scrypt(pw, salt, n, r, p, len) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(pw, salt, len, { N: n, r, p, maxmem: MAXMEM }, (err, key) => err ? reject(err) : resolve(key)));
}
async function hash(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(pw).normalize('NFKC'), salt, N, R, P, KEYLEN);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}
async function verify(pw, stored) {
  try {
    const [alg, n, r, p, s, h] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const expected = Buffer.from(h, 'base64');
    const key = await scrypt(String(pw).normalize('NFKC'), Buffer.from(s, 'base64'), +n, +r, +p, expected.length);
    return crypto.timingSafeEqual(key, expected);
  } catch { return false; }
}
let dummy = null;
// Se usa cuando el usuario no existe, para que la respuesta tarde lo mismo y no revele qué usuarios hay.
async function dummyHash() { return dummy || (dummy = await hash(crypto.randomBytes(16).toString('hex'))); }

function issues(pw, minLength) {
  const out = [];
  if (typeof pw !== 'string') return ['una contraseña válida'];
  if (pw.length < minLength) out.push(`al menos ${minLength} caracteres`);
  if (pw.length > 256) out.push('como máximo 256 caracteres');
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) out.push('mayúsculas y minúsculas');
  if (!/\d/.test(pw)) out.push('algún número');
  return out;
}
module.exports = { hash, verify, dummyHash, issues };
