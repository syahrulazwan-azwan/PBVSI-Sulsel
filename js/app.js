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
  var applying = false;
  function applyData(enc, d, pin) {
    applying = true;
    try { return applyData0(enc, d, pin); } finally { applying = false; }
  }
  function applyData0(enc, d, pin) {
    pin = pin || window.VBStore.settings().dataPin || '';
    var st = window.VBStore.importData({ teams: d.teams || [], matches: d.matches || [], competitions: d.competitions || [], referees: d.referees || [] }, 'merge');
    if (d.event) window.VBStore.setSetting('eventData', d.event);
    if (d.bagan) window.VBStore.setSetting('baganHasil', d.bagan);
    // data yang dihapus di perangkat admin ikut terhapus (kecuali yang dibuat di sini setelah data terbit)
    if (d.publishedAt) {
      var S = window.VBStore, keep = {};
      ['teams', 'matches', 'referees'].forEach(function (c) {
        keep = {}; (d[c] || []).forEach(function (x) { keep[x.id] = 1; });
        S.list(c).forEach(function (x) { if (!keep[x.id] && (x.updatedAt || '') < d.publishedAt) { S.remove(c, x.id); st.removed = (st.removed || 0) + 1; } });
      });
    }
    if (pin) window.VBStore.setSetting('dataPin', normPin(pin));
    window.VBStore.setSetting('seedLoaded', enc.seed);
    if (d.publishedAt) window.VBStore.setSetting('pubLoaded', d.publishedAt);
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
      if (!enc || !(enc.ct || enc.data)) return;
      var set = window.VBStore.settings();
      window.VBStore.setSetting('dataOpen', !!enc.data);
      if (!force && set.seedLoaded === enc.seed) return;
      // file lama (GitHub Pages belum selesai memperbarui) jangan menimpa data yang lebih baru
      if (!force && enc.data && enc.data.publishedAt && set.pubLoaded && enc.data.publishedAt <= set.pubLoaded) return;
      if (enc.data) {   // data terbuka (tanpa PIN): langsung dimuat
        var st0 = applyData(enc, enc.data, set.dataPin || '');
        if (token()) lsSet(HASH_KEY, hashStr(JSON.stringify(buildPayload())));
        if (force || st0.added || st0.updated || st0.cleaned || st0.removed) { U.toast('Data PORPROV diperbarui' + (st0.cleaned ? ', data uji coba dibersihkan' : '')); route(); }
        return;
      }
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
    var S = window.VBStore, pin = S.settings().dataPin, open = !!S.settings().dataOpen;
    if (!open && !pin) { U.toast('Masukkan PIN data dulu (tombol 🔑 Muat data PORPROV).', 'error'); return; }
    if (!open && !(window.crypto && window.crypto.subtle)) { U.toast('Browser ini tidak mendukung. Pakai Chrome di laptop.', 'error'); return; }
    var ev = VB.views.jadwal.eventData();
    var payload = { teams: S.list('teams'), matches: S.list('matches'), referees: S.list('referees'), competitions: S.list('competitions', function (c) { return c.id === 'porprov-2026'; }), event: ev };
    U.toast('Menyiapkan file…');
    var make = open ? Promise.resolve({ v: 1, seed: 'porprov-2026-' + Date.now(), data: payload }) : encrypt(payload, pin);
    make.then(function (enc) {
      var text = JSON.stringify(enc);
      function done(saved) {
        S.setSetting('seedLoaded', enc.seed);
        U.modal({
          title: 'File siap', body: '<p>' + (saved ? 'File <b>porprov-2026.enc.json</b> sudah disimpan.' : 'File <b>porprov-2026.enc.json</b> sudah diunduh (folder Download).') + '</p>' +
            '<ol><li>Pastikan file itu berada di folder <b>scoresheet-wasit\\data</b> dan <b>menimpa</b> file lama' + (saved ? '' : ' (pindahkan dari folder Download)') + '.</li>' +
            '<li>Buka GitHub Desktop → <b>Commit to main</b> → <b>Push origin</b>.</li>' +
            '<li>1–2 menit kemudian semua HP otomatis ikut berubah saat aplikasi dibuka.</li></ol>' +
            '<p class="muted small">Isinya: ' + payload.teams.length + ' tim, ' + payload.matches.length + ' pertandingan, ' + payload.referees.length + ' wasit.' + (open ? '' : ' Tetap terkunci dengan PIN yang sama.') + '</p>'
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

  // ---------- Sinkron otomatis lewat GitHub (tanpa GitHub Desktop) ----------
  // Token disimpan terpisah (bukan di data/backup) dan hanya di perangkat admin.
  var GH = { owner: 'syahrulazwan-azwan', repo: 'PBVSI-Sulsel', branch: 'main', path: 'data/porprov-2026.enc.json' };
  var TOKEN_KEY = 'vb-gh-token', HASH_KEY = 'vb-gh-lasthash';
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  function token() { return lsGet(TOKEN_KEY); }
  function gh(method, url, body) {
    return fetch('https://api.github.com/repos/' + GH.owner + '/' + GH.repo + url, {
      method: method, cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + token(), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }
  function utf8b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64utf8(b) { return decodeURIComponent(escape(atob(String(b).replace(/\s/g, '')))); }
  function hashStr(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return String(h) + ':' + str.length; }
  function buildPayload() {
    var S = window.VBStore;
    return { teams: S.list('teams'), matches: S.list('matches'), referees: S.list('referees'),
      competitions: S.list('competitions', function (c) { return c.id === 'porprov-2026'; }),
      event: VB.views.jadwal.eventData(), bagan: S.settings().baganHasil || {} };
  }
  var badge;
  function setStatus(txt, cls) {
    if (!token()) { if (badge) badge.style.display = 'none'; return; }
    if (!badge) { badge = document.createElement('div'); badge.className = 'sync-badge no-print'; document.body.appendChild(badge); badge.onclick = function () { syncSettings(); }; }
    badge.style.display = ''; badge.className = 'sync-badge no-print ' + (cls || ''); badge.textContent = txt;
  }
  var busy = false, again = false, timer = null;
  function schedulePush() { if (!token() || applying) return; clearTimeout(timer); setStatus('⏳ Menunggu…'); timer = setTimeout(pushNow, 12000); }
  function pushNow() {
    if (!token()) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; setStatus('⏳ Menyimpan ke semua HP…');
    return gh('GET', '/contents/' + GH.path + '?ref=' + GH.branch).then(function (cur) {
      if (cur._status === 401 || cur._status === 403) throw new Error('Token ditolak GitHub (cek izin atau masa berlaku).');
      var sha = cur.sha;
      // ada perubahan dari admin lain? gabungkan dulu
      if (cur.content) {
        try {
          var remote = JSON.parse(b64utf8(cur.content));
          if (remote && remote.data && remote.seed !== window.VBStore.settings().seedLoaded) applyData(remote, remote.data, '');
        } catch (e) { /* abaikan */ }
      }
      var p = buildPayload(), h = hashStr(JSON.stringify(p));
      if (h === lsGet(HASH_KEY) && cur.content) return { skip: true };
      p.publishedAt = new Date().toISOString();
      var file = { v: 1, seed: 'porprov-2026-' + Date.now(), data: p };
      return gh('PUT', '/contents/' + GH.path, { message: 'Perbarui data (otomatis dari aplikasi)', content: utf8b64(JSON.stringify(file)), sha: sha, branch: GH.branch })
        .then(function (res) {
          if (res._status === 409 || res._status === 422) { again = true; return { retry: true }; }
          if (res._status >= 300) throw new Error(res.message || ('Gagal (' + res._status + ')'));
          applying = true; window.VBStore.setSetting('seedLoaded', file.seed); window.VBStore.setSetting('pubLoaded', p.publishedAt); applying = false; lsSet(HASH_KEY, h);
          return { ok: true };
        });
    }).then(function (r) {
      busy = false;
      setStatus(r && r.retry ? '⏳ Mengulang…' : '☁️ Tersimpan untuk semua HP', 'ok');
      if (again) { again = false; setTimeout(pushNow, 1500); }
    }).catch(function (e) {
      busy = false; setStatus('⚠️ Gagal simpan – ketuk', 'err'); U.toast(e.message, 'error');
    });
  }
  function syncSettings() {
    var on = !!token();
    U.modal({
      title: 'Sinkron otomatis ke semua HP', wide: true,
      body: (on ? '<p class="alert ok-box">✅ Aktif di perangkat ini. Setiap perubahan otomatis tersimpan dan semua HP ikut berubah sekitar 1–2 menit kemudian. Tidak perlu GitHub Desktop.</p>' :
        '<p>Aktifkan di <b>laptop/HP admin</b> saja (yang dipakai mengubah data). HP lain cukup membuka link, otomatis ikut berubah.</p>') +
        '<details' + (on ? '' : ' open') + '><summary><b>Cara membuat kunci (token) GitHub – sekali saja</b></summary><ol class="small">' +
        '<li>Masuk ke github.com dengan akun Bapak, buka <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens</b> → <b>Generate new token</b>.</li>' +
        '<li>Nama bebas (mis. <i>Scoresheet</i>), Expiration: <b>30 days</b>.</li>' +
        '<li>Repository access: <b>Only select repositories</b> → pilih <b>PBVSI-Sulsel</b>.</li>' +
        '<li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li>' +
        '<li>Klik <b>Generate token</b>, salin kodenya (diawali <code>github_pat_</code>), lalu tempel di bawah. Jangan bagikan kode ini ke siapa pun.</li></ol></details>' +
        '<label class="mt">Token GitHub<input id="ghtok" type="password" autocomplete="off" placeholder="' + (on ? '•••••••• (tersimpan)' : 'github_pat_…') + '"></label>' +
        '<p class="muted small">Token hanya disimpan di perangkat ini, tidak ikut ke data atau backup.</p>',
      actions: [{ label: on ? 'Matikan' : 'Batal', cls: on ? 'danger ghost' : '', value: on ? 'off' : null },
        { label: 'Unduh file manual', value: 'manual' },
        { label: 'Simpan & aktifkan', cls: 'primary', value: 'save', onClick: function (root) { syncSettings._v = U.qs('#ghtok', root).value.trim(); } }]
    }).then(function (v) {
      if (v === 'off') { lsSet(TOKEN_KEY, ''); lsSet(HASH_KEY, ''); setStatus(''); U.toast('Sinkron otomatis dimatikan di perangkat ini'); return; }
      if (v === 'manual') { publishData(); return; }
      if (v !== 'save') return;
      var t = syncSettings._v || token();
      if (!t) { U.toast('Token belum diisi', 'error'); return; }
      var old = token(); lsSet(TOKEN_KEY, t);
      gh('GET', '').then(function (r) {
        if (r._status !== 200 || !(r.permissions && r.permissions.push)) {
          lsSet(TOKEN_KEY, old); U.toast('Token tidak bisa dipakai: pastikan repo PBVSI-Sulsel dipilih dan izin Contents = Read and write.', 'error'); return;
        }
        U.toast('Sinkron otomatis aktif'); lsSet(HASH_KEY, ''); pushNow();
      }).catch(function () { lsSet(TOKEN_KEY, old); U.toast('Tidak bisa menghubungi GitHub. Cek internet.', 'error'); });
    });
  }
  window.VBStore.onChange(schedulePush);
  if (token()) setStatus('☁️ Sinkron aktif', 'ok');

  // HP penonton: cek data baru tiap 45 detik saat aplikasi terbuka, dan saat aplikasi dibuka kembali
  setInterval(function () { if (!document.hidden && !busy) loadData(false); }, 45000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadData(false); });

  VB.app = { route: route, loadData: loadData, publishData: publishData, syncSettings: syncSettings, pushNow: pushNow };
  route();
  loadData(false);

  // Mode offline (PWA) – hanya saat dibuka lewat http/https (mis. GitHub Pages)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW gagal', e); });
    });
  }
})();
