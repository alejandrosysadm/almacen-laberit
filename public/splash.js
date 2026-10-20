// Rellena la pantalla de carga con lo configurado en Ajustes (guardado de la última visita).
(function () {
  var sp = window.__splash || {}, el = document.getElementById('splash');
  if (el) window.applySplash = function (cfg, root) { applySplashTo(cfg, root || el); };
  function applySplashTo(c, root) {
    var n = root.querySelector('#sp-name'), lg = root.querySelector('#sp-logo'), sub = root.querySelector('#sp-sub'), msg = root.querySelector('#sp-msg');
    root.setAttribute('data-anim', c.anim || 'rack'); root.setAttribute('data-bg', c.bg || 'auto');
    if (c.color) root.style.setProperty('--sp-c', c.color);
    var useLogo = c.show !== 'text' && c.logo && /^data:image\//.test(c.logo);
    lg.hidden = !useLogo; n.hidden = !!useLogo;
    if (useLogo) { lg.src = c.logo; lg.className = c.logoBg === 'white' ? 'on-white' : ''; }
    n.textContent = c.title || c.company || 'Laberit';
    sub.textContent = c.sub !== undefined && c.sub !== '' ? c.sub : 'Control de almacén';
    msg.textContent = c.msg || '';
  }
  window.applySplashTo = applySplashTo;
  try { if (el) applySplashTo(sp, el); } catch (e) {}
})();
