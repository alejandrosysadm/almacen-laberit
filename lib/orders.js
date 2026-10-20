'use strict';
/*
 * Pedidos (reserva de stock, recogida y envío) y albaranes de entrega.
 * Todas las operaciones que tocan el inventario se hacen en una transacción en el servidor.
 */
const pdf = require('./pdf');
const mail = require('./mail');

module.exports = function registerOrders(api, ctx) {
  const { db, requireAuth, requirePerm, ah, httpErr, audit, settings, can, newId, nowISO, normSerial, broadcast, rowToItem, upsertItem, canClient, canItem, isTotal, estados, allLocations, itemAlm, almacenesOf } = ctx;
  const isStock = e => estados().stock.includes(e);

  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (k TEXT PRIMARY KEY, v INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, cliente TEXT, sede TEXT, status TEXT NOT NULL,
      lines TEXT NOT NULL, alloc TEXT NOT NULL DEFAULT '[]', notes TEXT, due_date TEXT, delivery_id TEXT,
      created_at TEXT, created_by TEXT, updated_at TEXT, updated_by TEXT, shipped_at TEXT
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, date TEXT NOT NULL, cliente TEXT, sede TEXT,
      carrier TEXT, ref TEXT, notes TEXT, order_id TEXT, order_number TEXT, lines TEXT NOT NULL,
      created_at TEXT, created_by TEXT, created_by_name TEXT
    );
    CREATE INDEX IF NOT EXISTS deliveries_date ON deliveries(date);
  `);
  { const cols = db.prepare('PRAGMA table_info(deliveries)').all().map(c => c.name);
    if (!cols.includes('emailed_to')) db.exec('ALTER TABLE deliveries ADD COLUMN emailed_to TEXT');
    if (!cols.includes('emailed_at')) db.exec('ALTER TABLE deliveries ADD COLUMN emailed_at TEXT');
    ['kind', 'origen', 'destino', 'received_at', 'received_by'].forEach(c => { if (!cols.includes(c)) db.exec(`ALTER TABLE deliveries ADD COLUMN ${c} TEXT`); }); }
  { const cols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name); if (!cols.includes('almacen')) db.exec('ALTER TABLE orders ADD COLUMN almacen TEXT'); }

  /* ---------- utilidades ---------- */
  const u0 = req => req.auth.u;
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
  const catOf = id => (settings().categories || []).find(c => c.id === id);
  const isSerialized = id => { const c = catOf(id); return c ? c.serialized !== false : true; };
  const qtyOf = it => isSerialized(it.cat) ? 1 : Math.max(0, Number(it.data.cantidad) || 0);
  const titleOf = it => [it.data.marca, it.data.modelo].filter(Boolean).join(' ') || it.data.tipo || (catOf(it.cat) || {}).name || it.cat;
  const allItems = () => db.prepare('SELECT * FROM items').all().map(rowToItem);
  const getItem = id => { const r = db.prepare('SELECT * FROM items WHERE id = ?').get(id); return r ? rowToItem(r) : null; };
  const delItem = id => db.prepare('DELETE FROM items WHERE id = ?').run(id);
  const hist = (it, user, a, d) => { it.history = (it.history || []).slice(-39); it.history.push({ t: nowISO(), u: user, a, d }); };
  // Numeración configurable (Ajustes → Clientes y albaranes): prefijo, año y dígitos.
  function nextNumber(kind) {
    const N = settings().numeracion || {};
    const prefix = ({ ALB: N.albaran, PED: N.pedido, TRA: N.traspaso, RET: N.retirada, CERT: N.certificado })[kind] || kind;
    const k = N.anual === false ? prefix : `${prefix}-${new Date().getFullYear()}`;
    const digits = Math.min(8, Math.max(3, Number(N.digitos) || 4));
    const table = kind === 'PED' ? 'orders' : 'deliveries';
    for (let i = 0; i < 1000; i++) {
      db.prepare('INSERT INTO counters (k, v) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET v = v + 1').run(k);
      const num = `${k}-${String(db.prepare('SELECT v FROM counters WHERE k = ?').get(k).v).padStart(digits, '0')}`;
      if (!db.prepare(`SELECT 1 FROM ${table} WHERE number = ?`).get(num)) return num;
    }
    throw httpErr(500, 'No se ha podido generar el número.');
  }
  function sedeFrom(body) {
    const s = settings();
    if (body.sedeId) {
      const found = (s.sedes || []).find(x => x.id === body.sedeId);
      if (found) return { id: found.id, nombre: found.nombre || '', direccion: found.direccion || '', cp: found.cp || '', ciudad: found.ciudad || '', pais: found.pais || '', contacto: found.contacto || '', telefono: found.telefono || '', email: found.email || '' };
    }
    const m = body.sede && typeof body.sede === 'object' ? body.sede : {};
    return { id: '', nombre: str(m.nombre, 120), direccion: str(m.direccion, 200), cp: str(m.cp, 20), ciudad: str(m.ciudad, 80), pais: str(m.pais, 60), contacto: str(m.contacto, 120), telefono: str(m.telefono, 40) };
  }
  function lineMatches(it, line, cliente) {
    if (it.cat !== line.cat) return false;
    if (cliente && it.data.cliente && it.data.cliente !== cliente) return false;
    return Object.entries(line.f || {}).every(([k, v]) => v === '' || v == null || norm(it.data[k]) === norm(v));
  }
  const lineText = l => { const c = catOf(l.cat); const f = Object.values(l.f || {}).filter(Boolean).join(' '); return `${c ? c.name : l.cat}${f ? ': ' + f : ''}`; };
  const rowToOrder = r => ({
    id: r.id, number: r.number, cliente: r.cliente, sede: JSON.parse(r.sede || '{}'), status: r.status,
    lines: JSON.parse(r.lines || '[]'), alloc: JSON.parse(r.alloc || '[]'), notes: r.notes || '', dueDate: r.due_date || '',
    almacen: r.almacen || '', deliveryId: r.delivery_id || null, createdAt: r.created_at, createdBy: r.created_by, updatedAt: r.updated_at, updatedBy: r.updated_by, shippedAt: r.shipped_at
  });
  const getOrder = (id, u) => { const r = db.prepare('SELECT * FROM orders WHERE id = ?').get(id); if (!r) throw httpErr(404, 'El pedido no existe.'); const o = rowToOrder(r); if (u && !canClient(u, o.cliente)) throw httpErr(404, 'El pedido no existe.'); return o; };
  function saveOrder(o, user) {
    o.updatedAt = nowISO(); o.updatedBy = user;
    db.prepare(`INSERT INTO orders (id, number, cliente, sede, status, lines, alloc, notes, due_date, delivery_id, created_at, created_by, updated_at, updated_by, shipped_at, almacen)
      VALUES (@id, @number, @cliente, @sede, @status, @lines, @alloc, @notes, @dueDate, @deliveryId, @createdAt, @createdBy, @updatedAt, @updatedBy, @shippedAt, @almacen)
      ON CONFLICT(id) DO UPDATE SET cliente = excluded.cliente, sede = excluded.sede, status = excluded.status, lines = excluded.lines, alloc = excluded.alloc,
        notes = excluded.notes, due_date = excluded.due_date, delivery_id = excluded.delivery_id, updated_at = excluded.updated_at, updated_by = excluded.updated_by, shipped_at = excluded.shipped_at, almacen = excluded.almacen`)
      .run({ ...o, sede: JSON.stringify(o.sede || {}), lines: JSON.stringify(o.lines), alloc: JSON.stringify(o.alloc), deliveryId: o.deliveryId || null, shippedAt: o.shippedAt || null, almacen: o.almacen || '' });
  }
  function withItems(o) {
    // Añade al pedido los datos actuales de cada unidad reservada (para la pantalla de recogida).
    const items = o.alloc.map(a => { const it = getItem(a.itemId); return it ? { ...a, serie: it.data.serie || '', title: titleOf(it), cat: it.cat, ubicacion: it.data.ubicacion || '', nivel: it.data.nivel || '', hueco: it.data.hueco || '', estado: it.data.estado } : { ...a, missing: true }; });
    const lines = o.lines.map((l, i) => ({ ...l, text: lineText(l), reserved: o.alloc.filter(a => a.line === i).reduce((s, a) => s + a.qty, 0), picked: o.alloc.filter(a => a.line === i && a.picked).reduce((s, a) => s + a.qty, 0) }));
    return { ...o, lines, items };
  }
  const emitItems = (upsert, del) => ctx.emitItems(upsert, del);
  const emitOrders = () => broadcast('orders', {}, u => can(u, 'inv.view'));
  const emitDeliveries = () => broadcast('deliveries', {}, u => can(u, 'inv.view'));

  // Devuelve a stock una unidad reservada; si era un lote, la vuelve a juntar con su lote de origen.
  function releaseItem(it, o, user, changed, deleted, reason) {
    if (!it || it.data.estado !== estados().reservado || it.data.pedido !== o.number) return;
    it.data.estado = it.data.estado_previo && isStock(it.data.estado_previo) ? it.data.estado_previo : estados().stock[0]; delete it.data.pedido; delete it.data.estado_previo;
    if (!isSerialized(it.cat)) {
      const keys = ['tipo', 'marca', 'modelo', 'cliente', 'pais', 'condicion', 'ubicacion', 'nivel'];
      const target = allItems().find(x => x.id !== it.id && x.cat === it.cat && isStock(x.data.estado) && !x.data.pedido && !deleted.includes(x.id) && keys.every(k => String(x.data[k] ?? '') === String(it.data[k] ?? '')));
      if (target) {
        const t = changed.find(c => c.id === target.id) || target;
        t.data.cantidad = (Number(t.data.cantidad) || 0) + qtyOf(it);
        hist(t, user, 'Devolución a stock', `+${qtyOf(it)} uds. del pedido ${o.number}`);
        if (!changed.includes(t)) changed.push(t);
        delItem(it.id); deleted.push(it.id);
        return;
      }
    }
    hist(it, user, 'Reserva liberada', reason || `Pedido ${o.number}`);
    changed.push(it);
  }
  function createDelivery({ items, cliente, sede, carrier, ref, notes, order, kind, origen, destino, extra }, user) {
    const d = {
      id: newId(), number: nextNumber(kind === 'traspaso' ? 'TRA' : kind === 'retirada' ? 'RET' : kind === 'certificado' ? 'CERT' : 'ALB'), kind: kind || 'albaran', origen: origen || '', destino: destino || '', date: nowISO(), cliente: cliente || '', sede,
      carrier: str(carrier, 120), ref: str(ref, 120), notes: str(notes, 2000), orderId: order ? order.id : null, orderNumber: order ? order.number : null,
      lines: items.map(it => { const data = { ...it.data }; delete data.notas; return { itemId: it.id, cat: it.cat, catName: (catOf(it.cat) || {}).name || it.cat, title: titleOf(it), serie: it.data.serie || '', qty: qtyOf(it), data, ...(extra ? extra(it) : {}) }; }),
      createdAt: nowISO(), createdBy: user.username, createdByName: user.name || user.username
    };
    db.prepare(`INSERT INTO deliveries (id, number, date, cliente, sede, carrier, ref, notes, order_id, order_number, lines, created_at, created_by, created_by_name, kind, origen, destino)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(d.id, d.number, d.date, d.cliente, JSON.stringify(d.sede || {}), d.carrier, d.ref, d.notes, d.orderId, d.orderNumber, JSON.stringify(d.lines), d.createdAt, d.createdBy, d.createdByName, d.kind, d.origen, d.destino);
    return d;
  }
  const rowToDelivery = r => ({ kind: r.kind || 'albaran', origen: r.origen || '', destino: r.destino || '', receivedAt: r.received_at || '', receivedBy: r.received_by || '', id: r.id, number: r.number, date: r.date, cliente: r.cliente, sede: JSON.parse(r.sede || '{}'), carrier: r.carrier, ref: r.ref, notes: r.notes, orderId: r.order_id, orderNumber: r.order_number, lines: JSON.parse(r.lines || '[]'), createdAt: r.created_at, createdBy: r.created_by, createdByName: r.created_by_name, emailedTo: r.emailed_to || '', emailedAt: r.emailed_at || '' });
  const almName = id => (almacenesOf().find(a => a.id === id) || {}).nombre || id;
  const pdfSettings = () => { const s = settings(); return { certificado: s.certificado || {}, almacenes: almacenesOf().map(a => ({ id: a.id, nombre: a.nombre })), company: s.company, brand: s.brand, albaran: s.albaran || {}, recogida: s.recogida || {}, tema: s.tema || {}, combos: s.combos || [], categories: s.categories || [], layout: allLocations() }; };

  /* ---------- Pedidos ---------- */
  api.get('/orders', requireAuth, requirePerm('inv.view'), (req, res) => {
    res.json(db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1000').all().filter(r => canClient(req.auth.u, r.cliente)).map(r => {
      const o = rowToOrder(r);
      return { ...o, qty: o.lines.reduce((s, l) => s + l.qty, 0), reserved: o.alloc.reduce((s, a) => s + a.qty, 0), picked: o.alloc.filter(a => a.picked).reduce((s, a) => s + a.qty, 0) };
    }));
  });
  api.get('/orders/:id', requireAuth, requirePerm('inv.view'), (req, res) => res.json(withItems(getOrder(req.params.id, req.auth.u))));

  api.post('/orders', requireAuth, requirePerm('inv.move'), (req, res) => {
    const b = req.body || {}, user = req.auth.u;
    const cliente = str(b.cliente, 120);
    if (!cliente) throw httpErr(400, 'Indica el cliente.');
    if (!canClient(u0(req), cliente)) throw httpErr(403, `No tienes acceso al cliente ${cliente}.`);
    const almsCli = almacenesOf().filter(a => (a.clientes || []).includes(cliente));
    const almacen = almsCli.some(a => a.id === b.almacen) ? b.almacen : (almsCli[0] || {}).id || '';
    if (!Array.isArray(b.lines) || !b.lines.length || b.lines.length > 60) throw httpErr(400, 'Añade al menos una línea al pedido.');
    const lines = b.lines.map(l => {
      if (!l || !catOf(l.cat)) throw httpErr(400, 'Hay una línea con una categoría que no existe.');
      const qty = Math.floor(Number(l.qty));
      if (!(qty >= 1 && qty <= 100000)) throw httpErr(400, 'Las cantidades deben ser números enteros mayores que cero.');
      const f = {};
      Object.entries(l.f && typeof l.f === 'object' ? l.f : {}).slice(0, 10).forEach(([k, v]) => { if (/^[a-z0-9_]{1,40}$/.test(k) && v !== '' && v != null) f[k] = str(v, 120); });
      return { cat: l.cat, qty, f, note: str(l.note, 200) };
    });
    let o;
    db.transaction(() => {
      if (b.id) {
        o = getOrder(b.id, user);
        if (['enviado', 'cancelado'].includes(o.status)) throw httpErr(400, 'Este pedido ya no se puede modificar.');
        if (o.alloc.length && JSON.stringify(o.lines.map(l => [l.cat, l.qty, l.f])) !== JSON.stringify(lines.map(l => [l.cat, l.qty, l.f]))) {
          // Se permite añadir líneas o subir cantidades; reducir o cambiar filtros exige liberar antes.
          const shrink = o.lines.some((l, i) => !lines[i] || lines[i].cat !== l.cat || JSON.stringify(lines[i].f) !== JSON.stringify(l.f) || lines[i].qty < o.alloc.filter(a => a.line === i).reduce((s, a) => s + a.qty, 0));
          if (shrink) throw httpErr(400, 'Para reducir o cambiar líneas con unidades reservadas, primero libera las reservas.');
        }
        Object.assign(o, { cliente, almacen, sede: sedeFrom(b), lines, notes: str(b.notes, 2000), dueDate: str(b.dueDate, 10) });
      } else {
        o = { id: newId(), number: nextNumber('PED'), cliente, almacen, sede: sedeFrom(b), status: 'borrador', lines, alloc: [], notes: str(b.notes, 2000), dueDate: str(b.dueDate, 10), createdAt: nowISO(), createdBy: user.username };
      }
      saveOrder(o, user.username);
    })();
    audit(user.username, 'pedido', `${b.id ? 'Pedido modificado' : 'Pedido creado'} ${o.number} para ${o.cliente}${o.sede.nombre ? ' (' + o.sede.nombre + ')' : ''}`, o.id);
    emitOrders();
    res.json(withItems(o));
  });

  api.post('/orders/:id/reserve', requireAuth, requirePerm('inv.move'), (req, res) => {
    const user = req.auth.u.username; let o; const changed = [], shortages = [];
    db.transaction(() => {
      o = getOrder(req.params.id, req.auth.u);
      if (['enviado', 'cancelado'].includes(o.status)) throw httpErr(400, 'Este pedido ya no admite reservas.');
      const items = allItems(); const used = new Set(o.alloc.map(a => a.itemId));
      o.lines.forEach((line, li) => {
        let need = line.qty - o.alloc.filter(a => a.line === li).reduce((s, a) => s + a.qty, 0);
        if (need <= 0) return;
        const cands = items.filter(it => !used.has(it.id) && isStock(it.data.estado) && !it.data.pedido && lineMatches(it, line, o.cliente) && (!o.almacen || itemAlm(it) === o.almacen) && (it.data.cliente === o.cliente || (!it.data.cliente && isTotal(req.auth.u))))
          .sort((a, b) => String(a.data.fecha_entrada || a.createdAt).localeCompare(String(b.data.fecha_entrada || b.createdAt)));
        for (const it of cands) {
          if (need <= 0) break;
          const avail = qtyOf(it); if (avail <= 0) continue;
          if (isSerialized(it.cat) || avail <= need) {
            it.data.estado_previo = it.data.estado; it.data.estado = estados().reservado; it.data.pedido = o.number;
            hist(it, user, 'Reserva', `Pedido ${o.number}`);
            changed.push(it); used.add(it.id);
            o.alloc.push({ itemId: it.id, line: li, qty: avail, picked: false });
            need -= avail;
          } else {
            const part = { id: newId(), cat: it.cat, data: { ...it.data, cantidad: need, estado_previo: it.data.estado, estado: estados().reservado, pedido: o.number }, history: [], createdAt: nowISO(), createdBy: user };
            hist(part, user, 'Reserva', `${need} uds. separadas de un lote para el pedido ${o.number}`);
            it.data.cantidad = avail - need;
            hist(it, user, 'Reserva parcial', `${need} uds. reservadas para el pedido ${o.number}`);
            changed.push(it, part); used.add(part.id);
            o.alloc.push({ itemId: part.id, line: li, qty: need, picked: false });
            need = 0;
          }
        }
        if (need > 0) shortages.push({ line: li, text: lineText(line), missing: need });
      });
      changed.forEach(it => upsertItem(it, user));
      o.status = o.alloc.length ? 'preparacion' : 'borrador';
      saveOrder(o, user);
    })();
    if (changed.length) { audit(user, 'pedido', `Reserva para ${o.number}: ${o.alloc.reduce((s, a) => s + a.qty, 0)} uds.${shortages.length ? ', faltan ' + shortages.reduce((s, x) => s + x.missing, 0) : ''}`, o.id); emitItems(changed); }
    emitOrders();
    res.json({ order: withItems(getOrder(o.id)), shortages });
  });

  api.post('/orders/:id/release', requireAuth, requirePerm('inv.move'), (req, res) => {
    const user = req.auth.u.username; let o; const changed = [], deleted = [];
    db.transaction(() => {
      o = getOrder(req.params.id, req.auth.u);
      if (o.status === 'enviado') throw httpErr(400, 'El pedido ya está enviado.');
      o.alloc.forEach(a => releaseItem(getItem(a.itemId), o, user, changed, deleted));
      changed.filter(it => !deleted.includes(it.id)).forEach(it => upsertItem(it, user));
      o.alloc = []; if (o.status !== 'cancelado') o.status = 'borrador';
      saveOrder(o, user);
    })();
    audit(user, 'pedido', `Reservas liberadas del pedido ${o.number}`, o.id);
    emitItems(changed.filter(it => !deleted.includes(it.id)), deleted); emitOrders();
    res.json({ order: withItems(getOrder(o.id)) });
  });

  api.post('/orders/:id/pick', requireAuth, requirePerm('inv.move'), (req, res) => {
    const user = req.auth.u.username, b = req.body || {}; let o, msg = '', swapped = false; const changed = [];
    db.transaction(() => {
      o = getOrder(req.params.id, req.auth.u);
      if (o.status !== 'preparacion') throw httpErr(400, 'Este pedido no está en preparación.');
      if (b.itemId) {
        const a = o.alloc.find(x => x.itemId === b.itemId); if (!a) throw httpErr(404, 'Esa unidad no está en el pedido.');
        a.picked = b.picked !== false; saveOrder(o, user); return;
      }
      let code = str(b.code, 200); if (!code) throw httpErr(400, 'Escanea o escribe un número de serie.');
      let it = null;
      if (/^LBR\|/.test(code)) { const p = code.split('|'); it = getItem(p[3] || '') || null; if (!it && p[2]) code = p[2]; }
      if (!it) { const sn = normSerial(code); it = allItems().find(x => normSerial(x.data.serie) === sn) || null; }
      if (!it) throw httpErr(404, `No hay ningún equipo con el número de serie ${code}.`);
      const a = o.alloc.find(x => x.itemId === it.id);
      if (a) { msg = a.picked ? `${it.data.serie || titleOf(it)} ya estaba confirmado.` : `${it.data.serie || titleOf(it)} confirmado.`; a.picked = true; saveOrder(o, user); return; }
      // ¿Puede sustituir a una unidad reservada que aún no se ha recogido?
      if (!isSerialized(it.cat)) throw httpErr(409, 'Este material se controla por cantidad: confírmalo marcando la casilla.');
      if (!isStock(it.data.estado) || it.data.pedido) throw httpErr(409, `${it.data.serie} no está disponible (estado: ${it.data.estado || 'sin estado'}${it.data.pedido ? ', pedido ' + it.data.pedido : ''}).`);
      const slot = o.alloc.find(x => !x.picked && o.lines[x.line] && lineMatches(it, o.lines[x.line], o.cliente));
      if (!slot) throw httpErr(409, `${it.data.serie} no corresponde a ninguna línea pendiente de este pedido.`);
      const old = getItem(slot.itemId); const deleted = [];
      releaseItem(old, o, user, changed, deleted, `Sustituido por ${it.data.serie}`);
      if (!canItem(req.auth.u, it)) throw httpErr(403, 'No tienes acceso a ese equipo.');
      it.data.estado_previo = it.data.estado; it.data.estado = estados().reservado; it.data.pedido = o.number; hist(it, user, 'Reserva', `Pedido ${o.number} (sustituye a ${old ? old.data.serie || old.id : '—'})`);
      changed.push(it);
      slot.itemId = it.id; slot.picked = true; slot.qty = 1;
      changed.forEach(x => upsertItem(x, user));
      saveOrder(o, user); swapped = true;
      msg = `${it.data.serie} confirmado en lugar de ${old ? old.data.serie : 'la unidad reservada'}.`;
    })();
    if (changed.length) emitItems(changed);
    emitOrders();
    res.json({ order: withItems(getOrder(o.id)), message: msg, swapped });
  });

  api.post('/orders/:id/ship', requireAuth, requirePerm('inv.move'), (req, res) => {
    const u = req.auth.u, b = req.body || {}; let o, d; const changed = [];
    db.transaction(() => {
      o = getOrder(req.params.id, req.auth.u);
      if (o.status !== 'preparacion') throw httpErr(400, 'Solo se pueden enviar pedidos en preparación.');
      if (!o.alloc.length) throw httpErr(400, 'El pedido no tiene unidades reservadas.');
      const pending = o.alloc.filter(a => !a.picked).length;
      if (pending && !b.force) { const e = httpErr(409, `Quedan ${pending} unidades sin confirmar en la recogida.`); e.code = 'unpicked'; throw e; }
      const items = o.alloc.map(a => getItem(a.itemId)).filter(Boolean);
      d = createDelivery({ items, cliente: o.cliente, sede: o.sede, carrier: b.carrier, ref: b.ref, notes: b.notes ?? o.notes, order: o }, u);
      items.forEach(it => {
        it.data.estado = estados().enviado; delete it.data.estado_previo; if (o.cliente) it.data.cliente = o.cliente;
        it.data.destino = o.sede.nombre || ''; it.data.albaran_salida = d.number;
        hist(it, u.username, 'Envío', `Albarán ${d.number}${o.sede.nombre ? ' a ' + o.sede.nombre : ''}`);
        upsertItem(it, u.username); changed.push(it);
      });
      o.status = 'enviado'; o.deliveryId = d.id; o.shippedAt = nowISO();
      saveOrder(o, u.username);
    })();
    audit(u.username, 'salida_masiva', `Pedido ${o.number} enviado con el albarán ${d.number} (${changed.length} registros)`, o.id);
    emitItems(changed); emitOrders(); emitDeliveries();
    res.json({ order: withItems(getOrder(o.id)), delivery: { id: d.id, number: d.number } });
  });

  api.post('/orders/:id/cancel', requireAuth, requirePerm('inv.move'), (req, res) => {
    const user = req.auth.u.username; let o; const changed = [], deleted = [];
    db.transaction(() => {
      o = getOrder(req.params.id, req.auth.u);
      if (o.status === 'enviado') throw httpErr(400, 'Un pedido enviado no se puede cancelar.');
      o.alloc.forEach(a => releaseItem(getItem(a.itemId), o, user, changed, deleted, `Pedido ${o.number} cancelado`));
      changed.filter(it => !deleted.includes(it.id)).forEach(it => upsertItem(it, user));
      o.alloc = []; o.status = 'cancelado'; saveOrder(o, user);
    })();
    audit(user, 'pedido', `Pedido ${o.number} cancelado`, o.id);
    emitItems(changed.filter(it => !deleted.includes(it.id)), deleted); emitOrders();
    res.json({ order: withItems(getOrder(o.id)) });
  });

  api.delete('/orders/:id', requireAuth, requirePerm('inv.move'), (req, res) => {
    const o = getOrder(req.params.id, req.auth.u);
    if (o.alloc.length || !['borrador', 'cancelado'].includes(o.status)) throw httpErr(400, 'Solo se pueden eliminar pedidos en borrador o cancelados, sin reservas.');
    db.prepare('DELETE FROM orders WHERE id = ?').run(o.id);
    audit(req.auth.u.username, 'pedido', `Pedido ${o.number} eliminado`);
    emitOrders();
    res.json({ ok: true });
  });

  api.get('/orders/:id/picking.pdf', requireAuth, requirePerm('inv.view'), ah(async (req, res) => {
    const o = withItems(getOrder(req.params.id, req.auth.u)); const s = settings();
    const LL = allLocations(); const locName = id => { const r = LL.racks.find(x => x.id === id); if (r) return 'Estantería ' + r.name; const z = LL.zones.find(x => x.id === id); return z ? z.name : (id || 'Sin ubicación'); };
    const sorted = o.items.filter(x => !x.missing).sort((a, b) => locName(a.ubicacion).localeCompare(locName(b.ubicacion), 'es', { numeric: true }) || (Number(a.nivel) || 0) - (Number(b.nivel) || 0) || String(a.serie).localeCompare(String(b.serie)));
    const rows = []; let last = null;
    for (const x of sorted) {
      const g = locName(x.ubicacion);
      const it = getItem(x.itemId);
      rows.push({ _checked: x.picked, ubic: g, balda: x.nivel ? String(x.nivel) + (Number(x.hueco) > 0 ? '-' + x.hueco : '') : '—', cat: (catOf(x.cat) || {}).name || x.cat, desc: x.title, serie: x.serie || '—', qty: x.qty, data: it ? it.data : {} });
    }
    const summary = o.lines.map(l => ({ desc: l.text + (l.note ? ` (${l.note})` : ''), qty: l.qty, res: l.reserved, miss: Math.max(0, l.qty - l.reserved) || '' }));
    const buf = await pdf.pickingPdf(o, rows, summary, pdfSettings());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Recogida-${o.number}.pdf"`);
    res.end(buf);
  }));

  /* ---------- Albaranes ---------- */
  api.get('/deliveries', requireAuth, requirePerm('inv.view'), (req, res) => {
    res.json(db.prepare('SELECT * FROM deliveries ORDER BY date DESC LIMIT 2000').all().filter(r => canClient(req.auth.u, r.cliente)).map(r => { const d = rowToDelivery(r); return { ...d, units: d.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), count: d.lines.length }; }));
  });
  api.get('/deliveries/:id', requireAuth, requirePerm('inv.view'), (req, res) => {
    const r = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!r || !canClient(req.auth.u, r.cliente)) throw httpErr(404, 'El albarán no existe.');
    res.json(rowToDelivery(r));
  });
  // Enviar un albarán por correo con el PDF adjunto
  const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
  function fillTemplate(t, d, u) {
    const units = d.lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);
    return String(t || '').replace(/\{(\w+)\}/g, (m, k) => ({
      albaran: d.number, cliente: d.cliente || '', sede: d.sede && d.sede.nombre || '', fecha: new Date(d.date).toLocaleDateString('es-ES'),
      unidades: String(units), usuario: u.name || u.username, transportista: d.carrier || '', referencia: d.ref || '', pedido: d.orderNumber || '', empresa: settings().company || ''
    })[k] ?? m);
  }
  async function emailDelivery(id, b, u) {
    if (!mail.enabled()) throw httpErr(400, 'El envío de correo no está configurado en el servidor.');
    const r = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
    if (!r || !canClient(u, r.cliente)) throw httpErr(404, 'El albarán no existe.');
    const d = rowToDelivery(r), s = settings(), A = s.albaran || {};
    const to = [...new Set((Array.isArray(b.to) ? b.to : String(b.to || '').split(/[,;\s]+/)).map(x => String(x).trim().toLowerCase()).filter(Boolean))];
    if (!to.length) throw httpErr(400, 'Indica al menos un destinatario.');
    if (to.length > 25) throw httpErr(400, 'Demasiados destinatarios (máximo 25).');
    const bad = to.filter(x => !EMAIL_RE.test(x)); if (bad.length) throw httpErr(400, `Correo no válido: ${bad.join(', ')}`);
    const subject = fillTemplate(str(b.subject, 200) || A.emailSubject || 'Salida de material · Albarán {albaran}', d, u);
    const message = fillTemplate(str(b.message, 5000) || A.emailBody || 'Hola,\n\nOs adjuntamos el albarán {albaran} con el material enviado.\n\nUn saludo.', d, u);
    const ps = pdfSettings();
    const { cols, rows } = pdf.deliveryTable(d, ps, 500);
    const esc = mail.esc;
    const tableHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 6px;font-size:13px">
      <tr>${cols.map(c => `<th style="background:${mail.accent()};color:#fff;text-align:${c.align === 'right' ? 'right' : 'left'};padding:7px 8px;font-weight:bold">${esc(c.label)}</th>`).join('')}</tr>
      ${rows.map((rw, i) => `<tr style="background:${i % 2 ? '#F4F4F5' : '#fff'}">${cols.map(c => `<td style="padding:6px 8px;border-bottom:1px solid #E4E4E7;text-align:${c.align === 'right' ? 'right' : 'left'};${c.bold ? 'font-weight:bold' : ''}">${esc(rw[c.key])}</td>`).join('')}</tr>`).join('')}
    </table>`;
    const info = [['Albarán', d.number], ['Fecha', new Date(d.date).toLocaleDateString('es-ES')], ['Cliente', d.cliente], ['Destino', [d.sede.nombre, d.sede.direccion, [d.sede.cp, d.sede.ciudad].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Transportista', d.carrier], ['Referencia', d.ref], ['Pedido', d.orderNumber]].filter(x => x[1]);
    const infoHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 4px;font-size:13px">${info.map(([k, v]) => `<tr><td style="color:#6B6B74;padding:2px 14px 2px 0">${esc(k)}</td><td style="font-weight:bold">${esc(v)}</td></tr>`).join('')}</table>`;
    const textTable = rows.map(rw => cols.map(c => rw[c.key]).join(' | ')).join('\n');
    const body = mail.layout(s.company || 'Laberit', `Albarán ${d.number}`, message.split(/\n{2,}/).map(p => esc(p).replace(/\n/g, '<br>')), null, 'El albarán en PDF va adjunto a este correo.', infoHtml + tableHtml, '\n' + info.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\n' + textTable);
    const buf = await pdf.deliveryPdf(d, ps);
    const extra = {};
    if (A.email && EMAIL_RE.test(A.email)) extra.replyTo = A.email;
    try { await mail.send(to.join(', '), subject, body, [{ filename: `${d.number}.pdf`, content: buf, contentType: 'application/pdf' }], extra); }
    catch (e) { throw httpErr(502, 'No se ha podido enviar el correo: ' + e.message); }
    const all = [...new Set([...(d.emailedTo ? d.emailedTo.split(', ') : []), ...to])].join(', ');
    db.prepare('UPDATE deliveries SET emailed_to = ?, emailed_at = ? WHERE id = ?').run(all, nowISO(), d.id);
    audit(u.username, 'correo_enviado', `Albarán ${d.number} enviado a ${to.join(', ')}`, d.id);
    emitDeliveries();
    return { ok: true, to };
  }
  // Eliminar un albarán. Opcionalmente, su material vuelve a stock. El número no se reutiliza.
  api.delete('/deliveries/:id', requireAuth, requirePerm('inv.delete'), (req, res) => {
    const u = req.auth.u, revert = !!(req.body || {}).revert;
    const r = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!r || !canClient(u, r.cliente)) throw httpErr(404, 'El albarán no existe.');
    const d = rowToDelivery(r); const changed = [];
    db.transaction(() => {
      if (revert) d.lines.forEach(l => {
        const it = getItem(l.itemId);
        if (!it || it.data.albaran_salida !== d.number) return;
        it.data.estado = estados().stock[0]; delete it.data.albaran_salida; delete it.data.destino; delete it.data.pedido; delete it.data.estado_previo;
        hist(it, u.username, 'Albarán anulado', `${d.number}: vuelve a stock`);
        upsertItem(it, u.username); changed.push(it);
      });
      if (d.orderId) db.prepare(`UPDATE orders SET delivery_id = NULL${revert ? ", status = 'cancelado', alloc = '[]'" : ''} WHERE id = ?`).run(d.orderId);
      db.prepare('DELETE FROM deliveries WHERE id = ?').run(d.id);
    })();
    audit(u.username, 'albaran_eliminado', `Albarán ${d.number} eliminado${revert ? ` y ${changed.length} registros devueltos a stock` : ''}${d.orderNumber ? ` (pedido ${d.orderNumber}${revert ? ' cancelado' : ''})` : ''}`);
    if (changed.length) emitItems(changed);
    emitDeliveries(); if (d.orderId) emitOrders();
    res.json({ ok: true, reverted: changed.length });
  });
  api.post('/deliveries/:id/email', requireAuth, requirePerm('inv.move'), ah(async (req, res) => res.json(await emailDelivery(req.params.id, req.body || {}, req.auth.u))));
  api.get('/deliveries/:id/pdf', requireAuth, requirePerm('inv.view'), ah(async (req, res) => {
    const r = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!r || !canClient(req.auth.u, r.cliente)) throw httpErr(404, 'El albarán no existe.');
    const d = rowToDelivery(r);
    const buf = d.kind === 'certificado' ? await pdf.certificatePdf(d, pdfSettings()) : await pdf.deliveryPdf(d, pdfSettings());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${d.number}.pdf"`);
    res.end(buf);
  }));
  // Salida directa: equipos por número de serie y lotes por cantidad, con o sin albarán.
  function applyOut(b, u, withDelivery) {
    const ch = b.changes && typeof b.changes === 'object' ? b.changes : {};
    const allowed = ['estado', 'cliente', 'pais', 'ubicacion', 'nivel'];
    const ids = Array.isArray(b.itemIds) ? b.itemIds.map(String) : [];
    const bulk = Array.isArray(b.bulk) ? b.bulk : [];
    if (!ids.length && !bulk.length) throw httpErr(400, 'No hay material para la salida.');
    if (ids.length + bulk.length > 2000) throw httpErr(400, 'Demasiadas líneas en una sola salida.');
    if (!withDelivery && !Object.keys(ch).some(k => allowed.includes(k) && ch[k] !== '' && ch[k] !== undefined)) throw httpErr(400, 'Elige al menos un cambio que aplicar o genera un albarán.');
    let d = null; const changed = [];
    const chText = Object.entries(ch).filter(([k, v]) => allowed.includes(k) && v !== '' && v !== undefined).map(([k, v]) => `${k}: ${v}`).join(', ');
    db.transaction(() => {
      const items = [...new Set(ids)].map(getItem).filter(Boolean);
      if (items.some(it => !canItem(u, it))) throw httpErr(403, 'No tienes acceso a parte del material.');
      if (ch.cliente && !canClient(u, ch.cliente)) throw httpErr(403, `No tienes acceso al cliente ${ch.cliente}.`);
      const seen = new Set();
      for (const l of bulk) {
        const it = getItem(String((l && l.itemId) || ''));
        if (!it || !canItem(u, it)) throw httpErr(404, 'Uno de los lotes ya no existe. Recarga la página.');
        if (isSerialized(it.cat)) throw httpErr(400, `${titleOf(it)} se controla por número de serie: escanéalo.`);
        if (seen.has(it.id)) throw httpErr(400, `Has añadido dos veces el lote ${titleOf(it)}.`);
        seen.add(it.id);
        const avail = qtyOf(it), q = Math.floor(Number(l.qty));
        if (!(q >= 1)) throw httpErr(400, 'Las cantidades deben ser números enteros mayores que cero.');
        if (q > avail) throw httpErr(409, `Solo quedan ${avail} uds. de ${titleOf(it)}.`);
        if (q === avail) { items.push(it); continue; }
        const part = { id: newId(), cat: it.cat, data: { ...it.data, cantidad: q }, history: [], createdAt: nowISO(), createdBy: u.username };
        hist(part, u.username, 'Separado del lote', `${q} de ${avail} uds.`);
        it.data.cantidad = avail - q;
        hist(it, u.username, 'Salida parcial', `${q} uds.${withDelivery ? '' : chText ? ' (' + chText + ')' : ''}`);
        upsertItem(it, u.username); changed.push(it);
        items.push(part);
      }
      if (!items.length) throw httpErr(400, 'Ninguno de los equipos existe.');
      const sede = sedeFrom(b);
      if (withDelivery) {
        const cliente = str(b.cliente || ch.cliente || items[0].data.cliente || '', 120);
        d = createDelivery({ items, cliente, sede, carrier: b.carrier, ref: b.ref, notes: b.notes }, u);
      }
      items.forEach(it => {
        allowed.forEach(k => { if (ch[k] !== undefined && ch[k] !== '') it.data[k] = k === 'nivel' ? Number(ch[k]) : str(ch[k], 120); });
        if (d) { it.data.destino = sede.nombre || ''; it.data.albaran_salida = d.number; }
        hist(it, u.username, d ? 'Envío' : 'Movimiento', [d ? `Albarán ${d.number}${sede.nombre ? ' a ' + sede.nombre : ''}` : chText, b.comment ? str(b.comment, 200) : ''].filter(Boolean).join(' · '));
        upsertItem(it, u.username); changed.push(it);
      });
    })();
    const units = changed.filter(x => x.data.albaran_salida === (d && d.number) || !d).length;
    audit(u.username, 'salida_masiva', d ? `Albarán ${d.number}: ${d.lines.reduce((a, l) => a + l.qty, 0)} uds.${d.sede.nombre ? ' a ' + d.sede.nombre : ''}` : `${changed.length} registros: ${chText}${b.comment ? ' · ' + str(b.comment, 200) : ''}`, d ? d.id : '');
    emitItems(changed); if (d) emitDeliveries();
    return { delivery: d ? { id: d.id, number: d.number } : null, id: d ? d.id : null, number: d ? d.number : null, count: units };
  }
  /* ---------- Traspasos entre almacenes ---------- */
  api.post('/transfers', requireAuth, requirePerm('inv.move'), (req, res) => {
    const b = req.body || {}, u = req.auth.u, E = estados();
    const cliente = str(b.cliente, 120), origen = str(b.origen, 64), destino = str(b.destino, 64);
    const alms = almacenesOf();
    if (!alms.some(a => a.id === origen) || !alms.some(a => a.id === destino)) throw httpErr(400, 'Elige el almacén de origen y el de destino.');
    if (origen === destino) throw httpErr(400, 'El origen y el destino deben ser almacenes distintos.');
    if (!canClient(u, cliente)) throw httpErr(403, `No tienes acceso al cliente ${cliente}.`);
    if (!(alms.find(a => a.id === destino).clientes || []).includes(cliente)) throw httpErr(400, `${cliente} no está asignado al almacén de destino. Asígnalo en Ajustes → Almacenes.`);
    const ids = Array.isArray(b.itemIds) ? [...new Set(b.itemIds.map(String))] : [], bulk = Array.isArray(b.bulk) ? b.bulk : [];
    if (!ids.length && !bulk.length) throw httpErr(400, 'No hay material para traspasar.');
    let d; const changed = [];
    db.transaction(() => {
      const items = ids.map(getItem).filter(Boolean);
      const check = it => {
        if (!canItem(u, it)) throw httpErr(403, 'No tienes acceso a parte del material.');
        if (it.data.cliente !== cliente) throw httpErr(400, `${it.data.serie || titleOf(it)} es de ${it.data.cliente || 'otro cliente'}, no de ${cliente}.`);
        if (itemAlm(it) !== origen) throw httpErr(400, `${it.data.serie || titleOf(it)} no está en el almacén de origen.`);
        if (it.data.pedido) throw httpErr(409, `${it.data.serie || titleOf(it)} está reservado para el pedido ${it.data.pedido}.`);
        if (it.data.estado === E.transito) throw httpErr(409, `${it.data.serie || titleOf(it)} ya está en tránsito.`);
      };
      items.forEach(check);
      for (const l of bulk) {
        const it = getItem(String((l && l.itemId) || '')); if (!it) throw httpErr(404, 'Uno de los lotes ya no existe.');
        check(it); if (isSerialized(it.cat)) throw httpErr(400, `${titleOf(it)} se controla por número de serie: escanéalo.`);
        const avail = qtyOf(it), q = Math.floor(Number(l.qty));
        if (!(q >= 1) || q > avail) throw httpErr(400, `Cantidad no válida para ${titleOf(it)} (hay ${avail}).`);
        if (q === avail) { items.push(it); continue; }
        const part = { id: newId(), cat: it.cat, data: { ...it.data, cantidad: q }, history: [], createdAt: nowISO(), createdBy: u.username };
        hist(part, u.username, 'Separado del lote', `${q} de ${avail} uds. para traspaso`);
        it.data.cantidad = avail - q; hist(it, u.username, 'Traspaso parcial', `${q} uds.`); upsertItem(it, u.username); changed.push(it); items.push(part);
      }
      if (!items.length) throw httpErr(400, 'Ninguno de los equipos existe.');
      d = createDelivery({ items, cliente, sede: { nombre: almName(destino) }, carrier: b.carrier, ref: b.ref, notes: b.notes, kind: 'traspaso', origen, destino }, u);
      items.forEach(it => {
        it.data.estado_previo = it.data.estado; it.data.estado = E.transito; it.data.almacen = destino; it.data.traspaso = d.number;
        delete it.data.ubicacion; delete it.data.nivel; delete it.data.hueco;
        hist(it, u.username, 'Traspaso', `${d.number}: ${almName(origen)} → ${almName(destino)}`);
        upsertItem(it, u.username); changed.push(it);
      });
    })();
    audit(u.username, 'traspaso', `Traspaso ${d.number}: ${d.lines.reduce((a, l) => a + l.qty, 0)} uds. de ${cliente}, ${almName(origen)} → ${almName(destino)}`, d.id);
    emitItems(changed); emitDeliveries();
    res.json({ delivery: { id: d.id, number: d.number } });
  });
  api.post('/transfers/:id/receive', requireAuth, requirePerm('inv.move'), (req, res) => {
    const u = req.auth.u, E = estados();
    const r = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!r || r.kind !== 'traspaso' || !canClient(u, r.cliente)) throw httpErr(404, 'El traspaso no existe.');
    if (r.received_at) throw httpErr(409, 'Este traspaso ya se recibió.');
    const d = rowToDelivery(r), changed = [];
    db.transaction(() => {
      d.lines.forEach(l => { const it = getItem(l.itemId); if (!it || it.data.traspaso !== d.number) return;
        it.data.estado = it.data.estado_previo && it.data.estado_previo !== E.transito ? it.data.estado_previo : E.stock[0]; delete it.data.estado_previo; delete it.data.traspaso;
        hist(it, u.username, 'Recepción de traspaso', `${d.number} en ${almName(d.destino)}`); upsertItem(it, u.username); changed.push(it); });
      db.prepare('UPDATE deliveries SET received_at = ?, received_by = ? WHERE id = ?').run(nowISO(), u.name || u.username, d.id);
    })();
    audit(u.username, 'traspaso', `Traspaso ${d.number} recibido en ${almName(d.destino)} (${changed.length} registros)`, d.id);
    emitItems(changed); emitDeliveries();
    res.json({ ok: true, received: changed.length });
  });

  /* ---------- Retiradas de equipos del cliente ---------- */
  api.post('/retiradas', requireAuth, requirePerm('inv.create'), (req, res) => {
    const b = req.body || {}, u = req.auth.u, E = estados(), s = settings();
    const cliente = str(b.cliente, 120);
    if (!cliente) throw httpErr(400, 'Indica el cliente.');
    if (!canClient(u, cliente)) throw httpErr(403, `No tienes acceso al cliente ${cliente}.`);
    const almsCli = almacenesOf().filter(a => (a.clientes || []).includes(cliente));
    const almacen = almsCli.some(a => a.id === b.almacen) ? b.almacen : (almsCli[0] || {}).id;
    if (!almacen) throw httpErr(400, `${cliente} no está asignado a ningún almacén.`);
    const cat = catOf(b.cat) ? b.cat : 'equipos'; if (!catOf(cat)) throw httpErr(400, 'Categoría no válida.');
    const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 1000).map(l => ({ serie: str(l && l.serie, 80).toUpperCase(), marca: str(l && l.marca, 80), modelo: str(l && l.modelo, 120), tipo: str(l && l.tipo, 80) })).filter(l => l.serie);
    if (!lines.length) throw httpErr(400, 'Añade al menos un número de serie.');
    const common = { marca: str(b.marca, 80), modelo: str(b.modelo, 120), tipo: str(b.tipo, 80) };
    let d; const changed = []; let nuevos = 0;
    db.transaction(() => {
      const items = lines.map(l => {
        const ex = db.prepare('SELECT * FROM items WHERE serial_norm = ?').get(normSerial(l.serie));
        let it = ex ? rowToItem(ex) : null;
        if (it && !canItem(u, it) && !isTotal(u)) throw httpErr(403, `${l.serie} es de otro cliente.`);
        if (!it) { nuevos++; it = { id: newId(), cat, data: { serie: l.serie, condicion: (s.retirada || {}).condicion || 'Usado', pais: '' }, history: [], createdAt: nowISO(), createdBy: u.username }; hist(it, u.username, 'Alta', 'Alta por retirada'); }
        ['marca', 'modelo', 'tipo'].forEach(k => { const v = l[k] || common[k]; if (v && !it.data[k]) it.data[k] = v; });
        return it;
      });
      const sede = sedeFrom(b);
      d = createDelivery({ items, cliente, sede, carrier: b.carrier, ref: b.ref, notes: b.notes, kind: 'retirada', destino: almacen }, u);
      items.forEach(it => {
        it.data.cliente = cliente; it.data.almacen = almacen; it.data.estado = E.retirado; it.data.retirada = d.number; it.data.origen_retirada = sede.nombre || cliente;
        it.data.fecha_entrada = it.data.fecha_entrada || nowISO().slice(0, 10); delete it.data.pedido; delete it.data.albaran_salida;
        hist(it, u.username, 'Retirada', `${d.number} desde ${sede.nombre || cliente}`);
        upsertItem(it, u.username); changed.push(it);
      });
    })();
    audit(u.username, 'retirada', `Retirada ${d.number}: ${changed.length} equipos de ${cliente}${nuevos ? ` (${nuevos} dados de alta)` : ''}`, d.id);
    emitItems(changed); emitDeliveries();
    res.json({ delivery: { id: d.id, number: d.number }, nuevos, total: changed.length });
  });

  /* ---------- Borrado de datos y certificado ---------- */
  const METODOS = ['NIST 800-88 Clear', 'NIST 800-88 Purge', 'Borrado criptográfico', 'Secure Erase del fabricante', 'Sobrescritura (3 pasadas)', 'Destrucción física del disco'];
  api.post('/erasures', requireAuth, requirePerm('inv.edit'), (req, res) => {
    const b = req.body || {}, u = req.auth.u;
    const ids = Array.isArray(b.itemIds) ? [...new Set(b.itemIds.map(String))].slice(0, 1000) : [];
    if (!ids.length) throw httpErr(400, 'Selecciona al menos un equipo.');
    const metodo = METODOS.includes(b.metodo) ? b.metodo : str(b.metodo, 80);
    if (!metodo) throw httpErr(400, 'Indica el método de borrado.');
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : nowISO().slice(0, 10);
    const reg = { metodo, herramienta: str(b.herramienta, 120), fecha, tecnico: str(b.tecnico, 120) || u.name || u.username, resultado: b.resultado === 'Fallido' ? 'Fallido' : 'Correcto', disco: '', notas: str(b.notas, 500), registradoPor: u.username, registradoEn: nowISO() };
    const changed = [];
    db.transaction(() => ids.forEach(id => {
      const it = getItem(id); if (!it) return;
      if (!canItem(u, it)) throw httpErr(403, 'No tienes acceso a parte del material.');
      it.data.borrado = { ...reg, disco: str((b.discos || {})[id], 80) };
      if (b.estado) it.data.estado = str(b.estado, 60);
      hist(it, u.username, 'Borrado de datos', `${metodo}${reg.herramienta ? ' con ' + reg.herramienta : ''}: ${reg.resultado}`);
      upsertItem(it, u.username); changed.push(it);
    }))();
    audit(u.username, 'borrado', `Borrado de datos registrado en ${changed.length} equipos (${metodo})`);
    emitItems(changed);
    res.json({ ok: true, count: changed.length });
  });
  api.post('/certificates', requireAuth, requirePerm('inv.edit'), (req, res) => {
    const b = req.body || {}, u = req.auth.u;
    const ids = Array.isArray(b.itemIds) ? [...new Set(b.itemIds.map(String))].slice(0, 2000) : [];
    const items = ids.map(getItem).filter(Boolean);
    if (!items.length) throw httpErr(400, 'Selecciona los equipos del certificado.');
    if (items.some(it => !canItem(u, it))) throw httpErr(403, 'No tienes acceso a parte del material.');
    const sin = items.filter(it => !it.data.borrado);
    if (sin.length) throw httpErr(400, `${sin.length} equipos no tienen registrado el borrado (por ejemplo ${sin[0].data.serie || titleOf(sin[0])}).`);
    const clientes = [...new Set(items.map(it => it.data.cliente).filter(Boolean))];
    if (clientes.length > 1) throw httpErr(400, `Un certificado es para un solo cliente; has seleccionado equipos de ${clientes.join(', ')}.`);
    const d = createDelivery({ items, cliente: clientes[0] || '', sede: sedeFrom(b), notes: b.notes, kind: 'certificado', extra: it => ({ borrado: it.data.borrado }) }, u);
    db.transaction(() => items.forEach(it => { it.data.certificado_borrado = d.number; upsertItem(it, u.username); }))();
    audit(u.username, 'certificado', `Certificado de borrado ${d.number} para ${d.cliente}: ${items.length} equipos`, d.id);
    emitItems(items); emitDeliveries();
    res.json({ delivery: { id: d.id, number: d.number } });
  });
  api.post('/deliveries', requireAuth, requirePerm('inv.move'), (req, res) => res.json(applyOut(req.body || {}, req.auth.u, true)));
  api.post('/moves', requireAuth, requirePerm('inv.move'), (req, res) => res.json(applyOut(req.body || {}, req.auth.u, false)));
};
