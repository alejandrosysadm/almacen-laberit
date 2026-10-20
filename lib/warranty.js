'use strict';
/*
 * Garantía del fabricante: consulta por número de serie en las APIs oficiales de Dell, HP y Lenovo.
 * Las credenciales van en el servidor (secretos.env o .env), nunca en la web:
 *   DELL_CLIENT_ID, DELL_CLIENT_SECRET      (Dell TechDirect · Warranty API)
 *   HP_API_KEY, HP_API_SECRET               (HP Developer Portal · Warranty API)
 *   LENOVO_CLIENT_ID                         (Lenovo · Warranty API)
 * Opcional, para pruebas o si el fabricante cambia de dirección: DELL_API_BASE, HP_API_BASE, LENOVO_API_BASE.
 */
const TIMEOUT = 15000;
const env = k => String(process.env[k] || '').trim();
const base = (k, d) => (env(k) || d).replace(/\/+$/, '');

function brandOf(marca) {
  const m = String(marca || '').toLowerCase();
  if (/\bdell\b|alienware/.test(m)) return 'dell';
  if (/\bhp\b|hewlett|\bhpe\b/.test(m)) return 'hp';
  if (/lenovo|thinkpad|thinkcentre|ideapad/.test(m)) return 'lenovo';
  return null;
}
async function req(url, opts = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {}
    if (!r.ok) { const e = new Error(`El fabricante respondió ${r.status}${data && (data.error_description || data.message || data.error) ? ': ' + (data.error_description || data.message || data.error) : ''}`); e.status = r.status; throw e; }
    return data;
  } catch (e) { if (e.name === 'AbortError') throw new Error('El fabricante no responde (tiempo agotado).'); throw e; }
  finally { clearTimeout(t); }
}
const day = v => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
const tokens = {};
async function oauth(key, url, body, headers = {}) {
  const t = tokens[key]; if (t && t.exp > Date.now() + 60000) return t.v;
  const d = await req(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body });
  if (!d || !d.access_token) throw new Error('El fabricante no ha devuelto un token de acceso. Revisa las credenciales.');
  tokens[key] = { v: d.access_token, exp: Date.now() + (Number(d.expires_in) || 3000) * 1000 };
  return d.access_token;
}
// Resume una lista de coberturas: la fecha de fin más lejana y su descripción.
function summarize(list, getEnd, getStart, getDesc) {
  let best = null, start = '';
  (list || []).forEach(x => { const e = day(getEnd(x)); if (e && (!best || e > best.end)) best = { end: e, desc: getDesc(x) || '' }; const s = day(getStart(x)); if (s && (!start || s < start)) start = s; });
  return { garantiaHasta: best ? best.end : '', servicio: best ? best.desc : '', inicio: start };
}

