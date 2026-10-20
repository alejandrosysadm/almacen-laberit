'use strict';
/*
 * Almacén Laberit: servidor de inventario.
 * Node.js + Express + SQLite. Autenticación, sesiones y permisos se comprueban aquí, en el servidor.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
require('./lib/env')(__dirname);
const express = require('express');
const { openDb } = require('./lib/db');
const pw = require('./lib/password');
const mail = require('./lib/mail');
const totp = require('./lib/totp');
const secretbox = require('./lib/secretbox');
const registerOrders = require('./lib/orders');
const setupAlerts = require('./lib/alerts');

/* ---------------- Configuración ---------------- */
const CFG = {
  port: +(process.env.PORT || 8080),
  host: process.env.HOST || '0.0.0.0',
  dataDir: path.resolve(__dirname, process.env.DATA_DIR || 'data'),
  trustProxy: process.env.TRUST_PROXY || '',
  cookieSecure: String(process.env.COOKIE_SECURE || 'auto').toLowerCase(),
  maxSessionHours: +(process.env.SESSION_MAX_HOURS || 12),
  auditDays: +(process.env.AUDIT_RETENTION_DAYS || 730),
  setupToken: process.env.SETUP_TOKEN || '',
  resetMinutes: +(process.env.RESET_TOKEN_MINUTES || 30),
  inviteHours: +(process.env.INVITE_TOKEN_HOURS || 72),
  tlsPfx: process.env.TLS_PFX || '', tlsPass: process.env.TLS_PFX_PASSPHRASE || '',
  tlsCert: process.env.TLS_CERT || '', tlsKey: process.env.TLS_KEY || ''
};
const db = openDb(CFG.dataDir);
secretbox.init(CFG.dataDir);
(function migrate() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  const add = (c, def) => { if (!cols.includes(c)) db.exec(`ALTER TABLE users ADD COLUMN ${c} ${def}`); };
  add('totp_secret', 'TEXT'); add('totp_pending', 'TEXT'); add('totp_enabled', 'INTEGER NOT NULL DEFAULT 0');
  add('totp_last', 'INTEGER NOT NULL DEFAULT 0'); add('recovery_codes', 'TEXT'); add('scope', 'TEXT');
  db.exec(`CREATE TABLE IF NOT EXISTS trusted_devices (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_used INTEGER, ip TEXT, ua TEXT
  ); CREATE INDEX IF NOT EXISTS trusted_devices_user ON trusted_devices(user_id);`);
})();
db.exec(`CREATE TABLE IF NOT EXISTS password_tokens (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, ip TEXT
); CREATE INDEX IF NOT EXISTS password_tokens_user ON password_tokens(user_id);`);
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email COLLATE NOCASE) WHERE email IS NOT NULL AND email <> ''"); }
catch (e) { console.warn('Aviso: hay usuarios con el mismo correo; corrígelo para que el restablecimiento por correo sea fiable.'); }

/* ---------------- Ajustes y permisos ---------------- */
const SERVER_DEFAULTS = {
  company: 'Laberit', sessionMinutes: 30, minPassword: 10, maxAttempts: 5, lockMinutes: 10, mfaRequired: 'off', mfaRememberDays: 30, sedes: [], albaran: {}, estadosSistema: { stock: ['En stock'], reservado: 'Reservado', enviado: 'Enviado', baja: ['Baja'] },
  roles: {
    admin: { name: 'Administrador', perms: '*', locked: true },
    tecnico: { name: 'Técnico de almacén', perms: ['inv.view', 'inv.create', 'inv.edit', 'inv.move', 'inv.export', 'inv.import', 'map.view', 'audit.view'] },
    lector: { name: 'Consulta', perms: ['inv.view', 'inv.export', 'map.view'] }
  }
};
let settingsCache;
function storedSettings() {
  if (settingsCache === undefined) {
    const r = db.prepare("SELECT v FROM settings WHERE k = 'main'").get();
    settingsCache = r ? JSON.parse(r.v) : null;
  }
  return settingsCache;
}
function settings() {
  const s = storedSettings() || {};
  return { ...SERVER_DEFAULTS, ...s, roles: (s.roles && typeof s.roles === 'object') ? s.roles : SERVER_DEFAULTS.roles };
}
function saveSettings(s) {
  db.prepare("INSERT INTO settings (k, v) VALUES ('main', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(JSON.stringify(s));
  settingsCache = s;
}
function can(user, perm) {
  if (!user || !user.active) return false;
  const r = settings().roles[user.role];
  if (!r) return false;
  return r.perms === '*' || (Array.isArray(r.perms) && r.perms.includes(perm));
}
const canAny = (u, ...ps) => ps.some(p => can(u, p));
const rolesSig = roles => JSON.stringify(Object.keys(roles || {}).sort().map(k => [k, roles[k].name, roles[k].perms === '*' ? '*' : [...(roles[k].perms || [])].sort()]));

/* ---------------- Almacenes y alcance de cada usuario ---------------- */
function almacenesOf(s) {
  s = s || settings();
  if (Array.isArray(s.almacenes) && s.almacenes.length) return s.almacenes;
  return [{ id: 'principal', nombre: 'Almacén principal', clientes: ((s.lists || {}).clientes || []).slice(), layout: s.layout || { width: 34, depth: 24, racks: [], zones: [] } }];
}
function clientAlmacen(cliente) { const a = almacenesOf().find(x => (x.clientes || []).includes(cliente)); return a ? a.id : null; }
function scopeOf(u) {
  if (!u) return { almacenes: {} };
  if (u.role === 'admin' || !u.scope) return { all: true };
  try { const sc = JSON.parse(u.scope); return sc && sc.all ? { all: true } : { almacenes: (sc && sc.almacenes) || {} }; } catch { return { almacenes: {} }; }
}
const isTotal = u => !!scopeOf(u).all;
function canClient(u, cliente) {
  const sc = scopeOf(u); if (sc.all) return true;
  if (!cliente) return false;
  return almacenesOf().some(a => (a.clientes || []).includes(cliente) && Array.isArray(sc.almacenes[a.id]) && sc.almacenes[a.id].includes(cliente));
}
// El almacén va en cada equipo; si falta (datos antiguos), se usa el primero que tenga su cliente.
function itemAlm(it) { const a = it && it.data && it.data.almacen; if (a && almacenesOf().some(x => x.id === a)) return a; return clientAlmacen(it && it.data && it.data.cliente); }
function canItem(u, it) {
  const sc = scopeOf(u); if (sc.all) return true;
  const cli = it && it.data && it.data.cliente, a = itemAlm(it);
  return !!(cli && a && Array.isArray(sc.almacenes[a]) && sc.almacenes[a].includes(cli));
}
function cleanScope(sc) {
  if (!sc || sc.all) return null;
  const out = { almacenes: {} };
  almacenesOf().forEach(a => { const list = sc.almacenes && sc.almacenes[a.id]; if (Array.isArray(list)) out.almacenes[a.id] = list.filter(c => (a.clientes || []).includes(c)); });
  return out;
}
function estados() {
  const e = settings().estadosSistema || {};
  return { stock: Array.isArray(e.stock) && e.stock.length ? e.stock : ['En stock'], reservado: e.reservado || 'Reservado', enviado: e.enviado || 'Enviado', baja: Array.isArray(e.baja) ? e.baja : ['Baja'], transito: e.transito || 'En tránsito', retirado: e.retirado || 'Retirado' };
}
function allLocations() {
  const racks = [], zones = [];
  almacenesOf().forEach(a => { const L = a.layout || {}; (L.racks || []).forEach(r => racks.push(r)); (L.zones || []).forEach(z => zones.push(z)); });
  return { racks, zones };
}
const requireTotal = (req, res, next) => isTotal(req.auth.u) ? next() : res.status(403).json({ error: 'Solo un usuario con acceso a todos los almacenes puede hacer esto.' });

/* ---------------- Utilidades ---------------- */
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const nowISO = () => new Date().toISOString();
const newId = () => Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
const normSerial = s => { const v = String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); return v || null; };
const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function httpErr(status, message) { const e = new Error(message); e.status = status; return e; }
function sendErr(res, e) {
  if (!e.status) console.error(e);
  res.status(e.status || 500).json({ error: e.status ? e.message : 'Error interno del servidor.' });
}
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => sendErr(res, e));
const getUser = id => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const countUsers = () => db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
const activeAdmins = () => db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1").get().c;
function publicUser(u) {
  return {
    id: u.id, username: u.username, name: u.name || '', email: u.email || '', role: u.role,
    active: !!u.active, mustChange: !!u.must_change, failed: u.failed || 0, lockUntil: u.lock_until || null,
    lastLogin: u.last_login || null, createdAt: u.created_at || null, createdBy: u.created_by || '',
    mfaEnabled: !!u.totp_enabled, mfaEnroll: mfaNeeded(u), scope: u.role === 'admin' || !u.scope ? { all: true } : scopeOf(u)
  };
}
const rowToItem = r => ({
  id: r.id, cat: r.cat, data: JSON.parse(r.data), history: JSON.parse(r.history || '[]'),
  createdAt: r.created_at, createdBy: r.created_by, updatedAt: r.updated_at, updatedBy: r.updated_by
});

