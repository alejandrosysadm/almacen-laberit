// Se ejecuta antes de pintar nada: aplica el tema y el color guardados para que la pantalla de carga ya salga con ellos.
(function () {
  try {
    var th = JSON.parse(localStorage.getItem('lbinv.theme') || 'null');
    if (th) document.documentElement.dataset.theme = th;
    var sp = JSON.parse(localStorage.getItem('lbinv.splash') || 'null');
    if (sp && /^#[0-9a-fA-F]{6}$/.test(sp.color || '')) document.documentElement.style.setProperty('--sp-c', sp.color);
    if (sp && sp.enabled === false) document.documentElement.classList.add('no-splash');
    window.__splash = sp;
  } catch (e) {}
})();
