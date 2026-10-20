'use strict';
/*
 * Herramienta de administración por consola.
 *   npm run admin -- list
 *   npm run admin -- create-admin <usuario> "<Nombre completo>"
 *   npm run admin -- reset <usuario> [nuevaContraseña]
 *   npm run admin -- unlock <usuario>
 *   npm run admin -- set-email <usuario> <correo>
 *   npm run admin -- mfa-reset <usuario>      (quita la verificación en dos pasos si ha perdido el móvil)
 * Si no indicas contraseña se genera una aleatoria. El usuario tendrá que cambiarla al entrar.
 */
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
require('../lib/env')(root);
const { openDb } = require('../lib/db');
const pw = require('../lib/password');
const db = openDb(path.resolve(root, process.env.DATA_DIR || 'data'));

const [cmd, a1, a2] = process.argv.slice(2);
const randomPw = () => { const base = crypto.randomBytes(12).toString('base64url'); return 'Lb' + base.slice(0, 12) + Math.floor(Math.random() * 90 + 10); };
const findUser = u => db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(u || '');
const audit = (a, d) => db.prepare('INSERT INTO audit (t, u, a, d, r) VALUES (?, ?, ?, ?, ?)').run(new Date().toISOString(), 'consola', a, d, '');

(async () => {
  if (cmd === 'list') {
    const rows = db.prepare('SELECT username, name, role, active, must_change, lock_until, last_login FROM users ORDER BY username').all();
    if (!rows.length) console.log('No hay usuarios.');
    rows.forEach(r => console.log(`${r.username.padEnd(20)} ${String(r.role).padEnd(12)} ${r.active ? 'activo' : 'DESACTIVADO'}${r.lock_until && new Date(r.lock_until) > new Date() ? ' BLOQUEADO' : ''}${r.must_change ? ' (debe cambiar contraseña)' : ''}  ${r.name || ''}`));
  } else if (cmd === 'create-admin') {
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(a1 || '')) throw new Error('Uso: create-admin <usuario> "<Nombre>"  (usuario de 3 a 32 letras, números, punto o guion)');
    if (findUser(a1)) throw new Error(`El usuario ${a1} ya existe. Usa "reset" para cambiar su contraseña.`);
    const pass = randomPw(); const now = new Date().toISOString();
    const id = Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
    db.prepare(`INSERT INTO users (id, username, name, email, role, active, must_change, pw_hash, pw_changed, created_at, created_by)
                VALUES (?, ?, ?, '', 'admin', 1, 1, ?, ?, ?, 'consola')`).run(id, a1, a2 || a1, await pw.hash(pass), now, now);
    audit('usuario_creado', 'Administrador creado por consola: ' + a1);
    console.log(`Administrador creado.\n  Usuario:    ${a1}\n  Contraseña: ${pass}\nTendrá que cambiarla en el primer acceso.`);
  } else if (cmd === 'reset') {
    const u = findUser(a1); if (!u) throw new Error('Uso: reset <usuario> [contraseña]. Ese usuario no existe.');
    const pass = a2 || randomPw();
    db.prepare('UPDATE users SET pw_hash = ?, must_change = 1, failed = 0, lock_until = NULL, active = 1, pw_changed = ? WHERE id = ?').run(await pw.hash(pass), new Date().toISOString(), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
    audit('password_cambiada', 'Contraseña restablecida por consola para ' + u.username);
    console.log(`Contraseña restablecida para ${u.username}.\n  Contraseña temporal: ${pass}\nTendrá que cambiarla al entrar. Sus sesiones abiertas se han cerrado.`);
  } else if (cmd === 'unlock') {
    const u = findUser(a1); if (!u) throw new Error('Uso: unlock <usuario>. Ese usuario no existe.');
    db.prepare('UPDATE users SET failed = 0, lock_until = NULL WHERE id = ?').run(u.id);
    audit('usuario_editado', 'Desbloqueado por consola ' + u.username);
    console.log(`Usuario ${u.username} desbloqueado.`);
  } else if (cmd === 'mfa-reset') {
    const u = findUser(a1); if (!u) throw new Error('Uso: mfa-reset <usuario>. Ese usuario no existe.');
    db.prepare('UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_enabled = 0, totp_last = 0, recovery_codes = NULL WHERE id = ?').run(u.id);
    try { db.prepare('DELETE FROM trusted_devices WHERE user_id = ?').run(u.id); } catch {}
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
    audit('mfa_desactivado', 'Verificación en dos pasos quitada por consola a ' + u.username);
    console.log(`Verificación en dos pasos desactivada para ${u.username}. Podrá volver a activarla desde "Mi cuenta".`);
  } else if (cmd === 'set-email') {
    const u = findUser(a1); if (!u || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a2 || '')) throw new Error('Uso: set-email <usuario> <correo>');
    if (db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id <> ?').get(a2, u.id)) throw new Error('Ese correo ya lo usa otra cuenta.');
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(a2, u.id);
    audit('usuario_editado', `Correo de ${u.username} cambiado por consola a ${a2}`);
    console.log(`Correo de ${u.username}: ${a2}`);
  } else {
    console.log('Comandos:\n  list\n  create-admin <usuario> "<Nombre>"\n  reset <usuario> [contraseña]\n  unlock <usuario>\n  set-email <usuario> <correo>\n  mfa-reset <usuario>');
  }
  db.close();
})().catch(e => { console.error('Error: ' + e.message); db.close(); process.exit(1); });
