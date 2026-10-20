// Rellena la pantalla de carga con el nombre o el logotipo de la empresa (guardados de la última visita).
(function () {
  var sp = window.__splash, n = document.getElementById('sp-name'), lg = document.getElementById('sp-logo'), sub = document.getElementById('sp-sub');
  try {
    if (sp && sp.logo && /^data:image\//.test(sp.logo)) { lg.src = sp.logo; lg.hidden = false; n.hidden = true; if (sp.bg === 'white') lg.className = 'on-white'; }
    else if (sp && sp.company) n.textContent = sp.company;
    if (sp && sp.sub) sub.textContent = sp.sub;
  } catch (e) {}
})();
