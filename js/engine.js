/*
 * Mesin Scoresheet Bola Voli (Indoor 6x6, Pantai 2x2, Pantai 4x4)
 * ---------------------------------------------------------------
 * Seluruh keadaan pertandingan dihitung ulang dari daftar "event"
 * (setStart, point, timeout, sub, sanction, remark, forfeit).
 * Karena itu fitur UNDO cukup dengan menghapus event terakhir.
 */
(function (root) {
  'use strict';

  var FORMATS = {
    indoor6: {
      key: 'indoor6', label: 'Indoor 6x6', sheetTitle: 'INTERNATIONAL SCORESHEET – INDOOR VOLLEYBALL',
      players: 6, setsToWin: 3, setPoints: 25, decidingSetPoints: 15, minLead: 2,
      timeoutsPerSet: 2, subsPerSet: 6, strictSubPairs: true, receiverRotates: true,
      courtSwitchEvery: 0, decidingCourtSwitchEvery: 0, decidingSideChangeAt: 8,
      ttoAtSum: 0, hasLibero: true, sheetPoints: 48, decidingSheetPoints: 30, layout: 'columns'
    },
    beach2: {
      key: 'beach2', label: 'Pantai 2x2', sheetTitle: 'BVB/11 – BEACH VOLLEYBALL SCORESHEET 2x2 (RPS 2 out of 3 sets)',
      players: 2, setsToWin: 2, setPoints: 21, decidingSetPoints: 15, minLead: 2,
      timeoutsPerSet: 1, subsPerSet: 0, strictSubPairs: false, receiverRotates: false,
      courtSwitchEvery: 7, decidingCourtSwitchEvery: 5, decidingSideChangeAt: 0,
      ttoAtSum: 21, hasLibero: false, sheetPoints: 44, decidingSheetPoints: 30, layout: 'rows'
    },
    beach4: {
      key: 'beach4', label: 'Pantai 4x4', sheetTitle: 'BVB 4 vs 4 – BEACH VOLLEYBALL SCORESHEET (RPS 2 out of 3 sets)',
      players: 4, setsToWin: 2, setPoints: 21, decidingSetPoints: 15, minLead: 2,
      timeoutsPerSet: 1, subsPerSet: 4, strictSubPairs: false, receiverRotates: true,
      courtSwitchEvery: 7, decidingCourtSwitchEvery: 5, decidingSideChangeAt: 0,
      ttoAtSum: 21, hasLibero: false, sheetPoints: 36, decidingSheetPoints: 36, layout: 'columns'
    }
  };

  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  var SANCTION_LABEL = {
    W: 'Peringatan (W)', P: 'Penalti (P)', E: 'Dikeluarkan (E)', D: 'Didiskualifikasi (D)',
    DW: 'Peringatan penundaan (DW)', DP: 'Penalti penundaan (DP)', IR: 'Permintaan tidak sah (IR)'
  };

  function defaultRules(format) {
    var f = FORMATS[format] || FORMATS.indoor6;
    var r = {};
    for (var k in f) if (Object.prototype.hasOwnProperty.call(f, k)) r[k] = f[k];
    r.format = f.key;
    return r;
  }

  function opp(t) { return t === 'A' ? 'B' : 'A'; }

  /** Label urutan servis. Pantai 2x2: tim servis pertama = I & III, penerima = II & IV. */
  function orderLabel(rules, set, team, idx) {
    if (rules.players === 2 && set) {
      var first = set.firstServe === team;
      return first ? (idx === 0 ? 'I' : 'III') : (idx === 0 ? 'II' : 'IV');
    }
    return ROMAN[idx] || String(idx + 1);
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function minutesBetween(a, b) {
    if (!a || !b) return 0;
    return Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  }

  function EngineError(msg) { var e = new Error(msg); e.engine = true; return e; }

  /**
   * Hitung keadaan pertandingan.
   * @param match {rules, events[]}
   * @param names {A:'Nama Tim A', B:'Nama Tim B'} opsional, untuk teks riwayat
   */
  function compute(match, names) {
    var R = match.rules || defaultRules('indoor6');
    var n = R.players;
    names = names || { A: 'Tim A', B: 'Tim B' };
    var st = {
      rules: R, sets: [], setsWon: { A: 0, B: 0 }, finished: false, winner: null,
      sanctions: [], remarks: [], log: [], notices: [], forfeit: null,
      startTime: null, endTime: null, eventCount: 0
    };
    var cur = null;

    function scoreStr(team) { return cur ? cur.score[team] + ':' + cur.score[opp(team)] : '0:0'; }
    function log(ev, text, kind) {
      st.log.push({
        time: ev.time, set: cur ? cur.no : 0, text: text, kind: kind || ev.t,
        score: cur ? cur.score.A + '–' + cur.score.B : ''
      });
    }

    function newSet(ev) {
      var no = st.sets.length + 1;
      var deciding = no === R.setsToWin * 2 - 1;
      var lineup = { A: (ev.lineup.A || []).map(String), B: (ev.lineup.B || []).map(String) };
      ['A', 'B'].forEach(function (t) {
        if (lineup[t].length !== n) throw EngineError('Line-up ' + names[t] + ' harus berisi ' + n + ' pemain.');
        var seen = {};
        lineup[t].forEach(function (x) {
          if (!x) throw EngineError('Nomor pemain ' + names[t] + ' belum lengkap.');
          if (seen[x]) throw EngineError('Nomor ' + x + ' dobel di line-up ' + names[t] + '.');
          seen[x] = 1;
        });
      });
      var fs = ev.firstServe === 'B' ? 'B' : 'A';
      var s = {
        no: no, deciding: deciding,
        target: deciding ? R.decidingSetPoints : R.setPoints,
        lineup: lineup,
        order: { A: lineup.A.slice(), B: lineup.B.slice() },
        firstServe: fs, server: fs,
        idx: { A: 0, B: 0 },
        served: { A: false, B: false },
        score: { A: 0, B: 0 },
        pts: { A: [], B: [] },
        rounds: { A: [], B: [] },
        timeouts: { A: [], B: [] },
        subs: { A: [], B: [] },
        subState: { A: { pairs: {}, returned: {}, used: {} }, B: { pairs: {}, returned: {}, used: {} } },
        left: ev.left === 'B' ? 'B' : 'A',
        leftAtStart: ev.left === 'B' ? 'B' : 'A',
        switches: [], tto: null, sideChanged: false,
        start: ev.time, end: null, finished: false, winner: null, forfeit: false
      };
      for (var i = 0; i < n; i++) { s.rounds.A.push([]); s.rounds.B.push([]); }
      var rcv = opp(fs);
      s.idx[rcv] = R.receiverRotates ? 0 : n - 1;
      s.served[fs] = true;
      return s;
    }

    function finishSet(team, ev) {
      cur.finished = true; cur.winner = team; cur.end = ev.time;
      // skor akhir dicatat pada putaran servis server terakhir (dilingkari di kertas)
      if (cur.server === team) cur.rounds[team][cur.idx[team]].push({ score: cur.score[team], final: true });
      st.setsWon[team]++;
      st.notices.push({ type: 'setEnd', text: 'Set ' + cur.no + ' selesai: ' + names[team] + ' menang ' + cur.score[team] + '–' + cur.score[opp(team)] });
      log(ev, 'Set ' + cur.no + ' dimenangkan ' + names[team], 'setEnd');
      if (st.setsWon[team] >= R.setsToWin) {
        st.finished = true; st.winner = team; st.endTime = ev.time;
        st.notices.push({ type: 'matchEnd', text: 'Pertandingan selesai. Pemenang: ' + names[team] + ' (' + st.setsWon[team] + '–' + st.setsWon[opp(team)] + ')' });
      }
    }

    /** Catatan keadaan saat pindah lapangan (dipakai lembar cetak set penentuan) */
    function snap(a, b, ev) {
      return {
        a: a, b: b, left: cur.left, time: ev.time,
        rl: { A: cur.rounds.A.map(function (l) { return l.length; }), B: cur.rounds.B.map(function (l) { return l.length; }) },
        sl: { A: cur.subs.A.length, B: cur.subs.B.length }
      };
    }

    function addPoint(team, kind, ev, silent) {
      var other = opp(team);
      if (cur.server !== team) {
        // pindah servis (side-out): catat skor tim yang kehilangan servis
        cur.rounds[other][cur.idx[other]].push({ score: cur.score[other] });
        cur.idx[team] = (cur.idx[team] + 1) % n;
        cur.server = team;
        cur.served[team] = true;
      }
      cur.score[team]++;
      cur.pts[team].push({ n: cur.score[team], kind: kind, time: ev.time });
      if (!silent) {
        var srv = cur.order[team][cur.idx[team]];
        log(ev, (kind === 'penalty' ? 'Poin penalti untuk ' : 'Poin ') + names[team] + ' — server berikutnya #' + srv, 'point');
      }
      var a = cur.score.A, b = cur.score.B, sum = a + b;
      var won = cur.score[team] >= cur.target && cur.score[team] - cur.score[other] >= R.minLead;
      if (won) { finishSet(team, ev); return; }
      if (kind === 'forfeit') return;
      var every = cur.deciding ? R.decidingCourtSwitchEvery : R.courtSwitchEvery;
      if (every && sum % every === 0) {
        cur.left = opp(cur.left);
        cur.switches.push(snap(a, b, ev));
        st.notices.push({ type: 'switch', text: 'PINDAH LAPANGAN (skor ' + a + '–' + b + ')' });
      }
      if (R.decidingSideChangeAt && cur.deciding && !cur.sideChanged && Math.max(a, b) === R.decidingSideChangeAt) {
        cur.sideChanged = true;
        cur.left = opp(cur.left);
        cur.switches.push(snap(a, b, ev));
        st.notices.push({ type: 'switch', text: 'PINDAH LAPANGAN – salah satu tim mencapai ' + R.decidingSideChangeAt + ' poin (skor ' + a + '–' + b + ')' });
      }
      if (R.ttoAtSum && !cur.deciding && !cur.tto && sum === R.ttoAtSum) {
        cur.tto = { a: a, b: b, time: ev.time };
        st.notices.push({ type: 'tto', text: 'TECHNICAL TIME-OUT (jumlah poin ' + R.ttoAtSum + ')' });
      }
    }

    function needLive() {
      if (st.finished) throw EngineError('Pertandingan sudah selesai.');
      if (!cur || cur.finished) throw EngineError('Set belum dimulai.');
    }

    function onCourt(team, no) { return cur.order[team].indexOf(String(no)); }

    var handlers = {
      setStart: function (ev) {
        if (st.finished) throw EngineError('Pertandingan sudah selesai.');
        if (cur && !cur.finished) throw EngineError('Set ' + cur.no + ' belum selesai.');
        cur = newSet(ev);
        st.sets.push(cur);
        if (!st.startTime) st.startTime = ev.time;
        log(ev, 'Set ' + cur.no + ' dimulai. Servis pertama: ' + names[cur.firstServe] + ' (#' + cur.order[cur.firstServe][0] + ')', 'setStart');
      },
      point: function (ev) {
        needLive();
        addPoint(ev.team, 'rally', ev);
      },
      timeout: function (ev) {
        needLive();
        var t = ev.team;
        if (cur.timeouts[t].length >= R.timeoutsPerSet) throw EngineError('Jatah time-out ' + names[t] + ' di set ini sudah habis.');
        cur.timeouts[t].push({ a: cur.score[t], b: cur.score[opp(t)], time: ev.time });
        log(ev, 'Time-out ' + names[t] + ' (' + cur.timeouts[t].length + '/' + R.timeoutsPerSet + ')', 'timeout');
      },
      sub: function (ev) {
        needLive();
        var t = ev.team, out = String(ev.out), inn = String(ev['in']);
        if (!R.subsPerSet && !ev.exceptional) throw EngineError('Format ini tidak memakai pergantian pemain.');
        var pos = onCourt(t, out);
        if (pos < 0) throw EngineError('Pemain #' + out + ' tidak sedang di lapangan.');
        if (onCourt(t, inn) >= 0) throw EngineError('Pemain #' + inn + ' sudah di lapangan.');
        if (!inn || inn === 'undefined') throw EngineError('Nomor pemain masuk belum diisi.');
        var regular = cur.subs[t].filter(function (s) { return !s.exceptional; }).length;
        if (!ev.exceptional && regular >= R.subsPerSet) throw EngineError('Jatah pergantian ' + names[t] + ' di set ini sudah habis (' + R.subsPerSet + ').');
        var ss = cur.subState[t];
        if (R.strictSubPairs && !ev.exceptional) {
          var starters = cur.lineup[t];
          if (starters.indexOf(out) >= 0) {
            if (ss.returned[out]) throw EngineError('#' + out + ' sudah keluar-masuk sekali di set ini (hanya boleh pergantian luar biasa).');
            if (starters.indexOf(inn) >= 0) throw EngineError('#' + inn + ' adalah pemain inti, tidak bisa masuk menggantikan #' + out + '.');
            if (ss.used[inn]) throw EngineError('#' + inn + ' sudah pernah masuk sebagai pengganti di set ini.');
            ss.pairs[out] = inn; ss.used[inn] = true;
          } else {
            var starter = null;
            for (var k in ss.pairs) if (ss.pairs[k] === out) starter = k;
            if (starter === null) throw EngineError('#' + out + ' bukan pengganti terdaftar.');
            if (inn !== starter) throw EngineError('#' + out + ' hanya boleh digantikan kembali oleh #' + starter + '.');
            ss.returned[starter] = true;
          }
        }
        cur.order[t][pos] = inn;
        cur.subs[t].push({ 'in': inn, out: out, pos: pos, a: cur.score[t], b: cur.score[opp(t)], exceptional: !!ev.exceptional, time: ev.time });
        log(ev, 'Pergantian ' + names[t] + ': #' + inn + ' masuk, #' + out + ' keluar' + (ev.exceptional ? ' (luar biasa)' : ''), 'sub');
      },
      sanction: function (ev) {
        var t = ev.team;
        var rec = {
          set: cur ? cur.no : 0, team: t, who: String(ev.who || ''), type: ev.type,
          a: cur ? cur.score[t] : 0, b: cur ? cur.score[opp(t)] : 0, time: ev.time
        };
        st.sanctions.push(rec);
        log(ev, 'Sanksi ' + (SANCTION_LABEL[ev.type] || ev.type) + ' — ' + names[t] + (rec.who ? ' (' + rec.who + ')' : ''), 'sanction');
        if ((ev.type === 'P' || ev.type === 'DP') && cur && !cur.finished && !st.finished) {
          addPoint(opp(t), 'penalty', ev);
        }
      },
      remark: function (ev) {
        st.remarks.push({ set: cur ? cur.no : 0, text: ev.text, time: ev.time });
        log(ev, 'Catatan: ' + ev.text, 'remark');
      },
      forfeit: function (ev) {
        if (st.finished) throw EngineError('Pertandingan sudah selesai.');
        var loser = ev.team, win = opp(loser);
        st.forfeit = { team: loser, reason: ev.reason || '' };
        log(ev, names[loser] + ' dinyatakan kalah (forfeit/WO)' + (ev.reason ? ': ' + ev.reason : ''), 'forfeit');
        while (!st.finished) {
          if (!cur || cur.finished) {
            var lu = { A: [], B: [] };
            for (var i = 0; i < n; i++) { lu.A.push('-' + (i + 1)); lu.B.push('-' + (i + 1)); }
            cur = newSet({ lineup: lu, firstServe: win, left: 'A', time: ev.time });
            cur.forfeit = true;
            st.sets.push(cur);
            if (!st.startTime) st.startTime = ev.time;
          }
          addPoint(win, 'forfeit', ev, true);
        }
      }
    };

    var events = match.events || [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      st.notices = [];
      var h = handlers[ev.t];
      if (!h) continue;
      h(ev);
      st.eventCount++;
    }
    st.current = cur;
    st.currentSetNo = cur ? cur.no : 0;
    st.needsSetup = !st.finished && (!cur || cur.finished);
    st.nextSetNo = st.sets.length + (st.needsSetup ? 1 : 0);
    return st;
  }

  /** Coba tambahkan event; kembalikan {ok, error, state}. */
  function tryEvent(match, ev, names) {
    var copy = { rules: match.rules, events: (match.events || []).concat([ev]) };
    try {
      var st = compute(copy, names);
      return { ok: true, state: st };
    } catch (e) {
      if (e && e.engine) return { ok: false, error: e.message };
      throw e;
    }
  }

  /** Server saat ini (atau berikutnya untuk tim penerima). */
  function serverInfo(set, team, rules) {
    var n = rules.players;
    var idx = set.server === team ? set.idx[team] : (set.idx[team] + 1) % n;
    return { idx: idx, no: set.order[team][idx], label: orderLabel(rules, set, team, idx), serving: set.server === team };
  }

  /** Posisi lapangan (I..n) → nomor pemain, untuk format berotasi. */
  function courtPositions(set, team, rules) {
    var n = rules.players, out = [];
    for (var p = 0; p < n; p++) out.push(set.order[team][(set.idx[team] + p) % n]);
    return out;
  }

  function summary(st) {
    var res = { setsWon: { A: st.setsWon.A, B: st.setsWon.B }, sets: [], total: { A: 0, B: 0 }, duration: 0 };
    st.sets.forEach(function (s) {
      var d = minutesBetween(s.start, s.end);
      res.sets.push({ no: s.no, A: s.score.A, B: s.score.B, finished: s.finished, winner: s.winner, minutes: d, start: s.start, end: s.end });
      res.total.A += s.score.A; res.total.B += s.score.B; res.duration += d;
    });
    res.matchMinutes = minutesBetween(st.startTime, st.endTime);
    return res;
  }

  /** Nilai klasemen untuk satu tim dari hasil pertandingan. */
  function classificationPoints(rules, won, setsFor, setsAgainst, forfeited) {
    if (rules.format === 'indoor6') {
      if (won) return setsAgainst <= 1 ? 3 : 2;
      if (forfeited) return 0;
      return setsFor === 2 ? 1 : 0;
    }
    if (won) return 2;
    return forfeited ? 0 : 1;
  }

  var api = {
    FORMATS: FORMATS, ROMAN: ROMAN, SANCTION_LABEL: SANCTION_LABEL,
    defaultRules: defaultRules, compute: compute, tryEvent: tryEvent, opp: opp,
    serverInfo: serverInfo, courtPositions: courtPositions, orderLabel: orderLabel,
    summary: summary, classificationPoints: classificationPoints,
    fmtTime: fmtTime, minutesBetween: minutesBetween
  };
  root.VBEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
