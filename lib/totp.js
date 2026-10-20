'use strict';
// TOTP (RFC 6238) compatible con Microsoft Authenticator, Google Authenticator, Authy, 1Password, etc.
const crypto = require('crypto');
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b32encode(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) {
    val = ((val << 8) | b) & 0xffff; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
function b32decode(s) {
  s = String(s).toUpperCase().replace(/[\s=]/g, '');
  let bits = 0, val = 0; const out = [];
  for (const c of s) {
    const i = B32.indexOf(c); if (i < 0) throw new Error('Secreto no válido');
    val = ((val << 5) | i) & 0xffff; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
function hotp(key, counter) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, '0');
}
const generateSecret = () => b32encode(crypto.randomBytes(20));
// Devuelve el contador usado si el código es válido (ventana de ±30 s), o null.
// lastCounter evita reutilizar el mismo código dos veces.
function verify(secret, code, lastCounter = 0) {
  code = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return null;
  const key = b32decode(secret), now = Math.floor(Date.now() / 30000);
  for (const d of [0, -1, 1]) {
    const c = now + d;
    if (c <= lastCounter) continue;
    if (crypto.timingSafeEqual(Buffer.from(hotp(key, c)), Buffer.from(code))) return c;
  }
  return null;
}
function uri(secret, account, issuer) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
// Códigos de recuperación de un solo uso: XXXX-XXXX
function recoveryCodes(n = 10) {
  const out = [];
  for (let i = 0; i < n; i++) { const s = b32encode(crypto.randomBytes(5)); out.push(`${s.slice(0, 4)}-${s.slice(4, 8)}`); }
  return out;
}
const normRecovery = c => String(c || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
module.exports = { generateSecret, verify, uri, recoveryCodes, normRecovery, hotp, b32decode };
