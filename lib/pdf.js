'use strict';
// PDF de albaranes de entrega y listas de recogida (pdfkit, sin dependencias nativas).
const PDFDocument = require('pdfkit');

let RED = '#C8102E';
const INK = '#18181B', MUTED = '#6B6B74', LINE = '#D4D4D8', SOFT = '#F4F4F5';
const setAccent = s => { const c = s && s.tema && s.tema.primario; RED = /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#C8102E'; };
const M = 40; // margen

const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? String(iso) : d.toLocaleDateString('es-ES'); };
const fmtDT = iso => iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '';

function logoBuffer(brand) {
  if (!brand || brand.mode !== 'image' || !brand.logo) return null;
  const m = String(brand.logo).match(/^data:image\/(png|jpeg);base64,(.+)$/);
  return m ? Buffer.from(m[2], 'base64') : null;
}
function toBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
const contentW = doc => doc.page.width - M * 2;
const bottomLimit = doc => doc.page.height - M - 34;

function header(doc, s, title, meta) {
  const W = contentW(doc); let y = M;
  const logo = logoBuffer(s.brand);
  let drawn = false;
  if (logo) { try { doc.image(logo, M, y, { fit: [180, 54], valign: 'center' }); drawn = true; } catch { /* formato no compatible */ } }
  if (!drawn) doc.font('Helvetica-Bold').fontSize(22).fillColor(RED).text(s.company || '', M, y + 12, { width: 260 });
  doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text(title, M + W - 270, y, { width: 270, align: 'right' });
  let my = y + 24;
  for (const [k, v] of meta) {
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(k, M + W - 270, my, { width: 130, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(String(v || '—'), M + W - 134, my, { width: 134, align: 'right' });
    my += 14;
  }
  y = Math.max(y + 62, my + 6);
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(2).strokeColor(RED).stroke();
  return y + 14;
}

function box(doc, x, y, w, label, lines, measureOnly) {
  const inner = w - 20;
  doc.font('Helvetica').fontSize(10);
  let h = 26;
  lines.forEach((l, i) => { doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(i === 0 ? 10.5 : 9.5); h += doc.heightOfString(l, { width: inner }) + 2; });
  h += 8;
  if (measureOnly) return h;
  return h;
}
function drawBox(doc, x, y, w, h, label, lines) {
  doc.roundedRect(x, y, w, h, 6).lineWidth(0.8).strokeColor(LINE).stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(RED).text(label, x + 10, y + 9, { width: w - 20, characterSpacing: 0.6 });
  let ly = y + 24;
  lines.forEach((l, i) => {
    doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(i === 0 ? 10.5 : 9.5).fillColor(i === 0 ? INK : '#3F3F46');
    doc.text(l, x + 10, ly, { width: w - 20 });
    ly = doc.y + 2;
  });
}

function table(doc, cols, rows, y, opts = {}) {
  const W = contentW(doc), pad = 5, fs = opts.fs || 9;
  doc.font('Helvetica-Bold').fontSize(fs - 0.5);
  const headH = Math.max(20, ...cols.map(c => doc.heightOfString(c.label, { width: Math.max(10, c.w - pad * 2) }) + 11));
  const drawHead = yy => {
    doc.rect(M, yy, W, headH).fill(RED);
    let x = M;
    doc.font('Helvetica-Bold').fontSize(fs - 0.5).fillColor('#FFFFFF');
    for (const c of cols) { doc.text(c.label, x + pad, yy + 6, { width: Math.max(10, c.w - pad * 2), align: c.align || 'left' }); x += c.w; }
    return yy + headH;
  };
  y = drawHead(y);
  rows.forEach((r, i) => {
    doc.font('Helvetica').fontSize(fs);
    let h = 16;
    for (const c of cols) { const v = c.key === '_check' ? '' : String(r[c.key] ?? ''); doc.font(c.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs); h = Math.max(h, doc.heightOfString(v, { width: Math.max(10, c.w - pad * 2) }) + 9); }
    if (r._group) h = 20;
    if (y + h > bottomLimit(doc)) { doc.addPage(); y = drawHead(M); }
    if (r._group) {
      doc.rect(M, y, W, h).fill('#ECECEF');
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(r._group, M + pad, y + 6, { width: W - pad * 2 });
      y += h; return;
    }
    if (i % 2 === 1 && !opts.noZebra) doc.rect(M, y, W, h).fill(SOFT);
    let x = M;
    for (const c of cols) {
      if (c.key === '_check') {
        doc.rect(x + (c.w - 11) / 2, y + (h - 11) / 2, 11, 11).lineWidth(0.9).strokeColor(INK).stroke();
        if (r._checked) { doc.font('Helvetica-Bold').fontSize(10).fillColor(RED).text('X', x + (c.w - 11) / 2 + 2, y + (h - 11) / 2 + 0.5, { width: 11 }); }
      } else {
        doc.font(c.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs).fillColor(INK)
          .text(String(r[c.key] ?? ''), x + pad, y + 5, { width: Math.max(10, c.w - pad * 2), align: c.align || 'left' });
      }
      x += c.w;
    }
    doc.moveTo(M, y + h).lineTo(M + W, y + h).lineWidth(0.4).strokeColor(LINE).stroke();
    y += h;
  });
  return y;
}

function footer(doc, s, leftText) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const oldBottom = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    const y = doc.page.height - M - 14, W = contentW(doc);
    doc.moveTo(M, y - 6).lineTo(M + W, y - 6).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(leftText || '', M, y, { width: W - 90, height: 24, ellipsis: true });
    doc.text(`Página ${i - range.start + 1} de ${range.count}`, M + W - 90, y, { width: 90, align: 'right' });
    doc.page.margins.bottom = oldBottom;
  }
}

