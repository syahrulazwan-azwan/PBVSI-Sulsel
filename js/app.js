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

  // ---------- Data resmi PORPROV (tim + jadwal) ikut di link, terkunci PIN ----------
  // File data/porprov-2026.enc.json berisi data terenkripsi (AES-GCM, kunci dari PIN via PBKDF2).
  // Di tiap perangkat PIN cukup diketik sekali; pembaruan data berikutnya masuk otomatis.
  var DATA_URL = 'data/porprov-2026.enc.json';
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function normPin(p) { return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function decrypt(enc, pin) {
    var c = window.crypto && window.crypto.subtle;
    if (!c) return Promise.reject(new Error('Browser tidak mendukung enkripsi'));
    return c.importKey('raw', new TextEncoder().encode(normPin(pin)), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return c.deriveKey({ name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (key) {
      return c.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.ct));
    }).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  function applyData(enc, d, pin) {
    var st = window.VBStore.importData({ teams: d.teams || [], matches: d.matches || [], competitions: d.competitions || [] }, 'merge');
    if (d.event) window.VBStore.setSetting('eventData', d.event);
    window.VBStore.setSetting('dataPin', normPin(pin));
    window.VBStore.setSetting('seedLoaded', enc.seed);
    return st;
  }
  function askPin(enc, msg) {
    var inp;
    U.modal({
      title: 'Data PORPROV XVIII/2026',
      body: '<p>Masukkan PIN data untuk memuat semua tim dan jadwal pertandingan ke perangkat ini. Cukup sekali saja.</p>' +
        (msg ? '<p class="alert">' + U.esc(msg) + '</p>' : '') +
        '<label>PIN data<input id="dpin" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="mis. ABCD-1234"></label>',
      onOpen: function (root) { inp = U.qs('#dpin', root); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') U.qs('.modal-foot .primary', root).click(); }); },
      actions: [{ label: 'Nanti', value: null }, { label: 'Buka data', cls: 'primary', value: 'ok' }]
    }).then(function (v) {
      if (v !== 'ok') return;
      var pin = inp.value;
      decrypt(enc, pin).then(function (d) {
        var st = applyData(enc, d, pin);
        U.toast('Data dimuat: ' + (d.teams || []).length + ' tim, ' + (d.matches || []).length + ' pertandingan');
        route();
        return st;
      }).catch(function () { askPin(enc, 'PIN salah. Coba lagi.'); });
    });
  }
  /** force=true: tampilkan isian PIN walau data sudah termuat (tombol di halaman Scoresheet) */
  function loadData(force) {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return;
    fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (enc) {
      if (!enc || !enc.ct) return;
      var set = window.VBStore.settings();
      if (!force && set.seedLoaded === enc.seed) return;
      if (set.dataPin && !force) {
        decrypt(enc, set.dataPin).then(function (d) {
          var st = applyData(enc, d, set.dataPin);
          if (st.added || st.updated) { U.toast('Data PORPROV diperbarui'); route(); }
        }).catch(function () { askPin(enc, 'PIN data sudah diganti. Masukkan PIN yang baru.'); });
      } else askPin(enc);
    }).catch(function () { /* offline – pakai data yang sudah ada */ });
  }

  VB.app = { route: route, loadData: loadData };
  route();
  loadData(false);

  // Mode offline (PWA) – hanya saat dibuka lewat http/https (mis. GitHub Pages)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW gagal', e); });
    });
  }
})();
