/*
 * Penyimpanan data (localStorage di perangkat).
 * Koleksi: competitions, teams, referees, matches.
 */
(function (root) {
  'use strict';
  var KEY = 'vb-scoresheet-db-v1';
  var COLLS = ['competitions', 'teams', 'referees', 'matches'];

  function empty() {
    return { version: 1, competitions: [], teams: [], referees: [], matches: [], settings: { activeCompetitionId: null } };
  }

  var db = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      var d = JSON.parse(raw);
      var e = empty();
      COLLS.forEach(function (c) { if (!Array.isArray(d[c])) d[c] = e[c]; });
      if (!d.settings) d.settings = e.settings;
      return d;
    } catch (err) {
      console.error('Gagal membaca data', err);
      return empty();
    }
  }

  var listeners = [];
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      alert('Gagal menyimpan data ke perangkat: ' + err.message);
    }
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function list(coll, filter) {
    var arr = db[coll] || [];
    return filter ? arr.filter(filter) : arr.slice();
  }
  function get(coll, id) {
    var arr = db[coll] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function upsert(coll, obj) {
    if (!obj.id) obj.id = uid();
    obj.updatedAt = new Date().toISOString();
    var arr = db[coll];
    var i = arr.findIndex(function (x) { return x.id === obj.id; });
    if (i >= 0) arr[i] = obj; else arr.push(obj);
    save();
    return obj;
  }
  function remove(coll, id) {
    db[coll] = db[coll].filter(function (x) { return x.id !== id; });
    save();
  }

  function settings() { return db.settings; }
  function setSetting(k, v) { db.settings[k] = v; save(); }

  function activeCompetition() {
    var id = db.settings.activeCompetitionId;
    var c = id && get('competitions', id);
    if (!c && db.competitions.length) {
      c = db.competitions[db.competitions.length - 1];
      db.settings.activeCompetitionId = c.id;
    }
    return c || null;
  }

  function exportAll() { return JSON.stringify(db, null, 1); }

  /** Gabungkan data impor. mode 'merge' (yang lebih baru menang) atau 'replace'. */
  function importData(json, mode) {
    var d = typeof json === 'string' ? JSON.parse(json) : json;
    if (!d || typeof d !== 'object') throw new Error('Format file tidak dikenali.');
    var stats = { added: 0, updated: 0 };
    if (d.kind === 'match' && d.match) {
      d = { matches: [d.match], teams: d.teams || [], referees: d.referees || [], competitions: d.competition ? [d.competition] : [] };
    }
    if (mode === 'replace') {
      var e = empty();
      COLLS.forEach(function (c) { e[c] = Array.isArray(d[c]) ? d[c] : []; });
      e.settings = d.settings || e.settings;
      db = e;
      COLLS.forEach(function (c) { stats.added += db[c].length; });
    } else {
      COLLS.forEach(function (c) {
        (d[c] || []).forEach(function (rec) {
          if (!rec || !rec.id) return;
          var i = db[c].findIndex(function (x) { return x.id === rec.id; });
          if (i < 0) { db[c].push(rec); stats.added++; }
          else if ((rec.updatedAt || '') > (db[c][i].updatedAt || '')) { db[c][i] = rec; stats.updated++; }
        });
      });
    }
    save();
    return stats;
  }

  function exportMatch(matchId) {
    var m = get('matches', matchId);
    if (!m) return null;
    return JSON.stringify({
      kind: 'match', match: m,
      teams: [get('teams', m.teamA), get('teams', m.teamB)].filter(Boolean),
      referees: Object.keys(m.officials || {}).map(function (k) { return get('referees', m.officials[k]); }).filter(Boolean),
      competition: get('competitions', m.competitionId)
    }, null, 1);
  }

  function resetAll() { db = empty(); save(); }

  root.VBStore = {
    list: list, get: get, upsert: upsert, remove: remove, uid: uid, save: save,
    settings: settings, setSetting: setSetting, activeCompetition: activeCompetition,
    exportAll: exportAll, importData: importData, exportMatch: exportMatch, resetAll: resetAll,
    onChange: function (fn) { listeners.push(fn); },
    raw: function () { return db; }
  };
})(window);
