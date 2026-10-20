'use strict';
/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const nowISO = () => new Date().toISOString();
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDate = s => { if (!s) return ''; const d = new Date(s.length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? esc(s) : d.toLocaleDateString('es-ES'); };
const fmtDT = s => s ? new Date(s).toLocaleString('es-ES', {dateStyle:'short', timeStyle:'short'}) : '';
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'x';
const newId = () => {
  const a = new Uint8Array(10); crypto.getRandomValues(a);
  return Date.now().toString(36) + [...a].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
};
const plural = (n, s, p) => `${n.toLocaleString('es-ES')} ${n === 1 ? s : (p || s + 's')}`;
const daysUntil = s => { if (!s) return null; const d = new Date(s + 'T00:00:00'); return Math.round((d - new Date(today() + 'T00:00:00')) / 86400000); };
const VENDOR = {};
// Las librerías pesadas (3D, Excel, cámara) se descargan solo cuando hacen falta.
function loadVendor(src) {
  if (!VENDOR[src]) VENDOR[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete VENDOR[src]; rej(new Error('No se ha podido cargar ' + src)); }; document.head.appendChild(s); });
  return VENDOR[src];
}
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const memSS = {};
const SS = {
  get(k) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return memSS[k] || null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { memSS[k] = v; } },
  del(k) { try { sessionStorage.removeItem(k); } catch {} delete memSS[k]; }
};
function toast(msg, kind = 'ok', ms = 3200) {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function initials(name) { return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }

const ICONS = {
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  swap:'<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  cube:'<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>',
  users:'<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-5.6"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  send:'<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  columns:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
  shield:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  camera:'<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>',
  truck:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  down:'<path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/>',
  up:'<path d="M12 21V9m0 0l-5 5m5-5l5 5M4 3h16"/>',
  x:'<path d="M18 6L6 18M6 6l12 12"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  qr:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3z"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  moon:'<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  logout:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2M17 6l3 3M14 9l2 2"/>',
  chevup:'<path d="M6 15l6-6 6 6"/>',
  chevdown:'<path d="M6 9l6 6 6-6"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  file:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  top:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>',
  reset:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* =========================================================
   Configuración por defecto
   ========================================================= */
const PERMS = [
  ['inv.view', 'Ver inventario'],
  ['inv.create', 'Dar de alta material'],
  ['inv.edit', 'Editar material'],
  ['inv.delete', 'Eliminar material'],
  ['inv.move', 'Entradas, salidas y movimientos masivos'],
  ['inv.export', 'Exportar y generar etiquetas'],
  ['inv.import', 'Importar desde CSV'],
  ['map.view', 'Ver mapa 3D'],
  ['audit.view', 'Ver registro de actividad'],
  ['settings.manage', 'Cambiar ajustes, listas y categorías'],
  ['users.manage', 'Gestionar usuarios y roles']
];
const FIELD_TYPES = {text:'Texto', number:'Número', select:'Lista', bool:'Sí / No', date:'Fecha', textarea:'Texto largo', location:'Ubicación'};
const LOCKED_FIELDS = ['estado', 'ubicacion', 'nivel'];

function F(key, label, type, extra = {}) { return Object.assign({key, label, type}, extra); }
function commonFields(opts = {}) {
  return [
    F('pais', 'País de destino', 'select', {list:'paises', default:'España', table:true, required:true}),
    F('cliente', 'Cliente', 'select', {list:'clientes', default:'IVCEvidensia', table:true, required:true}),
    F('condicion', 'Condición', 'select', {list:'condiciones', default:'Nuevo', table:true, required:true}),
    F('estado', 'Estado', 'select', {list:'estados', default:'En stock', table:true, required:true}),
    F('ubicacion', 'Ubicación', 'location', {table:true}),
    F('nivel', 'Balda / nivel', 'number', {default:1}),
    F('albaran', 'Albarán / pedido', 'text'),
    F('fecha_entrada', 'Fecha de entrada', 'date', {default:'today'}),
    ...(opts.noWarranty ? [] : [F('garantia', 'Garantía hasta', 'date', {expiry:true})]),
    F('notas', 'Notas', 'textarea')
  ];
}
function defaultSettings() {
  return {
    v: 1,
    company: 'Laberit',
    brand: {mode:'text', bg:'red', subtitle:'Control de almacén', logo:''},
    mfaRequired: 'off', mfaRememberDays: 30,
    estadosSistema: {stock:['En stock'], reservado:'Reservado', enviado:'Enviado', baja:['Baja'], transito:'En tránsito', retirado:'Retirado'},
    sedes: [],
    albaran: {razonSocial:'', cif:'', direccion:'', telefono:'', email:'', pie:'', declaracion:'', columns:['n', 'cat', 'desc', 'serie', 'qty'],
      showEmisor:true, showInfo:true, showNotes:true, showSignatures:true, showDeclaration:true, defaultSedeId:'', generateDefault:true, mailDefault:false,
      emailTo:[], emailSubject:'Salida de material · Albarán {albaran} · {sede}', emailBody:'Hola,\n\nOs adjuntamos el albarán {albaran} con el material enviado a {sede} ({unidades} unidades).\n\nUn saludo,\n{usuario}'},
    stockRules: [
      {id:'r-portatiles', name:'Portátiles', cat:'equipos', conds:[{k:'tipo', v:'Portátil'}], min:5, emails:[], active:true},
      {id:'r-sobremesas', name:'Sobremesas', cat:'equipos', conds:[{k:'tipo', v:'Sobremesa'}], min:5, emails:[], active:true},
      {id:'r-tactiles', name:'Sobremesas táctiles', cat:'equipos', conds:[{k:'tipo', v:'Sobremesa táctil'}], min:3, emails:[], active:true}
    ],
    stockAlertEmails: [], stockRemindDays: 7,
    sessionMinutes: 30,
    minPassword: 10,
    maxAttempts: 5,
    lockMinutes: 10,
    expiryWarnDays: 45,
    lists: {
      paises: ['España', 'Portugal'],
      clientes: ['IVCEvidensia'],
      condiciones: ['Nuevo', 'Refurbished'],
      estados: ['En stock', 'Reservado', 'En preparación', 'En tránsito', 'Enviado', 'Instalado', 'RMA', 'Retirado', 'Baja'],
      tipos_equipo: ['Sobremesa', 'Sobremesa táctil', 'Portátil', 'Mini PC', 'Workstation', 'All-in-One'],
      marcas_equipo: ['Lenovo', 'HP', 'Dell', 'Fujitsu', 'Apple'],
      sistemas: ['Windows 11 Pro', 'Windows 10 Pro', 'Linux', 'Sin sistema'],
      marcas_monitor: ['Dell', 'HP', 'Lenovo', 'LG', 'Samsung', 'Philips', 'AOC'],
      pulgadas: ['22', '24', '27', '32', '34'],
      tipos_soporte: ['Mesa simple', 'Mesa doble', 'Mesa triple', 'Pared', 'Brazo de gas'],
      marcas_soporte: ['Genérico', 'Ergotron', 'Equip', 'Fellowes', 'StarTech'],
      vesa: ['75x75', '100x100', '75x75 / 100x100', '200x200'],
      marcas_red: ['Fortinet', 'Cisco', 'HPE Aruba', 'Ubiquiti', 'TP-Link', 'Netgear'],
      modelos_switch: ['FortiSwitch 108F', 'FortiSwitch 108F-POE', 'FortiSwitch 124F', 'FortiSwitch 124F-POE', 'FortiSwitch 148F', 'FortiSwitch 148F-POE', 'FortiSwitch 224E'],
      puertos_switch: ['8', '16', '24', '48'],
      modelos_firewall: ['FortiGate 40F', 'FortiGate 60F', 'FortiGate 70F', 'FortiGate 80F', 'FortiGate 100F', 'FortiGate 200F'],
      tipos_accesorio: ['Teclado', 'Ratón', 'Docking station', 'Cable de red', 'Cable de alimentación', 'Adaptador']
    },
    listLabels: {
      paises:'Países', clientes:'Clientes', condiciones:'Condiciones', estados:'Estados', tipos_equipo:'Tipos de equipo',
      marcas_equipo:'Marcas de equipos', sistemas:'Sistemas operativos', marcas_monitor:'Marcas de monitores', pulgadas:'Tamaños de monitor',
      tipos_soporte:'Tipos de soporte', marcas_soporte:'Marcas de soportes', vesa:'Anclajes VESA', marcas_red:'Marcas de red',
      modelos_switch:'Modelos de switch', puertos_switch:'Número de puertos', modelos_firewall:'Modelos de firewall', tipos_accesorio:'Tipos de accesorio'
    },
    categories: [
      {id:'equipos', name:'Equipos', icon:'💻', color:'#C8102E', serialized:true, minStock:5, fields:[
        F('serie', 'Número de serie', 'text', {required:true, unique:true, table:true}),
        F('tipo', 'Tipo', 'select', {list:'tipos_equipo', default:'Portátil', table:true, required:true}),
        F('marca', 'Marca', 'select', {list:'marcas_equipo', default:'Lenovo', table:true}),
        F('modelo', 'Modelo', 'text', {table:true}),
        F('cpu', 'Procesador', 'text'),
        F('ram', 'RAM (GB)', 'number'),
        F('disco', 'Almacenamiento', 'text'),
        F('so', 'Sistema operativo', 'select', {list:'sistemas', default:'Windows 11 Pro'}),
        ...commonFields()
      ]},
      {id:'monitores', name:'Monitores', icon:'🖥️', color:'#1F4FBF', serialized:true, minStock:5, fields:[
        F('serie', 'Número de serie', 'text', {required:true, unique:true, table:true}),
        F('marca', 'Marca', 'select', {list:'marcas_monitor', default:'Dell', table:true}),
        F('modelo', 'Modelo', 'text', {table:true}),
        F('pulgadas', 'Pulgadas', 'select', {list:'pulgadas', default:'24', table:true}),
        ...commonFields()
      ]},
      {id:'soportes', name:'Soportes de monitor', icon:'🦾', color:'#0F766E', serialized:false, minStock:10, fields:[
        F('tipo', 'Tipo de soporte', 'select', {list:'tipos_soporte', default:'Mesa simple', table:true, required:true}),
        F('marca', 'Marca', 'select', {list:'marcas_soporte', default:'Genérico', table:true}),
        F('modelo', 'Modelo', 'text', {table:true}),
        F('vesa', 'VESA', 'select', {list:'vesa', default:'75x75 / 100x100'}),
        F('cantidad', 'Cantidad', 'number', {default:1, required:true, table:true}),
        ...commonFields({noWarranty:true})
      ]},
      {id:'switches', name:'Switches', icon:'🔀', color:'#7C3AED', serialized:true, minStock:2, fields:[
        F('serie', 'Número de serie', 'text', {required:true, unique:true, table:true}),
        F('marca', 'Marca', 'select', {list:'marcas_red', default:'Fortinet', table:true, required:true}),
        F('modelo', 'Modelo', 'select', {list:'modelos_switch', default:'FortiSwitch 124F', table:true}),
        F('puertos', 'Número de puertos', 'select', {list:'puertos_switch', default:'24', table:true}),
        F('poe', 'PoE', 'bool', {default:false, table:true}),
        F('gestionable', 'Gestionable', 'bool', {default:true}),
        F('firmware', 'Firmware', 'text'),
        F('mac', 'MAC', 'text'),
        ...commonFields()
      ]},
      {id:'firewalls', name:'Firewalls', icon:'🛡️', color:'#B45309', serialized:true, minStock:2, fields:[
        F('serie', 'Número de serie', 'text', {required:true, unique:true, table:true}),
        F('marca', 'Marca', 'select', {list:'marcas_red', default:'Fortinet', table:true, required:true}),
        F('modelo', 'Modelo', 'select', {list:'modelos_firewall', default:'FortiGate 60F', table:true}),
        F('firmware', 'FortiOS / firmware', 'text'),
        F('mac', 'MAC', 'text'),
        F('licencia', 'Licencia UTM hasta', 'date', {expiry:true, table:true}),
        F('ha', 'En clúster HA', 'bool', {default:false}),
        ...commonFields()
      ]},
      {id:'accesorios', name:'Accesorios', icon:'🔌', color:'#475569', serialized:false, minStock:10, fields:[
        F('tipo', 'Tipo', 'select', {list:'tipos_accesorio', default:'Teclado', table:true, required:true}),
        F('marca', 'Marca', 'text', {table:true}),
        F('modelo', 'Modelo', 'text', {table:true}),
        F('cantidad', 'Cantidad', 'number', {default:1, required:true, table:true}),
        ...commonFields({noWarranty:true})
      ]}
    ],
    roles: {
      admin: {name:'Administrador', perms:'*', locked:true},
      tecnico: {name:'Técnico de almacén', perms:['inv.view','inv.create','inv.edit','inv.move','inv.export','inv.import','map.view','audit.view']},
      lector: {name:'Consulta', perms:['inv.view','inv.export','map.view']}
    },
    layout: {
      width: 34, depth: 24,
      racks: [
        {id:'A1', name:'A1', x:-11, z:-6, rot:0, len:5, levels:4},
        {id:'A2', name:'A2', x:-4.5, z:-6, rot:0, len:5, levels:4},
        {id:'A3', name:'A3', x:2, z:-6, rot:0, len:5, levels:4},
        {id:'A4', name:'A4', x:8.5, z:-6, rot:0, len:5, levels:4},
        {id:'B1', name:'B1', x:-11, z:0, rot:0, len:5, levels:4},
        {id:'B2', name:'B2', x:-4.5, z:0, rot:0, len:5, levels:4},
        {id:'B3', name:'B3', x:2, z:0, rot:0, len:5, levels:4},
        {id:'B4', name:'B4', x:8.5, z:0, rot:0, len:5, levels:4},
        {id:'C1', name:'C1', x:14.5, z:-3, rot:90, len:8, levels:3}
      ],
      zones: [
        {id:'Z-REC', name:'Recepción', x:-11, z:8, w:8, d:5, color:'#1F4FBF'},
        {id:'Z-PRE', name:'Preparación', x:-1, z:8, w:8, d:5, color:'#B45309'},
        {id:'Z-EXP', name:'Expedición', x:9, z:8, w:8, d:5, color:'#C8102E'}
      ]
    }
  };
}
function mergeSettings(s) {
  const d = defaultSettings();
  const out = Object.assign({}, d, clone(s || {}));
  out.lists = (s && s.lists) ? clone(s.lists) : d.lists;
  out.listLabels = Object.assign({}, d.listLabels, (s && s.listLabels) || {});
  out.categories = (s && Array.isArray(s.categories) && s.categories.length) ? clone(s.categories) : d.categories;
  out.roles = (s && s.roles) ? clone(s.roles) : d.roles;
  out.roles.admin = {name: (out.roles.admin && out.roles.admin.name) || 'Administrador', perms:'*', locked:true};
  out.brand = Object.assign({}, d.brand, (s && s.brand) || {});
  out.sedes = (s && Array.isArray(s.sedes)) ? clone(s.sedes) : [];
  out.albaran = Object.assign({}, d.albaran, (s && s.albaran) || {});
  out.numeracion = Object.assign({albaran:'ALB', pedido:'PED', traspaso:'TRA', retirada:'RET', certificado:'CERT', anual:true, digitos:4}, (s && s.numeracion) || {});
  out.recogida = Object.assign({titulo:'', columns:['check', 'balda', 'cat', 'desc', 'serie', 'qty'], showSummary:true, showSignature:true, groupByLocation:true}, (s && s.recogida) || {});
  out.tema = Object.assign({primario:'#C8102E'}, (s && s.tema) || {});
  out.splash = Object.assign({enabled:true, show:'auto', title:'', sub:'', msg:'', anim:'rack', bg:'auto', minMs:650}, (s && s.splash) || {});
  out.combos = (s && Array.isArray(s.combos)) ? clone(s.combos) : [];
  out.albaran.labels = Object.assign({}, out.albaran.labels || {}); out.recogida.labels = Object.assign({}, out.recogida.labels || {});
  out.stockRules = (s && Array.isArray(s.stockRules)) ? clone(s.stockRules) : d.stockRules;
  out.layout = (s && s.layout) ? clone(s.layout) : d.layout;
  out.layout.racks = out.layout.racks || []; out.layout.zones = out.layout.zones || [];
  out.almacenes = (s && Array.isArray(s.almacenes) && s.almacenes.length) ? clone(s.almacenes)
    : [{id:'principal', nombre:'Almacén principal', clientes: ((s && s.lists && s.lists.clientes) || d.lists.clientes).slice(), layout: clone(out.layout)}];
  out.almacenes.forEach(a => { a.clientes = a.clientes || []; a.layout = a.layout || {width:30, depth:20, racks:[], zones:[]}; a.layout.racks = a.layout.racks || []; a.layout.zones = a.layout.zones || []; });
  out.estadosSistema = Object.assign({}, d.estadosSistema, (s && s.estadosSistema) || {});
  return out;
}

/* =========================================================
   Conexión con el servidor
   ========================================================= */
async function API(method, url, body) {
  let r;
  const headers = {'X-Requested-With':'fetch'};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try { r = await fetch(url, {method, credentials:'same-origin', headers, body: body !== undefined ? JSON.stringify(body) : undefined}); }
  catch { throw new Error('No hay conexión con el servidor del almacén.'); }
  let data = null; const txt = await r.text(); if (txt) { try { data = JSON.parse(txt); } catch {} }
  if (r.status === 401 && Auth.user && !/\/api\/(login|logout)/.test(url)) Auth.expired();
  if (!r.ok) { const e = new Error((data && data.error) || `Error del servidor (${r.status}).`); e.status = r.status; throw e; }
  return data;
}
const Store = {
  mode:'server', items:{}, users:{}, settings:null, entries:[], needsSetup:false, setupToken:false, initError:null, online:false,
  loaded:{items:false, users:false, settings:false}, onChange:null, _t:null, es:null,
  emit(kind) { clearTimeout(this._t); this._pend = (this._pend || new Set()).add(kind); this._t = setTimeout(() => { const k = this._pend; this._pend = null; this.onChange && this.onChange(k); }, 25); },
  async init() {
    try {
      const b = await API('GET', '/api/bootstrap');
      this.settings = mergeSettings(b.settings); this.needsSetup = !!b.needsSetup; this.setupToken = !!b.setupToken; this.mailEnabled = !!b.mailEnabled;
      if (b.user) { Auth.user = b.user; Auth.touch(); if (!b.user.mustChange && !b.user.mfaEnroll) await this.loadAll(); }
      this.loaded = {items:true, users:true, settings:true};
    } catch (e) { this.initError = e.message; }
    this.emit('all');
  },
  orders: [], deliveries: [],
  async loadOrders() { if (!Auth.can('inv.view')) return; try { this.orders = await API('GET', '/api/orders'); } catch {} this.emit('orders'); },
  async loadDeliveries() { if (!Auth.can('inv.view')) return; try { this.deliveries = await API('GET', '/api/deliveries'); } catch {} this.emit('deliveries'); },
  async loadAll() {
    await this.loadSettings();
    await Promise.all([this.loadItems(), this.loadUsers(), this.loadAudit(), this.loadOrders(), this.loadDeliveries()]);
    this.connect();
  },
  async loadSettings() { const s = await API('GET', '/api/settings'); this.settings = mergeSettings(s); this.emit('settings'); },
  async loadItems() {
    if (!Auth.can('inv.view')) { this.items = {}; return; }
    const a = await API('GET', '/api/items'); const m = {}; a.forEach(i => { m[i.id] = i; }); this.items = m; this.emit('items');
  },
  async loadUsers() {
    if (Auth.can('users.manage')) { const a = await API('GET', '/api/users'); const m = {}; a.forEach(u => { m[u.id] = u; }); this.users = m; }
    else this.users = Auth.user ? {[Auth.user.id]: Auth.user} : {};
    this.emit('users');
  },
  async loadAudit() { this.entries = (await API('GET', '/api/audit').catch(() => [])) || []; this.emit('audit'); },
  async refreshMe() { const r = await API('GET', '/api/me'); Auth.user = r.user; },
  async reloadAll() { try { await this.refreshMe(); await this.loadSettings(); await Promise.all([this.loadItems(), this.loadUsers(), this.loadAudit(), this.loadOrders(), this.loadDeliveries()]); } catch {} },
  connect() {
    this.disconnect(); if (!window.EventSource || !Auth.user) return;
    const es = new EventSource('/api/events'); this.es = es;
    es.onopen = () => { this.online = true; if (this._down) { this._down = false; this.reloadAll(); } this.emit('net'); };
    es.onerror = () => {
      this.online = false; this._down = true; this.emit('net');
      if (es.readyState === 2) setTimeout(() => { if (Auth.user && this.es === es) API('GET', '/api/ping').then(() => this.connect()).catch(() => {}); }, 5000);
    };
    es.addEventListener('items', e => { const p = JSON.parse(e.data); (p.upsert || []).forEach(i => { this.items[i.id] = i; }); (p.del || []).forEach(id => { delete this.items[id]; }); this.emit('items'); });
    es.addEventListener('settings', e => { this.settings = mergeSettings(JSON.parse(e.data)); this.emit('settings'); });
    es.addEventListener('users', async () => { try { const prevRole = Auth.user && Auth.user.role; await this.refreshMe(); await this.loadUsers(); if (Auth.user && Auth.user.role !== prevRole) await this.reloadAll(); } catch {} });
    es.addEventListener('audit', e => { this.entries.unshift(JSON.parse(e.data)); if (this.entries.length > 5000) this.entries.length = 5000; this.emit('audit'); });
    es.addEventListener('reload', () => this.reloadAll());
    let tO, tD;
    es.addEventListener('orders', () => { clearTimeout(tO); tO = setTimeout(() => { this.loadOrders(); if (S.view === 'mapa' && S.route) loadRouteOrder(); if (S.view === 'pedidos' && S.orderId) loadOrderDetail(S.orderId, true); }, 250); });
    es.addEventListener('deliveries', () => { clearTimeout(tD); tD = setTimeout(() => this.loadDeliveries(), 250); });
  },
  disconnect() { if (this.es) { this.es.close(); this.es = null; } this.online = false; },
  async putItem(it) { await this.putMany([it]); },
  async putMany(list, progress) {
    let done = 0;
    for (let i = 0; i < list.length; i += 250) {
      const chunk = list.slice(i, i + 250);
      const saved = await API('POST', '/api/items', {items: chunk});
      saved.forEach(x => { this.items[x.id] = x; }); done += chunk.length; progress && progress(done);
    }
    this.emit('items');
  },
  async delItem(id) { await this.delMany([id]); },
  async delMany(ids, progress) {
    for (let i = 0; i < ids.length; i += 1000) {
      const c = ids.slice(i, i + 1000);
      await API('POST', '/api/items/delete', {ids: c}); c.forEach(id => { delete this.items[id]; }); progress && progress(i + c.length);
    }
    this.emit('items');
  },
  async putSettings(s) { const r = await API('PUT', '/api/settings', s); this.settings = mergeSettings(r); this.emit('settings'); },
  log(action, detail, ref) {
    if (!Auth.user) return Promise.resolve();
    return API('POST', '/api/audit', {a: action, d: String(detail || '').slice(0, 400), r: ref || ''}).catch(() => {});
  },
  auditList() { return this.entries; }
};

/* =========================================================
   Sesión (la autenticación real ocurre en el servidor)
   ========================================================= */
const Auth = {
  user: null, last: 0,
  pwIssues(pw) {
    const min = (Store.settings && Store.settings.minPassword) || 10; const out = [];
    if (pw.length < min) out.push(`al menos ${min} caracteres`);
    if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) out.push('mayúsculas y minúsculas');
    if (!/\d/.test(pw)) out.push('algún número');
    return out;
  },
  strength(pw) { let s = 0; if (pw.length >= 8) s++; if (pw.length >= 12) s++; if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++; return s / 5; },
  async login(username, password) {
    const r = await API('POST', '/api/login', {username, password});
    if (r.mfa) return r;
    this.user = r.user; this.touch();
    if (!r.user.mustChange && !r.user.mfaEnroll) await Store.loadAll();
    return r.user;
  },
  touch() { this.last = Date.now(); },
  restore() { return !!this.user; },
  async logout(msg) { if (this.user) { try { await API('POST', '/api/logout'); } catch {} } this.clear(msg); },
  expired() { if (this.user) this.clear('Tu sesión ha caducado. Vuelve a iniciar sesión.'); },
  clear(msg) {
    this.user = null; Store.disconnect(); Store.items = {}; Store.users = {}; Store.entries = [];
    closeAllLayers(); if (typeof Map3D !== 'undefined') Map3D.unmount();
    $('#app').innerHTML = ''; renderApp(); if (msg) toast(msg, 'info');
  },
  role() { return this.user && Store.settings.roles[this.user.role]; },
  can(p) { const r = this.role(); if (!r) return false; return r.perms === '*' || (Array.isArray(r.perms) && r.perms.includes(p)); }
};
/* =========================================================
   Dominio
   ========================================================= */
const rackById = id => { for (const a of almacenes()) { const r = (a.layout.racks || []).find(x => x.id === id); if (r) return r; } return null; };
// Código de ubicación exacta: B2-3-4 (estantería, balda, hueco)
function locCode(d) {
  if (!d || !d.ubicacion) return '';
  const r = rackById(d.ubicacion);
  if (!r) return locName(d.ubicacion);
  return [r.name, d.nivel || 1, Number(d.hueco) > 0 ? d.hueco : null].filter(x => x !== null).join('-');
}
const parseLocQR = t => { const m = /^LOC\|([^|]+)\|(\d+)\|(\d+)$/.exec(String(t || '').trim()); return m ? {ubicacion: m[1], nivel: Number(m[2]), hueco: Number(m[3])} : null; };
const EST = () => { const e = (Store.settings && Store.settings.estadosSistema) || {}; return {stock: e.stock && e.stock.length ? e.stock : ['En stock'], reservado: e.reservado || 'Reservado', enviado: e.enviado || 'Enviado', baja: e.baja || ['Baja'], transito: e.transito || 'En tránsito', retirado: e.retirado || 'Retirado'}; };
const isStock = e => EST().stock.includes(e);
const almacenes = () => (Store.settings && Store.settings.almacenes) || [];
const almById = id => almacenes().find(a => a.id === id);
const almOfClient = c => { const a = almacenes().find(x => (x.clientes || []).includes(c)); return a ? a.id : null; };
function curAlm() { const v = S.alm !== undefined ? S.alm : LS.get('lbinv.alm', ''); return almById(v) ? v : ''; }
const mapAlm = () => curAlm() || (almacenes()[0] || {}).id;
const curLayout = () => (almById(mapAlm()) || {}).layout || {width: 30, depth: 20, racks: [], zones: []};
const almOfItem = it => { const a = it && it.data && it.data.almacen; return a && almById(a) ? a : almOfClient(it && it.data && it.data.cliente); };
const almsOfClient = c => almacenes().filter(a => (a.clientes || []).includes(c));
const inAlm = it => !curAlm() || almOfItem(it) === curAlm();
function refreshLoc(prefix, root = document) {
  const c = root.querySelector('#' + prefix + '-cliente'), u = root.querySelector('#' + prefix + '-ubicacion');
  if (!c || !u || u.tagName !== 'SELECT' || c.value === '__keep') return;
  const as = root.querySelector('#' + prefix + '-almacen');
  if (as) { const cur0 = as.value, opts = almsOfClient(c.value).length ? almsOfClient(c.value) : almacenes(); as.innerHTML = opts.map(a => `<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join(''); as.value = opts.some(a => a.id === cur0) ? cur0 : (opts.some(a => a.id === curAlm()) ? curAlm() : opts[0].id); }
  const cur = u.value, first = u.options[0] ? u.options[0].outerHTML : '<option value="">—</option>';
  const locs = allLocations((as && as.value) || almOfClient(c.value) || undefined);
  u.innerHTML = first + locs.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');
  if ([...u.options].some(o => o.value === cur)) u.value = cur;
}
const cats = () => Store.settings.categories;
const catById = id => cats().find(c => c.id === id);
const listOf = name => (Store.settings.lists[name] || []);
const fieldOf = (cat, key) => cat && cat.fields.find(f => f.key === key);
function allLocations(almId) {
  const list = almId ? [almById(almId)].filter(Boolean) : almacenes();
  const pre = a => (!almId && almacenes().length > 1 ? a.nombre + ' · ' : '');
  return list.flatMap(a => [
    ...(a.layout.racks || []).map(r => ({id: r.id, name: pre(a) + 'Estantería ' + r.name + (plantaOf(a.layout, r.planta) ? ` (${plantaOf(a.layout, r.planta).nombre})` : ''), kind: 'rack', levels: r.levels, alm: a.id})),
    ...(a.layout.zones || []).map(z => ({id: z.id, name: pre(a) + z.name + (plantaOf(a.layout, z.planta) ? ` (${plantaOf(a.layout, z.planta).nombre})` : ''), kind: 'zone', levels: 1, alm: a.id}))
  ]);
}
const locName = id => { if (!id) return ''; const l = allLocations().find(x => x.id === id); return l ? l.name : id; };
const qtyOf = it => { const c = catById(it.cat); return c && !c.serialized ? Math.max(0, Number(it.data.cantidad) || 0) : 1; };
const itemTitle = it => { const d = it.data; const parts = [d.marca, d.modelo].filter(Boolean); if (parts.length) return parts.join(' '); if (d.tipo) return d.tipo; const c = catById(it.cat); return c ? c.name : 'Material'; };
const itemKey = it => it.data.serie || itemTitle(it);
const STATUS_CLS = {'En stock':'ok', 'Reservado':'info', 'En preparación':'warn', 'Enviado':'info', 'Instalado':'', 'RMA':'red', 'Baja':'out'};
const statusBadge = s => s ? `<span class="badge ${STATUS_CLS[s] ?? ''}">${esc(s)}</span>` : '';
const countryFlag = p => p ? `<span class="flag" title="${esc(p)}">${esc(p === 'España' ? 'ES' : p === 'Portugal' ? 'PT' : p.slice(0, 2).toUpperCase())}</span>` : '';
function fmtVal(f, v, rich = true) {
  if (v === undefined || v === null || v === '') return rich ? '<span class="muted">—</span>' : '';
  switch (f.type) {
    case 'bool': return v ? 'Sí' : 'No';
    case 'date': {
      if (!rich) return v;
      const d = daysUntil(v);
      if (f.expiry && d !== null && d < 0) return `<span class="badge red">${fmtDate(v)}</span>`;
      if (f.expiry && d !== null && d <= Store.settings.expiryWarnDays) return `<span class="badge warn">${fmtDate(v)}</span>`;
      return fmtDate(v);
    }
    case 'location': return rich ? esc(locName(v)) : locName(v);
    default:
      if (!rich) return String(v);
      if (f.key === 'estado') return statusBadge(v);
      if (f.key === 'pais') return countryFlag(v) + ' ' + esc(v);
      if (f.key === 'condicion') return `<span class="badge ${v === 'Nuevo' ? 'ok' : 'info'}">${esc(v)}</span>`;
      if (f.key === 'serie') return `<span class="serial">${esc(v)}</span>`;
      return esc(v);
  }
}
function defaultsFor(cat) {
  const d = {};
  cat.fields.forEach(f => {
    if (f.default === 'today') d[f.key] = today();
    else if (f.default !== undefined && f.default !== '') d[f.key] = f.type === 'number' ? Number(f.default) : f.type === 'bool' ? !!f.default : f.default;
    else if (f.type === 'bool') d[f.key] = false;
  });
  return d;
}
function searchText(it) {
  const extra = ((Store.settings && Store.settings.combos) || []).map(c => comboRender(c.template, it)).join(' ');
  const c = catById(it.cat);
  return Object.values(it.data).map(v => typeof v === 'boolean' ? '' : v).join(' ') + ' ' + (c ? c.name : '') + ' ' + locName(it.data.ubicacion) + ' ' + extra;
}
function findBySerial(serial, exceptId) {
  const s = norm(String(serial).trim()); if (!s) return null;
  return Object.values(Store.items).find(i => i.id !== exceptId && norm(i.data.serie) === s) || null;
}
function hist(it, action, detail) {
  it.history = (it.history || []).slice(-39);
  it.history.push({t:nowISO(), u: Auth.user ? Auth.user.username : 'sistema', a:action, d:detail || ''});
}
function diffText(cat, before, after) {
  const ch = [];
  cat.fields.forEach(f => {
    const a = before[f.key], b = after[f.key];
    if (String(a ?? '') !== String(b ?? '')) ch.push(`${f.label}: ${fmtVal(f, a, false) || '—'} → ${fmtVal(f, b, false) || '—'}`);
  });
  return ch.join(' · ');
}

/* =========================================================
   Capas: modales, panel lateral y confirmaciones
   ========================================================= */
const layers = [];
function openLayer(html, {drawer = false, onClose} = {}) {
  const el = document.createElement('div');
  el.className = 'layer' + (drawer ? ' drawer' : '');
  el.innerHTML = `<div class="scrim" data-close></div>${html}`;
  $('#layers').appendChild(el);
  const L = {el, onClose, prevFocus: document.activeElement};
  layers.push(L);
  el.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeLayer(L); });
  setTimeout(() => { const f = el.querySelector('[autofocus]') || el.querySelector('input:not([type=checkbox]),select,textarea,button.primary'); f && f.focus(); }, 30);
  return L;
}
function closeLayer(L) {
  L = L || layers[layers.length - 1]; if (!L) return;
  const i = layers.indexOf(L); if (i >= 0) layers.splice(i, 1);
  L.el.remove(); L.onClose && L.onClose();
  if (L.prevFocus && document.contains(L.prevFocus)) L.prevFocus.focus();
}
function closeAllLayers() { while (layers.length) closeLayer(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length) { e.preventDefault(); closeLayer(); } });
function modalHTML(title, body, foot, cls = '') {
  return `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-h"><h2>${esc(title)}</h2><span class="spacer"></span><button class="btn ghost icon" data-close aria-label="Cerrar">${ico('x')}</button></div>
    <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
}
function confirmDlg(title, msg, ok = 'Confirmar', danger = true, typeWord = '') {
  return new Promise(res => {
    let done = false;
    const L = openLayer(modalHTML(title, `<p style="margin:0 0 10px">${msg}</p>${typeWord ? `<label class="f">Escribe ${esc(typeWord)} para continuar<input class="inp" id="cf-word" autocomplete="off"></label>` : ''}`,
      `<button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'primary' : 'primary'}" id="cf-ok" ${typeWord ? 'disabled' : ''}>${esc(ok)}</button>`, 'narrow'),
      {onClose: () => { if (!done) res(false); }});
    if (typeWord) $('#cf-word', L.el).addEventListener('input', e => { $('#cf-ok', L.el).disabled = e.target.value.trim() !== typeWord; });
    $('#cf-ok', L.el).addEventListener('click', () => { done = true; closeLayer(L); res(true); });
  });
}

/* =========================================================
   Descargas
   ========================================================= */
async function saveFile(filename, data, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], {type: mime || 'application/octet-stream'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  toast('Descargando ' + filename);
  return true;
}

/* =========================================================
   Estado de la interfaz y rutas
   ========================================================= */
const S = {
  view:'inicio', cat:'all', f:{q:'', pais:'', cliente:'', condicion:'', estado:'', ubicacion:''},
  sort:{k:'updatedAt', d:-1}, sel:new Set(), page:1, perPage:50,
  stab:'general', sdraft:null, listSel:'clientes', catSel:'equipos',
  drawerId:null, mapSel:null, mapCats:null, mapClient:'', mapQ:'', mapHit:null,
  auditQ:'', auditU:'', auditA:''
};
const canView = v => Auth.can(VIEW_PERM[v]) && (!['ajustes', 'usuarios'].includes(v) || !Auth.user.scope || Auth.user.scope.all);
const VIEW_PERM = {inicio:'inv.view', inventario:'inv.view', movimientos:'inv.move', pedidos:'inv.view', albaranes:'inv.view', mapa:'map.view', registro:'audit.view', usuarios:'users.manage', ajustes:'settings.manage'};
function parseHash() {
  const p = (location.hash || '#/inicio').replace(/^#\/?/, '').split('/');
  S.view = VIEW_PERM[p[0]] ? p[0] : 'inicio';
  if (S.view === 'inventario') { const c = p[1] || 'all'; if (c !== S.cat) { S.cat = (c === 'all' || catById(c)) ? c : 'all'; S.sel.clear(); S.page = 1; } }
  if (S.view === 'ajustes' && p[1]) S.stab = p[1];
  S.orderId = S.view === 'pedidos' && p[1] ? p[1] : null;
}
window.addEventListener('hashchange', () => {
  $$('details.menu[open]').forEach(d => d.removeAttribute('open'));
  if (/^#\/reset\//.test(location.hash)) { showReset(location.hash.slice(8)); return; } parseHash(); $('#shell') && $('#shell').classList.remove('nav-open'); renderNav(); renderMain(); window.scrollTo(0, 0); });

/* =========================================================
   Render principal
   ========================================================= */
function renderApp() {
  const app = $('#app');
  if (Store.settings) applyTheme(S.sdraft && S.sdraft.tema ? S.sdraft.tema.primario : undefined);
  if (Store.initError) { hideSplash(); app.innerHTML = `<div class="empty" style="padding-top:28vh"><h3>No se puede conectar con el servidor</h3><p>${esc(Store.initError)}</p><div class="row"><button class="btn primary" data-act="reload">Reintentar</button></div></div>`; return; }
  if (!Store.settings || !Store.loaded.users || !Store.loaded.settings) {
    if (!$('#splash')) app.innerHTML = `<div class="empty" style="padding-top:30vh"><h3>Cargando el almacén…</h3><p>Conectando con los datos compartidos.</p></div>`; return;
  }
  saveSplash(); hideSplash();
  if (/^#\/reset\//.test(location.hash) && !Store.needsSetup) { if (!$('#reset-form') && !$('#reset-msg')) showReset(location.hash.slice(8)); return; }
  if (Store.needsSetup) { if (!$('#setup-form')) { app.innerHTML = authHTML('setup'); bindAuth('setup'); } return; }
  if (!Auth.user && ($('#forgot-form') || $('#mfa-form'))) return;
  if (!Auth.user && !Auth.restore()) { if (!$('#login-form')) { app.innerHTML = authHTML('login'); bindAuth('login'); } return; }
  if (Auth.user.mustChange) { if (!$('#force-form')) { app.innerHTML = authHTML('force'); bindAuth('force'); } return; }
  if ($('#enroll-box')) return;
  if (Auth.user.mfaEnroll) { showEnroll(); return; }
  if (!$('#shell')) { app.innerHTML = shellHTML(); parseHash(); }
  renderNav(); renderTop(); renderMain();
}
const RACK_ART = `<svg class="racks" viewBox="0 0 400 300" fill="none" stroke="#fff" stroke-width="3">${[0,1,2,3].map(i => `<g transform="translate(${i*95},${40 - i*10})"><path d="M10 260V40h70v220M10 90h70M10 140h70M10 190h70M10 240h70"/><rect x="18" y="100" width="22" height="30"/><rect x="46" y="150" width="26" height="30"/><rect x="22" y="200" width="30" height="30"/></g>`).join('')}</svg>`;
function authHTML(kind) {
  const B = brandOf(Store.settings);
  const art = `<div class="auth-art">${B.mode === 'image' ? `<span class="auth-logo ${B.bg === 'white' ? 'light' : ''}"><img src="${esc(B.logo)}" alt="${esc(B.company)}" style="max-height:${Math.round(B.size * 1.25)}px"></span>` : `<b>${esc(B.company)}</b>`}<div><h1>Control de almacén</h1><p>Equipos, monitores, soportes, switches y firewalls. Cada número de serie localizado, con su cliente, país y estado.</p></div>${RACK_ART}</div>`;
  if (kind === 'login') return `<div class="auth">${art}<div class="auth-form"><form id="login-form" autocomplete="on">
    <h2>Iniciar sesión</h2><div id="au-err" class="err-msg hide"></div>
    <label class="f">Usuario<input class="inp" name="username" autocomplete="username" required autofocus></label>
    <label class="f">Contraseña<input class="inp" name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn primary" style="height:42px">Entrar</button>
    ${Store.mailEnabled ? `<button type="button" class="btn ghost" data-act="forgot">¿Has olvidado tu contraseña?</button>` : `<p class="help">Si has olvidado tu contraseña, pide a un administrador que la restablezca.</p>`}
    <p class="help">Acceso solo para personal autorizado. Los datos se guardan en el servidor del almacén.</p>
  </form></div></div>`;
  if (kind === 'forgot') return `<div class="auth">${art}<div class="auth-form"><form id="forgot-form" autocomplete="on">
    <h2>Restablecer contraseña</h2><p class="muted" style="margin:-8px 0 0">Te enviaremos un enlace al correo de tu cuenta para que elijas una contraseña nueva.</p>
    <div id="au-err" class="err-msg hide"></div><div id="au-ok" class="hide" style="background:var(--ok-soft);color:var(--ok);padding:12px;border-radius:8px;font-weight:550"></div>
    <label class="f">Usuario o correo<input class="inp" name="identifier" autocomplete="username" required autofocus></label>
    <button class="btn primary" style="height:42px">Enviar enlace</button>
    <button type="button" class="btn ghost" data-act="backToLogin">Volver a iniciar sesión</button>
  </form></div></div>`;
  if (kind === 'reset') return `<div class="auth">${art}<div class="auth-form"><form id="reset-form" autocomplete="off">
    <h2>${Auth._resetInfo && Auth._resetInfo.kind === 'invite' ? 'Elige tu contraseña' : 'Nueva contraseña'}</h2>
    <p class="muted" style="margin:-8px 0 0">Usuario: <b>${esc(Auth._resetInfo ? Auth._resetInfo.username : '')}</b></p>
    <div id="au-err" class="err-msg hide"></div>
    <label class="f">Nueva contraseña<input class="inp" name="password" type="password" required autocomplete="new-password" autofocus><div class="strength"><i id="pw-meter"></i></div><span class="help">Mínimo ${Store.settings.minPassword} caracteres, con mayúsculas, minúsculas y números.</span></label>
    <label class="f">Repite la contraseña<input class="inp" name="password2" type="password" required autocomplete="new-password"></label>
    <button class="btn primary" style="height:42px">Guardar contraseña</button>
  </form></div></div>`;
  if (kind === 'setup') return `<div class="auth">${art}<div class="auth-form"><form id="setup-form" autocomplete="off">
    <h2>Crea la cuenta de administrador</h2><p class="muted" style="margin:-8px 0 0">Es la primera vez que se abre el almacén. Esta cuenta podrá crear usuarios, roles y ajustes.</p>
    <div id="au-err" class="err-msg hide"></div>
    ${Store.setupToken ? `<label class="f">Código de instalación<input class="inp" name="token" required autocomplete="off"><span class="help">Es el valor de SETUP_TOKEN en el archivo .env del servidor.</span></label>` : ''}
    <label class="f">Nombre completo<input class="inp" name="name" required autofocus></label>
    <label class="f">Correo<input class="inp" name="email" type="email" autocomplete="email" placeholder="nombre@laberit.com"><span class="help">Para poder recuperar la contraseña si la olvidas.</span></label>
    <label class="f">Usuario<input class="inp" name="username" required autocomplete="username" pattern="[A-Za-z0-9._\\-]{3,32}" title="3 a 32 letras, números, punto, guion o guion bajo"></label>
    <label class="f">Contraseña<input class="inp" name="password" type="password" required autocomplete="new-password"><div class="strength"><i id="pw-meter"></i></div><span class="help" id="pw-help">Mínimo ${Store.settings.minPassword} caracteres, con mayúsculas, minúsculas y números.</span></label>
    <label class="f">Repite la contraseña<input class="inp" name="password2" type="password" required autocomplete="new-password"></label>
    <button class="btn primary" style="height:42px">Crear administrador y entrar</button>
  </form></div></div>`;
  return `<div class="auth">${art}<div class="auth-form"><form id="force-form" autocomplete="off">
    <h2>Cambia tu contraseña</h2><p class="muted" style="margin:-8px 0 0">Un administrador ha pedido que cambies la contraseña antes de continuar.</p>
    <div id="au-err" class="err-msg hide"></div>
    <label class="f">Nueva contraseña<input class="inp" name="password" type="password" required autocomplete="new-password" autofocus><div class="strength"><i id="pw-meter"></i></div></label>
    <label class="f">Repite la contraseña<input class="inp" name="password2" type="password" required autocomplete="new-password"></label>
    <div class="row"><button class="btn primary" style="height:42px;flex:1">Guardar y continuar</button><button type="button" class="btn" style="height:42px" id="force-out">Salir</button></div>
  </form></div></div>`;
}
async function showReset(token) {
  const app = $('#app');
  app.innerHTML = `<div class="empty" id="reset-msg" style="padding-top:28vh"><h3>Comprobando el enlace…</h3></div>`;
  try {
    Auth._resetInfo = await API('GET', '/api/password/token/' + encodeURIComponent(token));
    Auth._resetToken = token;
    app.innerHTML = authHTML('reset'); bindAuth('reset');
  } catch (ex) {
    app.innerHTML = `<div class="empty" id="reset-msg" style="padding-top:26vh"><h3>No se puede usar este enlace</h3><p>${esc(ex.message)}</p><div class="row"><button class="btn primary" data-act="backToLogin">Ir al inicio de sesión</button>${Store.mailEnabled ? '<button class="btn" data-act="forgot">Pedir un enlace nuevo</button>' : ''}</div></div>`;
  }
}
function bindAuth(kind) {
  const form = $('#' + kind + '-form'), err = $('#au-err');
  const showErr = m => { err.textContent = m; err.classList.remove('hide'); };
  if (kind === 'forgot') {
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.classList.add('hide');
      const btn = form.querySelector('button.primary'); btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        const r = await API('POST', '/api/password/forgot', {identifier: form.identifier.value.trim()});
        const ok = $('#au-ok'); ok.textContent = r.message; ok.classList.remove('hide');
        form.identifier.disabled = true; btn.classList.add('hide');
      } catch (ex) { showErr(ex.message); btn.disabled = false; btn.textContent = 'Enviar enlace'; }
    });
    return;
  }
  const pw = form.password, meter = $('#pw-meter');
  if (meter) pw.addEventListener('input', () => { meter.style.width = Math.round(Auth.strength(pw.value) * 100) + '%'; });
  if (kind === 'force') $('#force-out').onclick = () => Auth.logout();
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.classList.add('hide');
    const btn = form.querySelector('button.primary'); const label = btn.textContent; btn.disabled = true;
    try {
      if (kind === 'login') {
        btn.textContent = 'Comprobando…';
        const lr = await Auth.login(form.username.value, form.password.value);
        if (lr && lr.mfa) { showMfaLogin(lr); return; }
        $('#app').innerHTML = ''; renderApp();
        if (Store.mailEnabled && Auth.user && !Auth.user.email) toast('Añade tu correo en «Mi cuenta» (menú de tu nombre) para poder recuperar la contraseña.', 'info', 7000);
        return;
      }
      if (form.password.value !== form.password2.value) throw new Error('Las contraseñas no coinciden.');
      const issues = Auth.pwIssues(form.password.value);
      if (issues.length) throw new Error('La contraseña necesita ' + issues.join(', ') + '.');
      btn.textContent = 'Guardando…';
      if (kind === 'reset') {
        await API('POST', '/api/password/reset', {token: Auth._resetToken, password: form.password.value});
        const uname = Auth._resetInfo.username; Auth._resetToken = null; Auth._resetInfo = null;
        history.replaceState(null, '', location.pathname + '#/inicio');
        if (Auth.user) { Auth.clear(); }
        $('#app').innerHTML = authHTML('login'); bindAuth('login');
        $('#login-form').username.value = uname; $('#login-form').password.focus();
        toast('Contraseña guardada. Ya puedes entrar con ella.');
        return;
      }
      if (kind === 'setup') {
        const r = await API('POST', '/api/setup', {name: form.name.value.trim(), email: form.email.value.trim(), username: form.username.value.trim(), password: form.password.value, token: form.token ? form.token.value.trim() : undefined, settings: defaultSettings()});
        Store.needsSetup = false; Auth.user = r.user; Auth.touch(); await Store.loadAll();
        $('#app').innerHTML = ''; renderApp();
        toast('Administrador creado. Ya puedes empezar a registrar material.');
      } else {
        const r = await API('POST', '/api/me/password', {password: form.password.value});
        Auth.user = r.user; if (!r.user.mfaEnroll) await Store.loadAll();
        $('#app').innerHTML = ''; renderApp();
      }
    } catch (ex) { showErr(ex.message || String(ex)); btn.disabled = false; btn.textContent = label; }
  });
}
function shellHTML() {
  return `<div class="shell" id="shell">
    <aside class="side" aria-label="Navegación"><div class="brand" id="brand"></div><nav class="nav" id="nav"></nav>
      <div class="side-foot" id="side-foot"></div></aside>
    <div style="min-width:0">
      <header class="top" id="top"></header>
      <main class="main" id="main"></main>
    </div></div>`;
}
function renderNav() {
  const nav = $('#nav'); if (!nav) return;
  const bEl = $('#brand'), bSig = JSON.stringify(brandOf(Store.settings));
  if (bEl.dataset.sig !== bSig) { bEl.dataset.sig = bSig; bEl.className = brandClass(Store.settings); bEl.innerHTML = brandInner(Store.settings); }
  const items = Object.values(Store.items).filter(inAlm);
  const link = (v, href, icon, label) => canView(v) ? `<a href="#/${href}" class="${S.view === v && (v !== 'inventario' || S.cat === 'all') ? 'on' : ''}">${ico(icon)}${label}</a>` : '';
  let h = link('inicio', 'inicio', 'home', 'Inicio') + link('inventario', 'inventario/all', 'box', 'Inventario');
  if (Auth.can('inv.view')) h += cats().map(c => {
    const n = items.filter(i => i.cat === c.id).reduce((a, i) => a + qtyOf(i), 0);
    return `<a href="#/inventario/${esc(c.id)}" class="sub ${S.view === 'inventario' && S.cat === c.id ? 'on' : ''}">${esc(c.name)}<span class="cnt">${n.toLocaleString('es-ES')}</span></a>`;
  }).join('');
  h += link('movimientos', 'movimientos', 'swap', 'Entradas y salidas') + link('pedidos', 'pedidos', 'clipboard', 'Pedidos') + link('albaranes', 'albaranes', 'truck', 'Albaranes') + link('mapa', 'mapa', 'cube', 'Mapa 3D');
  const adm = link('registro', 'registro', 'list', 'Registro de actividad') + link('usuarios', 'usuarios', 'users', 'Usuarios') + link('ajustes', 'ajustes/' + S.stab, 'cog', 'Ajustes');
  if (adm) h += '<div class="sep"></div>' + adm;
  nav.innerHTML = h;
  $('#side-foot').innerHTML = Store.online ? '<span class="dot"></span>Conectado al servidor en tiempo real' : '<span class="dot local"></span>Reconectando con el servidor…';
}
function renderTop() {
  const top = $('#top'); if (!top) return;
  const sig = Auth.user.id + (Auth.role() || {}).name + JSON.stringify(almacenes().map(a => [a.id, a.nombre])) + curAlm();
  if (top.dataset.uid === sig) return;
  top.dataset.uid = sig;
  top.innerHTML = `<button class="btn ghost icon burger" data-act="nav" aria-label="Abrir menú">${ico('menu')}</button>
    <div class="gsearch">${ico('search')}<input id="gsearch" placeholder="Buscar por número de serie, modelo, cliente…  ( / )" autocomplete="off" aria-label="Búsqueda global"><div class="gs-res hide" id="gs-res"></div></div>${scanBtn('gsearch', false, 'Buscar un equipo').replace('class="btn icon', 'class="btn ghost icon')}
    ${almacenes().length > 1 ? `<select class="sel sm alm-sel" id="alm-sel" aria-label="Almacén"><option value="">Todos los almacenes</option>${almacenes().map(a => `<option value="${esc(a.id)}" ${curAlm() === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select>` : ''}
    <div class="top-right">
      <button class="btn ghost icon" data-act="theme" title="Cambiar tema" aria-label="Cambiar tema">${ico('moon')}</button>
      <details class="menu"><summary class="btn ghost" style="height:42px;padding:0 6px 0 4px"><span class="avatar">${esc(initials(Auth.user.name || Auth.user.username))}</span><span class="who" style="text-align:left;line-height:1.15"><b style="display:block;font-size:13px">${esc(Auth.user.name || Auth.user.username)}</b><span class="muted" style="font-size:12px;font-weight:500">${esc((Auth.role() || {}).name || '')}</span></span></summary>
        <div class="pop"><button data-act="myAccount">${ico('users')}Mi cuenta y correo</button><button data-act="myPassword">${ico('key')}Cambiar mi contraseña</button><hr><button data-act="logout">${ico('logout')}Cerrar sesión</button></div></details>
    </div>`;
}
function renderMain() {
  const main = $('#main'); if (!main || !Auth.user) return;
  if (main.dataset.view === 'mapa' && S.view === 'mapa' && Map3D.mounted) { Map3D.refresh(); renderMapSide(); return; }
  if (main.dataset.view === 'mapa' && S.view !== 'mapa') Map3D.unmount();
  const ae = document.activeElement, fid = ae && ae.id && main.contains(ae) ? ae.id : null;
  const keep = main.dataset.view === S.view ? $$('input[id],textarea[id],select[id]', main).filter(el => el.type !== 'file' && el.dataset.bind === undefined).map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value]) : [];
  const selS = fid && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  const prevView = main.dataset.view;
  main.dataset.view = S.view;
  if (!canView(S.view)) { main.innerHTML = `<div class="empty"><h3>No tienes acceso a esta sección</h3><p>Pide a un administrador que amplíe los permisos de tu rol.</p></div>`; return; }
  main.innerHTML = VIEWS[S.view]();
  if (S.view === 'inicio' && prevView !== 'inicio') dashAnimate(main);
  if (S.view === 'mapa') { Map3D.mount($('#map-stage')); renderMapSide(); }
  if (S.view === 'ajustes' && S.stab === 'almacen') drawLayoutPreview();
  if (S.view === 'movimientos') refreshLoc('mvin');
  if (S.view === 'ajustes' && S.stab === 'general') loadMailStatus();
  keep.forEach(([id, v]) => { const el = document.getElementById(id); if (!el || !main.contains(el)) return; if (el.type === 'checkbox') el.checked = v; else if (el.value !== v && (el.tagName !== 'SELECT' || [...el.options].some(o => o.value === v))) el.value = v; });
  if ($('#mv-alb') && $('#mv-alb-box')) $('#mv-alb-box').classList.toggle('hide', !$('#mv-alb').checked);
  if (S.view === 'movimientos' && !keep.length && $('#mv-alb') && $('#mv-alb').checked && $('#mvout-estado') && $('#mvout-estado').value === '__keep') $('#mvout-estado').value = EST().enviado;
  if (keep.length) { mvCountUpdate(); mvOutUpdate(); }
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); if (selS) try { el.setSelectionRange(selS[0], selS[1]); } catch {} } }
}

/* =========================================================
   Inicio
   ========================================================= */
function countBy(items, key) { const m = {}; items.forEach(i => { const v = i.data[key] || 'Sin indicar'; m[v] = (m[v] || 0) + qtyOf(i); }); return m; }
function barsHTML(map, total, max = 7) {
  const e = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, max);
  if (!e.length) return '<p class="muted">Sin datos todavía.</p>';
  const top = Math.max(...e.map(x => x[1]));
  return `<div class="bars">${e.map(([k, v]) => `<div class="bar-row"><span class="lab" title="${esc(k)}">${esc(k)}</span><div class="bar"><i style="width:${(v / top * 100).toFixed(1)}%"></i></div><span class="v">${v.toLocaleString('es-ES')}</span></div>`).join('')}</div>`;
}
function ruleCount(r) {
  const c = catById(r.cat); if (!c) return 0;
  const alm = r.almacen || curAlm();
  return Object.values(Store.items).filter(it => it.cat === r.cat && isStock(it.data.estado) && !it.data.pedido && (!alm || almOfItem(it) === alm) && (r.conds || []).every(k => !k.v || norm(it.data[k.k]) === norm(k.v))).reduce((a, it) => a + qtyOf(it), 0);
}
function alertsList() {
  const out = []; const items = Object.values(Store.items); const warn = Store.settings.expiryWarnDays;
  const rules = (Store.settings.stockRules || []).filter(r => r.active !== false && r.cat);
  rules.forEach(r => { const n = ruleCount(r); if (n < r.min) out.push({kind:'stock', sev: n === 0 ? 2 : 1, text:`${r.name}: quedan ${n} en stock (mínimo ${r.min})`, cat: catById(r.cat)}); });
  if (!rules.length) cats().forEach(c => {
    if (!c.minStock) return;
    const groups = {};
    items.filter(i => i.cat === c.id).forEach(i => {
      const k = [i.data.marca, i.data.modelo || i.data.tipo].filter(Boolean).join(' ') || c.name;
      groups[k] = groups[k] || 0; if (isStock(i.data.estado)) groups[k] += qtyOf(i);
    });
    Object.entries(groups).forEach(([k, n]) => { if (n < c.minStock) out.push({kind:'stock', sev: n === 0 ? 2 : 1, text:`${k}: quedan ${n} en stock (mínimo ${c.minStock})`, cat:c}); });
  });
  items.forEach(i => {
    const c = catById(i.cat); if (!c || EST().baja.includes(i.data.estado)) return;
    c.fields.filter(f => f.expiry && i.data[f.key]).forEach(f => {
      const d = daysUntil(i.data[f.key]);
      if (d !== null && d <= warn) out.push({kind:'exp', sev: d < 0 ? 2 : 1, id:i.id, text:`${f.label} ${d < 0 ? 'vencida hace ' + plural(-d, 'día') : 'vence en ' + plural(d, 'día')}: ${itemKey(i)}`, cat:c});
    });
  });
  return out.sort((a, b) => b.sev - a.sev);
}
const ACTION_LABEL = {login:'Inicio de sesión', logout:'Cierre de sesión', login_fallido:'Intento fallido', alta:'Alta', edicion:'Edición', baja:'Eliminación', movimiento:'Movimiento', entrada_masiva:'Entrada masiva', salida_masiva:'Cambio por escaneo', importacion:'Importación', exportacion:'Exportación', ajustes:'Ajustes', usuario_creado:'Usuario creado', usuario_editado:'Usuario editado', usuario_eliminado:'Usuario eliminado', password_cambiada:'Contraseña cambiada', reset_solicitado:'Restablecimiento solicitado', correo_enviado:'Correo enviado', albaran_eliminado:'Albarán eliminado', restauracion:'Restauración', pedido:'Pedido', mfa_activado:'Doble factor', mfa_desactivado:'Doble factor desactivado', mfa_fallido:'Código 2FA incorrecto'};
/* ---------- Logotipo / marca ---------- */
function brandOf(st) { const b = (st && st.brand) || {}; const size = Number(b.size); return {mode: b.mode === 'image' && b.logo ? 'image' : 'text', bg: b.bg === 'white' ? 'white' : 'red', subtitle: b.subtitle === undefined ? 'Control de almacén' : b.subtitle, logo: b.logo || '', company: (st && st.company) || 'Laberit', size: size >= 20 && size <= 110 ? size : 52, align: b.align === 'center' ? 'center' : 'left'}; }
function brandInner(st) {
  const b = brandOf(st);
  const top = b.mode === 'image' ? `<img class="brand-logo" src="${esc(b.logo)}" alt="${esc(b.company)}" style="max-height:${b.size}px">` : `<b>${esc(b.company)}</b>`;
  return top + (b.subtitle ? `<span>${esc(b.subtitle)}</span>` : '');
}
const brandClass = st => 'brand' + (brandOf(st).bg === 'white' ? ' light' : '') + (brandOf(st).align === 'center' ? ' center' : '');
function updateBrandPreview() { const el = $('#brand-prev'); if (el) { el.className = brandClass(draft()); el.innerHTML = brandInner(draft()); } const v = $('#brand-size-val'); if (v) v.textContent = brandOf(draft()).size + ' px'; }
// Recorta los márgenes vacíos (transparentes o del color del fondo) para que el logo aproveche todo el espacio.
function trimCanvas(cv) {
  const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
  const c = [d[0], d[1], d[2], d[3]], transparent = c[3] < 16;
  const isBg = i => transparent ? d[i + 3] < 16 : (d[i + 3] > 200 && Math.abs(d[i] - c[0]) < 20 && Math.abs(d[i + 1] - c[1]) < 20 && Math.abs(d[i + 2] - c[2]) < 20);
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!isBg((y * w + x) * 4)) { if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; } }
  if (right < 0) return {cv, trimmed: false};
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.02);
  left = Math.max(0, left - pad); top = Math.max(0, top - pad); right = Math.min(w - 1, right + pad); bottom = Math.min(h - 1, bottom + pad);
  const ow = right - left + 1, oh = bottom - top + 1;
  if (ow >= w - 2 && oh >= h - 2) return {cv, trimmed: false};
  const out = document.createElement('canvas'); out.width = ow; out.height = oh;
  out.getContext('2d').drawImage(cv, left, top, ow, oh, 0, 0, ow, oh);
  return {cv: out, trimmed: true};
}
// Convierte cualquier imagen (archivo o data URL) en un PNG ligero, recortado y ajustado al tamaño del menú.
function processLogo(source) {
  return new Promise((resolve, reject) => {
    let url = source;
    if (typeof source !== 'string') {
      if (!/^image\//.test(source.type)) return reject(new Error('El archivo no es una imagen.'));
      if (source.size > 8 * 1024 * 1024) return reject(new Error('La imagen pesa más de 8 MB.'));
      url = URL.createObjectURL(source);
    }
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 900, h = img.naturalHeight || 300;
      const s1 = Math.min(1, 1600 / Math.max(w, h)); w = Math.max(1, Math.round(w * s1)); h = Math.max(1, Math.round(h * s1));
      const big = document.createElement('canvas'); big.width = w; big.height = h;
      const bctx = big.getContext('2d'); bctx.imageSmoothingQuality = 'high'; bctx.drawImage(img, 0, 0, w, h);
      if (typeof source !== 'string') URL.revokeObjectURL(url);
      let t; try { t = trimCanvas(big); } catch { t = {cv: big, trimmed: false}; }
      const scale = Math.min(1, 480 / t.cv.width, 220 / t.cv.height);
      const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(t.cv.width * scale)); cv.height = Math.max(1, Math.round(t.cv.height * scale));
      const ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(t.cv, 0, 0, cv.width, cv.height);
      let out = cv.toDataURL('image/png');
      if (out.length > 400000) out = cv.toDataURL('image/webp', 0.9);
      if (out.length > 600000) return reject(new Error('La imagen es demasiado compleja. Prueba con una versión más sencilla del logo.'));
      resolve({url: out, trimmed: t.trimmed});
    };
    img.onerror = () => { if (typeof source !== 'string') URL.revokeObjectURL(url); reject(new Error('No se ha podido leer la imagen.')); };
    img.src = url;
  });
}
const VIEWS = {};
VIEWS.inicio = () => {
  const items = Object.values(Store.items).filter(inAlm);
  const name = (Auth.user.name || Auth.user.username).split(' ')[0];
  const hour = new Date().getHours(), greet = hour < 6 ? 'Buenas noches' : hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const today = new Date().toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'});
  const almName = curAlm() ? almById(curAlm()).nombre : (almacenes().length > 1 ? 'Todos los almacenes' : '');
  const actions = `<div class="row">${Auth.can('inv.move') ? `<a class="btn" href="#/movimientos">${ico('swap')}Entrada o salida</a>` : ''}${Auth.can('inv.view') ? `<a class="btn" href="#/pedidos">${ico('clipboard')}Pedidos</a>` : ''}${Auth.can('inv.create') ? `<button class="btn primary" data-act="newItem">${ico('plus')}Dar de alta</button>` : ''}</div>`;
  const head = `<div class="dash-head"><div><h1>${greet}, ${esc(name)}</h1><p class="muted">${esc(today.charAt(0).toUpperCase() + today.slice(1))}${almName ? `, ${esc(almName)}` : ''}</p></div>${actions}</div>`;
  if (!items.length) return head + `<div class="panel"><div class="empty"><h3>El almacén está vacío</h3><p>Da de alta equipos uno a uno, escanea una entrada completa o importa un CSV.</p>
    <div class="row">${Auth.can('inv.move') ? `<a class="btn" href="#/movimientos">${ico('swap')}Entrada por escáner</a>` : ''}${Auth.can('settings.manage') ? `<button class="btn" data-act="sampleData">Cargar datos de ejemplo</button>` : ''}</div></div></div>`;

  const E = EST(), sum = arr => arr.reduce((a, i) => a + qtyOf(i), 0);
  const total = sum(items), stock = sum(items.filter(i => isStock(i.data.estado))), reserved = sum(items.filter(i => i.data.estado === E.reservado));
  const almOk = cli => !curAlm() || almOfClient(cli) === curAlm();
  const dels = (Store.deliveries || []).filter(d => almOk(d.cliente));
  const isAlta = it => { const h = (it.history || [])[0]; return !h || h.a === 'Alta'; };
  const now = new Date(), m0 = new Date(now.getFullYear(), now.getMonth(), 1), m1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const inRange = (iso, a, b) => { const t = new Date(iso); return t >= a && t < b; };
  const entMes = sum(items.filter(i => isAlta(i) && inRange(i.createdAt, m0, new Date(8.64e15)))), entPrev = sum(items.filter(i => isAlta(i) && inRange(i.createdAt, m1, m0)));
  const salMes = dels.filter(d => inRange(d.date, m0, new Date(8.64e15))).reduce((a, d) => a + (d.units || 0), 0), salPrev = dels.filter(d => inRange(d.date, m1, m0)).reduce((a, d) => a + (d.units || 0), 0);
  const delta = (a, b) => b ? `<span class="dash-delta ${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))} % frente al mes anterior</span>` : `<span class="dash-delta">${a ? 'Sin datos del mes anterior' : 'Sin movimientos este mes'}</span>`;

  // Reparto por estado (la banda superior)
  const states = listOf('estados');
  const byState = states.map(st => ({st, n: sum(items.filter(i => i.data.estado === st))})).filter(x => x.n > 0);
  const other = total - byState.reduce((a, x) => a + x.n, 0); if (other > 0) byState.push({st: 'Sin estado', n: other});
  const stColor = st => isStock(st) ? 'var(--ok)' : st === E.reservado ? 'var(--info)' : st === E.enviado ? 'var(--red)' : E.baja.includes(st) ? 'var(--muted)' : st === 'RMA' ? 'var(--red-ink)' : st === 'En preparación' ? 'var(--warn)' : 'var(--ink-2)';
  const spark14 = (src) => { const out = []; for (let k = 13; k >= 0; k--) { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - k); out.push(src[d.toISOString().slice(0, 10)] || 0); } return out; };
  const entByDay = {}, salByDay = {};
  const dkey = iso => { const x = new Date(iso); x.setHours(0, 0, 0, 0); return x.toISOString().slice(0, 10); };
  items.filter(isAlta).forEach(i => { const k = dkey(i.createdAt); entByDay[k] = (entByDay[k] || 0) + qtyOf(i); });
  dels.forEach(d => { const k = dkey(d.date); salByDay[k] = (salByDay[k] || 0) + (d.units || 0); });
  const iso = isoWarehouse(items);
  const band = `<section class="dash-hero">
    <div class="dash-hero-top"><span class="dash-live ${Store.online ? 'on' : ''}"><i></i>${Store.online ? 'En directo' : 'Reconectando…'}</span>${almName ? `<span class="dash-hero-alm">${esc(almName)}</span>` : ''}</div>
    <div class="dash-hero-body">
      <div class="dash-hero-left">
        <div class="dash-total"><span class="dash-big num" data-count="${total}">${total.toLocaleString('es-ES')}</span><span class="dash-sub">unidades en el almacén</span></div>
        <div class="dash-stack">${byState.map(x => `<button style="flex:${x.n};background:${stColor(x.st)}" data-act="dashGo" data-estado="${esc(x.st === 'Sin estado' ? '' : x.st)}" title="${esc(x.st)}: ${x.n}"></button>`).join('')}</div>
        <div class="dash-legend">${byState.map(x => `<button class="dash-leg" data-act="dashGo" data-estado="${esc(x.st === 'Sin estado' ? '' : x.st)}"><i style="background:${stColor(x.st)}"></i>${esc(x.st)}<b class="num">${x.n.toLocaleString('es-ES')}</b></button>`).join('')}</div>
        ${iso.cap ? `<div class="dash-occ"><svg viewBox="0 0 44 44" class="dash-ring"><circle cx="22" cy="22" r="18" class="dash-ring-bg"/><circle cx="22" cy="22" r="18" class="dash-ring-fg" style="stroke-dasharray:${(iso.pct * 113.1).toFixed(1)} 113.1"/></svg>
          <div><b class="num"><span data-count="${Math.round(iso.pct * 100)}">${Math.round(iso.pct * 100)}</span> %</b><span class="dash-sub">de ocupación de estanterías${iso.name ? ` en ${esc(iso.name)}` : ''}</span></div></div>` : ''}
      </div>
      <div class="dash-hero-iso">${iso.svg || '<p class="dash-sub" style="text-align:center">Dibuja las estanterías en Ajustes → Almacenes para ver aquí el almacén.</p>'}</div>
    </div>
    <div class="dash-kpis">
      <button class="dash-kpi" data-act="dashGo" data-estado="${esc(E.stock[0])}"><span class="dash-sub">Disponibles</span><b class="num" data-count="${stock}">${stock.toLocaleString('es-ES')}</b><span class="dash-delta">${total ? Math.round(stock / total * 100) : 0} % del total</span></button>
      <button class="dash-kpi" data-act="dashGo" data-estado="${esc(E.reservado)}"><span class="dash-sub">Reservadas para pedidos</span><b class="num" data-count="${reserved}">${reserved.toLocaleString('es-ES')}</b><span class="dash-delta">${plural((Store.orders || []).filter(o => o.status === 'preparacion' && almOk(o.cliente)).length, 'pedido', 'pedidos')} en preparación</span></button>
      <a class="dash-kpi" href="#/movimientos"><span class="dash-sub">Entradas este mes</span><span class="dash-kpi-row"><b class="num" data-count="${entMes}">${entMes.toLocaleString('es-ES')}</b>${sparkSVG(spark14(entByDay), 'e')}</span>${delta(entMes, entPrev)}</a>
      <a class="dash-kpi" href="#/albaranes"><span class="dash-sub">Salidas este mes</span><span class="dash-kpi-row"><b class="num" data-count="${salMes}">${salMes.toLocaleString('es-ES')}</b>${sparkSVG(spark14(salByDay), 's')}</span>${delta(salMes, salPrev)}</a>
    </div></section>`;

  // ---------- Actividad ----------
  const range = S.dashRange || 30;
  const dayList = n => [...Array(n)].map((_, k) => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (n - 1) + k); return d; });
  const series = dayList(range).map(d => { const k = d.toISOString().slice(0, 10); return {d, e: entByDay[k] || 0, s: salByDay[k] || 0}; });
  const tE = series.reduce((a, x) => a + x.e, 0), tS = series.reduce((a, x) => a + x.s, 0);
  const chart = `<section class="panel dash-chart"><div class="panel-h"><div><h3>Movimientos</h3><span class="help">${plural(tE, 'unidad', 'unidades')} de entrada y ${plural(tS, 'unidad', 'unidades')} de salida en ${range} días</span></div>
    <div class="row"><div class="dash-legend"><span class="dash-leg"><i style="background:var(--ink-2)"></i>Entradas</span><span class="dash-leg"><i style="background:var(--red)"></i>Salidas</span></div>
    <div class="seg">${[7, 30, 90].map(r => `<button class="${range === r ? 'on' : ''}" data-act="dashRange" data-r="${r}">${r} d</button>`).join('')}</div></div></div>
    <div class="panel-b">${movementsSVG(series)}</div></section>`;
  const heat = `<section class="panel"><div class="panel-h"><div><h3>Actividad diaria</h3><span class="help">Entradas y salidas de las últimas 17 semanas</span></div></div><div class="panel-b">${heatmapSVG(entByDay, salByDay)}</div></section>`;

  // ---------- Composición ----------
  const PAL = ['var(--red)', 'var(--ink-2)', '#1F4FBF', '#0F766E', '#B45309', '#7C3AED', '#A1A1AA'];
  const group = (arr, fn, top = 5) => { const m = {}; arr.forEach(i => { const k = fn(i) || 'Sin indicar'; m[k] = (m[k] || 0) + qtyOf(i); }); let e = Object.entries(m).sort((a, b) => b[1] - a[1]); if (e.length > top) { const rest = e.slice(top).reduce((a, x) => a + x[1], 0); e = e.slice(0, top).concat([['Otros', rest]]); } return e; };
  const catSeg = cats().map(c => [c.name, sum(items.filter(i => i.cat === c.id)), c.color]).filter(x => x[1] > 0);
  const donuts = [
    ['Por categoría', catSeg],
    ['Condición', group(items, i => i.data.condicion).map((x, k) => [x[0], x[1], x[0] === 'Nuevo' ? 'var(--ok)' : x[0] === 'Refurbished' ? 'var(--info)' : PAL[k + 2]])],
    ['País de destino', group(items, i => i.data.pais).map((x, k) => [x[0], x[1], PAL[k]])],
    ['Marca', group(items, i => i.data.marca).map((x, k) => [x[0], x[1], PAL[k % PAL.length]])]
  ];
  const compo = `<section class="panel"><div class="panel-h"><div><h3>Composición del stock</h3><span class="help">Todas las unidades registradas</span></div></div><div class="panel-b dash-donuts">
    ${donuts.map(([t, seg]) => `<div class="dash-donut"><span class="dash-donut-t">${esc(t)}</span>${donutSVG(seg)}<div class="dash-donut-leg">${seg.slice(0, 6).map(([l, n, c]) => `<span><i style="background:${c}"></i>${esc(l)}<b class="num">${n.toLocaleString('es-ES')}</b></span>`).join('')}</div></div>`).join('')}</div></section>`;

  // ---------- Salud del inventario ----------
  const stockItems = items.filter(i => isStock(i.data.estado));
  const ageOf = i => { const d = new Date(i.data.fecha_entrada ? i.data.fecha_entrada + 'T00:00:00' : i.createdAt); return Math.max(0, Math.floor((now - d) / 86400000)); };
  const buckets = [['Menos de 30 días', 0, 30], ['30 a 90 días', 30, 90], ['90 a 180 días', 90, 180], ['180 días a 1 año', 180, 365], ['Más de 1 año', 365, 1e9]];
  const bk = buckets.map(([l, a, b]) => [l, sum(stockItems.filter(i => { const d = ageOf(i); return d >= a && d < b; }))]);
  const bkMax = Math.max(1, ...bk.map(x => x[1]));
  const avgAge = stockItems.length ? Math.round(stockItems.reduce((a, i) => a + ageOf(i) * qtyOf(i), 0) / Math.max(1, sum(stockItems))) : 0;
  const oldest = stockItems.slice().sort((a, b) => ageOf(b) - ageOf(a)).slice(0, 3);
  const aging = `<section class="panel"><div class="panel-h"><div><h3>Antigüedad del stock</h3><span class="help">Tiempo que lleva el material disponible</span></div><span class="dash-stat"><b class="num">${avgAge}</b> días de media</span></div><div class="panel-b">
    <div class="dash-hbars">${bk.map(([l, n], k) => `<div class="dash-hbar"><span>${esc(l)}</span><span class="dash-hbar-track"><i style="width:${n / bkMax * 100}%;background:${k >= 3 ? 'var(--warn)' : 'var(--ink-2)'}"></i></span><b class="num">${n}</b></div>`).join('')}</div>
    ${oldest.length ? `<p class="help" style="margin:14px 0 6px">Los que más tiempo llevan:</p>${oldest.map(i => `<button class="dash-row" data-act="openItem" data-id="${i.id}"><span><b class="serial">${esc(i.data.serie || itemTitle(i))}</b><span class="help" style="display:block">${esc(itemTitle(i))}</span></span><span class="help num">${ageOf(i)} días</span></button>`).join('')}` : ''}</div></section>`;
  const models = group(stockItems, i => [i.data.marca, i.data.modelo].filter(Boolean).join(' ') || i.data.tipo || (catById(i.cat) || {}).name, 8).filter(x => x[0] !== 'Otros');
  const modMax = Math.max(1, ...models.map(x => x[1]));
  const topModels = `<section class="panel"><div class="panel-h"><div><h3>Modelos disponibles</h3><span class="help">Los que más unidades tienen en stock</span></div></div><div class="panel-b dash-hbars">
    ${models.length ? models.map(([l, n]) => `<div class="dash-hbar wide"><span title="${esc(l)}">${esc(l)}</span><span class="dash-hbar-track"><i style="width:${n / modMax * 100}%;background:var(--red)"></i></span><b class="num">${n}</b></div>`).join('') : '<p class="muted" style="margin:0">Sin stock disponible.</p>'}</div></section>`;
  const rk = (iso.racks || []).slice().sort((a, b) => b.rate - a.rate);
  const occBox = rk.length ? `<section class="panel"><div class="panel-h"><div><h3>Ocupación por estantería</h3><span class="help">${plural(rk.filter(r => !r.n).length, 'estantería vacía', 'estanterías vacías')}</span></div><a class="btn sm ghost" href="#/mapa">Mapa 3D</a></div><div class="panel-b dash-hbars">
    ${rk.slice(0, 7).map(r => `<button class="dash-hbar dash-hbar-btn" data-act="dashRack" data-id="${esc(r.id)}"><span>Estantería ${esc(r.name)}</span><span class="dash-hbar-track"><i style="width:${Math.max(r.n ? 2 : 0, r.rate * 100)}%;background:${r.rate > .85 ? 'var(--red)' : r.rate > .5 ? 'var(--warn)' : 'var(--ok)'}"></i></span><b class="num">${Math.round(r.rate * 100)} %</b></button>`).join('')}</div></section>` : '';

  // ---------- Operaciones ----------
  const allOrders = (Store.orders || []).filter(o => almOk(o.cliente));
  const active = allOrders.filter(o => ['borrador', 'preparacion'].includes(o.status));
  const shipped = allOrders.filter(o => o.status === 'enviado' && o.shippedAt);
  const shippedMes = shipped.filter(o => new Date(o.shippedAt) >= m0).length;
  const recent = shipped.filter(o => now - new Date(o.shippedAt) < 90 * 86400000);
  const avgPrep = recent.length ? recent.reduce((a, o) => a + (new Date(o.shippedAt) - new Date(o.createdAt)), 0) / recent.length / 3600000 : null;
  const fmtDur = h => h === null ? '—' : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(h < 10 ? 1 : 0).replace('.', ',')} h` : `${Math.round(h / 24)} días`;
  const ordersBox = `<section class="panel"><div class="panel-h"><h3>Pedidos</h3><a class="btn sm ghost" href="#/pedidos">Ver todos</a></div><div class="panel-b">
    <div class="dash-mstats"><div><b class="num">${active.length}</b><span class="help">en curso</span></div><div><b class="num">${shippedMes}</b><span class="help">enviados este mes</span></div><div><b class="num">${fmtDur(avgPrep)}</b><span class="help">preparación media</span></div></div>
    <div class="dash-list" style="margin-top:8px">${active.slice(0, 4).map(o => `<a class="dash-row" href="#/pedidos/${esc(o.id)}"><span><b class="serial">${esc(o.number)}</b><span class="help" style="display:block">${esc(o.cliente)}${sedeLabel(o.sede) ? ', ' + esc(sedeLabel(o.sede)) : ''}</span></span>
      <span class="dash-mini"><span class="bar"><i style="width:${o.qty ? o.picked / o.qty * 100 : 0}%;background:var(--ok)"></i></span><span class="help num">${o.picked}/${o.qty}</span></span></a>`).join('') || '<p class="muted" style="margin:0">No hay pedidos en curso.</p>'}</div></div></section>`;
  const destM = {}; dels.filter(d => now - new Date(d.date) < 90 * 86400000).forEach(d => { const k = sedeLabel(d.sede) || d.cliente || 'Sin destino'; destM[k] = (destM[k] || 0) + (d.units || 0); });
  const dest = Object.entries(destM).sort((a, b) => b[1] - a[1]).slice(0, 6), dMax = Math.max(1, ...dest.map(x => x[1]));
  const destBox = `<section class="panel"><div class="panel-h"><div><h3>Destinos principales</h3><span class="help">Unidades enviadas en 90 días</span></div></div><div class="panel-b dash-hbars">
    ${dest.length ? dest.map(([l, n]) => `<div class="dash-hbar wide"><span title="${esc(l)}">${esc(l)}</span><span class="dash-hbar-track"><i style="width:${n / dMax * 100}%;background:var(--info)"></i></span><b class="num">${n}</b></div>`).join('') : '<p class="muted" style="margin:0">Todavía no hay envíos.</p>'}</div></section>`;
  const users = {}; Store.auditList().filter(e => now - new Date(e.t) < 30 * 86400000 && e.u !== 'sistema' && !['login', 'logout', 'login_fallido', 'mfa_fallido', 'exportacion'].includes(e.a)).forEach(e => { users[e.u] = (users[e.u] || 0) + 1; });
  const team = Object.entries(users).sort((a, b) => b[1] - a[1]).slice(0, 5), uMax = Math.max(1, ...team.map(x => x[1]));
  const teamBox = `<section class="panel"><div class="panel-h"><div><h3>Equipo</h3><span class="help">Acciones registradas en 30 días</span></div></div><div class="panel-b">
    ${team.length ? team.map(([u, n]) => { const usr = Object.values(Store.users).find(x => x.username === u); const nm = usr ? usr.name || u : u; return `<div class="dash-person"><span class="avatar sm">${esc(initials(nm))}</span><span class="dash-person-n"><b>${esc(nm)}</b><span class="dash-hbar-track"><i style="width:${n / uMax * 100}%;background:var(--red)"></i></span></span><span class="num help">${n}</span></div>`; }).join('') : '<p class="muted" style="margin:0">Sin actividad en los últimos 30 días.</p>'}</div></section>`;
  const expM = [0, 1, 2].map(k => { const a = new Date(now.getFullYear(), now.getMonth() + k, 1), b = new Date(now.getFullYear(), now.getMonth() + k + 1, 1); return {l: a.toLocaleDateString('es-ES', {month: 'long'}), n: 0, a, b}; });
  let vencidas = 0;
  items.filter(i => !E.baja.includes(i.data.estado)).forEach(i => { const c = catById(i.cat); (c ? c.fields : []).filter(f => f.expiry && i.data[f.key]).forEach(f => { const d = new Date(i.data[f.key] + 'T00:00:00'); if (d < now) vencidas++; else expM.forEach(m => { if (d >= m.a && d < m.b) m.n++; }); }); });
  const eMax = Math.max(1, ...expM.map(m => m.n));
  const expBox = `<section class="panel"><div class="panel-h"><div><h3>Garantías y licencias</h3><span class="help">Vencimientos de los próximos tres meses</span></div>${vencidas ? `<span class="badge red">${plural(vencidas, 'vencida')}</span>` : ''}</div><div class="panel-b">
    <div class="dash-cols">${expM.map(m => `<div class="dash-col"><span class="dash-col-bar">${m.n ? `<i style="height:${m.n / eMax * 100}%"></i>` : ''}</span><b class="num">${m.n}</b><span class="help">${esc(m.l)}</span></div>`).join('')}</div></div></section>`;

  // ---------- Bloques reutilizados ----------
  const catRows = cats().map(c => ({c, n: sum(items.filter(i => i.cat === c.id && isStock(i.data.estado))), t: sum(items.filter(i => i.cat === c.id))})).filter(x => x.t > 0);
  const maxCat = Math.max(1, ...catRows.map(x => x.t));
  const catsBox = `<section class="panel"><div class="panel-h"><h3>Stock por categoría</h3><span class="help">disponible / total</span></div><div class="panel-b dash-cats">
    ${catRows.map(x => `<a class="dash-cat" href="#/inventario/${esc(x.c.id)}"><span class="dash-cat-name"><i style="background:${esc(x.c.color)}"></i>${esc(x.c.name)}</span>
      <span class="dash-cat-bar"><i style="width:${x.t / maxCat * 100}%;background:${esc(x.c.color)};opacity:.22"></i><i style="width:${x.n / maxCat * 100}%;background:${esc(x.c.color)}"></i></span>
      <span class="num dash-cat-n"><b>${x.n.toLocaleString('es-ES')}</b> / ${x.t.toLocaleString('es-ES')}</span></a>`).join('')}</div></section>`;
  const rules = (Store.settings.stockRules || []).filter(r => r.active !== false && r.cat && (!r.almacen || !curAlm() || r.almacen === curAlm()));
  const rulesBox = rules.length ? `<section class="panel"><div class="panel-h"><h3>Stock mínimo</h3>${Auth.can('settings.manage') ? '<a class="btn sm ghost" href="#/ajustes/avisos">Configurar</a>' : ''}</div><div class="panel-b dash-rules">
    ${rules.map(r => { const n = ruleCount(r), max = Math.max(n, r.min * 2, 1), ok = n >= r.min; return `<div class="dash-rule"><div class="row" style="justify-content:space-between"><span>${esc(r.name)}</span><span class="num"><b style="color:${ok ? 'var(--ink)' : 'var(--red-ink)'}">${n}</b> <span class="muted">/ mín. ${r.min}</span></span></div>
      <div class="dash-rule-bar"><i style="width:${Math.min(100, n / max * 100)}%;background:${ok ? 'var(--ok)' : n === 0 ? 'var(--red)' : 'var(--warn)'}"></i><em style="left:${r.min / max * 100}%" title="Mínimo: ${r.min}"></em></div></div>`; }).join('')}</div></section>` : '';
  const lastDels = dels.slice(0, 5);
  const delsBox = `<section class="panel"><div class="panel-h"><h3>Últimos albaranes</h3><a class="btn sm ghost" href="#/albaranes">Ver todos</a></div><div class="panel-b dash-list">
    ${lastDels.length ? lastDels.map(d => `<a class="dash-row" href="${pdfUrl(d.id)}" target="_blank" rel="noopener" data-act="noop"><span><b class="serial">${esc(d.number)}</b><span class="help" style="display:block">${esc(sedeLabel(d.sede) || d.cliente)}</span></span><span class="help num" style="text-align:right">${plural(d.units || 0, 'ud.', 'uds.')}<br>${fmtDate(d.date)}</span></a>`).join('') : '<p class="muted" style="margin:0">Todavía no hay albaranes.</p>'}</div></section>`;
  const al = alertsList();
  const alertsBox = `<section class="panel"><div class="panel-h"><h3>Avisos</h3><span class="badge ${al.length ? 'red' : 'ok'}">${al.length || 'Todo en orden'}</span></div><div class="panel-b dash-list">
    ${al.length ? al.slice(0, 6).map(a => `<div class="dash-alert ${a.sev > 1 ? 'hi' : ''}" ${a.id ? `data-act="openItem" data-id="${a.id}"` : ''}>${ico(a.kind === 'stock' ? 'alert' : 'clock')}<span>${esc(a.text)}</span></div>`).join('') + (al.length > 6 ? `<p class="help" style="margin:6px 0 0">Y ${al.length - 6} más.</p>` : '') : '<p class="muted" style="margin:0">Sin stock bajo ni garantías o licencias a punto de vencer.</p>'}</div></section>`;
  const almBox = almacenes().length > 1 && !curAlm() ? `<section class="panel"><div class="panel-h"><h3>Por almacén</h3></div><div class="panel-b dash-list">
    ${almacenes().map(a => { const its = items.filter(i => almOfItem(i) === a.id); return `<button class="dash-row" data-act="dashAlm" data-id="${esc(a.id)}"><span><b>${esc(a.nombre)}</b><span class="help" style="display:block">${plural((a.clientes || []).length, 'cliente')}</span></span><span class="num" style="text-align:right"><b>${sum(its).toLocaleString('es-ES')}</b><span class="help" style="display:block">${sum(its.filter(i => isStock(i.data.estado)))} disponibles</span></span></button>`; }).join('')}</div></section>` : '';
  const feed = Store.auditList().filter(e => !['login', 'logout', 'login_fallido', 'mfa_fallido'].includes(e.a)).slice(0, 8);
  const feedBox = `<section class="panel"><div class="panel-h"><h3>Actividad reciente</h3>${Auth.can('audit.view') ? '<a class="btn sm ghost" href="#/registro">Ver todo</a>' : ''}</div><div class="panel-b">
    ${feed.length ? `<ol class="dash-feed">${feed.map(e => `<li><span class="dash-feed-dot"></span><div><span>${esc(e.d)}</span><span class="help">${esc(ACTION_LABEL[e.a] || e.a)}, ${esc(e.u)}, ${relTime(e.t)}</span></div></li>`).join('')}</ol>` : '<p class="muted" style="margin:0">Sin actividad todavía.</p>'}</div></section>`;

  return head + band + `
    <h2 class="dash-h">Actividad</h2><div class="dash-r2">${chart}${heat}</div>
    <h2 class="dash-h">Inventario</h2><div class="dash-r1">${compo}</div><div class="dash-r3">${aging}${topModels}${occBox || catsBox}</div>
    <div class="dash-r3">${occBox ? catsBox : ''}${rulesBox}${alertsBox}</div>
    <h2 class="dash-h">Operaciones</h2><div class="dash-r3">${ordersBox}${destBox}${teamBox}</div>
    <div class="dash-r3">${delsBox}${expBox}${almBox || ''}</div>
    <div class="dash-r1">${feedBox}</div>`;
};
function donutSVG(seg) {
  const tot = seg.reduce((a, x) => a + x[1], 0) || 1, R = 38, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = seg.map(([l, n, c]) => { const len = n / tot * C; const el = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${c}" stroke-width="14" stroke-dasharray="${Math.max(0, len - 1.2).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"><title>${esc(l)}: ${n}</title></circle>`; off += len; return el; }).join('');
  return `<svg viewBox="0 0 100 100" class="donut"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--neutral-soft)" stroke-width="14"/><g transform="rotate(-90 50 50)">${arcs}</g><text x="50" y="49" text-anchor="middle" class="donut-n">${tot.toLocaleString('es-ES')}</text><text x="50" y="62" text-anchor="middle" class="donut-l">uds.</text></svg>`;
}
function heatmapSVG(ent, sal) {
  const weeks = 17, cell = 13, gap = 3, top = 18, left = 26;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const days = []; for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  const val = d => { const k = d.toISOString().slice(0, 10); return (ent[k] || 0) + (sal[k] || 0); };
  const max = Math.max(1, ...days.map(val));
  const lvl = v => v === 0 ? 0 : Math.min(4, Math.ceil(v / max * 4));
  let months = '', lastM = -1; heatmapSVG._lw = -9;
  const cells = days.map(d => { const w = Math.floor((d - start) / 604800000), r = (d.getDay() + 6) % 7, v = val(d);
    if (r === 0 && d.getMonth() !== lastM && (w - (heatmapSVG._lw ?? -9)) >= 3) { lastM = d.getMonth(); heatmapSVG._lw = w; months += `<text x="${left + w * (cell + gap)}" y="11" class="dash-axis">${d.toLocaleDateString('es-ES', {month: 'short'})}</text>`; }
    return `<rect x="${left + w * (cell + gap)}" y="${top + r * (cell + gap)}" width="${cell}" height="${cell}" rx="3" class="hm hm-${lvl(v)}"><title>${d.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'})}: ${v} movimientos</title></rect>`; }).join('');
  const dl = ['L', '', 'X', '', 'V', '', ''].map((t, r) => t ? `<text x="0" y="${top + r * (cell + gap) + 10}" class="dash-axis">${t}</text>` : '').join('');
  const W = left + weeks * (cell + gap), H = top + 7 * (cell + gap);
  const legend = `<div class="hm-leg"><span class="help">Menos</span>${[0, 1, 2, 3, 4].map(l => `<i class="hm-${l}"></i>`).join('')}<span class="help">Más</span></div>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="dash-svg heat">${months}${dl}${cells}</svg>${legend}`;
}
function relTime(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'ahora mismo'; if (s < 3600) return `hace ${Math.floor(s / 60)} min`; if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ayer'; return fmtDT(iso);
}
function movementsSVG(series) {
  const W = 720, H = 220, pl = 34, pr = 8, pt = 12, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
  const max = Math.max(4, ...series.map(x => Math.max(x.e, x.s)));
  const rough = max / 4, mag = Math.pow(10, Math.floor(Math.log10(rough))), unit = [1, 2, 5, 10].find(m => m * mag >= rough) * mag, nice = Math.ceil(max / unit) * unit;
  const bw = iw / series.length, b = Math.max(2, bw * 0.32);
  const y = v => pt + ih - v / nice * ih;
  const grid = [...Array(Math.round(nice / unit) + 1)].map((_, k) => k / Math.round(nice / unit)).map(f => { const v = Math.round(nice * f); return `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="dash-grid-line"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end" class="dash-axis">${v}</text>`; }).join('');
  const bars = series.map((x, k) => { const cx = pl + bw * k + bw / 2; return `<g><title>${x.d.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}: ${x.e} entradas, ${x.s} salidas</title>
    <rect x="${cx - b - 1}" y="${y(x.e)}" width="${b}" height="${Math.max(0, ih + pt - y(x.e))}" rx="1.5" class="dash-bar-e"/><rect x="${cx + 1}" y="${y(x.s)}" width="${b}" height="${Math.max(0, ih + pt - y(x.s))}" rx="1.5" class="dash-bar-s"/>
    <rect x="${pl + bw * k}" y="${pt}" width="${bw}" height="${ih}" fill="transparent"/></g>`; }).join('');
  const labels = series.map((x, k) => (k % 5 === 4 || k === 0) ? `<text x="${pl + bw * k + bw / 2}" y="${H - 8}" text-anchor="middle" class="dash-axis">${x.d.getDate()}/${x.d.getMonth() + 1}</text>` : '').join('');
  return `<svg class="dash-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas y salidas por día">${grid}${bars}${labels}</svg>`;
}
/* =========================================================
   Inventario
   ========================================================= */
const GEN_COLS = [
  {key:'_cat', label:'Categoría'}, {key:'serie', label:'Nº de serie', type:'text'}, {key:'_title', label:'Equipo'},
  {key:'pais', label:'País', type:'select'}, {key:'cliente', label:'Cliente', type:'select'}, {key:'condicion', label:'Condición', type:'select'},
  {key:'estado', label:'Estado', type:'select'}, {key:'ubicacion', label:'Ubicación', type:'location'}, {key:'_qty', label:'Uds.'}
];
const colPrefKey = () => 'lbinv.cols.' + (S.cat || 'all');
const comboCols = () => ((Store.settings && Store.settings.combos) || []).map(c => ({key: c.key, label: c.label, combo: c}));
function allCols() {
  if (S.cat === 'all') return GEN_COLS.concat(comboCols());
  const c = catById(S.cat); return c ? c.fields.filter(f => f.type !== 'textarea').concat([{key:'_qty', label:'Unidades'}].filter(() => !c.serialized && !fieldOf(c, 'cantidad')), comboCols()) : [];
}
function tableCols() {
  const pref = LS.get(colPrefKey(), null), all = allCols();
  if (Array.isArray(pref) && pref.length) { const sel = pref.map(k => all.find(c => c.key === k)).filter(Boolean); if (sel.length) return sel; }
  if (S.cat === 'all') return GEN_COLS;
  const c = catById(S.cat); return c ? c.fields.filter(f => f.table).slice(0, 12) : [];
}
function colsMenuHTML() {
  const cur = tableCols().map(c => c.key);
  return `<details class="menu cols-menu"><summary class="btn sm">${ico('columns')}Columnas</summary><div class="pop">
    <div class="help" style="padding:6px 10px">Elige las columnas de esta vista. Se guardan en este navegador.</div>
    ${allCols().map(c => `<label class="cols-opt"><input type="checkbox" data-colkey="${esc(c.key)}" ${cur.includes(c.key) ? 'checked' : ''}>${esc(c.label)}${c.combo ? ' <span class="help">(combinada)</span>' : ''}</label>`).join('')}
    <hr>${Auth.can('settings.manage') && (!Auth.user.scope || Auth.user.scope.all) ? `<button data-act="comboQuick">${ico('plus')}Crear columna combinada…</button>` : ''}<button data-act="colsReset">${ico('reset')}Restablecer columnas</button></div></details>`;
}
function cellVal(it, col) {
  if (col.key === '_cat') { const c = catById(it.cat); return c ? c.name : it.cat; }
  if (col.combo) return comboRender(col.combo.template, it);
  if (col.key === '_title') return itemTitle(it);
  if (col.key === '_qty') return qtyOf(it);
  if (col.key === 'updatedAt') return it.updatedAt;
  return it.data[col.key];
}
function filteredItems() {
  let arr = Object.values(Store.items).filter(inAlm);
  if (S.cat !== 'all') arr = arr.filter(i => i.cat === S.cat);
  for (const k of ['pais', 'cliente', 'condicion', 'estado', 'ubicacion']) if (S.f[k]) arr = arr.filter(i => (i.data[k] || '') === S.f[k]);
  if (S.f.q.trim()) { const terms = norm(S.f.q).split(/\s+/).filter(Boolean); arr = arr.filter(i => { const t = norm(searchText(i)); return terms.every(q => t.includes(q)); }); }
  const {k, d} = S.sort; const col = tableCols().find(c => c.key === k) || {key:k};
  arr.sort((a, b) => {
    let x = cellVal(a, col), y = cellVal(b, col);
    if (typeof x === 'number' || typeof y === 'number') return ((Number(x) || 0) - (Number(y) || 0)) * d;
    return String(x ?? '').localeCompare(String(y ?? ''), 'es', {numeric:true}) * d;
  });
  return arr;
}
function filterSel(key, label, opts) {
  return `<select class="sel sm" data-filter="${key}" aria-label="${esc(label)}"><option value="">${esc(label)}: todos</option>${opts.map(o => `<option value="${esc(o.v ?? o)}" ${S.f[key] === (o.v ?? o) ? 'selected' : ''}>${esc(o.l ?? o)}</option>`).join('')}</select>`;
}
VIEWS.inventario = () => {
  const items = Object.values(Store.items);
  const c = S.cat === 'all' ? null : catById(S.cat);
  const tabs = `<div class="tabs" role="tablist"><button class="tab ${S.cat === 'all' ? 'on' : ''}" data-href="#/inventario/all">Todo<span class="c">${items.length}</span></button>${cats().map(x => `<button class="tab ${S.cat === x.id ? 'on' : ''}" data-href="#/inventario/${esc(x.id)}"><span class="cdot" style="--c:${esc(x.color)}"></span>${esc(x.name)}<span class="c">${items.filter(i => i.cat === x.id).length}</span></button>`).join('')}</div>`;
  const exp = Auth.can('inv.export'), imp = Auth.can('inv.import') && c;
  return `<div class="page-head"><div><h1>${c ? esc(c.icon + ' ' + c.name) : 'Inventario completo'}</h1><p>${c ? (c.serialized ? 'Control por número de serie.' : 'Control por cantidades.') : 'Todo el material del almacén en una sola vista.'}</p></div>
    <div class="row">
      ${exp || imp ? `<details class="menu"><summary class="btn">${ico('down')}Exportar o importar</summary><div class="pop">
        ${exp ? `<button data-act="exportCSV">${ico('file')}CSV de la vista actual</button><button data-act="exportXLSX">${ico('file')}Excel con todas las categorías</button><button data-act="labels">${ico('qr')}Etiquetas QR de la vista</button>` : ''}
        ${imp ? `<hr><button data-act="importCSV">${ico('up')}Importar CSV en ${esc(c.name)}</button>` : ''}</div></details>` : ''}
      ${Auth.can('inv.create') ? `<button class="btn primary" data-act="newItem" data-cat="${esc(S.cat)}">${ico('plus')}Dar de alta</button>` : ''}
    </div></div>
    ${tabs}
    <section class="panel">
      <div class="toolbar">
        <input class="inp sm" id="f-q" placeholder="Filtrar esta vista…" value="${esc(S.f.q)}" aria-label="Filtrar">
        ${filterSel('pais', 'País', listOf('paises'))}${filterSel('cliente', 'Cliente', listOf('clientes'))}${filterSel('condicion', 'Condición', listOf('condiciones'))}${filterSel('estado', 'Estado', listOf('estados'))}
        ${filterSel('ubicacion', 'Ubicación', allLocations().map(l => ({v:l.id, l:l.name})))}
        <button class="btn sm ghost" data-act="clearFilters">Limpiar filtros</button><span class="spacer"></span>${colsMenuHTML()}
      </div>
      <div id="tbl-area">${tableAreaHTML()}</div>
    </section>`;
};
function tableAreaHTML() {
  const rows = filteredItems(); const cols = tableCols();
  const pages = Math.max(1, Math.ceil(rows.length / S.perPage)); if (S.page > pages) S.page = pages;
  const pageRows = rows.slice((S.page - 1) * S.perPage, S.page * S.perPage);
  [...S.sel].forEach(id => { if (!Store.items[id]) S.sel.delete(id); });
  const allSel = pageRows.length && pageRows.every(r => S.sel.has(r.id));
  const canBulk = Auth.can('inv.edit') || Auth.can('inv.delete') || Auth.can('inv.export');
  const bulk = S.sel.size ? `<div class="bulk"><span>${plural(S.sel.size, 'seleccionado')}</span><span class="spacer"></span>
    ${Auth.can('inv.edit') ? `<button class="btn sm" data-act="bulkEdit">${ico('edit')}Cambiar estado, cliente o ubicación</button>` : ''}
    ${Auth.can('inv.edit') ? `<button class="btn sm" data-act="eraseOpen">${ico('shield')}Registrar borrado</button><button class="btn sm" data-act="certMake">${ico('file')}Certificado de borrado</button>` : ''}
    ${Auth.can('inv.export') ? `<button class="btn sm" data-act="labels" data-scope="sel">${ico('qr')}Etiquetas</button><button class="btn sm" data-act="exportCSV" data-scope="sel">${ico('down')}CSV</button>` : ''}
    ${Auth.can('inv.delete') ? `<button class="btn sm danger" data-act="bulkDelete">${ico('trash')}Eliminar</button>` : ''}
    <button class="btn sm ghost" data-act="clearSel">Quitar selección</button></div>` : '';
  if (!rows.length) return bulk + `<div class="empty"><h3>${Object.keys(Store.items).length ? 'Ningún material coincide con los filtros' : 'Todavía no hay material en esta categoría'}</h3><p>${Object.keys(Store.items).length ? 'Prueba a quitar filtros o a buscar otro término.' : 'Da de alta el primero o haz una entrada con el lector de códigos.'}</p></div>`;
  const th = cols.map(c => `<th class="sort" data-sort="${esc(c.key)}">${esc(c.label)}${S.sort.k === c.key ? (S.sort.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
  const body = pageRows.map(it => `<tr data-id="${it.id}" class="${S.sel.has(it.id) ? 'sel' : ''}">${canBulk ? `<td class="cb"><input type="checkbox" data-selrow="${it.id}" ${S.sel.has(it.id) ? 'checked' : ''} aria-label="Seleccionar"></td>` : ''}${cols.map(col => {
      if (col.key === '_cat') { const c = catById(it.cat); return `<td><span class="row" style="gap:7px"><span class="cdot" style="--c:${esc(c ? c.color : '#999')}"></span>${esc(c ? c.name : it.cat)}</span></td>`; }
      if (col.combo) return `<td>${esc(comboRender(col.combo.template, it))}</td>`;
      if (col.key === '_title') return `<td>${esc(itemTitle(it))}</td>`;
      if (col.key === '_qty') return `<td class="num">${qtyOf(it)}</td>`;
      return `<td>${fmtVal(col, it.data[col.key])}</td>`;
    }).join('')}<td class="muted">${fmtDT(it.updatedAt)}</td></tr>`).join('');
  return bulk + `<div class="tbl-wrap"><table class="tbl"><thead><tr>${canBulk ? `<th class="cb"><input type="checkbox" data-selall ${allSel ? 'checked' : ''} aria-label="Seleccionar página"></th>` : ''}${th}<th class="sort" data-sort="updatedAt">Actualizado${S.sort.k === 'updatedAt' ? (S.sort.d > 0 ? ' ▲' : ' ▼') : ''}</th></tr></thead><tbody>${body}</tbody></table></div>
    <div class="pager"><span>${plural(rows.length, 'registro')} · ${rows.reduce((a, i) => a + qtyOf(i), 0).toLocaleString('es-ES')} unidades</span>
    <span class="row"><button class="btn sm" data-act="page" data-p="${S.page - 1}" ${S.page <= 1 ? 'disabled' : ''}>Anterior</button><span>Página ${S.page} de ${pages}</span><button class="btn sm" data-act="page" data-p="${S.page + 1}" ${S.page >= pages ? 'disabled' : ''}>Siguiente</button></span></div>`;
}
function renderTable() { const a = $('#tbl-area'); if (a) a.innerHTML = tableAreaHTML(); }

/* ---------- Formulario de material ---------- */
function fieldInput(f, val, prefix = 'fld', opts = {}) {
  const id = `${prefix}-${f.key}`; const req = f.required && !opts.noReq;
  const lab = `<span>${esc(f.label)}${req ? ' <span class="req">*</span>' : ''}</span>`;
  if (f.type === 'bool') return `<label class="f"><span>${esc(f.label)}</span><label class="chk" style="height:38px"><input type="checkbox" id="${id}" ${val ? 'checked' : ''}> ${esc(f.label)}</label></label>`;
  if (f.type === 'textarea') return `<label class="f wide">${lab}<textarea class="ta" id="${id}" rows="2">${esc(val)}</textarea></label>`;
  if (f.type === 'select' || f.type === 'location') {
    let options = f.type === 'location' ? allLocations().map(l => ({v:l.id, l:l.name})) : (f.list ? listOf(f.list) : (f.options || [])).map(v => ({v, l:v}));
    if (val && !options.some(o => o.v === val)) options = [{v:val, l:val + ' (fuera de la lista)'}, ...options];
    const blank = opts.blank ? `<option value="__keep">${esc(opts.blank)}</option>` : `<option value="">${f.required ? 'Selecciona…' : '—'}</option>`;
    const canAdd = f.type === 'select' && f.list && Auth.can('settings.manage') && !opts.blank;
    return `<label class="f">${lab}<span class="selwrap"><select class="sel" id="${id}">${blank}${options.map(o => `<option value="${esc(o.v)}" ${!opts.blank && val === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>${canAdd ? `<button type="button" class="btn icon" data-act="addValToggle" data-for="${id}" title="Añadir a la lista ${esc(Store.settings.listLabels[f.list] || f.list)}" aria-label="Añadir valor">${ico('plus')}</button>` : ''}</span>
      ${canAdd ? `<span class="addval hide" id="${id}-add"><input class="inp sm" placeholder="Nuevo valor"><button type="button" class="btn sm primary" data-act="addValSave" data-for="${id}" data-list="${esc(f.list)}">Añadir</button></span>` : ''}</label>`;
  }
  const t = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
  const inputEl = `<input class="inp ${f.key === 'serie' ? 'serial' : ''}" id="${id}" type="${t}" ${t === 'number' ? 'step="any"' : ''} value="${esc(opts.blank ? '' : val)}" ${opts.blank ? `placeholder="${esc(opts.blank)}"` : ''}>`;
  if (f.key === 'serie' && prefix === 'fld') return `<label class="f">${lab}<span class="selwrap">${inputEl}${scanBtn(id, false, 'Número de serie')}</span></label>`;
  return `<label class="f">${lab}${inputEl}</label>`;
}
function readField(f, prefix = 'fld', root = document) {
  const el = root.querySelector('#' + prefix + '-' + f.key); if (!el) return undefined;
  if (f.type === 'bool') return el.checked;
  const v = el.value.trim();
  if (v === '__keep') return undefined;
  if (f.type === 'number') return v === '' ? '' : Number(v);
  return v;
}
function chooseCategory(then) {
  const L = openLayer(modalHTML('¿Qué vas a dar de alta?', `<div class="cats" style="margin:0">${cats().map(c => `<button class="cat-tile" style="--c:${esc(c.color)}" data-pick="${esc(c.id)}"><span class="ic">${esc(c.icon)}</span><span class="l">${esc(c.name)}</span><span class="s">${c.serialized ? 'Por número de serie' : 'Por cantidad'}</span></button>`).join('')}</div>`, '', 'narrow'));
  L.el.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) { closeLayer(L); then(b.dataset.pick); } });
}
function openItemForm(catId, itemId, preset) {
  const c = catById(catId); if (!c) return;
  const it = itemId ? Store.items[itemId] : null;
  const data = it ? clone(it.data) : Object.assign(defaultsFor(c), preset || {});
  const anyHuecos = almacenes().some(a => (a.layout.racks || []).some(r => Number(r.huecos) > 0));
  const body = `<form id="item-form" class="fgrid" novalidate>${c.fields.map(f => (f.key === 'ubicacion' ? (almacenes().length > 1 ? `<label class="f"><span>Almacén</span><select class="sel" id="fld-almacen">${almacenes().map(a => `<option value="${esc(a.id)}" ${(data.almacen || (almsOfClient(data.cliente).some(a => a.id === curAlm()) ? curAlm() : almOfClient(data.cliente))) === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>` : '') : '') + fieldInput(f, data[f.key]) + (f.key === 'nivel' && anyHuecos ? `<label class="f"><span>Hueco</span><input class="inp" id="fld-hueco" type="number" min="0" max="50" value="${esc(data.hueco || '')}" placeholder="Sin hueco"></label>` : '')).join('')}</form><div id="if-err" class="err-msg hide" style="margin-top:14px"></div>`;
  const foot = `<button class="btn" data-close>Cancelar</button>${!it ? `<button class="btn" data-save="again">Guardar y añadir otro</button>` : ''}<button class="btn primary" data-save="close">${it ? 'Guardar cambios' : 'Dar de alta'}</button>`;
  const L = openLayer(modalHTML(`${it ? 'Editar' : 'Alta de'} ${c.name.toLowerCase()}${it && it.data.serie ? ' · ' + it.data.serie : ''}`, body, foot));
  refreshLoc('fld', L.el);
  const serieEl = $('#fld-serie', L.el);
  if (serieEl && !it) setTimeout(() => serieEl.focus(), 40);
  const save = async mode => {
    const err = $('#if-err', L.el); err.classList.add('hide');
    const nd = {}; const missing = [];
    { const hu = $('#fld-hueco', L.el); if (hu) nd.hueco = Number(hu.value) || ''; else if (data.hueco) nd.hueco = data.hueco; }
    { const as = $('#fld-almacen', L.el); nd.almacen = as ? as.value : (data.almacen || almOfClient(readField(c.fields.find(f => f.key === 'cliente') || {key: 'cliente'}, 'fld', L.el)) || (almacenes()[0] || {}).id); }
    c.fields.forEach(f => { const v = readField(f, 'fld', L.el); nd[f.key] = v; if (f.required && (v === '' || v === undefined || v === null)) missing.push(f.label); });
    if (missing.length) { err.textContent = 'Completa: ' + missing.join(', ') + '.'; err.classList.remove('hide'); return; }
    for (const f of c.fields.filter(f => f.unique && nd[f.key])) {
      const dup = Object.values(Store.items).find(i => i.id !== (it && it.id) && norm(i.data[f.key]) === norm(nd[f.key]));
      if (dup) { err.innerHTML = `Ya existe ${esc(f.label.toLowerCase())} <b>${esc(nd[f.key])}</b> (${esc(catById(dup.cat) ? catById(dup.cat).name : '')}, ${esc(locName(dup.data.ubicacion) || 'sin ubicación')}).`; err.classList.remove('hide'); return; }
    }
    if (!c.serialized && nd.cantidad !== undefined && nd.cantidad < 0) { err.textContent = 'La cantidad no puede ser negativa.'; err.classList.remove('hide'); return; }
    const btns = $$('[data-save]', L.el); btns.forEach(b => b.disabled = true);
    try {
      let rec;
      if (it) { rec = clone(it); const d = diffText(c, it.data, nd); rec.data = nd; rec.updatedAt = nowISO(); rec.updatedBy = Auth.user.username; if (d) hist(rec, 'Edición', d); await Store.putItem(rec); Store.log('edicion', `${itemKey(rec)}: ${d || 'sin cambios'}`, rec.id); toast('Cambios guardados.'); }
      else { rec = {id:newId(), cat:c.id, data:nd, createdAt:nowISO(), createdBy:Auth.user.username, updatedAt:nowISO(), updatedBy:Auth.user.username, history:[]}; hist(rec, 'Alta', `${locName(nd.ubicacion) || 'Sin ubicación'}`); await Store.putItem(rec); Store.log('alta', `${c.name}: ${itemKey(rec)}`, rec.id); toast(`${itemKey(rec)} dado de alta.`); }
      if (mode === 'again') {
        c.fields.forEach(f => { if (f.unique || f.key === 'serie' || f.key === 'mac') { const el = $('#fld-' + f.key, L.el); if (el) el.value = ''; } });
        btns.forEach(b => b.disabled = false); const s = $('#fld-serie', L.el); s && s.focus();
      } else closeLayer(L);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); btns.forEach(b => b.disabled = false); }
  };
  L.el.addEventListener('click', e => { const b = e.target.closest('[data-save]'); if (b) { e.preventDefault(); save(b.dataset.save); } });
  $('#item-form', L.el).addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
      e.preventDefault();
      if (e.target.id === 'fld-serie' && !it) save('again'); else save('close');
    }
  });
}

/* ---------- Ficha lateral ---------- */
function openDrawer(id) {
  if (!Store.items[id]) return;
  S.drawerId = id;
  const L = openLayer(`<div class="panel-d" role="dialog" aria-modal="true" aria-label="Ficha del material" id="drawer"></div>`, {drawer:true, onClose: () => { S.drawerId = null; }});
  L.isDrawer = true; renderDrawer();
}
function renderDrawer() {
  const box = $('#drawer'); if (!box) return;
  const it = Store.items[S.drawerId];
  if (!it) { closeLayer(layers.find(l => l.isDrawer)); return; }
  const c = catById(it.cat) || {name:it.cat, fields:[], color:'#999'};
  const kv = c.fields.filter(f => f.key !== 'serie' && f.key !== 'notas').map(f => `<dt>${esc(f.label)}</dt><dd>${fmtVal(f, it.data[f.key])}${f.key === 'ubicacion' && it.data.ubicacion && Auth.can('map.view') ? ` <a href="#/mapa" data-act="showOnMap" data-loc="${esc(it.data.ubicacion)}">ver en el mapa</a>` : ''}</dd>`).join('');
  box.innerHTML = `<div class="d-head"><div class="row"><span class="badge" style="background:${esc(c.color)};color:#fff">${esc(c.icon || '')} ${esc(c.name)}</span>${statusBadge(it.data.estado)}<span class="spacer"></span><button class="btn ghost icon" data-close aria-label="Cerrar">${ico('x')}</button></div>
    <span class="serial">${esc(it.data.serie || itemTitle(it))}</span><span class="muted">${esc(itemTitle(it))}${!c.serialized ? ` · ${qtyOf(it)} uds.` : ''}</span>
    <div class="d-actions">${Auth.can('inv.edit') ? `<button class="btn sm primary" data-act="editItem" data-id="${it.id}">${ico('edit')}Editar</button><button class="btn sm" data-act="quickMove" data-id="${it.id}">${ico('swap')}Mover o cambiar estado</button>` : ''}
      ${Auth.can('inv.create') ? `<button class="btn sm" data-act="dupItem" data-id="${it.id}">${ico('copy')}Duplicar</button>` : ''}
      ${Auth.can('inv.export') ? `<button class="btn sm" data-act="labelOne" data-id="${it.id}">${ico('qr')}Etiqueta</button>` : ''}
      ${Auth.can('inv.delete') ? `<button class="btn sm danger" data-act="delItem" data-id="${it.id}">${ico('trash')}Eliminar</button>` : ''}</div></div>
    <div class="d-body">
      <div class="qr-box"><div class="qr" id="drawer-qr"></div><div><b class="serial">${esc(it.data.serie || it.id)}</b><div class="help">Escanea el código para identificar este material en el almacén.</div></div></div>
      ${it.data.borrado ? `<div class="erase-box">${ico('shield')}<div><b>Borrado de datos: ${esc(it.data.borrado.resultado)}</b><span class="help">${esc(it.data.borrado.metodo)}${it.data.borrado.herramienta ? ', ' + esc(it.data.borrado.herramienta) : ''}. ${fmtDate(it.data.borrado.fecha)}, ${esc(it.data.borrado.tecnico)}.${it.data.certificado_borrado ? ' Certificado ' + esc(it.data.certificado_borrado) + '.' : ''}</span></div></div>` : ''}
      <dl class="kv">${almacenes().length > 1 ? `<dt>Almacén</dt><dd>${esc((almById(almOfItem(it)) || {}).nombre || '—')}${it.data.traspaso ? ` <span class="badge warn">En tránsito (${esc(it.data.traspaso)})</span>` : ''}</dd>` : ''}${it.data.ubicacion && rackById(it.data.ubicacion) ? `<dt>Ubicación exacta</dt><dd><b class="serial loc-code">${esc(locCode(it.data))}</b></dd>` : ''}${kv}${it.data.pedido ? `<dt>Pedido</dt><dd><span class="serial">${esc(it.data.pedido)}</span></dd>` : ''}${it.data.destino ? `<dt>Destino</dt><dd>${esc(it.data.destino)}</dd>` : ''}${it.data.albaran_salida ? `<dt>Albarán de salida</dt><dd><span class="serial">${esc(it.data.albaran_salida)}</span></dd>` : ''}</dl>
      ${it.data.notas ? `<h3 style="margin-bottom:6px">Notas</h3><p style="white-space:pre-wrap;margin:0 0 20px">${esc(it.data.notas)}</p>` : ''}
      <h3 style="margin-bottom:12px">Historial</h3>
      <div class="timeline">${(it.history || []).slice().reverse().map(h => `<div><b>${esc(h.a)}</b>${h.d ? ` <span>${esc(h.d)}</span>` : ''}<div class="when">${esc(h.u)}, ${fmtDT(h.t)}</div></div>`).join('') || '<p class="muted">Sin historial.</p>'}</div>
      <p class="help" style="margin-top:20px">Creado por ${esc(it.createdBy)} el ${fmtDT(it.createdAt)}. Última modificación de ${esc(it.updatedBy)}.</p>
    </div>`;
  qrInto($('#drawer-qr'), qrText(it), 92);
}
function qrText(it) { return `LBR|${it.cat}|${it.data.serie || ''}|${it.id}`; }
function qrInto(el, text, size) {
  if (!el || !window.QRCode) return;
  el.innerHTML = '';
  try { new QRCode(el, {text, width:size, height:size, colorDark:'#000000', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M}); } catch {}
}
function qrDataURL(text, size = 160) {
  if (!window.QRCode) return '';
  const d = document.createElement('div');
  try { new QRCode(d, {text, width:size, height:size, correctLevel:QRCode.CorrectLevel.M}); } catch { return ''; }
  const cv = d.querySelector('canvas'); return cv ? cv.toDataURL('image/png') : '';
}

/* ---------- Edición masiva / movimiento rápido ---------- */
function openBulkEdit(ids, title) {
  const fake = (key, label, type, list) => ({key, label, type, list});
  const fs = [fake('estado', 'Estado', 'select', 'estados'), fake('cliente', 'Cliente', 'select', 'clientes'), fake('pais', 'País', 'select', 'paises'), fake('condicion', 'Condición', 'select', 'condiciones'), fake('ubicacion', 'Ubicación', 'location'), fake('nivel', 'Balda / nivel', 'number')];
  const L = openLayer(modalHTML(title || `Cambiar ${plural(ids.length, 'registro')}`, `<p class="muted" style="margin-top:0">Solo se modifican los campos que cambies.</p><div class="fgrid">${fs.map(f => fieldInput(f, '', 'bk', {blank:'Sin cambios'})).join('')}<label class="f wide">Comentario para el historial<input class="inp" id="bk-note" placeholder="Opcional: motivo, albarán, técnico…"></label></div>`,
    `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="bk-ok">Aplicar cambios</button>`));
  $('#bk-ok', L.el).onclick = async () => {
    const ch = {}; fs.forEach(f => { const v = readField(f, 'bk', L.el); if (v !== undefined && v !== '') ch[f.key] = v; });
    const note = $('#bk-note', L.el).value.trim();
    if (!Object.keys(ch).length) { toast('No has cambiado ningún campo.', 'warn'); return; }
    $('#bk-ok', L.el).disabled = true;
    const recs = ids.map(id => Store.items[id]).filter(Boolean).map(it => {
      const r = clone(it); const c = catById(r.cat); const before = clone(r.data);
      Object.assign(r.data, ch); r.updatedAt = nowISO(); r.updatedBy = Auth.user.username;
      hist(r, 'Movimiento', [c ? diffText(c, before, r.data) : '', note].filter(Boolean).join(' · ')); return r;
    });
    try {
      await Store.putMany(recs);
      Store.log('movimiento', `${plural(recs.length, 'registro')}: ${Object.entries(ch).map(([k, v]) => k === 'ubicacion' ? 'ubicación ' + locName(v) : `${k} ${v}`).join(', ')}${note ? ' · ' + note : ''}`);
      toast(`${plural(recs.length, 'registro')} actualizado${recs.length === 1 ? '' : 's'}.`);
      closeLayer(L); S.sel.clear(); renderTable();
    } catch (ex) { toast(ex.message, 'err'); $('#bk-ok', L.el).disabled = false; }
  };
}
/* =========================================================
   Exportar e importar
   ========================================================= */
function exportRows(items) {
  const catsIn = [...new Set(items.map(i => i.cat))].map(catById).filter(Boolean);
  const fields = []; catsIn.forEach(c => c.fields.forEach(f => { if (!fields.some(x => x.key === f.key)) fields.push(f); }));
  return items.map(it => {
    const c = catById(it.cat); const row = {'Categoría': c ? c.name : it.cat};
    fields.forEach(f => { const own = fieldOf(c, f.key); row[f.label] = own ? fmtVal(own, it.data[f.key], false) : ''; });
    if (catsIn.some(x => !x.serialized)) row['Unidades'] = qtyOf(it);
    row['Creado'] = fmtDT(it.createdAt); row['Creado por'] = it.createdBy || ''; row['Actualizado'] = fmtDT(it.updatedAt); row['Actualizado por'] = it.updatedBy || '';
    return row;
  });
}
function toCSV(rows) {
  if (!rows.length) return '';
  const head = Object.keys(rows[0]); rows.forEach(r => Object.keys(r).forEach(k => { if (!head.includes(k)) head.push(k); }));
  const q = v => { v = String(v ?? ''); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '\ufeff' + [head.map(q).join(';'), ...rows.map(r => head.map(h => q(r[h])).join(';'))].join('\r\n');
}
const stamp = () => today().replace(/-/g, '');
function scopeItems(el) { return el && el.dataset.scope === 'sel' ? [...S.sel].map(id => Store.items[id]).filter(Boolean) : filteredItems(); }
async function exportCSV(el) {
  const items = scopeItems(el); if (!items.length) { toast('No hay registros que exportar.', 'warn'); return; }
  const name = `inventario_${S.cat === 'all' ? 'completo' : S.cat}_${stamp()}.csv`;
  if (await saveFile(name, toCSV(exportRows(items)), 'text/csv;charset=utf-8')) Store.log('exportacion', `CSV con ${plural(items.length, 'registro')}`);
}
async function exportXLSX() {
  if (!window.XLSX) { try { toast('Preparando el Excel…', 'info'); await loadVendor('vendor/xlsx.full.min.js'); } catch { toast('No se ha podido cargar el motor de Excel. Usa la exportación CSV.', 'err'); return; } }
  const wb = XLSX.utils.book_new(); const all = Object.values(Store.items);
  const resumen = cats().map(c => {
    const ci = all.filter(i => i.cat === c.id); const r = {'Categoría': c.name, 'Total unidades': ci.reduce((a, i) => a + qtyOf(i), 0)};
    listOf('estados').forEach(s => { r[s] = ci.filter(i => i.data.estado === s).reduce((a, i) => a + qtyOf(i), 0); });
    listOf('paises').forEach(p => { r[p] = ci.filter(i => i.data.pais === p).reduce((a, i) => a + qtyOf(i), 0); });
    return r;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');
  const used = new Set(['Resumen']);
  cats().forEach(c => {
    const ci = all.filter(i => i.cat === c.id); if (!ci.length) return;
    let n = c.name.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31); while (used.has(n)) n = n.slice(0, 28) + '_' + used.size; used.add(n);
    const ws = XLSX.utils.json_to_sheet(exportRows(ci)); ws['!cols'] = Object.keys(exportRows(ci)[0]).map(k => ({wch: Math.max(12, Math.min(34, k.length + 4))}));
    XLSX.utils.book_append_sheet(wb, ws, n);
  });
  const buf = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  const ok = await saveFile(`inventario_${(Store.settings.company || 'laberit').toLowerCase()}_${stamp()}.xlsx`, new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  if (ok) Store.log('exportacion', `Excel completo con ${plural(all.length, 'registro')}`);
}
async function exportLabels(items) {
  if (!items.length) { toast('No hay registros para etiquetar.', 'warn'); return; }
  if (items.length > 600) { toast('Genera como máximo 600 etiquetas a la vez. Filtra o selecciona menos.', 'warn'); return; }
  const cards = items.map(it => {
    const c = catById(it.cat);
    return `<div class="l"><img src="${qrDataURL(qrText(it), 180)}" alt=""><div><b>${esc(it.data.serie || itemTitle(it))}</b><span>${esc(itemTitle(it))}</span><span>${esc(c ? c.name : '')} · ${esc(it.data.cliente || '')} · ${esc(it.data.pais || '')}</span><span>${esc(locName(it.data.ubicacion))}${it.data.nivel ? ' · balda ' + esc(it.data.nivel) : ''}</span></div></div>`;
  }).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas ${esc(Store.settings.company)}</title><style>
    @page{size:A4;margin:8mm}body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#111}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.l{border:1px solid #bbb;border-left:4px solid #C8102E;border-radius:2mm;padding:2.5mm;display:flex;gap:2.5mm;align-items:center;break-inside:avoid;height:30mm}
    .l img{width:24mm;height:24mm}.l div{display:flex;flex-direction:column;gap:.6mm;min-width:0}.l b{font-size:11pt;word-break:break-all}.l span{font-size:7.5pt;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bar{display:flex;justify-content:space-between;align-items:center;padding:8px 0}@media print{.bar{display:none}}</style></head>
    <body><div class="bar"><b>${esc(Store.settings.company)} · ${items.length} etiquetas</b><button onclick="print()">Imprimir</button></div><div class="g">${cards}</div></body></html>`;
  if (await saveFile(`etiquetas_${stamp()}.html`, html, 'text/html')) Store.log('exportacion', `Etiquetas QR de ${plural(items.length, 'registro')}`);
}
function parseCSV(text) {
  text = text.replace(/^\ufeff/, '');
  const first = text.split(/\r?\n/)[0] || ''; const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
function openImport() {
  const c = catById(S.cat); if (!c) return;
  const L = openLayer(modalHTML(`Importar ${c.name.toLowerCase()} desde CSV`, `
    <p style="margin-top:0">La primera fila debe tener los nombres de las columnas. Se reconocen por su nombre o clave: ${c.fields.map(f => `<b>${esc(f.label)}</b>`).join(', ')}. Separador <b>;</b> o <b>,</b>.</p>
    <div class="row"><input type="file" id="imp-file" accept=".csv,text/csv"><button class="btn sm" id="imp-tpl">${ico('down')}Descargar plantilla</button></div>
    <div id="imp-prev" style="margin-top:16px"></div>`, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="imp-ok" disabled>Importar</button>`));
  let parsed = [];
  $('#imp-tpl', L.el).onclick = () => saveFile(`plantilla_${c.id}.csv`, '\ufeff' + c.fields.map(f => f.label).join(';') + '\r\n', 'text/csv');
  $('#imp-file', L.el).onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const rows = parseCSV(await file.text()); if (rows.length < 2) { $('#imp-prev', L.el).innerHTML = '<div class="err-msg">El archivo no tiene filas de datos.</div>'; return; }
    const head = rows[0].map(h => norm(h.trim()));
    const map = head.map(h => c.fields.find(f => norm(f.label) === h || norm(f.key) === h) || null);
    const locs = allLocations();
    let dups = 0, missing = 0;
    parsed = rows.slice(1).map(r => {
      const d = defaultsFor(c);
      map.forEach((f, i) => {
        if (!f) return; let v = (r[i] || '').trim(); if (v === '') return;
        if (f.type === 'number') v = Number(v.replace(',', '.')) || 0;
        else if (f.type === 'bool') v = /^(s[ií]|true|1|yes|x)$/i.test(v);
        else if (f.type === 'location') { const l = locs.find(x => norm(x.name) === norm(v) || norm(x.id) === norm(v) || norm(x.name.replace('Estantería ', '')) === norm(v)); v = l ? l.id : ''; }
        else if (f.type === 'date') { const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if (m) v = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
        d[f.key] = v;
      });
      const dup = c.fields.some(f => f.unique && d[f.key] && (findBySerial(d[f.key]) && f.key === 'serie'));
      const miss = c.fields.some(f => f.required && (d[f.key] === '' || d[f.key] === undefined));
      if (dup) dups++; if (miss) missing++;
      return {d, dup, miss};
    });
    const seen = new Set(); parsed.forEach(p => { const s = norm(p.d.serie); if (s && seen.has(s)) { p.dup = true; dups++; } if (s) seen.add(s); });
    const ok = parsed.filter(p => !p.dup && !p.miss).length;
    $('#imp-prev', L.el).innerHTML = `<p><b>${plural(parsed.length, 'fila')}</b> leídas · columnas reconocidas: ${map.filter(Boolean).map(f => esc(f.label)).join(', ') || '<span class="err-msg">ninguna</span>'}</p>
      ${dups ? `<p class="badge warn">${dups} con número de serie ya registrado o repetido (se omitirán)</p> ` : ''}${missing ? `<p class="badge red">${missing} sin campos obligatorios (se omitirán)</p>` : ''}
      <p>Se importarán <b>${plural(ok, 'registro')}</b>.</p>`;
    $('#imp-ok', L.el).disabled = !ok;
  };
  $('#imp-ok', L.el).onclick = async () => {
    const good = parsed.filter(p => !p.dup && !p.miss);
    $('#imp-ok', L.el).disabled = true;
    const recs = good.map(p => { const r = {id:newId(), cat:c.id, data:p.d, createdAt:nowISO(), createdBy:Auth.user.username, updatedAt:nowISO(), updatedBy:Auth.user.username, history:[]}; hist(r, 'Alta', 'Importación CSV'); return r; });
    try { await Store.putMany(recs, n => { $('#imp-ok', L.el).textContent = `Importando ${n}/${recs.length}…`; }); Store.log('importacion', `${plural(recs.length, 'registro')} en ${c.name}`); toast(`${plural(recs.length, 'registro')} importado${recs.length === 1 ? '' : 's'}.`); closeLayer(L); }
    catch (ex) { toast(ex.message, 'err'); $('#imp-ok', L.el).disabled = false; }
  };
}

/* =========================================================
   Entradas y salidas por escáner
   ========================================================= */
S.mvCat = 'equipos';
VIEWS.movimientos = () => {
  const c = catById(S.mvCat) || cats()[0]; S.mvCat = c.id;
  const commonF = c.fields.filter(f => !f.unique && f.key !== 'notas' && f.key !== 'cantidad');
  const fake = (key, label, type, list) => ({key, label, type, list});
  const outF = [fake('estado', 'Nuevo estado', 'select', 'estados'), fake('cliente', 'Cliente', 'select', 'clientes'), fake('pais', 'País', 'select', 'paises'), fake('ubicacion', 'Ubicación', 'location'), fake('nivel', 'Balda / nivel', 'number')];
  const recent = Store.auditList().filter(e => ['entrada_masiva', 'salida_masiva', 'movimiento', 'importacion'].includes(e.a)).slice(0, 10);
  return `<div class="page-head"><div><h1>Entradas y salidas</h1><p>Pensado para lector de códigos de barras: cada lectura es una línea.</p></div></div>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h3>Entrada de material</h3><select class="sel sm" style="width:auto" id="mv-cat" data-act-change="mvCat">${cats().filter(x => Auth.can('inv.create')).map(x => `<option value="${esc(x.id)}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="panel-b">
        ${c.serialized ? `<label class="f"><span class="row" style="justify-content:space-between">Números de serie <span class="row" style="gap:6px"><button type="button" class="btn sm" data-act="readAlbaran" title="Lee los números de serie de una foto o PDF del albarán">${ico('file')}Leer albarán</button>${scanBtn('mv-serials', true, 'Entrada de material')}</span></span><textarea class="ta serial" id="mv-serials" rows="7" placeholder="Escanea o pega un número de serie por línea"></textarea><span class="help" id="mv-count">0 números de serie</span></label>`
        : `<label class="f">Cantidad recibida<input class="inp" id="mv-qty" type="number" min="1" value="1"></label>`}
        <h3 style="margin:18px 0 10px">Datos comunes a toda la entrada</h3>
        <div class="fgrid">${commonF.map(f => (f.key === 'ubicacion' ? (almacenes().length > 1 ? `<label class="f"><span>Almacén</span><select class="sel" id="mvin-almacen">${almacenes().map(a => `<option value="${esc(a.id)}" ${(curAlm() || almOfClient(defaultsFor(c).cliente)) === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>` : '') : '') + fieldInput(f, defaultsFor(c)[f.key], 'mvin')).join('')}</div>
        <div class="row" style="margin-top:16px"><span class="spacer"></span><button class="btn primary" data-act="mvIn">${ico('down')}Registrar entrada</button></div>
      </div></section>
    <section class="panel"><div class="panel-h"><h3>Salida o cambio por escaneo</h3></div>
      <div class="panel-b">
        <label class="f"><span class="row" style="justify-content:space-between">Números de serie ${scanBtn('mv-out', true, 'Salida de material')}</span><textarea class="ta serial" id="mv-out" rows="7" placeholder="Escanea los equipos que salen o cambian de estado"></textarea><span class="help" id="mv-out-info">Escanea para comprobar qué equipos se encuentran.</span></label>
        <div class="bulk-out"><div class="row" style="justify-content:space-between"><b style="font-size:13px">Material sin número de serie</b><button type="button" class="btn sm" data-act="bulkAdd">${ico('plus')}Añadir</button></div><div id="mv-bulk">${bulkLinesHTML()}</div></div>
        <h3 style="margin:18px 0 10px">Aplicar a los equipos encontrados</h3>
        <div class="fgrid">${outF.map(f => fieldInput(f, '', 'mvout', {blank:'Sin cambios'})).join('')}<label class="f wide">Comentario<input class="inp" id="mvout-note" placeholder="Técnico, ticket, motivo…"></label></div>
        <label class="chk" style="margin-top:16px;font-weight:600"><input type="checkbox" id="mv-alb" ${Store.settings.albaran.generateDefault !== false ? 'checked' : ''}>${ico('file')} Generar albarán de entrega en PDF</label>
        <div class="fgrid ${Store.settings.albaran.generateDefault !== false ? '' : 'hide'}" id="mv-alb-box" style="margin-top:12px">
          <label class="f">Sede de destino<select class="sel" id="mv-sede"><option value="">— Sin sede —</option>${(Store.settings.sedes || []).map(s => `<option value="${esc(s.id)}" ${Store.settings.albaran.defaultSedeId === s.id ? 'selected' : ''}>${esc([s.cliente, sedeLabel(s)].filter(Boolean).join(' · '))}</option>`).join('')}</select></label>
          <label class="f">Otro destino<input class="inp" id="mv-dest" placeholder="Si no está en la lista"><span class="help">Si lo rellenas, se usa en lugar de la sede.</span></label>
          <label class="f">Transportista<input class="inp" id="mv-carrier"></label>
          <label class="f">Referencia<input class="inp" id="mv-ref" placeholder="Nº de envío, ticket…"></label>
          <label class="f wide">Observaciones del albarán<textarea class="ta" id="mv-notes" rows="2"></textarea></label>
          <label class="chk wide"><input type="checkbox" id="mv-mail" ${Store.settings.albaran.mailDefault ? 'checked' : ''} ${Store.mailEnabled ? '' : 'disabled'}>${ico('send')} Enviar el albarán por correo${Store.mailEnabled ? '' : ' <span class="help">(el correo no está configurado en el servidor)</span>'}</label>
        </div>
        <div class="row" style="margin-top:16px"><span class="spacer"></span><button class="btn primary" data-act="mvOut">${ico('up')}Aplicar cambios</button></div>
      </div></section>
  </div>
  ${Auth.can('inv.move') && almacenes().length > 1 ? transferPanelHTML() : ''}
  ${Auth.can('inv.create') ? retiradaPanelHTML() : ''}
  ${Auth.can('inv.edit') || Auth.can('inv.move') ? `<section class="panel place-panel" style="margin-top:18px"><div class="panel-h"><div><h3>Colocar en ubicación</h3><span class="help">Escanea la etiqueta de la balda o del hueco y después los equipos que dejas ahí. Cada uno queda ubicado al momento.</span></div></div>
    <div class="panel-b"><div class="place-grid">
      <div class="place-loc ${S.placeLoc ? 'on' : ''}"><span class="help">Ubicación actual</span><b class="serial">${S.placeLoc ? esc(locCode(S.placeLoc)) : 'Escanea una etiqueta de ubicación'}</b>${S.placeLoc ? `<span class="help">${esc(locName(S.placeLoc.ubicacion))}</span><button class="btn sm ghost" data-act="placeClear">Cambiar</button>` : ''}</div>
      <div><label class="f">Código escaneado<span class="selwrap"><input class="inp serial" id="place-code" placeholder="Etiqueta de ubicación o número de serie" autocomplete="off">${scanBtn('place-code', true, 'Colocar en ubicación')}</span></label>
        <div class="place-log" id="place-log">${(S.placeLog || []).slice(0, 6).map(l => `<div class="${l.ok ? 'ok' : 'err'}">${esc(l.t)}</div>`).join('')}</div></div>
    </div></div></section>` : ''}
  <section class="panel" style="margin-top:18px"><div class="panel-h"><h3>Últimos movimientos</h3></div><div class="panel-b">
    ${recent.length ? `<div class="feed">${recent.map(e => `<div><span class="badge">${esc(ACTION_LABEL[e.a] || e.a)}</span><span>${esc(e.d)}</span><span class="when">${esc(e.u)}, ${fmtDT(e.t)}</span></div>`).join('')}</div>` : '<p class="muted">Todavía no hay movimientos.</p>'}
  </div></section>`;
};
const serialLines = id => [...new Set(($('#' + id) ? $('#' + id).value : '').split(/[\r\n\t,;]+/).map(s => s.trim()).filter(Boolean))];
function mvCountUpdate() {
  const el = $('#mv-count'); if (!el) return;
  const s = serialLines('mv-serials'); const d = s.filter(x => findBySerial(x));
  el.innerHTML = `${plural(s.length, 'número de serie', 'números de serie')}${d.length ? ` · <span style="color:var(--red-ink)">${d.length} ya registrado${d.length > 1 ? 's' : ''}: ${d.slice(0, 5).map(esc).join(', ')}${d.length > 5 ? '…' : ''}</span>` : ''}`;
}
function bulkLots() {
  return Object.values(Store.items).filter(it => { const c = catById(it.cat); return c && !c.serialized && isStock(it.data.estado) && !it.data.pedido && qtyOf(it) > 0; })
    .sort((a, b) => (catById(a.cat).name + itemTitle(a)).localeCompare(catById(b.cat).name + itemTitle(b), 'es'));
}
function bulkLinesHTML() {
  S.mvBulk = (S.mvBulk || []).filter(l => !l.itemId || Store.items[l.itemId]);
  if (!S.mvBulk.length) return '<p class="help" style="margin:6px 0 0">Soportes, accesorios y cualquier material que se controla por cantidad.</p>';
  const lots = bulkLots();
  return S.mvBulk.map((l, i) => {
    const it = Store.items[l.itemId]; const max = it ? qtyOf(it) : 0;
    return `<div class="bulk-line"><select class="sel sm" data-mvb="sel" data-i="${i}" id="mvb-sel-${i}"><option value="">Elige el material…</option>${lots.map(x => `<option value="${esc(x.id)}" ${x.id === l.itemId ? 'selected' : ''}>${esc(`${catById(x.cat).name} · ${itemTitle(x)}${x.data.cliente ? ' · ' + x.data.cliente : ''} · ${qtyOf(x)} uds. en ${locName(x.data.ubicacion) || 'sin ubicación'}`)}</option>`).join('')}</select>
      <input class="inp sm" type="number" min="1" ${max ? `max="${max}"` : ''} step="1" data-mvb="qty" data-i="${i}" id="mvb-qty-${i}" value="${l.qty || 1}" style="width:80px"><span class="help" style="white-space:nowrap">${it ? 'de ' + max : ''}</span>
      <button type="button" class="btn sm icon ghost" data-act="bulkDel" data-i="${i}" aria-label="Quitar">${ico('trash')}</button></div>`;
  }).join('');
}
function renderBulk() { const b = $('#mv-bulk'); if (b) b.innerHTML = bulkLinesHTML(); }
function mvOutUpdate() {
  const el = $('#mv-out-info'); if (!el) return;
  const s = serialLines('mv-out'); const found = s.filter(x => findBySerial(x)); const nf = s.filter(x => !findBySerial(x));
  el.innerHTML = s.length ? `${found.length} encontrado${found.length === 1 ? '' : 's'}${nf.length ? ` · <span style="color:var(--red-ink)">${nf.length} sin registrar: ${nf.slice(0, 5).map(esc).join(', ')}${nf.length > 5 ? '…' : ''}</span>` : ''}` : 'Escanea para comprobar qué equipos se encuentran.';
}
async function doMvIn(btn) {
  const c = catById(S.mvCat); const commonF = c.fields.filter(f => !f.unique && f.key !== 'notas' && f.key !== 'cantidad');
  const base = defaultsFor(c); commonF.forEach(f => { const v = readField(f, 'mvin'); if (v !== undefined) base[f.key] = v; });
  base.almacen = ($('#mvin-almacen') || {}).value || (almsOfClient(base.cliente).some(a => a.id === curAlm()) ? curAlm() : almOfClient(base.cliente)) || (almacenes()[0] || {}).id;
  const miss = commonF.filter(f => f.required && (base[f.key] === '' || base[f.key] === undefined)).map(f => f.label);
  if (miss.length) { toast('Completa: ' + miss.join(', '), 'warn'); return; }
  let recs;
  if (c.serialized) {
    const serials = serialLines('mv-serials').filter(s => !findBySerial(s));
    if (!serials.length) { toast('No hay números de serie nuevos que registrar.', 'warn'); return; }
    recs = serials.map(s => { const r = {id:newId(), cat:c.id, data:Object.assign({}, base, {serie:s}), createdAt:nowISO(), createdBy:Auth.user.username, updatedAt:nowISO(), updatedBy:Auth.user.username, history:[]}; hist(r, 'Alta', 'Entrada por escáner' + (base.albaran ? ' · albarán ' + base.albaran : '')); return r; });
  } else {
    const q = Number($('#mv-qty').value) || 0; if (q <= 0) { toast('Indica una cantidad mayor que cero.', 'warn'); return; }
    const match = Object.values(Store.items).find(i => i.cat === c.id && ['tipo', 'marca', 'modelo', 'cliente', 'pais', 'condicion', 'estado', 'ubicacion'].every(k => String(i.data[k] ?? '') === String(base[k] ?? '')));
    if (match) { const r = clone(match); r.data.cantidad = (Number(r.data.cantidad) || 0) + q; r.updatedAt = nowISO(); r.updatedBy = Auth.user.username; hist(r, 'Entrada', `+${q} uds. (total ${r.data.cantidad})`); recs = [r]; }
    else { const r = {id:newId(), cat:c.id, data:Object.assign({}, base, {cantidad:q}), createdAt:nowISO(), createdBy:Auth.user.username, updatedAt:nowISO(), updatedBy:Auth.user.username, history:[]}; hist(r, 'Alta', `Entrada de ${q} uds.`); recs = [r]; }
  }
  btn.disabled = true;
  try {
    await Store.putMany(recs, n => { btn.textContent = `Guardando ${n}/${recs.length}…`; });
    Store.log('entrada_masiva', c.serialized ? `${plural(recs.length, 'unidad', 'unidades')} de ${c.name} en ${locName(base.ubicacion) || 'sin ubicación'}` : `${$('#mv-qty').value} uds. de ${c.name} (${[base.tipo, base.marca, base.modelo].filter(Boolean).join(' ')})`);
    toast(c.serialized ? `Entrada registrada: ${plural(recs.length, 'unidad', 'unidades')}.` : 'Entrada registrada.');
    if ($('#mv-serials')) $('#mv-serials').value = ''; mvCountUpdate();
  } catch (ex) { toast(ex.message, 'err'); }
  btn.disabled = false; btn.innerHTML = ico('down') + 'Registrar entrada';
}
async function doMvOut(btn) {
  const found = serialLines('mv-out').map(s => findBySerial(s)).filter(Boolean);
  const bulk = (S.mvBulk || []).filter(l => l.itemId && Store.items[l.itemId]).map(l => ({itemId: l.itemId, qty: Math.max(1, Math.floor(Number(l.qty) || 1))}));
  if ((S.mvBulk || []).some(l => !l.itemId)) { toast('Elige el material en todas las líneas sin número de serie, o quita las vacías.', 'warn'); return; }
  for (const l of bulk) { const it = Store.items[l.itemId]; if (l.qty > qtyOf(it)) { toast(`Solo quedan ${qtyOf(it)} uds. de ${itemTitle(it)}.`, 'warn'); return; } }
  if (!found.length && !bulk.length) { toast('Escanea algún número de serie o añade material sin número de serie.', 'warn'); return; }
  const units = found.length + bulk.reduce((a, l) => a + l.qty, 0);
  const fake = (key, type) => ({key, type});
  const ch = {}; [fake('estado'), fake('cliente'), fake('pais'), fake('ubicacion'), fake('nivel', 'number')].forEach(f => { const v = readField(f, 'mvout'); if (v !== undefined && v !== '') ch[f.key] = v; });
  const withAlb = $('#mv-alb') && $('#mv-alb').checked;
  if (!Object.keys(ch).length && !withAlb) { toast('Elige al menos un cambio que aplicar.', 'warn'); return; }
  const note = $('#mvout-note').value.trim();
  if (withAlb || bulk.length) {
    const dest = withAlb ? $('#mv-dest').value.trim() : '', sedeId = withAlb && !dest ? $('#mv-sede').value : '';
    const withMail = withAlb && $('#mv-mail') && $('#mv-mail').checked && Store.mailEnabled;
    let mailPayload = null;
    if (withMail) {
      const sede = dest ? {nombre: dest} : (Store.settings.sedes || []).find(x => x.id === sedeId);
      mailPayload = await composeDeliveryMail({sede, cliente: ch.cliente || (found[0] && found[0].data.cliente) || '', units, title: 'Salida con albarán y envío por correo',
        intro: `Se generará un albarán con <b>${plural(units, 'unidad', 'unidades')}</b>${Object.keys(ch).length ? ' y se aplicarán estos cambios: ' + Object.entries(ch).map(([k, v]) => `${esc(k)} → <b>${esc(k === 'ubicacion' ? locName(v) : v)}</b>`).join(', ') : ''}, y se enviará por correo.`});
      if (!mailPayload) return;
    } else if (!await confirmDlg(withAlb ? 'Salida con albarán' : 'Aplicar cambios', `${withAlb ? 'Se generará un albarán con' : 'Se actualizarán'} <b>${plural(units, 'unidad', 'unidades')}</b>${Object.keys(ch).length ? ' y se aplicarán estos cambios: ' + Object.entries(ch).map(([k, v]) => `${esc(k)} → <b>${esc(k === 'ubicacion' ? locName(v) : v)}</b>`).join(', ') : ''}.`, withAlb ? 'Generar albarán' : 'Aplicar', false)) return;
    btn.disabled = true;
    try {
      const r = await API('POST', withAlb ? '/api/deliveries' : '/api/moves', {itemIds: found.map(x => x.id), bulk, cliente: ch.cliente || '', sedeId, sede: !sedeId && dest ? {nombre: dest} : {}, carrier: withAlb ? $('#mv-carrier').value : '', ref: withAlb ? $('#mv-ref').value : '', notes: withAlb ? $('#mv-notes').value : '', changes: ch, comment: note});
      $('#mv-out').value = ''; S.mvBulk = []; renderBulk(); mvOutUpdate();
      if (r.delivery) { Store.loadDeliveries(); const mr = mailPayload ? await sendDeliveryMail(r.delivery.id, mailPayload) : null; deliveryDone(r.delivery, mr); } else toast(`${plural(units, 'unidad', 'unidades')} actualizada${units === 1 ? '' : 's'}.`);
    } catch (ex) { toast(ex.message, 'err'); }
    btn.disabled = false; return;
  }
  const ok = await confirmDlg('Aplicar cambios', `Se actualizarán <b>${plural(found.length, 'equipo')}</b>: ${Object.entries(ch).map(([k, v]) => `${esc(k)} → <b>${esc(k === 'ubicacion' ? locName(v) : v)}</b>`).join(', ')}.`, 'Aplicar', false);
  if (!ok) return;
  const recs = found.map(it => { const r = clone(it); const c = catById(r.cat); const before = clone(r.data); Object.assign(r.data, ch); r.updatedAt = nowISO(); r.updatedBy = Auth.user.username; hist(r, 'Movimiento', [c ? diffText(c, before, r.data) : '', note].filter(Boolean).join(' · ')); return r; });
  btn.disabled = true;
  try {
    await Store.putMany(recs);
    Store.log('salida_masiva', `${plural(recs.length, 'equipo')}: ${Object.entries(ch).map(([k, v]) => `${k} ${k === 'ubicacion' ? locName(v) : v}`).join(', ')}${note ? ' · ' + note : ''}`);
    toast(`${plural(recs.length, 'equipo')} actualizado${recs.length === 1 ? '' : 's'}.`); $('#mv-out').value = ''; mvOutUpdate();
  } catch (ex) { toast(ex.message, 'err'); }
  btn.disabled = false;
}

/* =========================================================
   Registro de actividad
   ========================================================= */
VIEWS.registro = () => {
  const all = Store.auditList(); const users = [...new Set(all.map(e => e.u))];
  const acts = [...new Set(all.map(e => e.a))];
  return `<div class="page-head"><div><h1>Registro de actividad</h1><p>Últimos 30 días de altas, cambios, accesos y exportaciones.</p></div><button class="btn" data-act="exportAudit">${ico('down')}Exportar CSV</button></div>
  <section class="panel"><div class="toolbar"><input class="inp sm" id="au-q" placeholder="Buscar en el detalle…" value="${esc(S.auditQ)}">
    <select class="sel sm" data-audit="auditU"><option value="">Usuario: todos</option>${users.map(u => `<option ${S.auditU === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
    <select class="sel sm" data-audit="auditA"><option value="">Acción: todas</option>${acts.map(a => `<option value="${esc(a)}" ${S.auditA === a ? 'selected' : ''}>${esc(ACTION_LABEL[a] || a)}</option>`).join('')}</select></div>
    <div id="audit-area">${auditTableHTML()}</div></section>`;
};
function auditFiltered() {
  const q = norm(S.auditQ);
  return Store.auditList().filter(e => (!S.auditU || e.u === S.auditU) && (!S.auditA || e.a === S.auditA) && (!q || norm(e.d + ' ' + e.u).includes(q)));
}
function auditTableHTML() {
  const rows = auditFiltered().slice(0, 500);
  if (!rows.length) return '<div class="empty"><h3>Sin actividad con estos filtros</h3></div>';
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${rows.map(e => `<tr ${e.r && Store.items[e.r] ? `data-id="${esc(e.r)}"` : 'style="cursor:default"'}><td class="muted">${fmtDT(e.t)}</td><td>${esc(e.u)}</td><td><span class="badge ${e.a === 'login_fallido' || e.a === 'baja' ? 'red' : ''}">${esc(ACTION_LABEL[e.a] || e.a)}</span></td><td style="white-space:normal;max-width:620px">${esc(e.d)}</td></tr>`).join('')}</tbody></table></div>`;
}
/* =========================================================
   Mapa 3D del almacén
   ========================================================= */
const SHELF_H = 0.62, RACK_D = 1.1, CUBE = 0.32, STEP = 0.4;
VIEWS.mapa = () => `<div class="page-head"><div><h1>Mapa 3D del almacén</h1><p>Haz clic en una estantería o zona para ver qué contiene.</p></div>
  ${Auth.can('settings.manage') ? `<a class="btn" href="#/ajustes/almacen">${ico('cog')}Editar distribución</a>` : ''}</div>
  <div class="map-wrap"><div class="map-stage" id="map-stage"><div class="map-tools"><button class="btn sm" data-act="mapTop">${ico('top')}Vista superior</button><button class="btn sm" data-act="mapReset">${ico('reset')}Restablecer</button></div><div class="map-tip hide" id="map-tip"></div><div class="map-hint">Arrastra para girar · Mayús o botón derecho para desplazar · Rueda para acercar</div></div>
  <aside class="map-side" id="map-side"></aside></div>`;
const inMapAlm = i => almOfItem(i) === mapAlm() || (!i.data.cliente && !i.data.almacen && mapAlm() === (almacenes()[0] || {}).id);
function mapVisibleItems() {
  const q = norm(S.mapQ.trim());
  return Object.values(Store.items).filter(i => (!S.mapCats || S.mapCats.has(i.cat)) && (!S.mapClient || i.data.cliente === S.mapClient) && !EST().baja.includes(i.data.estado) && i.data.estado !== EST().enviado && inMapAlm(i));
}
function renderMapSide() {
  const side = $('#map-side'); if (!side) return;
  const vis = mapVisibleItems(); const all = Object.values(Store.items);
  const unplaced = vis.filter(i => !i.data.ubicacion || !allLocations(mapAlm()).some(l => l.id === i.data.ubicacion));
  const sel = S.mapSel ? allLocations(mapAlm()).find(l => l.id === S.mapSel) : null;
  let selHTML = '';
  if (sel) {
    const inLoc = vis.filter(i => i.data.ubicacion === sel.id);
    const lv = {}; inLoc.forEach(i => { const n = sel.kind === 'rack' ? Math.min(Math.max(1, Number(i.data.nivel) || 1), sel.levels) : 1; (lv[n] = lv[n] || []).push(i); });
    const levels = sel.kind === 'rack' ? Array.from({length: sel.levels}, (_, k) => sel.levels - k) : [1];
    selHTML = `<section class="panel"><div class="panel-h"><h3>${esc(sel.name)}</h3><span class="badge">${inLoc.reduce((a, i) => a + qtyOf(i), 0)} uds.</span></div><div class="panel-b" style="padding-top:4px">
      ${levels.map(n => `<div class="lvl"><h4>${sel.kind === 'rack' ? 'Balda ' + n : 'Suelo'} · ${(lv[n] || []).reduce((a, i) => a + qtyOf(i), 0)} uds.</h4>${(lv[n] || []).slice(0, 40).map(i => { const c = catById(i.cat); return `<button data-act="openItem" data-id="${i.id}" class="${S.mapHit === i.id ? 'hit' : ''}"><span class="cdot" style="--c:${esc(c ? c.color : '#999')}"></span><span class="serial" style="font-weight:600">${esc(i.data.serie || itemTitle(i))}</span><span class="muted" style="margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:45%">${esc(i.data.serie ? itemTitle(i) : qtyOf(i) + ' uds.')}</span></button>`; }).join('')}${(lv[n] || []).length > 40 ? `<p class="help">Y ${(lv[n].length - 40)} más.</p>` : ''}${!(lv[n] || []).length ? '<span class="help">Vacía</span>' : ''}</div>`).join('')}
    </div></section>`;
  }
  side.innerHTML = routePanelHTML() + `<section class="panel"><div class="panel-b" style="display:flex;flex-direction:column;gap:12px">
      ${(curLayout().plantas || []).length ? `<label class="f">Planta<select class="sel sm" id="map-planta"><option value="">Todas</option><option value="0" ${S.mapPlanta === '0' ? 'selected' : ''}>Planta baja</option>${curLayout().plantas.map(p => `<option value="${esc(p.id)}" ${S.mapPlanta === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>` : ''}
      <label class="f">Colorear estanterías por<select class="sel sm" id="map-heat"><option value="">Nada</option>${Object.entries(HEAT_MODES).map(([k, l]) => `<option value="${k}" ${S.mapHeat === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${S.mapHeat ? `<div class="heat-leg"><span class="help">${S.mapHeat === 'occ' ? 'Vacía' : S.mapHeat === 'age' ? 'Reciente' : 'Poco'}</span><i style="background:linear-gradient(90deg,${heatColor(0)},${heatColor(0.5)},${heatColor(1)})"></i><span class="help">${S.mapHeat === 'occ' ? 'Llena' : S.mapHeat === 'age' ? '1 año o más' : 'Mucho'}</span></div>` : ''}
      <label class="f">Localizar número de serie<span class="selwrap"><input class="inp" id="map-q" placeholder="Escanea o escribe…" value="${esc(S.mapQ)}" autocomplete="off">${scanBtn('map-q', false, 'Localizar en el mapa')}</span></label>
      <div class="fchips">${cats().map(c => `<button class="fchip ${S.mapCats && !S.mapCats.has(c.id) ? 'off' : ''}" data-act="mapCat" data-id="${esc(c.id)}"><span class="cdot" style="--c:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('')}</div>
      ${almacenes().length > 1 ? `<select class="sel sm" id="map-alm" aria-label="Almacén">${almacenes().map(a => `<option value="${esc(a.id)}" ${mapAlm() === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select>` : ''}
      <select class="sel sm" id="map-client" aria-label="Cliente"><option value="">Todos los clientes</option>${listOf('clientes').filter(c => ((almById(mapAlm()) || {}).clientes || []).includes(c)).map(c => `<option ${S.mapClient === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <p class="help" style="margin:0">${plural(vis.reduce((a, i) => a + qtyOf(i), 0), 'unidad', 'unidades')} visibles. No se muestran las enviadas ni las dadas de baja.${unplaced.length ? ` <b style="color:var(--warn)">${unplaced.length} sin ubicación.</b>` : ''}</p>
    </div></section>${selHTML || '<section class="panel"><div class="empty" style="padding:28px 16px"><h3>Selecciona una estantería</h3><p>Verás el contenido de cada balda.</p></div></section>'}`;
}
const Map3D = {
  mounted:false,
  mount(el) {
    this.unmount();
    if (!window.THREE) {
      el.insertAdjacentHTML('beforeend', '<div class="empty map-loading"><div class="sp-bar"><i></i></div><p>Cargando el mapa 3D…</p></div>');
      loadVendor('vendor/three.min.js').then(() => { const l = el.querySelector('.map-loading'); if (l) l.remove(); if (S.view === 'mapa' && document.body.contains(el)) { Map3D.mount(el); renderMapSide(); } })
        .catch(() => { const l = el.querySelector('.map-loading'); if (l) l.innerHTML = 'No se ha podido cargar el motor 3D. Comprueba la conexión.'; });
      return;
    }
    let r;
    try { r = new THREE.WebGLRenderer({antialias:true}); } catch { el.insertAdjacentHTML('beforeend', '<div class="empty">Este dispositivo no admite gráficos 3D (WebGL).</div>'); return; }
    this.el = el; this.renderer = r;
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.setSize(el.clientWidth || 600, el.clientHeight || 400);
    el.insertBefore(r.domElement, el.firstChild);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, (el.clientWidth || 600) / (el.clientHeight || 400), 0.1, 600);
    this.resetView(false);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9aa2, 0.95));
    const dl = new THREE.DirectionalLight(0xffffff, 0.55); dl.position.set(14, 30, 18); this.scene.add(dl);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.mounted = true;
    this.build(); this.bind();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
    const loop = t => { if (!this.mounted) return; this.raf = requestAnimationFrame(loop); this.frame(t); };
    this.raf = requestAnimationFrame(loop);
  },
  unmount() {
    if (!this.mounted) return;
    this.mounted = false; cancelAnimationFrame(this.raf); this.ro && this.ro.disconnect();
    this.disposeTree(this.root); this.renderer.dispose(); this.renderer.domElement.remove();
    window.removeEventListener('pointerup', this._up);
  },
  disposeTree(o) { if (!o) return; o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) { (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { m.map && m.map.dispose(); m.dispose(); }); } }); },
  resetView(anim = true) { const L = curLayout(); this.target = new THREE.Vector3(0, 0, 0); this.sph = {r: Math.max(L.width, L.depth) * 1.15, theta: 0.55, phi: 0.95}; },
  colors() {
    const cs = getComputedStyle(document.documentElement); const g = k => cs.getPropertyValue(k).trim() || '#888';
    return {bg:g('--paper'), floor:g('--floor'), grid:g('--grid'), shelf:g('--shelf'), red:g('--red'), ink:g('--ink'), muted:g('--muted'), paper:g('--paper')};
  },
  label(text, color, bg, scale = 1) {
    const cv = document.createElement('canvas'); const ctx = cv.getContext('2d'); const fs = 56;
    ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`; const w = Math.ceil(ctx.measureText(text).width) + 40;
    cv.width = w; cv.height = fs + 28; ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`;
    if (bg) { ctx.fillStyle = bg; const r = 14; ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, cv.height, r); ctx.arcTo(w, cv.height, 0, cv.height, r); ctx.arcTo(0, cv.height, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.fill(); }
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, 20, cv.height / 2 + 2);
    const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false, transparent:true}));
    const h = 0.75 * scale; sp.scale.set(h * w / cv.height, h, 1); sp.renderOrder = 10; return sp;
  },
  build() {
    if (!this.mounted) return;
    this.disposeTree(this.root); this.root.clear();
    const L = curLayout(), c = this.colors();
    this.c = c; this.scene.background = new THREE.Color(c.bg);
    const floorGeo = isShaped(L) ? new THREE.ShapeGeometry(new THREE.Shape(floorPoly(L).map(p => new THREE.Vector2(p[0], -p[1])))) : new THREE.PlaneGeometry(L.width, L.depth);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({color:c.floor}));
    floor.rotation.x = -Math.PI / 2; this.root.add(floor);
    if (L.plan && L.plan.image) {
      // Plano de fondo sobre el suelo.
      const tex = new THREE.TextureLoader().load(L.plan.image, () => { this.dirty = true; });
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(L.width, L.depth), new THREE.MeshBasicMaterial({map: tex, transparent: true, opacity: L.plan.opacity ?? 0.6, depthWrite: false}));
      pm.rotation.x = -Math.PI / 2; pm.position.y = 0.004; this.root.add(pm);
    }
    const pts = [];
    for (let x = -L.width / 2; x <= L.width / 2 + 0.01; x += 2) pts.push(x, 0.005, -L.depth / 2, x, 0.005, L.depth / 2);
    for (let z = -L.depth / 2; z <= L.depth / 2 + 0.01; z += 2) pts.push(-L.width / 2, 0.005, z, L.width / 2, 0.005, z);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.root.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({color:c.grid})));
    const wallMat = new THREE.MeshLambertMaterial({color:c.shelf});
    wallSegs(L).forEach(([a, b]) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.01) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.15, 0.5, 0.15), wallMat);
      m.position.set((a[0] + b[0]) / 2, 0.25, (a[1] + b[1]) / 2); m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); this.root.add(m);
    });
    const doorMat = new THREE.MeshLambertMaterial({color: new THREE.Color(c.red)});
    doorGeom(L).forEach(g => {
      const H = 2.2, ang = -Math.atan2(g.u[1], g.u[0]);
      [g.A, g.B].forEach(q => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, 0.14), doorMat); post.position.set(q[0], H / 2, q[1]); this.root.add(post); });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(g.w + 0.14, 0.14, 0.14), doorMat); lintel.position.set(g.C[0], H, g.C[1]); lintel.rotation.y = ang; this.root.add(lintel);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(g.w, 1.4), new THREE.MeshBasicMaterial({color: new THREE.Color(c.red), transparent: true, opacity: 0.18, depthWrite: false}));
      strip.rotation.x = -Math.PI / 2; strip.rotation.z = ang; strip.position.set(g.C[0] + g.n[0] * 0.7, 0.018, g.C[1] + g.n[1] * 0.7); this.root.add(strip);
      const lb = this.label(g.d.name || 'Entrada', '#ffffff', c.red, 0.8); lb.position.set(g.C[0], H + 0.6, g.C[1]); this.root.add(lb);
    });
    this.hits = []; this.locs = {};
    L.zones.filter(mapPlantaVis).forEach(z => {
      const zal = plantaAlt(L, z.planta);
      const col = new THREE.Color(z.color || c.red);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.d), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.13}));
      pl.rotation.x = -Math.PI / 2; pl.position.set(z.x, zal + 0.012, z.z); pl.userData.loc = z.id; this.root.add(pl); this.hits.push(pl);
      const eg = new THREE.EdgesGeometry(new THREE.PlaneGeometry(z.w, z.d)); const ln = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({color:col}));
      ln.rotation.x = -Math.PI / 2; ln.position.set(z.x, zal + 0.02, z.z); this.root.add(ln);
      const sel = new THREE.Mesh(new THREE.BoxGeometry(z.w, 0.06, z.d), new THREE.MeshBasicMaterial({color:new THREE.Color(c.red), transparent:true, opacity:0.0}));
      sel.position.set(z.x, zal + 0.03, z.z); this.root.add(sel);
      const lb = this.label(z.name, '#ffffff', z.color || c.red, 0.9); lb.position.set(z.x, zal + 0.6, z.z - z.d / 2 + 0.6); this.root.add(lb);
      this.locs[z.id] = {kind:'zone', z, sel, group:null, alt: zal};
    });
    (L.objects || []).filter(mapPlantaVis).forEach(o => {
      const g = objGeom(o), col = new THREE.Color(g.T.c), og = new THREE.Group(); og.position.y = plantaAlt(L, o.planta); og.add(og);
      if (!g.h) {
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(g.w, g.d), new THREE.MeshBasicMaterial({color: col, transparent: true, opacity: o.type === 'pasillo' ? 0.12 : 0.35, depthWrite: false}));
        pl.rotation.x = -Math.PI / 2; pl.position.set(g.x, 0.014, g.z); og.add(pl);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(g.w, g.d)), new THREE.LineDashedMaterial({color: col, dashSize: 0.3, gapSize: 0.2}));
        ed.rotation.x = -Math.PI / 2; ed.position.set(g.x, 0.02, g.z); ed.computeLineDistances(); og.add(ed);
      } else if (o.type === 'extintor') {
        const cy = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, g.h, 16), new THREE.MeshLambertMaterial({color: col})); cy.position.set(g.x, g.h / 2, g.z); og.add(cy);
      } else if (o.type === 'oficina') {
        const bx = new THREE.Mesh(new THREE.BoxGeometry(g.w, g.h, g.d), new THREE.MeshLambertMaterial({color: col, transparent: true, opacity: 0.16, depthWrite: false})); bx.position.set(g.x, g.h / 2, g.z); og.add(bx);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(g.w, g.h, g.d)), new THREE.LineBasicMaterial({color: col})); ed.position.set(g.x, g.h / 2, g.z); og.add(ed);
      } else {
        const bx = new THREE.Mesh(new THREE.BoxGeometry(g.w, g.h, g.d), new THREE.MeshLambertMaterial({color: col})); bx.position.set(g.x, g.h / 2, g.z); og.add(bx);
      }
      if (g.label) { const lb = this.label(g.label, o.type === 'salida' ? '#ffffff' : c.ink, o.type === 'salida' ? g.T.c : c.paper, o.type === 'pasillo' ? 0.75 : 0.7); lb.position.set(g.x, (g.h || 0) + (o.type === 'pasillo' || o.type === 'salida' ? 0.4 : 0.5), g.z); og.add(lb); }
    });
    (L.plantas || []).filter(p => !S.mapPlanta || S.mapPlanta === p.id).forEach(p => {
      const al = Math.max(0, Number(p.altura) || 0), w = Number(p.w) || 8, d = Number(p.d) || 6, x = Number(p.x) || 0, z = Number(p.z) || 0;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), new THREE.MeshLambertMaterial({color: new THREE.Color(c.shelf), transparent: true, opacity: 0.42, depthWrite: false})); slab.position.set(x, al - 0.06, z); this.root.add(slab);
      const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.12, d)), new THREE.LineBasicMaterial({color: new THREE.Color(c.muted)})); ed.position.set(x, al - 0.06, z); this.root.add(ed);
      const postMat = new THREE.MeshLambertMaterial({color: new THREE.Color(c.muted)});
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { const po = new THREE.Mesh(new THREE.BoxGeometry(0.16, al, 0.16), postMat); po.position.set(x + sx * (w / 2 - 0.1), al / 2, z + sz * (d / 2 - 0.1)); this.root.add(po); });
      const rail = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 1, d)), new THREE.LineBasicMaterial({color: new THREE.Color(c.muted), transparent: true, opacity: 0.5})); rail.position.set(x, al + 0.5, z); this.root.add(rail);
      const lb = this.label(p.nombre || 'Altillo', '#ffffff', c.ink, 1.1); lb.position.set(x - w / 2 + 1.2, al + 1.5, z + d / 2 - 0.4); this.root.add(lb);
    });
    const upMat = new THREE.MeshLambertMaterial({color:new THREE.Color(c.red)});
    const shMat = new THREE.MeshLambertMaterial({color:new THREE.Color(c.shelf)});
    L.racks.filter(mapPlantaVis).forEach(rk => {
      const ownElev = Math.max(0, Number(rk.elev) || 0), base = plantaAlt(L, rk.planta), elev = ownElev + base;
      const g = new THREE.Group(); g.position.set(rk.x, elev, rk.z); g.rotation.y = -(rk.rot || 0) * Math.PI / 180;
      const len = rk.len || 4, lv = Math.max(1, rk.levels || 4), H = lv * SHELF_H + 0.25;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const u = new THREE.Mesh(new THREE.BoxGeometry(0.07, H, 0.07), upMat); u.position.set(sx * (len / 2 - 0.035), H / 2, sz * (RACK_D / 2 - 0.035)); g.add(u); });
      const nh = Math.max(0, Math.round(Number(rk.huecos) || 0));
      if (nh > 1) for (let i = 0; i < lv; i++) for (let k = 1; k < nh; k++) { const dv = new THREE.Mesh(new THREE.BoxGeometry(0.02, SHELF_H - 0.1, RACK_D), shMat); dv.position.set(-len / 2 + k * len / nh, 0.12 + i * SHELF_H + (SHELF_H - 0.1) / 2, 0); g.add(dv); }
      for (let i = 0; i < lv; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.045, RACK_D), shMat); s.position.set(0, 0.12 + i * SHELF_H, 0); g.add(s); }
      const hitGeo = new THREE.BoxGeometry(len, H, RACK_D);
      const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false}));
      hit.position.y = H / 2; hit.userData.loc = rk.id; g.add(hit); this.hits.push(hit);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(hitGeo), new THREE.LineBasicMaterial({color:new THREE.Color(c.red)}));
      edges.position.y = H / 2; edges.scale.set(1.04, 1.03, 1.12); edges.visible = false; g.add(edges);
      this.root.add(g);
      const lb = this.label(rk.name, c.ink, c.paper); lb.position.set(rk.x, elev + H + 0.55, rk.z); this.root.add(lb);
      if (ownElev > 0) {
        // Sombra en el suelo (o en el altillo) para ver dónde queda una balda alta.
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(len, RACK_D), new THREE.MeshBasicMaterial({color: new THREE.Color(c.ink), transparent: true, opacity: 0.1, depthWrite: false}));
        sh.rotation.x = -Math.PI / 2; sh.rotation.z = -(rk.rot || 0) * Math.PI / 180; sh.position.set(rk.x, base + 0.015, rk.z); this.root.add(sh);
        const eg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(len, RACK_D)), new THREE.LineBasicMaterial({color: new THREE.Color(c.muted), transparent: true, opacity: 0.6}));
        eg.rotation.x = -Math.PI / 2; eg.rotation.z = -(rk.rot || 0) * Math.PI / 180; eg.position.set(rk.x, base + 0.02, rk.z); this.root.add(eg);
      }
      this.locs[rk.id] = {kind:'rack', rk, group:g, edges, len, lv, H, elev};
    });
    this.itemGroup = null; this.buildItems(); this.applySel(); this.applyHeat(); this.buildRoute();
  },
  buildItems() {
    if (!this.mounted) return;
    if (this.itemGroup) { this.itemGroup.parent && this.itemGroup.parent.remove(this.itemGroup); this.disposeTree(this.itemGroup); }
    const ig = new THREE.Group(); this.itemGroup = ig; this.root.add(ig);
    const geo = new THREE.BoxGeometry(CUBE, CUBE, CUBE); const mats = {};
    const mat = cat => { const c = catById(cat); return mats[cat] || (mats[cat] = new THREE.MeshLambertMaterial({color:new THREE.Color(c ? c.color : '#888')})); };
    const hitMat = new THREE.MeshLambertMaterial({color:new THREE.Color(this.c.red), emissive:new THREE.Color(this.c.red), emissiveIntensity:0.6});
    this.hitMeshes = [];
    const by = {};
    mapVisibleItems().forEach(i => {
      const loc = this.locs[i.data.ubicacion]; if (!loc) return;
      const lvl = loc.kind === 'rack' ? Math.min(Math.max(1, Number(i.data.nivel) || 1), loc.lv) : 1;
      const k = i.data.ubicacion + '|' + lvl; (by[k] = by[k] || []).push(i);
    });
    Object.entries(by).forEach(([k, list]) => {
      const [locId, lvl] = k.split('|'); const loc = this.locs[locId];
      const units = []; list.forEach(i => { const n = Math.min(qtyOf(i), 60); for (let u = 0; u < n; u++) units.push(i); });
      units.sort((a, b) => (a.cat > b.cat ? 1 : -1));
      const nh = loc.kind === 'rack' ? Math.max(0, Math.round(Number(loc.rk.huecos) || 0)) : 0;
      if (loc.kind === 'rack' && nh > 1) {
        // Cada equipo, en su hueco.
        const sw = loc.len / nh, per = Math.max(1, Math.floor((sw - 0.08) / STEP)), cap = per * 2 * 2;
        const bySlot = {}; units.forEach(i => { const h = Math.min(nh, Math.max(1, Number(i.data.hueco) || 1)); (bySlot[h] = bySlot[h] || []).push(i); });
        Object.entries(bySlot).forEach(([h, us]) => {
          us.slice(0, cap).forEach((i, n) => {
            const layer = Math.floor(n / (per * 2)), m = n % (per * 2), row = m % 2, col = Math.floor(m / 2);
            const mesh = new THREE.Mesh(geo, S.mapHit === i.id ? hitMat : mat(i.cat));
            mesh.position.set(-loc.len / 2 + (h - 1) * sw + 0.04 + CUBE / 2 + 0.02 + col * STEP, 0.12 + (lvl - 1) * SHELF_H + 0.025 + CUBE / 2 + layer * (CUBE + 0.02), row ? 0.24 : -0.24);
            loc.group.add(mesh); mesh.userData.item = i.id; if (S.mapHit === i.id) this.hitMeshes.push(mesh);
            (ig.userData.racks = ig.userData.racks || []).push(mesh);
          });
        });
      } else if (loc.kind === 'rack') {
        const per = Math.max(1, Math.floor((loc.len - 0.1) / STEP)); const cap = per * 2 * 2;
        units.slice(0, cap).forEach((i, n) => {
          const layer = Math.floor(n / (per * 2)), m = n % (per * 2), row = m % 2, col = Math.floor(m / 2);
          const mesh = new THREE.Mesh(geo, S.mapHit === i.id ? hitMat : mat(i.cat));
          mesh.position.set(-loc.len / 2 + 0.25 + col * STEP, 0.12 + (lvl - 1) * SHELF_H + 0.025 + CUBE / 2 + layer * (CUBE + 0.02), row ? 0.24 : -0.24);
          loc.group.add(mesh); mesh.userData.item = i.id; if (S.mapHit === i.id) this.hitMeshes.push(mesh);
          ig.userData.racks = ig.userData.racks || []; ig.userData.racks.push(mesh);
        });
        if (units.length > cap) { const lb = this.label('+' + (units.length - cap), '#fff', this.c.red, 0.55); lb.position.set(loc.len / 2 - 0.4, 0.12 + (lvl - 1) * SHELF_H + 0.6, 0.7); loc.group.add(lb); (ig.userData.racks = ig.userData.racks || []).push(lb); }
      } else {
        const z = loc.z; const cols = Math.max(1, Math.floor((z.w - 0.6) / STEP)), rows = Math.max(1, Math.floor((z.d - 1.4) / STEP)); const cap = cols * rows * 3;
        units.slice(0, cap).forEach((i, n) => {
          const layer = Math.floor(n / (cols * rows)), m = n % (cols * rows);
          const mesh = new THREE.Mesh(geo, S.mapHit === i.id ? hitMat : mat(i.cat));
          mesh.position.set(z.x - z.w / 2 + 0.4 + (m % cols) * STEP, (loc.alt || 0) + CUBE / 2 + 0.02 + layer * (CUBE + 0.02), z.z - z.d / 2 + 1.3 + Math.floor(m / cols) * STEP);
          ig.add(mesh); if (S.mapHit === i.id) this.hitMeshes.push(mesh);
        });
      }
    });
    this._mats = mats;
  },
  applyHeat() {
    if (!this.mounted) return;
    const vals = S.mapHeat ? heatValues() : {};
    Object.entries(this.locs || {}).forEach(([id, l]) => {
      if (l.heat) { l.heat.parent && l.heat.parent.remove(l.heat); l.heat.geometry.dispose(); l.heat.material.dispose(); l.heat = null; }
      if (!S.mapHeat || l.kind !== 'rack' || !vals[id]) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(l.len + 0.1, l.H + 0.05, RACK_D + 0.1), new THREE.MeshBasicMaterial({color: new THREE.Color(heatColor(vals[id].t)), transparent: true, opacity: 0.32, depthWrite: false}));
      m.position.y = l.H / 2; l.group.add(m); l.heat = m;
    });
  },
  buildRoute() {
    if (!this.mounted) return;
    if (this.routeGroup) { this.routeGroup.parent && this.routeGroup.parent.remove(this.routeGroup); this.disposeTree(this.routeGroup); this.routeGroup = null; }
    const R = S.route && S.routeOrder && pickRoute(S.routeOrder); if (!R || !R.stops.length) return;
    const g = new THREE.Group(); this.routeGroup = g; this.root.add(g);
    const c = this.colors(), mat = new THREE.MeshBasicMaterial({color: new THREE.Color(c.red)}), done = new THREE.MeshBasicMaterial({color: new THREE.Color('#16A34A')});
    const seg = (a, b, m) => { const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.01) return; const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.16), m); mesh.position.set((a[0] + b[0]) / 2, 0.06, (a[1] + b[1]) / 2); mesh.rotation.y = -Math.atan2(dz, dx); g.add(mesh); };
    let prev = R.start, allDoneBefore = true;
    R.stops.forEach((st, k) => {
      const m = allDoneBefore && st.done ? done : mat;
      const corner = [st.p[0], prev[1]];
      seg(prev, corner, m); seg(corner, st.p, m);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20), st.done ? done : mat); dot.position.set(st.p[0], 0.07, st.p[1]); g.add(dot);
      const lb = this.label(String(k + 1), '#ffffff', st.done ? '#16A34A' : c.red, 0.85); lb.position.set(st.p[0], (st.top || 2) + 0.9, st.p[1]); g.add(lb);
      if (!st.done) allDoneBefore = false;
      prev = st.p;
    });
    const sl = this.label('Inicio', '#ffffff', c.ink, 0.75); sl.position.set(R.start[0], 1.2, R.start[1]); g.add(sl);
  },
  refresh() {
    if (!this.mounted) return;
    if (this.itemGroup && this.itemGroup.userData.racks) { this.itemGroup.userData.racks.forEach(m => { m.parent && m.parent.remove(m); if (m.material && m.material.map) { m.material.map.dispose(); m.material.dispose(); } }); }
    const sig = JSON.stringify(curLayout()) + document.documentElement.dataset.theme + '|' + (S.mapPlanta || '');
    if (sig !== this._sig) { this._sig = sig; this.build(); } else { this.buildItems(); this.applySel(); this.applyHeat(); this.buildRoute(); }
  },
  applySel() {
    Object.entries(this.locs || {}).forEach(([id, l]) => {
      if (l.kind === 'rack') l.edges.visible = id === S.mapSel; else l.sel.material.opacity = id === S.mapSel ? 0.35 : 0;
    });
  },
  select(id, focus) {
    S.mapSel = id; this.applySel(); renderMapSide();
    if (focus && this.locs[id]) { const l = this.locs[id]; const p = l.kind === 'rack' ? l.rk : l.z; this.target.set(p.x, 0, p.z); this.sph.r = Math.min(this.sph.r, 18); }
  },
  frame(t) {
    const {r, theta, phi} = this.sph;
    this.camera.position.set(this.target.x + r * Math.sin(phi) * Math.sin(theta), this.target.y + r * Math.cos(phi), this.target.z + r * Math.sin(phi) * Math.cos(theta));
    this.camera.lookAt(this.target);
    if (this.hitMeshes && this.hitMeshes.length) { const s = 1 + 0.18 * Math.sin(t / 180); this.hitMeshes.forEach(m => m.scale.set(s, s, s)); }
    this.renderer.render(this.scene, this.camera);
  },
  resize() {
    if (!this.mounted) return; const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  },
  pick(cx, cy, list) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(v, this.camera);
    const hit = rc.intersectObjects(list || this.hits, false)[0]; return hit ? hit.object : null;
  },
  bind() {
    const dom = this.renderer.domElement; dom.style.touchAction = 'none';
    const ptrs = new Map(); let mode = null, moved = 0, pinch = 0, lastHover = 0;
    const tip = $('#map-tip');
    const dist = () => { const p = [...ptrs.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
    dom.addEventListener('contextmenu', e => e.preventDefault());
    dom.addEventListener('pointerdown', e => {
      dom.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); moved = 0;
      mode = ptrs.size === 2 ? 'pinch' : (e.button === 2 || e.shiftKey) ? 'pan' : 'rot'; if (mode === 'pinch') pinch = dist();
    });
    dom.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId);
      if (!p) {
        if (e.timeStamp - lastHover < 60) return; lastHover = e.timeStamp;
        const o = this.pick(e.clientX, e.clientY);
        if (o && tip) {
          const id = o.userData.loc; const n = mapVisibleItems().filter(i => i.data.ubicacion === id).reduce((a, i) => a + qtyOf(i), 0);
          const rect = this.el.getBoundingClientRect(); tip.textContent = `${locName(id)}: ${n} uds.${S.mapHeat && heatValues()[id] ? ', ' + heatValues()[id].text : ''}`; tip.style.left = (e.clientX - rect.left) + 'px'; tip.style.top = (e.clientY - rect.top) + 'px'; tip.classList.remove('hide'); dom.style.cursor = 'pointer';
        } else if (tip) { tip.classList.add('hide'); dom.style.cursor = ''; }
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy); p.x = e.clientX; p.y = e.clientY;
      if (mode === 'pinch' && ptrs.size === 2) { const d = dist(); if (pinch) this.sph.r = Math.min(90, Math.max(5, this.sph.r * pinch / d)); pinch = d; return; }
      if (mode === 'rot') { this.sph.theta -= dx * 0.006; this.sph.phi = Math.min(1.42, Math.max(0.03, this.sph.phi - dy * 0.006)); }
      if (mode === 'pan') {
        const k = this.sph.r * 0.0016; const th = this.sph.theta;
        this.target.x -= (Math.cos(th) * dx - Math.sin(th) * dy) * k; this.target.z -= (-Math.sin(th) * dx - Math.cos(th) * dy) * k;
        const L = curLayout(); this.target.x = Math.max(-L.width / 2, Math.min(L.width / 2, this.target.x)); this.target.z = Math.max(-L.depth / 2, Math.min(L.depth / 2, this.target.z));
      }
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (moved < 6 && ptrs.size === 0 && e.type === 'pointerup') {
        const o = this.pick(e.clientX, e.clientY);
        if (o) { S.mapHit = null; this.select(o.userData.loc, false); } else { S.mapSel = null; this.applySel(); renderMapSide(); }
      }
      if (ptrs.size < 2) pinch = 0; if (!ptrs.size) mode = null;
    };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('pointerleave', () => tip && tip.classList.add('hide'));
    dom.addEventListener('wheel', e => { e.preventDefault(); this.sph.r = Math.min(90, Math.max(5, this.sph.r * (1 + Math.sign(e.deltaY) * 0.1))); }, {passive:false});
  }
};
function mapLocate(q) {
  S.mapQ = q; const it = q.trim() ? findBySerial(q) || Object.values(Store.items).find(i => norm(i.data.serie).includes(norm(q.trim()))) : null;
  if (it && it.data.ubicacion && Map3D.locs && Map3D.locs[it.data.ubicacion]) {
    S.mapHit = it.id; if (S.mapCats && !S.mapCats.has(it.cat)) S.mapCats.add(it.cat);
    Map3D.refresh(); Map3D.select(it.data.ubicacion, true);
  } else if (S.mapHit) { S.mapHit = null; Map3D.refresh(); }
}
/* =========================================================
   Ajustes
   ========================================================= */
const STABS = [['general', 'General'], ['listas', 'Listas y marcas'], ['clientes', 'Clientes y albaranes'], ['avisos', 'Avisos de stock'], ['categorias', 'Categorías y campos'], ['almacen', 'Almacenes'], ['roles', 'Roles y permisos'], ['copias', 'Copias de seguridad']];
function draft() { if (!S.sdraft) S.sdraft = clone(Store.settings); return S.sdraft; }
const dirty = () => S.sdraft && JSON.stringify(S.sdraft) !== JSON.stringify(Store.settings);
function setPath(o, path, v) { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) t = t[k[i]]; t[k[k.length - 1]] = v; }
function getPath(o, path) { return path.split('.').reduce((t, k) => t == null ? t : t[k], o); }
const bid = path => 'b-' + path.replace(/[^a-zA-Z0-9_-]/g, '_');
function bInp(path, type = 'text', attrs = '') { const v = getPath(draft(), path); return `<input class="inp sm" id="${bid(path)}" data-bind="${esc(path)}" data-type="${type}" type="${type === 'number' ? 'number' : type === 'color' ? 'color' : 'text'}" ${type === 'number' ? 'step="any"' : ''} value="${esc(v ?? '')}" ${attrs}>`; }
function bChk(path, label, attrs = '') { return `<label class="chk"><input type="checkbox" id="${bid(path)}" data-bind="${esc(path)}" data-type="bool" ${getPath(draft(), path) ? 'checked' : ''} ${attrs}>${label ? esc(label) : ''}</label>`; }
VIEWS.ajustes = () => {
  if (!STABS.some(t => t[0] === S.stab)) S.stab = 'general';
  const d = draft(); let body = '';
  if (S.stab === 'general') body = `<section class="panel"><div class="panel-b"><div class="fgrid">
      <label class="f">Nombre de la empresa ${bInp('company')}</label>
      <label class="f">Color principal<span class="row" style="gap:8px">${bInp('tema.primario', 'color', 'style="width:56px;padding:3px"')}<span class="theme-presets">${['#C8102E', '#1F4FBF', '#0F766E', '#7C3AED', '#B45309', '#18181B'].map(c => `<button type="button" class="swatch" style="background:${c}" data-act="themePick" data-c="${c}" title="${c}" aria-label="Color ${c}"></button>`).join('')}</span></span><span class="help">Se aplica a la aplicación, los PDF y los correos.</span></label>
      <label class="f">Cierre de sesión por inactividad (minutos) ${bInp('sessionMinutes', 'number', 'min="5"')}</label>
      <label class="f">Longitud mínima de contraseña ${bInp('minPassword', 'number', 'min="8"')}</label>
      <label class="f">Intentos fallidos antes de bloquear ${bInp('maxAttempts', 'number', 'min="3"')}</label>
      <label class="f">Minutos de bloqueo ${bInp('lockMinutes', 'number', 'min="1"')}</label>
      <label class="f">Avisar de garantías y licencias con (días) ${bInp('expiryWarnDays', 'number', 'min="1"')}</label>
      <label class="f">Verificación en dos pasos<select class="sel sm" data-bind="mfaRequired" id="b-mfaRequired">${[['off', 'Opcional (cada usuario decide)'], ['admins', 'Obligatoria para administradores'], ['all', 'Obligatoria para todos']].map(([v, l]) => `<option value="${v}" ${d.mfaRequired === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">Recordar el equipo durante (días) ${bInp('mfaRememberDays', 'number', 'min="0" max="90"')}<span class="help">0 para pedir el código siempre.</span></label>
    </div><p class="help" style="margin-top:16px">Las contraseñas se guardan en el servidor con scrypt y una sal aleatoria por usuario; nunca en claro. La sesión usa una cookie HttpOnly y caduca tras el tiempo de inactividad indicado.</p></div></section>
    <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Pantalla de carga</h3><span class="help">La que se ve al abrir la aplicación, antes del inicio de sesión. Los cambios se aplican desde la siguiente visita de cada navegador.</span></div><button class="btn sm" data-act="splashPreview">${ico('eye')}Vista previa</button></div><div class="panel-b"><div class="fgrid">
      <label class="f">Mostrar<span style="height:32px;display:flex;align-items:center">${bChk('splash.enabled', 'Pantalla de carga activada')}</span></label>
      <label class="f">Qué se ve<select class="sel sm" data-bind="splash.show" id="b-splash_show"><option value="auto" ${d.splash.show !== 'text' ? 'selected' : ''}>El logotipo del menú (si hay imagen)</option><option value="text" ${d.splash.show === 'text' ? 'selected' : ''}>Solo el texto</option></select></label>
      <label class="f">Animación<select class="sel sm" data-bind="splash.anim" id="b-splash_anim">${[['rack', 'Estantería llenándose'], ['pulse', 'Logotipo latiendo'], ['none', 'Sin animación']].map(([k, l]) => `<option value="${k}" ${d.splash.anim === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">Fondo<select class="sel sm" data-bind="splash.bg" id="b-splash_bg">${[['auto', 'Según el tema (claro u oscuro)'], ['color', 'Color principal'], ['white', 'Siempre blanco']].map(([k, l]) => `<option value="${k}" ${d.splash.bg === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">Título ${bInp('splash.title', 'text', `placeholder="${esc(d.company || 'Laberit')}"`)}<span class="help">Vacío = nombre de la empresa.</span></label>
      <label class="f">Subtítulo ${bInp('splash.sub', 'text', 'placeholder="Control de almacén"')}</label>
      <label class="f">Mensaje bajo la barra ${bInp('splash.msg', 'text', 'placeholder="Conectando con el almacén…"')}<span class="help">Opcional.</span></label>
      <label class="f">Tiempo mínimo (ms) ${bInp('splash.minMs', 'number', 'min="0" max="4000" step="50"')}<span class="help">Para que no sea un destello. 0 = sin mínimo.</span></label>
    </div></div></section>
    <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Estados con significado</h3><span class="help">Indica qué estados de tu lista usa la aplicación para el stock, los pedidos, los envíos y las bajas. Así puedes renombrarlos sin que deje de funcionar nada.</span></div></div><div class="panel-b"><div class="fgrid">
      <div class="f"><span>Cuentan como disponibles</span><div class="est-list">${(d.lists.estados || []).map(v => `<label class="chk"><input type="checkbox" data-estlist="stock" value="${esc(v)}" ${(d.estadosSistema.stock || []).includes(v) ? 'checked' : ''}>${esc(v)}</label>`).join('')}</div><span class="help">Stock, avisos y reservas de pedidos.</span></div>
      <label class="f">Reservado para un pedido<select class="sel sm" data-bind="estadosSistema.reservado" id="b-estadosSistema_reservado">${(d.lists.estados || []).map(v => `<option ${d.estadosSistema.reservado === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="f">En tránsito (traspasos entre almacenes)<select class="sel sm" data-bind="estadosSistema.transito" id="b-estadosSistema_transito">${(d.lists.estados || []).map(v => `<option ${EST2(d).transito === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="f">Retirado (equipos recogidos del cliente)<select class="sel sm" data-bind="estadosSistema.retirado" id="b-estadosSistema_retirado">${(d.lists.estados || []).map(v => `<option ${EST2(d).retirado === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="f">Enviado (al generar albarán o enviar un pedido)<select class="sel sm" data-bind="estadosSistema.enviado" id="b-estadosSistema_enviado">${(d.lists.estados || []).map(v => `<option ${d.estadosSistema.enviado === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <div class="f"><span>De baja (no salen en el mapa ni en los avisos)</span><div class="est-list">${(d.lists.estados || []).map(v => `<label class="chk"><input type="checkbox" data-estlist="baja" value="${esc(v)}" ${(d.estadosSistema.baja || []).includes(v) ? 'checked' : ''}>${esc(v)}</label>`).join('')}</div></div>
    </div></div></section>
    <section class="panel" style="margin-top:18px"><div class="panel-h"><h3>Logotipo del menú lateral</h3></div><div class="panel-b">
      <div class="brand-edit">
        <div class="brand-preview"><div class="${brandClass(d)}" id="brand-prev">${brandInner(d)}</div><span class="help">Vista previa</span></div>
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0;flex:1">
          <div class="row"><span class="help" style="font-size:13px;font-weight:550;color:var(--ink-2)">Mostrar</span>
            <button class="tab ${brandOf(d).mode === 'text' ? 'on' : ''}" data-act="brandMode" data-v="text">Texto</button>
            <button class="tab ${brandOf(d).mode === 'image' ? 'on' : ''}" data-act="brandMode" data-v="image">Imagen</button></div>
          ${brandOf(d).mode === 'text' ? `<p class="help" style="margin:0">Se muestra el nombre de la empresa, que puedes cambiar arriba.</p>` : ''}
          <div class="row">
            <label class="btn sm" style="cursor:pointer">${ico('up')}${d.brand && d.brand.logo ? 'Cambiar imagen' : 'Subir imagen'}<input type="file" id="brand-file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" class="sr"></label>
            ${d.brand && d.brand.logo ? `<button class="btn sm danger" data-act="brandRemove">${ico('trash')}Quitar imagen</button>` : ''}
          </div>
          <span class="help" style="margin-top:-8px">PNG, JPG, WebP o SVG. Al subirla se recortan solos los márgenes vacíos.</span>
          ${brandOf(d).mode === 'image' ? `<label class="f" style="max-width:340px"><span class="row" style="justify-content:space-between">Tamaño <b id="brand-size-val">${brandOf(d).size} px</b></span>
            <input type="range" class="range" min="20" max="110" step="1" id="b-brand_size" data-bind="brand.size" data-type="number" value="${brandOf(d).size}"></label>
          <div class="row"><span class="help" style="font-size:13px;font-weight:550;color:var(--ink-2)">Alineación</span>
            <button class="tab ${brandOf(d).align === 'left' ? 'on' : ''}" data-act="brandAlign" data-v="left">Izquierda</button>
            <button class="tab ${brandOf(d).align === 'center' ? 'on' : ''}" data-act="brandAlign" data-v="center">Centrada</button>
            <button class="btn sm" data-act="brandTrim" title="Quita el espacio vacío alrededor del logo">Recortar márgenes</button></div>` : ''}
          <div class="row"><span class="help" style="font-size:13px;font-weight:550;color:var(--ink-2)">Fondo</span>
            <button class="tab ${brandOf(d).bg === 'red' ? 'on' : ''}" data-act="brandBg" data-v="red">Rojo</button>
            <button class="tab ${brandOf(d).bg === 'white' ? 'on' : ''}" data-act="brandBg" data-v="white">Blanco</button></div>
          <label class="f" style="max-width:340px">Texto bajo el logotipo ${bInp('brand.subtitle')}<span class="help">Déjalo vacío para no mostrar nada.</span></label>
        </div>
      </div></div></section>
    <section class="panel" style="margin-top:18px"><div class="panel-h"><h3>Correo para recuperar contraseñas</h3></div><div class="panel-b" id="mail-status"><p class="muted" style="margin:0">Comprobando…</p></div></section>`;
  if (S.stab === 'clientes') {
    const A = d.albaran = d.albaran || {}; d.sedes = d.sedes || [];
    const f = S.sedeFilter || '';
    const idx = d.sedes.map((x, i) => i).filter(i => !f || d.sedes[i].cliente === f);
    const cl = listOf('clientes');
    body = `<section class="panel"><div class="panel-h"><h3>Datos de la empresa en los albaranes</h3></div><div class="panel-b"><div class="fgrid">
        <label class="f">Razón social ${bInp('albaran.razonSocial')}</label><label class="f">CIF ${bInp('albaran.cif')}</label>
        <label class="f">Teléfono ${bInp('albaran.telefono')}</label><label class="f">Correo ${bInp('albaran.email')}</label>
        <label class="f wide">Dirección ${bInp('albaran.direccion')}</label>
        <label class="f wide">Texto al pie del albarán ${bInp('albaran.pie')}<span class="help">Por ejemplo, datos registrales o condiciones de entrega.</span></label></div></div></section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Sedes de los clientes</h3><span class="help">Destinos que aparecen en pedidos y albaranes. Los clientes se gestionan en «Listas y marcas».</span></div>
        <div class="row"><select class="sel sm" id="sede-filter" style="width:auto"><option value="">Todos los clientes</option>${cl.map(c => `<option ${f === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><button class="btn sm primary" data-act="sedeAdd">${ico('plus')}Añadir sede</button></div></div>
        ${idx.length ? `<div class="tbl-wrap"><table class="tbl ftable sedes-tbl"><thead><tr><th>Cliente</th><th>Nombre de la sede</th><th>Dirección</th><th>CP</th><th>Población</th><th>País</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th></th></tr></thead><tbody>
        ${idx.map(i => { const x = d.sedes[i], p = `sedes.${i}`; return `<tr style="cursor:default">
          <td><select class="sel sm" data-bind="${p}.cliente" id="${bid(p + '.cliente')}">${(x.cliente && !cl.includes(x.cliente) ? [x.cliente] : []).concat(cl).map(c => `<option ${x.cliente === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
          <td>${bInp(p + '.nombre', 'text', 'placeholder="Ej. Clínica Alicante Centro"')}</td><td>${bInp(p + '.direccion')}</td><td>${bInp(p + '.cp', 'text', 'style="width:80px"')}</td><td>${bInp(p + '.ciudad')}</td>
          <td><select class="sel sm" data-bind="${p}.pais" id="${bid(p + '.pais')}"><option value="">—</option>${listOf('paises').map(c => `<option ${x.pais === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
          <td>${bInp(p + '.contacto')}</td><td>${bInp(p + '.telefono', 'text', 'style="width:120px"')}</td><td>${bInp(p + '.email', 'text', 'placeholder="recepcion@cliente.com" style="min-width:190px"')}</td>
          <td><button class="btn sm icon ghost" data-act="sedeDel" data-i="${i}" aria-label="Eliminar sede">${ico('trash')}</button></td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty" style="padding:28px"><h3>Sin sedes${f ? ' para ' + esc(f) : ''}</h3><p>Añade las clínicas u oficinas a las que enviáis material.</p></div>`}</section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><h3>Salidas</h3></div><div class="panel-b"><div class="fgrid">
        <label class="f">Generar albarán<span style="height:32px;display:flex;align-items:center">${bChk('albaran.generateDefault', 'Marcado por defecto en las salidas')}</span></label>
        <label class="f">Sede por defecto<select class="sel sm" data-bind="albaran.defaultSedeId" id="b-albaran_defaultSedeId"><option value="">— Ninguna —</option>${(d.sedes || []).filter(x => x.nombre).map(x => `<option value="${esc(x.id)}" ${A.defaultSedeId === x.id ? 'selected' : ''}>${esc([x.cliente, sedeLabel(x)].filter(Boolean).join(' · '))}</option>`).join('')}</select><span class="help">Aparece ya elegida al hacer una salida.</span></label></div></div></section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Columnas combinadas</h3><span class="help">Juntan varios campos en una sola columna del albarán, la lista de recogida o el correo. Escribe los campos entre llaves.</span></div><button class="btn sm primary" data-act="comboAdd">${ico('plus')}Añadir columna</button></div><div class="panel-b">
        ${(d.combos || []).length ? (d.combos || []).map((c, i) => `<div class="combo-row">
          <label class="f">Nombre ${bInp(`combos.${i}.label`, 'text', 'placeholder="Ej. Cuenta"')}</label>
          <label class="f" style="flex:2">Plantilla ${bInp(`combos.${i}.template`, 'text', 'placeholder="Ej. {cuenta}@{dominio}"')}</label>
          <span class="combo-prev"><span class="help">Ejemplo</span><b id="combo-prev-${i}">${esc(comboPreview(c.template))}</b></span>
          <button class="btn sm icon ghost" data-act="comboDel" data-i="${i}" aria-label="Eliminar">${ico('trash')}</button></div>`).join('')
        : '<p class="muted" style="margin:0">Sin columnas combinadas. Por ejemplo: «Cuenta» con la plantilla {cuenta}{dominio}.</p>'}
        <p class="help" style="margin:12px 0 0">Campos disponibles: ${comboFieldsHelp()}</p></div></section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Contenido del albarán</h3><span class="help">Elige las columnas de la tabla y su orden. Los campos extra salen en los albaranes creados a partir de ahora.</span></div></div><div class="panel-b">
        <div class="alb-cols">${albColsHTML(A)}</div>
        <div class="row" style="margin-top:16px;gap:18px">${bChk('albaran.showEmisor', 'Datos del emisor')}${bChk('albaran.showInfo', 'Transportista y referencia')}${bChk('albaran.showNotes', 'Observaciones')}${bChk('albaran.showSignatures', 'Recuadros de firma')}${bChk('albaran.showDeclaration', 'Texto de conformidad')}</div>
        <div class="fgrid" style="margin-top:14px"><label class="f">Título del documento ${bInp('albaran.titulo', 'text', 'placeholder="Albarán de entrega"')}</label>
        <label class="f wide">Texto de conformidad ${bInp('albaran.declaracion', 'text', 'placeholder="El destinatario declara recibir el material indicado en buen estado…"')}</label></div>
      </div></section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Numeración</h3><span class="help">Se aplica a los albaranes y pedidos nuevos. Los ya creados conservan su número.</span></div></div><div class="panel-b"><div class="fgrid">
        <label class="f">Prefijo de albaranes ${bInp('numeracion.albaran', 'text', 'maxlength="10"')}</label>
        <label class="f">Prefijo de pedidos ${bInp('numeracion.pedido', 'text', 'maxlength="10"')}</label>
        <label class="f">Prefijo de traspasos ${bInp('numeracion.traspaso', 'text', 'maxlength="10"')}</label>
        <label class="f">Prefijo de retiradas ${bInp('numeracion.retirada', 'text', 'maxlength="10"')}</label>
        <label class="f">Prefijo de certificados ${bInp('numeracion.certificado', 'text', 'maxlength="10"')}</label>
        <label class="f">Dígitos del número ${bInp('numeracion.digitos', 'number', 'min="3" max="8"')}</label>
        <label class="f">Año<span style="height:32px;display:flex;align-items:center">${bChk('numeracion.anual', 'Incluir el año y reiniciar cada año')}</span></label>
        <p class="help wide" id="num-prev">Ejemplo: ${esc(numPreview(d))}</p></div></div></section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Lista de recogida</h3><span class="help">El PDF que se imprime para preparar un pedido.</span></div></div><div class="panel-b">
        <label class="f" style="max-width:340px">Título del documento ${bInp('recogida.titulo', 'text', 'placeholder="Lista de recogida"')}</label>
        <div class="alb-cols" style="margin-top:14px">${albColsHTML(d.recogida, 'recogida')}</div>
        <div class="row" style="margin-top:16px;gap:18px">${bChk('recogida.groupByLocation', 'Agrupar por ubicación')}${bChk('recogida.showSummary', 'Resumen de las líneas del pedido')}${bChk('recogida.showSignature', 'Línea de firma')}</div>
      </div></section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Envío del albarán por correo</h3>${Store.mailEnabled ? '' : '<span class="help" style="color:var(--warn)">El correo no está configurado en el servidor.</span>'}</div></div><div class="panel-b"><div class="fgrid">
        <label class="f">Enviar por correo<span style="height:32px;display:flex;align-items:center">${bChk('albaran.mailDefault', 'Marcado por defecto')}</span></label>
        <label class="f wide">Destinatarios por defecto ${bInp('albaran.emailTo', 'text', 'placeholder="logistica@laberit.com, almacen@ivce.es"')}<span class="help">Separados por comas. Al enviar se pueden quitar o añadir otros. Si la sede tiene correo, se añade también.</span></label>
        <label class="f wide">Asunto ${bInp('albaran.emailSubject')}</label>
        <label class="f wide">Mensaje<textarea class="ta" rows="5" data-bind="albaran.emailBody" id="b-albaran_emailBody">${esc(A.emailBody || '')}</textarea>
          <span class="help">Puedes usar: {albaran}, {cliente}, {sede}, {fecha}, {unidades}, {transportista}, {referencia}, {pedido}, {usuario}, {empresa}. Debajo del mensaje se añade la lista de material y el PDF va adjunto.</span></label>
      </div></div></section>`;
  }
  if (S.stab === 'avisos') {
    d.stockRules = d.stockRules || [];
    const fieldOpts = c => (c ? c.fields.filter(f => ['select', 'text', 'bool', 'number'].includes(f.type) && !LOCKED_FIELDS.includes(f.key) && f.key !== 'serie') : []);
    body = `<section class="panel"><div class="panel-h"><div><h3>Correo de los avisos</h3><span class="help">Se envía un correo cuando el stock disponible de un grupo baja de su mínimo. No se repite en cada cambio, solo el recordatorio.</span></div></div><div class="panel-b"><div class="fgrid">
        <label class="f wide">Destinatarios por defecto ${bInp('stockAlertEmails', 'text', 'placeholder="compras@laberit.com, almacen@laberit.com"')}<span class="help">Separados por comas. Cada regla puede tener los suyos; si no, se usan estos.</span></label>
        <label class="f">Recordar cada (días) ${bInp('stockRemindDays', 'number', 'min="0" max="365"')}<span class="help">0 para avisar solo una vez.</span></label>
        <label class="f">Prueba<span><button class="btn sm" data-act="stockTest" ${Store.mailEnabled ? '' : 'disabled'}>${ico('send')}Comprobar y enviar avisos ahora</button></span><span class="help">${Store.mailEnabled ? 'Usa la configuración guardada.' : 'El correo no está configurado en el servidor.'}</span></label>
      </div></div></section>
      <section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Grupos con stock mínimo</h3><span class="help">Cuenta las unidades «En stock» que no están reservadas para un pedido.</span></div><button class="btn sm primary" data-act="ruleAdd">${ico('plus')}Añadir grupo</button></div>
      ${d.stockRules.length ? d.stockRules.map((r, i) => { const c = catById(r.cat); const n = ruleCount(r); r.conds = r.conds || []; const P = `stockRules.${i}`; return `<div class="rule ${r.active === false ? 'off' : ''}">
        <div class="rule-top">${bChk(P + '.active', '')}<input class="inp sm" style="max-width:240px;font-weight:600" data-bind="${P}.name" id="${bid(P + '.name')}" value="${esc(r.name)}">
          ${almacenes().length > 1 ? `<select class="sel sm" style="width:auto" data-bind="${P}.almacen" id="${bid(P + '.almacen')}"><option value="">Todos los almacenes</option>${d.almacenes.map(a => `<option value="${esc(a.id)}" ${r.almacen === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select>` : ''}
          <select class="sel sm" style="width:auto" data-bind="${P}.cat" id="${bid(P + '.cat')}">${cats().map(x => `<option value="${esc(x.id)}" ${x.id === r.cat ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          <label class="row" style="gap:6px;font-size:13px;font-weight:600">Mínimo <input class="inp sm" type="number" min="0" style="width:80px" data-bind="${P}.min" data-type="number" id="${bid(P + '.min')}" value="${esc(r.min)}"></label>
          <span class="badge ${n < r.min ? 'red' : 'ok'}">Ahora: ${n}</span><span class="spacer"></span><button class="btn sm icon ghost" data-act="ruleDel" data-i="${i}" aria-label="Eliminar grupo">${ico('trash')}</button></div>
        <div class="rule-conds">${r.conds.map((k, j) => { const f = c ? fieldOf(c, k.k) : null; const opts = f && f.type === 'select' && f.list ? listOf(f.list) : f && f.type === 'bool' ? ['true', 'false'] : null; return `<span class="cond">
          <select class="sel sm" data-bind="${P}.conds.${j}.k" id="${bid(P + '.conds.' + j + '.k')}">${fieldOpts(c).map(x => `<option value="${esc(x.key)}" ${x.key === k.k ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select> =
          ${opts ? `<select class="sel sm" data-bind="${P}.conds.${j}.v" id="${bid(P + '.conds.' + j + '.v')}"><option value="">Cualquiera</option>${(k.v && !opts.includes(k.v) ? [k.v] : []).concat(opts).map(v => `<option value="${esc(v)}" ${String(k.v) === v ? 'selected' : ''}>${esc(v === 'true' ? 'Sí' : v === 'false' ? 'No' : v)}${k.v && !opts.includes(k.v) && v === k.v ? ' (no está en la lista)' : ''}</option>`).join('')}</select>` : `<input class="inp sm" style="width:160px" data-bind="${P}.conds.${j}.v" id="${bid(P + '.conds.' + j + '.v')}" value="${esc(k.v)}">`}
          <button class="btn sm icon ghost" data-act="condDel" data-i="${i}" data-j="${j}" aria-label="Quitar condición">${ico('x')}</button></span>`; }).join('')}
          ${r.conds.length < 5 ? `<button class="btn sm ghost" data-act="condAdd" data-i="${i}">${ico('plus')}Condición</button>` : ''}</div>
        <label class="f" style="margin-top:8px">Correos de este grupo ${bInp(P + '.emails', 'text', 'placeholder="Vacío = destinatarios por defecto"')}</label></div>`; }).join('') : '<div class="empty" style="padding:28px"><h3>Sin grupos</h3><p>Añade, por ejemplo, Portátiles, Sobremesas o Sobremesas táctiles.</p></div>'}
      <p class="help" style="padding:0 18px 14px">¿Distinguís sobremesas táctiles? Añade «Sobremesa táctil» en Listas y marcas → Tipos de equipo, o crea un campo «Táctil» (Sí/No) en Categorías y campos, y úsalo como condición.</p></section>`;
  }
  if (S.stab === 'listas') {
    const keys = Object.keys(d.lists); if (!d.lists[S.listSel]) S.listSel = keys[0];
    const used = cats().flatMap(c => c.fields.filter(f => f.list === S.listSel).map(f => `${c.name} · ${f.label}`));
    const arr = d.lists[S.listSel] || [];
    body = `<div class="split-pane"><section class="panel"><div class="list-nav">${keys.map(k => `<button class="${k === S.listSel ? 'on' : ''}" data-act="listSel" data-k="${esc(k)}"><span>${esc(d.listLabels[k] || k)}</span><span class="c">${d.lists[k].length}</span></button>`).join('')}</div>
      <div class="panel-b" style="border-top:1px solid var(--line)"><label class="f">Nueva lista<span class="selwrap"><input class="inp sm" id="new-list" placeholder="Ej. Marcas de impresoras"><button class="btn sm" data-act="listAdd">${ico('plus')}</button></span></label></div></section>
      <section class="panel"><div class="panel-h"><div><h3>${esc(d.listLabels[S.listSel] || S.listSel)}</h3><span class="help">${used.length ? 'Se usa en: ' + used.map(esc).join(', ') : 'No la usa ningún campo todavía.'}</span></div>${!used.length ? `<button class="btn sm danger" data-act="listDel">${ico('trash')}Eliminar lista</button>` : ''}</div>
        <div class="panel-b"><label class="f" style="margin-bottom:12px">Nombre de la lista ${bInp('listLabels.' + S.listSel)}</label>
        ${arr.map((v, i) => `<div class="vrow">${bInp(`lists.${S.listSel}.${i}`)}<button class="btn sm icon ghost" data-act="valMove" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${ico('chevup')}</button><button class="btn sm icon ghost" data-act="valMove" data-i="${i}" data-dir="1" ${i === arr.length - 1 ? 'disabled' : ''} aria-label="Bajar">${ico('chevdown')}</button><button class="btn sm icon ghost" data-act="valDel" data-i="${i}" aria-label="Eliminar">${ico('trash')}</button></div>`).join('')}
        <div class="vrow" style="margin-top:8px"><input class="inp sm" id="new-val" placeholder="Añadir valor y pulsar Intro"><button class="btn sm primary" data-act="valAdd">${ico('plus')}Añadir</button></div>
        <p class="help">Al renombrar un valor y guardar, se actualiza también en todo el material registrado, los pedidos y los albaranes. Para renombrar, cambia el texto; no lo borres y vuelvas a crearlo.</p></div></section></div>`;
  }
  if (S.stab === 'categorias') {
    if (!d.categories.some(c => c.id === S.catSel)) S.catSel = d.categories[0] && d.categories[0].id;
    const ci = d.categories.findIndex(c => c.id === S.catSel), c = d.categories[ci];
    const nItems = c ? Object.values(Store.items).filter(i => i.cat === c.id).length : 0;
    const listOpts = sel => `<option value="">—</option>` + Object.keys(d.lists).map(k => `<option value="${esc(k)}" ${sel === k ? 'selected' : ''}>${esc(d.listLabels[k] || k)}</option>`).join('');
    body = `<div class="split-pane"><section class="panel"><div class="list-nav">${d.categories.map(x => `<button class="${x.id === S.catSel ? 'on' : ''}" data-act="catSel" data-k="${esc(x.id)}"><span>${esc(x.icon || '')} ${esc(x.name)}</span><span class="c">${x.fields.length} campos</span></button>`).join('')}</div>
      <div class="panel-b" style="border-top:1px solid var(--line)"><label class="f">Nueva categoría<span class="selwrap"><input class="inp sm" id="new-cat" placeholder="Ej. Impresoras"><button class="btn sm" data-act="catAdd">${ico('plus')}</button></span></label></div></section>
      ${c ? `<section class="panel"><div class="panel-h"><h3>${esc(c.name)}</h3><div class="row"><button class="btn sm ghost" data-act="catMove" data-dir="-1" ${ci === 0 ? 'disabled' : ''}>${ico('chevup')}</button><button class="btn sm ghost" data-act="catMove" data-dir="1" ${ci === d.categories.length - 1 ? 'disabled' : ''}>${ico('chevdown')}</button>${nItems ? `<span class="help">${nItems} registros</span>` : `<button class="btn sm danger" data-act="catDel">${ico('trash')}Eliminar</button>`}</div></div>
        <div class="panel-b"><div class="fgrid"><label class="f">Nombre ${bInp(`categories.${ci}.name`)}</label><label class="f">Icono (emoji) ${bInp(`categories.${ci}.icon`)}</label><label class="f">Color ${bInp(`categories.${ci}.color`, 'color')}</label><label class="f">Stock mínimo por modelo ${bInp(`categories.${ci}.minStock`, 'number', 'min="0"')}</label>
          <label class="f">Control<span style="height:32px;display:flex;align-items:center">${bChk(`categories.${ci}.serialized`, 'Por número de serie')}</span></label></div>
        <h3 style="margin:22px 0 10px">Campos</h3>
        <div class="tbl-wrap"><table class="tbl ftable cf"><thead><tr><th>Etiqueta</th><th>Tipo</th><th>Lista</th><th>Valor por defecto</th><th title="Obligatorio">Oblig.</th><th title="No se puede repetir">Único</th><th title="Visible en la tabla">Tabla</th><th title="Avisar del vencimiento">Vence</th><th></th></tr></thead><tbody>
        ${c.fields.map((f, fi) => { const p = `categories.${ci}.fields.${fi}`; const locked = LOCKED_FIELDS.includes(f.key); return `<tr style="cursor:default"><td>${bInp(p + '.label')}<span class="help">${esc(f.key)}</span></td>
          <td><select class="sel sm" data-bind="${p}.type" id="${bid(p + '.type')}" ${locked ? 'disabled' : ''}>${Object.entries(FIELD_TYPES).map(([k, l]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td>${f.type === 'select' ? `<select class="sel sm" data-bind="${p}.list" id="${bid(p + '.list')}">${listOpts(f.list)}</select>` : '<span class="muted">—</span>'}</td>
          <td>${f.type === 'bool' ? bChk(p + '.default', '') : f.type === 'select' && f.list ? `<select class="sel sm" data-bind="${p}.default" id="${bid(p + '.default')}"><option value="">—</option>${(d.lists[f.list] || []).map(v => `<option ${f.default === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : f.type === 'date' ? `<select class="sel sm" data-bind="${p}.default" id="${bid(p + '.default')}"><option value="">—</option><option value="today" ${f.default === 'today' ? 'selected' : ''}>Hoy</option></select>` : f.type === 'location' ? '<span class="muted">—</span>' : bInp(p + '.default', f.type === 'number' ? 'number' : 'text')}</td>
          <td>${bChk(p + '.required', '')}</td><td>${bChk(p + '.unique', '')}</td><td>${bChk(p + '.table', '')}</td><td>${f.type === 'date' ? bChk(p + '.expiry', '') : ''}</td>
          <td style="white-space:nowrap"><button class="btn sm icon ghost" data-act="fMove" data-i="${fi}" data-dir="-1" ${fi === 0 ? 'disabled' : ''}>${ico('chevup')}</button><button class="btn sm icon ghost" data-act="fMove" data-i="${fi}" data-dir="1" ${fi === c.fields.length - 1 ? 'disabled' : ''}>${ico('chevdown')}</button>${locked ? '' : `<button class="btn sm icon ghost" data-act="fDel" data-i="${fi}" aria-label="Eliminar campo">${ico('trash')}</button>`}</td></tr>`; }).join('')}
        </tbody></table></div>
        <div class="row" style="margin-top:12px"><input class="inp sm" id="new-f-label" placeholder="Nuevo campo, ej. Número de inventario del cliente" style="max-width:340px"><select class="sel sm" id="new-f-type" style="width:auto">${Object.entries(FIELD_TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn sm primary" data-act="fAdd">${ico('plus')}Añadir campo</button></div>
        <p class="help">Los campos Estado, Ubicación y Balda se usan en el mapa y los avisos, por eso no se pueden eliminar.</p></div></section>` : ''}</div>`;
  }
  if (S.stab === 'almacen') {
    if (!d.almacenes.some(a => a.id === S.almSel)) S.almSel = (d.almacenes[0] || {}).id;
    const ai = d.almacenes.findIndex(a => a.id === S.almSel), A = d.almacenes[ai], LP = `almacenes.${ai}.layout`, L = A.layout;
    const owner = c => d.almacenes.find(a => (a.clientes || []).includes(c));
    const nItems = Object.values(Store.items).filter(it => almOfItem(it) === A.id).length;
    body = `<div class="split-pane"><section class="panel"><div class="list-nav">${d.almacenes.map(a => `<button class="${a.id === S.almSel ? 'on' : ''}" data-act="almSel" data-k="${esc(a.id)}"><span>${esc(a.nombre)}</span><span class="c">${(a.clientes || []).length} cli.</span></button>`).join('')}</div>
      <div class="panel-b" style="border-top:1px solid var(--line)"><label class="f">Nuevo almacén<span class="selwrap"><input class="inp sm" id="new-alm" placeholder="Ej. Almacén Lisboa"><button class="btn sm" data-act="almAdd">${ico('plus')}</button></span></label></div></section>
      <div><section class="panel"><div class="panel-h"><h3>${esc(A.nombre)}</h3>${d.almacenes.length > 1 ? `<button class="btn sm danger" data-act="almDel" ${(A.clientes || []).length ? 'disabled title="Quita antes sus clientes"' : ''}>${ico('trash')}Eliminar almacén</button>` : ''}</div><div class="panel-b">
        <label class="f" style="max-width:340px">Nombre ${bInp(`almacenes.${ai}.nombre`)}</label>
        <h3 style="margin:18px 0 8px">Clientes de este almacén</h3><p class="help" style="margin:0 0 8px">Un cliente puede estar en varios almacenes; cada equipo indica en cuál está. Los clientes se crean en «Listas y marcas».</p>
        <div class="alm-clients">${listOf('clientes').map(c => { const also = d.almacenes.filter(a => a.id !== A.id && (a.clientes || []).includes(c)).map(a => a.nombre); return `<label class="chk"><input type="checkbox" data-act="almCli" data-c="${esc(c)}" ${(A.clientes || []).includes(c) ? 'checked' : ''}>${esc(c)}${also.length ? ` <span class="help">(también en ${esc(also.join(', '))})</span>` : ''}</label>`; }).join('') || '<span class="help">No hay clientes en la lista.</span>'}</div>
        ${nItems ? `<p class="help" style="margin-top:8px">${nItems} registros de material pertenecen a los clientes de este almacén.</p>` : ''}
      </div></section>
      <h3 style="margin:20px 0 10px">Distribución de ${esc(A.nombre)}</h3>
      <section class="panel" style="margin-bottom:18px"><div class="panel-h"><div><h3>Plano de fondo</h3><span class="help">Sube el plano del almacén (imagen o PDF) y se pondrá en el suelo, a la medida de ancho por fondo. Así puedes calcar encima las estanterías.</span></div>
        <div class="row"><label class="btn sm" style="cursor:pointer">${ico('up')}${L.plan && L.plan.image ? 'Cambiar plano' : 'Subir plano'}<input type="file" id="plan-file" accept="image/*,application/pdf" class="sr"></label>${L.plan && L.plan.image ? `<button class="btn sm danger" data-act="planDel">${ico('trash')}Quitar</button>` : ''}</div></div>
        ${L.plan && L.plan.image ? `<div class="panel-b row" style="gap:18px"><label class="f" style="width:260px"><span class="row" style="justify-content:space-between">Transparencia <b id="plan-op-val">${Math.round((L.plan.opacity ?? 0.6) * 100)} %</b></span><input type="range" class="range" min="10" max="100" step="5" id="plan-op" value="${Math.round((L.plan.opacity ?? 0.6) * 100)}"></label>
          ${L.plan.ratio ? `<span class="help">Proporción del plano: ${(L.plan.ratio).toFixed(2).replace('.', ',')}. Para que no se deforme, el ancho debería ser ${(L.plan.ratio).toFixed(2).replace('.', ',')} veces el fondo${Math.abs((Number(L.width) / Number(L.depth)) - L.plan.ratio) > 0.05 ? ` <button class="btn sm" data-act="planFit">Ajustar el fondo a ${(Number(L.width) / L.plan.ratio).toFixed(1).replace('.', ',')} m</button>` : ' (ya coincide).'}</span>` : ''}</div>` : ''}</section>
      <section class="panel"><div class="panel-b"><div class="row" style="align-items:flex-end"><label class="f" style="width:140px">Ancho (m) ${bInp(LP + '.width', 'number', 'min="5"')}</label><label class="f" style="width:140px">Fondo (m) ${bInp(LP + '.depth', 'number', 'min="5"')}</label><span class="help" style="padding-bottom:8px">El origen (0, 0) es el centro del almacén. X crece hacia la derecha y Z hacia el fondo de la vista.</span></div>
      <div style="margin-top:16px" id="layout-prev"></div></div></section>
      <div class="grid2" style="margin-top:18px">
      <section class="panel"><div class="panel-h"><h3>Estanterías</h3><div class="row"><button class="btn sm" data-act="locLabels" title="Etiquetas QR de cada balda y hueco para imprimir">${ico('qr')}Etiquetas de ubicación</button><button class="btn sm primary" data-act="rackAdd">${ico('plus')}Añadir estantería</button></div></div><div class="tbl-wrap"><table class="tbl ftable"><thead><tr><th>Nombre</th><th>X</th><th>Z</th><th>Giro</th><th>Largo</th><th>Baldas</th><th title="Huecos en cada balda. 0 = sin huecos">Huecos</th><th title="Altura de la primera balda desde el suelo. 0 = apoyada en el suelo">Altura (m)</th><th></th></tr></thead><tbody>
        ${L.racks.map((r, i) => !editPlanta(r) ? '' : `<tr style="cursor:default"><td>${bInp(`${LP}.racks.${i}.name`, 'text', 'style="width:80px"')}</td><td>${bInp(`${LP}.racks.${i}.x`, 'number', 'style="width:70px"')}</td><td>${bInp(`${LP}.racks.${i}.z`, 'number', 'style="width:70px"')}</td>
          <td><select class="sel sm" data-bind="${LP}.racks.${i}.rot" data-type="number" id="${bid(`${LP}.racks.${i}.rot`)}" style="width:76px">${[0, 90].map(v => `<option value="${v}" ${Number(r.rot) === v ? 'selected' : ''}>${v}°</option>`).join('')}</select></td>
          <td>${bInp(`${LP}.racks.${i}.len`, 'number', 'style="width:66px" min="1"')}</td><td>${bInp(`${LP}.racks.${i}.levels`, 'number', 'style="width:60px" min="1" max="10"')}</td><td>${bInp(`${LP}.racks.${i}.huecos`, 'number', 'style="width:60px" min="0" max="50" placeholder="0" title="Huecos por balda (0 = sin huecos)"')}</td><td>${bInp(`${LP}.racks.${i}.elev`, 'number', 'style="width:70px" min="0" max="10" step="0.1" placeholder="0" title="Altura desde el suelo, por ejemplo 1.8 para una leja alta"')}</td>
          <td><button class="btn sm icon ghost" data-act="rackDel" data-i="${i}" aria-label="Eliminar">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel"><div class="panel-h"><h3>Zonas de suelo</h3><button class="btn sm primary" data-act="zoneAdd">${ico('plus')}Añadir zona</button></div><div class="tbl-wrap"><table class="tbl ftable"><thead><tr><th>Nombre</th><th>X</th><th>Z</th><th>Ancho</th><th>Fondo</th><th>Color</th><th></th></tr></thead><tbody>
        ${L.zones.map((z, i) => !editPlanta(z) ? '' : `<tr style="cursor:default"><td>${bInp(`${LP}.zones.${i}.name`, 'text', 'style="width:110px"')}</td><td>${bInp(`${LP}.zones.${i}.x`, 'number', 'style="width:64px"')}</td><td>${bInp(`${LP}.zones.${i}.z`, 'number', 'style="width:64px"')}</td><td>${bInp(`${LP}.zones.${i}.w`, 'number', 'style="width:60px"')}</td><td>${bInp(`${LP}.zones.${i}.d`, 'number', 'style="width:60px"')}</td><td>${bInp(`${LP}.zones.${i}.color`, 'color', 'style="width:46px;padding:2px"')}</td>
          <td><button class="btn sm icon ghost" data-act="zoneDel" data-i="${i}" aria-label="Eliminar">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel"><div class="panel-h"><div><h3>Plantas y altillos</h3><span class="help">Cada altillo es una plataforma a cierta altura. Elige abajo qué planta estás editando.</span></div><button class="btn sm primary" data-act="plantaAdd">${ico('plus')}Añadir altillo</button></div>
        ${(L.plantas || []).length ? `<div class="tbl-wrap"><table class="tbl ftable"><thead><tr><th>Nombre</th><th>Altura (m)</th><th>X</th><th>Z</th><th>Ancho</th><th>Fondo</th><th></th></tr></thead><tbody>${L.plantas.map((pl, i) => `<tr style="cursor:default"><td>${bInp(`${LP}.plantas.${i}.nombre`, 'text', 'style="width:130px"')}</td>
          <td>${bInp(`${LP}.plantas.${i}.altura`, 'number', 'style="width:70px" min="1" step="0.1"')}</td><td>${bInp(`${LP}.plantas.${i}.x`, 'number', 'style="width:64px" step="0.5"')}</td><td>${bInp(`${LP}.plantas.${i}.z`, 'number', 'style="width:64px" step="0.5"')}</td>
          <td>${bInp(`${LP}.plantas.${i}.w`, 'number', 'style="width:64px" min="1"')}</td><td>${bInp(`${LP}.plantas.${i}.d`, 'number', 'style="width:64px" min="1"')}</td>
          <td><button class="btn sm icon ghost" data-act="plantaDel" data-i="${i}" aria-label="Eliminar">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="padding:0 18px 16px;margin:0">Sin altillos: todo está en la planta baja.</p>'}</section>
      ${(L.plantas || []).length ? `<div class="planta-bar"><span>Editando:</span><div class="seg"><button data-act="plantaSel" data-k="" class="${!S.plantaSel ? 'on' : ''}">Planta baja</button>${L.plantas.map(pl => `<button data-act="plantaSel" data-k="${esc(pl.id)}" class="${S.plantaSel === pl.id ? 'on' : ''}">${esc(pl.nombre)}</button>`).join('')}</div><span class="help">Las estanterías, zonas y elementos que añadas irán a esta planta.</span></div>` : ''}
      <section class="panel"><div class="panel-h"><div><h3>Forma del almacén</h3><span class="help">${isShaped(L) ? `Contorno de ${L.shape.length} vértices. Las coordenadas son en metros desde el centro, como las estanterías.` : 'Rectángulo de ancho por fondo. Elige otra forma para empezar y ajusta después los vértices.'}</span></div>
        <div class="seg">${[['', 'Rectángulo'], ['L', 'En L'], ['U', 'En U'], ['T', 'En T']].map(([k, l]) => `<button data-act="shapeSet" data-k="${k}" class="${(!isShaped(L) && !k) || L.shapeKind === k && isShaped(L) && k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        ${isShaped(L) ? `<div class="tbl-wrap"><table class="tbl ftable"><thead><tr><th>Vértice</th><th>X</th><th>Z</th><th></th></tr></thead><tbody>${L.shape.map((q, k) => `<tr style="cursor:default"><td>${k + 1}</td>
          <td><input class="inp sm" type="number" step="0.5" style="width:80px" data-shape="${k}" data-axis="0" value="${esc(q[0])}"></td><td><input class="inp sm" type="number" step="0.5" style="width:80px" data-shape="${k}" data-axis="1" value="${esc(q[1])}"></td>
          <td><button class="btn sm icon ghost" data-act="shapeIns" data-i="${k}" title="Añadir un vértice después">${ico('plus')}</button>${L.shape.length > 3 ? `<button class="btn sm icon ghost" data-act="shapeDel" data-i="${k}" aria-label="Quitar vértice">${ico('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>
      <section class="panel"><div class="panel-h"><div><h3>Elementos del plano</h3><span class="help">Pasillos, pilares, tabiques, oficinas, mesas, puestos de embalaje, extintores y salidas de emergencia.</span></div>
        <div class="row"><select class="sel sm" id="obj-type" style="width:auto">${Object.entries(OBJ_TYPES).map(([k, t]) => `<option value="${k}">${t.l}</option>`).join('')}</select><button class="btn sm primary" data-act="objAdd">${ico('plus')}Añadir</button></div></div>
        ${(L.objects || []).length ? `<div class="tbl-wrap"><table class="tbl ftable"><thead><tr><th>Tipo</th><th>Nombre</th><th>X</th><th>Z</th><th>Ancho</th><th>Fondo</th><th>Giro</th><th></th></tr></thead><tbody>
        ${L.objects.map((o, i) => !editPlanta(o) ? '' : `<tr style="cursor:default"><td><span class="row" style="gap:6px;flex-wrap:nowrap"><i class="cdot" style="--c:${(OBJ_TYPES[o.type] || OBJ_TYPES.pilar).c}"></i>${esc((OBJ_TYPES[o.type] || OBJ_TYPES.pilar).l)}</span></td>
          <td>${bInp(`${LP}.objects.${i}.name`, 'text', `style="width:130px" placeholder="${o.type === 'pasillo' ? 'Pasillo 1' : 'Opcional'}"`)}</td>
          <td>${bInp(`${LP}.objects.${i}.x`, 'number', 'style="width:64px" step="0.5"')}</td><td>${bInp(`${LP}.objects.${i}.z`, 'number', 'style="width:64px" step="0.5"')}</td>
          <td>${bInp(`${LP}.objects.${i}.w`, 'number', 'style="width:60px" min="0.1" step="0.1"')}</td><td>${bInp(`${LP}.objects.${i}.d`, 'number', 'style="width:60px" min="0.1" step="0.1"')}</td>
          <td><select class="sel sm" data-bind="${LP}.objects.${i}.rot" data-type="number" id="${bid(`${LP}.objects.${i}.rot`)}" style="width:72px">${[0, 90].map(v => `<option value="${v}" ${Number(o.rot) === v ? 'selected' : ''}>${v}°</option>`).join('')}</select></td>
          <td><button class="btn sm icon ghost" data-act="objDel" data-i="${i}" aria-label="Eliminar">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="padding:0 18px 16px;margin:0">Sin elementos. Elige un tipo y pulsa Añadir; aparecerá en el centro y podrás moverlo con X y Z.</p>'}</section>
      ${S.plantaSel ? '' : `<section class="panel"><div class="panel-h"><div><h3>Puertas</h3><span class="help">Posición: metros desde el centro de la pared (negativo hacia la izquierda o arriba).</span></div><button class="btn sm primary" data-act="doorAdd">${ico('plus')}Añadir puerta</button></div>
        ${(L.doors || []).length ? `<div class="tbl-wrap"><table class="tbl ftable"><thead><tr><th>Nombre</th><th>Pared</th><th>Posición</th><th>Ancho</th><th></th></tr></thead><tbody>
        ${L.doors.map((dr, i) => `<tr style="cursor:default"><td>${bInp(`${LP}.doors.${i}.name`, 'text', 'style="width:150px" placeholder="Entrada"')}</td>
          <td><select class="sel sm" data-bind="${LP}.doors.${i}.wall" id="${bid(`${LP}.doors.${i}.wall`)}">${wallList(L).map(w => `<option value="${w.id}" ${dr.wall === w.id ? 'selected' : ''}>${esc(w.label)}</option>`).join('')}</select></td>
          <td>${bInp(`${LP}.doors.${i}.pos`, 'number', 'style="width:72px" step="0.5"')}</td><td>${bInp(`${LP}.doors.${i}.width`, 'number', 'style="width:64px" min="0.5" step="0.5"')}</td>
          <td><button class="btn sm icon ghost" data-act="doorDel" data-i="${i}" aria-label="Eliminar">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="padding:0 18px 16px;margin:0">Sin puertas. Añade la entrada para verla en el mapa.</p>'}</section>`}</div></div></div>`;
  }
  if (S.stab === 'roles') {
    const roles = Object.entries(d.roles);
    body = `<section class="panel"><div class="tbl-wrap"><table class="tbl perm-tbl"><thead><tr><th>Permiso</th>${roles.map(([k, r]) => `<th>${r.locked ? esc(r.name) : `<input class="inp sm" style="width:150px;text-align:center" data-bind="roles.${k}.name" id="${bid('roles.' + k + '.name')}" value="${esc(r.name)}">`}<div class="help">${Object.values(Store.users).filter(u => u.role === k).length} usuarios</div></th>`).join('')}</tr></thead><tbody>
      ${PERMS.map(([p, l]) => `<tr style="cursor:default"><td>${esc(l)}</td>${roles.map(([k, r]) => `<td><input type="checkbox" data-perm="${esc(p)}" data-role="${esc(k)}" ${r.perms === '*' || r.perms.includes(p) ? 'checked' : ''} ${r.locked ? 'disabled' : ''} aria-label="${esc(l)} para ${esc(r.name)}"></td>`).join('')}</tr>`).join('')}
      <tr style="cursor:default"><td></td>${roles.map(([k, r]) => `<td>${r.locked || Object.values(Store.users).some(u => u.role === k) ? '' : `<button class="btn sm danger" data-act="roleDel" data-k="${esc(k)}">Eliminar rol</button>`}</td>`).join('')}</tr></tbody></table></div>
      <div class="panel-b row" style="border-top:1px solid var(--line)"><input class="inp sm" id="new-role" placeholder="Nombre del nuevo rol, ej. Jefe de almacén" style="max-width:320px"><button class="btn sm primary" data-act="roleAdd">${ico('plus')}Crear rol</button></div></section>`;
  }
  if (S.stab === 'copias') body = `<div class="grid2"><section class="panel"><div class="panel-h"><h3>Exportar copia completa</h3></div><div class="panel-b"><p style="margin-top:0">Incluye todo el inventario, su historial y los ajustes. Guárdala en un lugar seguro.</p>
      <label class="chk"><input type="checkbox" id="bk-users">Incluir usuarios (con sus contraseñas cifradas)</label><div class="row" style="margin-top:14px"><button class="btn primary" data-act="backup">${ico('down')}Descargar copia JSON</button></div></div></section>
    <section class="panel"><div class="panel-h"><h3>Restaurar copia</h3></div><div class="panel-b"><p style="margin-top:0">Sustituye los ajustes y añade o actualiza el material de la copia. El material que no esté en la copia se conserva.</p><input type="file" id="restore-file" accept=".json,application/json"></div></section>
    <section class="panel"><div class="panel-h"><h3>Datos de ejemplo</h3></div><div class="panel-b"><p style="margin-top:0">Crea unos 70 registros repartidos por estanterías para probar filtros, exportaciones y el mapa.</p><button class="btn" data-act="sampleData">Cargar datos de ejemplo</button></div></section>
    <section class="panel"><div class="panel-h"><h3>Vaciar inventario</h3></div><div class="panel-b"><p style="margin-top:0">Elimina todo el material registrado. Los usuarios y ajustes se mantienen. Haz antes una copia.</p><button class="btn danger" data-act="wipe">${ico('trash')}Vaciar inventario</button></div></section></div>`;
  return `<div class="page-head"><div><h1>Ajustes</h1><p>Todo lo que se puede adaptar: listas, campos, almacén y permisos.</p></div></div>
    <nav class="stabs">${STABS.map(([k, l]) => `<a href="#/ajustes/${k}" class="${S.stab === k ? 'on' : ''}">${l}</a>`).join('')}</nav>
    ${body}
    <div class="savebar ${dirty() ? '' : 'hide'}" id="savebar"><span>Tienes cambios sin guardar.</span><span class="spacer"></span><button class="btn ghost" data-act="sDiscard">Descartar</button><button class="btn primary" data-act="sSave">Guardar cambios</button></div>`;
};
function drawLayoutPreview() {
  const box = $('#layout-prev'); if (!box) return; const d0 = draft(); const L = (d0.almacenes.find(a => a.id === S.almSel) || d0.almacenes[0]).layout; const W = Number(L.width) || 30, D = Number(L.depth) || 20;
  const sc = 22;
  const rk = L.racks.filter(editPlanta).map(r => { const len = Number(r.len) || 4, rot = Number(r.rot) === 90, up = Number(r.elev) > 0; const w = rot ? 1.1 : len, d = rot ? len : 1.1; return `<g ${up ? `class="rack-up"` : ''}>${up ? `<title>A ${String(r.elev).replace('.', ',')} m del suelo</title>` : ''}<rect x="${(Number(r.x) + W / 2 - w / 2) * sc}" y="${(Number(r.z) + D / 2 - d / 2) * sc}" width="${w * sc}" height="${d * sc}" fill="var(--red)" rx="2"/><text x="${(Number(r.x) + W / 2) * sc}" y="${(Number(r.z) + D / 2) * sc + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${esc(r.name)}</text></g>`; }).join('');
  const zs = L.zones.filter(editPlanta).map(z => `<g><rect x="${(Number(z.x) + W / 2 - z.w / 2) * sc}" y="${(Number(z.z) + D / 2 - z.d / 2) * sc}" width="${z.w * sc}" height="${z.d * sc}" fill="${esc(z.color)}" fill-opacity=".15" stroke="${esc(z.color)}" stroke-dasharray="4 3"/><text x="${(Number(z.x) + W / 2) * sc}" y="${(Number(z.z) + D / 2) * sc + 4}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)">${esc(z.name)}</text></g>`).join('');
  box.innerHTML = `<div class="tbl-wrap"><svg class="layout-prev" viewBox="-4 -4 ${W * sc + 8} ${D * sc + 8}" style="width:100%;max-height:360px;min-width:480px"><rect x="0" y="0" width="${W * sc}" height="${D * sc}" fill="${isShaped(L) ? 'var(--neutral-soft)' : 'var(--floor)'}" stroke="${isShaped(L) ? 'none' : 'var(--line-strong)'}" stroke-width="2" ${isShaped(L) ? 'opacity=".5"' : ''}/>${isShaped(L) ? `<polygon points="${floorPoly(L).map(p => `${(p[0] + W / 2) * sc},${(p[1] + D / 2) * sc}`).join(' ')}" fill="var(--floor)" stroke="var(--line-strong)" stroke-width="2"/>` : ''}${L.plan && L.plan.image ? `<image href="${L.plan.image}" x="0" y="0" width="${W * sc}" height="${D * sc}" preserveAspectRatio="none" opacity="${L.plan.opacity ?? 0.6}"/>` : ''}${(L.plantas || []).map(pl => { const on = S.plantaSel === pl.id; return `<rect x="${(Number(pl.x) - pl.w / 2 + W / 2) * sc}" y="${(Number(pl.z) - pl.d / 2 + D / 2) * sc}" width="${pl.w * sc}" height="${pl.d * sc}" fill="var(--paper)" fill-opacity="${on ? 0.85 : 0}" stroke="var(--ink-2)" stroke-width="${on ? 2 : 1}" stroke-dasharray="${on ? '' : '4 3'}"/><text x="${(Number(pl.x) - pl.w / 2 + W / 2) * sc + 4}" y="${(Number(pl.z) - pl.d / 2 + D / 2) * sc + 12}" font-size="10" font-weight="700" fill="var(--ink-2)">${esc(pl.nombre)}</text>`; }).join('')}${(L.objects || []).filter(editPlanta).map(o => { const g = objGeom(o), X = v => (v + W / 2) * sc, Z = v => (v + D / 2) * sc;
    return `<g><title>${esc(g.T.l)}${o.name ? ': ' + esc(o.name) : ''}</title><rect x="${X(g.x0)}" y="${Z(g.z0)}" width="${g.w * sc}" height="${g.d * sc}" fill="${g.T.c}" fill-opacity="${o.type === 'pasillo' ? 0.12 : 0.55}" stroke="${g.T.c}" ${o.type === 'pasillo' || o.type === 'salida' ? 'stroke-dasharray="5 3"' : ''} rx="${o.type === 'extintor' ? 6 : 1}"/>${g.label ? `<text x="${X(g.x)}" y="${Z(g.z) + 4}" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--ink-2)">${esc(g.label)}</text>` : ''}</g>`; }).join('')}${zs}${rk}${doorGeom(L).map(g => { const [ax, az] = g.A, [bx, bz] = g.B; const X = v => (v + W / 2) * sc, Z = v => (v + D / 2) * sc;
    const lx = X(g.C[0] + g.n[0] * 1.3), lz = Z(g.C[1] + g.n[1] * 1.3) + 4;
    return `<g><line x1="${X(ax)}" y1="${Z(az)}" x2="${X(bx)}" y2="${Z(bz)}" stroke="var(--paper)" stroke-width="7"/><line x1="${X(ax)}" y1="${Z(az)}" x2="${X(bx)}" y2="${Z(bz)}" stroke="var(--red)" stroke-width="4" stroke-dasharray="6 3"/>
      <text x="${lx}" y="${lz}" text-anchor="${Math.abs(g.n[0]) < 0.5 ? 'middle' : g.n[0] > 0 ? 'start' : 'end'}" font-size="11" font-weight="700" fill="var(--red-ink)">${esc(g.d.name || 'Entrada')}</text></g>`; }).join('')}</svg></div>`;
}
async function saveSettings() {
  const d = draft();
  for (const c of d.categories) {
    if (!c.name.trim()) { toast('Todas las categorías necesitan nombre.', 'warn'); return; }
    if (c.fields.some(f => f.type === 'select' && !f.list)) { toast(`En ${c.name} hay campos de tipo lista sin lista asignada.`, 'warn'); return; }
    c.minStock = Number(c.minStock) || 0;
  }
  ['sessionMinutes', 'minPassword', 'maxAttempts', 'lockMinutes', 'expiryWarnDays'].forEach(k => { d[k] = Math.max(1, Number(d[k]) || 1); });
  d.minPassword = Math.max(8, d.minPassword); d.sessionMinutes = Math.max(5, d.sessionMinutes);
  Object.keys(d.lists).forEach(k => { d.lists[k] = [...new Set(d.lists[k].map(v => String(v).trim()).filter(Boolean))]; });
  if ((d.sedes || []).some(x => !String(x.nombre || '').trim())) { toast('Hay sedes sin nombre. Escribe el nombre o elimínalas antes de guardar.', 'warn'); return; }
  d.almacenes.forEach(a => {
    a.layout.racks.forEach(r => { ['x', 'z', 'rot', 'len', 'levels', 'elev', 'huecos'].forEach(k => r[k] = Number(r[k]) || 0); r.huecos = Math.min(50, Math.max(0, Math.round(r.huecos))); r.elev = Math.min(10, Math.max(0, r.elev)); r.len = Math.max(1, r.len); r.levels = Math.min(10, Math.max(1, r.levels)); });
    a.layout.zones.forEach(z => { ['x', 'z', 'w', 'd'].forEach(k => z[k] = Number(z[k]) || 0); z.w = Math.max(1, z.w); z.d = Math.max(1, z.d); });
    (a.layout.doors || []).forEach(d => { d.pos = Number(d.pos) || 0; d.width = Math.max(0.5, Number(d.width) || 2); });
    (a.layout.objects || []).forEach(o => { ['x', 'z', 'w', 'd', 'rot'].forEach(k => o[k] = Number(o[k]) || 0); const T = OBJ_TYPES[o.type] || OBJ_TYPES.pilar; o.w = o.w > 0 ? o.w : T.w; o.d = o.d > 0 ? o.d : T.d; });
    if (!String(a.nombre || '').trim()) a.nombre = 'Almacén';
  });
  d.layout = d.almacenes[0].layout;
  // Renombrados en las listas: se aplican también a los estados con significado, almacenes y sedes del borrador.
  Object.keys(d.lists).forEach(k => {
    const o = (Store.settings.lists || {})[k], n = d.lists[k];
    if (!Array.isArray(o) || o.length !== n.length) return;
    o.forEach((v, i) => {
      if (n[i] === v || n.includes(v) || o.includes(n[i])) return;
      if (k === 'estados') { const E0 = d.estadosSistema; E0.stock = (E0.stock || []).map(x => x === v ? n[i] : x); E0.baja = (E0.baja || []).map(x => x === v ? n[i] : x); if (E0.reservado === v) E0.reservado = n[i]; if (E0.enviado === v) E0.enviado = n[i]; }
      if (k === 'clientes') { d.almacenes.forEach(a => { a.clientes = (a.clientes || []).map(x => x === v ? n[i] : x); }); (d.sedes || []).forEach(x => { if (x.cliente === v) x.cliente = n[i]; }); }
    });
  });
  const E = d.estadosSistema || {}, est = d.lists.estados || [];
  [E.transito || 'En tránsito', E.retirado || 'Retirado'].forEach(v => { if (!est.includes(v)) est.push(v); }); E.transito = E.transito || 'En tránsito'; E.retirado = E.retirado || 'Retirado';
  const missing = [...(E.stock || []), E.reservado, E.enviado, E.transito, E.retirado, ...(E.baja || [])].filter(v => v && !est.includes(v));
  if (missing.length) { toast(`Los estados con significado deben existir en la lista de estados: falta «${missing[0]}». Revísalo en Ajustes → General.`, 'warn', 8000); return; }
  if (!(E.stock || []).length) { toast('Elige al menos un estado que cuente como disponible (Ajustes → General).', 'warn'); return; }
  const sinAlm = d.lists.clientes.filter(c => !d.almacenes.some(a => (a.clientes || []).includes(c)));
  if (sinAlm.length) toast(`Clientes sin almacén: ${sinAlm.join(', ')}. Solo los verán los usuarios con acceso total hasta que los asignes.`, 'info', 7000);
  try { await Store.putSettings(d); Store.log('ajustes', 'Ajustes actualizados (' + (STABS.find(t => t[0] === S.stab) || [, ''])[1] + ')'); S.sdraft = null; toast('Ajustes guardados.'); renderNav(); renderMain(); }
  catch (ex) { toast(ex.message, 'err'); }
}
function sRerender() { renderMain(); }

/* =========================================================
   Usuarios
   ========================================================= */
VIEWS.usuarios = () => {
  const us = Object.values(Store.users).sort((a, b) => a.username.localeCompare(b.username));
  const roles = Store.settings.roles;
  return `<div class="page-head"><div><h1>Usuarios</h1><p>Cada persona con su usuario, su rol y su correo para recuperar la contraseña.${Store.mailEnabled ? '' : ' <span style="color:var(--warn)">El envío de correo no está configurado en el servidor.</span>'}</p></div><button class="btn primary" data-act="userNew">${ico('plus')}Nuevo usuario</button></div>
  <section class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Acceso</th><th>Estado</th><th>Último acceso</th><th></th></tr></thead><tbody>
  ${us.map(u => { const locked = u.lockUntil && new Date(u.lockUntil) > new Date(); return `<tr style="cursor:default"><td><b>${esc(u.username)}</b>${u.id === Auth.user.id ? ' <span class="badge">Tú</span>' : ''}</td><td>${esc(u.name)}<div class="help">${u.email ? esc(u.email) : '<span style="color:var(--warn)">Sin correo</span>'}</div></td><td>${esc((roles[u.role] || {}).name || u.role)}</td><td>${scopeSummary(u)}</td>
    <td>${!u.active ? '<span class="badge out">Desactivado</span>' : locked ? '<span class="badge red">Bloqueado</span>' : u.mustChange ? '<span class="badge warn">Debe cambiar contraseña</span>' : '<span class="badge ok">Activo</span>'}${u.mfaEnabled ? ' <span class="badge info" title="Verificación en dos pasos activada">2FA</span>' : ''}</td><td class="muted">${u.lastLogin ? fmtDT(u.lastLogin) : 'Nunca'}</td>
    <td style="text-align:right;max-width:none;overflow:visible;white-space:nowrap"><button class="btn sm" data-act="userEdit" data-id="${u.id}">${ico('edit')}Editar</button> <button class="btn sm" data-act="userPw" data-id="${u.id}">${ico('key')}Contraseña</button>${Store.mailEnabled && u.email && u.active ? ` <button class="btn sm" data-act="userSendReset" data-id="${u.id}" title="Envía al usuario un enlace para elegir contraseña">Enviar enlace</button>` : ''}${locked ? ` <button class="btn sm" data-act="userUnlock" data-id="${u.id}">Desbloquear</button>` : ''}${u.id !== Auth.user.id ? ` <button class="btn sm icon danger" data-act="userDel" data-id="${u.id}" aria-label="Eliminar">${ico('trash')}</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div></section>`;
};
const admins = () => Object.values(Store.users).filter(u => u.role === 'admin' && u.active);
function openUserForm(id) {
  const u = id ? Store.users[id] : null; const roles = Store.settings.roles;
  const body = `<form id="uf" class="fgrid" autocomplete="off">
    <label class="f">Usuario <input class="inp" name="username" value="${esc(u ? u.username : '')}" required ${u ? '' : 'autofocus'}></label>
    <label class="f">Nombre completo <input class="inp" name="name" value="${esc(u ? u.name : '')}" required></label>
    <label class="f">Correo <input class="inp" name="email" type="email" value="${esc(u ? u.email || '' : '')}" placeholder="nombre@laberit.com"></label>
    <label class="f">Rol <select class="sel" name="role">${Object.entries(roles).map(([k, r]) => `<option value="${esc(k)}" ${(u ? u.role : 'tecnico') === k ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
    <div class="wide" id="uf-scope">${scopeEditorHTML(u ? u.scope : {almacenes: {}}, u ? u.role : 'tecnico')}</div>
    ${!u && Store.mailEnabled ? `<label class="chk wide"><input type="checkbox" name="invite" checked>Enviar invitación por correo para que elija su contraseña</label>` : ''}
    ${u ? '' : `<label class="f pwrow">Contraseña inicial <input class="inp" name="password" type="password" autocomplete="new-password" required><div class="strength"><i id="uf-meter"></i></div></label><label class="f pwrow">Repite la contraseña <input class="inp" name="password2" type="password" autocomplete="new-password" required></label>`}
    <label class="chk wide"><input type="checkbox" name="active" ${!u || u.active ? 'checked' : ''}>Cuenta activa</label>
    <label class="chk wide pwrow"><input type="checkbox" name="mustChange" ${!u || u.mustChange ? 'checked' : ''}>Pedir cambio de contraseña en el próximo acceso</label>
    ${u && u.mfaEnabled ? `<div class="wide row" style="padding:10px 12px;background:var(--neutral-soft);border-radius:8px"><span><span class="badge info">2FA</span> Tiene la verificación en dos pasos activada.</span><span class="spacer"></span><button type="button" class="btn sm danger" data-act="userMfaReset" data-id="${esc(u.id)}">Quitar</button></div>` : ''}
  </form><div id="uf-err" class="err-msg hide" style="margin-top:14px"></div>`;
  const L = openLayer(modalHTML(u ? 'Editar usuario' : 'Nuevo usuario', body, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="uf-ok">${u ? 'Guardar cambios' : 'Crear usuario'}</button>`, 'narrow'));
  const f = $('#uf', L.el), err = $('#uf-err', L.el), btn = $('#uf-ok', L.el);
  if (f.password) f.password.addEventListener('input', () => { $('#uf-meter', L.el).style.width = Math.round(Auth.strength(f.password.value) * 100) + '%'; });
  const syncInvite = () => { const inv = f.invite && f.invite.checked; $$('.pwrow', L.el).forEach(x => { if (!u) x.classList.toggle('hide', !!inv); }); if (f.password) { f.password.required = !inv; f.password2.required = !inv; } f.email.required = !!inv; };
  if (f.invite) { f.invite.addEventListener('change', syncInvite); syncInvite(); }
  btn.onclick = async () => {
    err.classList.add('hide');
    try {
      const fields = {scope: readScope(L.el), username: f.username.value.trim(), name: f.name.value.trim(), email: f.email.value.trim(), role: f.role.value, active: f.active.checked, mustChange: f.mustChange.checked};
      const invite = !u && f.invite && f.invite.checked;
      if (invite && !fields.email) throw new Error('Para enviar la invitación, indica el correo.');
      if (!u && !invite) {
        if (f.password.value !== f.password2.value) throw new Error('Las contraseñas no coinciden.');
        const iss = Auth.pwIssues(f.password.value); if (iss.length) throw new Error('La contraseña necesita ' + iss.join(', ') + '.');
      }
      btn.disabled = true; btn.textContent = 'Guardando…';
      if (u) await API('PUT', '/api/users/' + encodeURIComponent(u.id), fields);
      else {
        const r = await API('POST', '/api/users', Object.assign(fields, invite ? {invite: true} : {password: f.password.value}));
        if (r && r.mailError) toast(r.mailError, 'warn', 7000);
        else if (invite) toast(`Invitación enviada a ${fields.email}.`);
      }
      await Store.loadUsers(); if (u && u.id === Auth.user.id) await Store.refreshMe();
      if (u || !invite) toast(u ? 'Usuario actualizado.' : 'Usuario creado.'); closeLayer(L);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); btn.disabled = false; btn.textContent = u ? 'Guardar cambios' : 'Crear usuario'; }
  };
}
function openPwForm(id) {
  const self = !id || id === Auth.user.id; const u = self ? Auth.user : Store.users[id];
  const body = `<form id="pf" style="display:flex;flex-direction:column;gap:14px" autocomplete="off">${self ? `<label class="f">Contraseña actual <input class="inp" name="cur" type="password" autocomplete="current-password" autofocus></label>` : `<p style="margin:0">Nueva contraseña para <b>${esc(u.username)}</b>. Se cerrarán sus sesiones abiertas.</p>`}
    <label class="f">Nueva contraseña <input class="inp" name="p1" type="password" autocomplete="new-password" ${self ? '' : 'autofocus'}><div class="strength"><i id="pf-meter"></i></div><span class="help">Mínimo ${Store.settings.minPassword} caracteres, con mayúsculas, minúsculas y números.</span></label>
    <label class="f">Repite la contraseña <input class="inp" name="p2" type="password" autocomplete="new-password"></label>
    ${self ? '' : `<label class="chk"><input type="checkbox" name="mc" checked>Pedir que la cambie al entrar</label>`}</form><div id="pf-err" class="err-msg hide" style="margin-top:14px"></div>`;
  const L = openLayer(modalHTML(self ? 'Cambiar mi contraseña' : 'Restablecer contraseña', body, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pf-ok">Guardar contraseña</button>`, 'narrow'));
  const f = $('#pf', L.el), err = $('#pf-err', L.el), btn = $('#pf-ok', L.el);
  f.p1.addEventListener('input', () => { $('#pf-meter', L.el).style.width = Math.round(Auth.strength(f.p1.value) * 100) + '%'; });
  btn.onclick = async () => {
    err.classList.add('hide');
    try {
      if (f.p1.value !== f.p2.value) throw new Error('Las contraseñas no coinciden.');
      const iss = Auth.pwIssues(f.p1.value); if (iss.length) throw new Error('La contraseña necesita ' + iss.join(', ') + '.');
      btn.disabled = true; btn.textContent = 'Guardando…';
      if (self) { const r = await API('POST', '/api/me/password', {current: f.cur.value, password: f.p1.value}); Auth.user = r.user; }
      else { await API('POST', `/api/users/${encodeURIComponent(u.id)}/password`, {password: f.p1.value, mustChange: f.mc.checked}); await Store.loadUsers(); }
      toast('Contraseña actualizada.'); closeLayer(L);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); btn.disabled = false; btn.textContent = 'Guardar contraseña'; }
  };
}
/* =========================================================
   Copias, datos de ejemplo
   ========================================================= */
async function doBackup() {
  const incl = $('#bk-users') && $('#bk-users').checked;
  try {
    const data = await API('GET', '/api/backup' + (incl ? '?users=1' : ''));
    await saveFile(`copia_almacen_${stamp()}.json`, JSON.stringify(data, null, 1), 'application/json');
  } catch (ex) { toast(ex.message, 'err'); }
}
async function doRestore(file) {
  let data; try { data = JSON.parse(await file.text()); } catch { toast('El archivo no es un JSON válido.', 'err'); return; }
  if (data.app !== 'laberit-almacen' || !Array.isArray(data.items)) { toast('El archivo no es una copia de este almacén.', 'err'); return; }
  const nUsers = Array.isArray(data.users) ? data.users.filter(u => u && u.pwHash).length : 0;
  if (!await confirmDlg('Restaurar copia', `Se restaurarán los ajustes y <b>${plural(data.items.length, 'registro')}</b> del ${fmtDT(data.exportedAt)}${nUsers ? `, y ${plural(nUsers, 'usuario')}` : ''}. Los números de serie que ya existan con otro registro se omitirán.`, 'Restaurar', true, 'RESTAURAR')) return;
  try {
    const r = await API('POST', '/api/restore', data);
    S.sdraft = null; await Store.reloadAll();
    toast(`Copia restaurada: ${plural(r.items, 'registro')}${r.skipped ? `, ${r.skipped} omitidos` : ''}${r.users ? `, ${plural(r.users, 'usuario')}` : ''}.`);
    renderMain();
  } catch (ex) { toast(ex.message, 'err'); }
}
async function sampleData(btn) {
  if (!await confirmDlg('Cargar datos de ejemplo', 'Se crearán unos 70 registros de prueba con números de serie que empiezan por <b>DEMO-</b>. Podrás borrarlos después filtrando por «DEMO».', 'Crear datos', false)) return;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const A0 = almById(almOfClient('IVCEvidensia')) || almacenes()[0]; const racks = A0.layout.racks, zones = A0.layout.zones;
  const loc = () => Math.random() < 0.82 && racks.length ? (r => ({ubicacion:r.id, nivel:1 + Math.floor(Math.random() * r.levels)}))(pick(racks)) : zones.length ? {ubicacion:pick(zones).id, nivel:1} : {};
  const st = () => pick(['En stock', 'En stock', 'En stock', 'En stock', 'Reservado', 'En preparación', 'RMA']);
  const base = () => Object.assign({pais: Math.random() < 0.62 ? 'España' : 'Portugal', cliente:'IVCEvidensia', condicion: Math.random() < 0.7 ? 'Nuevo' : 'Refurbished', estado:st(), fecha_entrada:today(), albaran:'ALB-' + (2600 + Math.floor(Math.random() * 300))}, loc());
  const sn = p => 'DEMO-' + p + Math.random().toString(36).slice(2, 9).toUpperCase();
  const plus = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const recs = [];
  const mk = (cat, data) => { const c = catById(cat); if (!c) return; const r = {id:newId(), cat, data:Object.assign(defaultsFor(c), base(), data), createdAt:nowISO(), createdBy:Auth.user.username, updatedAt:nowISO(), updatedBy:Auth.user.username, history:[]}; hist(r, 'Alta', 'Datos de ejemplo'); recs.push(r); };
  const pcs = [['Lenovo', 'ThinkPad T14 Gen 4', 'Portátil'], ['Lenovo', 'ThinkCentre M70q', 'Mini PC'], ['HP', 'EliteBook 840 G10', 'Portátil'], ['Dell', 'OptiPlex 7010', 'Sobremesa'], ['HP', 'ProDesk 400 G9', 'Sobremesa']];
  for (let i = 0; i < 30; i++) { const p = pick(pcs); mk('equipos', {serie:sn('PC'), marca:p[0], modelo:p[1], tipo:p[2], ram:pick([8, 16, 16, 32]), disco:pick(['256 GB SSD', '512 GB SSD', '1 TB SSD']), cpu:pick(['Intel Core i5-1335U', 'Intel Core i7-1355U', 'AMD Ryzen 5 PRO 7530U']), garantia:plus(Math.floor(Math.random() * 900) - 40)}); }
  for (let i = 0; i < 16; i++) mk('monitores', {serie:sn('MN'), marca:pick(['Dell', 'HP', 'LG']), modelo:pick(['P2423D', 'E24 G5', '27BK550Y']), pulgadas:pick(['24', '24', '27']), garantia:plus(400 + Math.floor(Math.random() * 600))});
  for (let i = 0; i < 6; i++) mk('soportes', {tipo:pick(['Mesa simple', 'Mesa doble', 'Brazo de gas']), marca:pick(['Ergotron', 'Equip', 'Genérico']), modelo:pick(['LX', '650120', 'DS-01']), cantidad:2 + Math.floor(Math.random() * 18), estado:EST().stock[0]});
  for (let i = 0; i < 9; i++) { const m = pick(listOf('modelos_switch')); mk('switches', {serie:sn('SW'), marca:'Fortinet', modelo:m, puertos:(m.match(/1(\d\d)/) || [, '24'])[1], poe:/POE/.test(m), firmware:'7.4.3', garantia:plus(300 + Math.floor(Math.random() * 700))}); }
  for (let i = 0; i < 7; i++) mk('firewalls', {serie:sn('FG'), marca:'Fortinet', modelo:pick(listOf('modelos_firewall')), firmware:'7.4.4', licencia:plus(Math.floor(Math.random() * 500) - 20)});
  for (let i = 0; i < 4; i++) mk('accesorios', {tipo:pick(listOf('tipos_accesorio')), marca:pick(['Logitech', 'Lenovo', 'HP']), cantidad:5 + Math.floor(Math.random() * 40), estado:EST().stock[0]});
  if (btn) btn.disabled = true;
  try { await Store.putMany(recs, n => { if (btn) btn.textContent = `Creando ${n}/${recs.length}…`; }); Store.log('importacion', `${recs.length} registros de ejemplo`); toast(`${recs.length} registros de ejemplo creados.`); }
  catch (ex) { toast(ex.message, 'err'); }
  if (btn && document.contains(btn)) { btn.disabled = false; btn.textContent = 'Cargar datos de ejemplo'; }
}

/* =========================================================
   Acciones (delegación de eventos)
   ========================================================= */
const ACT = {
  nav: () => $('#shell').classList.toggle('nav-open'),
  theme: () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; LS.set('lbinv.theme', next);
    if (S.view === 'mapa' && Map3D.mounted) Map3D.refresh(); if (S.view === 'ajustes' && S.stab === 'almacen') drawLayoutPreview();
  },
  logout: () => Auth.logout(),
  myAccount: el => { el.closest('details') && el.closest('details').removeAttribute('open'); openAccountForm(); },
  forgot: () => { history.replaceState(null, '', location.pathname + '#/inicio'); $('#app').innerHTML = authHTML('forgot'); bindAuth('forgot'); },
  backToLogin: () => { history.replaceState(null, '', location.pathname + '#/inicio'); $('#app').innerHTML = ''; renderApp(); },
  userSendReset: async el => {
    const u = Store.users[el.dataset.id]; if (!u) return;
    if (!await confirmDlg('Enviar enlace por correo', `Se enviará a <b>${esc(u.email)}</b> un enlace para que <b>${esc(u.username)}</b> elija una contraseña nueva. Su contraseña actual seguirá funcionando hasta que la cambie.`, 'Enviar', false)) return;
    el.disabled = true;
    try { const r = await API('POST', `/api/users/${encodeURIComponent(u.id)}/send-reset`); toast('Enlace enviado a ' + r.email + '.'); } catch (ex) { toast(ex.message, 'err', 6000); }
    el.disabled = false;
  },
  mailTest: async el => { el.disabled = true; try { const r = await API('POST', '/api/mail/test'); toast('Correo de prueba enviado a ' + r.email + '.'); } catch (ex) { toast(ex.message, 'err', 7000); } el.disabled = false; },
  myPassword: el => { el.closest('details') && el.closest('details').removeAttribute('open'); openPwForm(); },
  newItem: el => { const c = el.dataset.cat; if (c && c !== 'all' && catById(c)) openItemForm(c); else chooseCategory(id => openItemForm(id)); },
  editItem: el => { const it = Store.items[el.dataset.id]; it && openItemForm(it.cat, it.id); },
  dupItem: el => { const it = Store.items[el.dataset.id]; if (!it) return; const d = clone(it.data); const c = catById(it.cat); c.fields.filter(f => f.unique).forEach(f => d[f.key] = ''); d.mac = ''; openItemForm(it.cat, null, d); },
  delItem: async el => {
    const it = Store.items[el.dataset.id]; if (!it) return;
    if (!await confirmDlg('Eliminar material', `Se eliminará <b>${esc(itemKey(it))}</b> y su historial. Si ha salido del almacén, es mejor cambiar su estado a «Enviado» o «Baja».`, 'Eliminar')) return;
    try { await Store.delItem(it.id); Store.log('baja', `${(catById(it.cat) || {}).name}: ${itemKey(it)}`); toast('Eliminado.'); closeLayer(layers.find(l => l.isDrawer)); } catch (ex) { toast(ex.message, 'err'); }
  },
  quickMove: el => openBulkEdit([el.dataset.id], 'Mover o cambiar estado'),
  openItem: el => openDrawer(el.dataset.id),
  labelOne: el => { const it = Store.items[el.dataset.id]; it && exportLabels([it]); },
  showOnMap: (el, e) => { e.preventDefault(); S.mapSel = el.dataset.loc; S.mapHit = S.drawerId; closeAllLayers(); location.hash = '#/mapa'; },
  clearFilters: () => { S.f = {q:'', pais:'', cliente:'', condicion:'', estado:'', ubicacion:''}; S.page = 1; renderMain(); },
  clearSel: () => { S.sel.clear(); renderTable(); },
  page: el => { S.page = Number(el.dataset.p); renderTable(); $('#tbl-area').scrollIntoView({block:'nearest'}); },
  bulkEdit: () => openBulkEdit([...S.sel]),
  bulkDelete: async () => {
    const ids = [...S.sel]; if (!await confirmDlg('Eliminar registros', `Se eliminarán <b>${plural(ids.length, 'registro')}</b> con su historial.`, 'Eliminar', true, ids.length > 5 ? 'ELIMINAR' : '')) return;
    try { await Store.delMany(ids); Store.log('baja', `Eliminación masiva de ${plural(ids.length, 'registro')}`); S.sel.clear(); toast('Registros eliminados.'); renderTable(); } catch (ex) { toast(ex.message, 'err'); }
  },
  exportCSV: el => { el.closest('details') && el.closest('details').removeAttribute('open'); exportCSV(el); },
  exportXLSX: el => { el.closest('details') && el.closest('details').removeAttribute('open'); exportXLSX(); },
  labels: el => { el.closest('details') && el.closest('details').removeAttribute('open'); exportLabels(scopeItems(el)); },
  importCSV: el => { el.closest('details') && el.closest('details').removeAttribute('open'); openImport(); },
  sampleData: el => sampleData(el),
  addValToggle: el => { const box = $('#' + el.dataset.for + '-add'); box.classList.toggle('hide'); if (!box.classList.contains('hide')) box.querySelector('input').focus(); },
  addValSave: async el => {
    const box = $('#' + el.dataset.for + '-add'); const inp = box.querySelector('input'); const v = inp.value.trim(); if (!v) return;
    const s = clone(Store.settings); const list = s.lists[el.dataset.list] || (s.lists[el.dataset.list] = []);
    if (!list.includes(v)) list.push(v);
    try { await Store.putSettings(s); Store.log('ajustes', `Valor «${v}» añadido a ${s.listLabels[el.dataset.list] || el.dataset.list}`); } catch (ex) { toast(ex.message, 'err'); return; }
    const sel = $('#' + el.dataset.for); if (![...sel.options].some(o => o.value === v)) sel.add(new Option(v, v)); sel.value = v;
    inp.value = ''; box.classList.add('hide'); toast(`«${v}» añadido a la lista.`);
  },
  mvIn: el => doMvIn(el), mvOut: el => doMvOut(el),
  exportAudit: async () => { const rows = auditFiltered().map(e => ({Fecha:fmtDT(e.t), Usuario:e.u, 'Acción':ACTION_LABEL[e.a] || e.a, Detalle:e.d})); if (!rows.length) return toast('No hay actividad que exportar.', 'warn'); await saveFile(`registro_actividad_${stamp()}.csv`, toCSV(rows), 'text/csv'); },
  mapTop: () => { Map3D.sph.phi = 0.03; Map3D.sph.theta = 0; },
  mapReset: () => { Map3D.resetView(); },
  mapCat: el => { const all = cats().map(c => c.id); if (!S.mapCats) S.mapCats = new Set(all); const id = el.dataset.id; S.mapCats.has(id) ? S.mapCats.delete(id) : S.mapCats.add(id); if (S.mapCats.size === all.length) S.mapCats = null; Map3D.refresh(); renderMapSide(); },
  // Ajustes
  sSave: () => saveSettings(),
  almSel: el => { S.almSel = el.dataset.k; sRerender(); },
  almAdd: () => { const n = $('#new-alm').value.trim(); if (!n) return; const d = draft(); const id = 'alm-' + newId().slice(-8); d.almacenes.push({id, nombre: n, clientes: [], layout: {width: 30, depth: 20, racks: [], zones: []}}); S.almSel = id; sRerender(); },
  almDel: async () => { const d = draft(); const A = d.almacenes.find(a => a.id === S.almSel); if (!A || (A.clientes || []).length) return; if (!await confirmDlg('Eliminar almacén', `Se eliminará «${esc(A.nombre)}» y su distribución al guardar.`, 'Eliminar')) return; d.almacenes = d.almacenes.filter(a => a !== A); S.almSel = d.almacenes[0].id; sRerender(); },
  almCli: el => { const d = draft(); const A = d.almacenes.find(a => a.id === S.almSel); const c = el.dataset.c; A.clientes = (A.clientes || []).filter(x => x !== c); if (el.checked) A.clientes.push(c); const sb = $('#savebar'); sb && sb.classList.toggle('hide', !dirty()); },
  noop: () => {},
  splashPreview: () => previewSplash(),
  eraseOpen: () => openEraseForm([...S.sel]),
  certMake: async () => {
    const ids = [...S.sel], sin = ids.map(id => Store.items[id]).filter(it => it && !it.data.borrado);
    if (sin.length) { toast(`${plural(sin.length, 'equipo')} sin borrado registrado. Regístralo antes con «Registrar borrado».`, 'warn', 6000); return; }
    if (!await confirmDlg('Certificado de borrado', `Se generará un certificado con ${plural(ids.length, 'equipo')}.`, 'Generar certificado', false)) return;
    try { const r = await API('POST', '/api/certificates', {itemIds: ids}); Store.loadDeliveries(); S.sel.clear(); renderMain(); docDone(r.delivery, 'Certificado generado', `Se ha generado el certificado de borrado <b class="serial">${esc(r.delivery.number)}</b>. Está también en Albaranes y documentos.`); }
    catch (ex) { toast(ex.message, 'err', 7000); }
  },
  trLotAdd: () => { const id = $('#tr-lot').value, q = Math.floor(Number($('#tr-lot-q').value)); const it = Store.items[id]; if (!it || !(q >= 1) || q > qtyOf(it)) { toast('Cantidad no válida.', 'warn'); return; } S.tr.serials = $('#tr-serials').value; S.tr.bulk = (S.tr.bulk || []).filter(b => b.itemId !== id).concat([{itemId: id, qty: q}]); renderMain(); },
  trLotDel: el => { S.tr.serials = $('#tr-serials').value; S.tr.bulk.splice(Number(el.dataset.i), 1); renderMain(); },
  trCreate: async el => {
    const T = S.tr, lines = $('#tr-serials').value.split(/[\s,;]+/).map(x => cleanScan(x)).filter(Boolean);
    const found = [], missing = [];
    lines.forEach(sn => { const it = findBySerial(sn); if (it) found.push(it); else missing.push(sn); });
    if (missing.length) { toast(`No están en el inventario: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`, 'err', 7000); return; }
    if (!found.length && !(T.bulk || []).length) { toast('Escanea equipos o añade material por cantidad.', 'warn'); return; }
    const o = almById(T.origen), d = almById(T.destino);
    if (!await confirmDlg('Crear traspaso', `Se traspasarán ${plural(found.length + (T.bulk || []).reduce((a, b) => a + b.qty, 0), 'unidad', 'unidades')} de <b>${esc(T.cliente)}</b> de <b>${esc(o.nombre)}</b> a <b>${esc(d.nombre)}</b>. Quedarán en tránsito hasta que se reciban.`, 'Crear traspaso', false)) return;
    el.disabled = true;
    try { const r = await API('POST', '/api/transfers', {cliente: T.cliente, origen: T.origen, destino: T.destino, itemIds: found.map(x => x.id), bulk: T.bulk || [], carrier: $('#tr-carrier').value, notes: $('#tr-notes').value});
      S.tr = {cliente: T.cliente, origen: T.origen, destino: T.destino}; Store.loadDeliveries(); renderMain(); docDone(r.delivery, 'Traspaso creado', `Se ha creado el traspaso <b class="serial">${esc(r.delivery.number)}</b>. Cuando llegue el material, púlsalo en Albaranes y documentos y elige «Recibir».`); }
    catch (ex) { toast(ex.message, 'err', 7000); el.disabled = false; }
  },
  trReceive: async el => {
    const d = (Store.deliveries || []).find(x => x.id === el.dataset.id); if (!d) return;
    if (!await confirmDlg('Recibir traspaso', `¿Ha llegado el material del traspaso <b class="serial">${esc(d.number)}</b> (${plural(d.units || 0, 'unidad', 'unidades')})? Pasará a estar disponible en el almacén de destino. Después puedes colocarlo con «Colocar en ubicación».`, 'Recibir', false)) return;
    try { const r = await API('POST', `/api/transfers/${encodeURIComponent(d.id)}/receive`); closeAllLayers(); Store.loadDeliveries(); toast(`Traspaso recibido: ${plural(r.received, 'registro')}.`); }
    catch (ex) { toast(ex.message, 'err'); }
  },
  rtCreate: async el => {
    const serials = $('#rt-serials').value.split(/[\s,;]+/).map(x => cleanScan(x).toUpperCase()).filter(Boolean);
    if (!serials.length) { toast('Escribe o escanea los números de serie.', 'warn'); return; }
    const dup = serials.filter((x, i) => serials.indexOf(x) !== i); if (dup.length) { toast(`Repetidos: ${[...new Set(dup)].join(', ')}`, 'warn'); return; }
    const cli = $('#rt-cliente').value, sedeId = $('#rt-sede').value, otro = $('#rt-otro').value.trim();
    const nuevos = serials.filter(sn => !findBySerial(sn)).length;
    if (!await confirmDlg('Registrar retirada', `Se registrará la retirada de ${plural(serials.length, 'equipo')} de <b>${esc(cli)}</b>${nuevos ? ` (${plural(nuevos, 'equipo nuevo', 'equipos nuevos')} en el inventario)` : ''}.`, 'Registrar retirada', false)) return;
    el.disabled = true;
    try { const r = await API('POST', '/api/retiradas', {cliente: cli, sedeId: otro ? '' : sedeId, sede: otro ? {nombre: otro} : {}, almacen: ($('#rt-almacen') || {}).value, cat: $('#rt-cat').value, marca: $('#rt-marca').value, modelo: $('#rt-modelo').value, tipo: $('#rt-tipo').value, lines: serials.map(serie => ({serie})), carrier: $('#rt-carrier').value, notes: $('#rt-notes').value});
      $('#rt-serials').value = ''; Store.loadDeliveries(); docDone(r.delivery, 'Retirada registrada', `Albarán de retirada <b class="serial">${esc(r.delivery.number)}</b> con ${plural(r.total, 'equipo')}${r.nuevos ? `, de los que ${plural(r.nuevos, 'se ha dado de alta', 'se han dado de alta')} en el inventario` : ''}. Ahora puedes registrar el borrado de datos y generar el certificado desde el inventario (filtra por estado «${esc(EST().retirado)}»).`); el.disabled = false; }
    catch (ex) { toast(ex.message, 'err', 7000); el.disabled = false; }
  },
  locLabels: () => locLabels(),
  placeClear: () => { S.placeLoc = null; renderMain(); setTimeout(() => $('#place-code') && $('#place-code').focus(), 30); },
  routeShow: el => { const o = S.orderDetail; S.route = el.dataset.id; S.routeOrder = o && o.id === el.dataset.id ? o : null; const a = o && (o.almacen || almOfClient(o.cliente)); if (a) { S.alm = a; LS.set('lbinv.alm', a); } S.mapSel = null; location.hash = '#/mapa'; if (!S.routeOrder) loadRouteOrder(); },
  routeExit: () => { S.route = null; S.routeOrder = null; Map3D.buildRoute(); renderMapSide(); },
  routeStop: el => { if (Map3D.mounted && Map3D.locs && Map3D.locs[el.dataset.loc]) Map3D.select(el.dataset.loc, true); },
  dashRange: el => { S.dashRange = Number(el.dataset.r); renderMain(); },
  dashRack: el => { S.mapSel = el.dataset.id; S.mapHit = null; location.hash = '#/mapa'; },
  dashGo: el => { S.f = {q:'', pais:'', cliente:'', condicion:'', estado: el.dataset.estado || '', ubicacion:''}; S.page = 1; S.cat = 'all'; location.hash = '#/inventario/all'; renderMain(); },
  dashAlm: el => { S.alm = el.dataset.id; LS.set('lbinv.alm', el.dataset.id); renderNav(); renderTop(); renderMain(); },
  comboQuick: el => { el.closest('details') && el.closest('details').removeAttribute('open'); openComboQuick(); },
  comboAdd: () => { const d = draft(); d.combos = d.combos || []; d.combos.push({key: 'combo_' + newId().slice(-8).toLowerCase(), label: 'Cuenta', template: '{cuenta}{dominio}'}); sRerender(); },
  comboDel: el => { const d = draft(); const c = d.combos[Number(el.dataset.i)]; d.combos.splice(Number(el.dataset.i), 1); ['albaran', 'recogida'].forEach(t => { if (d[t] && Array.isArray(d[t].columns)) d[t].columns = d[t].columns.filter(k => k !== c.key); }); sRerender(); },
  themePick: el => { const d = draft(); d.tema = d.tema || {}; d.tema.primario = el.dataset.c; applyTheme(el.dataset.c); const i = $('#b-tema_primario'); if (i) i.value = el.dataset.c; const sb = $('#savebar'); sb && sb.classList.toggle('hide', !dirty()); },
  sDiscardTheme: () => {},
  dlDelete: async el => {
    const d = (Store.deliveries || []).find(x => x.id === el.dataset.id); if (!d) return;
    let revert = false;
    const ok = await new Promise(res => {
      let done = false;
      const L = openLayer(modalHTML('Eliminar albarán', `<p style="margin-top:0">Se eliminará el albarán <b class="serial">${esc(d.number)}</b>${d.orderNumber ? ` del pedido <b>${esc(d.orderNumber)}</b>` : ''}. Su número no se volverá a usar.</p>
        <label class="chk"><input type="checkbox" id="dd-revert">Devolver a stock el material de este albarán (${plural(d.units || 0, 'unidad', 'unidades')})</label>
        <p class="help" style="margin:6px 0 0 24px">Márcalo si el envío no llegó a salir. Si lo dejas sin marcar, el material sigue como enviado.${d.orderNumber ? ' Si lo marcas, el pedido pasará a cancelado.' : ''}</p>`,
        `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="dd-ok">${ico('trash')}Eliminar albarán</button>`, 'narrow'), {onClose: () => { if (!done) res(false); }});
      $('#dd-ok', L.el).onclick = () => { revert = $('#dd-revert', L.el).checked; done = true; closeLayer(L); res(true); };
    });
    if (!ok) return;
    try { const r = await API('DELETE', '/api/deliveries/' + encodeURIComponent(d.id), {revert}); closeAllLayers(); Store.loadDeliveries(); Store.loadOrders(); toast(`Albarán ${d.number} eliminado${r.reverted ? ` y ${plural(r.reverted, 'registro devuelto', 'registros devueltos')} a stock` : ''}.`); }
    catch (ex) { toast(ex.message, 'err'); }
  },
  dlMail: async el => {
    const d = (Store.deliveries || []).find(x => x.id === el.dataset.id) || {};
    const sede = (Store.settings.sedes || []).find(x => x.id === (d.sede || {}).id) || d.sede;
    const p = await composeDeliveryMail({sede, cliente: d.cliente, units: d.units, title: `Enviar albarán ${d.number || ''} por correo`, number: d.number});
    if (!p) return;
    const r = await sendDeliveryMail(el.dataset.id, p);
    if (r.ok) { toast('Albarán enviado a ' + r.to.join(', ') + '.'); Store.loadDeliveries(); } else toast(r.error, 'err', 7000);
  },
  colsReset: el => { el.closest('details') && el.closest('details').removeAttribute('open'); try { localStorage.removeItem(colPrefKey()); } catch {} renderMain(); },
  albColToggle: el => { const A = draft()[el.dataset.target || 'albaran']; const cur = (A.columns && A.columns.length ? A.columns : COLS_DEFAULT[el.dataset.target || 'albaran']).slice(); const k = el.dataset.k; const i = cur.indexOf(k); if (i >= 0) { if (cur.length > 1) cur.splice(i, 1); } else cur.push(k); A.columns = cur; sRerender(); },
  albColMove: el => { const A = draft()[el.dataset.target || 'albaran']; const cur = (A.columns && A.columns.length ? A.columns : COLS_DEFAULT[el.dataset.target || 'albaran']).slice(); const i = Number(el.dataset.i), j = i + Number(el.dataset.dir); if (j < 0 || j >= cur.length) return; [cur[i], cur[j]] = [cur[j], cur[i]]; A.columns = cur; sRerender(); },
  ruleAdd: () => { const d = draft(); d.stockRules = d.stockRules || []; d.stockRules.push({id: newId(), name: 'Nuevo grupo', cat: (cats()[0] || {}).id, conds: [], min: 5, emails: [], active: true}); sRerender(); },
  ruleDel: el => { draft().stockRules.splice(Number(el.dataset.i), 1); sRerender(); },
  condAdd: el => { const r = draft().stockRules[Number(el.dataset.i)]; const c = catById(r.cat); const f = c && c.fields.find(x => x.type === 'select' && !LOCKED_FIELDS.includes(x.key)); r.conds = r.conds || []; r.conds.push({k: f ? f.key : 'tipo', v: ''}); sRerender(); },
  condDel: el => { draft().stockRules[Number(el.dataset.i)].conds.splice(Number(el.dataset.j), 1); sRerender(); },
  stockTest: async el => {
    if (dirty()) { toast('Guarda los cambios antes de probar.', 'warn'); return; }
    el.disabled = true;
    try { const r = await API('POST', '/api/stock-alerts/test'); toast(r.low.length ? `Avisos enviados para: ${r.low.join(', ')}.` : 'Todos los grupos están por encima del mínimo: no se ha enviado nada.', r.low.length ? 'ok' : 'info', 6000); }
    catch (ex) { toast(ex.message, 'err'); }
    el.disabled = false;
  },
  readAlbaran: () => openAlbaranReader(),
  scan: el => {
    const t = el.dataset.target, multi = el.dataset.multi === '1';
    Scanner.open({multi, title: el.dataset.title || 'Escanear código', onCode: code => {
      if (t === 'pick') return pickCode(code);
      if (t === 'place-code') return placeCode(code);
      if (t === 'tr-serials' || t === 'rt-serials') { const ta = $('#' + t); if (ta) { const v = cleanScan(code); if (!ta.value.split(/\s+/).includes(v)) ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + v; if (t === 'tr-serials') { S.tr = S.tr || {}; S.tr.serials = ta.value; } } return; }
      const inp = document.getElementById(t); if (!inp) return;
      const v = cleanScan(code);
      if (inp.tagName === 'TEXTAREA') inp.value = (inp.value.trim() ? inp.value.trim() + '\n' : '') + v; else inp.value = v;
      inp.dispatchEvent(new Event('input', {bubbles: true}));
    }});
  },
  orderTab: el => { S.orderTab = el.dataset.k; renderMain(); },
  orderNew: () => openOrderForm(null),
  orderEdit: () => S.orderDetail && openOrderForm(S.orderDetail),
  orderReserve: async el => {
    el.disabled = true;
    try { const r = await API('POST', `/api/orders/${encodeURIComponent(S.orderDetail.id)}/reserve`); S.orderDetail = r.order; renderMain();
      toast(r.shortages.length ? `Reservado lo disponible. Faltan: ${r.shortages.map(s => `${s.missing} × ${s.text}`).join('; ')}.` : 'Stock reservado.', r.shortages.length ? 'warn' : 'ok', r.shortages.length ? 9000 : 3200);
    } catch (ex) { toast(ex.message, 'err'); el.disabled = false; }
  },
  orderRelease: async el => {
    el.closest('details') && el.closest('details').removeAttribute('open');
    if (!await confirmDlg('Liberar reservas', 'Todas las unidades reservadas para este pedido volverán a estar en stock.', 'Liberar', true)) return;
    try { const r = await API('POST', `/api/orders/${encodeURIComponent(S.orderDetail.id)}/release`); S.orderDetail = r.order; renderMain(); toast('Reservas liberadas.'); } catch (ex) { toast(ex.message, 'err'); }
  },
  orderCancel: async el => {
    el.closest('details') && el.closest('details').removeAttribute('open');
    if (!await confirmDlg('Cancelar pedido', 'Se cancelará el pedido y sus unidades reservadas volverán a estar en stock.', 'Cancelar pedido', true)) return;
    try { const r = await API('POST', `/api/orders/${encodeURIComponent(S.orderDetail.id)}/cancel`); S.orderDetail = r.order; renderMain(); toast('Pedido cancelado.'); } catch (ex) { toast(ex.message, 'err'); }
  },
  orderDelete: async el => {
    el.closest('details') && el.closest('details').removeAttribute('open');
    if (!await confirmDlg('Eliminar pedido', 'El pedido se eliminará definitivamente.', 'Eliminar', true)) return;
    try { await API('DELETE', '/api/orders/' + encodeURIComponent(S.orderDetail.id)); S.orderDetail = null; Store.loadOrders(); location.hash = '#/pedidos'; toast('Pedido eliminado.'); } catch (ex) { toast(ex.message, 'err'); }
  },
  orderShip: () => S.orderDetail && openShipForm(S.orderDetail),
  pickToggle: async el => {
    const picked = el.checked;
    try { const r = await API('POST', `/api/orders/${encodeURIComponent(S.orderDetail.id)}/pick`, {itemId: el.dataset.id, picked}); S.orderDetail = r.order; renderMain(); }
    catch (ex) { el.checked = !picked; toast(ex.message, 'err'); }
  },
  dlOpen: el => openDelivery(el.dataset.id),
  sedeAdd: () => { const d = draft(); d.sedes = d.sedes || []; d.sedes.push({id: newId(), cliente: S.sedeFilter || listOf('clientes')[0] || '', nombre: '', direccion: '', cp: '', ciudad: '', pais: listOf('paises')[0] || '', contacto: '', telefono: ''}); sRerender(); },
  sedeDel: el => { draft().sedes.splice(Number(el.dataset.i), 1); sRerender(); },
  mfaStart: () => {
    const L = openLayer(modalHTML('Activar verificación en dos pasos', '<div id="mfa-modal"></div>', '', 'narrow'));
    mfaEnrollFlow($('#mfa-modal', L.el), () => { closeLayer(L); toast('Verificación en dos pasos activada.'); loadMfaSection($('#af-mfa')); });
  },
  codesDownload: () => Auth._codes && downloadCodes(Auth._codes),
  mfaRecovery: () => {
    const L = openLayer(modalHTML('Nuevos códigos de recuperación', `<p style="margin-top:0">Los códigos anteriores dejarán de funcionar. Escribe el código actual de tu aplicación de autenticación:</p><input class="inp mfa-input" id="mr-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="max-width:200px"><div id="mr-err" class="err-msg hide" style="margin-top:10px"></div>`, '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="mr-ok">Generar</button>', 'narrow'));
    $('#mr-ok', L.el).onclick = async () => {
      try { const r = await API('POST', '/api/me/mfa/recovery', {code: $('#mr-code', L.el).value}); Auth._codes = r.codes; $('.modal-b', L.el).innerHTML = codesHTML(r.codes); $('.modal-f', L.el).innerHTML = '<button class="btn primary" data-close>He guardado los códigos</button>'; loadMfaSection($('#af-mfa')); }
      catch (ex) { $('#mr-err', L.el).textContent = ex.message; $('#mr-err', L.el).classList.remove('hide'); }
    };
  },
  mfaForget: async () => {
    if (!await confirmDlg('Olvidar equipos recordados', 'En todos los equipos donde marcaste «recordar» se volverá a pedir el código al iniciar sesión.', 'Olvidar equipos', false)) return;
    try { const r = await API('POST', '/api/me/mfa/forget-devices'); toast(`Equipos olvidados: ${r.removed}.`); loadMfaSection($('#af-mfa')); } catch (ex) { toast(ex.message, 'err'); }
  },
  mfaDisable: () => {
    const L = openLayer(modalHTML('Desactivar verificación en dos pasos', `<div style="display:flex;flex-direction:column;gap:12px"><label class="f">Contraseña<input class="inp" type="password" id="md-pw" autocomplete="current-password"></label><label class="f">Código de la aplicación o de recuperación<input class="inp" id="md-code" autocomplete="one-time-code"></label></div><div id="md-err" class="err-msg hide" style="margin-top:10px"></div>`, '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="md-ok">Desactivar</button>', 'narrow'));
    $('#md-ok', L.el).onclick = async () => {
      try { const r = await API('POST', '/api/me/mfa/disable', {password: $('#md-pw', L.el).value, code: $('#md-code', L.el).value}); Auth.user = r.user; closeLayer(L); toast('Verificación en dos pasos desactivada.'); loadMfaSection($('#af-mfa')); }
      catch (ex) { $('#md-err', L.el).textContent = ex.message; $('#md-err', L.el).classList.remove('hide'); }
    };
  },
  userMfaReset: async el => {
    const u = Store.users[el.dataset.id]; if (!u) return;
    if (!await confirmDlg('Quitar verificación en dos pasos', `<b>${esc(u.username)}</b> podrá entrar solo con su contraseña y volver a activarla desde «Mi cuenta». Úsalo si ha perdido el móvil.`, 'Quitar', true)) return;
    try { await API('POST', `/api/users/${encodeURIComponent(u.id)}/mfa/reset`); await Store.loadUsers(); closeAllLayers(); toast('Verificación en dos pasos quitada.'); } catch (ex) { toast(ex.message, 'err'); }
  },
  brandMode: el => { const d = draft(); d.brand = d.brand || {}; if (el.dataset.v === 'image' && !d.brand.logo) { $('#brand-file').click(); return; } d.brand.mode = el.dataset.v; sRerender(); },
  brandBg: el => { const d = draft(); d.brand = d.brand || {}; d.brand.bg = el.dataset.v; sRerender(); },
  bulkAdd: () => { S.mvBulk = S.mvBulk || []; S.mvBulk.push({itemId: '', qty: 1}); renderBulk(); const el = $(`#mvb-sel-${S.mvBulk.length - 1}`); el && el.focus(); },
  bulkDel: el => { S.mvBulk.splice(Number(el.dataset.i), 1); renderBulk(); },
  brandAlign: el => { const d = draft(); d.brand = d.brand || {}; d.brand.align = el.dataset.v; sRerender(); },
  brandTrim: async el => {
    const d = draft(); if (!d.brand || !d.brand.logo) return; el.disabled = true;
    try { const r = await processLogo(d.brand.logo); d.brand.logo = r.url; sRerender(); toast(r.trimmed ? 'Márgenes recortados. Pulsa «Guardar cambios» para aplicarlo.' : 'La imagen no tenía márgenes vacíos que recortar.', 'info'); }
    catch (ex) { toast(ex.message, 'err'); el.disabled = false; }
  },
  brandRemove: () => { const d = draft(); d.brand.logo = ''; d.brand.mode = 'text'; sRerender(); },
  sDiscard: () => { S.sdraft = null; applyTheme(); renderMain(); },
  listSel: el => { S.listSel = el.dataset.k; sRerender(); },
  listAdd: () => { const n = $('#new-list').value.trim(); if (!n) return; const d = draft(); let k = slug(n); while (d.lists[k]) k += '_2'; d.lists[k] = []; d.listLabels[k] = n; S.listSel = k; sRerender(); },
  listDel: async () => { if (!await confirmDlg('Eliminar lista', `Se eliminará la lista «${esc(draft().listLabels[S.listSel] || S.listSel)}» al guardar.`, 'Eliminar')) return; const d = draft(); delete d.lists[S.listSel]; delete d.listLabels[S.listSel]; S.listSel = Object.keys(d.lists)[0]; sRerender(); },
  valAdd: () => { const inp = $('#new-val'); const v = inp.value.trim(); if (!v) return; const a = draft().lists[S.listSel]; if (a.includes(v)) { toast('Ese valor ya existe.', 'warn'); return; } a.push(v); sRerender(); setTimeout(() => $('#new-val') && $('#new-val').focus(), 0); },
  valDel: el => { draft().lists[S.listSel].splice(Number(el.dataset.i), 1); sRerender(); },
  valMove: el => { const a = draft().lists[S.listSel], i = Number(el.dataset.i), j = i + Number(el.dataset.dir); [a[i], a[j]] = [a[j], a[i]]; sRerender(); },
  catSel: el => { S.catSel = el.dataset.k; sRerender(); },
  catAdd: () => {
    const n = $('#new-cat').value.trim(); if (!n) return; const d = draft(); let id = slug(n); while (d.categories.some(c => c.id === id)) id += '_2';
    d.categories.push({id, name:n, icon:'📦', color:'#C8102E', serialized:true, minStock:0, fields:[F('serie', 'Número de serie', 'text', {required:true, unique:true, table:true}), F('marca', 'Marca', 'text', {table:true}), F('modelo', 'Modelo', 'text', {table:true}), ...commonFields()]});
    S.catSel = id; sRerender();
  },
  catDel: async () => { const d = draft(); if (d.categories.length <= 1) return toast('Debe quedar al menos una categoría.', 'warn'); if (!await confirmDlg('Eliminar categoría', 'Se eliminará al guardar los ajustes.', 'Eliminar')) return; d.categories = d.categories.filter(c => c.id !== S.catSel); S.catSel = d.categories[0].id; sRerender(); },
  catMove: el => { const a = draft().categories, i = a.findIndex(c => c.id === S.catSel), j = i + Number(el.dataset.dir); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; sRerender(); },
  fAdd: () => {
    const lab = $('#new-f-label').value.trim(); if (!lab) return; const c = draft().categories.find(x => x.id === S.catSel);
    let k = slug(lab); while (c.fields.some(f => f.key === k)) k += '_2';
    const t = $('#new-f-type').value; const f = F(k, lab, t, {});
    if (t === 'select') { const d = draft(); if (!d.lists[k]) { d.lists[k] = []; d.listLabels[k] = lab; } f.list = k; }
    const at = c.fields.findIndex(x => x.key === 'pais'); c.fields.splice(at < 0 ? c.fields.length : at, 0, f); sRerender();
  },
  fDel: async el => { const c = draft().categories.find(x => x.id === S.catSel); const f = c.fields[Number(el.dataset.i)]; if (!await confirmDlg('Eliminar campo', `El campo «${esc(f.label)}» dejará de mostrarse. Los datos ya guardados no se borran.`, 'Eliminar')) return; c.fields.splice(Number(el.dataset.i), 1); sRerender(); },
  fMove: el => { const a = draft().categories.find(x => x.id === S.catSel).fields, i = Number(el.dataset.i), j = i + Number(el.dataset.dir); [a[i], a[j]] = [a[j], a[i]]; sRerender(); },
  rackAdd: () => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; let n = L.racks.length + 1; const id = 'R' + newId().slice(-8); L.racks.push({id, name:'R' + n, x:0, z:3, rot:0, len:4, levels:4, planta: S.plantaSel || ''}); sRerender(); },
  rackDel: async el => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; const r = L.racks[Number(el.dataset.i)]; const n = Object.values(Store.items).filter(i => i.data.ubicacion === r.id).length; if (n && !await confirmDlg('Eliminar estantería', `La estantería ${esc(r.name)} tiene ${plural(n, 'registro')}. Quedarán sin ubicación en el mapa.`, 'Eliminar')) return; L.racks.splice(Number(el.dataset.i), 1); sRerender(); },
  zoneAdd: () => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; let n = L.zones.length + 1; const id = 'Z' + newId().slice(-8); L.zones.push({id, name:'Zona ' + n, x:0, z:0, w:5, d:4, color:'#475569', planta: S.plantaSel || ''}); sRerender(); },
  objAdd: () => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; const t = ($('#obj-type') || {}).value || 'pilar', T = OBJ_TYPES[t]; L.objects = L.objects || []; const n = L.objects.filter(o => o.type === t).length + 1; const pl = plantaOf(L, S.plantaSel); L.objects.push({id: 'O' + newId().slice(-8), type: t, name: t === 'pasillo' ? 'Pasillo ' + n : '', x: pl ? Number(pl.x) || 0 : 0, z: pl ? Number(pl.z) || 0 : 0, w: T.w, d: T.d, rot: 0, planta: S.plantaSel || ''}); sRerender(); },
  objDel: el => { (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout.objects.splice(Number(el.dataset.i), 1); sRerender(); },
  planDel: () => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; delete L.plan; sRerender(); },
  planFit: () => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; L.depth = Math.round(Number(L.width) / L.plan.ratio * 10) / 10; sRerender(); },
  shapeSet: el => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; const k = el.dataset.k; const pts = shapePreset(k, Number(L.width) || 30, Number(L.depth) || 20);
    if (pts) { L.shape = pts; L.shapeKind = k; } else { delete L.shape; delete L.shapeKind; }
    const ids = wallList(L).map(w => w.id); (L.doors || []).forEach(d => { if (!ids.includes(d.wall)) d.wall = ids[0]; }); sRerender(); },
  shapeIns: el => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; const i = Number(el.dataset.i), a = L.shape[i], b = L.shape[(i + 1) % L.shape.length]; L.shape.splice(i + 1, 0, [Math.round((a[0] + b[0])) / 2, Math.round((a[1] + b[1])) / 2]); L.shapeKind = 'custom'; sRerender(); },
  shapeDel: el => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; L.shape.splice(Number(el.dataset.i), 1); L.shapeKind = 'custom'; sRerender(); },
  plantaAdd: () => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; L.plantas = L.plantas || []; const id = 'P' + newId().slice(-8); L.plantas.push({id, nombre: L.plantas.length ? 'Altillo ' + (L.plantas.length + 1) : 'Altillo', altura: 3, x: 0, z: 0, w: 10, d: 6}); S.plantaSel = id; sRerender(); },
  plantaDel: async el => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; const p = L.plantas[Number(el.dataset.i)]; const n = [...L.racks, ...L.zones, ...(L.objects || [])].filter(x => x.planta === p.id).length;
    if (n && !await confirmDlg('Eliminar altillo', `«${esc(p.nombre)}» tiene ${plural(n, 'elemento')} (estanterías, zonas u otros). Pasarán a la planta baja.`, 'Eliminar')) return;
    [...L.racks, ...L.zones, ...(L.objects || [])].forEach(x => { if (x.planta === p.id) x.planta = ''; }); L.plantas.splice(Number(el.dataset.i), 1); if (S.plantaSel === p.id) S.plantaSel = ''; sRerender(); },
  plantaSel: el => { S.plantaSel = el.dataset.k; sRerender(); },
  doorAdd: () => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; L.doors = L.doors || []; L.doors.push({id: 'D' + newId().slice(-8), name: L.doors.length ? 'Puerta ' + (L.doors.length + 1) : 'Entrada', wall: isShaped(L) ? wallList(L)[0].id : 'S', pos: 0, width: 3}); sRerender(); },
  doorDel: el => { (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout.doors.splice(Number(el.dataset.i), 1); sRerender(); },
  zoneDel: el => { (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout.zones.splice(Number(el.dataset.i), 1); sRerender(); },
  roleAdd: () => { const n = $('#new-role').value.trim(); if (!n) return; const d = draft(); let k = slug(n); while (d.roles[k]) k += '_2'; d.roles[k] = {name:n, perms:['inv.view']}; sRerender(); },
  roleDel: el => { delete draft().roles[el.dataset.k]; sRerender(); },
  backup: () => doBackup(),
  wipe: async () => {
    const ids = Object.keys(Store.items); if (!ids.length) return toast('El inventario ya está vacío.', 'info');
    if (!await confirmDlg('Vaciar inventario', `Se eliminarán <b>${plural(ids.length, 'registro')}</b>. No se puede deshacer.`, 'Vaciar', true, 'VACIAR')) return;
    try { await Store.delMany(ids); Store.log('baja', `Inventario vaciado (${ids.length} registros)`); toast('Inventario vaciado.'); } catch (ex) { toast(ex.message, 'err'); }
  },
  userNew: () => openUserForm(), userEdit: el => openUserForm(el.dataset.id), userPw: el => openPwForm(el.dataset.id),
  userUnlock: async el => { try { await API('POST', `/api/users/${encodeURIComponent(el.dataset.id)}/unlock`); await Store.loadUsers(); toast('Usuario desbloqueado.'); } catch (ex) { toast(ex.message, 'err'); } },
  reload: () => location.reload(),
  userDel: async el => {
    const u = Store.users[el.dataset.id]; if (!u) return;
    if (u.role === 'admin' && admins().length <= 1) return toast('Debe quedar al menos un administrador activo.', 'warn');
    if (!await confirmDlg('Eliminar usuario', `Se eliminará la cuenta <b>${esc(u.username)}</b>. Su actividad seguirá en el registro.`, 'Eliminar')) return;
    try { await API('DELETE', '/api/users/' + encodeURIComponent(u.id)); await Store.loadUsers(); toast('Usuario eliminado.'); } catch (ex) { toast(ex.message, 'err'); }
  }
};
document.addEventListener('click', e => {
  const href = e.target.closest('[data-href]'); if (href && !e.target.closest('input')) { location.hash = href.dataset.href; return; }
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) { ACT[a.dataset.act](a, e); return; }
  const sortTh = e.target.closest('th[data-sort]');
  if (sortTh) { const k = sortTh.dataset.sort; S.sort = {k, d: S.sort.k === k ? -S.sort.d : 1}; renderTable(); return; }
  if (e.target.matches('[data-selall]')) { const rows = filteredItems().slice((S.page - 1) * S.perPage, S.page * S.perPage); rows.forEach(r => e.target.checked ? S.sel.add(r.id) : S.sel.delete(r.id)); renderTable(); return; }
  if (e.target.matches('[data-selrow]')) { const id = e.target.dataset.selrow; e.target.checked ? S.sel.add(id) : S.sel.delete(id); renderTable(); return; }
  if (e.target.closest('td.cb')) return;
  const tr = e.target.closest('tr[data-id]'); if (tr) { openDrawer(tr.dataset.id); return; }
  if (!e.target.closest('details.menu')) $$('details.menu[open]').forEach(d => d.removeAttribute('open'));
  if (!e.target.closest('.gsearch')) { const r = $('#gs-res'); r && r.classList.add('hide'); }
  if ($('#shell') && $('#shell').classList.contains('nav-open') && !e.target.closest('.side') && !e.target.closest('.burger')) $('#shell').classList.remove('nav-open');
});
let qTimer;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.bind !== undefined && S.sdraft) {
    let v = t.dataset.type === 'bool' ? t.checked : t.value; if (t.dataset.type === 'number') v = v === '' ? '' : Number(v);
    setPath(S.sdraft, t.dataset.bind, v);
    const sb = $('#savebar'); sb && sb.classList.toggle('hide', !dirty());
    if (S.stab === 'almacen') drawLayoutPreview();
    if (/^(company|brand\.)/.test(t.dataset.bind)) updateBrandPreview();
    { const m = /^combos\.(\d+)\.template$/.exec(t.dataset.bind); if (m) { const el = $('#combo-prev-' + m[1]); if (el) el.textContent = comboPreview(t.value); } }
    if (/^numeracion\./.test(t.dataset.bind)) { const np = $('#num-prev'); if (np) np.textContent = 'Ejemplo: ' + numPreview(S.sdraft); }
    if (t.dataset.bind === 'tema.primario') { applyTheme(t.value); const hx = $('#b-tema_hex'); if (hx && hx !== t) hx.value = t.value; }
    if (/^sedes\.\d+\.(nombre|cliente|ciudad)$/.test(t.dataset.bind)) {
      const sel = $('#b-albaran_defaultSedeId');
      if (sel) { const cur = S.sdraft.albaran.defaultSedeId; sel.innerHTML = '<option value="">— Ninguna —</option>' + (S.sdraft.sedes || []).filter(x => x.nombre).map(x => `<option value="${esc(x.id)}" ${cur === x.id ? 'selected' : ''}>${esc([x.cliente, sedeLabel(x)].filter(Boolean).join(' · '))}</option>`).join(''); }
    }
    if (t.tagName === 'SELECT' && /\.(type|list|cat|k)$/.test(t.dataset.bind)) { if (/stockRules\.\d+\.cat$/.test(t.dataset.bind)) getPath(S.sdraft, t.dataset.bind.replace(/\.cat$/, '')).conds = []; sRerender(); }
    else if (/^stockRules\.\d+\.(conds|min|active)/.test(t.dataset.bind) && S.stab === 'avisos') sRerender();
    return;
  }
  if (t.id === 'f-q') { clearTimeout(qTimer); qTimer = setTimeout(() => { S.f.q = t.value; S.page = 1; renderTable(); }, 120); return; }
  if (t.id === 'au-q') { S.auditQ = t.value; $('#audit-area').innerHTML = auditTableHTML(); return; }
  if (t.id === 'mv-serials') { mvCountUpdate(); return; }
  if (t.id === 'mv-out') { mvOutUpdate(); return; }
  if (t.id === 'tr-serials') { S.tr = S.tr || {}; S.tr.serials = t.value; return; }
  if (t.dataset.shape !== undefined) { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; L.shape[Number(t.dataset.shape)][Number(t.dataset.axis)] = Number(t.value) || 0; L.shapeKind = 'custom'; drawLayoutPreview(); const sb = $('#savebar'); sb && sb.classList.toggle('hide', !dirty()); return; }
  if (t.id === 'plan-op') { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; if (L.plan) L.plan.opacity = Number(t.value) / 100; const v = $('#plan-op-val'); if (v) v.textContent = t.value + ' %'; drawLayoutPreview(); const sb = $('#savebar'); sb && sb.classList.toggle('hide', !dirty()); return; }
  if (t.id === 'mv-dest') { const sel = $('#mv-sede'); if (sel) { sel.disabled = !!t.value.trim(); sel.title = t.value.trim() ? 'Se usará el destino escrito en «Otro destino»' : ''; } return; }
  if (t.dataset.mvb === 'qty') { const l = S.mvBulk[Number(t.dataset.i)]; if (l) l.qty = Math.max(1, Math.floor(Number(t.value) || 1)); return; }
  if (t.id === 'dl-q') { S.dlQ = t.value; const a = $('#dl-area'); if (a) { const tmp = document.createElement('div'); tmp.innerHTML = VIEWS.albaranes(); a.innerHTML = tmp.querySelector('#dl-area').innerHTML; } return; }
  if (t.id === 'map-q') { clearTimeout(qTimer); qTimer = setTimeout(() => mapLocate(t.value), 200); return; }
  if (t.id === 'gsearch') { gSearch(t.value); return; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.perm) { const r = draft().roles[t.dataset.role]; if (!Array.isArray(r.perms)) return; r.perms = t.checked ? [...new Set([...r.perms, t.dataset.perm])] : r.perms.filter(p => p !== t.dataset.perm); const sb = $('#savebar'); sb && sb.classList.toggle('hide', !dirty()); return; }
  if (t.dataset.bind !== undefined && S.sdraft && (t.type === 'checkbox' || t.tagName === 'SELECT')) { t.dispatchEvent(new Event('input', {bubbles:true})); return; }
  if (t.dataset.filter) { S.f[t.dataset.filter] = t.value; S.page = 1; S.sel.clear(); renderTable(); return; }
  if (t.dataset.audit) { S[t.dataset.audit] = t.value; $('#audit-area').innerHTML = auditTableHTML(); return; }
  if (t.id === 'mv-cat') { S.mvCat = t.value; renderMain(); return; }
  if (t.id === 'map-planta') { S.mapPlanta = t.value; Map3D.refresh(); renderMapSide(); return; }
  if (t.id === 'map-heat') { S.mapHeat = t.value; Map3D.applyHeat(); renderMapSide(); return; }
  if (t.id === 'map-client') { S.mapClient = t.value; Map3D.refresh(); renderMapSide(); return; }
  if (t.id === 'sede-filter') { S.sedeFilter = t.value; sRerender(); return; }
  if (['tr-cliente', 'tr-origen', 'tr-destino'].includes(t.id)) { const T = S.tr = S.tr || {}; T.serials = ($('#tr-serials') || {}).value || ''; T[t.id.slice(3)] = t.value; if (t.id !== 'tr-destino') T.bulk = []; renderMain(); return; }
  if (t.id === 'rt-cliente') { S.rt = S.rt || {}; S.rt.cliente = t.value; const keep = $('#rt-serials').value; renderMain(); $('#rt-serials').value = keep; return; }
  if (t.id === 'plan-file' && t.files[0]) { const f = t.files[0]; t.value = ''; toast('Procesando el plano…', 'info'); processPlan(f).then(r => { const L = (draft().almacenes.find(a => a.id === S.almSel) || draft().almacenes[0]).layout; L.plan = {image: r.url, opacity: (L.plan && L.plan.opacity) || 0.6, ratio: r.ratio}; sRerender(); toast('Plano cargado. Pulsa «Guardar cambios» para aplicarlo.', 'info'); }).catch(ex => toast(ex.message, 'err')); return; }
  if (/-(cliente|almacen)$/.test(t.id || '')) refreshLoc(t.id.replace(/-(cliente|almacen)$/, ''), t.closest('.layer') || document);
  if (t.id === 'alm-sel') { S.alm = t.value; LS.set('lbinv.alm', t.value); S.page = 1; S.sel.clear(); S.mapSel = null; renderNav(); renderTop(); renderMain(); return; }
  if (t.id === 'map-alm') { S.alm = t.value; LS.set('lbinv.alm', t.value); S.mapSel = null; S.mapClient = ''; renderNav(); renderTop(); Map3D.resetView(); Map3D.refresh(); renderMapSide(); return; }
  if (t.dataset.estlist) { const e = draft().estadosSistema; const k = t.dataset.estlist; e[k] = (e[k] || []).filter(x => x !== t.value); if (t.checked) e[k].push(t.value); const sb = $('#savebar'); sb && sb.classList.toggle('hide', !dirty()); return; }
  if (t.dataset.scopeAlm !== undefined || t.dataset.scopeCli !== undefined || t.name === 'scopemode' || t.name === 'role') { const root = t.closest('.modal'); if (root && root.querySelector('#uf-scope')) syncScopeUI(root); }
  if (t.dataset.colkey) {
    const all = allCols().map(c => c.key); let cur = tableCols().map(c => c.key);
    if (t.checked) cur.push(t.dataset.colkey); else cur = cur.filter(k => k !== t.dataset.colkey);
    if (!cur.length) { t.checked = true; return; }
    cur = all.filter(k => cur.includes(k));
    LS.set(colPrefKey(), cur); renderTable(); return;
  }
  if (t.dataset.mvb === 'sel') { const l = S.mvBulk[Number(t.dataset.i)]; l.itemId = t.value; const it = Store.items[t.value]; if (it && l.qty > qtyOf(it)) l.qty = qtyOf(it); renderBulk(); return; }
  if (t.id === 'mv-alb') { $('#mv-alb-box').classList.toggle('hide', !t.checked); const est = $('#mvout-estado'); if (t.checked && est && est.value === '__keep') est.value = EST().enviado; return; }
  if (t.id === 'brand-file' && t.files[0]) {
    processLogo(t.files[0]).then(r => { const d = draft(); d.brand = d.brand || {}; d.brand.logo = r.url; d.brand.mode = 'image'; sRerender(); toast(`Imagen cargada${r.trimmed ? ' y márgenes recortados' : ''}. Ajusta el tamaño y pulsa «Guardar cambios».`, 'info'); })
      .catch(ex => toast(ex.message, 'err')); t.value = ''; return;
  }
  if (t.id === 'restore-file' && t.files[0]) { doRestore(t.files[0]); t.value = ''; return; }
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $('#gsearch') && !layers.length) { e.preventDefault(); $('#gsearch').focus(); }
  if (e.key === 'Enter' && e.target.id === 'new-val') { e.preventDefault(); ACT.valAdd(); }
  if (e.key === 'Enter' && e.target.id === 'place-code') { e.preventDefault(); const v = e.target.value; e.target.value = ''; placeCode(v); }
  if (e.key === 'Enter' && e.target.id === 'pick-code') { e.preventDefault(); const v = e.target.value.trim(); if (v) { e.target.value = ''; pickCode(v); } }
  if (e.key === 'Enter' && e.target.id === 'gsearch') { const b = $('#gs-res button'); b && b.click(); }
  if (e.key === 'Enter' && e.target.closest && e.target.closest('.addval')) { e.preventDefault(); e.target.closest('.addval').querySelector('button').click(); }
});

/* ---------- Búsqueda global ---------- */
function gSearch(q) {
  const lq = parseLocQR(q);
  if (lq && rackById(lq.ubicacion)) { const a = almacenes().find(x => (x.layout.racks || []).some(r => r.id === lq.ubicacion)); if (a) { S.alm = a.id; LS.set('lbinv.alm', a.id); } S.mapSel = lq.ubicacion; const gi = $('#gsearch'); if (gi) gi.value = ''; const box = $('#gs-res'); if (box) box.classList.add('hide'); location.hash = '#/mapa'; if (Map3D.mounted) Map3D.select(lq.ubicacion, true); return; }
  const box = $('#gs-res'); if (!box) return;
  const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) { box.classList.add('hide'); return; }
  const res = Object.values(Store.items).map(i => {
    const t = norm(searchText(i)); if (!terms.every(x => t.includes(x))) return null;
    return {i, score: norm(i.data.serie) === terms.join(' ') ? 3 : norm(i.data.serie).startsWith(terms[0]) ? 2 : 1};
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);
  box.innerHTML = res.length ? res.map(({i}) => { const c = catById(i.cat); return `<button data-act="openItem" data-id="${i.id}"><span class="cdot" style="--c:${esc(c ? c.color : '#999')}"></span><span style="min-width:0;flex:1"><b class="serial">${esc(i.data.serie || itemTitle(i))}</b><span class="muted" style="display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(itemTitle(i))} · ${esc(i.data.cliente || '')} · ${esc(locName(i.data.ubicacion) || 'sin ubicación')}</span></span>${statusBadge(i.data.estado)}</button>`; }).join('')
    : `<div class="empty" style="padding:20px">Nada coincide con «${esc(q)}».</div>`;
  box.classList.remove('hide');
}

/* =========================================================
   Arranque
   ========================================================= */
(function boot() {
  const th = LS.get('lbinv.theme', null); if (th) document.documentElement.dataset.theme = th;
  Store.onChange = kinds => {
    if (kinds.has('settings') || kinds.has('all')) { applyTheme(S.sdraft && S.sdraft.tema ? S.sdraft.tema.primario : undefined); if (Store.settings) saveSplash(); }
    const onAuth = $('#login-form') || $('#setup-form') || $('#force-form');
    if (!$('#shell') || onAuth || kinds.has('all')) { renderApp(); return; }
    if (kinds.has('net')) { const lv = $('.dash-live'); if (lv) { lv.classList.toggle('on', Store.online); lv.lastChild.textContent = Store.online ? 'En directo' : 'Reconectando…'; } }
    if (kinds.size === 1 && kinds.has('net')) { renderNav(); return; }
    if (kinds.has('settings') && S.sdraft && !dirty()) S.sdraft = null;
    renderNav(); renderTop();
    if (S.view === 'ajustes' && S.sdraft && dirty() && kinds.size === 1 && kinds.has('settings')) return;
    renderMain(); if (S.drawerId) renderDrawer();
  };
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Auth.touch(), {passive:true}));
  setInterval(() => {
    if (!Auth.user) return;
    const idle = Date.now() - Auth.last, limit = ((Store.settings && Store.settings.sessionMinutes) || 30) * 60000;
    if (idle > limit) Auth.logout('Sesión cerrada por inactividad.');
  }, 15000);
  // Mantiene viva la sesión del servidor mientras haya actividad en la pantalla.
  setInterval(() => { if (Auth.user && Date.now() - Auth.last < 120000) API('GET', '/api/ping').catch(() => {}); }, 120000);
  renderApp();
  Store.init();
})();

function openAccountForm() {
  const u = Auth.user;
  const body = `<form id="af" style="display:flex;flex-direction:column;gap:14px" autocomplete="off">
    <p style="margin:0">Usuario: <b>${esc(u.username)}</b></p>
    <label class="f">Nombre completo <input class="inp" name="name" value="${esc(u.name)}" required></label>
    <label class="f">Correo <input class="inp" name="email" type="email" value="${esc(u.email || '')}" placeholder="nombre@laberit.com"><span class="help">Se usa para recuperar la contraseña y avisarte si se cambia.</span></label>
    <label class="f hide" id="af-cur">Contraseña actual <input class="inp" name="current" type="password" autocomplete="current-password"><span class="help">Necesaria para cambiar el correo.</span></label>
  </form><div id="af-err" class="err-msg hide" style="margin-top:14px"></div><div id="af-mfa" class="af-mfa"><p class="muted">Comprobando seguridad…</p></div>`;
  const L = openLayer(modalHTML('Mi cuenta', body, `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="af-ok">Guardar</button>`, 'narrow'));
  const f = $('#af', L.el), err = $('#af-err', L.el), btn = $('#af-ok', L.el);
  loadMfaSection($('#af-mfa', L.el));
  f.email.addEventListener('input', () => $('#af-cur', L.el).classList.toggle('hide', f.email.value.trim().toLowerCase() === String(u.email || '').toLowerCase()));
  btn.onclick = async () => {
    err.classList.add('hide'); btn.disabled = true;
    try {
      const r = await API('PUT', '/api/me', {name: f.name.value.trim(), email: f.email.value.trim(), current: f.current.value});
      Auth.user = r.user; await Store.loadUsers(); $('#top').dataset.uid = ''; renderTop();
      toast('Datos guardados.'); closeLayer(L);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); btn.disabled = false; }
  };
}
async function loadMailStatus() {
  const box = $('#mail-status'); if (!box) return;
  try {
    const m = await API('GET', '/api/mail/status');
    if (!$('#mail-status')) return;
    box.innerHTML = m.enabled
      ? `<p style="margin:0 0 10px"><span class="badge ok">Activo</span> Se envía desde <b>${esc(m.from)}</b> por ${esc(m.host)}. Los enlaces apuntan a <b>${esc(m.publicUrl)}</b>.</p>
         <button class="btn sm" data-act="mailTest">Enviarme un correo de prueba</button>`
      : `<p style="margin:0"><span class="badge warn">Desactivado</span> Para activar la recuperación de contraseña por correo, añade en el archivo <b>.env</b> del servidor: ${m.missing.map(x => `<b>${esc(x)}</b>`).join(', ')} (y SMTP_USER y SMTP_PASS si tu servidor de correo pide autenticación). Después reinicia el servicio.</p>`;
  } catch (ex) { box.textContent = ex.message; }
}

/* =========================================================
   Lector con la cámara del móvil
   ========================================================= */
const scanBtn = (target, multi, title) => `<button type="button" class="btn icon scan-btn" data-act="scan" data-target="${target}" data-multi="${multi ? 1 : 0}" ${title ? `data-title="${esc(title)}"` : ''} title="Escanear con la cámara" aria-label="Escanear con la cámara">${ico('camera')}</button>`;
function cleanScan(code) { if (/^LBR\|/.test(code)) { const p = code.split('|'); return p[2] || code; } return code; }
let audioCtx;
function beep(ok = true) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = ok ? 1250 : 320; g.gain.value = 0.08; o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + (ok ? 0.08 : 0.25));
  } catch {}
}
const Scanner = {
  inst: null, L: null,
  supported() { return window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia; },
  open(opts) {
    if (this.supported() && !window.Html5Qrcode) { loadVendor('vendor/html5-qrcode.min.js').then(() => this.open(opts)).catch(() => toast('No se ha podido cargar el lector de la cámara.', 'err')); return; }
    const {multi = false, title = 'Escanear código', onCode} = opts;
    if (!this.supported()) {
      openLayer(modalHTML('Cámara no disponible', `<p style="margin-top:0">${!window.isSecureContext
        ? 'El navegador solo permite usar la cámara en páginas seguras (<b>https://</b>). Ahora mismo la aplicación se abre por <b>http://</b>.</p><p>Pide que configuren HTTPS en el servidor (instrucciones en el README, apartado HTTPS). Mientras tanto puedes seguir usando un lector USB o Bluetooth.'
        : 'Este navegador no permite acceder a la cámara. Prueba con Chrome, Edge o Safari actualizados.'}</p>`,
        '<button class="btn primary" data-close>Entendido</button>', 'narrow'));
      return;
    }
    this.count = 0; this.seen = new Map();
    const L = openLayer(modalHTML(title, `<div id="qr-reader" class="qr-reader"></div>
      <p class="help" id="qr-msg" style="margin:10px 0 0">Apunta al código de barras o al QR de la etiqueta.</p>${multi ? '<div class="scan-list" id="scan-list"></div>' : ''}`,
      `<button class="btn primary" data-close>${multi ? 'Terminar' : 'Cancelar'}</button>`, 'narrow'), {onClose: () => this.stop()});
    this.L = L;
    const F = window.Html5QrcodeSupportedFormats;
    try {
      this.inst = new Html5Qrcode('qr-reader', {verbose: false, formatsToSupport: [F.QR_CODE, F.CODE_128, F.CODE_39, F.CODE_93, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.ITF, F.DATA_MATRIX], experimentalFeatures: {useBarCodeDetectorIfSupported: true}});
      this.inst.start({facingMode: 'environment'}, {fps: 12, qrbox: (w, h) => ({width: Math.floor(Math.min(w * 0.9, 420)), height: Math.floor(Math.min(h * 0.55, 220))})},
        text => this.hit(text, multi, onCode), () => {})
        .catch(err => { const m = $('#qr-msg'); if (m) m.innerHTML = `<span style="color:var(--red-ink)">No se ha podido abrir la cámara (${esc((err && err.message) || err)}). Revisa que el navegador tenga permiso para usarla.</span>`; });
    } catch (err) { const m = $('#qr-msg'); if (m) m.textContent = 'No se ha podido iniciar el lector: ' + err.message; }
  },
  hit(text, multi, onCode) {
    const code = String(text).trim(); const now = Date.now();
    if ((this.seen.get(code) || 0) > now - 2500) return;
    this.seen.set(code, now);
    try { navigator.vibrate && navigator.vibrate(60); } catch {}
    beep();
    Promise.resolve(onCode(code)).catch(() => {});
    if (!multi) { closeLayer(this.L); return; }
    this.count++;
    const list = $('#scan-list'); if (list) list.insertAdjacentHTML('afterbegin', `<div><span class="serial">${esc(cleanScan(code))}</span></div>`);
    const m = $('#qr-msg'); if (m) m.textContent = `${this.count} ${this.count === 1 ? 'código leído' : 'códigos leídos'}. Sigue escaneando o pulsa Terminar.`;
  },
  stop() { const i = this.inst; this.inst = null; if (i) { try { i.stop().then(() => i.clear()).catch(() => {}); } catch {} } }
};

/* =========================================================
   Verificación en dos pasos
   ========================================================= */
function showMfaLogin(r) {
  const app = $('#app');
  const tmp = document.createElement('div'); tmp.innerHTML = authHTML('login');
  const art = tmp.querySelector('.auth-art').outerHTML;
  app.innerHTML = `<div class="auth">${art}<div class="auth-form"><form id="mfa-form" autocomplete="off">
    <h2>Verificación en dos pasos</h2>
    <p class="muted" style="margin:-8px 0 0" id="mfa-help">Abre la aplicación de autenticación del móvil y escribe el código de 6 dígitos.</p>
    <div id="au-err" class="err-msg hide"></div>
    <label class="f"><span id="mfa-label">Código de verificación</span><input class="inp mfa-input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required autofocus></label>
    ${r.rememberDays > 0 ? `<label class="chk"><input type="checkbox" name="remember" checked>No volver a pedirlo en este equipo durante ${r.rememberDays} días</label>` : ''}
    <button class="btn primary" style="height:42px">Verificar</button>
    <button type="button" class="btn ghost" id="mfa-alt">Usar un código de recuperación</button>
    <button type="button" class="btn ghost" data-act="backToLogin">Volver</button>
  </form></div></div>`;
  const form = $('#mfa-form'), err = $('#au-err'); let recovery = false;
  $('#mfa-alt').onclick = () => {
    recovery = !recovery;
    form.code.value = ''; form.code.maxLength = recovery ? 12 : 6; form.code.inputMode = recovery ? 'text' : 'numeric';
    $('#mfa-label').textContent = recovery ? 'Código de recuperación' : 'Código de verificación';
    $('#mfa-help').textContent = recovery ? 'Escribe uno de los códigos de recuperación que guardaste al activar la verificación (formato XXXX-XXXX). Cada código sirve una sola vez.' : 'Abre la aplicación de autenticación del móvil y escribe el código de 6 dígitos.';
    $('#mfa-alt').textContent = recovery ? 'Usar el código de la aplicación' : 'Usar un código de recuperación';
    form.code.focus();
  };
  form.code.addEventListener('input', () => { if (!recovery && /^\d{6}$/.test(form.code.value)) form.requestSubmit(); });
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.classList.add('hide');
    const btn = form.querySelector('button.primary'); btn.disabled = true; btn.textContent = 'Comprobando…';
    try {
      const res = await API('POST', '/api/login/mfa', {challenge: r.challenge, code: form.code.value, remember: !!(form.remember && form.remember.checked)});
      Auth.user = res.user; Auth.touch();
      if (!res.user.mustChange && !res.user.mfaEnroll) await Store.loadAll();
      $('#app').innerHTML = ''; renderApp();
      if (res.recoveryLeft !== undefined) toast(`Has usado un código de recuperación. Te quedan ${res.recoveryLeft}.${res.recoveryLeft <= 3 ? ' Genera códigos nuevos en «Mi cuenta».' : ''}`, 'warn', 8000);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); btn.disabled = false; btn.textContent = 'Verificar'; form.code.select(); if (/caducado|Vuelve a iniciar/.test(ex.message)) setTimeout(() => ACT.backToLogin(), 2500); }
  });
}
function codesHTML(codes) {
  return `<p style="margin-top:0">Guarda estos <b>códigos de recuperación</b> en un lugar seguro (por ejemplo, en vuestro gestor de contraseñas). Si pierdes el móvil, cada código te permite entrar una vez. No se volverán a mostrar.</p>
    <div class="codes">${codes.map(c => `<span class="serial">${esc(c)}</span>`).join('')}</div>
    <div class="row" style="margin-top:14px"><button type="button" class="btn sm" data-act="codesDownload">${ico('down')}Descargar como archivo</button></div>`;
}
function downloadCodes(codes) {
  saveFile(`codigos-recuperacion-${Auth.user.username}.txt`, `Códigos de recuperación - Almacén ${Store.settings.company}\nUsuario: ${Auth.user.username}\nGenerados: ${new Date().toLocaleString('es-ES')}\n\nCada código sirve una sola vez.\n\n${codes.join('\n')}\n`, 'text/plain');
}
// Pinta el asistente de activación dentro de "root" y llama a onDone cuando termina.
async function mfaEnrollFlow(root, onDone) {
  root.innerHTML = '<p class="muted">Preparando…</p>';
  let setup;
  try { setup = await API('POST', '/api/me/mfa/setup'); } catch (ex) { root.innerHTML = `<div class="err-msg">${esc(ex.message)}</div>`; return; }
  const days = Store.settings.mfaRememberDays || 0;
  root.innerHTML = `<ol class="mfa-steps">
      <li>Instala en el móvil <b>Microsoft Authenticator</b>, <b>Google Authenticator</b> o cualquier aplicación compatible.</li>
      <li>En la aplicación, añade una cuenta y escanea este código:
        <div class="mfa-qr"><div class="qr" id="mfa-qr"></div><div><span class="help">¿No puedes escanearlo? Escribe esta clave:</span><div class="serial mfa-secret">${esc(setup.secret.replace(/(.{4})/g, '$1 ').trim())}</div></div></div></li>
      <li>Escribe el código de 6 dígitos que muestra la aplicación:
        <div class="row" style="margin-top:8px"><input class="inp mfa-input" id="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="max-width:200px">
        <button type="button" class="btn primary" id="mfa-enable">Activar</button></div>
        ${days > 0 ? `<label class="chk" style="margin-top:10px"><input type="checkbox" id="mfa-remember" checked>Recordar este equipo durante ${days} días</label>` : ''}
        <div id="mfa-err" class="err-msg hide" style="margin-top:10px"></div></li></ol>`;
  qrInto($('#mfa-qr', root), setup.uri, 176);
  const go = async () => {
    const btn = $('#mfa-enable', root), err = $('#mfa-err', root); err.classList.add('hide'); btn.disabled = true;
    try {
      const r = await API('POST', '/api/me/mfa/enable', {code: $('#mfa-code', root).value, remember: !!($('#mfa-remember', root) && $('#mfa-remember', root).checked)});
      Auth.user = r.user; Auth._codes = r.codes;
      root.innerHTML = codesHTML(r.codes) + `<div class="row" style="margin-top:18px"><span class="spacer"></span><button type="button" class="btn primary" id="mfa-done">He guardado los códigos</button></div>`;
      $('#mfa-done', root).onclick = () => onDone && onDone();
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); btn.disabled = false; $('#mfa-code', root).select(); }
  };
  $('#mfa-enable', root).onclick = go;
  $('#mfa-code', root).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  $('#mfa-code', root).addEventListener('input', e => { if (/^\d{6}$/.test(e.target.value)) go(); });
  setTimeout(() => $('#mfa-code', root) && $('#mfa-code', root).focus(), 50);
}
function showEnroll() {
  const app = $('#app');
  const tmp = document.createElement('div'); tmp.innerHTML = authHTML('login');
  const art = tmp.querySelector('.auth-art').outerHTML;
  app.innerHTML = `<div class="auth">${art}<div class="auth-form"><div id="enroll-box" style="width:min(460px,100%);display:flex;flex-direction:column;gap:14px">
    <h2>Activa la verificación en dos pasos</h2><p class="muted" style="margin:-6px 0 0">Para entrar al almacén, tu cuenta necesita un segundo factor además de la contraseña.</p>
    <div id="enroll-flow"></div><button type="button" class="btn ghost" data-act="logout">Salir</button></div></div></div>`;
  mfaEnrollFlow($('#enroll-flow'), async () => { await Store.loadAll(); $('#app').innerHTML = ''; renderApp(); toast('Verificación en dos pasos activada.'); });
}
async function loadMfaSection(box) {
  if (!box) return;
  try {
    const m = await API('GET', '/api/me/mfa');
    const reqd = m.required === 'all' || (m.required === 'admins' && Auth.user.role === 'admin');
    box.innerHTML = `<h3 style="margin:0 0 8px">Verificación en dos pasos</h3>
      ${m.enabled ? `<p style="margin:0 0 10px"><span class="badge ok">Activada</span> Te quedan ${m.recoveryLeft} códigos de recuperación.${m.devices.length ? ` Equipos recordados: ${m.devices.length}.` : ''}</p>
        <div class="row"><button type="button" class="btn sm" data-act="mfaRecovery">Nuevos códigos de recuperación</button>${m.devices.length ? '<button type="button" class="btn sm" data-act="mfaForget">Olvidar equipos recordados</button>' : ''}${reqd ? '' : '<button type="button" class="btn sm danger" data-act="mfaDisable">Desactivar</button>'}</div>`
      : `<p style="margin:0 0 10px"><span class="badge warn">Desactivada</span> Protege tu cuenta pidiendo un código del móvil al iniciar sesión.</p><button type="button" class="btn sm primary" data-act="mfaStart">${ico('shield')}Activar</button>`}`;
  } catch (ex) { box.textContent = ex.message; }
}

/* =========================================================
   Pedidos
   ========================================================= */
const ORDER_STATUS = {borrador:['Borrador', ''], preparacion:['En preparación', 'warn'], enviado:['Enviado', 'ok'], cancelado:['Cancelado', 'out']};
const orderBadge = s => { const [l, c] = ORDER_STATUS[s] || [s, '']; return `<span class="badge ${c}">${esc(l)}</span>`; };
const sedeLabel = s => s && (s.nombre || s.ciudad) ? [s.nombre, s.ciudad].filter(Boolean).join(', ') : '';
const pdfUrl = id => '/api/deliveries/' + encodeURIComponent(id) + '/pdf';
const LINE_KEYS = ['tipo', 'marca', 'modelo', 'pulgadas', 'puertos', 'condicion', 'pais'];
function lineAvailable(line, cliente, excludeOrder) {
  return Object.values(Store.items).filter(it => it.cat === line.cat && isStock(it.data.estado) && !it.data.pedido && (!cliente || !it.data.cliente || it.data.cliente === cliente)
    && Object.entries(line.f || {}).every(([k, v]) => !v || norm(it.data[k]) === norm(v))).reduce((s, it) => s + qtyOf(it), 0);
}
function loadOrderDetail(id, force) {
  if (!force && S.orderLoading === id) return;
  S.orderLoading = id;
  API('GET', '/api/orders/' + encodeURIComponent(id)).then(o => { S.orderDetail = o; S.orderLoading = null; if (S.view === 'pedidos' && S.orderId === id) renderMain(); })
    .catch(ex => { S.orderLoading = null; S.orderDetail = {id, error: ex.message}; if (S.view === 'pedidos') renderMain(); });
}
VIEWS.pedidos = () => {
  if (S.orderId) return orderDetailHTML();
  const tab = S.orderTab || 'activos';
  const all = Store.orders || [];
  const list = all.filter(o => tab === 'todos' || (tab === 'activos' ? ['borrador', 'preparacion'].includes(o.status) : tab === 'enviados' ? o.status === 'enviado' : o.status === 'cancelado'));
  const cnt = t => all.filter(o => t === 'todos' || (t === 'activos' ? ['borrador', 'preparacion'].includes(o.status) : t === 'enviados' ? o.status === 'enviado' : o.status === 'cancelado')).length;
  return `<div class="page-head"><div><h1>Pedidos</h1><p>Reserva el material de un pedido, prepáralo con la lista de recogida y envíalo con su albarán.</p></div>
    ${Auth.can('inv.move') ? `<button class="btn primary" data-act="orderNew">${ico('plus')}Nuevo pedido</button>` : ''}</div>
    <div class="tabs">${[['activos', 'Activos'], ['enviados', 'Enviados'], ['cancelados', 'Cancelados'], ['todos', 'Todos']].map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="orderTab" data-k="${k}">${l}<span class="c">${cnt(k)}</span></button>`).join('')}</div>
    <section class="panel">${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pedido</th><th>Cliente</th><th>Destino</th><th>Fecha prevista</th><th>Estado</th><th>Progreso</th><th>Creado</th></tr></thead><tbody>
      ${list.map(o => `<tr data-href="#/pedidos/${esc(o.id)}"><td><b class="serial">${esc(o.number)}</b></td><td>${esc(o.cliente)}</td><td>${esc(sedeLabel(o.sede)) || '<span class="muted">—</span>'}</td><td>${o.dueDate ? fmtDate(o.dueDate) : '<span class="muted">—</span>'}</td><td>${orderBadge(o.status)}</td>
        <td><div class="prog"><div class="bar"><i style="width:${o.qty ? Math.min(100, o.reserved / o.qty * 100) : 0}%" class="b2"></i></div><span class="help">${o.reserved}/${o.qty} reservadas · ${o.picked} recogidas</span></div></td><td class="muted">${fmtDT(o.createdAt)}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty"><h3>${all.length ? 'No hay pedidos en esta pestaña' : 'Todavía no hay pedidos'}</h3><p>Crea un pedido indicando el cliente, la sede y qué material necesita.</p></div>`}</section>`;
};
function orderDetailHTML() {
  const o = S.orderDetail;
  if (!o || o.id !== S.orderId) { loadOrderDetail(S.orderId); return '<div class="empty"><h3>Cargando pedido…</h3></div>'; }
  if (o.error) return `<div class="empty"><h3>No se puede abrir el pedido</h3><p>${esc(o.error)}</p><a class="btn" href="#/pedidos">Volver a pedidos</a></div>`;
  const mv = Auth.can('inv.move');
  const qty = o.lines.reduce((s, l) => s + l.qty, 0), res = o.lines.reduce((s, l) => s + l.reserved, 0);
  const picked = o.items.filter(x => x.picked).reduce((s, x) => s + x.qty, 0), units = o.items.reduce((s, x) => s + x.qty, 0);
  const missing = qty - res;
  const acts = [];
  if (mv && ['borrador', 'preparacion'].includes(o.status)) acts.push(`<button class="btn" data-act="orderEdit">${ico('edit')}Editar</button>`);
  if (mv && ['borrador', 'preparacion'].includes(o.status) && missing > 0) acts.push(`<button class="btn ${o.status === 'borrador' ? 'primary' : ''}" data-act="orderReserve">${ico('box')}${o.status === 'borrador' ? 'Reservar stock' : 'Reservar lo que falta'}</button>`);
  if (o.items.length && Auth.can('map.view') && o.status === 'preparacion') acts.push(`<button class="btn" data-act="routeShow" data-id="${esc(o.id)}">${ico('cube')}Ruta en el mapa</button>`);
  if (o.items.length) acts.push(`<a class="btn" href="/api/orders/${esc(o.id)}/picking.pdf" target="_blank" rel="noopener" data-act="noop">${ico('file')}Lista de recogida</a>`);
  if (mv && o.status === 'preparacion') acts.push(`<button class="btn primary" data-act="orderShip">${ico('truck')}Enviar y generar albarán</button>`);
  if (o.status === 'enviado' && o.deliveryId) acts.push(`<a class="btn primary" href="${pdfUrl(o.deliveryId)}" target="_blank" rel="noopener" data-act="noop">${ico('file')}Ver albarán</a>`);
  const menu = [];
  if (mv && o.status === 'preparacion') menu.push(`<button data-act="orderRelease">${ico('reset')}Liberar reservas</button>`);
  if (mv && ['borrador', 'preparacion'].includes(o.status)) menu.push(`<button data-act="orderCancel">${ico('x')}Cancelar pedido</button>`);
  if (mv && ['borrador', 'cancelado'].includes(o.status) && !o.items.length) menu.push(`<button data-act="orderDelete">${ico('trash')}Eliminar</button>`);
  const groups = {};
  o.items.forEach(x => { const k = x.missing ? 'Desaparecido' : (locName(x.ubicacion) || 'Sin ubicación'); (groups[k] = groups[k] || []).push(x); });
  const gkeys = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'es', {numeric: true}));
  return `<a href="#/pedidos" class="muted" style="text-decoration:none;font-weight:600">← Pedidos</a>
    <div class="page-head" style="margin-top:8px"><div><h1 class="row" style="gap:12px">Pedido <span class="serial">${esc(o.number)}</span> ${orderBadge(o.status)}</h1>
      <p><b>${esc(o.cliente)}</b>${sedeLabel(o.sede) ? ' · ' + esc(sedeLabel(o.sede)) : ''}${o.dueDate ? ' · Fecha prevista ' + fmtDate(o.dueDate) : ''}</p>${o.notes ? `<p style="white-space:pre-wrap">${esc(o.notes)}</p>` : ''}</div>
      <div class="row">${acts.join('')}${menu.length ? `<details class="menu"><summary class="btn icon" aria-label="Más acciones">⋯</summary><div class="pop">${menu.join('')}</div></details>` : ''}</div></div>
    <div class="grid2">
      <section class="panel"><div class="panel-h"><h3>Líneas del pedido</h3>${missing > 0 && o.status !== 'borrador' ? `<span class="badge red">Faltan ${missing}</span>` : ''}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Material</th><th style="text-align:right">Pedido</th><th style="text-align:right">Reservado</th><th style="text-align:right">Recogido</th></tr></thead><tbody>
        ${o.lines.map(l => `<tr style="cursor:default"><td style="white-space:normal">${esc(l.text)}${l.note ? `<div class="help">${esc(l.note)}</div>` : ''}</td><td class="num" style="text-align:right">${l.qty}</td><td class="num" style="text-align:right;${l.reserved < l.qty && o.status !== 'borrador' ? 'color:var(--red-ink);font-weight:700' : ''}">${l.reserved}</td><td class="num" style="text-align:right">${l.picked}</td></tr>`).join('')}
        </tbody></table></div></section>
      <section class="panel"><div class="panel-h"><h3>Recogida</h3><span class="badge ${units && picked === units ? 'ok' : ''}">${picked}/${units} confirmadas</span></div><div class="panel-b">
        <div class="bar" style="height:12px;margin-bottom:14px"><i style="width:${units ? picked / units * 100 : 0}%;background:var(--ok)"></i></div>
        ${o.status === 'preparacion' && mv ? `<label class="f">Escanea cada equipo al cogerlo de la estantería<span class="selwrap"><input class="inp serial" id="pick-code" placeholder="Número de serie o QR de la etiqueta" autocomplete="off">${scanBtn('pick', true, 'Recogida del pedido ' + o.number)}</span></label>
          <p class="help" style="margin:8px 0 0">Si escaneas otro equipo igual que esté en stock, sustituye automáticamente a uno reservado pendiente.</p>`
          : o.status === 'borrador' ? '<p class="muted" style="margin:0">Reserva stock para empezar a preparar el pedido.</p>' : o.status === 'enviado' ? `<p style="margin:0">Enviado el ${fmtDT(o.shippedAt)}.</p>` : '<p class="muted" style="margin:0">Pedido cancelado.</p>'}
      </div></section>
    </div>
    ${o.items.length ? `<section class="panel" style="margin-top:18px"><div class="panel-h"><h3>Unidades reservadas por ubicación</h3><span class="help">Ordenadas para recorrer el almacén</span></div>
      ${gkeys.map(g => `<div class="pick-group"><h4>${esc(g)}</h4>${groups[g].sort((a, b) => (Number(a.nivel) || 0) - (Number(b.nivel) || 0) || String(a.serie).localeCompare(String(b.serie))).map(x => `
        <label class="pick-row ${x.picked ? 'done' : ''}"><input type="checkbox" data-act="pickToggle" data-id="${esc(x.itemId)}" ${x.picked ? 'checked' : ''} ${o.status !== 'preparacion' || !mv ? 'disabled' : ''}>
          <span class="pick-lvl">${x.nivel ? 'Balda ' + esc(x.nivel) + (Number(x.hueco) > 0 ? '-' + esc(x.hueco) : '') : '—'}</span><span class="serial">${esc(x.serie || '—')}</span><span class="muted pick-desc">${esc(x.title || '')}</span><span class="num" style="margin-left:auto">${x.qty} ud${x.qty === 1 ? '' : 's'}.</span></label>`).join('')}</div>`).join('')}
    </section>` : ''}`;
}
async function pickCode(code) {
  const o = S.orderDetail; if (!o) return;
  try {
    const r = await API('POST', `/api/orders/${encodeURIComponent(o.id)}/pick`, {code});
    S.orderDetail = r.order; renderMain(); toast(r.message || 'Confirmado.', r.swapped ? 'info' : 'ok');
  } catch (ex) { beep(false); toast(ex.message, 'err', 5000); }
}
function openOrderForm(o) {
  const clientes = listOf('clientes');
  const st = {almacen: o ? o.almacen || '' : '', cliente: o ? o.cliente : (clientes[0] || ''), sedeId: o && o.sede ? o.sede.id || (o.sede.nombre ? '__otra' : '') : '', sede: o ? clone(o.sede || {}) : {}, dueDate: o ? o.dueDate : '', notes: o ? o.notes : '',
    lines: o ? o.lines.map(l => ({cat: l.cat, qty: l.qty, f: clone(l.f || {}), note: l.note || ''})) : [{cat: (cats()[0] || {}).id, qty: 1, f: {}, note: ''}]};
  const sedes = () => (Store.settings.sedes || []).filter(s => !st.cliente || !s.cliente || s.cliente === st.cliente);
  const L = openLayer(modalHTML(o ? `Editar pedido ${o.number}` : 'Nuevo pedido', `<div id="of-body"></div><div id="of-err" class="err-msg hide" style="margin-top:14px"></div>`,
    `<button class="btn" data-close>Cancelar</button>${o ? '' : '<button class="btn" data-of="save">Guardar como borrador</button>'}<button class="btn primary" data-of="${o ? 'save' : 'reserve'}">${o ? 'Guardar cambios' : 'Crear y reservar stock'}</button>`));
  const body = $('#of-body', L.el);
  const lineHTML = (l, i) => {
    const c = catById(l.cat); const keys = c ? LINE_KEYS.filter(k => fieldOf(c, k)) : [];
    const pool = Object.values(Store.items).filter(it => it.cat === l.cat && isStock(it.data.estado) && !it.data.pedido);
    const opts = k => { const vals = [...new Set(pool.map(it => it.data[k]).filter(v => v !== undefined && v !== '' && v !== null).map(String))].sort((a, b) => a.localeCompare(b, 'es', {numeric: true})); if (l.f[k] && !vals.includes(l.f[k])) vals.unshift(l.f[k]); return vals; };
    return `<div class="of-line" data-i="${i}">
      <div class="of-line-top"><select class="sel sm" data-ofl="cat">${cats().map(x => `<option value="${esc(x.id)}" ${x.id === l.cat ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <label class="row" style="gap:6px;font-size:13px;font-weight:600">Cantidad <input class="inp sm" type="number" min="1" step="1" data-ofl="qty" value="${l.qty}" style="width:90px"></label>
        <span class="help of-avail"></span><span class="spacer"></span>${st.lines.length > 1 ? `<button type="button" class="btn sm icon ghost" data-of="lineDel" aria-label="Quitar línea">${ico('trash')}</button>` : ''}</div>
      ${keys.length ? `<div class="of-filters">${keys.map(k => `<label class="f"><span>${esc(fieldOf(c, k).label)}</span><select class="sel sm" data-ofk="${k}"><option value="">Cualquiera</option>${opts(k).map(v => `<option ${l.f[k] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
      <input class="inp sm" data-ofl="note" placeholder="Nota de la línea (opcional)" value="${esc(l.note)}" style="margin-top:8px"></div>`;
  };
  const render = () => {
    const sl = sedes();
    body.innerHTML = `<div class="fgrid">
      <label class="f">Cliente <span class="req">*</span><select class="sel" data-ofs="cliente">${(st.cliente && !clientes.includes(st.cliente) ? [st.cliente] : []).concat(clientes).map(c => `<option ${c === st.cliente ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      ${almsOfClient(st.cliente).length > 1 ? `<label class="f">Preparar desde<select class="sel" data-ofs="almacen">${almsOfClient(st.cliente).map(a => `<option value="${esc(a.id)}" ${(st.almacen || almOfClient(st.cliente)) === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>` : ''}
      <label class="f">Sede de destino<select class="sel" data-ofs="sedeId"><option value="">— Sin sede —</option>${sl.map(s => `<option value="${esc(s.id)}" ${st.sedeId === s.id ? 'selected' : ''}>${esc(sedeLabel(s))}</option>`).join('')}<option value="__otra" ${st.sedeId === '__otra' ? 'selected' : ''}>Otra dirección…</option></select>
        ${!sl.length ? `<span class="help">No hay sedes para este cliente.${Auth.can('settings.manage') ? ' Puedes añadirlas en Ajustes → Clientes y albaranes.' : ''}</span>` : ''}</label>
      <label class="f">Fecha prevista<input class="inp" type="date" data-ofs="dueDate" value="${esc(st.dueDate)}"></label>
      ${st.sedeId === '__otra' ? `<label class="f">Nombre del destino<input class="inp" data-ofo="nombre" value="${esc(st.sede.nombre || '')}"></label><label class="f wide">Dirección<input class="inp" data-ofo="direccion" value="${esc(st.sede.direccion || '')}"></label>
        <label class="f">CP<input class="inp" data-ofo="cp" value="${esc(st.sede.cp || '')}"></label><label class="f">Población<input class="inp" data-ofo="ciudad" value="${esc(st.sede.ciudad || '')}"></label>
        <label class="f">Contacto<input class="inp" data-ofo="contacto" value="${esc(st.sede.contacto || '')}"></label><label class="f">Teléfono<input class="inp" data-ofo="telefono" value="${esc(st.sede.telefono || '')}"></label>` : ''}
      <label class="f wide">Notas<textarea class="ta" rows="2" data-ofs="notes" placeholder="Instrucciones para la preparación o el transporte">${esc(st.notes)}</textarea></label></div>
      <h3 style="margin:20px 0 10px">Material</h3><div id="of-lines">${st.lines.map(lineHTML).join('')}</div>
      <button type="button" class="btn sm" data-of="lineAdd" style="margin-top:10px">${ico('plus')}Añadir línea</button>`;
    updAvail();
  };
  const updAvail = () => $$('.of-line', body).forEach(el => {
    const l = st.lines[Number(el.dataset.i)]; const n = lineAvailable(l, st.cliente);
    el.querySelector('.of-avail').innerHTML = `${n} disponible${n === 1 ? '' : 's'} en stock${n < l.qty ? ' · <span style="color:var(--red-ink);font-weight:600">no hay suficientes</span>' : ''}`;
  });
  body.addEventListener('change', e => {
    const t = e.target, row = t.closest('.of-line'), l = row ? st.lines[Number(row.dataset.i)] : null;
    if (t.dataset.ofs) { st[t.dataset.ofs] = t.value; if (t.dataset.ofs === 'cliente') { if (st.sedeId && st.sedeId !== '__otra' && !sedes().some(s => s.id === st.sedeId)) st.sedeId = ''; render(); } else if (t.dataset.ofs === 'sedeId') render(); else updAvail(); }
    if (l && t.dataset.ofl === 'cat') { l.cat = t.value; l.f = {}; render(); }
    if (l && t.dataset.ofk) { if (t.value) l.f[t.dataset.ofk] = t.value; else delete l.f[t.dataset.ofk]; updAvail(); }
  });
  body.addEventListener('input', e => {
    const t = e.target, row = t.closest('.of-line'), l = row ? st.lines[Number(row.dataset.i)] : null;
    if (l && t.dataset.ofl === 'qty') { l.qty = Math.max(1, Math.floor(Number(t.value) || 1)); updAvail(); }
    if (l && t.dataset.ofl === 'note') l.note = t.value;
    if (t.dataset.ofs === 'notes' || t.dataset.ofs === 'dueDate') st[t.dataset.ofs] = t.value;
    if (t.dataset.ofo) st.sede[t.dataset.ofo] = t.value;
  });
  L.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-of]'); if (!b) return;
    const act = b.dataset.of;
    if (act === 'lineAdd') { st.lines.push({cat: (st.lines[st.lines.length - 1] || {}).cat || cats()[0].id, qty: 1, f: {}, note: ''}); render(); return; }
    if (act === 'lineDel') { st.lines.splice(Number(b.closest('.of-line').dataset.i), 1); render(); return; }
    const err = $('#of-err', L.el); err.classList.add('hide');
    if (!st.cliente) { err.textContent = 'Indica el cliente.'; err.classList.remove('hide'); return; }
    $$('[data-of]', L.el).forEach(x => { if (x.tagName === 'BUTTON' && x.closest('.modal-f')) x.disabled = true; });
    try {
      const payload = {id: o ? o.id : undefined, almacen: almsOfClient(st.cliente).some(a => a.id === st.almacen) ? st.almacen : '', cliente: st.cliente, sedeId: st.sedeId === '__otra' ? '' : st.sedeId, sede: st.sedeId === '__otra' ? st.sede : {}, dueDate: st.dueDate, notes: st.notes, lines: st.lines};
      let saved = await API('POST', '/api/orders', payload);
      if (act === 'reserve') {
        const r = await API('POST', `/api/orders/${encodeURIComponent(saved.id)}/reserve`);
        saved = r.order;
        if (r.shortages.length) toast(`Reservado lo disponible. Faltan: ${r.shortages.map(s => `${s.missing} × ${s.text}`).join('; ')}.`, 'warn', 9000);
        else toast('Pedido creado y stock reservado.');
      } else toast(o ? 'Pedido guardado.' : `Pedido ${saved.number} creado.`);
      S.orderDetail = saved; closeLayer(L); Store.loadOrders();
      location.hash = '#/pedidos/' + saved.id; renderMain();
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); $$('.modal-f button', L.el).forEach(x => x.disabled = false); }
  });
  render();
}
function openShipForm(o) {
  const pending = o.items.filter(x => !x.picked).length;
  const L = openLayer(modalHTML(`Enviar pedido ${o.number}`, `
    <p style="margin-top:0">Se generará el albarán de entrega con ${plural(o.items.reduce((s, x) => s + x.qty, 0), 'unidad', 'unidades')} para <b>${esc(o.cliente)}</b>${sedeLabel(o.sede) ? ' (' + esc(sedeLabel(o.sede)) + ')' : ''} y el material pasará a estado <b>Enviado</b>.</p>
    ${pending ? `<div class="err-msg" style="margin-bottom:12px">Quedan ${pending} unidades sin confirmar en la recogida.</div><label class="chk" style="margin-bottom:14px"><input type="checkbox" id="sh-force">Enviar igualmente</label>` : ''}
    <div class="fgrid"><label class="f">Transportista<input class="inp" id="sh-carrier" placeholder="Ej. SEUR, técnico propio…"></label><label class="f">Referencia o nº de envío<input class="inp" id="sh-ref"></label>
    <label class="f wide">Observaciones del albarán<textarea class="ta" id="sh-notes" rows="3">${esc(o.notes || '')}</textarea></label>
    <label class="chk wide"><input type="checkbox" id="sh-mail" ${Store.settings.albaran.mailDefault ? 'checked' : ''} ${Store.mailEnabled ? '' : 'disabled'}>Enviar el albarán por correo${Store.mailEnabled ? '' : ' <span class="help">(correo no configurado)</span>'}</label></div><div id="sh-err" class="err-msg hide" style="margin-top:12px"></div>`,
    `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="sh-ok">${ico('truck')}Enviar y generar albarán</button>`));
  $('#sh-ok', L.el).onclick = async () => {
    const btn = $('#sh-ok', L.el), err = $('#sh-err', L.el); err.classList.add('hide');
    let mailPayload = null;
    if ($('#sh-mail', L.el) && $('#sh-mail', L.el).checked && Store.mailEnabled) {
      const sede = (Store.settings.sedes || []).find(x => x.id === (o.sede || {}).id) || o.sede;
      mailPayload = await composeDeliveryMail({sede, cliente: o.cliente, units: o.items.reduce((a, x) => a + x.qty, 0), title: 'Enviar el albarán por correo'});
      if (!mailPayload) return;
    }
    btn.disabled = true;
    try {
      const r = await API('POST', `/api/orders/${encodeURIComponent(o.id)}/ship`, {carrier: $('#sh-carrier', L.el).value, ref: $('#sh-ref', L.el).value, notes: $('#sh-notes', L.el).value, force: !!($('#sh-force', L.el) && $('#sh-force', L.el).checked)});
      S.orderDetail = r.order; closeLayer(L); renderMain(); Store.loadOrders(); Store.loadDeliveries();
      const mr = mailPayload ? await sendDeliveryMail(r.delivery.id, mailPayload) : null;
      deliveryDone(r.delivery, mr);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); btn.disabled = false; }
  };
}
function deliveryDone(d, mr) {
  const mailMsg = !mr ? '' : mr.ok ? `<p style="margin:10px 0 0;color:var(--ok);font-weight:600">${ico('send')} Enviado por correo a ${esc(mr.to.join(', '))}.</p>` : `<div class="err-msg" style="margin-top:10px">El albarán se ha creado, pero no se ha podido enviar el correo: ${esc(mr.error)}. Puedes reenviarlo desde Albaranes.</div>`;
  openLayer(modalHTML('Albarán creado', `<p style="margin-top:0">Se ha generado el albarán <b class="serial">${esc(d.number)}</b>. Ábrelo para imprimirlo o enviarlo al cliente.</p>${mailMsg}`,
    `<button class="btn" data-close>Cerrar</button><a class="btn primary" href="${pdfUrl(d.id)}" target="_blank" rel="noopener" data-act="noop">${ico('file')}Abrir albarán (PDF)</a>`, 'narrow'));
}

/* =========================================================
   Albaranes
   ========================================================= */
VIEWS.albaranes = () => {
  const q = norm(S.dlQ || '');
  const list = (Store.deliveries || []).filter(d => !q || norm([d.number, d.cliente, sedeLabel(d.sede), d.orderNumber, d.ref, d.carrier, d.createdByName].join(' ')).includes(q));
  return `<div class="page-head"><div><h1>Albaranes y documentos</h1><p>Albaranes de entrega, traspasos entre almacenes, retiradas y certificados de borrado.</p></div>${Auth.can('inv.move') ? `<a class="btn" href="#/movimientos">${ico('swap')}Nueva salida</a>` : ''}</div>
    <section class="panel"><div class="toolbar"><input class="inp sm" id="dl-q" placeholder="Buscar por número, cliente, sede, pedido…" value="${esc(S.dlQ || '')}"></div>
    <div id="dl-area">${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Documento</th><th>Fecha</th><th>Cliente</th><th>Destino</th><th style="text-align:right">Uds.</th><th>Pedido</th><th>Preparado por</th><th></th></tr></thead><tbody>
      ${list.map(d => `<tr data-act="dlOpen" data-id="${esc(d.id)}"><td><b class="serial">${esc(d.number)}</b><span class="doc-kind k-${esc(d.kind || 'albaran')}">${esc(DOC_KIND[d.kind] || 'Albarán')}</span>${d.kind === 'traspaso' ? (d.receivedAt ? '<span class="help" style="display:block">Recibido</span>' : '<span class="help" style="display:block;color:var(--warn)">En tránsito</span>') : ''}</td><td>${fmtDT(d.date)}</td><td>${esc(d.cliente)}</td><td>${esc(sedeLabel(d.sede)) || '<span class="muted">—</span>'}</td><td class="num" style="text-align:right">${d.units}</td><td>${d.orderNumber ? `<span class="serial">${esc(d.orderNumber)}</span>` : '<span class="muted">—</span>'}</td><td>${esc(d.createdByName || d.createdBy)}</td>
        <td style="text-align:right;white-space:nowrap">${d.kind === 'traspaso' && !d.receivedAt && Auth.can('inv.move') ? `<button class="btn sm primary" data-act="trReceive" data-id="${esc(d.id)}">${ico('down')}Recibir</button> ` : ''}${d.emailedTo ? `<span class="help" title="Enviado a ${esc(d.emailedTo)}">${ico('send')}</span> ` : ''}${Store.mailEnabled && Auth.can('inv.move') ? `<button class="btn sm" data-act="dlMail" data-id="${esc(d.id)}">${ico('send')}Correo</button> ` : ''}${Auth.can('inv.delete') ? `<button class="btn sm icon danger" data-act="dlDelete" data-id="${esc(d.id)}" title="Eliminar albarán" aria-label="Eliminar albarán">${ico('trash')}</button> ` : ''}<a class="btn sm" href="${pdfUrl(d.id)}" target="_blank" rel="noopener" data-act="noop">${ico('file')}PDF</a></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty"><h3>${(Store.deliveries || []).length ? 'Ningún albarán coincide' : 'Todavía no hay albaranes'}</h3><p>Se crean al enviar un pedido o al hacer una salida por escaneo con la opción de albarán.</p></div>`}</div></section>`;
};
async function openDelivery(id) {
  let d; try { d = await API('GET', '/api/deliveries/' + encodeURIComponent(id)); } catch (ex) { toast(ex.message, 'err'); return; }
  openLayer(modalHTML(`${DOC_KIND[d.kind] || 'Albarán'} ${d.number}`, `<dl class="kv">${d.kind === 'traspaso' ? `<dt>Traspaso</dt><dd>${esc((almById(d.origen) || {}).nombre || d.origen)} → ${esc((almById(d.destino) || {}).nombre || d.destino)}${d.receivedAt ? `<div class="help">Recibido el ${fmtDT(d.receivedAt)} por ${esc(d.receivedBy)}</div>` : '<div class="help" style="color:var(--warn)">Pendiente de recibir</div>'}</dd>` : ''}<dt>Fecha</dt><dd>${fmtDT(d.date)}</dd><dt>Cliente</dt><dd>${esc(d.cliente)}</dd><dt>Destino</dt><dd>${esc([d.sede.nombre, d.sede.direccion, [d.sede.cp, d.sede.ciudad].filter(Boolean).join(' ')].filter(Boolean).join(', ')) || '—'}</dd>
      ${d.orderNumber ? `<dt>Pedido</dt><dd>${esc(d.orderNumber)}</dd>` : ''}${d.emailedTo ? `<dt>Enviado por correo</dt><dd>${esc(d.emailedTo)}<div class="help">${fmtDT(d.emailedAt)}</div></dd>` : ''}<dt>Transportista</dt><dd>${esc(d.carrier) || '—'}</dd><dt>Referencia</dt><dd>${esc(d.ref) || '—'}</dd><dt>Preparado por</dt><dd>${esc(d.createdByName || d.createdBy)}</dd>${d.notes ? `<dt>Observaciones</dt><dd style="white-space:pre-wrap">${esc(d.notes)}</dd>` : ''}</dl>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Categoría</th><th>Descripción</th><th>Nº de serie</th><th style="text-align:right">Uds.</th></tr></thead><tbody>
    ${d.lines.map(l => `<tr ${Store.items[l.itemId] ? `data-act="openItem" data-id="${esc(l.itemId)}"` : 'style="cursor:default"'}><td>${esc(l.catName)}</td><td>${esc(l.title)}</td><td class="serial">${esc(l.serie || '—')}</td><td class="num" style="text-align:right">${l.qty}</td></tr>`).join('')}</tbody></table></div>`,
    `${Auth.can('inv.delete') ? `<button class="btn danger" data-act="dlDelete" data-id="${esc(d.id)}" style="margin-right:auto">${ico('trash')}Eliminar</button>` : ''}<button class="btn" data-close>Cerrar</button>${Store.mailEnabled && Auth.can('inv.move') ? `<button class="btn" data-act="dlMail" data-id="${esc(d.id)}">${ico('send')}Enviar por correo</button>` : ''}<a class="btn primary" href="${pdfUrl(d.id)}" target="_blank" rel="noopener" data-act="noop">${ico('file')}Abrir PDF</a>`));
}

/* =========================================================
   Lectura de albaranes (OCR local y gratuito)
   Fotos: Tesseract.js + lector de códigos de barras del navegador.
   PDF: texto directo con pdf.js; si es escaneado, OCR de cada página.
   Nada sale del navegador.
   ========================================================= */
const AlbReader = {
  worker: null,
  abs: p => new URL(p, location.href).href,
  loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.dataset.src = src;
      s.onload = res; s.onerror = () => rej(new Error('No se ha podido cargar el lector. Comprueba la conexión con el servidor.'));
      document.head.appendChild(s);
    });
  },
  async ocrWorker(progress) {
    if (this.worker) return this.worker;
    await this.loadScript('vendor/tesseract/tesseract.min.js');
    progress('Preparando el lector de texto (la primera vez tarda un poco más)…');
    this.worker = await Tesseract.createWorker('eng', 1, {
      workerPath: this.abs('vendor/tesseract/worker.min.js'), corePath: this.abs('vendor/tesseract/core'), langPath: this.abs('vendor/tesseract/lang'),
      gzip: true, workerBlobURL: false,
      logger: m => { if (m.status === 'recognizing text') progress(`${this._label}: ${Math.round(m.progress * 100)} %`); }
    });
    await this.worker.setParameters({preserve_interword_spaces: '1'});
    return this.worker;
  },
  async release() { if (this.worker) { try { await this.worker.terminate(); } catch {} this.worker = null; } },
  async imageToCanvas(blob) {
    const bmp = await createImageBitmap(blob);
    let w = bmp.width, h = bmp.height;
    const k = Math.min(2600 / Math.max(w, h), Math.max(1, 1700 / Math.max(w, h)));
    w = Math.round(w * k); h = Math.round(h * k);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.drawImage(bmp, 0, 0, w, h);
    // Escala de grises con un poco más de contraste: ayuda al OCR con fotos de móvil.
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; g = Math.max(0, Math.min(255, (g - 128) * 1.25 + 128)); d[i] = d[i + 1] = d[i + 2] = g; }
    ctx.putImageData(img, 0, 0);
    return cv;
  },
  async barcodes(source) {
    if (!('BarcodeDetector' in window)) return [];
    try {
      const fm = await BarcodeDetector.getSupportedFormats();
      const det = new BarcodeDetector({formats: fm.filter(f => !['ean_13', 'ean_8', 'upc_a', 'upc_e'].includes(f))});
      return (await det.detect(source)).map(b => String(b.rawValue || '').trim()).filter(Boolean);
    } catch { return []; }
  },
  async ocrCanvas(cv, label, progress) {
    this._label = label;
    const w = await this.ocrWorker(progress);
    progress(`${label}: leyendo texto…`);
    const r = await w.recognize(cv);
    return r.data.text || '';
  },
  async pdfFile(file, progress) {
    await this.loadScript('vendor/pdfjs/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({data: await file.arrayBuffer(), isEvalSupported: false}).promise;
    let text = '', codes = [];
    const pages = Math.min(pdf.numPages, 10);
    for (let p = 1; p <= pages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      // Reconstruye las líneas agrupando por posición vertical.
      const rows = {};
      tc.items.filter(it => it.str && it.str.trim()).forEach(it => { const y = Math.round(it.transform[5] / 3); (rows[y] = rows[y] || []).push(it); });
      const pageText = Object.keys(rows).sort((a, b) => b - a).map(y => {
        const its = rows[y].sort((a, b) => a.transform[4] - b.transform[4]); let line = '', end = null;
        its.forEach(it => { const x = it.transform[4]; if (end !== null) { const gap = x - end; line += gap > 6 ? '   ' : gap > 0.8 ? ' ' : ''; } line += it.str; end = x + (it.width || 0); });
        return line;
      }).join('\n');
      if (pageText.replace(/\s/g, '').length > 40) { text += pageText + '\n'; continue; }
      // PDF escaneado: se renderiza la página y se pasa por OCR.
      const vp = page.getViewport({scale: 2.5});
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await page.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise;
      codes = codes.concat(await this.barcodes(cv));
      text += await this.ocrCanvas(cv, `${file.name}, página ${p} de ${pages}`, progress) + '\n';
    }
    return {text, codes};
  },
  async imageFile(file, idx, total, progress) {
    progress(`Preparando la foto ${idx} de ${total}…`);
    const cv = await this.imageToCanvas(file);
    const codes = await this.barcodes(cv);
    const text = await this.ocrCanvas(cv, `Foto ${idx} de ${total}`, progress);
    return {text, codes};
  }
};

const SN_KEY = /(?:\bS\s*\/\s*N[º°O]?\b|\bS\s*N\b|\bSERIAL(?:\s*(?:NO|NUMBER|N[º°O]))?\b|N[º°O]?\s*\.?\s*(?:DE\s+)?SERIE\b|\bSERIES?\b|\bS\.\s*N\.?)/i;
const BAD_KEY = /(?:\bP\s*\/\s*N\b|\bPN\b|\bPART\b|\bREF(?:ERENCIA)?\b|\bART(?:[IÍ]CULO)?\b|\bEAN\b|\bUPC\b|\bCIF\b|\bNIF\b|\bTEL[EÉ]?F?(?:ONO)?\b|\bFAX\b|\bIBAN\b|\bPEDIDO\b|\bORDER\b|\bFACTURA\b|\bINVOICE\b|\bMODELO\b|\bMODEL\b|\bMTM\b|\bSKU\b|\bC[OÓ]DIGO\b|\bLOTE\b|\bALBAR[AÁ]N\b)/i;
function isJunkToken(t) {
  return /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(t) || /^\d+[.,]\d{2}$/.test(t) || /^ES\d{20,24}$/.test(t) || /@|WWW|HTTP/.test(t)
    || /^\d{5}$/.test(t) || /^[6789]\d{8}$/.test(t) || /^\d{8}$|^\d{12,14}$/.test(t) || /^[A-HJNP-SUVW]\d{7}[0-9A-J]$/.test(t) || /^\d{1,4}$/.test(t);
}
function serialShape(t) {
  const L = (t.match(/[A-Z]/g) || []).length, D = (t.match(/\d/g) || []).length;
  return t.length >= 6 && t.length <= 22 && D >= 2 && L >= 1 && !isJunkToken(t);
}
function cleanToken(t) { return t.replace(/^[\-\/.]+|[\-\/.:,;]+$/g, ''); }
function findSerials(text, codes) {
  const out = new Map();
  const add = (v, source, line) => {
    v = cleanToken(String(v).toUpperCase().replace(/\s+/g, ''));
    if (v.length < 5 || v.length > 30) return;
    const rank = {barcode: 4, columna: 3, sn: 2, tabla: 2, posible: 1};
    const cur = out.get(v);
    if (!cur || rank[source] > rank[cur.source]) out.set(v, {value: v, source, line: (line || '').slice(0, 120)});
  };
  (codes || []).forEach(c => { const v = cleanScan(c); if (!isJunkToken(v.toUpperCase())) add(v, 'barcode', 'Código de barras'); });
  const raw = String(text).split(/\r?\n/).map(l => l.toUpperCase().replace(/[|¦\t]/g, '   ').replace(/\s+$/, '')).filter(l => l.trim());
  const lines = raw.map(l => l.replace(/\s+/g, ' ').trim());
  const TOK = /[A-Z0-9][A-Z0-9\-\/.]{3,30}[A-Z0-9]/g;
  const cellsOf = l => l.split(/\s{2,}|\t/).map(c => c.trim()).filter(Boolean);
  const END_TABLE = /\b(TOTAL|SUMA|BULTOS|PESO|OBSERVACIONES|FIRMA|RECIBIDO|ENTREGADO|CONFORME|BASE IMPONIBLE|IVA)\b/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Tabla: cabecera con varias columnas y una de ellas de número de serie.
    const head = cellsOf(raw[i]), col = head.findIndex(c => SN_KEY.test(c) && c.split(' ').length <= 5);
    if (head.length >= 3 && col >= 0) {
      const fromEnd = head.length - 1 - col; let found = 0, j = i + 1;
      for (; j < lines.length && j < i + 400; j++) {
        if (END_TABLE.test(lines[j]) || SN_KEY.test(lines[j])) break;
        const cells = cellsOf(raw[j]);
        if (cells.length < 2) continue;
        const v = cells.length === head.length ? cells[col] : cells[cells.length - 1 - fromEnd];
        if (!v) continue;
        const t = cleanToken(v.toUpperCase().replace(/\s+/g, ''));
        if (/^[A-Z0-9][A-Z0-9\-\/.]{2,29}$/.test(t) && !/^\d{1,3}$/.test(t) && !isJunkToken(t)) { add(t, 'columna', lines[j]); found++; }
      }
      if (found) { i = j - 1; continue; }
    }
    const m = SN_KEY.exec(line);
    if (m) {
      const after = line.slice(m.index + m[0].length).replace(/^[\s:#.\-–=]+/, '');
      let toks = (after.match(TOK) || []).map(cleanToken).filter(t => !isJunkToken(t) && /\d/.test(t));
      if (!toks.length && lines[i + 1] && !BAD_KEY.test(lines[i + 1])) toks = (lines[i + 1].match(TOK) || []).map(cleanToken).filter(t => !isJunkToken(t) && /\d/.test(t)).slice(0, 1);
      toks.forEach(t => add(t, 'sn', line));
      // Listas de números de serie que continúan en las líneas siguientes.
      for (let j = i + 1; j < lines.length && j < i + 40; j++) {
        const ts = (lines[j].match(TOK) || []).map(cleanToken);
        const words = lines[j].split(' ').filter(w => /^[A-ZÁÉÍÓÚÑ]{4,}$/.test(w) && !/\d/.test(w));
        if (!ts.length || BAD_KEY.test(lines[j]) || SN_KEY.test(lines[j]) || words.length || !ts.every(serialShape)) break;
        ts.forEach(t => add(t, 'sn', lines[j]));
        i = j;
      }
      continue;
    }
    const bad = BAD_KEY.exec(line);
    (line.match(TOK) || []).map(cleanToken).forEach(t => {
      if (bad && line.indexOf(t) > bad.index) return;
      if (serialShape(t)) add(t, 'posible', line);
    });
  }
  // Respaldo: tabla sin cabecera legible (p. ej. cabecera blanca sobre color en una foto).
  if (![...out.values()].some(x => x.source !== 'posible')) {
    const refs = new Set();
    lines.forEach(l => { const b = BAD_KEY.exec(l); if (b) (l.slice(b.index).match(TOK) || []).forEach(t => refs.add(cleanToken(t))); });
    const blocks = []; let cur = [];
    raw.forEach((l, idx) => { const c = cellsOf(l); if (c.length >= 3 && !END_TABLE.test(l)) cur.push({idx, c}); else { if (cur.length >= 2) blocks.push(cur); cur = []; } });
    if (cur.length >= 2) blocks.push(cur);
    blocks.forEach(bl => {
      const minLen = Math.min(...bl.map(r => r.c.length)); let best = null;
      for (let k = 0; k < minLen; k++) {
        const vals = bl.map(r => ({v: cleanToken(r.c[r.c.length - 1 - k].toUpperCase()), line: lines[r.idx]}));
        const shape = v => /^[A-Z0-9][A-Z0-9\-\/.]{3,29}$/.test(v) && !isJunkToken(v) && !refs.has(v);
        let ok = vals.filter(x => shape(x.v) && /[A-Z]/.test(x.v) && /\d/.test(x.v));
        // Valores con la misma forma que sus vecinos aunque el OCR haya leído mal algún dígito.
        if (ok.length >= 2) ok = ok.concat(vals.filter(x => !ok.includes(x) && shape(x.v) && ok.filter(o => o.v.length === x.v.length && o.v.slice(0, 3) === x.v.slice(0, 3)).length >= 2));
        const distinct = new Set(ok.map(x => x.v)).size;
        if (ok.length >= Math.max(2, Math.ceil(bl.length * 0.4)) && distinct === ok.length) {
          const score = ok.length + ok.reduce((a, x) => a + x.v.length, 0) / ok.length / 10;
          if (!best || score > best.score) best = {score, ok};
        }
      }
      if (best) best.ok.forEach(x => add(x.v, 'tabla', x.line));
    });
  }
  const list = [...out.values()];
  // Los "posibles" que se parecen entre sí (mismo prefijo y longitud) suelen ser una lista de series del mismo modelo.
  const groups = {};
  list.filter(x => x.source === 'posible').forEach(x => { const k = x.value.slice(0, 3) + '|' + x.value.length; (groups[k] = groups[k] || []).push(x); });
  list.forEach(x => {
    x.exists = !!findBySerial(x.value);
    const k = x.value.slice(0, 3) + '|' + x.value.length;
    x.selected = !x.exists && (x.source !== 'posible' || (groups[k] && groups[k].length >= 2));
  });
  const CONF = {'0': 'O', 'O': '0', '1': 'I', 'I': '1', '5': 'S', 'S': '5', '8': 'B', 'B': '8', '2': 'Z', 'Z': '2', '4': 'A', 'A': '4', '6': 'G', 'G': '6'};
  const fam = list.filter(x => x.source !== 'posible');
  fam.forEach(x => {
    const sib = fam.filter(y => y !== x && y.value.length === x.value.length && y.value.slice(0, 2) === x.value.slice(0, 2));
    if (sib.length < 2) return;
    let fixed = x.value.split(''), changed = false;
    for (let i = 0; i < fixed.length; i++) {
      const cnt = {}; sib.forEach(y => { cnt[y.value[i]] = (cnt[y.value[i]] || 0) + 1; });
      const [best, n] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (best !== fixed[i] && n >= 2 && n === sib.length && CONF[fixed[i]] === best && /\d/.test(best) !== /\d/.test(fixed[i])) { fixed[i] = best; changed = true; }
    }
    if (changed) x.suggest = fixed.join('');
  });
  const order = {barcode: 0, columna: 1, sn: 1, tabla: 1, posible: 2};
  return list.sort((a, b) => order[a.source] - order[b.source] || (b.selected - a.selected));
}
function findAlbaranNumber(text) {
  const t = String(text).toUpperCase();
  const m = t.match(/ALBAR[AÁ]N[^A-Z0-9\n]*(?:(?:DE\s+ENTREGA|N[º°O2]?|NUM(?:ERO)?)\b[^A-Z0-9\n]*)*([A-Z0-9][A-Z0-9\-\/]{3,20})/) || t.match(/DELIVERY\s*NOTE\s*(?:NO\.?|NUMBER)?\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/]{2,20})/);
  return m && /\d/.test(m[1]) ? m[1] : '';
}

function openAlbaranReader() {
  const st = {items: [], text: '', albaran: ''};
  const L = openLayer(modalHTML('Leer números de serie de un albarán', `
    <p style="margin-top:0">Haz una foto del albarán del proveedor o sube el PDF. Se procesa en este dispositivo: no se envía a ningún servicio externo.</p>
    <div class="row"><label class="btn primary" style="cursor:pointer">${ico('camera')}Hacer foto<input type="file" accept="image/*" capture="environment" class="sr" id="ar-cam"></label>
      <label class="btn" style="cursor:pointer">${ico('up')}Elegir fotos o PDF<input type="file" accept="image/*,application/pdf" multiple class="sr" id="ar-files"></label></div>
    <p class="help" style="margin:8px 0 0">Para que lea bien: buena luz, el albarán plano y la foto de frente y de cerca. Si el albarán llega en PDF por correo, súbelo tal cual: es lo más fiable.</p>
    <div id="ar-progress" class="ar-progress hide"></div><div id="ar-result"></div>`,
    `<button class="btn" data-close>Cancelar</button><button class="btn primary hide" id="ar-ok">Añadir a la entrada</button>`), {onClose: () => AlbReader.release()});
  const prog = $('#ar-progress', L.el), resBox = $('#ar-result', L.el), ok = $('#ar-ok', L.el);
  const progress = m => { prog.classList.remove('hide'); prog.innerHTML = `<span class="spin"></span>${esc(m)}`; };
  const render = () => {
    const sel = st.items.filter(x => x.selected).length;
    ok.classList.toggle('hide', !st.items.length); ok.textContent = `Añadir ${sel} a la entrada`; ok.disabled = !sel;
    if (!st.items.length) { resBox.innerHTML = st.text ? `<div class="err-msg" style="margin-top:14px">No se ha encontrado ningún número de serie. Prueba con otra foto más cercana y con mejor luz, o con el PDF original.</div><details style="margin-top:10px"><summary class="help">Ver el texto leído</summary><pre class="ar-text">${esc(st.text)}</pre></details>` : ''; return; }
    const badge = {barcode: '<span class="badge ok">Código de barras</span>', columna: '<span class="badge info">Columna «Nº de serie»</span>', tabla: '<span class="badge info">Columna de la tabla</span>', sn: '<span class="badge info">Junto a «S/N»</span>', posible: '<span class="badge">Posible</span>'};
    resBox.innerHTML = `<div class="fgrid" style="margin-top:16px"><label class="f">Nº de albarán del proveedor<input class="inp" id="ar-alb" value="${esc(st.albaran)}"></label></div>
      <div class="row" style="margin:14px 0 6px"><b>${st.items.length} detectados</b><span class="help">· ${sel} marcados</span><span class="spacer"></span><button type="button" class="btn sm ghost" data-ar="all">Marcar todos</button><button type="button" class="btn sm ghost" data-ar="none">Ninguno</button></div>
      <div class="ar-list">${st.items.map((x, i) => `<label class="ar-row ${x.exists ? 'dup' : ''}"><input type="checkbox" data-ari="${i}" ${x.selected ? 'checked' : ''}>
        <input class="inp sm serial" data-arv="${i}" value="${esc(x.value)}"><span class="ar-meta">${badge[x.source]}${x.exists ? ' <span class="badge red">Ya registrado</span>' : ''}${x.suggest && x.suggest !== x.value ? ` <button type="button" class="badge warn ar-fix" data-arfix="${i}" title="Aplicar la corrección">Revisar: ¿${esc(x.suggest)}?</button>` : ''}<span class="help ar-line">${esc(x.line)}</span></span></label>`).join('')}</div>
      <p class="help">Revisa los números antes de añadirlos: el reconocimiento de texto puede confundir letras parecidas (O y 0, I y 1, S y 5, B y 8). Puedes corregirlos aquí mismo.</p>
      <details><summary class="help">Ver el texto leído</summary><pre class="ar-text">${esc(st.text)}</pre></details>`;
  };
  const run = async files => {
    files = [...files].slice(0, 10); if (!files.length) return;
    resBox.innerHTML = ''; ok.classList.add('hide');
    let text = '', codes = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const r = f.type === 'application/pdf' || /\.pdf$/i.test(f.name) ? await AlbReader.pdfFile(f, progress) : await AlbReader.imageFile(f, i + 1, files.length, progress);
        text += r.text + '\n'; codes = codes.concat(r.codes);
      }
      st.text = text.trim(); st.items = findSerials(text, codes); st.albaran = findAlbaranNumber(text);
      prog.classList.add('hide'); render();
    } catch (ex) { prog.innerHTML = `<span style="color:var(--red-ink)">${esc(ex.message || String(ex))}</span>`; }
  };
  $('#ar-cam', L.el).onchange = e => { run(e.target.files); e.target.value = ''; };
  $('#ar-files', L.el).onchange = e => { run(e.target.files); e.target.value = ''; };
  resBox.addEventListener('change', e => { const i = e.target.dataset.ari; if (i !== undefined) { st.items[i].selected = e.target.checked; render(); } });
  resBox.addEventListener('input', e => { const i = e.target.dataset.arv; if (i !== undefined) st.items[i].value = e.target.value.trim().toUpperCase(); if (e.target.id === 'ar-alb') st.albaran = e.target.value; });
  resBox.addEventListener('click', e => {
    const fx = e.target.closest('[data-arfix]');
    if (fx) { e.preventDefault(); const x = st.items[fx.dataset.arfix]; x.value = x.suggest; x.exists = !!findBySerial(x.value); render(); return; }
    const b = e.target.closest('[data-ar]'); if (!b) return; st.items.forEach(x => x.selected = b.dataset.ar === 'all' && !x.exists); render(); });
  ok.onclick = () => {
    const ta = $('#mv-serials'); if (!ta) { toast('Abre la entrada de una categoría con número de serie.', 'warn'); return; }
    const have = new Set(serialLines('mv-serials').map(s => s.toUpperCase()));
    const add = st.items.filter(x => x.selected && x.value && !have.has(x.value)).map(x => x.value);
    ta.value = [ta.value.trim(), ...add].filter(Boolean).join('\n');
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    const alb = $('#mvin-albaran'); if (alb && st.albaran && !alb.value.trim()) alb.value = st.albaran;
    closeLayer(L);
    toast(`${plural(add.length, 'número de serie añadido', 'números de serie añadidos')} a la entrada. Revisa los datos comunes y pulsa «Registrar entrada».`, 'ok', 6000);
  };
}

/* =========================================================
   Albarán: columnas configurables y envío por correo
   ========================================================= */
const ALB_BUILTIN = {n: 'Nº de línea', cat: 'Categoría', desc: 'Descripción (marca y modelo)', serie: 'Nº de serie', qty: 'Unidades'};
const PICK_LABELS = {check: 'Casilla de comprobación', ubic: 'Ubicación', balda: 'Balda', cat: 'Categoría', desc: 'Descripción (marca y modelo)', serie: 'Nº de serie', qty: 'Unidades'};
const COLS_DEFAULT = {albaran: ['n', 'cat', 'desc', 'serie', 'qty'], recogida: ['check', 'balda', 'cat', 'desc', 'serie', 'qty']};
function albColsHTML(A, target = 'albaran') {
  const builtins = target === 'recogida' ? PICK_LABELS : ALB_BUILTIN;
  const cur = A.columns && A.columns.length ? A.columns : COLS_DEFAULT[target];
  const fields = []; cats().forEach(c => c.fields.forEach(f => { if (f.type !== 'textarea' && !['serie', 'cantidad'].includes(f.key) && !fields.some(x => x.key === f.key)) fields.push({key: f.key, label: f.label}); }));
  const combos = (draft().combos || []).map(c => ({key: c.key, label: c.label + ' (combinada)'}));
  const label = k => builtins[k] || (combos.find(f => f.key === k) || fields.find(f => f.key === k) || {}).label || k;
  const avail = Object.keys(builtins).filter(k => !cur.includes(k)).map(k => ({key: k, label: builtins[k]})).concat(combos.filter(f => !cur.includes(f.key)), fields.filter(f => !cur.includes(f.key)));
  A.labels = A.labels || {};
  const T = `data-target="${target}"`;
  return `<div class="alb-cols-sel"><b style="font-size:13px">${target === 'recogida' ? 'En la lista' : 'En el albarán'}, en este orden</b>${cur.map((k, i) => `<div class="alb-col on"><span class="alb-col-n">${i + 1}.</span><span class="alb-col-name"><span class="help">${esc(label(k))}</span><input class="inp sm" data-bind="${target}.labels.${esc(k)}" id="${bid(target + '.labels.' + k)}" value="${esc(A.labels[k] || '')}" placeholder="${esc(String(label(k)).replace(/ \(.*\)$/, ''))}" title="Título de la columna en el documento. Vacío = el nombre por defecto."></span>
      <button class="btn sm icon ghost" data-act="albColMove" ${T} data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${ico('chevup')}</button><button class="btn sm icon ghost" data-act="albColMove" ${T} data-i="${i}" data-dir="1" ${i === cur.length - 1 ? 'disabled' : ''} aria-label="Bajar">${ico('chevdown')}</button>
      <button class="btn sm icon ghost" data-act="albColToggle" ${T} data-k="${esc(k)}" ${cur.length === 1 ? 'disabled' : ''} aria-label="Quitar">${ico('x')}</button></div>`).join('')}</div>
    <div class="alb-cols-av"><b style="font-size:13px">Disponibles</b><div class="alb-chips">${avail.map(f => `<button class="fchip" data-act="albColToggle" ${T} data-k="${esc(f.key)}">${ico('plus')}${esc(f.label)}</button>`).join('') || '<span class="help">Ya están todas.</span>'}</div>
    <p class="help">El ancho de cada columna se ajusta a su contenido. Con más de 6 columnas, la letra se reduce un poco.</p></div>`;
}
const EMAIL_RX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
function composeDeliveryMail({sede, cliente, units, title, intro, number}) {
  return new Promise(resolve => {
    const A = Store.settings.albaran || {};
    const defs = (Array.isArray(A.emailTo) ? A.emailTo : String(A.emailTo || '').split(/[,;\s]+/)).map(x => x.trim().toLowerCase()).filter(Boolean);
    const known = [...new Set([...defs, ...(sede && sede.email ? [sede.email.toLowerCase()] : [])])];
    const fill = t => String(t || '').replace(/\{(\w+)\}/g, (m, k) => ({albaran: number || '(número del albarán)', cliente: cliente || '', sede: (sede && sede.nombre) || '', fecha: new Date().toLocaleDateString('es-ES'), unidades: String(units || ''), usuario: Auth.user.name || Auth.user.username, empresa: Store.settings.company || ''})[k] ?? m);
    let done = false;
    const L = openLayer(modalHTML(title || 'Enviar albarán por correo', `${intro ? `<p style="margin-top:0">${intro}</p>` : ''}
      <div class="f" style="margin-bottom:12px"><span style="font-size:13px;font-weight:550;color:var(--ink-2)">Destinatarios</span>
        <div class="mail-to">${known.map(e => `<label class="chk"><input type="checkbox" data-mto="${esc(e)}" checked>${esc(e)}${sede && sede.email && sede.email.toLowerCase() === e ? ' <span class="badge">Sede</span>' : defs.includes(e) ? ' <span class="badge">Por defecto</span>' : ''}</label>`).join('') || '<span class="help">No hay destinatarios por defecto configurados.</span>'}</div>
        <input class="inp" id="mc-extra" placeholder="Añadir otros correos, separados por comas" style="margin-top:8px"></div>
      <label class="f">Asunto<input class="inp" id="mc-subject" value="${esc(A.emailSubject || 'Salida de material · Albarán {albaran}')}"></label>
      <label class="f" style="margin-top:12px">Mensaje<textarea class="ta" id="mc-body" rows="7">${esc(A.emailBody || 'Hola,\n\nOs adjuntamos el albarán {albaran} con el material enviado.\n\nUn saludo,\n{usuario}')}</textarea>
        <span class="help">Debajo del mensaje se añade la lista del material, y el albarán en PDF va adjunto. Los textos entre llaves se sustituyen al enviar (ej.: {albaran} → número del albarán).</span></label>
      <div class="mail-prev"><span class="help">Así se verá el asunto:</span> <b id="mc-prev"></b></div>
      <div id="mc-err" class="err-msg hide" style="margin-top:10px"></div>`,
      `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="mc-ok">${ico('send')}${number ? 'Enviar' : 'Aplicar y enviar'}</button>`), {onClose: () => { if (!done) resolve(null); }});
    const prev = () => { $('#mc-prev', L.el).textContent = fill($('#mc-subject', L.el).value); };
    $('#mc-subject', L.el).addEventListener('input', prev); prev();
    $('#mc-ok', L.el).onclick = () => {
      const err = $('#mc-err', L.el); err.classList.add('hide');
      const extra = $('#mc-extra', L.el).value.split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
      const bad = extra.filter(x => !EMAIL_RX.test(x));
      if (bad.length) { err.textContent = 'Correo no válido: ' + bad.join(', '); err.classList.remove('hide'); return; }
      const to = [...new Set([...$$('[data-mto]', L.el).filter(x => x.checked).map(x => x.dataset.mto), ...extra])];
      if (!to.length) { err.textContent = 'Indica al menos un destinatario.'; err.classList.remove('hide'); return; }
      done = true; closeLayer(L);
      resolve({to, subject: $('#mc-subject', L.el).value, message: $('#mc-body', L.el).value});
    };
  });
}
async function sendDeliveryMail(id, p) {
  try { const r = await API('POST', `/api/deliveries/${encodeURIComponent(id)}/email`, p); Store.loadDeliveries(); return {ok: true, to: r.to}; }
  catch (ex) { return {ok: false, error: ex.message}; }
}

/* =========================================================
   Acceso por almacén y cliente
   ========================================================= */
function scopeSummary(u) {
  if (u.role === 'admin' || !u.scope || u.scope.all) return '<span class="badge ok">Total</span>';
  const parts = Object.entries(u.scope.almacenes || {}).map(([id, cl]) => { const a = almById(id); return a ? `${esc(a.nombre)}: ${cl.length ? plural(cl.length, 'cliente') : '<span style="color:var(--warn)">ningún cliente</span>'}` : ''; }).filter(Boolean);
  return parts.length ? `<span class="help" style="white-space:normal">${parts.join('<br>')}</span>` : '<span class="badge warn">Sin acceso</span>';
}
function scopeEditorHTML(scope, role) {
  const total = !scope || scope.all;
  const sa = (scope && scope.almacenes) || {};
  return `<div class="scope-box"><b style="font-size:13px">Almacenes y clientes</b>
    <p class="help admin-note ${role === 'admin' ? '' : 'hide'}" style="margin:4px 0 0">Los administradores tienen siempre acceso a todos los almacenes.</p>
    <div class="scope-body ${role === 'admin' ? 'hide' : ''}">
      <label class="chk" style="margin-top:6px"><input type="radio" name="scopemode" value="all" ${total ? 'checked' : ''}>Acceso total (todos los almacenes y clientes, también los futuros)</label>
      <label class="chk"><input type="radio" name="scopemode" value="some" ${total ? '' : 'checked'}>Solo los almacenes y clientes que marque</label>
      <div class="scope-tree ${total ? 'hide' : ''}">${almacenes().map(a => `<div class="scope-alm">
        <label class="chk" style="font-weight:600"><input type="checkbox" data-scope-alm="${esc(a.id)}" ${Array.isArray(sa[a.id]) ? 'checked' : ''}>${esc(a.nombre)}</label>
        <div class="scope-cli">${(a.clientes || []).map(c => `<label class="chk"><input type="checkbox" data-scope-cli="${esc(a.id)}" value="${esc(c)}" ${Array.isArray(sa[a.id]) && sa[a.id].includes(c) ? 'checked' : ''} ${Array.isArray(sa[a.id]) ? '' : 'disabled'}>${esc(c)}</label>`).join('') || '<span class="help">Este almacén no tiene clientes.</span>'}</div>
        <span class="help scope-warn ${Array.isArray(sa[a.id]) && !sa[a.id].length ? '' : 'hide'}" data-scope-warn="${esc(a.id)}">Sin clientes marcados no verá nada de este almacén.</span></div>`).join('')}</div>
      <p class="help" style="margin:8px 0 0">Además del acceso, lo que puede hacer depende de su rol. Gestionar ajustes, usuarios y copias de seguridad requiere acceso total.</p>
    </div></div>`;
}
function syncScopeUI(root) {
  const role = root.querySelector('[name=role]'); const isAdmin = role && role.value === 'admin';
  root.querySelector('.admin-note').classList.toggle('hide', !isAdmin);
  root.querySelector('.scope-body').classList.toggle('hide', isAdmin);
  const some = root.querySelector('[name=scopemode][value=some]').checked;
  root.querySelector('.scope-tree').classList.toggle('hide', !some);
  $$('[data-scope-alm]', root).forEach(cb => {
    const id = cb.dataset.scopeAlm;
    $$(`[data-scope-cli="${id}"]`, root).forEach(c => { c.disabled = !cb.checked; if (!cb.checked) c.checked = false; });
    const w = root.querySelector(`[data-scope-warn="${id}"]`);
    if (w) w.classList.toggle('hide', !(cb.checked && !$$(`[data-scope-cli="${id}"]`, root).some(c => c.checked)));
  });
}
function readScope(root) {
  const role = root.querySelector('[name=role]');
  if (role && role.value === 'admin') return {all: true};
  if (root.querySelector('[name=scopemode][value=all]').checked) return {all: true};
  const out = {almacenes: {}};
  $$('[data-scope-alm]', root).forEach(cb => { if (cb.checked) out.almacenes[cb.dataset.scopeAlm] = $$(`[data-scope-cli="${cb.dataset.scopeAlm}"]`, root).filter(c => c.checked).map(c => c.value); });
  return out;
}

/* =========================================================
   Numeración y color de la aplicación
   ========================================================= */
function numPreview(d) {
  const N = d.numeracion || {}, y = new Date().getFullYear(), dg = Math.min(8, Math.max(3, Number(N.digitos) || 4));
  const one = p => `${String(p || '').toUpperCase() || '?'}${N.anual === false ? '' : '-' + y}-${'1'.padStart(dg, '0')}`;
  return `${one(N.albaran)} (albarán) · ${one(N.pedido)} (pedido)`;
}
function applyTheme(color) {
  const c = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : ((Store.settings && Store.settings.tema && Store.settings.tema.primario) || '#C8102E');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const on = lum(c) > 0.45 ? '#18181B' : '#FFFFFF';
  const darkBase = lum(c) < 0.08 ? mix(c, '#FFFFFF', 0.55) : mix(c, '#FFFFFF', 0.12);
  const light = `--red:${c};--red-hover:${mix(c, '#000000', 0.12)};--red-ink:${lum(c) > 0.3 ? mix(c, '#000000', 0.45) : mix(c, '#000000', 0.15)};--red-soft:${mix(c, '#FFFFFF', 0.9)};--red-line:${mix(c, '#FFFFFF', 0.72)};--on-red:${on}`;
  const dark = `--red:${darkBase};--red-hover:${mix(darkBase, '#FFFFFF', 0.12)};--red-ink:${mix(darkBase, '#FFFFFF', 0.35)};--red-soft:${mix(darkBase, '#1C1C1F', 0.8)};--red-line:${mix(darkBase, '#1C1C1F', 0.55)};--on-red:${lum(darkBase) > 0.45 ? '#18181B' : '#FFFFFF'}`;
  let el = document.getElementById('theme-vars');
  if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.appendChild(el); }
  el.textContent = `:root{${light}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
}

/* ---------- Columnas combinadas: vista previa ---------- */
function comboFieldsHelp() {
  const keys = [['desc', 'descripción'], ['serie', 'nº de serie'], ['cat', 'categoría'], ['qty', 'unidades']];
  cats().forEach(c => c.fields.forEach(f => { if (f.type !== 'textarea' && !keys.some(k => k[0] === f.key)) keys.push([f.key, f.label.toLowerCase()]); }));
  return keys.map(([k, l]) => `<code>{${esc(k)}}</code> ${esc(l)}`).join(', ');
}
function comboRender(t, it) {
  const c = catById(it.cat);
  const out = String(t || '').replace(/\{(\w+)\}/g, (m, k) => k === 'desc' ? itemTitle(it) : k === 'serie' ? (it.data.serie || '') : k === 'cat' ? (c ? c.name : '') : k === 'qty' ? String(qtyOf(it)) : (it.data[k] === undefined || it.data[k] === '' ? '' : String(fmtVal(fieldOf(c, k) || {type: 'text'}, it.data[k], false)))).replace(/\s{2,}/g, ' ').trim();
  return out === String(t || '').replace(/\{(\w+)\}/g, '').trim() ? '' : out;
}
function openComboQuick() {
  const keys = [];
  const c = S.cat !== 'all' ? catById(S.cat) : null;
  (c ? [c] : cats()).forEach(cc => cc.fields.forEach(f => { if (f.type !== 'textarea' && !keys.some(k => k.key === f.key)) keys.push({key: f.key, label: f.label}); }));
  const L = openLayer(modalHTML('Crear columna combinada', `<p style="margin-top:0">Junta varios campos en una sola columna. Sirve también en el albarán, la lista de recogida y el correo.</p>
    <div class="fgrid"><label class="f">Nombre<input class="inp" id="cq-label" value="Cuenta"></label>
    <label class="f wide">Plantilla<input class="inp serial" id="cq-tpl" value="${keys.some(k => k.key === 'cuenta') && keys.some(k => k.key === 'dominio') ? '{cuenta}{dominio}' : ''}" placeholder="Ej. {cuenta}{dominio}"></label></div>
    <p style="margin:10px 0 4px"><span class="help">Ejemplo:</span> <b id="cq-prev"></b></p>
    <p class="help" style="margin:0">Pulsa un campo para añadirlo: ${keys.map(k => `<button type="button" class="fchip cq-field" data-k="${esc(k.key)}">${esc(k.label)}</button>`).join(' ')}</p>
    <div id="cq-err" class="err-msg hide" style="margin-top:10px"></div>`,
    `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cq-ok">Crear y mostrar</button>`));
  const tpl = $('#cq-tpl', L.el), prev = () => { $('#cq-prev', L.el).textContent = comboPreview(tpl.value); };
  tpl.addEventListener('input', prev); prev();
  L.el.addEventListener('click', e => { const b = e.target.closest('.cq-field'); if (!b) return; const pos = tpl.selectionStart ?? tpl.value.length; tpl.value = tpl.value.slice(0, pos) + '{' + b.dataset.k + '}' + tpl.value.slice(pos); tpl.focus(); prev(); });
  $('#cq-ok', L.el).onclick = async () => {
    const label = $('#cq-label', L.el).value.trim(), template = tpl.value.trim(), err = $('#cq-err', L.el);
    if (!label || !/\{\w+\}/.test(template)) { err.textContent = 'Escribe un nombre y al menos un campo entre llaves.'; err.classList.remove('hide'); return; }
    try {
      const s = clone(Store.settings); s.combos = s.combos || [];
      const key = 'combo_' + newId().slice(-8).toLowerCase(); s.combos.push({key, label, template});
      await Store.putSettings(s);
      const cur = tableCols().map(x => x.key); LS.set(colPrefKey(), cur.concat(key));
      closeLayer(L); renderMain(); toast(`Columna «${label}» creada.`);
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hide'); }
  };
}
function comboPreview(t) {
  const it = Object.values(Store.items).find(i => String(t || '').match(/\{(\w+)\}/g) && (String(t).match(/\{(\w+)\}/g) || []).some(m => { const k = m.slice(1, -1); return i.data[k] !== undefined && i.data[k] !== ''; })) || Object.values(Store.items)[0];
  if (!it) return '—';
  const c = catById(it.cat);
  const out = String(t || '').replace(/\{(\w+)\}/g, (m, k) => k === 'desc' ? itemTitle(it) : k === 'serie' ? (it.data.serie || '') : k === 'cat' ? (c ? c.name : '') : k === 'qty' ? String(qtyOf(it)) : (it.data[k] === undefined || it.data[k] === '' ? '' : String(fmtVal(fieldOf(c, k) || {type: 'text'}, it.data[k], false)))).replace(/\s{2,}/g, ' ').trim();
  return out || '—';
}

/* Los menús desplegables se abren hacia el lado donde caben */
document.addEventListener('toggle', e => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.classList.contains('menu') || !d.open) return;
  const pop = d.querySelector('.pop'); if (!pop) return;
  pop.style.left = ''; pop.style.right = '';
  const side = document.querySelector('.side'), sideRight = side && getComputedStyle(side).position !== 'fixed' ? side.getBoundingClientRect().right : 0;
  const r = pop.getBoundingClientRect();
  if (r.left < sideRight + 8) { pop.style.left = '0'; pop.style.right = 'auto'; }
  const r2 = pop.getBoundingClientRect();
  if (r2.right > window.innerWidth - 8) { pop.style.left = 'auto'; pop.style.right = '0'; }
}, true);

/* =========================================================
   Panel de inicio: almacén isométrico, minigráficas y animación
   ========================================================= */
function isoWarehouse(items) {
  const A = almById(mapAlm()); if (!A) return {svg: '', cap: 0};
  const L = A.layout || {}, racks = L.racks || [], zones = L.zones || [];
  if (!racks.length && !zones.length) return {svg: '', cap: 0};
  const E = EST();
  const here = items.filter(i => almOfItem(i) === A.id && !E.baja.includes(i.data.estado) && i.data.estado !== E.enviado);
  const units = {}; here.forEach(i => { units[i.data.ubicacion] = (units[i.data.ubicacion] || 0) + qtyOf(i); });
  const K = 20, P = (x, y, z) => [(x - z) * 0.866 * K, ((x + z) * 0.5 - y) * K];
  const pts = a => a.map(p => P(...p).map(v => v.toFixed(1)).join(',')).join(' ');
  const W = Number(L.width) || 30, D = Number(L.depth) || 20, SH = 0.62;
  const all = [[-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [W / 2, 0, D / 2], [-W / 2, 0, D / 2]];
  let cap = 0, used = 0;
  const boxes = racks.map(r => {
    const len = Number(r.len) || 4, lv = Math.max(1, Number(r.levels) || 4), rot = Number(r.rot) === 90;
    const w = rot ? 1.1 : len, d = rot ? len : 1.1, h = lv * SH + 0.25, y0 = Math.max(0, Number(r.elev) || 0) + plantaAlt(L, r.planta);
    const c = Math.max(1, Math.floor((len - 0.1) / 0.4)) * 4 * lv, n = units[r.id] || 0;
    cap += c; used += Math.min(n, c);
    all.push([Number(r.x) + w / 2, y0 + h, Number(r.z) + d / 2], [Number(r.x) - w / 2, y0 + h, Number(r.z) - d / 2]);
    return {r, up: !!plantaOf(L, r.planta), x0: Number(r.x) - w / 2, x1: Number(r.x) + w / 2, z0: Number(r.z) - d / 2, z1: Number(r.z) + d / 2, y0, h, lv, n, rate: Math.min(1, n / c)};
  }).sort((a, b) => (a.x0 + a.z0) - (b.x0 + b.z0));
  const prism = (b, h, cls) => {
    const {x0, x1, z0, z1} = b, a = b.y0 || 0, t = a + h;
    return `<polygon class="${cls} f-l" points="${pts([[x0, a, z1], [x1, a, z1], [x1, t, z1], [x0, t, z1]])}"/>
      <polygon class="${cls} f-r" points="${pts([[x1, a, z0], [x1, a, z1], [x1, t, z1], [x1, t, z0]])}"/>
      <polygon class="${cls} f-t" points="${pts([[x0, t, z0], [x1, t, z0], [x1, t, z1], [x0, t, z1]])}"/>`;
  };
  const floor = `<polygon class="iso-floor" points="${pts(floorPoly(L).map(q => [q[0], 0, q[1]]))}"/>`;
  const doorsSvg = doorGeom(L).map(g => {
    const [ax, az] = g.A, [bx, bz] = g.B, [cx, cz] = g.C, H = 2.2;
    const [x1, y1] = P(ax, 0, az), [x2, y2] = P(bx, 0, bz), [x3, y3] = P(ax, H, az), [x4, y4] = P(bx, H, bz), [lx, ly] = P(cx, H + 0.7, cz);
    return `<g class="iso-door"><title>${esc(g.d.name || 'Entrada')}</title><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="iso-door-sill"/>
      <polyline points="${x1.toFixed(1)},${y1.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)} ${x4.toFixed(1)},${y4.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" class="iso-door-frame"/>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" class="iso-door-label">${esc(g.d.name || 'Entrada')}</text></g>`;
  }).join('');
  const zoneSvg = up => zones.filter(z => !!plantaOf(L, z.planta) === up).map(z => {
    const x0 = Number(z.x) - z.w / 2, x1 = Number(z.x) + z.w / 2, z0 = Number(z.z) - z.d / 2, z1 = Number(z.z) + z.d / 2, n = units[z.id] || 0, za = plantaAlt(L, z.planta);
    const [tx, ty] = P(Number(z.x), za, Number(z.z));
    return `<g class="iso-zone" data-act="dashRack" data-id="${esc(z.id)}"><title>${esc(z.name)}: ${n} uds.</title><polygon points="${pts([[x0, za, z0], [x1, za, z0], [x1, za, z1], [x0, za, z1]])}" style="fill:${esc(z.color || '#888')};stroke:${esc(z.color || '#888')}"/>
      <text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle">${esc(z.name)}${n ? ` (${n})` : ''}</text></g>`;
  }).join('');
  const zs = zoneSvg(false), zsUp = zoneSvg(true);
  const slabs = (L.plantas || []).map(p => { const al = Number(p.altura) || 0, w = Number(p.w) || 8, d = Number(p.d) || 6, x = Number(p.x) || 0, z = Number(p.z) || 0; const [lx, ly] = P(x - w / 2 + 0.6, al + 0.9, z - d / 2 + 0.6);
    all.push([x + w / 2, al + 3, z + d / 2], [x - w / 2, al + 3, z - d / 2]);
    return `<g class="iso-slab"><title>${esc(p.nombre)}</title>${[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => `<line x1="${P(x + sx * w / 2, 0, z + sz * d / 2)[0].toFixed(1)}" y1="${P(x + sx * w / 2, 0, z + sz * d / 2)[1].toFixed(1)}" x2="${P(x + sx * w / 2, al, z + sz * d / 2)[0].toFixed(1)}" y2="${P(x + sx * w / 2, al, z + sz * d / 2)[1].toFixed(1)}" class="iso-slab-post"/>`).join('')}
      <polygon points="${pts([[x - w / 2, al, z - d / 2], [x + w / 2, al, z - d / 2], [x + w / 2, al, z + d / 2], [x - w / 2, al, z + d / 2]])}" class="iso-slab-top"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="iso-obj-label">${esc(p.nombre)}</text></g>`; }).join('');
  const planImg = L.plan && L.plan.image ? (() => { const [e, f] = P(-W / 2, 0, -D / 2); return `<image href="${L.plan.image}" x="0" y="0" width="${W}" height="${D}" preserveAspectRatio="none" opacity="${Math.min(0.85, (L.plan.opacity ?? 0.6))}" transform="matrix(${(0.866 * K).toFixed(3)} ${(0.5 * K).toFixed(3)} ${(-0.866 * K).toFixed(3)} ${(0.5 * K).toFixed(3)} ${e.toFixed(1)} ${f.toFixed(1)})"/>`; })() : '';
  const objs = (L.objects || []).map(o => {
    const oa = plantaAlt(L, o.planta), g = objGeom(o), b = {x0: g.x0, x1: g.x1, z0: g.z0, z1: g.z1, y0: oa};
    let svg;
    if (!g.h) svg = `<polygon class="iso-obj-floor" points="${pts([[g.x0, oa, g.z0], [g.x1, oa, g.z0], [g.x1, oa, g.z1], [g.x0, oa, g.z1]])}" style="fill:${g.T.c};stroke:${g.T.c}"/>`;
    else svg = `<g class="iso-obj ${o.type === 'oficina' ? 'glass' : ''}" style="--oc:${g.T.c}">${prism(b, g.h, 'iso-obj-face')}</g>`;
    const [lx, ly] = P(g.x, oa + (g.h || 0) + 0.35, g.z);
    return {up: !!plantaOf(L, o.planta), k: g.x0 + g.z0, svg: `<g><title>${esc(g.T.l)}${o.name ? ': ' + esc(o.name) : ''}</title>${svg}${g.label ? `<text class="iso-obj-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${esc(g.label)}</text>` : ''}</g>`, flat: !g.h};
  });
  const rackSvg = b => {
    const fb = plantaAlt(L, b.r.planta);
    const shadow = b.y0 > fb ? `<polygon class="iso-shadow" points="${pts([[b.x0, fb, b.z0], [b.x1, fb, b.z0], [b.x1, fb, b.z1], [b.x0, fb, b.z1]])}"/><line class="iso-drop" x1="${P(b.x1, fb, b.z1)[0].toFixed(1)}" y1="${P(b.x1, fb, b.z1)[1].toFixed(1)}" x2="${P(b.x1, b.y0, b.z1)[0].toFixed(1)}" y2="${P(b.x1, b.y0, b.z1)[1].toFixed(1)}"/>` : '';
    const shelves = [...Array(b.lv - 1)].map((_, k) => { const y = b.y0 + (k + 1) * SH + 0.12; return `<polyline class="iso-shelf" points="${pts([[b.x0, y, b.z1], [b.x1, y, b.z1], [b.x1, y, b.z0]])}"/>`; }).join('');
    const [lx, ly] = P((b.x0 + b.x1) / 2, b.y0 + b.h + 0.55, (b.z0 + b.z1) / 2);
    return `<g class="iso-rack" data-act="dashRack" data-id="${esc(b.r.id)}" style="--fill:${(0.35 + b.rate * 0.65).toFixed(2)}"><title>Estantería ${esc(b.r.name)}: ${b.n} uds. (${Math.round(b.rate * 100)} % lleno)</title>
      ${shadow}${b.n ? `<g class="iso-fill">${prism(b, Math.max(0.12, b.h * b.rate), 'iso-solid')}</g>` : ''}${prism(b, b.h, 'iso-glass')}${shelves}
      <text class="iso-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${esc(b.r.name)}</text></g>`;
  };
  const rk = boxes.filter(b => !b.up).map(rackSvg).join(''), rkUp = boxes.filter(b => b.up).map(rackSvg).join('');
  const pp = all.map(p => P(...p)), xs = pp.map(p => p[0]), ys = pp.map(p => p[1]);
  const pad = 26, minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad, vw = Math.max(...xs) - minX + pad, vh = Math.max(...ys) - minY + pad;
  return {cap, pct: cap ? used / cap : 0, name: almacenes().length > 1 ? A.nombre : '', racks: boxes.map(b => ({id: b.r.id, name: b.r.name, n: b.n, rate: b.rate})),
    svg: `<svg class="iso" viewBox="${minX.toFixed(0)} ${minY.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" role="img" aria-label="Vista isométrica del almacén">${floor}${planImg}${objs.filter(o => o.flat && !o.up).map(o => o.svg).join('')}${zs}${objs.filter(o => !o.flat && !o.up).sort((a, b) => a.k - b.k).map(o => o.svg).join('')}${rk}${slabs}${objs.filter(o => o.flat && o.up).map(o => o.svg).join('')}${zsUp}${objs.filter(o => !o.flat && o.up).sort((a, b) => a.k - b.k).map(o => o.svg).join('')}${rkUp}${doorsSvg}</svg>`};
}
function sparkSVG(v, kind) {
  const W = 84, H = 30, max = Math.max(1, ...v), step = W / (v.length - 1);
  const p = v.map((n, k) => [(k * step).toFixed(1), (H - 3 - n / max * (H - 6)).toFixed(1)]);
  const line = p.map(q => q.join(',')).join(' ');
  return `<svg class="spark spark-${kind}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polygon points="0,${H} ${line} ${W},${H}" class="spark-area"/><polyline points="${line}" class="spark-line"/></svg>`;
}
function dashAnimate(root) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.dash-hero, .dash-r1, .dash-r2, .dash-r3').forEach(el => el.classList.add('dash-in'));
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = Number(el.dataset.count) || 0; if (!to) return;
    const t0 = performance.now(), dur = 1100;
    const tick = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString('es-ES'); if (k < 1) requestAnimationFrame(tick); };
    el.textContent = '0'; requestAnimationFrame(tick);
  });
}

/* ---------- Puertas del almacén ---------- */
const DOOR_WALLS = {N: 'Fondo (arriba en la planta)', S: 'Frente (abajo en la planta)', O: 'Izquierda', E: 'Derecha'};
// Devuelve cada puerta con su pared y sus extremos en coordenadas del almacén.
const isShaped = L => Array.isArray(L.shape) && L.shape.length >= 3;
function floorPoly(L) {
  const W = Number(L.width) || 30, D = Number(L.depth) || 20;
  return isShaped(L) ? L.shape.map(p => [Number(p[0]) || 0, Number(p[1]) || 0]) : [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
}
function pointInPoly(pt, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > pt[1]) !== (P[j][1] > pt[1])) && (pt[0] < (P[j][0] - P[i][0]) * (pt[1] - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; }
// Tramos de pared. En un rectángulo conservan los nombres de siempre (N, S, O, E).
function wallList(L) {
  const W = Number(L.width) || 30, D = Number(L.depth) || 20;
  const raw = isShaped(L) ? floorPoly(L).map((a, i, P) => ({id: 'e' + i, a, b: P[(i + 1) % P.length]}))
    : [{id: 'N', a: [-W / 2, -D / 2], b: [W / 2, -D / 2]}, {id: 'S', a: [-W / 2, D / 2], b: [W / 2, D / 2]}, {id: 'O', a: [-W / 2, -D / 2], b: [-W / 2, D / 2]}, {id: 'E', a: [W / 2, -D / 2], b: [W / 2, D / 2]}];
  const P = floorPoly(L);
  return raw.map((w, k) => {
    const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], len = Math.hypot(dx, dz) || 1, u = [dx / len, dz / len], mid = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2];
    let n = [-u[1], u[0]]; if (!pointInPoly([mid[0] + n[0] * 0.05, mid[1] + n[1] * 0.05], P)) n = [-n[0], -n[1]];
    return {...w, len, u, n, mid, label: isShaped(L) ? `Pared ${k + 1} (${len.toFixed(1).replace('.', ',')} m)` : DOOR_WALLS[w.id]};
  });
}
function doorGeom(L) {
  const walls = wallList(L);
  return (L.doors || []).map(d => {
    const wl = walls.find(w => w.id === d.wall) || walls[0];
    const w = Math.min(wl.len, Math.max(0.5, Number(d.width) || 2)), c = Math.min(wl.len / 2 - w / 2, Math.max(-wl.len / 2 + w / 2, Number(d.pos) || 0));
    const pt = t => [wl.mid[0] + wl.u[0] * t, wl.mid[1] + wl.u[1] * t];
    return {d, wall: wl, a: c - w / 2, b: c + w / 2, c, w, A: pt(c - w / 2), B: pt(c + w / 2), C: pt(c), n: wl.n, u: wl.u};
  });
}
// Tramos de pared que quedan entre puertas, como pares de puntos.
function wallSegs(L) {
  const doors = doorGeom(L), out = [];
  wallList(L).forEach(wl => {
    const ops = doors.filter(g => g.wall.id === wl.id).map(g => [g.a, g.b]).sort((x, y) => x[0] - y[0]);
    let cur = -wl.len / 2; const pt = t => [wl.mid[0] + wl.u[0] * t, wl.mid[1] + wl.u[1] * t];
    ops.forEach(([a, b]) => { if (a > cur) out.push([pt(cur), pt(a)]); cur = Math.max(cur, b); });
    if (cur < wl.len / 2) out.push([pt(cur), pt(wl.len / 2)]);
  });
  return out;
}
// Formas rápidas a partir del ancho y el fondo
function shapePreset(kind, W, D) {
  const w = W / 2, d = D / 2, cw = Math.round(W * 0.4 * 2) / 2, cd = Math.round(D * 0.45 * 2) / 2;
  if (kind === 'L') return [[-w, -d], [w - cw, -d], [w - cw, -d + cd], [w, -d + cd], [w, d], [-w, d]];
  if (kind === 'U') { const nw = Math.round(W * 0.34 * 2) / 2; return [[-w, -d], [-nw / 2, -d], [-nw / 2, -d + cd], [nw / 2, -d + cd], [nw / 2, -d], [w, -d], [w, d], [-w, d]]; }
  if (kind === 'T') { const sw = Math.round(W * 0.28 * 2) / 2; return [[-w, -d], [w, -d], [w, -d + cd], [sw / 2, -d + cd], [sw / 2, d], [-sw / 2, d], [-sw / 2, -d + cd], [-w, -d + cd]]; }
  return null;
}

/* =========================================================
   Plano de fondo y elementos fijos del almacén
   ========================================================= */
const OBJ_TYPES = {
  pasillo: {l: 'Pasillo', w: 2, d: 12, h: 0, c: '#94A3B8'},
  pilar: {l: 'Pilar', w: 0.5, d: 0.5, h: 3.2, c: '#9CA3AF'},
  pared: {l: 'Tabique', w: 6, d: 0.15, h: 2.6, c: '#CBD5E1'},
  oficina: {l: 'Oficina', w: 5, d: 4, h: 2.6, c: '#3B82F6'},
  mesa: {l: 'Mesa de trabajo', w: 2, d: 0.9, h: 0.9, c: '#B45309'},
  embalaje: {l: 'Puesto de embalaje', w: 2.5, d: 1.2, h: 0.9, c: '#0F766E'},
  extintor: {l: 'Extintor', w: 0.35, d: 0.35, h: 0.7, c: '#DC2626'},
  salida: {l: 'Salida de emergencia', w: 1.6, d: 0.6, h: 0, c: '#16A34A'}
};
function objGeom(o) {
  const T = OBJ_TYPES[o.type] || OBJ_TYPES.pilar, rot = Number(o.rot) === 90;
  const w0 = Number(o.w) || T.w, d0 = Number(o.d) || T.d, w = rot ? d0 : w0, d = rot ? w0 : d0;
  const x = Number(o.x) || 0, z = Number(o.z) || 0;
  return {T, x, z, w, d, h: T.h, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, label: o.name || (['oficina', 'mesa', 'embalaje', 'salida'].includes(o.type) ? T.l : '')};
}
// Convierte una foto o la primera página de un PDF en una imagen ligera para el suelo del mapa.
async function processPlan(file) {
  let cv;
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    await AlbReader.loadScript('vendor/pdfjs/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({data: await file.arrayBuffer(), isEvalSupported: false}).promise;
    const page = await pdf.getPage(1), v0 = page.getViewport({scale: 1}), k = 1800 / Math.max(v0.width, v0.height), vp = page.getViewport({scale: k});
    cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({canvasContext: ctx, viewport: vp}).promise;
  } else {
    if (!/^image\//.test(file.type)) throw new Error('Sube una imagen (JPG, PNG) o un PDF.');
    const bmp = await createImageBitmap(file), k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
  }
  let q = 0.82, url = cv.toDataURL('image/jpeg', q);
  while (url.length > 1100000 && q > 0.4) { q -= 0.12; url = cv.toDataURL('image/jpeg', q); }
  if (url.length > 1400000) throw new Error('El plano es demasiado grande. Prueba con una imagen más pequeña.');
  return {url, ratio: cv.width / cv.height};
}

/* =========================================================
   Mapa de calor y ruta de recogida en el mapa 3D
   ========================================================= */
const HEAT_MODES = {occ: 'Ocupación', age: 'Antigüedad del material', mov: 'Movimiento (30 días)'};
function heatColor(t) { t = Math.max(0, Math.min(1, t)); return `hsl(${Math.round(130 * (1 - t))}, 72%, ${t > 0.5 ? 46 : 42}%)`; }
function heatValues() {
  const A = almById(mapAlm()); if (!A) return {};
  const items = mapVisibleItems(), now = Date.now(), out = {};
  const by = {}; items.forEach(i => { (by[i.data.ubicacion] = by[i.data.ubicacion] || []).push(i); });
  const racks = (A.layout.racks || []);
  if (S.mapHeat === 'occ') racks.forEach(r => { const n = (by[r.id] || []).reduce((a, i) => a + qtyOf(i), 0), cap = Math.max(1, Math.floor(((Number(r.len) || 4) - 0.1) / 0.4)) * 4 * Math.max(1, Number(r.levels) || 4); out[r.id] = {t: Math.min(1, n / cap), text: `ocupación ${Math.round(Math.min(1, n / cap) * 100)} %`}; });
  if (S.mapHeat === 'age') racks.forEach(r => { const its = by[r.id] || []; if (!its.length) return; const avg = its.reduce((a, i) => a + Math.max(0, (now - new Date(i.data.fecha_entrada ? i.data.fecha_entrada + 'T00:00:00' : i.createdAt)) / 86400000), 0) / its.length; out[r.id] = {t: Math.min(1, avg / 365), text: `antigüedad media ${Math.round(avg)} días`}; });
  if (S.mapHeat === 'mov') {
    const cnt = {}; racks.forEach(r => { cnt[r.id] = (by[r.id] || []).reduce((a, i) => a + (i.history || []).filter(h => now - new Date(h.t) < 30 * 86400000).length, 0); });
    const max = Math.max(1, ...Object.values(cnt));
    racks.forEach(r => { if (cnt[r.id] || (by[r.id] || []).length) out[r.id] = {t: cnt[r.id] / max, text: `${cnt[r.id]} movimientos en 30 días`}; });
  }
  return out;
}
// Calcula el recorrido de recogida: desde la puerta, por cada ubicación, en el orden más corto.
function pickRoute(o) {
  const A = almById(o.almacen) || almById(almOfClient(o.cliente)) || almById(mapAlm()); if (!A) return null;
  const L = A.layout, racks = L.racks || [], zones = L.zones || [];
  const doors = doorGeom(L);
  const start = doors.length ? [doors[0].C[0] + doors[0].n[0] * 1.2, doors[0].C[1] + doors[0].n[1] * 1.2] : [0, (Number(L.depth) || 20) / 2 - 1];
  const byLoc = {};
  o.items.filter(x => !x.missing).forEach(x => { (byLoc[x.ubicacion || ''] = byLoc[x.ubicacion || ''] || []).push(x); });
  const stops = Object.entries(byLoc).map(([loc, its]) => {
    const r = racks.find(x => x.id === loc), z = zones.find(x => x.id === loc);
    let p, top = 1;
    if (r) { const rot = Number(r.rot) === 90, off = 0.55 + 0.75; p = rot ? [Number(r.x) + off, Number(r.z)] : [Number(r.x), Number(r.z) + off]; top = (Number(r.elev) || 0) + Math.max(1, Number(r.levels) || 4) * 0.62 + 0.25; }
    else if (z) p = [Number(z.x), Number(z.z)];
    else return null;
    return {loc, name: locName(loc), p, top, items: its, done: its.every(x => x.picked)};
  }).filter(Boolean);
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  // Vecino más cercano y mejora 2-opt
  const order = []; let cur = start; const left = stops.slice();
  while (left.length) { let bi = 0; left.forEach((st, i) => { if (dist(cur, st.p) < dist(cur, left[bi].p)) bi = i; }); cur = left[bi].p; order.push(left.splice(bi, 1)[0]); }
  const total = arr => arr.reduce((a, st, i) => a + dist(i ? arr[i - 1].p : start, st.p), 0);
  let improved = true;
  for (let it = 0; improved && it < 50; it++) { improved = false; for (let i = 0; i < order.length - 1; i++) for (let j = i + 1; j < order.length; j++) { const cand = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1)); if (total(cand) < total(order) - 0.01) { order.splice(0, order.length, ...cand); improved = true; } } }
  return {start, stops: order, length: Math.round(total(order))};
}
async function loadRouteOrder() {
  if (!S.route) return;
  try { S.routeOrder = await API('GET', '/api/orders/' + encodeURIComponent(S.route)); } catch (ex) { toast(ex.message, 'err'); S.route = null; S.routeOrder = null; }
  if (S.view === 'mapa') { Map3D.buildRoute(); renderMapSide(); }
}
function routePanelHTML() {
  const o = S.routeOrder; if (!S.route) return '';
  if (!o) return '<section class="panel"><div class="panel-b"><p class="muted" style="margin:0">Cargando la ruta…</p></div></section>';
  const R = pickRoute(o); if (!R) return '';
  const done = R.stops.filter(x => x.done).length;
  return `<section class="panel route-panel"><div class="panel-h"><div><h3>Ruta del pedido ${esc(o.number)}</h3><span class="help">${plural(R.stops.length, 'parada')}, unos ${R.length} m. ${done}/${R.stops.length} completadas.</span></div></div>
    <div class="panel-b"><ol class="route-list">${R.stops.map((st, k) => `<li class="${st.done ? 'done' : ''}" data-act="routeStop" data-loc="${esc(st.loc)}"><span class="route-n">${st.done ? '✓' : k + 1}</span><div><b>${esc(st.name)}</b>${st.items.map(x => `<span class="help">${x.nivel ? 'Balda ' + esc(x.nivel) + (Number(x.hueco) > 0 ? ', hueco ' + esc(x.hueco) : '') + ': ' : ''}<span class="serial">${esc(x.serie || x.title)}</span>${x.qty > 1 ? ` (${x.qty} uds.)` : ''}${x.picked ? ' ✓' : ''}</span>`).join('')}</div></li>`).join('')}</ol>
    ${o.items.some(x => !x.ubicacion) ? `<p class="help">${o.items.filter(x => !x.ubicacion).length} unidades sin ubicación no aparecen en la ruta.</p>` : ''}
    <div class="row" style="margin-top:10px"><a class="btn sm" href="#/pedidos/${esc(o.id)}">${ico('clipboard')}Abrir pedido</a><button class="btn sm ghost" data-act="routeExit">Salir de la ruta</button></div></div></section>`;
}

/* =========================================================
   Huecos y etiquetas QR de ubicación
   ========================================================= */
async function placeCode(raw) {
  const code = String(raw || '').trim(); if (!code) return;
  const log = (t, ok) => { S.placeLog = [{t, ok}].concat(S.placeLog || []).slice(0, 20); const el = $('#place-log'); if (el) el.innerHTML = S.placeLog.slice(0, 6).map(l => `<div class="${l.ok ? 'ok' : 'err'}">${esc(l.t)}</div>`).join(''); };
  const loc = parseLocQR(code);
  if (loc) {
    if (!rackById(loc.ubicacion)) { beep(false); log('Esa etiqueta es de una estantería que ya no existe.', false); return; }
    S.placeLoc = loc; beep(); renderMain(); setTimeout(() => $('#place-code') && $('#place-code').focus(), 30); return;
  }
  if (!S.placeLoc) { beep(false); log('Primero escanea la etiqueta de la ubicación.', false); return; }
  const it = findBySerial(cleanScan(code)) || (/^LBR\|/.test(code) ? Store.items[code.split('|')[3]] : null);
  if (!it) { beep(false); log(`${cleanScan(code)}: no está en el inventario.`, false); return; }
  const r = clone(it), before = locCode(r.data);
  r.data.ubicacion = S.placeLoc.ubicacion; r.data.nivel = S.placeLoc.nivel || 1; r.data.hueco = S.placeLoc.hueco || '';
  r.updatedAt = nowISO(); r.updatedBy = Auth.user.username;
  hist(r, 'Ubicación', `${before || 'Sin ubicación'} → ${locCode(r.data)}`);
  try { await Store.putItem(r); beep(); log(`${it.data.serie || itemTitle(it)} → ${locCode(r.data)}`, true); Store.log('movimiento', `${it.data.serie || itemTitle(it)} colocado en ${locCode(r.data)}`, it.id); }
  catch (ex) { beep(false); log(ex.message, false); }
}
async function locLabels() {
  const d = draft(), A = d.almacenes.find(a => a.id === S.almSel) || d.almacenes[0];
  const racks = (A.layout.racks || []);
  if (!racks.length) { toast('Este almacén no tiene estanterías.', 'warn'); return; }
  const labels = [];
  racks.forEach(r => { const lv = Math.max(1, Number(r.levels) || 1), nh = Math.max(0, Number(r.huecos) || 0);
    for (let n = 1; n <= lv; n++) { if (nh > 0) for (let h = 1; h <= nh; h++) labels.push({code: `${r.name}-${n}-${h}`, sub: `Estantería ${r.name}, balda ${n}, hueco ${h}`, qr: `LOC|${r.id}|${n}|${h}`}); else labels.push({code: `${r.name}-${n}`, sub: `Estantería ${r.name}, balda ${n}`, qr: `LOC|${r.id}|${n}|0`}); } });
  if (labels.length > 1500) { toast('Demasiadas etiquetas de una vez. Reduce huecos o estanterías.', 'warn'); return; }
  toast(`Generando ${labels.length} etiquetas…`, 'info');
  const color = (Store.settings.tema || {}).primario || '#C8102E';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ubicaciones ${esc(A.nombre)}</title><style>
    @page{size:A4;margin:8mm}body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#111}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.l{border:1.5px solid #222;border-radius:2mm;padding:3mm;display:flex;gap:3mm;align-items:center;break-inside:avoid;height:34mm;border-left:5mm solid ${color}}
    .l img{width:27mm;height:27mm}.l div{display:flex;flex-direction:column;gap:1mm;min-width:0}.l b{font-size:22pt;letter-spacing:.5pt}.l span{font-size:8pt;color:#444}
    .bar{display:flex;justify-content:space-between;align-items:center;padding:8px 0}@media print{.bar{display:none}}</style></head>
    <body><div class="bar"><b>${esc(A.nombre)}: ${labels.length} etiquetas de ubicación</b><button onclick="print()">Imprimir</button></div>
    <div class="g">${labels.map(l => `<div class="l"><img src="${qrDataURL(l.qr, 200)}" alt=""><div><b>${esc(l.code)}</b><span>${esc(l.sub)}</span><span>${esc(A.nombre)}</span></div></div>`).join('')}</div></body></html>`;
  await saveFile(`ubicaciones_${slug(A.nombre)}.html`, html, 'text/html');
}

/* ---------- Plantas y altillos ---------- */
const plantaOf = (L, id) => id ? (L.plantas || []).find(p => p.id === id) : null;
const plantaAlt = (L, id) => { const p = plantaOf(L, id); return p ? Math.max(0, Number(p.altura) || 0) : 0; };
const mapPlantaVis = el => !S.mapPlanta || (S.mapPlanta === '0' ? !el.planta : el.planta === S.mapPlanta);
const editPlanta = el => (el.planta || '') === (S.plantaSel || '');

/* =========================================================
   Traspasos, retiradas, borrado de datos y certificados
   ========================================================= */
const DOC_KIND = {albaran: 'Albarán', traspaso: 'Traspaso', retirada: 'Retirada', certificado: 'Certificado'};
const EST2 = d => Object.assign({transito: 'En tránsito', retirado: 'Retirado'}, d.estadosSistema || {});
const ERASE_METHODS = ['NIST 800-88 Clear', 'NIST 800-88 Purge', 'Borrado criptográfico', 'Secure Erase del fabricante', 'Sobrescritura (3 pasadas)', 'Destrucción física del disco'];
function transferPanelHTML() {
  const T = S.tr = S.tr || {};
  const clis = listOf('clientes').filter(c => almsOfClient(c).length > 1);
  if (!clis.includes(T.cliente)) T.cliente = clis[0] || '';
  const alms = almsOfClient(T.cliente);
  if (!alms.some(a => a.id === T.origen)) T.origen = (alms.find(a => a.id === curAlm()) || alms[0] || {}).id;
  const dests = alms.filter(a => a.id !== T.origen);
  if (!dests.some(a => a.id === T.destino)) T.destino = (dests[0] || {}).id;
  T.bulk = T.bulk || [];
  const lots = Object.values(Store.items).filter(it => !(catById(it.cat) || {}).serialized && it.data.cliente === T.cliente && almOfItem(it) === T.origen && isStock(it.data.estado) && !it.data.pedido && qtyOf(it) > 0);
  return `<section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Traspaso entre almacenes</h3><span class="help">El material queda «En tránsito» hasta que el almacén de destino lo recibe.</span></div></div><div class="panel-b">
    ${!clis.length ? '<p class="muted" style="margin:0">Para traspasar, asigna el cliente a más de un almacén en Ajustes → Almacenes.</p>' : `<div class="fgrid">
      <label class="f">Cliente<select class="sel" id="tr-cliente">${clis.map(c => `<option ${c === T.cliente ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="f">Desde<select class="sel" id="tr-origen">${alms.map(a => `<option value="${esc(a.id)}" ${a.id === T.origen ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
      <label class="f">Hasta<select class="sel" id="tr-destino">${dests.map(a => `<option value="${esc(a.id)}" ${a.id === T.destino ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
      <label class="f">Transportista<input class="inp" id="tr-carrier" value="${esc(T.carrier || '')}"></label>
      <label class="f wide"><span class="row" style="justify-content:space-between">Números de serie ${scanBtn('tr-serials', true, 'Traspaso')}</span><textarea class="ta serial" id="tr-serials" rows="4" placeholder="Uno por línea">${esc(T.serials || '')}</textarea></label>
      ${lots.length ? `<div class="f wide"><span>Material por cantidad</span><div class="row"><select class="sel" id="tr-lot" style="flex:1">${lots.map(it => `<option value="${esc(it.id)}">${esc(itemTitle(it))} (${qtyOf(it)} uds.${it.data.ubicacion ? ', ' + esc(locName(it.data.ubicacion)) : ''})</option>`).join('')}</select><input class="inp" id="tr-lot-q" type="number" min="1" value="1" style="width:90px"><button class="btn" data-act="trLotAdd">${ico('plus')}Añadir</button></div>
        ${T.bulk.length ? `<div class="chips" style="margin-top:8px">${T.bulk.map((b, i) => `<span class="chip">${esc(itemTitle(Store.items[b.itemId] || {data: {}, cat: ''}))}: ${b.qty} uds. <button data-act="trLotDel" data-i="${i}" aria-label="Quitar">×</button></span>`).join('')}</div>` : ''}</div>` : ''}
      <label class="f wide">Observaciones<input class="inp" id="tr-notes" value="${esc(T.notes || '')}"></label></div>
    <div class="row" style="margin-top:14px"><span class="spacer"></span><button class="btn primary" data-act="trCreate" ${dests.length ? '' : 'disabled'}>${ico('swap')}Crear traspaso</button></div>`}
  </div></section>`;
}
function retiradaPanelHTML() {
  const R = S.rt = S.rt || {};
  const clis = listOf('clientes'); if (!clis.includes(R.cliente)) R.cliente = clis[0] || '';
  const sedes = (Store.settings.sedes || []).filter(x => x.cliente === R.cliente);
  const alms = almsOfClient(R.cliente);
  return `<section class="panel" style="margin-top:18px"><div class="panel-h"><div><h3>Retirada de equipos del cliente</h3><span class="help">Para los equipos que recogéis (renovaciones, bajas, fin de vida). Los que no están en el inventario se dan de alta solos, y se genera un albarán de retirada.</span></div></div><div class="panel-b"><div class="fgrid">
    <label class="f">Cliente<select class="sel" id="rt-cliente">${clis.map(c => `<option ${c === R.cliente ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <label class="f">Recogido en<select class="sel" id="rt-sede"><option value="">— Escribir otro sitio —</option>${sedes.map(x => `<option value="${esc(x.id)}">${esc(sedeLabel(x))}</option>`).join('')}</select></label>
    <label class="f">Otro sitio<input class="inp" id="rt-otro" placeholder="Si no está en la lista"></label>
    ${alms.length > 1 ? `<label class="f">Entra en el almacén<select class="sel" id="rt-almacen">${alms.map(a => `<option value="${esc(a.id)}" ${a.id === curAlm() ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>` : ''}
    <label class="f">Categoría<select class="sel" id="rt-cat">${cats().filter(c => c.serialized).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
    <label class="f">Marca (si es la misma para todos)<input class="inp" id="rt-marca" list="dl-marcas"></label>
    <label class="f">Modelo<input class="inp" id="rt-modelo"></label>
    <label class="f">Tipo<input class="inp" id="rt-tipo" placeholder="Portátil, Sobremesa…"></label>
    <label class="f wide"><span class="row" style="justify-content:space-between">Números de serie ${scanBtn('rt-serials', true, 'Retirada')}</span><textarea class="ta serial" id="rt-serials" rows="4" placeholder="Uno por línea"></textarea></label>
    <label class="f">Transportista<input class="inp" id="rt-carrier"></label>
    <label class="f wide">Observaciones<input class="inp" id="rt-notes" placeholder="Estado de los equipos, incidencias…"></label></div>
    <datalist id="dl-marcas">${listOf('marcas_equipo').map(m => `<option value="${esc(m)}">`).join('')}</datalist>
    <div class="row" style="margin-top:14px"><span class="spacer"></span><button class="btn primary" data-act="rtCreate">${ico('down')}Registrar retirada</button></div></div></section>`;
}
function docDone(d, title, text) {
  openLayer(modalHTML(title, `<p style="margin-top:0">${text}</p>`, `<button class="btn" data-close>Cerrar</button><a class="btn primary" href="${pdfUrl(d.id)}" target="_blank" rel="noopener" data-act="noop">${ico('file')}Abrir PDF</a>`, 'narrow'));
}
function openEraseForm(ids) {
  const items = ids.map(id => Store.items[id]).filter(Boolean);
  const L = openLayer(modalHTML(`Registrar borrado de datos (${plural(items.length, 'equipo')})`, `<div class="fgrid">
    <label class="f">Método<select class="sel" id="er-metodo">${ERASE_METHODS.map(m => `<option>${m}</option>`).join('')}</select></label>
    <label class="f">Herramienta o software<input class="inp" id="er-herr" placeholder="Blancco, KillDisk, BIOS Secure Erase…"></label>
    <label class="f">Fecha<input class="inp" type="date" id="er-fecha" value="${new Date().toISOString().slice(0, 10)}"></label>
    <label class="f">Técnico<input class="inp" id="er-tec" value="${esc(Auth.user.name || Auth.user.username)}"></label>
    <label class="f">Resultado<select class="sel" id="er-res"><option>Correcto</option><option>Fallido</option></select></label>
    <label class="f">Cambiar estado a<select class="sel" id="er-estado"><option value="">Sin cambios</option>${listOf('estados').map(v => `<option>${esc(v)}</option>`).join('')}</select></label>
    <label class="f wide">Observaciones<input class="inp" id="er-notas"></label></div>
    <p class="help" style="margin:12px 0 0">Queda registrado en la ficha e historial de cada equipo y aparecerá en el certificado de borrado.</p><div id="er-err" class="err-msg hide" style="margin-top:10px"></div>`,
    `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="er-ok">${ico('shield')}Registrar</button>`));
  $('#er-ok', L.el).onclick = async () => {
    try {
      const r = await API('POST', '/api/erasures', {itemIds: ids, metodo: $('#er-metodo', L.el).value, herramienta: $('#er-herr', L.el).value, fecha: $('#er-fecha', L.el).value, tecnico: $('#er-tec', L.el).value, resultado: $('#er-res', L.el).value, estado: $('#er-estado', L.el).value, notas: $('#er-notas', L.el).value});
      closeLayer(L); toast(`Borrado registrado en ${plural(r.count, 'equipo')}.`);
    } catch (ex) { const e = $('#er-err', L.el); e.textContent = ex.message; e.classList.remove('hide'); }
  };
}

/* ---------- Pantalla de carga ---------- */
const SPLASH_T0 = performance.now();
function hideSplash() {
  const sp = document.querySelector('body > #splash'); if (!sp || sp.dataset.leaving) return;
  sp.dataset.leaving = '1';
  const min = Number(((window.__splash || {}).minMs) ?? 650);
  const wait = Math.max(0, (isNaN(min) ? 650 : min) - (performance.now() - SPLASH_T0));
  setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 500); }, wait);
}
// Guarda nombre, logotipo y color para pintar la pantalla de carga de la próxima visita al instante.
function saveSplash() {
  try {
    const v = splashCfg(Store.settings);
    const old = LS.get('lbinv.splash', null);
    if (JSON.stringify(old) !== JSON.stringify(v)) LS.set('lbinv.splash', v);
  } catch {}
}

function splashCfg(st) {
  const B = brandOf(st), P = st.splash || {}, color = (st.tema || {}).primario || '#C8102E';
  return {enabled: P.enabled !== false, show: P.show || 'auto', title: P.title || '', sub: P.sub !== '' && P.sub !== undefined ? P.sub : (B.subtitle || 'Control de almacén'), msg: P.msg || '',
    anim: P.anim || 'rack', bg: P.bg || 'auto', minMs: Number(P.minMs ?? 650), company: B.company || st.company || '', color,
    logo: B.mode === 'image' && B.logo && B.logo.length < 400000 ? B.logo : '', logoBg: B.bg};
}
// Vista previa dentro de la aplicación, con los ajustes que se están editando.
function previewSplash() {
  const old = document.getElementById('splash-prev'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'splash-prev';
  el.innerHTML = `<div id="splash" class="prev" title="Pulsa para cerrar"><div class="sp-in">
    <svg class="sp-rack" viewBox="0 0 120 96" fill="none" aria-hidden="true">${[[22,14],[44,14],[66,44],[22,44],[44,74],[66,74]].map(([x, y]) => `<rect class="box" x="${x}" y="${y}" width="18" height="16" rx="2"/>`).join('')}<path class="post" d="M14 4v90M106 4v90"/><path class="shelf" d="M14 32h92M14 62h92M14 92h92"/></svg>
    <img id="sp-logo" alt="" hidden><div id="sp-name"></div><div id="sp-sub"></div><div class="sp-bar"><i></i></div><div id="sp-msg"></div></div>
    <span class="prev-tag">Vista previa · pulsa para cerrar</span></div>`;
  document.body.appendChild(el);
  const sp = el.firstElementChild;
  if (window.applySplashTo) window.applySplashTo(splashCfg(draft()), sp);
  const close = () => { sp.classList.add('out'); setTimeout(() => el.remove(), 450); };
  sp.addEventListener('click', close); setTimeout(close, 4000);
}