/* ---------------- Tiempo real (Server-Sent Events) ---------------- */
const clients = new Set();
let onItemsChanged = () => {};
function broadcast(event, payload, filter) {
  if (event === 'items') onItemsChanged();
  const fixed = typeof payload === 'function' ? null : `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    const u = getUser(c.userId);
    if (!u || !u.active) { c.res.end(); clients.delete(c); continue; }
    if (filter && !filter(u)) continue;
    if (fixed) { c.res.write(fixed); continue; }
    const p = payload(u); if (p) c.res.write(`event: ${event}\ndata: ${JSON.stringify(p)}\n\n`);
  }
}
// Cada usuario solo recibe los cambios del material que puede ver.
function emitItems(upsert, del) {
  broadcast('items', u => { const up = (upsert || []).filter(it => canItem(u, it)); return up.length || (del && del.length) ? { upsert: up, del: del || [] } : null; }, u => can(u, 'inv.view'));
}

/* ---------------- Registro de actividad ---------------- */
const PRIVATE_ACTIONS = new Set(['login', 'logout', 'login_fallido', 'mfa_activado', 'mfa_desactivado', 'mfa_fallido', 'reset_solicitado', 'correo_enviado', 'usuario_creado', 'usuario_editado', 'usuario_eliminado', 'password_cambiada']);
const CLIENT_ACTIONS = new Set(['alta', 'edicion', 'baja', 'movimiento', 'entrada_masiva', 'salida_masiva', 'importacion', 'exportacion', 'ajustes']);
const insAudit = db.prepare('INSERT INTO audit (t, u, a, d, r) VALUES (?, ?, ?, ?, ?)');
function audit(user, a, d, r = '') {
  const e = { t: nowISO(), u: String(user || 'sistema'), a: String(a), d: String(d || '').slice(0, 500), r: String(r || '').slice(0, 80) };
  insAudit.run(e.t, e.u, e.a, e.d, e.r);
  broadcast('audit', e, u => can(u, 'audit.view') || (can(u, 'inv.view') && !PRIVATE_ACTIONS.has(e.a)));
  return e;
}

/* ---------------- Sesiones ---------------- */
const COOKIE = 'lbinv_sid';
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
function parseCookies(h) {
  const out = {};
  String(h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function setCookie(req, res, value, maxAge, name = COOKIE) {
  const secure = CFG.cookieSecure === '1' || CFG.cookieSecure === 'true' || (CFG.cookieSecure === 'auto' && req.secure);
  res.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}${maxAge !== undefined ? '; Max-Age=' + maxAge : ''}`);
}
function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (id, user_id, created_at, last_seen, ip, ua) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sha(token), userId, now, now, req.ip, String(req.get('user-agent') || '').slice(0, 200));
  setCookie(req, res, token);
}
function sessionExpired(s, now = Date.now()) {
  return now - s.last_seen > (settings().sessionMinutes || 30) * 60000 || now - s.created_at > CFG.maxSessionHours * 3600000;
}
function loadSession(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sha(token));
  if (!s) return null;
  if (sessionExpired(s)) { db.prepare('DELETE FROM sessions WHERE id = ?').run(s.id); return null; }
  const u = getUser(s.user_id);
  if (!u || !u.active) return null;
  return { s, u };
}
const MUST_CHANGE_ALLOWED = new Set(['/me', '/me/password', '/logout', '/settings', '/ping']);
const MFA_ENROLL_ALLOWED = new Set(['/me', '/me/password', '/me/mfa/setup', '/me/mfa/enable', '/logout', '/settings', '/ping']);
function requireAuth(req, res, next) {
  const a = loadSession(req);
  if (!a) return res.status(401).json({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' });
  if (a.u.must_change && !MUST_CHANGE_ALLOWED.has(req.path)) return res.status(403).json({ error: 'Debes cambiar tu contraseña antes de continuar.' });
  if (mfaNeeded(a.u) && !MFA_ENROLL_ALLOWED.has(req.path)) return res.status(403).json({ error: 'Debes activar la verificación en dos pasos antes de continuar.', code: 'mfa_enroll' });
  if (req.path !== '/events' && Date.now() - a.s.last_seen > 20000) db.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?').run(Date.now(), a.s.id);
  req.auth = a;
  next();
}
const requirePerm = (...perms) => (req, res, next) =>
  canAny(req.auth.u, ...perms) ? next() : res.status(403).json({ error: 'No tienes permiso para esta acción.' });

/* ---------------- Doble factor (TOTP) ---------------- */
const TD_COOKIE = 'lbinv_td';
function mfaNeeded(u) {
  if (!u || u.totp_enabled) return false;
  const p = settings().mfaRequired;
  return p === 'all' || (p === 'admins' && u.role === 'admin');
}
const mfaChallenges = new Map();
function trustedDevice(req, userId) {
  const t = parseCookies(req.headers.cookie)[TD_COOKIE];
  if (!t || (settings().mfaRememberDays || 0) <= 0) return null;
  const d = db.prepare('SELECT * FROM trusted_devices WHERE id = ? AND user_id = ?').get(sha(t), userId);
  if (!d || d.expires_at < Date.now()) return null;
  db.prepare('UPDATE trusted_devices SET last_used = ? WHERE id = ?').run(Date.now(), d.id);
  return d;
}
function rememberDevice(req, res, userId) {
  const days = settings().mfaRememberDays || 0;
  if (days <= 0) return;
  const token = crypto.randomBytes(32).toString('base64url'), now = Date.now();
  db.prepare('INSERT INTO trusted_devices (id, user_id, created_at, expires_at, last_used, ip, ua) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(sha(token), userId, now, now + days * 86400000, now, req.ip, String(req.get('user-agent') || '').slice(0, 200));
  setCookie(req, res, token, days * 86400, TD_COOKIE);
}
const revokeDevices = userId => db.prepare('DELETE FROM trusted_devices WHERE user_id = ?').run(userId);
// Comprueba un código TOTP o de recuperación. Devuelve {ok, recovery, left}.
function checkSecondFactor(u, code) {
  const c = String(code || '').trim();
  if (/^\d{6}$/.test(c.replace(/\s/g, ''))) {
    let secret; try { secret = secretbox.decrypt(u.totp_secret); } catch { return { ok: false }; }
    const counter = totp.verify(secret, c, u.totp_last || 0);
    if (counter === null) return { ok: false };
    db.prepare('UPDATE users SET totp_last = ? WHERE id = ?').run(counter, u.id);
    return { ok: true };
  }
  const norm = totp.normRecovery(c);
  if (norm.length !== 8) return { ok: false };
  const list = JSON.parse(u.recovery_codes || '[]'); const h = sha(norm);
  const i = list.indexOf(h);
  if (i < 0) return { ok: false };
  list.splice(i, 1);
  db.prepare('UPDATE users SET recovery_codes = ? WHERE id = ?').run(JSON.stringify(list), u.id);
  return { ok: true, recovery: true, left: list.length };
}
function newRecoveryCodes(userId) {
  const codes = totp.recoveryCodes(10);
  db.prepare('UPDATE users SET recovery_codes = ? WHERE id = ?').run(JSON.stringify(codes.map(c => sha(totp.normRecovery(c)))), userId);
  return codes;
}

/* Límite de intentos de inicio de sesión por IP */
const ipFails = new Map();
const ipBlocked = ip => { const r = ipFails.get(ip); return r && r.until > Date.now() && r.count >= 30; };
function ipFail(ip) {
  const r = ipFails.get(ip);
  if (!r || r.until < Date.now()) ipFails.set(ip, { count: 1, until: Date.now() + 15 * 60000 });
  else r.count++;
}

/* ---------------- Restablecimiento por correo ---------------- */
const company = () => settings().company || 'Laberit';
function issueToken(userId, kind, ip) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const ttl = kind === 'invite' ? CFG.inviteHours * 3600000 : CFG.resetMinutes * 60000;
  db.prepare('DELETE FROM password_tokens WHERE user_id = ? AND used_at IS NULL').run(userId);
  db.prepare('INSERT INTO password_tokens (id, user_id, kind, created_at, expires_at, ip) VALUES (?, ?, ?, ?, ?, ?)').run(sha(token), userId, kind, now, now + ttl, ip || '');
  return token;
}
function findToken(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const t = db.prepare('SELECT * FROM password_tokens WHERE id = ?').get(sha(token));
  if (!t || t.used_at || t.expires_at < Date.now()) return null;
  const u = getUser(t.user_id);
  if (!u || !u.active) return null;
  return { t, u };
}
// Textos de los correos: los de Ajustes → Correos o, si están vacíos, los de siempre. Admiten {variables}.
function mailText(kind, vars, defAsunto, defTexto) {
  const c = ((settings().correos || {})[kind]) || {};
  const fill = t => String(t || '').replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m);
  const asunto = fill(c.asunto || defAsunto);
  const paras = fill(c.texto || defTexto).split(/\n{2,}/).map(p => mail.esc(p.trim()).replace(/\n/g, '<br>')).filter(Boolean);
  return { asunto, paras };
}
async function sendPasswordLink(u, kind, ip) {
  const token = issueToken(u.id, kind, ip);
  const url = `${mail.publicUrl()}/#/reset/${token}`;
  const vars = { nombre: u.name || u.username, usuario: u.username, empresa: company(), horas: String(CFG.inviteHours), minutos: String(CFG.resetMinutes) };
  const T = kind === 'invite'
    ? mailText('invite', vars, 'Tu acceso al almacén de {empresa}', 'Hola {nombre},\n\nSe ha creado tu cuenta en el control de almacén de {empresa}. Tu usuario es {usuario}.\n\nElige tu contraseña con el botón de abajo. El enlace caduca en {horas} horas y solo se puede usar una vez.')
    : mailText('reset', vars, 'Restablecer contraseña · Almacén {empresa}', 'Hola {nombre},\n\nHemos recibido una petición para restablecer la contraseña del usuario {usuario}.\n\nEl enlace caduca en {minutos} minutos y solo se puede usar una vez.');
  const body = mail.layout(company(), kind === 'invite' ? 'Te han dado acceso al almacén' : 'Restablecer tu contraseña', T.paras,
    { label: kind === 'invite' ? 'Elegir mi contraseña' : 'Elegir nueva contraseña', url },
    kind === 'invite' ? 'Si no esperabas este correo, puedes ignorarlo.' : 'Si no lo has pedido tú, ignora este correo: tu contraseña actual sigue siendo válida.');
  await mail.send(u.email, T.asunto, body);
}
function notifyPasswordChanged(u, how) {
  if (!mail.enabled() || !u.email) return;
  const T = mailText('passwd', { nombre: u.name || u.username, usuario: u.username, empresa: company(), como: how, fecha: new Date().toLocaleString('es-ES') },
    'Contraseña cambiada · Almacén {empresa}', 'Hola {nombre},\n\nLa contraseña del usuario {usuario} se ha cambiado {como} el {fecha}.\n\nSi no has sido tú, avisa cuanto antes a un administrador.');
  const body = mail.layout(company(), 'Tu contraseña se ha cambiado', T.paras);
  mail.send(u.email, T.asunto, body).catch(e => console.error('Correo de aviso:', e.message));
}
const forgotIp = new Map();
function forgotAllowed(ip) {
  const now = Date.now(), r = forgotIp.get(ip);
  if (!r || r.until < now) { forgotIp.set(ip, { count: 1, until: now + 15 * 60000 }); return true; }
  return ++r.count <= 10;
}

/* ---------------- Aplicación ---------------- */
const app = express();
app.disable('x-powered-by');
if (CFG.trustProxy) app.set('trust proxy', /^\d+$/.test(CFG.trustProxy) ? +CFG.trustProxy : CFG.trustProxy);

const CSP = [
  "default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", "worker-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"
].join('; ');
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});

const api = express.Router();
api.use(express.json({ limit: '50mb' }));
api.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Protección CSRF: la cookie es SameSite=Strict y además exigimos una cabecera que un formulario externo no puede enviar.
    if (req.get('x-requested-with') !== 'fetch') return res.status(403).json({ error: 'Petición no permitida.' });
    const origin = req.get('origin');
    if (origin) {
      const host = req.get('x-forwarded-host') || req.get('host');
      try { if (new URL(origin).host !== host) return res.status(403).json({ error: 'Origen no permitido.' }); }
      catch { return res.status(403).json({ error: 'Origen no permitido.' }); }
    }
  }
  next();
});

/* --- Arranque y cuenta --- */
api.get('/bootstrap', (req, res) => {
  const a = loadSession(req);
  const s = settings();
  const needsSetup = countUsers() === 0;
  res.json({
    needsSetup, setupToken: needsSetup && !!CFG.setupToken, mailEnabled: mail.enabled(),
    user: a ? publicUser(a.u) : null,
    settings: { company: s.company, minPassword: s.minPassword, brand: s.brand, tema: s.tema, web: { titulo: (s.web || {}).titulo || '' } }
  });
});

