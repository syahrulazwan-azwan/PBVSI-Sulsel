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
    var st = window.VBStore.importData({ teams: d.teams || [], matches: d.matches || [], competitions: d.competitions || [], referees: d.referees || [] }, 'merge');
    if (d.event) window.VBStore.setSetting('eventData', d.event);
    window.VBStore.setSetting('dataPin', normPin(pin));
    window.VBStore.setSetting('seedLoaded', enc.seed);
    st.cleaned = cleanTestData(d);
    return st;
  }
  /** Hapus data uji coba / contoh: tim di luar data resmi, pertandingannya, dan wasit uji/contoh.
   *  Salinan yang dihapus disimpan di localStorage (vb-cadangan-data-uji) untuk berjaga-jaga. */
  function cleanTestData(d) {
    var S = window.VBStore, ok = {};
    (d.teams || []).forEach(function (t) { ok[t.id] = 1; });
    var gone = { teams: [], matches: [], referees: [] };
    S.list('teams').forEach(function (t) { if (!ok[t.id]) gone.teams.push(t); });
    var bad = {}; gone.teams.forEach(function (t) { bad[t.id] = 1; });
    S.list('matches').forEach(function (m) {
      if (bad[m.teamA] || bad[m.teamB] || /^uji-/.test(m.id) || (m.teamA && !S.get('teams', m.teamA)) || (m.teamB && !S.get('teams', m.teamB))) gone.matches.push(m);
    });
    var SAMPLE = ['ASISTEN PENCATAT', 'HAKIM GARIS SATU', 'HAKIM GARIS DUA'];   // wasit dari "data contoh" lama
    S.list('referees').forEach(function (r) {
      var n = String(r.name || '').trim().toUpperCase();
      if (/\bUJI\b|\bCONTOH\b/.test(n) || SAMPLE.indexOf(n) >= 0) gone.referees.push(r);
    });
    var n = gone.teams.length + gone.matches.length + gone.referees.length;
    if (!n) return 0;
    try { localStorage.setItem('vb-cadangan-data-uji', JSON.stringify(gone)); } catch (e) { /* abaikan */ }
    gone.matches.forEach(function (m) { S.remove('matches', m.id); });
    gone.teams.forEach(function (t) { S.remove('teams', t.id); });
    gone.referees.forEach(function (r) { S.remove('referees', r.id); });
    return n;
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
        U.toast('Data dimuat: ' + (d.teams || []).length + ' tim, ' + (d.matches || []).length + ' pertandingan' + (st.cleaned ? ' (data uji coba dibersihkan)' : ''));
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
          if (st.added || st.updated || st.cleaned) { U.toast('Data PORPROV diperbarui' + (st.cleaned ? ', data uji coba dibersihkan' : '')); route(); }
        }).catch(function () { askPin(enc, 'PIN data sudah diganti. Masukkan PIN yang baru.'); });
      } else askPin(enc);
    }).catch(function () { /* offline – pakai data yang sudah ada */ });
  }

  // ---------- Terbitkan perubahan dari perangkat ini ke semua HP ----------
  function b64e(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function encrypt(obj, pin) {
    var c = window.crypto.subtle, salt = window.crypto.getRandomValues(new Uint8Array(16)), iv = window.crypto.getRandomValues(new Uint8Array(12)), iter = 250000;
    return c.importKey('raw', new TextEncoder().encode(normPin(pin)), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return c.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    }).then(function (key) {
      return c.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    }).then(function (ct) {
      var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
      var seed = 'porprov-2026-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
      return { v: 1, seed: seed, iter: iter, salt: b64e(salt), iv: b64e(iv), ct: b64e(ct) };
    });
  }
  function publishData() {
    var S = window.VBStore, pin = S.settings().dataPin;
    if (!pin) { U.toast('Masukkan PIN data dulu (tombol 🔑 Muat data PORPROV).', 'error'); return; }
    if (!(window.crypto && window.crypto.subtle)) { U.toast('Browser ini tidak mendukung. Pakai Chrome di laptop.', 'error'); return; }
    var ev = VB.views.jadwal.eventData();
    var payload = { teams: S.list('teams'), matches: S.list('matches'), referees: S.list('referees'), competitions: S.list('competitions', function (c) { return c.id === 'porprov-2026'; }), event: ev };
    U.toast('Menyiapkan file…');
    encrypt(payload, pin).then(function (enc) {
      var text = JSON.stringify(enc);
      function done(saved) {
        S.setSetting('seedLoaded', enc.seed);
        U.modal({
          title: 'File siap', body: '<p>' + (saved ? 'File <b>porprov-2026.enc.json</b> sudah disimpan.' : 'File <b>porprov-2026.enc.json</b> sudah diunduh (folder Download).') + '</p>' +
            '<ol><li>Pastikan file itu berada di folder <b>scoresheet-wasit\\data</b> dan <b>menimpa</b> file lama' + (saved ? '' : ' (pindahkan dari folder Download)') + '.</li>' +
            '<li>Buka GitHub Desktop → <b>Commit to main</b> → <b>Push origin</b>.</li>' +
            '<li>1–2 menit kemudian semua HP otomatis ikut berubah saat aplikasi dibuka.</li></ol>' +
            '<p class="muted small">Isinya: ' + payload.teams.length + ' tim, ' + payload.matches.length + ' pertandingan, ' + payload.referees.length + ' wasit. Tetap terkunci dengan PIN yang sama.</p>'
        });
      }
      if (window.showSaveFilePicker) {
        window.showSaveFilePicker({ suggestedName: 'porprov-2026.enc.json', types: [{ description: 'Data PORPROV', accept: { 'application/json': ['.json'] } }] })
          .then(function (h) { return h.createWritable().then(function (w) { return w.write(text).then(function () { return w.close(); }); }); })
          .then(function () { done(true); })
          .catch(function (e) { if (e && e.name === 'AbortError') return; U.download('porprov-2026.enc.json', text); done(false); });
      } else { U.download('porprov-2026.enc.json', text); done(false); }
    }).catch(function (e) { U.toast('Gagal membuat file: ' + e.message, 'error'); });
  }

  VB.app = { route: route, loadData: loadData, publishData: publishData };
  route();
  loadData(false);

  // Mode offline (PWA) – hanya saat dibuka lewat http/https (mis. GitHub Pages)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW gagal', e); });
    });
  }
})();