const providers = {
  dell: {
    name: 'Dell', vars: ['DELL_CLIENT_ID', 'DELL_CLIENT_SECRET'],
    configured: () => !!(env('DELL_CLIENT_ID') && env('DELL_CLIENT_SECRET')),
    async lookup(serial) {
      const B = base('DELL_API_BASE', 'https://apigtwb2c.us.dell.com');
      const tok = await oauth('dell', `${B}/auth/oauth/v2/token`, new URLSearchParams({ grant_type: 'client_credentials', client_id: env('DELL_CLIENT_ID'), client_secret: env('DELL_CLIENT_SECRET') }));
      const d = await req(`${B}/PROD/sbil/eapi/v5/asset-entitlements?servicetags=${encodeURIComponent(serial)}`, { headers: { Authorization: `Bearer ${tok}`, Accept: 'application/json' } });
      const a = (Array.isArray(d) ? d : [d]).find(x => x && String(x.serviceTag || '').toUpperCase() === serial.toUpperCase()) || (Array.isArray(d) ? d[0] : d);
      if (!a || a.invalid) return null;
      const s = summarize(a.entitlements, x => x.endDate, x => x.startDate, x => x.serviceLevelDescription);
      return { modelo: a.productLineDescription || a.systemDescription || '', marca: 'Dell', envio: day(a.shipDate), ...s };
    }
  },
  hp: {
    name: 'HP', vars: ['HP_API_KEY', 'HP_API_SECRET'],
    configured: () => !!(env('HP_API_KEY') && env('HP_API_SECRET')),
    async lookup(serial, pn) {
      const B = base('HP_API_BASE', 'https://warranty.api.hp.com');
      const tok = await oauth('hp', `${B}/oauth/v1/token`, new URLSearchParams({ grant_type: 'client_credentials' }), { Authorization: 'Basic ' + Buffer.from(`${env('HP_API_KEY')}:${env('HP_API_SECRET')}`).toString('base64') });
      const body = [{ sn: serial, ...(pn ? { pn } : {}) }];
      const d = await req(`${B}/productwarranty/v2/queries`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
      const a = (Array.isArray(d) ? d : (d && (d.results || d.items)) || [d]).find(Boolean);
      if (!a || /not\s*found|invalid/i.test(String(a.status || ''))) return null;
      const offers = a.offers || a.warranties || a.entitlements || [];
      const s = offers.length ? summarize(offers, x => x.serviceObligationLineItemEndDate || x.endDate || x.warrantyEndDate, x => x.serviceObligationLineItemStartDate || x.startDate, x => x.offerDescription || x.description || x.serviceLevel)
        : { garantiaHasta: day(a.endDate || a.warrantyEndDate), inicio: day(a.startDate || a.warrantyStartDate), servicio: a.warrantyType || '' };
      return { modelo: a.productDescription || a.productName || '', marca: 'HP', referencia: a.pn || a.productNumber || '', ...s };
    }
  },
  lenovo: {
    name: 'Lenovo', vars: ['LENOVO_CLIENT_ID'],
    configured: () => !!env('LENOVO_CLIENT_ID'),
    async lookup(serial) {
      const B = base('LENOVO_API_BASE', 'https://supportapi.lenovo.com');
      const d = await req(`${B}/v2.5/warranty?Serial=${encodeURIComponent(serial)}`, { headers: { ClientID: env('LENOVO_CLIENT_ID'), Accept: 'application/json' } });
      if (!d || d.ErrorCode || (!d.Warranty && !d.Product)) return null;
      const s = summarize(d.Warranty, x => x.End, x => x.Start, x => x.Name || x.Description);
      return { modelo: d.ProductName || d.Product || d.MachineType || '', marca: 'Lenovo', envio: day(d.Shipped), ...s };
    }
  }
};

module.exports = function setupWarranty({ db }) {
  db.exec('CREATE TABLE IF NOT EXISTS warranty_cache (k TEXT PRIMARY KEY, data TEXT NOT NULL, fetched_at INTEGER NOT NULL)');
  const TTL = 7 * 86400000;
  async function lookup(marca, serial, { force = false, pn = '' } = {}) {
    const brand = brandOf(marca); serial = String(serial || '').trim().toUpperCase();
    if (!serial) throw Object.assign(new Error('Falta el número de serie.'), { status: 400 });
    if (!brand) throw Object.assign(new Error('Solo se consulta la garantía de Dell, HP y Lenovo.'), { status: 400 });
    const P = providers[brand];
    if (!P.configured()) throw Object.assign(new Error(`La consulta de garantía de ${P.name} no está configurada en el servidor.`), { status: 400 });
    const k = brand + ':' + serial;
    const c = db.prepare('SELECT * FROM warranty_cache WHERE k = ?').get(k);
    if (c && !force && Date.now() - c.fetched_at < TTL) return { ...JSON.parse(c.data), cached: true };
    const r = await P.lookup(serial, pn);
    if (!r) throw Object.assign(new Error(`${P.name} no reconoce el número de serie ${serial}.`), { status: 404 });
    const out = { proveedor: P.name, serie: serial, ...r, consultado: new Date().toISOString() };
    db.prepare('INSERT INTO warranty_cache (k, data, fetched_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at').run(k, JSON.stringify(out), Date.now());
    return out;
  }
  const status = () => Object.entries(providers).map(([id, p]) => ({ id, name: p.name, configured: p.configured(), vars: p.vars }));
  return { lookup, status, brandOf };
};
module.exports.brandOf = brandOf;