api.post('/setup', ah(async (req, res) => {
  const b = req.body || {};
  if (countUsers() > 0) throw httpErr(409, 'El almacén ya tiene administrador. Inicia sesión.');
  if (CFG.setupToken && b.token !== CFG.setupToken) throw httpErr(403, 'El código de instalación no es correcto.');
  const username = String(b.username || '').trim(), name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().slice(0, 160);
  if (email && !EMAIL_RE.test(email)) throw httpErr(400, 'El correo no tiene un formato válido.');
  if (!USERNAME_RE.test(username)) throw httpErr(400, 'El usuario debe tener de 3 a 32 letras, números, punto o guion.');
  if (!name) throw httpErr(400, 'Indica el nombre completo.');
  const iss = pw.issues(b.password, settings().minPassword);
  if (iss.length) throw httpErr(400, 'La contraseña necesita ' + iss.join(', ') + '.');
  const hash = await pw.hash(b.password);
  const id = newId();
  db.transaction(() => {
    if (countUsers() > 0) throw httpErr(409, 'El almacén ya tiene administrador. Inicia sesión.');
    if (isObj(b.settings) && !storedSettings()) saveSettings(sanitizeSettings(b.settings));
    db.prepare(`INSERT INTO users (id, username, name, email, role, active, must_change, pw_hash, pw_changed, created_at, created_by)
                VALUES (?, ?, ?, ?, 'admin', 1, 0, ?, ?, ?, ?)`).run(id, username, name, email, hash, nowISO(), nowISO(), username);
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(nowISO(), id);
  })();
  createSession(req, res, id);
  audit(username, 'usuario_creado', 'Administrador inicial ' + username);
  res.json({ user: publicUser(getUser(id)) });
}));

api.post('/login', ah(async (req, res) => {
  const ip = req.ip;
  if (ipBlocked(ip)) throw httpErr(429, 'Demasiados intentos desde este equipo. Espera unos minutos.');
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256) throw httpErr(400, 'Indica usuario y contraseña.');
  const generic = 'Usuario o contraseña incorrectos.';
  const u = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (!u) { await pw.verify(password, await pw.dummyHash()); ipFail(ip); throw httpErr(401, generic); }
  if (u.lock_until && new Date(u.lock_until) > new Date()) {
    const m = Math.ceil((new Date(u.lock_until) - new Date()) / 60000);
    throw httpErr(423, `Cuenta bloqueada por intentos fallidos. Vuelve a intentarlo en ${m} minuto${m === 1 ? '' : 's'}.`);
  }
  const ok = await pw.verify(password, u.pw_hash);
  if (!ok) {
    ipFail(ip);
    const st = settings();
    let failed = (u.failed || 0) + 1, lock = null;
    if (failed >= st.maxAttempts) { lock = new Date(Date.now() + st.lockMinutes * 60000).toISOString(); failed = 0; }
    db.prepare('UPDATE users SET failed = ?, lock_until = ? WHERE id = ?').run(failed, lock, u.id);
    audit(u.username, 'login_fallido', `Intento fallido desde ${ip}`);
    throw httpErr(401, lock ? `Demasiados intentos. Cuenta bloqueada ${st.lockMinutes} minutos.` : generic);
  }
  if (!u.active) throw httpErr(403, 'Esta cuenta está desactivada. Pide a un administrador que la reactive.');
  db.prepare('UPDATE users SET failed = 0, lock_until = NULL WHERE id = ?').run(u.id);
  if (u.totp_enabled && !trustedDevice(req, u.id)) {
    const challenge = crypto.randomBytes(24).toString('base64url');
    mfaChallenges.set(challenge, { userId: u.id, exp: Date.now() + 5 * 60000, attempts: 0 });
    return res.json({ mfa: true, challenge, rememberDays: settings().mfaRememberDays || 0 });
  }
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(nowISO(), u.id);
  createSession(req, res, u.id);
  audit(u.username, 'login', `Inicio de sesión desde ${ip}${u.totp_enabled ? ' (equipo recordado)' : ''}`);
  res.json({ user: publicUser(getUser(u.id)) });
}));

api.post('/login/mfa', ah(async (req, res) => {
  const ip = req.ip, b = req.body || {};
  if (ipBlocked(ip)) throw httpErr(429, 'Demasiados intentos desde este equipo. Espera unos minutos.');
  const ch = mfaChallenges.get(String(b.challenge || ''));
  if (!ch || ch.exp < Date.now()) { mfaChallenges.delete(String(b.challenge || '')); throw httpErr(401, 'La verificación ha caducado. Vuelve a iniciar sesión.'); }
  const u = getUser(ch.userId);
  if (!u || !u.active || !u.totp_enabled) { mfaChallenges.delete(b.challenge); throw httpErr(401, 'Vuelve a iniciar sesión.'); }
  const r = checkSecondFactor(u, b.code);
  if (!r.ok) {
    ch.attempts++; ipFail(ip);
    audit(u.username, 'mfa_fallido', `Código de verificación incorrecto desde ${ip}`);
    if (ch.attempts >= 5) { mfaChallenges.delete(b.challenge); throw httpErr(401, 'Demasiados códigos incorrectos. Vuelve a iniciar sesión.'); }
    throw httpErr(401, 'El código no es correcto. Comprueba que la hora del móvil está bien.');
  }
  mfaChallenges.delete(b.challenge);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(nowISO(), u.id);
  createSession(req, res, u.id);
  if (b.remember) rememberDevice(req, res, u.id);
  audit(u.username, 'login', `Inicio de sesión con verificación en dos pasos desde ${ip}${r.recovery ? ' (código de recuperación)' : ''}${b.remember ? ', equipo recordado' : ''}`);
  res.json({ user: publicUser(getUser(u.id)), recoveryLeft: r.recovery ? r.left : undefined });
}));

api.post('/logout', (req, res) => {
  const a = loadSession(req);
  if (a) { db.prepare('DELETE FROM sessions WHERE id = ?').run(a.s.id); audit(a.u.username, 'logout', 'Cierre de sesión'); }
  setCookie(req, res, '', 0);
  res.json({ ok: true });
});

api.post('/password/forgot', ah(async (req, res) => {
  if (!mail.enabled()) throw httpErr(503, 'El envío de correo no está configurado en el servidor. Pide a un administrador que restablezca tu contraseña.');
  if (!forgotAllowed(req.ip)) throw httpErr(429, 'Demasiadas solicitudes desde este equipo. Espera unos minutos.');
  const id = String((req.body || {}).identifier || '').trim().slice(0, 160);
  const generic = { ok: true, message: 'Si existe una cuenta con esos datos y tiene correo, recibirás un enlace en unos minutos. Revisa también la carpeta de correo no deseado.' };
  if (!id) throw httpErr(400, 'Indica tu usuario o tu correo.');
  const u = db.prepare('SELECT * FROM users WHERE (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) AND active = 1').get(id, id);
  if (u && u.email) {
    const recent = db.prepare('SELECT COUNT(*) AS c FROM password_tokens WHERE user_id = ? AND created_at > ?').get(u.id, Date.now() - 3600000).c;
    if (recent < 3) {
      try { await sendPasswordLink(u, 'reset', req.ip); audit(u.username, 'reset_solicitado', `Enlace enviado a ${u.email} desde ${req.ip}`); }
      catch (e) { console.error('Correo de restablecimiento:', e.message); }
    }
  }
  res.json(generic);
}));
api.get('/password/token/:token', (req, res) => {
  const f = findToken(req.params.token);
  if (!f) throw httpErr(400, 'El enlace no es válido o ha caducado. Solicita uno nuevo.');
  res.json({ username: f.u.username, name: f.u.name, kind: f.t.kind });
});
api.post('/password/reset', ah(async (req, res) => {
  const b = req.body || {};
  const f = findToken(b.token);
  if (!f) throw httpErr(400, 'El enlace no es válido o ha caducado. Solicita uno nuevo.');
  const iss = pw.issues(b.password, settings().minPassword);
  if (iss.length) throw httpErr(400, 'La contraseña necesita ' + iss.join(', ') + '.');
  const hash = await pw.hash(b.password);
  const used = db.transaction(() => {
    const r = db.prepare('UPDATE password_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL').run(Date.now(), f.t.id);
    if (!r.changes) return false;
    db.prepare('UPDATE users SET pw_hash = ?, must_change = 0, failed = 0, lock_until = NULL, pw_changed = ? WHERE id = ?').run(hash, nowISO(), f.u.id);
    db.prepare('DELETE FROM password_tokens WHERE user_id = ? AND used_at IS NULL').run(f.u.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(f.u.id);
    db.prepare('DELETE FROM trusted_devices WHERE user_id = ?').run(f.u.id);
    return true;
  })();
  if (!used) throw httpErr(400, 'El enlace no es válido o ha caducado. Solicita uno nuevo.');
  audit(f.u.username, 'password_cambiada', f.t.kind === 'invite' ? 'Contraseña elegida desde la invitación' : 'Contraseña restablecida con el enlace de correo');
  if (f.t.kind !== 'invite') notifyPasswordChanged(f.u, 'con un enlace de restablecimiento');
  broadcast('users', {});
  res.json({ ok: true, username: f.u.username });
}));

api.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.auth.u) }));
api.put('/me', requireAuth, ah(async (req, res) => {
  const u = req.auth.u, b = req.body || {};
  const name = String(b.name ?? u.name ?? '').trim().slice(0, 120);
  const email = String(b.email ?? '').trim().slice(0, 160);
  if (!name) throw httpErr(400, 'Indica tu nombre.');
  if (email && !EMAIL_RE.test(email)) throw httpErr(400, 'El correo no tiene un formato válido.');
  if (email.toLowerCase() !== String(u.email || '').toLowerCase()) {
    if (!(typeof b.current === 'string' && await pw.verify(b.current, u.pw_hash))) throw httpErr(400, 'Para cambiar el correo, escribe tu contraseña actual.');
    if (email && db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id <> ?').get(email, u.id)) throw httpErr(409, 'Ese correo ya lo usa otra cuenta.');
  }
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, u.id);
  audit(u.username, 'usuario_editado', `Datos propios actualizados${email !== (u.email || '') ? ' (correo: ' + (email || 'ninguno') + ')' : ''}`);
  broadcast('users', {}, x => can(x, 'users.manage'));
  res.json({ user: publicUser(getUser(u.id)) });
}));
api.get('/ping', requireAuth, (req, res) => res.json({ ok: true }));

