/* Menu Klasemen */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;
  var filt = { format: '', category: '' };

  function ratio(a, b) { return b === 0 ? (a > 0 ? Infinity : 0) : a / b; }
  function fmtRatio(r) { return r === Infinity ? 'MAX' : r.toFixed(3); }

  /** Hitung klasemen untuk format + kategori, dikelompokkan per pool */
  function compute(compId, format, category) {
    var J = VB.views.jadwal;
    var rows = {};
    S.list('teams', function (t) { return t.competitionId === compId && t.format === format && t.category === category; }).forEach(function (t) {
      rows[t.id] = { team: t, pool: t.pool || '-', P: 0, W: 0, L: 0, pts: 0, sw: 0, sl: 0, pw: 0, pl: 0 };
    });
    S.list('matches', function (m) { return m.competitionId === compId && m.format === format && m.category === category; }).forEach(function (m) {
      var st = J.state(m);
      if (!st || !st.finished || !rows[m.teamA] || !rows[m.teamB]) return;
      // hanya pertandingan di dalam pool yang sama
      if (rows[m.teamA].pool !== rows[m.teamB].pool) return;
      var sm = E.summary(st);
      [['A', m.teamA], ['B', m.teamB]].forEach(function (x) {
        var side = x[0], o = E.opp(side), r = rows[x[1]];
        var won = st.winner === side;
        r.P++; if (won) r.W++; else r.L++;
        r.sw += sm.setsWon[side]; r.sl += sm.setsWon[o];
        r.pw += sm.total[side]; r.pl += sm.total[o];
        r.pts += E.classificationPoints(m.rules, won, sm.setsWon[side], sm.setsWon[o], st.forfeit && st.forfeit.team === side);
      });
    });
    var pools = {};
    Object.keys(rows).forEach(function (id) {
      var r = rows[id];
      r.sr = ratio(r.sw, r.sl); r.pr = ratio(r.pw, r.pl);
      (pools[r.pool] = pools[r.pool] || []).push(r);
    });
    Object.keys(pools).forEach(function (p) {
      pools[p].sort(function (a, b) {
        return b.W - a.W || b.pts - a.pts || b.sr - a.sr || b.pr - a.pr || a.team.name.localeCompare(b.team.name);
      });
    });
    return pools;
  }

  function table(rows) {
    var h = '<div class="table-wrap"><table class="tbl standings"><thead><tr><th>#</th><th>Tim</th><th class="c">Main</th><th class="c">M</th><th class="c">K</th><th class="c">Nilai</th><th class="c">Set</th><th class="c">Rasio set</th><th class="c">Poin</th><th class="c">Rasio poin</th></tr></thead><tbody>';
    rows.forEach(function (r, i) {
      h += '<tr><td>' + (i + 1) + '</td><td><b>' + esc(r.team.name) + '</b></td><td class="c">' + r.P + '</td><td class="c">' + r.W + '</td><td class="c">' + r.L + '</td><td class="c b">' + r.pts + '</td>' +
        '<td class="c">' + r.sw + ' - ' + r.sl + '</td><td class="c">' + fmtRatio(r.sr) + '</td><td class="c">' + r.pw + ' - ' + r.pl + '</td><td class="c">' + fmtRatio(r.pr) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function render(el) {
    var comp = S.activeCompetition();
    var html = '<div class="page-head no-print"><h1>Klasemen</h1><button class="btn" id="print">Cetak</button></div>';
    if (!comp) { el.innerHTML = html + U.emptyState('Belum ada kejuaraan', 'Buat kejuaraan terlebih dahulu.'); return; }
    html += '<div class="filters no-print"><select id="ff">' + U.formatOptions(filt.format, true) + '</select><select id="fc">' + U.catOptions(filt.category, true) + '</select></div>';
    html += '<p class="muted small no-print">Urutan: jumlah menang → nilai (Indoor 3-0/3-1 = 3, 3-2 = 2, kalah 2-3 = 1; Pantai menang = 2, kalah = 1, WO = 0) → rasio set → rasio poin. Hanya pertandingan antar tim dalam pool yang sama yang dihitung.</p>';
    html += '<div class="print-only print-title"><h2>KLASEMEN</h2><div>' + esc(comp.name) + '</div></div>';
    var any = false;
    Object.keys(E.FORMATS).forEach(function (f) {
      if (filt.format && f !== filt.format) return;
      Object.keys(U.CATS).forEach(function (c) {
        if (filt.category && c !== filt.category) return;
        var pools = compute(comp.id, f, c);
        var keys = Object.keys(pools).sort();
        if (!keys.length) return;
        any = true;
        html += '<h2 class="section">' + U.formatLabel(f) + ' — ' + U.catLabel(c) + '</h2><div class="pool-grid">';
        keys.forEach(function (p) { html += '<div class="pool"><h3>Pool ' + esc(p) + '</h3>' + table(pools[p]) + '</div>'; });
        html += '</div>';
      });
    });
    if (!any) html += U.emptyState('Belum ada data klasemen', 'Klasemen muncul setelah ada tim (dengan pool) dan pertandingan selesai.');
    el.innerHTML = html;
    U.qs('#print', el).onclick = function () { window.print(); };
    U.qs('#ff', el).onchange = function () { filt.format = this.value; render(el); };
    U.qs('#fc', el).onchange = function () { filt.category = this.value; render(el); };
  }

  VB.views.klasemen = { render: render, compute: compute };
})();
