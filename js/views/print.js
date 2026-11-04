/* Cetak scoresheet (A4 landscape) */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;

  function J() { return VB.views.jadwal; }
  function box(v, cls) { return '<td class="' + (cls || '') + '">' + (v === undefined || v === null ? '' : esc(v)) + '</td>'; }
  function circle(on) { return '<span class="circ' + (on ? ' on' : '') + '">' + (on || '') + '</span>'; }

  function emptySet(R, no) {
    var n = R.players, o = { A: [], B: [] }, r = { A: [], B: [] };
    for (var i = 0; i < n; i++) { o.A.push(''); o.B.push(''); r.A.push([]); r.B.push([]); }
    return {
      no: no, empty: true, deciding: no === R.setsToWin * 2 - 1, lineup: o, order: o, firstServe: null, leftAtStart: no % 2 ? 'A' : 'B',
      score: { A: 0, B: 0 }, pts: { A: [], B: [] }, rounds: r, timeouts: { A: [], B: [] }, subs: { A: [], B: [] }, switches: [], tto: null
    };
  }

  function pointsGrid(set, side, R) {
    var max = set.deciding ? R.decidingSheetPoints || R.sheetPoints : R.sheetPoints;
    var sc = set.score[side];
    if (sc > max) max = Math.ceil(sc / 12) * 12;
    var rows = R.layout === 'rows' ? 1 : 12;
    var cols = Math.ceil(max / rows);
    var pens = {};
    (set.pts[side] || []).forEach(function (p) { if (p.kind === 'penalty') pens[p.n] = 1; });
    var h = '<table class="pts ' + (rows === 1 ? 'strip' : '') + '">';
    for (var r = 0; r < rows; r++) {
      h += '<tr>';
      for (var c = 0; c < cols; c++) {
        var v = c * rows + r + 1;
        if (v > max) { h += '<td class="void"></td>'; continue; }
        var cls = v < sc ? 'hit' : v === sc ? (set.finished || set.end ? 'hit final' : 'hit') : '';
        if (pens[v]) cls += ' pen';
        h += '<td class="' + cls + '">' + v + '</td>';
      }
      h += '</tr>';
    }
    return h + '</table>';
  }

  function timeoutsBox(set, side, R) {
    var h = '<table class="to"><tr><th>"T"</th></tr>';
    for (var i = 0; i < Math.max(R.timeoutsPerSet, 1); i++) {
      var t = set.timeouts[side][i];
      h += '<tr><td>' + (t ? t.a + ' : ' + t.b : ':') + '</td></tr>';
    }
    if (set.tto && side === 'A') { /* ditampilkan di kepala set */ }
    return h + '</table>';
  }

  function sr(set, side) {
    if (!set.firstServe) return '<span class="sr">S<br>R</span>';
    return '<span class="sr">' + (set.firstServe === side ? '<b class="ring">S</b><br>R' : 'S<br><b class="ring">R</b>') + '</span>';
  }

  // ---------- tata letak kolom (Indoor 6x6 & Pantai 4x4) ----------
  function halfColumns(m, set, side, R, names) {
    var n = R.players;
    var subsByPos = []; for (var i = 0; i < n; i++) subsByPos.push([]);
    set.subs[side].forEach(function (s) { subsByPos[s.pos].push(s); });
    var subRows = Math.max(1, Math.max.apply(null, subsByPos.map(function (x) { return x.length; })));
    var maxRounds = Math.max(n === 6 ? 4 : 3, Math.max.apply(null, set.rounds[side].map(function (x) { return x.length; })));
    var h = '<div class="half"><div class="half-head"><span class="tname">' + esc(names[side]) + '</span>' + sr(set, side) + '<span class="lbl">POINTS</span></div><div class="half-body"><table class="lu">';
    h += '<tr><th class="lbl">Service order</th>' + E.ROMAN.slice(0, n).map(function (r, i) { return '<th>' + (n === 2 ? E.orderLabel(R, set, side, i) : r) + '</th>'; }).join('') + '</tr>';
    h += '<tr><td class="lbl">N° of starting players</td>' + set.lineup[side].map(function (x) { return box(x, 'big'); }).join('') + '</tr>';
    for (var k = 0; k < subRows; k++) {
      h += '<tr><td class="lbl">' + (k === 0 ? 'Substitutes – N° of player' : '') + '</td>' + subsByPos.map(function (l) { var s = l[k]; return box(s ? s['in'] + (s.exceptional ? '*' : '') : ''); }).join('') + '</tr>';
      h += '<tr><td class="lbl">' + (k === 0 ? 'Score at change' : '') + '</td>' + subsByPos.map(function (l) { var s = l[k]; return box(s ? s.a + ':' + s.b : ':', 'small'); }).join('') + '</tr>';
    }
    for (var r = 0; r < maxRounds; r++) {
      h += '<tr class="rnd"><td class="lbl">' + (r === 0 ? 'Service rounds ' : '') + '<span class="ord">' + (r + 1) + (r === 0 ? 'st' : r === 1 ? 'nd' : r === 2 ? 'rd' : 'th') + '</span></td>' +
        set.rounds[side].map(function (l) { var x = l[r]; return '<td>' + (x ? (x.final ? '<span class="circled">' + x.score + '</span>' : esc(x.score)) : '') + '</td>'; }).join('') + '</tr>';
    }
    h += '</table>' + pointsGrid(set, side, R) + timeoutsBox(set, side, R) + '</div></div>';
    return h;
  }

  // ---------- tata letak baris (Pantai 2x2) ----------
  function halfRows(m, set, side, R, names) {
    var n = R.players;
    var maxRounds = Math.max(10, Math.max.apply(null, set.rounds[side].map(function (x) { return x.length; })));
    var h = '<div class="half rows"><div class="half-head"><span class="tname">' + esc(names[side]) + '</span>' + sr(set, side) + '</div><table class="lu rowsl">';
    h += '<tr><th>Service order</th><th>Player no.</th><th colspan="' + maxRounds + '">Service rounds (team score at loss of service)</th></tr>';
    for (var i = 0; i < n; i++) {
      h += '<tr><td class="c b">' + (set.firstServe ? E.orderLabel(R, set, side, i) : (i ? 'III / IV' : 'I / II')) + '</td>' + box(set.lineup[side][i], 'big c');
      for (var r = 0; r < maxRounds; r++) {
        var x = set.rounds[side][i][r];
        h += '<td>' + (x ? (x.final ? '<span class="circled">' + x.score + '</span>' : esc(x.score)) : '') + '</td>';
      }
      h += '</tr>';
    }
    h += '</table><div class="strip-wrap"><span class="lbl">Points</span>' + pointsGrid(set, side, R) +
      '<span class="lbl">Time-out</span><span class="tobox">' + (set.timeouts[side].map(function (t) { return t.a + ':' + t.b; }).join(', ') || ':') + '</span></div></div>';
    return h;
  }

  function setBlock(m, set, R, names) {
    var L = set.leftAtStart, Rt = E.opp(L);
    var half = R.layout === 'rows' ? halfRows : halfColumns;
    var first = set.firstServe || L, second = E.opp(first);
    var extra = [];
    if (set.switches && set.switches.length) {
      extra.push('Court switch (A:B): ' + set.switches.map(function (s) { return s.a + ':' + s.b; }).join(' • '));
    } else if (R.courtSwitchEvery || (R.decidingSideChangeAt && set.deciding)) extra.push('Court switch: ' + (set.empty ? '______' : '—'));
    if (R.ttoAtSum && !set.deciding) extra.push('TTO: ' + (set.tto ? set.tto.a + ':' + set.tto.b : ''));
    var dur = set.end ? E.minutesBetween(set.start, set.end) + ' mn' : '';
    var h = '<section class="setblk' + (set.empty ? ' blank' : '') + '"><div class="set-head"><span class="setname">SET ' + set.no + (set.deciding ? ' <small>(deciding)</small>' : '') + '</span>' +
      '<span>START time <b>' + (E.fmtTime(set.start) || '__:__') + '</b></span><span>END time <b>' + (E.fmtTime(set.end) || '__:__') + '</b></span>' +
      '<span>Duration <b>' + dur + '</b></span>' +
      (extra.length ? '<span class="extra">' + extra.join(' &nbsp;|&nbsp; ') + '</span>' : '') +
      (set.empty ? '' : '<span class="final-score">' + esc(names[L]) + ' <b>' + set.score[L] + ' : ' + set.score[Rt] + '</b> ' + esc(names[Rt]) + '</span>') + '</div>';
    if (R.layout === 'rows') h += '<div class="halves stacked">' + half(m, set, first, R, names) + half(m, set, second, R, names) + '</div>';
    else h += '<div class="halves">' + half(m, set, L, R, names) + half(m, set, Rt, R, names) + '</div>';
    return h + '</section>';
  }

  function header(m, comp, R, names) {
    var tA = m.teamA && S.get('teams', m.teamA), tB = m.teamB && S.get('teams', m.teamB);
    var men = m.category === 'PA', women = m.category === 'PI';
    function chk(on, label) { return '<span class="chk">' + label + ' <i>' + (on ? 'X' : '') + '</i></span>'; }
    return '<header class="sh-head"><div class="sh-title"><div class="t1">' + esc(E.FORMATS[R.format] ? E.FORMATS[R.format].sheetTitle : 'SCORESHEET') + '</div>' +
      '<div class="t2">' + esc(comp ? comp.organizer || '' : '') + '</div></div>' +
      '<table class="hdr"><tr><td colspan="4"><span class="k">Name of the Competition:</span> <b>' + esc(comp ? comp.name : '') + '</b></td>' +
      '<td><span class="k">Match N°:</span> <b>' + esc(m.no) + '</b></td><td><span class="k">Date:</span> <b>' + esc(m.date ? m.date.split('-').reverse().join(' / ') : '') + '</b></td><td><span class="k">Time:</span> <b>' + esc(m.time) + '</b></td></tr>' +
      '<tr><td><span class="k">City / Site:</span> <b>' + esc(comp ? comp.city : '') + '</b></td><td><span class="k">' + (R.format === 'indoor6' ? 'Hall' : 'Beach') + ':</span> <b>' + esc(comp ? comp.venue : '') + '</b></td>' +
      '<td><span class="k">Country code:</span> <b>' + esc(comp ? comp.countryCode : '') + '</b></td><td><span class="k">Court:</span> <b>' + esc(m.court) + '</b></td>' +
      '<td><span class="k">Pool/Phase:</span> <b>' + esc(m.pool) + '</b></td><td colspan="2"><span class="k">' + (R.format === 'indoor6' ? 'Category' : 'Phase') + ':</span> <b>' + esc(R.format === 'indoor6' ? m.age : (m.stage || '')) + '</b></td></tr>' +
      '<tr><td colspan="2">' + chk(men, 'Men / Putra') + chk(women, 'Women / Putri') + '</td>' +
      '<td colspan="5" class="teams"><span class="ab">A</span> <b>' + esc(names.A) + '</b> ' + (tA && tA.code ? '(' + esc(tA.code) + ')' : '') + ' &nbsp; <span class="vs">VS</span> &nbsp; <b>' + esc(names.B) + '</b> ' + (tB && tB.code ? '(' + esc(tB.code) + ')' : '') + ' <span class="ab">B</span></td></tr></table></header>';
  }

  function sanctionsBox(m, st, names) {
    var rows = st.sanctions.filter(function (s) { return s.type !== 'IR'; });
    var ir = st.sanctions.filter(function (s) { return s.type === 'IR'; });
    var h = '<div class="box sanc"><div class="box-t">SANCTIONS</div><table><tr><th>W</th><th>P</th><th>E</th><th>D</th><th>A/B</th><th>Set</th><th>Score</th></tr>';
    var total = Math.max(rows.length, 6);
    for (var i = 0; i < total; i++) {
      var s = rows[i];
      if (!s) { h += '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td>:</td></tr>'; continue; }
      var who = (s.type === 'DW' || s.type === 'DP') ? 'D' : (s.who || 'Tim');
      var col = { W: 0, DW: 0, P: 1, DP: 1, E: 2, D: 3 }[s.type];
      var cells = ['', '', '', '']; cells[col] = who;
      h += '<tr>' + cells.map(function (c) { return box(c, 'c'); }).join('') + box(s.team, 'c') + box(s.set, 'c') + box(s.a + ':' + s.b, 'c') + '</tr>';
    }
    h += '</table><div class="ir">IMPROPER REQUEST: ' + (ir.length ? ir.map(function (s) { return 'Team ' + s.team + ' (set ' + s.set + ', ' + s.a + ':' + s.b + ')'; }).join('; ') : 'Team A ☐ &nbsp; Team B ☐') + '</div>' +
      '<div class="note">W = Warning, P = Penalty, E = Expulsion, D = Disqualification. Delay sanctions: "D" in column W/P.</div></div>';
    return h;
  }

  function resultsBox(m, st, R, names) {
    var sm = E.summary(st);
    var h = '<div class="box res"><div class="box-t">RESULTS</div><table><tr><th colspan="4">' + esc(names.A) + ' (A)</th><th rowspan="2">SET (duration)</th><th colspan="4">' + esc(names.B) + ' (B)</th></tr>' +
      '<tr><th>"T"</th><th>S</th><th>W</th><th>P</th><th>P</th><th>W</th><th>S</th><th>"T"</th></tr>';
    var tot = { tA: 0, sA: 0, wA: 0, pA: 0, tB: 0, sB: 0, wB: 0, pB: 0 };
    var maxSets = R.setsToWin * 2 - 1;
    for (var i = 0; i < maxSets; i++) {
      var s = st.sets[i];
      if (!s) { h += '<tr><td></td><td></td><td></td><td></td><td class="c">' + (i + 1) + ' (&nbsp;&nbsp;&nbsp;&nbsp;)</td><td></td><td></td><td></td><td></td></tr>'; continue; }
      var v = {
        tA: s.timeouts.A.length, sA: s.subs.A.length, wA: s.winner === 'A' ? 1 : 0, pA: s.score.A,
        tB: s.timeouts.B.length, sB: s.subs.B.length, wB: s.winner === 'B' ? 1 : 0, pB: s.score.B
      };
      Object.keys(tot).forEach(function (k) { tot[k] += v[k]; });
      h += '<tr>' + box(v.tA, 'c') + box(v.sA, 'c') + box(v.wA, 'c') + box(v.pA, 'c b') + '<td class="c">' + (i + 1) + ' (' + E.minutesBetween(s.start, s.end) + ')</td>' + box(v.pB, 'c b') + box(v.wB, 'c') + box(v.sB, 'c') + box(v.tB, 'c') + '</tr>';
    }
    h += '<tr class="tot">' + box(tot.tA, 'c') + box(tot.sA, 'c') + box(tot.wA, 'c') + box(tot.pA, 'c') + '<td class="c">Total ' + sm.duration + ' mn</td>' + box(tot.pB, 'c') + box(tot.wB, 'c') + box(tot.sB, 'c') + box(tot.tB, 'c') + '</tr></table>' +
      '<table class="times"><tr><td>Match starting time<br><b>' + (E.fmtTime(st.startTime) || '__:__') + '</b></td><td>Match ending time<br><b>' + (E.fmtTime(st.endTime) || '__:__') + '</b></td><td>Total match duration<br><b>' + (st.finished ? sm.matchMinutes + ' mn' : '') + '</b></td></tr></table>' +
      '<div class="winner">WINNER: <b>' + (st.finished ? esc(names[st.winner]) : '') + '</b> <span class="ws">' + (st.finished ? st.setsWon[st.winner] + ' : ' + st.setsWon[E.opp(st.winner)] : '__ : __') + '</span>' +
      (st.forfeit ? '<div class="small">Forfeit: ' + esc(names[st.forfeit.team]) + (st.forfeit.reason ? ' – ' + esc(st.forfeit.reason) : '') + '</div>' : '') + '</div></div>';
    return h;
  }

  function approvalBox(m, R) {
    var o = m.officials || {};
    function ref(id) { var r = id && S.get('referees', id); return r || {}; }
    var rows = [['1st Referee', 'r1'], ['2nd Referee', 'r2'], ['Reserve', 'reserve'], ['Scorer', 'scorer'], ['Assistant Scorer', 'ascorer']];
    var h = '<div class="box appr"><div class="box-t">APPROVAL</div><table><tr><th>Referees</th><th>Name</th><th>Country</th><th>Signature</th></tr>';
    rows.forEach(function (r) {
      var x = ref(o[r[1]]);
      h += '<tr><td>' + r[0] + '</td><td class="b">' + esc(x.name || '') + '</td><td class="c">' + esc(x.code || x.origin || '') + '</td><td class="sig"></td></tr>';
    });
    h += '</table><table class="lj"><tr><td rowspan="2" class="lbl">Line judges</td>';
    ['lj1', 'lj2'].forEach(function (k, i) { h += '<td>' + (i + 1) + '. ' + esc(ref(o[k]).name || '') + '</td>'; });
    h += '</tr><tr>';
    ['lj3', 'lj4'].forEach(function (k, i) { h += '<td>' + (i + 3) + '. ' + esc(ref(o[k]).name || '') + '</td>'; });
    h += '</tr></table><table class="caps"><tr><td>Team captain A</td><td class="sig"></td><td>Team captain B</td><td class="sig"></td></tr></table></div>';
    return h;
  }

  function rosterBox(m, side, names, R) {
    var t = side === 'A' ? m.teamA : m.teamB;
    t = t && S.get('teams', t);
    var players = (t && t.players) || [];
    var reg = players.filter(function (p) { return !p.libero; }), lib = players.filter(function (p) { return p.libero; });
    var max = R.format === 'indoor6' ? 14 : R.format === 'beach4' ? 6 : 2;
    var h = '<div class="box roster"><div class="box-t">TEAM ' + side + ': ' + esc(names[side]) + (t && t.code ? ' (' + esc(t.code) + ')' : '') + '</div><table><tr><th>N°</th><th>Name of the player</th></tr>';
    for (var i = 0; i < Math.max(reg.length, Math.min(max, 12)); i++) {
      var p = reg[i];
      h += '<tr><td class="c b">' + (p ? esc(p.no) : '') + '</td><td>' + (p ? esc(p.name) + (p.captain ? ' <b>©</b>' : '') : '') + '</td></tr>';
    }
    if (R.hasLibero) {
      h += '<tr><th colspan="2">LIBERO PLAYERS "L"</th></tr>';
      for (var j = 0; j < Math.max(2, lib.length); j++) {
        var l = lib[j];
        h += '<tr><td class="c b">' + (l ? esc(l.no) : '') + '</td><td>' + (l ? esc(l.name) + (l.captain ? ' <b>©</b>' : '') : '') + '</td></tr>';
      }
    }
    var off = (t && t.officials) || {};
    var keys = R.format === 'indoor6' ? ['C', 'AC1', 'AC2', 'T', 'M'] : ['C'];
    h += '<tr><th colspan="2">OFFICIALS</th></tr>' + keys.map(function (k) { return '<tr><td class="c b">' + k + '</td><td>' + esc(off[k] || '') + '</td></tr>'; }).join('');
    h += '</table><table class="caps"><tr><td>Team captain</td><td class="sig"></td></tr><tr><td>Coach</td><td class="sig"></td></tr></table></div>';
    return h;
  }

  function remarksBox(st) {
    var items = st.remarks.map(function (r) { return '<li>' + (r.set ? 'Set ' + r.set + ': ' : '') + esc(r.text) + '</li>'; });
    st.sets.forEach(function (s) {
      ['A', 'B'].forEach(function (t) {
        s.subs[t].forEach(function (x) { if (x.exceptional) items.push('<li>Set ' + s.no + ': pergantian luar biasa tim ' + t + ' #' + esc(x['in']) + ' masuk / #' + esc(x.out) + ' keluar (' + x.a + ':' + x.b + ')</li>'); });
      });
    });
    return '<div class="box rem"><div class="box-t">REMARKS</div><ul>' + items.join('') + '</ul></div>';
  }

  function render(el, id) {
    var m = S.get('matches', id);
    if (!m) { el.innerHTML = U.emptyState('Pertandingan tidak ditemukan', ''); return; }
    var comp = S.get('competitions', m.competitionId);
    var R = m.rules || E.defaultRules(m.format);
    var names = J().names(m);
    var st = E.compute(m, names);
    var sets = st.sets.slice();
    var maxSets = R.setsToWin * 2 - 1;
    if (!st.finished) for (var i = sets.length + 1; i <= maxSets; i++) sets.push(emptySet(R, i));

    var one = VB.sheets.supported(m) && mode !== 'rinci';
    var html = '<div class="print-toolbar no-print"><a class="btn" href="#/scoresheet/' + m.id + '">← Scoresheet</a><a class="btn" href="#/jadwal">Jadwal</a>' +
      '<button class="btn primary" id="doprint">🖨️ Cetak / Simpan PDF</button>' +
      (VB.sheets.supported(m) ? '<select id="mode" class="mode"><option value="resmi"' + (one ? ' selected' : '') + '>Formulir resmi (1 lembar)</option><option value="rinci"' + (one ? '' : ' selected') + '>Rincian lengkap (2 halaman)</option></select>' : '') +
      '<span class="muted small">Pilih kertas <b>A4</b>, orientasi <b>Landscape</b>, margin <b>Default/Minimum</b>, skala <b>100%</b>. ' + (st.sets.length ? '' : 'Pertandingan belum dicatat: hasil cetak berupa <b>blanko yang sudah terisi</b> nama tim, pemain &amp; wasit.') + '</span></div>';
    if (one) {
      html += '<div class="sheet-wrap one">' + VB.sheets.render(m) + '</div>';
      el.innerHTML = html;
      wire(el, m);
      return;
    }
    html += '<div class="sheet-wrap"><div class="sheet fmt-' + R.format + '">' + header(m, comp, R, names);
    html += sets.map(function (s) { return setBlock(m, s, R, names); }).join('');
    html += '<div class="bottom">' + sanctionsBox(m, st, names) + remarksBox(st) + resultsBox(m, st, R, names) + '</div>';
    html += '<div class="bottom2">' + approvalBox(m, R) + rosterBox(m, 'A', names, R) + rosterBox(m, 'B', names, R) + '</div>';
    html += '<div class="sheet-foot">Dicetak dari aplikasi Scoresheet Wasit • ' + new Date().toLocaleString('id-ID') + '</div>';
    html += '</div></div>';
    el.innerHTML = html;
    wire(el, m);
  }

  var mode = 'resmi';
  function wire(el, m) {
    U.qs('#doprint', el).onclick = function () { window.print(); };
    var sel = U.qs('#mode', el);
    if (sel) sel.onchange = function () { mode = sel.value; render(el, m.id); };
    document.body.classList.add('printing-sheet');
  }

  function destroy() { document.body.classList.remove('printing-sheet'); }

  VB.views.cetak = { render: render, destroy: destroy };
})();
