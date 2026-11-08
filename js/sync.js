/* Sinkron langsung antar perangkat lewat Firebase Realtime Database (REST + streaming).
 * - Semua perangkat membaca & menulis ke satu tempat; perubahan muncul di perangkat lain dalam hitungan detik.
 * - Tanpa token/PIN. Data tetap disimpan juga di perangkat (bisa dipakai saat offline);
 *   perubahan saat offline dikirim otomatis begitu internet kembali.
 * Struktur: /<root>/teams/<id>, /matches/<id>, /referees/<id>, /settings/{event,bagan}
 */
(function () {
  'use strict';
  var C = window.VB_CONFIG || {};
  if (!C.firebaseUrl || !window.fetch) return;
  var S = window.VBStore, U = window.VBUI;
  var BASE = C.firebaseUrl.replace(/\/+$/, '') + '/' + (C.firebaseRoot || 'porprov2026');
  var COLLS = ['teams', 'matches', 'referees'];
  var PEND_KEY = 'vb-fb-pending';

  var mirror = null;          // salinan data di server (diperbarui dari stream)
  var ready = false;          // sudah menerima data awal dari server
  var applying = false;       // sedang menerapkan data server ke perangkat (jangan dikirim balik)
  var pending = loadPending(); // { 'teams/id': true, ... } perubahan lokal yang belum terkirim
  var sending = false, timer = null, online = navigator.onLine !== false;

  function loadPending() { try { return JSON.parse(localStorage.getItem(PEND_KEY) || '{}'); } catch (e) { return {}; } }
  function savePending() { try { localStorage.setItem(PEND_KEY, JSON.stringify(pending)); } catch (e) { /* abaikan */ } }
  function enc(id) { return String(id).replace(/[.#$\[\]\/]/g, '_'); }
  /* Bentuk baku untuk membandingkan data lokal dengan server. Firebase:
   * - menghapus null, '' tetap, tetapi {} dan [] kosong hilang,
   * - mengubah objek berkunci angka ({1:x,2:y}) menjadi array ([null,x,y]),
   * - mengurutkan kunci. Tanpa ini perbandingan selalu "beda" dan data dikirim berulang. */
  function canon(x) {
    if (x === null || x === undefined || x === '') return null;
    if (typeof x !== 'object') return x;
    var out = {}, n = 0;
    Object.keys(x).sort().forEach(function (k) { var v = canon(x[k]); if (v !== null) { out[k] = v; n++; } });
    return n ? out : null;
  }
  function same(a, b) { return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); }
  /** array dari Firebase -> objek biasa (untuk hasil bagan {pool:{1:id,2:id}}) */
  function plain(x) {
    if (x === null || typeof x !== 'object') return x;
    var o = {};
    Object.keys(x).forEach(function (k) { if (x[k] !== null && x[k] !== undefined) o[k] = plain(x[k]); });
    return o;
  }
  function clone(o) { return o == null ? null : JSON.parse(JSON.stringify(o)); }

  // ---------- status kecil di pojok ----------
  var badge = document.createElement('div');
  badge.className = 'sync-badge no-print';
  document.body.appendChild(badge);
  function status(txt, cls) { badge.textContent = txt; badge.className = 'sync-badge no-print ' + (cls || ''); }
  status('⏳ Menghubungkan…');
  badge.onclick = function () {
    U.toast(ready ? (Object.keys(pending).length ? 'Ada perubahan menunggu dikirim…' : 'Semua perubahan sudah tersimpan untuk semua perangkat') : 'Sedang menghubungkan ke server…');
    flush();
  };

  // ---------- pohon data mirror ----------
  function setPath(path, data) {
    var segs = path.split('/').filter(Boolean);
    if (!segs.length) { mirror = clone(data) || {}; return; }
    if (!mirror) mirror = {};
    var o = mirror;
    for (var i = 0; i < segs.length - 1; i++) { if (typeof o[segs[i]] !== 'object' || o[segs[i]] === null) o[segs[i]] = {}; o = o[segs[i]]; }
    var k = segs[segs.length - 1];
    if (data === null) delete o[k]; else o[k] = clone(data);
  }

  // ---------- server -> perangkat ----------
  function reconcile() {
    if (!mirror) return;
    var db = S.raw(), changed = false;
    applying = true;
    try {
      COLLS.forEach(function (c) {
        var remote = mirror[c] || {}, byKey = {};
        Object.keys(remote).forEach(function (k) { byKey[k] = remote[k]; });
        var out = [];
        // pertahankan perubahan lokal yang belum terkirim
        db[c].forEach(function (x) { var k = enc(x.id); if (pending[c + '/' + k]) { out.push(x); delete byKey[k]; } });
        Object.keys(pending).forEach(function (p) { var sp = p.split('/'); if (sp[0] === c) delete byKey[sp[1]]; });
        Object.keys(byKey).forEach(function (k) { if (byKey[k] && byKey[k].id) out.push(clone(byKey[k])); });   // salinan, jangan berbagi objek dengan mirror
        var a = db[c].slice().sort(function (x, y) { return x.id < y.id ? -1 : 1; });
        var b = out.slice().sort(function (x, y) { return x.id < y.id ? -1 : 1; });
        if (!same(a, b)) { db[c] = out; changed = true; }
      });
      var st = mirror.settings || {};
      if (!pending['settings/event'] && st.event && !same(db.settings.event, st.event)) { db.settings.event = clone(st.event); changed = true; }
      if (!pending['settings/bagan'] && st.bagan && !same(db.settings.baganHasil, st.bagan)) { db.settings.baganHasil = plain(st.bagan); changed = true; }
      if (changed) S.save();
    } finally { applying = false; }
    if (changed && VB.app && VB.app.route && !document.querySelector('.modal-backdrop')) VB.app.route();
  }

  // ---------- perangkat -> server ----------
  function diff() {
    if (!ready || !mirror) return;
    var db = S.raw();
    COLLS.forEach(function (c) {
      var remote = mirror[c] || {}, seen = {};
      db[c].forEach(function (x) { var k = enc(x.id); seen[k] = 1; if (!same(remote[k], x)) pending[c + '/' + k] = true; });
      Object.keys(remote).forEach(function (k) { if (!seen[k]) pending[c + '/' + k] = true; });
    });
    var st = mirror.settings || {};
    if (db.settings.event && !same(st.event, db.settings.event)) pending['settings/event'] = true;
    if (db.settings.baganHasil && !same(st.bagan, db.settings.baganHasil)) pending['settings/bagan'] = true;
    savePending();
  }
  function valueFor(p) {
    var sp = p.split('/'), db = S.raw();
    if (sp[0] === 'settings') return clone(sp[1] === 'event' ? db.settings.event : db.settings.baganHasil) || null;
    var x = db[sp[0]].filter(function (r) { return enc(r.id) === sp[1]; })[0];
    return x ? clone(x) : null;
  }
  function flush() {
    if (sending || !ready) return;
    var keys = Object.keys(pending);
    if (!keys.length) { status(online ? '🟢 Tersinkron' : '🔴 Offline', online ? 'ok' : 'err'); return; }
    var body = {}; keys.forEach(function (p) { body[p] = valueFor(p); });
    sending = true; status('⏳ Menyimpan ' + keys.length + ' perubahan…');
    fetch(BASE + '.json', { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function () {
        keys.forEach(function (p) {
          // hanya hapus dari antrean bila tidak berubah lagi selama pengiriman
          if (same(valueFor(p), body[p])) { delete pending[p]; setPath('/' + p, body[p]); }
        });
        savePending(); sending = false;
        if (Object.keys(pending).length) flush(); else status('🟢 Tersimpan untuk semua', 'ok');
      })
      .catch(function () { sending = false; status('🔴 Offline – menunggu internet', 'err'); });
  }
  function schedule() {
    if (applying || !ready) return;
    diff();
    clearTimeout(timer); timer = setTimeout(flush, 800);
  }
  S.onChange(schedule);

  // ---------- data awal: server kosong -> isi dari data resmi ----------
  function seedServer() {
    status('⏳ Mengisi data awal…');
    var p = VB.app && VB.app.loadData ? VB.app.loadData(true) : Promise.resolve();
    return Promise.resolve(p).then(function () {
      mirror = mirror || {};
      ready = true; diff(); flush();
    });
  }

  // ---------- stream dari server ----------
  var es = null, lastBeat = Date.now();
  function connect() {
    if (es) try { es.close(); } catch (e) { /* abaikan */ }
    lastBeat = Date.now();
    if (!window.EventSource) { poll(); return; }
    es = new EventSource(BASE + '.json');
    function onEvent(kind) {
      return function (ev) {
        lastBeat = Date.now();
        var msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (!msg) return;
        if (kind === 'put') setPath(msg.path, msg.data);
        else Object.keys(msg.data || {}).forEach(function (k) { setPath((msg.path === '/' ? '' : msg.path) + '/' + k, msg.data[k]); });
        if (!ready) {
          var empty = !mirror || !Object.keys(mirror).some(function (k) { return COLLS.indexOf(k) >= 0 && Object.keys(mirror[k] || {}).length; });
          if (empty) { seedServer(); return; }
          ready = true; reconcile(); diff(); flush();
          status('🟢 Tersinkron', 'ok');
          return;
        }
        reconcile();
      };
    }
    es.addEventListener('put', onEvent('put'));
    es.addEventListener('patch', onEvent('patch'));
    es.addEventListener('keep-alive', function () { lastBeat = Date.now(); });
    es.addEventListener('cancel', function () { status('🔴 Server menolak akses', 'err'); });
    es.onerror = function () { status(Object.keys(pending).length ? '🔴 Offline – perubahan menunggu' : '🔴 Offline', 'err'); };
    es.onopen = function () { online = true; flush(); };
  }
  // cadangan untuk browser tanpa EventSource
  function poll() {
    fetch(BASE + '.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      setPath('/', d);
      if (!ready) { if (!d) { seedServer(); return; } ready = true; diff(); }
      reconcile(); flush();
    }).catch(function () { status('🔴 Offline', 'err'); }).then(function () { setTimeout(poll, 20000); });
  }

  window.addEventListener('online', function () { online = true; connect(); flush(); });
  window.addEventListener('offline', function () { online = false; status('🔴 Offline – perubahan disimpan di perangkat', 'err'); });
  // HP (terutama iPhone) sering memutus koneksi saat aplikasi di latar belakang:
  // sambung ulang begitu dibuka lagi, atau bila server lama tidak memberi kabar.
  function revive() {
    if (!window.EventSource || !online) return;
    if (!es || es.readyState === 2 || Date.now() - lastBeat > 75000) connect();
    flush();
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') revive(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) revive(); });
  window.addEventListener('focus', revive);
  setInterval(function () { flush(); if (document.visibilityState !== 'hidden') revive(); }, 15000);
  connect();

  VB.sync = { flush: flush, state: function () { return { ready: ready, pending: Object.keys(pending).length, mirror: !!mirror }; } };
})();