api.post('/me/password', requireAuth, ah(async (req, res) => {
  const u = req.auth.u, b = req.body || {};
  if (!u.must_change && !(typeof b.current === 'string' && await pw.verify(b.current, u.pw_hash))) throw httpErr(400, 'La contraseña actual no es correcta.');
  const iss = pw.issues(b.password, settings().minPassword);
  if (iss.length) throw httpErr(400, 'La contraseña necesita ' + iss.join(', ') + '.');
  if (await pw.verify(b.password, u.pw_hash)) throw httpErr(400, 'La nueva contraseña debe ser distinta de la actual.');
  const hash = await pw.hash(b.password);
  db.prepare('UPDATE users SET pw_hash = ?, must_change = 0, failed = 0, lock_until = NULL, pw_changed = ? WHERE id = ?').run(hash, nowISO(), u.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(u.id, req.auth.s.id);
  db.prepare('DELETE FROM trusted_devices WHERE user_id = ?').run(u.id);
  audit(u.username, 'password_cambiada', 'Cambio de contraseña propia');
  notifyPasswordChanged(getUser(u.id), 'desde la aplicación');
  res.json({ user: publicUser(getUser(u.id)) });
}));

/* --- Verificación en dos pasos --- */
api.post('/me/mfa/setup', requireAuth, (req, res) => {
  const u = req.auth.u;
  if (u.totp_enabled) throw httpErr(400, 'La verificación en dos pasos ya está activada.');
  const secret = totp.generateSecret();
  db.prepare('UPDATE users SET totp_pending = ? WHERE id = ?').run(secretbox.encrypt(secret), u.id);
  res.json({ secret, uri: totp.uri(secret, u.username, `Almacén ${settings().company || 'Laberit'}`) });
});
api.post('/me/mfa/enable', requireAuth, (req, res) => {
  const u = req.auth.u, b = req.body || {};
  if (u.totp_enabled) throw httpErr(400, 'La verificación en dos pasos ya está activada.');
  if (!u.totp_pending) throw httpErr(400, 'Vuelve a empezar la activación.');
  const secret = secretbox.decrypt(u.totp_pending);
  const counter = totp.verify(secret, b.code, 0);
  if (counter === null) throw httpErr(400, 'El código no es correcto. Comprueba que la hora del móvil está bien y vuelve a probar.');
  db.prepare('UPDATE users SET totp_secret = ?, totp_pending = NULL, totp_enabled = 1, totp_last = ? WHERE id = ?').run(u.totp_pending, counter, u.id);
  const codes = newRecoveryCodes(u.id);
  if (b.remember) rememberDevice(req, res, u.id);
  audit(u.username, 'mfa_activado', 'Verificación en dos pasos activada');
  broadcast('users', {}, x => can(x, 'users.manage'));
  res.json({ codes, user: publicUser(getUser(u.id)) });
});
api.post('/me/mfa/disable', requireAuth, ah(async (req, res) => {
  const u = req.auth.u, b = req.body || {};
  if (!u.totp_enabled) throw httpErr(400, 'La verificación en dos pasos no está activada.');
  const p = settings().mfaRequired;
  if (p === 'all' || (p === 'admins' && u.role === 'admin')) throw httpErr(400, 'La verificación en dos pasos es obligatoria para tu cuenta.');
  if (!(typeof b.password === 'string' && await pw.verify(b.password, u.pw_hash))) throw httpErr(400, 'La contraseña no es correcta.');
  if (!checkSecondFactor(u, b.code).ok) throw httpErr(400, 'El código de verificación no es correcto.');
  db.prepare('UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_enabled = 0, totp_last = 0, recovery_codes = NULL WHERE id = ?').run(u.id);
  revokeDevices(u.id);
  audit(u.username, 'mfa_desactivado', 'Verificación en dos pasos desactivada por el usuario');
  broadcast('users', {}, x => can(x, 'users.manage'));
  res.json({ user: publicUser(getUser(u.id)) });
}));
api.post('/me/mfa/recovery', requireAuth, (req, res) => {
  const u = req.auth.u;
  if (!u.totp_enabled) throw httpErr(400, 'La verificación en dos pasos no está activada.');
  if (!checkSecondFactor(u, (req.body || {}).code).ok) throw httpErr(400, 'El código de verificación no es correcto.');
  const codes = newRecoveryCodes(u.id);
  audit(u.username, 'mfa_activado', 'Códigos de recuperación regenerados');
  res.json({ codes });
});
api.get('/me/mfa', requireAuth, (req, res) => {
  const u = req.auth.u;
  const devices = db.prepare('SELECT created_at, expires_at, last_used, ip, ua FROM trusted_devices WHERE user_id = ? AND expires_at > ? ORDER BY last_used DESC').all(u.id, Date.now());
  res.json({ enabled: !!u.totp_enabled, required: settings().mfaRequired, rememberDays: settings().mfaRememberDays || 0, recoveryLeft: JSON.parse(u.recovery_codes || '[]').length, devices });
});
api.post('/me/mfa/forget-devices', requireAuth, (req, res) => {
  const n = revokeDevices(req.auth.u.id).changes;
  setCookie(req, res, '', 0, TD_COOKIE);
  audit(req.auth.u.username, 'mfa_desactivado', `Equipos recordados olvidados (${n})`);
  res.json({ ok: true, removed: n });
});

/* --- Tiempo real --- */
api.get('/events', requireAuth, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 4000\n\n');
  const c = { res, userId: req.auth.u.id, sid: req.auth.s.id };
  clients.add(c);
  req.on('close', () => clients.delete(c));
});
setInterval(() => {
  for (const c of clients) {
    const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(c.sid);
    if (!s || sessionExpired(s)) { c.res.end(); clients.delete(c); continue; }
    c.res.write(': ping\n\n');
  }
}, 25000).unref();