function ensure(doc, y, h) { if (y + h > bottomLimit(doc)) { doc.addPage(); return M; } return y; }

/* ------------------- Columnas configurables del albarán ------------------- */
const BUILTIN = {
  n: { label: 'Nº', weight: 0.55, align: 'right' },
  cat: { label: 'Categoría', weight: 1.7 },
  desc: { label: 'Descripción', weight: 3.4 },
  serie: { label: 'Nº de serie', weight: 2.7, bold: true },
  qty: { label: 'Uds.', weight: 0.7, align: 'right' }
};
const DEFAULT_COLS = ['n', 'cat', 'desc', 'serie', 'qty'];
function fieldInfo(s, key) {
  for (const c of (s.categories || [])) { const f = (c.fields || []).find(x => x.key === key); if (f) return f; }
  return null;
}
function fmtField(f, v, s) {
  if (v === undefined || v === null || v === '') return '—';
  if (!f) return String(v);
  if (f.type === 'bool') return v ? 'Sí' : 'No';
  if (f.type === 'date') return fmtDate(v);
  if (f.type === 'location') { const L = s.layout || {}; const r = (L.racks || []).find(x => x.id === v); if (r) return 'Estantería ' + r.name; const z = (L.zones || []).find(x => x.id === v); return z ? z.name : String(v); }
  return String(v);
}
// Reparte el ancho según el contenido real de cada columna, para que no se partan palabras.
function autoWidths(doc, cols, rows, W, fs) {
  const pad = 12;
  const nat = cols.map(c => {
    if (c.key === '_check') return 30;
    doc.font('Helvetica-Bold').fontSize(fs - 0.5);
    const words = String(c.label).split(/\s+/);
    let w = Math.max(...words.map(x => doc.widthOfString(x))) + pad;
    doc.font(c.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs);
    rows.forEach(r => { if (!r._group) w = Math.max(w, doc.widthOfString(String(r[c.key] ?? '')) + pad); });
    return Math.min(w, W * 0.45);
  });
  const min = cols.map((c, i) => Math.min(nat[i], c.key === '_check' ? 30 : ['n', 'qty', 'balda'].includes(c.key) ? 28 : 54));
  let total = nat.reduce((a, b) => a + b, 0);
  let w = nat.slice();
  if (total <= W) {
    const grow = cols.findIndex(c => c.key === 'desc'); const k = grow >= 0 ? grow : cols.findIndex(c => !['n', 'qty', '_check', 'balda'].includes(c.key));
    w[k >= 0 ? k : w.length - 1] += W - total;
  } else {
    // Se recortan las columnas flexibles en proporción, sin bajar del mínimo.
    for (let it = 0; it < 6 && total > W; it++) {
      const flex = w.map((x, i) => x - min[i]); const fsum = flex.reduce((a, b) => a + b, 0); if (fsum <= 0) break;
      const over = total - W; w = w.map((x, i) => x - over * flex[i] / fsum); total = w.reduce((a, b) => a + b, 0);
    }
    if (total > W) w = w.map(x => x * W / total);
  }
  w = w.map(Math.floor); w[w.length - 1] += W - w.reduce((a, b) => a + b, 0);
  return cols.map((c, i) => ({ ...c, w: w[i] }));
}
// Columnas combinadas: plantilla con {campo}, p. ej. "{cuenta}{dominio}" → usuario@ivcevidensia.es
const comboInfo = (s, k) => (s.combos || []).find(c => c.key === k) || null;
function renderTemplate(t, l, s) {
  const out = String(t || '').replace(/\{(\w+)\}/g, (m, k) => {
    if (k === 'desc') return l.title || '';
    if (k === 'serie') return l.serie || '';
    if (k === 'cat') return l.catName || '';
    if (k === 'qty') return String(l.qty ?? '');
    const v = (l.data || {})[k];
    if (v === undefined || v === null || v === '') return '';
    const f = fieldInfo(s, k); return f ? fmtField(f, v, s) : String(v);
  }).replace(/\s{2,}/g, ' ').trim();
  return out || '—';
}
const colLabel = (cfg, k, def) => ((cfg && cfg.labels && String(cfg.labels[k] || '').trim()) || def);
function deliveryTable(d, s, W, doc, fs) {
  const A = s.albaran || {};
  let keys = Array.isArray(A.columns) && A.columns.length ? A.columns.filter(k => BUILTIN[k] || fieldInfo(s, k) || comboInfo(s, k)) : DEFAULT_COLS;
  if (!keys.length) keys = DEFAULT_COLS;
  const defs = keys.map(k => BUILTIN[k] ? { key: k, ...BUILTIN[k], label: colLabel(A, k, BUILTIN[k].label) }
    : comboInfo(s, k) ? { key: k, label: colLabel(A, k, comboInfo(s, k).label), weight: 2, combo: comboInfo(s, k) }
    : { key: k, label: colLabel(A, k, fieldInfo(s, k).label), weight: 1.6, f: fieldInfo(s, k) });
  const tw = defs.reduce((a, c) => a + c.weight, 0);
  let cols = defs.map(c => ({ key: c.key, label: c.label, w: Math.floor(W * c.weight / tw), align: c.align, bold: c.bold }));
  cols[cols.length - 1].w += W - cols.reduce((a, c) => a + c.w, 0);
  const rows = d.lines.map((l, i) => {
    const r = {};
    defs.forEach(c => {
      r[c.key] = c.combo ? renderTemplate(c.combo.template, l, s) : c.key === 'n' ? i + 1 : c.key === 'cat' ? l.catName : c.key === 'desc' ? l.title : c.key === 'serie' ? (l.serie || '—') : c.key === 'qty' ? l.qty : fmtField(c.f, (l.data || {})[c.key], s);
    });
    return r;
  });
  if (doc) cols = autoWidths(doc, cols, rows, W, fs || 9);
  return { cols, rows };
}

