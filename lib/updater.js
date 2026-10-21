'use strict';
/*
 * Actualizaciones desde la interfaz (solo en la versión para clientes).
 * El proveedor publica en una carpeta web: latest.json y el paquete almacen-X.Y.Z.tar.gz.
 * latest.json va firmado con la misma clave que las licencias: si el paquete o el archivo
 * se manipulan, no se instala.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');

module.exports = function setupUpdater({ root, dataDir, port, tls }) {
  let build = {}; try { build = require('./build-info.json'); } catch {}
  let pub = null; try { pub = crypto.createPublicKey(fs.readFileSync(path.join(__dirname, 'licencia-publica.pem'))); } catch {}
  const base = String(process.env.UPDATE_URL || build.updateUrl || '').replace(/\/?$/, '/');
  const enabled = !!(build.enforce && base !== '/');
  const canSelf = process.platform === 'linux' && (!!process.env.INVOCATION_ID || process.env.ALLOW_SELF_UPDATE === '1');
  const flagFile = path.join(dataDir, 'actualizacion.json');
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  let cache = null, cacheAt = 0, busy = false;

  async function fetchJSON(url) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try { const r = await fetch(url, { signal: ctl.signal, headers: { 'Cache-Control': 'no-cache' } }); if (!r.ok) throw new Error(`El servidor de actualizaciones respondió ${r.status}.`); return await r.json(); }
    catch (e) { throw new Error(e.name === 'AbortError' ? 'El servidor de actualizaciones no responde.' : e.message); } finally { clearTimeout(t); }
  }
  function verify(m) {
    if (!pub) throw new Error('Esta instalación no tiene clave para verificar actualizaciones.');
    if (!m || !m.version || !m.archivo || !m.sha256 || !m.firma) throw new Error('La información de la versión no es válida.');
    const ok = crypto.verify(null, Buffer.from(`${m.archivo}\n${m.version}\n${m.sha256}`), pub, Buffer.from(m.firma, 'base64url'));
    if (!ok) throw new Error('La firma de la actualización no es válida: no se instalará.');
  }
  async function check(force) {
    if (!enabled) return { enabled: false, actual: build.version || '' };
    if (cache && !force && Date.now() - cacheAt < 6 * 3600000) return cache;
    const m = await fetchJSON(base + 'latest.json'); verify(m);
    const nueva = cmp(m.version, build.version) > 0;
    cache = { enabled: true, actual: build.version, fechaActual: build.fecha, nueva, version: m.version, fecha: m.fecha || '', notas: m.notas || '', node: m.node || '',
      nodeOk: !m.node || m.node === process.version, nodeActual: process.version, autoActualizable: canSelf, comprobado: new Date().toISOString() };
    cacheAt = Date.now(); return cache;
  }
  async function apply(user) {
    if (busy) throw new Error('Ya hay una actualización en curso.');
    if (!canSelf) throw new Error('Esta instalación no se puede actualizar desde la web. Usa scripts/actualizar-version.sh en el servidor.');
    const m = await fetchJSON(base + 'latest.json'); verify(m);
    if (cmp(m.version, build.version) <= 0) throw new Error('Ya tienes la última versión.');
    if (m.node && m.node !== process.version) throw new Error(`La versión ${m.version} necesita Node ${m.node} y el servidor tiene ${process.version}.`);
    busy = true;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 300000);
      const r = await fetch(new URL(m.archivo, base).href, { signal: ctl.signal }); clearTimeout(t);
      if (!r.ok) throw new Error(`No se ha podido descargar la versión (${r.status}).`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (crypto.createHash('sha256').update(buf).digest('hex') !== m.sha256) throw new Error('El paquete descargado no coincide con el publicado: no se instalará.');
      const dir = path.join(root, 'backups'); fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `paquete-${m.version}.tar.gz`); fs.writeFileSync(file, buf);
      const log = fs.openSync(path.join(dir, `actualizacion-${m.version}.log`), 'a');
      const child = spawn('bash', [path.join(root, 'scripts', 'actualizar-version.sh'), file], { cwd: root, detached: true, stdio: ['ignore', log, log],
        env: { ...process.env, APP_PID: String(process.pid), APP_PORT: String(port), APP_TLS: tls ? '1' : '', APP_USER: user || '' } });
      child.unref();
      return { ok: true, version: m.version };
    } catch (e) { busy = false; throw e; }
  }
  function lastResult() { try { return JSON.parse(fs.readFileSync(flagFile, 'utf8')); } catch { return null; } }
  // Al arrancar: si venimos de una actualización, se marca como correcta.
  function markStarted(onDone) {
    const u = lastResult(); if (!u || !u.pendiente) return;
    const ok = u.hacia === build.version;
    fs.writeFileSync(flagFile, JSON.stringify({ ...u, pendiente: false, resultado: ok ? 'ok' : 'revertida', terminada: new Date().toISOString() }, null, 2));
    if (onDone) onDone(ok, u);
  }
  return { enabled, check, apply, lastResult, markStarted, version: build.version || '', canSelf };
};