/* --- Ajustes --- */
function sanitizeSettings(s) {
  const out = JSON.parse(JSON.stringify(s));
  const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  out.sessionMinutes = num(out.sessionMinutes, 5, 720, 30);
  out.minPassword = num(out.minPassword, 8, 128, 10);
  out.maxAttempts = num(out.maxAttempts, 3, 50, 5);
  out.lockMinutes = num(out.lockMinutes, 1, 1440, 10);
  out.expiryWarnDays = num(out.expiryWarnDays, 1, 3650, 45);
  out.mfaRequired = ['off', 'admins', 'all'].includes(out.mfaRequired) ? out.mfaRequired : 'off';
  out.mfaRememberDays = num(out.mfaRememberDays, 0, 90, 30);
  const s40 = (v, n = 200) => String(v ?? '').trim().slice(0, n);
  out.sedes = (Array.isArray(out.sedes) ? out.sedes : []).filter(isObj).slice(0, 3000).map(x => ({
    id: /^[A-Za-z0-9_-]{4,64}$/.test(x.id || '') ? x.id : newId(), cliente: s40(x.cliente, 120), nombre: s40(x.nombre, 120), direccion: s40(x.direccion),
    cp: s40(x.cp, 20), ciudad: s40(x.ciudad, 80), pais: s40(x.pais, 60), contacto: s40(x.contacto, 120), telefono: s40(x.telefono, 40),
    email: (EMAIL_RE.test(String(x.email || '').trim()) ? String(x.email).trim().toLowerCase() : '')
  }));
  const al = isObj(out.albaran) ? out.albaran : {};
  const bool = (v, d) => v === undefined ? d : !!v;
  const emails = v => (Array.isArray(v) ? v : String(v || '').split(/[,;\s]+/)).map(x => String(x).trim().toLowerCase()).filter(x => EMAIL_RE.test(x)).slice(0, 25);
  out.albaran = { razonSocial: s40(al.razonSocial, 160), cif: s40(al.cif, 30), direccion: s40(al.direccion, 300), telefono: s40(al.telefono, 40), email: s40(al.email, 160), pie: s40(al.pie, 400),
    declaracion: s40(al.declaracion, 400),
    columns: (Array.isArray(al.columns) ? al.columns : []).filter(k => /^[a-z0-9_]{1,40}$/.test(k)).slice(0, 12),
    showEmisor: bool(al.showEmisor, true), showInfo: bool(al.showInfo, true), showNotes: bool(al.showNotes, true), showSignatures: bool(al.showSignatures, true), showDeclaration: bool(al.showDeclaration, true),
    defaultSedeId: s40(al.defaultSedeId, 64), generateDefault: bool(al.generateDefault, true), mailDefault: bool(al.mailDefault, false),
    emailTo: emails(al.emailTo), emailSubject: s40(al.emailSubject, 200), emailBody: s40(al.emailBody, 3000), titulo: s40(al.titulo, 60) };
  out.stockRules = (Array.isArray(out.stockRules) ? out.stockRules : []).filter(isObj).slice(0, 100).map(r => ({
    id: /^[A-Za-z0-9_-]{4,64}$/.test(r.id || '') ? r.id : newId(), name: s40(r.name, 80) || 'Regla', cat: s40(r.cat, 64),
    conds: (Array.isArray(r.conds) ? r.conds : []).filter(isObj).slice(0, 5).map(c => ({ k: s40(c.k, 40), v: s40(c.v, 120) })).filter(c => /^[a-z0-9_]{1,40}$/.test(c.k)),
    min: num(r.min, 0, 100000, 0), emails: emails(r.emails), active: r.active !== false }));
  out.stockAlertEmails = emails(out.stockAlertEmails);
  const nu = isObj(out.numeracion) ? out.numeracion : {};
  const pre = (v, d) => /^[A-Za-z0-9]{1,10}$/.test(String(v || '').trim()) ? String(v).trim().toUpperCase() : d;
  out.numeracion = { albaran: pre(nu.albaran, 'ALB'), pedido: pre(nu.pedido, 'PED'), traspaso: pre(nu.traspaso, 'TRA'), retirada: pre(nu.retirada, 'RET'), certificado: pre(nu.certificado, 'CERT'), anual: nu.anual !== false, digitos: num(nu.digitos, 3, 8, 4) };
  const rc = isObj(out.recogida) ? out.recogida : {};
  out.recogida = { titulo: s40(rc.titulo, 60), columns: (Array.isArray(rc.columns) ? rc.columns : []).filter(k => /^[a-z0-9_]{1,40}$/.test(k)).slice(0, 12), showSummary: rc.showSummary !== false, showSignature: rc.showSignature !== false, groupByLocation: rc.groupByLocation !== false };
  const labels = v => { const o = {}; if (isObj(v)) Object.entries(v).slice(0, 40).forEach(([k, l]) => { if (/^[a-z0-9_]{1,40}$/.test(k) && String(l || '').trim()) o[k] = s40(l, 40); }); return o; };
  out.albaran.labels = labels(al.labels);
  out.recogida.labels = labels(rc.labels);
  out.combos = (Array.isArray(out.combos) ? out.combos : []).filter(isObj).slice(0, 20).map(c => ({ key: /^combo_[a-z0-9]{2,24}$/.test(c.key || '') ? c.key : 'combo_' + newId().slice(-8).toLowerCase(), label: s40(c.label, 60) || 'Columna', template: s40(c.template, 200) }));
  const tm = isObj(out.tema) ? out.tema : {};
  const ce = isObj(out.certificado) ? out.certificado : {};
  out.certificado = { titulo: s40(ce.titulo, 60), texto: s40(ce.texto, 3000), firma1: s40(ce.firma1, 60), firma2: s40(ce.firma2, 60), pie: s40(ce.pie, 400) };
  const rt = isObj(out.retirada) ? out.retirada : {};
  out.retirada = { condicion: s40(rt.condicion, 60) || 'Usado' };
  const co = isObj(out.correos) ? out.correos : {};
  out.correos = {}; ['invite', 'reset', 'passwd', 'stock'].forEach(k => { const v = isObj(co[k]) ? co[k] : {}; out.correos[k] = { asunto: s40(v.asunto, 200), texto: s40(v.texto, 3000) }; });
  const db0 = isObj(out.dashboard) ? out.dashboard : {};
  out.dashboard = { hidden: (Array.isArray(db0.hidden) ? db0.hidden : []).filter(k => /^[a-z]{2,20}$/.test(k)).slice(0, 40) };
  out.objTypes = (Array.isArray(out.objTypes) ? out.objTypes : []).filter(isObj).slice(0, 40).map(t => ({ key: /^[a-z0-9_]{2,30}$/.test(t.key || '') ? t.key : 'x_' + newId().slice(-8).toLowerCase(), l: s40(t.l, 40) || 'Elemento',
    w: num(t.w, 0.05, 100, 1), d: num(t.d, 0.05, 100, 1), h: num(t.h, 0, 20, 1), c: /^#[0-9a-fA-F]{6}$/.test(t.c || '') ? t.c : '#94A3B8', custom: !!t.custom }));
  const wb = isObj(out.web) ? out.web : {};
  out.web = { titulo: s40(wb.titulo, 80), favicon: typeof wb.favicon === 'string' && /^data:image\/(png|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/.test(wb.favicon) && wb.favicon.length <= 300000 ? wb.favicon : '' };
  const sp = isObj(out.splash) ? out.splash : {};
  out.splash = { enabled: sp.enabled !== false, show: sp.show === 'text' ? 'text' : 'auto', title: s40(sp.title, 60), sub: s40(sp.sub, 80), msg: s40(sp.msg, 120),
    anim: ['rack', 'pulse', 'none'].includes(sp.anim) ? sp.anim : 'rack', bg: ['auto', 'color', 'white'].includes(sp.bg) ? sp.bg : 'auto', minMs: num(sp.minMs, 0, 4000, 650) };
  out.tema = { primario: /^#[0-9a-fA-F]{6}$/.test(tm.primario || '') ? tm.primario : '#C8102E' };
  (out.stockRules || []).forEach((r, i) => { const src = (s.stockRules || [])[i] || {}; r.almacen = s40(src.almacen, 64); });
  const est = isObj(out.estadosSistema) ? out.estadosSistema : {};
  const arr = v => (Array.isArray(v) ? v : [v]).map(x => s40(x, 60)).filter(Boolean);
  out.estadosSistema = { stock: arr(est.stock).length ? arr(est.stock) : ['En stock'], reservado: s40(est.reservado, 60) || 'Reservado', enviado: s40(est.enviado, 60) || 'Enviado', baja: arr(est.baja), transito: s40(est.transito, 60) || 'En tránsito', retirado: s40(est.retirado, 60) || 'Retirado' };
  if (out.lists && Array.isArray(out.lists.estados)) [out.estadosSistema.transito, out.estadosSistema.retirado].forEach(v => { if (!out.lists.estados.includes(v)) out.lists.estados.push(v); });
  const geom = L => ({ width: num(L && L.width, 5, 500, 34), depth: num(L && L.depth, 5, 500, 24),
    racks: (Array.isArray(L && L.racks) ? L.racks : []).filter(isObj).slice(0, 300).map(r => ({ id: s40(r.id, 40) || newId(), name: s40(r.name, 40), x: Number(r.x) || 0, z: Number(r.z) || 0, rot: Number(r.rot) === 90 ? 90 : 0, len: num(r.len, 1, 100, 4), levels: num(r.levels, 1, 10, 4), huecos: Math.min(50, Math.max(0, Math.round(Number(r.huecos) || 0))), planta: s40(r.planta, 40), elev: Math.min(10, Math.max(0, Number(r.elev) || 0)) })),
    shape: Array.isArray(L && L.shape) && L.shape.length >= 3 ? L.shape.slice(0, 40).map(q => [Number(Array.isArray(q) ? q[0] : 0) || 0, Number(Array.isArray(q) ? q[1] : 0) || 0]) : undefined,
    shapeKind: Array.isArray(L && L.shape) && L.shape.length >= 3 ? s40(L.shapeKind, 10) : undefined,
    plantas: (Array.isArray(L && L.plantas) ? L.plantas : []).filter(isObj).slice(0, 6).map(q => ({ id: s40(q.id, 40) || newId(), nombre: s40(q.nombre, 40) || 'Altillo', altura: num(q.altura, 0.5, 30, 3), x: Number(q.x) || 0, z: Number(q.z) || 0, w: num(q.w, 1, 500, 10), d: num(q.d, 1, 500, 6) })),
    plan: L && isObj(L.plan) && typeof L.plan.image === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(L.plan.image) && L.plan.image.length <= 1600000
      ? { image: L.plan.image, opacity: Math.min(1, Math.max(0.1, Number(L.plan.opacity) || 0.6)), ratio: Number(L.plan.ratio) || 0 } : undefined,
    objects: (Array.isArray(L && L.objects) ? L.objects : []).filter(isObj).slice(0, 300).map(o => ({ id: s40(o.id, 40) || newId(), type: /^[a-z0-9_]{2,30}$/.test(o.type || '') ? o.type : 'pilar', name: s40(o.name, 40), x: Number(o.x) || 0, z: Number(o.z) || 0, w: num(o.w, 0.05, 200, 1), d: num(o.d, 0.05, 200, 1), rot: Number(o.rot) === 90 ? 90 : 0, planta: s40(o.planta, 40) })),
    doors: (Array.isArray(L && L.doors) ? L.doors : []).filter(isObj).slice(0, 20).map(d => ({ id: s40(d.id, 40) || newId(), name: s40(d.name, 40), wall: /^(N|S|E|O|e\d{1,2})$/.test(d.wall || '') ? d.wall : 'S', pos: Number(d.pos) || 0, width: num(d.width, 0.5, 50, 2) })),
    zones: (Array.isArray(L && L.zones) ? L.zones : []).filter(isObj).slice(0, 100).map(z => ({ id: s40(z.id, 40) || newId(), name: s40(z.name, 60), x: Number(z.x) || 0, z: Number(z.z) || 0, w: num(z.w, 1, 500, 5), d: num(z.d, 1, 500, 4), color: /^#[0-9a-fA-F]{6}$/.test(z.color || '') ? z.color : '#475569', planta: s40(z.planta, 40) })) });
  const seenCli = new Set(), seenLoc = new Set();
  out.almacenes = (Array.isArray(out.almacenes) && out.almacenes.length ? out.almacenes : almacenesOf(out)).filter(isObj).slice(0, 50).map(a => {
    const L = geom(a.layout);
    [...L.racks, ...L.zones].forEach(x => { while (seenLoc.has(x.id)) x.id = x.id + '-' + newId().slice(-4); seenLoc.add(x.id); });
    return { id: /^[A-Za-z0-9_-]{2,64}$/.test(a.id || '') ? a.id : newId(), nombre: s40(a.nombre, 80) || 'Almacén',
      clientes: [...new Set((Array.isArray(a.clientes) ? a.clientes : []).map(c => s40(c, 120)).filter(Boolean))], layout: L };
  });
  if (out.lists && Array.isArray(out.lists.clientes)) { const cl = new Set(out.lists.clientes); out.almacenes.forEach(a => { a.clientes = a.clientes.filter(c => cl.has(c)); }); }
  out.layout = out.almacenes[0].layout;
  out.stockRemindDays = num(out.stockRemindDays, 0, 365, 7);
  const br = isObj(out.brand) ? out.brand : {};
  const logoOk = typeof br.logo === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(br.logo) && br.logo.length <= 800000;
  out.brand = { mode: br.mode === 'image' && logoOk ? 'image' : 'text', bg: br.bg === 'white' ? 'white' : 'red',
    subtitle: br.subtitle === undefined ? 'Control de almacén' : String(br.subtitle).slice(0, 60), logo: logoOk ? br.logo : '',
    size: num(br.size, 20, 110, 52), align: br.align === 'center' ? 'center' : 'left' };
  out.roles = isObj(out.roles) ? out.roles : SERVER_DEFAULTS.roles;
  for (const k of Object.keys(out.roles)) {
    const r = out.roles[k];
    if (!isObj(r)) { delete out.roles[k]; continue; }
    r.name = String(r.name || k).slice(0, 60);
    if (k !== 'admin') { r.perms = Array.isArray(r.perms) ? r.perms.filter(p => typeof p === 'string').slice(0, 50) : []; delete r.locked; }
  }
  out.roles.admin = { name: (out.roles.admin && out.roles.admin.name) || 'Administrador', perms: '*', locked: true };
  return out;
}
// Ajustes que puede ver cada usuario: con acceso limitado, solo sus almacenes, sus clientes y las sedes de esos clientes.
function settingsFor(u, st) {
  if (!st || isTotal(u)) return st;
  const out = JSON.parse(JSON.stringify(st)), sc = scopeOf(u);
  out.almacenes = almacenesOf(st).filter(a => Array.isArray(sc.almacenes[a.id])).map(a => ({ ...a, clientes: (a.clientes || []).filter(c => sc.almacenes[a.id].includes(c)) }));
  const visible = new Set(out.almacenes.flatMap(a => a.clientes));
  if (out.lists && out.lists.clientes) out.lists.clientes = out.lists.clientes.filter(c => visible.has(c));
  out.sedes = (out.sedes || []).filter(x => visible.has(x.cliente));
  delete out.stockAlertEmails; (out.stockRules || []).forEach(r => { delete r.emails; });
  if (out.albaran) delete out.albaran.emailTo;
  delete out.correos;
  return out;
}
api.get('/settings', requireAuth, (req, res) => res.json(settingsFor(req.auth.u, storedSettings())));
/* --- Responsable de almacén: configura solo sus almacenes y las sedes de sus clientes --- */
function saveScoped(next, u, what) {
  const s = sanitizeSettings(next);
  if (JSON.stringify(s).length > 25_000_000) throw httpErr(400, 'Los ajustes son demasiado grandes. Usa planos de fondo más ligeros.');
  saveSettings(s);
  broadcast('settings', x => settingsFor(x, s));
  audit(u.username, 'ajustes', what);
  alerts.schedule();
  return s;
}
api.put('/almacenes/:id', requireAuth, requirePerm('alm.manage'), (req, res) => {
  const u = req.auth.u, id = String(req.params.id), b = req.body || {};
  if (!isTotal(u) && !Array.isArray(scopeOf(u).almacenes[id])) throw httpErr(403, 'No tienes acceso a ese almacén.');
  const st = JSON.parse(JSON.stringify(storedSettings() || settings()));
  st.almacenes = almacenesOf(st);
  const a = st.almacenes.find(x => x.id === id); if (!a) throw httpErr(404, 'El almacén no existe.');
  if (!isObj(b.layout)) throw httpErr(400, 'Distribución no válida.');
  a.nombre = String(b.nombre || '').trim().slice(0, 80) || a.nombre; a.layout = b.layout;   // los clientes del almacén no se cambian aquí
  const s = saveScoped(st, u, `Almacén «${a.nombre}» configurado`);
  res.json(settingsFor(u, s));
});
api.put('/sedes', requireAuth, requirePerm('alm.manage'), (req, res) => {
  const u = req.auth.u, b = req.body || {};
  if (!Array.isArray(b.sedes)) throw httpErr(400, 'Sedes no válidas.');
  const st = JSON.parse(JSON.stringify(storedSettings() || settings()));
  const mine = new Set(isTotal(u) ? ((st.lists || {}).clientes || []) : Object.values(scopeOf(u).almacenes).flat());
  const bad = b.sedes.find(x => !isObj(x) || !mine.has(x.cliente)); if (bad) throw httpErr(403, `No tienes acceso al cliente ${(bad && bad.cliente) || '(sin cliente)'}.`);
  st.sedes = (st.sedes || []).filter(x => !mine.has(x.cliente)).concat(b.sedes);
  const s = saveScoped(st, u, 'Sedes de clientes actualizadas');
  res.json(settingsFor(u, s));
});
api.put('/settings', requireAuth, requirePerm('settings.manage'), requireTotal, (req, res) => {
  const b = req.body;
  if (!isObj(b) || !Array.isArray(b.categories) || !isObj(b.lists)) throw httpErr(400, 'Ajustes con formato no válido.');
  const s = sanitizeSettings(b);
  if (JSON.stringify(s).length > 25_000_000) throw httpErr(400, 'Los ajustes son demasiado grandes. Usa planos de fondo más ligeros.');
  if (rolesSig(s.roles) !== rolesSig(settings().roles)) {
    if (!can(req.auth.u, 'users.manage')) throw httpErr(403, 'Solo quien gestiona usuarios puede cambiar roles y permisos.');
    const inUse = db.prepare('SELECT DISTINCT role FROM users').all().map(r => r.role).filter(r => !s.roles[r]);
    if (inUse.length) throw httpErr(400, `Hay usuarios con el rol «${inUse[0]}». Cámbiales el rol antes de eliminarlo.`);
  }
  const renamed = applyRenames(settings(), s, req.auth.u.username);
  saveSettings(s);
  mail.setAccent(s.tema && s.tema.primario);
  broadcast('settings', u => settingsFor(u, s));
  if (renamed.items.length) emitItems(renamed.items);
  if (renamed.clientes) { broadcast('orders', {}); broadcast('deliveries', {}); broadcast('users', {}); }
  alerts.schedule();
  res.json(s);
});

// Si se renombra un valor de una lista (misma posición, nombre distinto), se actualiza en todo el material
// y en lo que dependa de él, para que nada quede apuntando al nombre antiguo.
function applyRenames(prev, next, username) {
  const out = { items: [], clientes: 0 };
  const changes = {};
  Object.keys(next.lists || {}).forEach(k => {
    const o = (prev.lists || {})[k], n = next.lists[k];
    if (!Array.isArray(o) || !Array.isArray(n) || o.length !== n.length) return;
    const m = {};
    o.forEach((v, i) => { if (n[i] !== v && !n.includes(v) && !o.includes(n[i])) m[v] = n[i]; });
    if (Object.keys(m).length) changes[k] = m;
  });
  if (!Object.keys(changes).length) return out;
  const fieldsByList = {};
  (next.categories || []).forEach(c => (c.fields || []).forEach(f => { if (f.type === 'select' && f.list && changes[f.list]) (fieldsByList[c.id] = fieldsByList[c.id] || []).push(f); }));
  db.transaction(() => {
    db.prepare('SELECT * FROM items').all().map(rowToItem).forEach(it => {
      let touched = false;
      (fieldsByList[it.cat] || []).forEach(f => { const nv = changes[f.list][it.data[f.key]]; if (nv !== undefined) { it.data[f.key] = nv; touched = true; } });
      if (it.data.estado_previo && changes.estados && changes.estados[it.data.estado_previo]) { it.data.estado_previo = changes.estados[it.data.estado_previo]; touched = true; }
      if (touched) { upsertItem(it, username); out.items.push(it); }
    });
    const cm = changes.clientes;
    if (cm) {
      Object.entries(cm).forEach(([o, n]) => {
        out.clientes += db.prepare('UPDATE orders SET cliente = ? WHERE cliente = ?').run(n, o).changes;
        out.clientes += db.prepare('UPDATE deliveries SET cliente = ? WHERE cliente = ?').run(n, o).changes;
      });
      (next.almacenes || []).forEach(a => { a.clientes = (a.clientes || []).map(c => cm[c] || c); });
      (next.sedes || []).forEach(x => { if (cm[x.cliente]) x.cliente = cm[x.cliente]; });
      db.prepare('SELECT id, scope FROM users WHERE scope IS NOT NULL').all().forEach(u => {
        try { const sc = JSON.parse(u.scope); let ch = false; Object.values(sc.almacenes || {}).forEach(l => l.forEach((c, i) => { if (cm[c]) { l[i] = cm[c]; ch = true; } })); if (ch) db.prepare('UPDATE users SET scope = ? WHERE id = ?').run(JSON.stringify(sc), u.id); } catch {}
      });
      out.clientes = out.clientes || 1;
    }
    const em = changes.estados;
    if (em && next.estadosSistema) {
      const E = next.estadosSistema;
      E.stock = (E.stock || []).map(v => em[v] || v); E.baja = (E.baja || []).map(v => em[v] || v);
      if (em[E.reservado]) E.reservado = em[E.reservado]; if (em[E.enviado]) E.enviado = em[E.enviado];
    }
    (next.stockRules || []).forEach(r => (r.conds || []).forEach(k => { const c = (next.categories || []).find(x => x.id === r.cat); const f = c && (c.fields || []).find(x => x.key === k.k); if (f && f.list && changes[f.list] && changes[f.list][k.v]) k.v = changes[f.list][k.v]; }));
  })();
  const desc = Object.entries(changes).map(([k, m]) => Object.entries(m).map(([o, n]) => `${o} → ${n}`).join(', ')).join('; ');
  audit(username, 'ajustes', `Valores renombrados: ${desc}${out.items.length ? ` (${out.items.length} registros actualizados)` : ''}`);
  return out;
}

/* --- Inventario --- */
const getItemStmt = db.prepare('SELECT * FROM items WHERE id = ?');
const serialDupStmt = db.prepare('SELECT id, data FROM items WHERE serial_norm = ? AND id <> ?');
const upsertItemStmt = db.prepare(`INSERT INTO items (id, cat, serial_norm, data, history, created_at, created_by, updated_at, updated_by)
  VALUES (@id, @cat, @sn, @data, @history, @createdAt, @createdBy, @updatedAt, @updatedBy)
  ON CONFLICT(id) DO UPDATE SET cat = excluded.cat, serial_norm = excluded.serial_norm, data = excluded.data, history = excluded.history,
    updated_at = excluded.updated_at, updated_by = excluded.updated_by`);
function validItem(it) {
  return it && typeof it.id === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(it.id) && typeof it.cat === 'string' && it.cat.length > 0 && it.cat.length <= 64 && isObj(it.data);
}
function cleanHistory(h) {
  let hist = Array.isArray(h) ? h.filter(isObj).slice(-40).map(x => ({ t: String(x.t || '').slice(0, 40), u: String(x.u || '').slice(0, 64), a: String(x.a || '').slice(0, 60), d: String(x.d || '').slice(0, 600) })) : [];
  while (JSON.stringify(hist).length > 40000 && hist.length > 1) hist = hist.slice(1);
  return hist;
}
api.get('/items', requireAuth, requirePerm('inv.view'), (req, res) => {
  const u = req.auth.u;
  res.json(db.prepare('SELECT * FROM items').all().map(rowToItem).filter(it => canItem(u, it)));
});
api.post('/items', requireAuth, (req, res) => {
  const list = req.body && req.body.items;
  if (!Array.isArray(list) || !list.length || list.length > 1000) throw httpErr(400, 'Lista de registros no válida.');
  const u = req.auth.u, now = nowISO(), out = [];
  db.transaction(() => {
    for (const it of list) {
      if (!validItem(it)) throw httpErr(400, 'Hay un registro con formato no válido.');
      const ex = getItemStmt.get(it.id);
      if (ex && !canItem(u, rowToItem(ex))) throw httpErr(403, 'No tienes acceso a ese material.');
      if (!it.data.almacen || !almacenesOf().some(a => a.id === it.data.almacen)) it.data.almacen = (ex && JSON.parse(ex.data).almacen) || clientAlmacen(it.data.cliente) || almacenesOf()[0].id;
      if (!canItem(u, it)) throw httpErr(403, it.data.cliente ? `No tienes acceso al cliente ${it.data.cliente}.` : 'Indica un cliente al que tengas acceso.');
      if (ex ? !canAny(u, 'inv.edit', 'inv.move') : !canAny(u, 'inv.create', 'inv.move', 'inv.import'))
        throw httpErr(403, ex ? 'No tienes permiso para modificar material.' : 'No tienes permiso para dar de alta material.');
      const dataStr = JSON.stringify(it.data);
      if (dataStr.length > 60000) throw httpErr(400, 'Un registro es demasiado grande.');
      const sn = normSerial(it.data.serie);
      if (sn) {
        const dup = serialDupStmt.get(sn, it.id);
        if (dup) throw httpErr(409, `El número de serie ${it.data.serie} ya está registrado.`);
      }
      const rec = {
        id: it.id, cat: it.cat, data: it.data, history: cleanHistory(it.history),
        createdAt: ex ? ex.created_at : now, createdBy: ex ? ex.created_by : u.username, updatedAt: now, updatedBy: u.username
      };
      upsertItemStmt.run({ ...rec, sn, data: dataStr, history: JSON.stringify(rec.history) });
      out.push(rec);
    }
  })();
  emitItems(out);
  res.json(out);
});
api.post('/items/delete', requireAuth, requirePerm('inv.delete'), (req, res) => {
  const ids = req.body && req.body.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 5000 || ids.some(i => typeof i !== 'string')) throw httpErr(400, 'Lista de registros no válida.');
  const del = db.prepare('DELETE FROM items WHERE id = ?');
  for (const id of ids) { const r = getItemStmt.get(id); if (r && !canItem(req.auth.u, rowToItem(r))) throw httpErr(403, 'No tienes acceso a parte del material seleccionado.'); }
  db.transaction(() => ids.forEach(id => del.run(id)))();
  emitItems([], ids);
  res.json({ ok: true, deleted: ids.length });
});

/* --- Registro de actividad --- */
function makeRefCheck(u) {
  if (isTotal(u)) return () => true;
  const gi = db.prepare('SELECT data FROM items WHERE id = ?'), go = db.prepare('SELECT cliente FROM orders WHERE id = ?'), gd = db.prepare('SELECT cliente FROM deliveries WHERE id = ?');
  return ref => {
    try { const i = gi.get(ref); if (i) return canClient(u, JSON.parse(i.data).cliente); } catch {}
    try { const o = go.get(ref); if (o) return canClient(u, o.cliente); } catch {}
    try { const d = gd.get(ref); if (d) return canClient(u, d.cliente); } catch {}
    return false;
  };
}
api.get('/audit', requireAuth, (req, res) => {
  const u = req.auth.u;
  const visibleRef = makeRefCheck(u);
  if (can(u, 'audit.view')) {
    const since = new Date(Date.now() - 31 * 86400000).toISOString();
    const rows = db.prepare('SELECT t, u, a, d, r FROM audit WHERE t >= ? ORDER BY id DESC LIMIT 5000').all(since);
    return res.json(isTotal(u) ? rows : rows.filter(e => e.u === u.username || (e.r && visibleRef(e.r))));
  }
  if (can(u, 'inv.view')) {
    const priv = [...PRIVATE_ACTIONS].map(() => '?').join(',');
    const rows = db.prepare(`SELECT t, u, a, d, r FROM audit WHERE a NOT IN (${priv}) ORDER BY id DESC LIMIT 200`).all(...PRIVATE_ACTIONS);
    return res.json((isTotal(u) ? rows : rows.filter(e => e.u === u.username || (e.r && visibleRef(e.r)))).slice(0, 50));
  }
  res.json([]);
});
api.post('/audit', requireAuth, (req, res) => {
  const { a, d, r } = req.body || {};
  if (!CLIENT_ACTIONS.has(a)) return res.json({ ok: true, ignored: true });
  audit(req.auth.u.username, a, d, r);
  res.json({ ok: true });
});

/* --- Usuarios --- */
api.get('/users', requireAuth, requirePerm('users.manage'), requireTotal, (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY username COLLATE NOCASE').all().map(publicUser));
});
function userFields(b, current) {
  const username = String(b.username ?? current?.username ?? '').trim();
  const name = String(b.name ?? current?.name ?? '').trim().slice(0, 120);
  const email = String(b.email ?? current?.email ?? '').trim().slice(0, 160);
  const role = String(b.role ?? current?.role ?? '');
  if (!USERNAME_RE.test(username)) throw httpErr(400, 'El usuario debe tener de 3 a 32 letras, números, punto o guion.');
  if (!name) throw httpErr(400, 'Indica el nombre completo.');
  if (!settings().roles[role]) throw httpErr(400, 'El rol indicado no existe.');
  if (email && !EMAIL_RE.test(email)) throw httpErr(400, 'El correo no tiene un formato válido.');
  if (email && db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id <> ?').get(email, current ? current.id : '')) throw httpErr(409, 'Ese correo ya lo usa otra cuenta.');
  const dup = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id <> ?').get(username, current ? current.id : '');
  if (dup) throw httpErr(409, 'Ese nombre de usuario ya existe.');
  const scope = b.scope === undefined ? (current ? current.scope : JSON.stringify({ almacenes: {} })) : (role === 'admin' ? null : (cleanScope(b.scope) ? JSON.stringify(cleanScope(b.scope)) : null));
  return { username, name, email, role, scope, active: b.active === undefined ? (current ? !!current.active : true) : !!b.active, mustChange: !!b.mustChange };
}
api.post('/users', requireAuth, requirePerm('users.manage'), requireTotal, ah(async (req, res) => {
  const b = req.body || {}, f = userFields(b, null);
  const invite = !!b.invite;
  if (invite) {
    if (!mail.enabled()) throw httpErr(400, 'El envío de correo no está configurado en el servidor.');
    if (!f.email) throw httpErr(400, 'Para enviar la invitación, indica el correo del usuario.');
    f.mustChange = false;
  } else {
    const iss = pw.issues(b.password, settings().minPassword);
    if (iss.length) throw httpErr(400, 'La contraseña necesita ' + iss.join(', ') + '.');
  }
  // Con invitación se guarda una contraseña aleatoria que nadie conoce hasta que el usuario elige la suya.
  const id = newId(), hash = await pw.hash(invite ? crypto.randomBytes(24).toString('base64url') + 'aA1' : b.password);
  db.prepare(`INSERT INTO users (id, username, name, email, role, active, must_change, pw_hash, pw_changed, created_at, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, f.username, f.name, f.email, f.role, f.active ? 1 : 0, f.mustChange ? 1 : 0, hash, nowISO(), nowISO(), req.auth.u.username);
  db.prepare('UPDATE users SET scope = ? WHERE id = ?').run(f.scope, id);
  audit(req.auth.u.username, 'usuario_creado', `${f.username} (${settings().roles[f.role].name})`);
  let mailError = null;
  if (invite) {
    try { await sendPasswordLink(getUser(id), 'invite', req.ip); audit(req.auth.u.username, 'correo_enviado', `Invitación enviada a ${f.email}`); }
    catch (e) { console.error('Invitación:', e.message); mailError = 'El usuario se ha creado, pero no se ha podido enviar la invitación: ' + e.message; }
  }
  broadcast('users', {});
  res.json({ ...publicUser(getUser(id)), mailError });
}));
api.put('/users/:id', requireAuth, requirePerm('users.manage'), requireTotal, (req, res) => {
  const cur = getUser(req.params.id);
  if (!cur) throw httpErr(404, 'El usuario no existe.');
  const f = userFields(req.body || {}, cur);
  if (cur.id === req.auth.u.id && !f.active) throw httpErr(400, 'No puedes desactivar tu propia cuenta.');
  if (cur.role === 'admin' && cur.active && (f.role !== 'admin' || !f.active) && activeAdmins() <= 1) throw httpErr(400, 'Debe quedar al menos un administrador activo.');
  db.prepare('UPDATE users SET username = ?, name = ?, email = ?, role = ?, active = ?, must_change = ?, scope = ? WHERE id = ?')
    .run(f.username, f.name, f.email, f.role, f.active ? 1 : 0, f.mustChange ? 1 : 0, f.scope, cur.id);
  if (!f.active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(cur.id);
  audit(req.auth.u.username, 'usuario_editado', `${f.username} (${settings().roles[f.role].name}${f.active ? '' : ', desactivado'})`);
  broadcast('users', {});
  res.json(publicUser(getUser(cur.id)));
});
api.post('/users/:id/password', requireAuth, requirePerm('users.manage'), requireTotal, ah(async (req, res) => {
  const cur = getUser(req.params.id);
  if (!cur) throw httpErr(404, 'El usuario no existe.');
  const b = req.body || {};
  const iss = pw.issues(b.password, settings().minPassword);
  if (iss.length) throw httpErr(400, 'La contraseña necesita ' + iss.join(', ') + '.');
  const hash = await pw.hash(b.password);
  db.prepare('UPDATE users SET pw_hash = ?, must_change = ?, failed = 0, lock_until = NULL, pw_changed = ? WHERE id = ?').run(hash, b.mustChange === false ? 0 : 1, nowISO(), cur.id);
  if (cur.id !== req.auth.u.id) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(cur.id);
  revokeDevices(cur.id);
  audit(req.auth.u.username, 'password_cambiada', 'Contraseña restablecida para ' + cur.username);
  broadcast('users', {});
  res.json(publicUser(getUser(cur.id)));
}));
api.post('/users/:id/send-reset', requireAuth, requirePerm('users.manage'), requireTotal, ah(async (req, res) => {
  const cur = getUser(req.params.id);
  if (!cur) throw httpErr(404, 'El usuario no existe.');
  if (!mail.enabled()) throw httpErr(400, 'El envío de correo no está configurado en el servidor.');
  if (!cur.email) throw httpErr(400, 'Este usuario no tiene correo. Añádelo editando el usuario.');
  if (!cur.active) throw httpErr(400, 'La cuenta está desactivada.');
  const kind = cur.last_login ? 'reset' : 'invite';
  try { await sendPasswordLink(cur, kind, req.ip); }
  catch (e) { throw httpErr(502, 'No se ha podido enviar el correo: ' + e.message); }
  audit(req.auth.u.username, 'correo_enviado', `${kind === 'invite' ? 'Invitación' : 'Enlace de restablecimiento'} enviado a ${cur.username} (${cur.email})`);
  res.json({ ok: true, email: cur.email });
}));
api.get('/mail/status', requireAuth, requirePerm('settings.manage'), (req, res) => {
  res.json({ enabled: mail.enabled(), missing: mail.missing(), from: process.env.SMTP_FROM || '', host: process.env.SMTP_HOST || '', publicUrl: mail.publicUrl() });
});
api.post('/mail/test', requireAuth, requirePerm('settings.manage'), ah(async (req, res) => {
  if (!mail.enabled()) throw httpErr(400, 'Faltan variables en el .env: ' + mail.missing().join(', ') + '.');
  const u = req.auth.u;
  if (!u.email) throw httpErr(400, 'Añade tu correo en "Mi cuenta" para recibir la prueba.');
  try {
    await mail.send(u.email, `Prueba de correo · Almacén ${company()}`, mail.layout(company(), 'El correo funciona', [
      `Este es un correo de prueba enviado desde ${mail.esc(mail.publicUrl())}.`, 'Los enlaces de restablecimiento e invitación se enviarán desde esta misma cuenta.'
    ]));
  } catch (e) { throw httpErr(502, 'No se ha podido enviar: ' + e.message); }
  res.json({ ok: true, email: u.email });
}));
api.post('/users/:id/mfa/reset', requireAuth, requirePerm('users.manage'), requireTotal, (req, res) => {
  const cur = getUser(req.params.id);
  if (!cur) throw httpErr(404, 'El usuario no existe.');
  db.prepare('UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_enabled = 0, totp_last = 0, recovery_codes = NULL WHERE id = ?').run(cur.id);
  revokeDevices(cur.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(cur.id);
  audit(req.auth.u.username, 'mfa_desactivado', `Verificación en dos pasos quitada a ${cur.username} por un administrador`);
  broadcast('users', {});
  res.json(publicUser(getUser(cur.id)));
});
api.post('/users/:id/unlock', requireAuth, requirePerm('users.manage'), requireTotal, (req, res) => {
  const cur = getUser(req.params.id);
  if (!cur) throw httpErr(404, 'El usuario no existe.');
  db.prepare('UPDATE users SET failed = 0, lock_until = NULL WHERE id = ?').run(cur.id);
  audit(req.auth.u.username, 'usuario_editado', 'Desbloqueado ' + cur.username);
  broadcast('users', {});
  res.json(publicUser(getUser(cur.id)));
});
api.delete('/users/:id', requireAuth, requirePerm('users.manage'), requireTotal, (req, res) => {
  const cur = getUser(req.params.id);
  if (!cur) throw httpErr(404, 'El usuario no existe.');
  if (cur.id === req.auth.u.id) throw httpErr(400, 'No puedes eliminar tu propia cuenta.');
  if (cur.role === 'admin' && cur.active && activeAdmins() <= 1) throw httpErr(400, 'Debe quedar al menos un administrador activo.');
  db.prepare('DELETE FROM users WHERE id = ?').run(cur.id);
  audit(req.auth.u.username, 'usuario_eliminado', cur.username);
  broadcast('users', {});
  res.json({ ok: true });
});

/* --- Copias de seguridad --- */
api.get('/backup', requireAuth, requirePerm('settings.manage'), requireTotal, (req, res) => {
  const withUsers = req.query.users === '1';
  if (withUsers && !can(req.auth.u, 'users.manage')) throw httpErr(403, 'Solo quien gestiona usuarios puede exportarlos.');
  const data = {
    app: 'laberit-almacen', v: 2, exportedAt: nowISO(), exportedBy: req.auth.u.username,
    settings: storedSettings(),
    items: db.prepare('SELECT * FROM items').all().map(rowToItem)
  };
  if (withUsers) data.users = db.prepare('SELECT * FROM users').all().map(u => ({ ...publicUser(u), pwHash: u.pw_hash }));
  audit(req.auth.u.username, 'exportacion', `Copia de seguridad completa${withUsers ? ' con usuarios' : ''} (${data.items.length} registros)`);
  res.json(data);
});
api.post('/restore', requireAuth, requirePerm('settings.manage'), requireTotal, (req, res) => {
  const b = req.body || {};
  if (b.app !== 'laberit-almacen' || !Array.isArray(b.items)) throw httpErr(400, 'El archivo no es una copia de este almacén.');
  const users = Array.isArray(b.users) ? b.users.filter(u => u && u.id && u.username && typeof u.pwHash === 'string' && u.pwHash.startsWith('scrypt$')) : [];
  if (users.length && !can(req.auth.u, 'users.manage')) throw httpErr(403, 'Solo quien gestiona usuarios puede restaurarlos.');
  let items = 0, skipped = 0, nUsers = 0;
  db.transaction(() => {
    if (isObj(b.settings) && Array.isArray(b.settings.categories)) saveSettings(sanitizeSettings(b.settings));
    for (const it of b.items) {
      if (!validItem(it)) { skipped++; continue; }
      const sn = normSerial(it.data.serie);
      if (sn && serialDupStmt.get(sn, it.id)) { skipped++; continue; }
      upsertItemStmt.run({
        id: it.id, cat: it.cat, sn, data: JSON.stringify(it.data), history: JSON.stringify(cleanHistory(it.history)),
        createdAt: it.createdAt || nowISO(), createdBy: it.createdBy || req.auth.u.username, updatedAt: it.updatedAt || nowISO(), updatedBy: it.updatedBy || req.auth.u.username
      });
      items++;
    }
    for (const u of users) {
      if (!USERNAME_RE.test(u.username)) continue;
      const clash = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id <> ?').get(u.username, u.id);
      if (clash) continue;
      db.prepare(`INSERT INTO users (id, username, name, email, role, active, must_change, pw_hash, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET username = excluded.username, name = excluded.name, email = excluded.email, role = excluded.role,
          active = excluded.active, must_change = excluded.must_change, pw_hash = excluded.pw_hash`)
        .run(u.id, u.username, u.name || '', u.email || '', settings().roles[u.role] ? u.role : 'lector', u.active ? 1 : 0, u.mustChange ? 1 : 0, u.pwHash, u.createdAt || nowISO(), u.createdBy || '');
      nUsers++;
    }
  })();
  audit(req.auth.u.username, 'restauracion', `Copia del ${b.exportedAt || '?'}: ${items} registros${skipped ? `, ${skipped} omitidos` : ''}${nUsers ? `, ${nUsers} usuarios` : ''}`);
  broadcast('reload', {});
  res.json({ items, skipped, users: nUsers });
});

const upsertItem = (it, username) => {
  const now = nowISO();
  it.updatedAt = now; it.updatedBy = username;
  if (!it.createdAt) { it.createdAt = now; it.createdBy = username; }
  it.history = cleanHistory(it.history);
  upsertItemStmt.run({ id: it.id, cat: it.cat, sn: normSerial(it.data.serie), data: JSON.stringify(it.data), history: JSON.stringify(it.history), createdAt: it.createdAt, createdBy: it.createdBy, updatedAt: it.updatedAt, updatedBy: it.updatedBy });
};
const alerts = setupAlerts({ db, settings, audit, rowToItem, estados, clientAlmacen, itemAlm });
onItemsChanged = alerts.schedule;
api.get('/stock-alerts', requireAuth, requirePerm('inv.view'), (req, res) => res.json(alerts.compute().map(x => ({ id: x.rule.id, name: x.rule.name, min: x.rule.min, count: x.count }))));
api.post('/stock-alerts/test', requireAuth, requirePerm('settings.manage'), ah(async (req, res) => {
  db.prepare('DELETE FROM alert_state').run();
  await alerts.check();
  res.json({ ok: true, low: alerts.compute().filter(x => x.count < x.rule.min).map(x => x.rule.name) });
}));
registerOrders(api, { db, requireAuth, requirePerm, ah, httpErr, audit, settings, can, newId, nowISO, normSerial, broadcast, rowToItem, upsertItem, emitItems, canClient, canItem, isTotal, estados, allLocations, itemAlm, almacenesOf });

api.use((req, res) => res.status(404).json({ error: 'No encontrado.' }));
api.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'El envío es demasiado grande.' });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido.' });
  sendErr(res, err);
});
app.use('/api', api);

// Página principal con el título y el icono de Ajustes → General (se ven en la pestaña del navegador).
const INDEX_FILE = path.join(__dirname, 'public', 'index.html');
function webCfg() { const w = settings().web || {}; return { titulo: w.titulo || `Almacén ${settings().company || 'Laberit'}`, favicon: w.favicon || '' }; }
const favHash = f => f ? crypto.createHash('sha1').update(f).digest('hex').slice(0, 10) : '';
app.get(['/', '/index.html'], (req, res, next) => {
  fs.readFile(INDEX_FILE, 'utf8', (err, html) => {
    if (err) return next();
    const w = webCfg(), esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const type = (w.favicon.match(/^data:([^;]+);/) || [])[1] || 'image/svg+xml';
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(w.titulo)}</title>`)
      .replace(/<link rel="icon"[^>]*>/, w.favicon ? `<link rel="icon" href="favicon-propio?v=${favHash(w.favicon)}" type="${type}">` : '<link rel="icon" href="favicon.svg" type="image/svg+xml">');
    res.setHeader('Cache-Control', 'no-cache'); res.type('html').send(html);
  });
});
app.get('/favicon-propio', (req, res) => {
  const f = webCfg().favicon; if (!f) return res.redirect('favicon.svg');
  const m = /^data:([^;]+);base64,(.+)$/.exec(f); if (!m) return res.redirect('favicon.svg');
  res.setHeader('Cache-Control', 'public, max-age=604800'); res.type(m[1]).send(Buffer.from(m[2], 'base64'));
});
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  setHeaders(res, file) { if (/\.(html|js|css)$/.test(file)) res.setHeader('Cache-Control', 'no-cache'); }
}));

/* ---------------- Mantenimiento ---------------- */
function housekeeping() {
  try {
    const idle = (settings().sessionMinutes || 30) * 60000, now = Date.now();
    db.prepare('DELETE FROM sessions WHERE last_seen < ? OR created_at < ?').run(now - idle, now - CFG.maxSessionHours * 3600000);
    db.prepare('DELETE FROM password_tokens WHERE expires_at < ? OR used_at IS NOT NULL').run(now - 86400000);
    db.prepare('DELETE FROM audit WHERE t < ?').run(new Date(now - CFG.auditDays * 86400000).toISOString());
    for (const [ip, r] of ipFails) if (r.until < now) ipFails.delete(ip);
    for (const [ip, r] of forgotIp) if (r.until < now) forgotIp.delete(ip);
    for (const [k, c] of mfaChallenges) if (c.exp < now) mfaChallenges.delete(k);
    db.prepare('DELETE FROM trusted_devices WHERE expires_at < ?').run(now);
  } catch (e) { console.error('Mantenimiento:', e.message); }
}
setInterval(housekeeping, 15 * 60000).unref();
housekeeping();

/* ---------------- Arranque ---------------- */
let server, proto = 'http';
if (CFG.tlsPfx) {
  server = https.createServer({ pfx: fs.readFileSync(path.resolve(__dirname, CFG.tlsPfx)), passphrase: CFG.tlsPass }, app); proto = 'https';
} else if (CFG.tlsCert && CFG.tlsKey) {
  server = https.createServer({ cert: fs.readFileSync(path.resolve(__dirname, CFG.tlsCert)), key: fs.readFileSync(path.resolve(__dirname, CFG.tlsKey)) }, app); proto = 'https';
} else {
  server = http.createServer(app);
}
(function migrarAlmacenes() {
  const st = storedSettings();
  if (st && st.lists && Array.isArray(st.lists.estados)) {
    const E = estados(); let ch = false;
    [E.transito, E.retirado].forEach(v => { if (!st.lists.estados.includes(v)) { st.lists.estados.push(v); ch = true; } });
    // Clientes que se borraron de la lista pero se quedaron asignados a un almacén.
    if (Array.isArray(st.lists.clientes) && Array.isArray(st.almacenes)) { const cl = new Set(st.lists.clientes); st.almacenes.forEach(a => { const n = (a.clientes || []).length; a.clientes = (a.clientes || []).filter(c => cl.has(c)); if (a.clientes.length !== n) ch = true; }); }
    if (ch) saveSettings(st);
  }
  const rows = db.prepare('SELECT id, data FROM items').all(); let n = 0;
  const up = db.prepare('UPDATE items SET data = ? WHERE id = ?');
  db.transaction(() => rows.forEach(r => { const d = JSON.parse(r.data); if (!d.almacen) { const a = clientAlmacen(d.cliente) || (almacenesOf()[0] || {}).id; if (a) { d.almacen = a; up.run(JSON.stringify(d), r.id); n++; } } }))();
  if (n) console.log(`Migración: almacén asignado a ${n} registros.`);
})();
mail.setAccent((settings().tema || {}).primario);
server.listen(CFG.port, CFG.host, () => {
  console.log(`Almacén Laberit escuchando en ${proto}://${CFG.host === '0.0.0.0' ? 'localhost' : CFG.host}:${CFG.port}`);
  console.log(`Base de datos: ${path.join(CFG.dataDir, 'almacen.db')}`);
  if (countUsers() === 0) console.log(`Sin usuarios todavía: abre la web para crear el administrador${CFG.setupToken ? ' (te pedirá SETUP_TOKEN)' : ''}, o usa "npm run admin -- create-admin <usuario> \"<Nombre>\"".`);
  console.log(mail.enabled() ? `Correo: activo (${process.env.SMTP_HOST}), enlaces a ${mail.publicUrl()}` : `Correo: desactivado (falta ${mail.missing().join(', ')} en .env)`);
  if (proto === 'http' && CFG.cookieSecure === 'auto' && !CFG.trustProxy) console.log('Aviso: sirviendo por HTTP. En producción usa HTTPS (certificado propio o proxy inverso).');
});
function shutdown() {
  console.log('Cerrando…');
  for (const c of clients) c.res.end();
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => { db.close(); process.exit(0); }, 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