/* ------------------- Albarán de entrega ------------------- */
async function deliveryPdf(d, s) {
  setAccent(s);
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: `Albarán ${d.number}`, Author: s.company || '' } });
  const out = toBuffer(doc);
  const W = contentW(doc), A = s.albaran || {};
  const KT = { traspaso: 'Albarán de traspaso', retirada: 'Albarán de retirada' };
  let y = header(doc, s, String(KT[d.kind] || (s.albaran && s.albaran.titulo) || 'Albarán de entrega').toUpperCase(), [['Número', d.number], ['Fecha', fmtDate(d.date)], ...(d.orderNumber ? [['Pedido', d.orderNumber]] : [])]);

  const sd = d.sede || {};
  const emisor = [A.razonSocial || s.company || '', A.cif ? `CIF: ${A.cif}` : '', A.direccion || '', [A.telefono, A.email].filter(Boolean).join('  ·  ')].filter(Boolean);
  const dest = [d.cliente || '', sd.nombre || '', sd.direccion || '', [sd.cp, sd.ciudad].filter(Boolean).join(' '), sd.pais || '', [sd.contacto, sd.telefono].filter(Boolean).join('  ·  ')].filter(Boolean);
  const show = k => A[k] !== false || d.kind === 'traspaso' || d.kind === 'retirada';
  const almN = id => ((s.almacenes || []).find(a => a.id === id) || {}).nombre || id || '';
  let L1 = 'EMISOR', L2 = 'DESTINATARIO', B1 = emisor, B2 = dest;
  if (d.kind === 'traspaso') { L1 = 'ALMACÉN DE ORIGEN'; L2 = 'ALMACÉN DE DESTINO'; B1 = [almN(d.origen), emisor[0]].filter(Boolean); B2 = [almN(d.destino), `Material de ${d.cliente}`].filter(Boolean); }
  if (d.kind === 'retirada') { L1 = 'RECOGIDO EN (CLIENTE)'; L2 = 'RECIBE'; B1 = dest; B2 = [...emisor.slice(0, 1), almN(d.destino)].filter(Boolean); }
  if (show('showEmisor')) {
    const cw = (W - 14) / 2;
    const h = Math.max(box(doc, 0, 0, cw, '', B1, true), box(doc, 0, 0, cw, '', B2, true));
    drawBox(doc, M, y, cw, h, L1, B1);
    drawBox(doc, M + cw + 14, y, cw, h, L2, B2);
    y += h + 12;
  } else {
    const h = box(doc, 0, 0, W, '', dest, true);
    drawBox(doc, M, y, W, h, 'DESTINATARIO', dest);
    y += h + 12;
  }

  if (show('showInfo')) {
    const info = [['Transportista', d.carrier], ['Referencia', d.ref], ['Preparado por', d.createdByName || d.createdBy]];
    const iw = W / 3;
    doc.rect(M, y, W, 34).fill(SOFT);
    info.forEach(([k, v], i) => {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(k, M + i * iw + 10, y + 6, { width: iw - 20 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(v || '—', M + i * iw + 10, y + 17, { width: iw - 20, ellipsis: true, height: 13 });
    });
    y += 46;
  }

  const ncol = ((s.albaran && s.albaran.columns) || DEFAULT_COLS).length, fs = ncol >= 8 ? 7.5 : ncol >= 6 ? 8.5 : 9;
  const { cols, rows } = deliveryTable(d, s, W, doc, fs);
  y = table(doc, cols, rows, y, { fs });
  const total = d.lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);
  y = ensure(doc, y + 6, 24);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(`Total: ${total} ${total === 1 ? 'unidad' : 'unidades'} en ${d.lines.length} ${d.lines.length === 1 ? 'línea' : 'líneas'}`, M, y + 4, { width: W, align: 'right' });
  y += 24;

  if (d.notes && show('showNotes')) {
    doc.font('Helvetica').fontSize(9.5);
    const nh = doc.heightOfString(d.notes, { width: W - 20 }) + 30;
    y = ensure(doc, y + 4, nh);
    doc.roundedRect(M, y, W, nh, 6).lineWidth(0.8).strokeColor(LINE).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(RED).text('OBSERVACIONES', M + 10, y + 9);
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(d.notes, M + 10, y + 22, { width: W - 20 });
    y += nh + 10;
  }

  if (show('showSignatures')) {
  y = ensure(doc, y + 8, 130);
  const sw = (W - 14) / 2, sh = 118;
  const SIG = d.kind === 'traspaso' ? ['ENTREGADO EN ORIGEN', 'RECIBIDO EN DESTINO'] : d.kind === 'retirada' ? ['ENTREGADO POR (CLIENTE)', 'RECOGIDO POR'] : ['ENTREGADO POR', 'RECIBIDO POR (CLIENTE)'];
  [[SIG[0], ['Nombre:', 'Fecha:', 'Firma:']], [SIG[1], ['Nombre y DNI:', 'Fecha y hora:', 'Firma y sello:']]].forEach(([label, fields], i) => {
    const x = M + i * (sw + 14);
    doc.roundedRect(x, y, sw, sh, 6).lineWidth(0.8).strokeColor(LINE).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(RED).text(label, x + 10, y + 9);
    fields.forEach((f, j) => {
      const fy = y + 30 + j * 26;
      doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(f, x + 10, fy);
      if (j < 2) doc.moveTo(x + 80, fy + 10).lineTo(x + sw - 10, fy + 10).lineWidth(0.5).strokeColor(LINE).stroke();
    });
  });
  y += sh + 10;
  }
  if (show('showDeclaration')) {
    y = ensure(doc, y, 20);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(A.declaracion || 'El destinatario declara recibir el material indicado en buen estado, salvo que se indique lo contrario en observaciones.', M, y, { width: W });
  }

  footer(doc, s, A.pie || `${A.razonSocial || s.company || ''} · Albarán ${d.number}`);
  doc.end();
  return out;
}

