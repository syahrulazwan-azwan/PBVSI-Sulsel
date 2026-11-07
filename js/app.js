/* Router sederhana berbasis hash (#/...) */
(function () {
  'use strict';
  var U = window.VBUI;
  var current = null;

  var routes = {
    '': 'jadwal', jadwal: 'jadwal', tim: 'tim', wasit: 'wasit', bagan: 'bagan', cetak: 'cetak'
  };

  function route() {
    var parts = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    var name = routes[parts[0]] || 'jadwal';
    var view = VB.views[name];
    if (current && current.destroy) current.destroy();
    current = view;
    var el = U.qs('#app');
    el.className = 'app view-' + name;

    U.qsa('#mainnav a').forEach(function (a) {
      var nav = a.dataset.nav;
      a.classList.toggle('active', nav === name || (nav === 'jadwal' && name === 'cetak'));
    });
    try {
      view.render(el, parts[1]);
    } catch (e) {
      console.error(e);
      el.innerHTML = '<div class="alert">Terjadi kesalahan: ' + U.esc(e.message) + '</div>';
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  VB.app = { route: route };
  route();

  // Mode offline (PWA) – hanya saat dibuka lewat http/https (mis. GitHub Pages)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW gagal', e); });
    });
  }
})();
