'use strict';
/*
 * Avisos de stock bajo por correo.
 * Cada regla (Ajustes → Avisos de stock) define un grupo de material (categoría y condiciones,
 * por ejemplo "Equipos, tipo = Portátil") y un mínimo. Cuando el stock disponible baja del mínimo
 * se envía un correo; no se repite hasta que se recupera, salvo el recordatorio cada X días.
 */
const mail = require('./mail');

module.exports = function setupAlerts({ db, settings, audit, rowToItem, estados, clientAlmacen }) {
  db.exec('CREATE TABLE IF NOT EXISTS alert_state (id TEXT PRIMARY KEY, low INTEGER NOT NULL DEFAULT 0, last_sent INTEGER, last_count INTEGER)');
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  function compute() {
    const s = settings();
    const cats = s.categories || [];
    const items = db.prepare('SELECT * FROM items').all().map(rowToItem);
    return (s.stockRules || []).filter(r => r.active !== false && r.cat).map(r => {
      const c = cats.find(x => x.id === r.cat);
      const serialized = c ? c.serialized !== false : true;
      const st = estados().stock;
      const matching = items.filter(it => it.cat === r.cat && st.includes(it.data.estado) && !it.data.pedido && (!r.almacen || clientAlmacen(it.data.cliente) === r.almacen) && (r.conds || []).every(k => !k.v || norm(it.data[k.k]) === norm(k.v)));
      const count = matching.reduce((a, it) => a + (serialized ? 1 : Math.max(0, Number(it.data.cantidad) || 0)), 0);
      const byModel = {};
      matching.forEach(it => { const m = [it.data.marca, it.data.modelo].filter(Boolean).join(' ') || it.data.tipo || '—'; byModel[m] = (byModel[m] || 0) + (serialized ? 1 : Math.max(0, Number(it.data.cantidad) || 0)); });
      return { rule: r, catName: c ? c.name : r.cat, count, byModel };
    });
  }

  let running = false;
  async function check() {
    if (running) return; running = true;
    try {
      const s = settings(), now = Date.now(), remind = (s.stockRemindDays || 0) * 86400000;
      for (const x of compute()) {
        const st = db.prepare('SELECT * FROM alert_state WHERE id = ?').get(x.rule.id) || { low: 0, last_sent: null };
        const low = x.count < x.rule.min;
        if (!low) { if (st.low) db.prepare('INSERT INTO alert_state (id, low, last_sent, last_count) VALUES (?, 0, ?, ?) ON CONFLICT(id) DO UPDATE SET low = 0, last_count = excluded.last_count').run(x.rule.id, st.last_sent, x.count); continue; }
        const due = !st.low || (remind > 0 && st.last_sent && now - st.last_sent >= remind);
        const to = (x.rule.emails && x.rule.emails.length ? x.rule.emails : s.stockAlertEmails) || [];
        if (!due) continue;
        let sent = false;
        if (to.length && mail.enabled()) {
          const esc = mail.esc;
          const models = Object.entries(x.byModel).sort((a, b) => b[1] - a[1]);
          const extra = models.length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin:6px 0">${models.map(([m, n]) => `<tr><td style="padding:4px 18px 4px 0;border-bottom:1px solid #E4E4E7">${esc(m)}</td><td style="text-align:right;font-weight:bold;border-bottom:1px solid #E4E4E7">${n}</td></tr>`).join('')}</table>` : '';
          const body = mail.layout(s.company || 'Laberit', `Stock bajo: ${x.rule.name}`, [
            `Quedan <b>${x.count}</b> ${x.count === 1 ? 'unidad disponible' : 'unidades disponibles'} de <b>${esc(x.rule.name)}</b> (${esc(x.catName)}${(x.rule.conds || []).filter(c => c.v).map(c => ', ' + esc(c.v)).join('')}). El mínimo configurado es <b>${x.rule.min}</b>.`,
            models.length ? 'Stock disponible por modelo:' : 'No queda ninguna unidad en stock.'
          ], mail.publicUrl() ? { label: 'Abrir el almacén', url: mail.publicUrl() } : null,
          remind ? `Si no se repone, se volverá a avisar cada ${s.stockRemindDays} días.` : '', extra,
          models.map(([m, n]) => `${m}: ${n}`).join('\n'));
          try { await mail.send(to.join(', '), `Stock bajo: ${x.rule.name} (${x.count}/${x.rule.min})`, body); sent = true; }
          catch (e) { console.error('Aviso de stock:', e.message); }
        }
        db.prepare('INSERT INTO alert_state (id, low, last_sent, last_count) VALUES (?, 1, ?, ?) ON CONFLICT(id) DO UPDATE SET low = 1, last_sent = excluded.last_sent, last_count = excluded.last_count')
          .run(x.rule.id, sent ? now : (st.low ? st.last_sent : null), x.count);
        if (sent) audit('sistema', 'aviso_stock', `Stock bajo de ${x.rule.name}: ${x.count} (mínimo ${x.rule.min}). Aviso enviado a ${to.join(', ')}`);
      }
    } finally { running = false; }
  }
  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => check().catch(e => console.error('Avisos:', e.message)), 15000); timer.unref && timer.unref(); };
  setInterval(() => check().catch(e => console.error('Avisos:', e.message)), 3600000).unref();
  setTimeout(() => check().catch(() => {}), 20000).unref();
  return { schedule, check, compute };
};