/* ------------------- Lista de recogida ------------------- */
const PICK_BUILTIN = { check: 'OK', ubic: 'Ubicación', balda: 'Balda', cat: 'Categoría', desc: 'Descripción', serie: 'Nº de serie', qty: 'Uds.' };
const PICK_DEFAULT = ['check', 'balda', 'cat', 'desc', 'serie', 'qty'];
async function pickingPdf(o, rows, lineSummary, s) {
  setAccent(s);
  const R = s.recogida || {};
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: `Recogida ${o.number}`, Author: s.company || '' } });
  const out = toBuffer(doc);
  const W = contentW(doc);
  const sd = o.sede || {};
  let y = header(doc, s, String(R.titulo || 'Lista de recogida').toUpperCase(), [['Pedido', o.number], ['Cliente', o.cliente], ['Fecha prevista', fmtDate(o.dueDate) || '—']]);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(`Destino: ${[sd.nombre, sd.ciudad].filter(Boolean).join(', ') || '—'}`, M, y);
  y = doc.y + 4;
  if (o.notes) { doc.font('Helvetica').fontSize(9.5).fillColor('#3F3F46').text(o.notes, M, y, { width: W }); y = doc.y + 4; }
  y += 6;

  if (R.showSummary !== false) {
    y = table(doc, [
      { key: 'desc', label: 'Línea del pedido', w: W - 210 },
      { key: 'qty', label: 'Pedido', w: 70, align: 'right' },
      { key: 'res', label: 'Reservado', w: 70, align: 'right' },
      { key: 'miss', label: 'Falta', w: 70, align: 'right', bold: true }
    ], lineSummary, y);
    y += 16;
  }

  y = ensure(doc, y, 40);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Recorrido por el almacén', M, y); y = doc.y + 6;
  const keys = (Array.isArray(R.columns) && R.columns.length ? R.columns : PICK_DEFAULT).filter(k => PICK_BUILTIN[k] || fieldInfo(s, k) || comboInfo(s, k));
  const group = R.groupByLocation !== false;
  const fs = keys.length >= 8 ? 7.5 : keys.length >= 7 ? 8.5 : 9;
  let cols = keys.map(k => k === 'check' ? { key: '_check', label: colLabel(R, k, 'OK') } : { key: k, label: colLabel(R, k, PICK_BUILTIN[k] || (comboInfo(s, k) || {}).label || fieldInfo(s, k).label), align: ['qty'].includes(k) ? 'right' : k === 'balda' ? 'center' : undefined, bold: k === 'serie' });
  const data = [];
  let last = null;
  rows.forEach(r => {
    if (group && r.ubic !== last) { data.push({ _group: r.ubic }); last = r.ubic; }
    const row = { _checked: r._checked };
    keys.forEach(k => { row[k === 'check' ? '_check' : k] = PICK_BUILTIN[k] ? r[k] : comboInfo(s, k) ? renderTemplate(comboInfo(s, k).template, { title: r.desc, serie: r.serie, catName: r.cat, qty: r.qty, data: r.data }, s) : fmtField(fieldInfo(s, k), (r.data || {})[k], s); });
    data.push(row);
  });
  cols = autoWidths(doc, cols, data, W, fs);
  y = table(doc, cols, data, y, { noZebra: group, fs });

  if (R.showSignature !== false) {
    y = ensure(doc, y + 18, 60);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Preparado por:', M, y + 4);
    doc.moveTo(M + 80, y + 14).lineTo(M + 280, y + 14).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.text('Fecha:', M + 300, y + 4);
    doc.moveTo(M + 340, y + 14).lineTo(M + W, y + 14).stroke();
  }

  footer(doc, s, `${R.titulo || 'Lista de recogida'} ${o.number} · generada el ${fmtDT(new Date().toISOString())}`);
  doc.end();
  return out;
}

/* ------------------- Certificado de borrado de datos ------------------- */
async function certificatePdf(d, s) {
  setAccent(s);
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: `Certificado ${d.number}`, Author: s.company || '' } });
  const out = toBuffer(doc), W = contentW(doc), A = s.albaran || {};
  let y = header(doc, s, 'CERTIFICADO DE BORRADO', [['Certificado', d.number], ['Fecha', fmtDate(d.date)], ['Equipos', String(d.lines.length)]]);
  const emisor = [A.razonSocial || s.company || '', A.cif ? `CIF: ${A.cif}` : '', A.direccion || '', [A.telefono, A.email].filter(Boolean).join('  ·  ')].filter(Boolean);
  const sd = d.sede || {};
  const cli = [d.cliente || '', sd.nombre || '', sd.direccion || '', [sd.cp, sd.ciudad].filter(Boolean).join(' ')].filter(Boolean);
  const cw = (W - 14) / 2, h = Math.max(box(doc, 0, 0, cw, '', emisor, true), box(doc, 0, 0, cw, '', cli, true));
  drawBox(doc, M, y, cw, h, 'EMPRESA QUE CERTIFICA', emisor); drawBox(doc, M + cw + 14, y, cw, h, 'CLIENTE', cli); y += h + 14;
  const metodos = [...new Set(d.lines.map(l => (l.borrado || {}).metodo).filter(Boolean))];
  doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(`${A.razonSocial || s.company || 'La empresa'} certifica que los soportes de almacenamiento de los equipos relacionados a continuación, propiedad de ${d.cliente || 'el cliente'}, han sido sometidos a un proceso de borrado de datos mediante ${metodos.join(', ') || 'los métodos indicados'}, de forma que la información que contenían no es recuperable por medios técnicos razonables, conforme a las prácticas descritas en la norma NIST SP 800-88 y en cumplimiento del artículo 32 del Reglamento (UE) 2016/679 (RGPD) sobre la seguridad del tratamiento.`, M, y, { width: W, align: 'justify', lineGap: 2 });
  y = doc.y + 14;
  const fs = 8;
  let cols = [{ key: 'n', label: 'Nº', align: 'right' }, { key: 'serie', label: 'Nº de serie', bold: true }, { key: 'desc', label: 'Equipo' }, { key: 'metodo', label: 'Método' }, { key: 'herr', label: 'Herramienta' }, { key: 'fecha', label: 'Fecha' }, { key: 'tec', label: 'Técnico' }, { key: 'res', label: 'Resultado' }];
  const rows = d.lines.map((l, i) => { const b = l.borrado || {}; return { n: i + 1, serie: l.serie || '—', desc: l.title, metodo: b.metodo || '—', herr: b.herramienta || '—', fecha: fmtDate(b.fecha), tec: b.tecnico || '—', res: b.resultado || '—' }; });
  cols = autoWidths(doc, cols, rows, W, fs);
  y = table(doc, cols, rows, y, { fs });
  y = ensure(doc, y + 18, 150);
  const sw = (W - 14) / 2;
  [['Técnico responsable del borrado', [...new Set(d.lines.map(l => (l.borrado || {}).tecnico).filter(Boolean))].join(', ')], ['Por la empresa', A.razonSocial || s.company || '']].forEach(([t, v], i) => {
    const x = M + i * (sw + 14);
    doc.roundedRect(x, y, sw, 110, 6).lineWidth(0.8).strokeColor(LINE).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(RED).text(t.toUpperCase(), x + 12, y + 10, { width: sw - 24 });
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(v || '', x + 12, y + 26, { width: sw - 24 });
    doc.fontSize(8.5).fillColor(MUTED).text('Firma y fecha:', x + 12, y + 80);
  });
  y += 124;
  doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(`Certificado ${d.number} emitido el ${fmtDate(d.date)} por ${d.createdByName || d.createdBy}. Los registros de cada borrado se conservan en el sistema de inventario.`, M, ensure(doc, y, 20), { width: W });
  footer(doc, s, `Certificado de borrado ${d.number}`);
  doc.end();
  return out;
}

module.exports = { certificatePdf, deliveryPdf, pickingPdf, deliveryTable, fmtField, BUILTIN, DEFAULT_COLS, PICK_BUILTIN, PICK_DEFAULT };
