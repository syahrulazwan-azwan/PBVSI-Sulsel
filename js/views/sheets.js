/*
 * Lembar cetak 1 halaman A4 landscape, mengikuti formulir resmi:
 *  - Indoor 6x6  : International Scoresheet (seperti file Excel SCRST PRAPORPROV)
 *  - Pantai 4x4  : BVB 4 vs 4 scoresheet
 *  - Pantai 2x2  : BVB/11 scoresheet
 * Header & daftar pemain terisi otomatis dari jadwal; poin, putaran servis, time-out,
 * pergantian & sanksi terisi bila pertandingan dicatat di aplikasi.
 */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;

  // ------------------------------------------------------------------ helper
  function cg(ws) { return '<colgroup>' + ws.map(function (w) { return '<col style="width:' + w + 'mm">'; }).join('') + '</colgroup>'; }
  function cgp(ws) {
    var t = ws.reduce(function (a, b) { return a + b; }, 0);
    return '<colgroup>' + ws.map(function (w) { return '<col style="width:' + (w / t * 100).toFixed(2) + '%">'; }).join('') + '</colgroup>';
  }
  function rep(n, w) { var a = []; for (var i = 0; i < n; i++) a.push(w); return a; }
  function td(content, cls, attrs) { return '<td' + (cls ? ' class="' + cls + '"' : '') + (attrs ? ' ' + attrs : '') + '>' + (content == null ? '' : content) + '</td>'; }
  function circ(txt) { return '<span class="ci">' + (txt || '&nbsp;') + '</span>'; }
  function ring(txt) { return '<span class="ring">' + txt + '</span>'; }
  function chk(on) { return '<span class="bx">' + (on ? 'X' : '') + '</span>'; }
  function tm(iso) { var t = E.fmtTime(iso); return t ? t.replace(':', ' : ') : '&nbsp;&nbsp; : &nbsp;&nbsp;'; }
  function dmy(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '-' + p[1] + '-' + p[0].slice(2); }
  function sc(a, b) { return a + ':' + b; }

  function buildCtx(m) {
    var base = S.get('competitions', m.competitionId) || {};
    // data kompetisi diisi per scoresheet; bila kosong pakai data kejuaraan lama
    var comp = {
      name: m.compName != null ? m.compName : base.name, city: m.city != null ? m.city : base.city,
      venue: m.hall != null ? m.hall : base.venue, countryCode: m.ccode != null ? m.ccode : base.countryCode,
      organizer: base.organizer || ''
    };
    var R = m.rules || E.defaultRules(m.format);
    var names = VB.views.jadwal.names(m);
    var st = E.compute(m, names);
    var team = { A: m.teamA ? S.get('teams', m.teamA) : null, B: m.teamB ? S.get('teams', m.teamB) : null };
    // Tim "A" di lembar = tim yang berada di kiri meja pencatat pada set 1
    var sheetA = st.sets[0] ? st.sets[0].leftAtStart : 'A';
    return {
      m: m, comp: comp, R: R, names: names, st: st, team: team,
      sheetA: sheetA, sheetB: E.opp(sheetA), started: st.sets.length > 0,
      code: function (side) { var t = team[side]; return t && t.code ? t.code : names[side]; },
      sheetLetter: function (side) { return st.sets.length ? (side === sheetA ? 'A' : 'B') : ''; }
    };
  }

  /** Data satu tim di satu set (atau kosong) */
  function halfData(ctx, set, side, part) {
    var R = ctx.R, n = R.players;
    var d = {
      side: side, lineup: rep(n, ''), subs: [], rounds: [], pts: 0, ptsFrom: 0, final: false, pens: {},
      to: [], sr: '', start: null, end: null
    };
    for (var i = 0; i < n; i++) { d.subs.push([]); d.rounds.push([]); }
    if (!set) return d;
    d.lineup = set.lineup[side].slice();
    d.sr = set.firstServe === side ? 'S' : 'R';
    d.start = set.start; d.end = set.end;
    var sw = part ? set.switches[0] : null; // pembagian sebelum/sesudah pindah (set penentuan indoor)
    var subs = set.subs[side];
    var sl = sw ? sw.sl[side] : subs.length;
    subs.forEach(function (s, i) {
      if (part === 1 && i >= sl) return;
      if (part === 2 && i < sl) return;
      d.subs[s.pos].push(s);
    });
    set.rounds[side].forEach(function (list, pos) {
      var cut = sw ? sw.rl[side][pos] : list.length;
      d.rounds[pos] = part === 1 ? list.slice(0, cut) : part === 2 ? list.slice(cut) : list.slice();
    });
    var my = set.score[side];
    var atSw = sw ? (side === 'A' ? sw.a : sw.b) : my;
    if (part === 1) { d.pts = sw ? atSw : my; d.final = !sw && !!set.end; }
    else if (part === 2) { d.pts = sw ? my : 0; d.ptsFrom = sw ? atSw : 0; d.final = !!set.end && !!sw; }
    else { d.pts = my; d.final = !!set.end; }
    (set.pts[side] || []).forEach(function (p) { if (p.kind === 'penalty') d.pens[p.n] = 1; });
    d.to = set.timeouts[side].map(function (t) { return sc(t.a, t.b); });
    d.atSwitch = sw ? sc(atSw, side === 'A' ? sw.b : sw.a) : '';
    return d;
  }

  function roundCell(x) {
    if (!x) return '';
    return x.final ? ring(x.score) : String(x.score);
  }

  /** Grid poin: cols x rows, angka urut per kolom */
  function pointsGrid(d, cols, rows, max) {
    var h = '<table class="pg">';
    for (var r = 0; r < rows; r++) {
      h += '<tr>';
      for (var c = 0; c < cols; c++) {
        var v = c * rows + r + 1;
        if (v > max) { h += '<td></td>'; continue; }
        var cls = '';
        if (v > d.ptsFrom && v <= d.pts) cls = 'x';
        if (v === d.pts && d.final) cls += ' fin';
        if (d.pens[v]) cls += ' pen';
        h += '<td class="' + cls + '">' + v + '</td>';
      }
      h += '</tr>';
    }
    return h + '</table>';
  }

  // ------------------------------------------------------------------ INDOOR
  var IN_H = [4.6, 3.8, 4.6, 3.6, 3.2, 3.2, 3.6, 3.6, 3.6, 3.6];
  var IN_H5 = [4.6, 3.8, 4.6, 3.6, 3.2, 3.2, 3.6, 3.6, 3.6];
  var SUBW = 4.15, PTW = 12.2;

  function inLabels(r, nr) {
    var ord = ['1<sup>st</sup>', '2<sup>nd</sup>', '3<sup>rd</sup>', '4<sup>th</sup>', '5<sup>th</sup>', '6<sup>th</sup>', '7<sup>th</sup>', '8<sup>th</sup>'];
    if (r === 0) return '<td colspan="4" class="nob"></td>';
    if (r === 1) return '<td rowspan="5" class="rot"><div>TEAM LINE-UP</div></td><td colspan="3" class="lb r">SERVICE ORDER</td>';
    if (r === 2) return '<td colspan="3" class="lb r b">No. OF STARTING PLAYERS</td>';
    if (r === 3) return '<td rowspan="3" class="lb">SUBSTITUTES</td><td colspan="2" class="lb sm">No. OF PLAYER</td>';
    if (r === 4) return '<td colspan="2" rowspan="2" class="lb sm">SCORE AT CHANGE</td>';
    if (r === 5) return '';
    var k = r - 6;
    return (k === 0 ? '<td colspan="2" rowspan="' + nr + '" class="lb">SERVICE ROUNDS</td>' : '') + '<td class="lb c">' + ord[k] + '</td><td class="lb c">' + ord[k + nr] + '</td>';
  }

  /** Sel untuk satu "half" (satu tim) pada baris r */
  function inHalf(ctx, d, r, kind, opt) {
    // kind: 'L' (kiri: start time), 'R' (kanan: end time), 'C' (kolom setelah pindah)
    var n = 6, nr = opt.nr, h = '';
    var name = d.name || '';
    if (r === 0) {
      var letter = d.letter || '';
      if (kind === 'L') h = td('<span class="tl">Start<br>time</span> ' + tm(d.start), 'hd', 'colspan="3"') + td('<span class="tl">TEAM</span> <b>' + esc(name) + '</b>', 'hd', 'colspan="6"') + td(circ(letter) + ' ' + srMark(d.sr), 'hd c', 'colspan="3"');
      else if (kind === 'R') h = td(srMark(d.sr) + ' ' + circ(letter), 'hd c', 'colspan="3"') + td('<span class="tl">TEAM</span> <b>' + esc(name) + '</b>', 'hd', 'colspan="6"') + td('<span class="tl">End<br>time</span> ' + tm(d.end), 'hd', 'colspan="3"');
      else h = td('<span class="tl">TEAM</span> ' + circ(letter), 'hd', 'colspan="3"') + td('<b>' + esc(name) + '</b>', 'hd', 'colspan="4"') + td('<span class="tl">Points at change</span> <b>' + (d.atSwitch || '') + '</b>', 'hd', 'colspan="5"');
      return h + td('POINTS', 'hd c b');
    }
    if (r === 1) {
      for (var i = 0; i < n; i++) h += td(E.ROMAN[i], 'so', 'colspan="2"');
      return h + td(pointsGrid(d, opt.pcols, opt.prows, opt.pmax), 'pts', 'rowspan="' + opt.prs + '"');
    }
    if (r === 2) { for (i = 0; i < n; i++) h += td(esc(d.lineup[i]), 'big', 'colspan="2"'); }
    if (r === 3) { for (i = 0; i < n; i++) { var s1 = d.subs[i][0]; h += td(s1 ? esc(s1['in']) + (s1.exceptional ? '*' : '') : '', 'c', 'colspan="2"'); } }
    if (r === 4 || r === 5) { for (i = 0; i < n; i++) { var s2 = d.subs[i][r - 4]; h += td(s2 ? sc(s2.a, s2.b) : ':', 'c sm', 'colspan="2"'); } }
    if (r >= 6) {
      var k = r - 6;
      for (i = 0; i < n; i++) {
        var rl = d.rounds[i];
        var extra = rl.length > nr * 2 && k === nr - 1 ? '+' : '';
        h += td('<i>' + (k + 1) + '</i>' + roundCell(rl[k]), 'rd') + td('<i>' + (k + 1 + nr) + '</i>' + roundCell(rl[k + nr]) + extra, 'rd');
      }
    }
    // kolom poin di bawah grid: "T" + 2 time-out
    if (r > opt.prs) {
      var j = r - opt.prs - 1;
      h += j === 0 ? td('"T"', 'c b') : j <= 2 ? td(d.to[j - 1] || ':', 'c') : td('', '');
    }
    return h;
  }

  function srMark(sr) {
    return '<span class="srm">' + (sr === 'S' ? ring('S') : 'S') + '<br>' + (sr === 'R' ? ring('R') : 'R') + '</span>';
  }

  function indoorSetTable(ctx, no, labels) {
    var st = ctx.st, set = st.sets[no - 1];
    var leftSide = no % 2 ? ctx.sheetA : ctx.sheetB, rightSide = E.opp(leftSide);
    var dl = halfData(ctx, set, leftSide), dr = halfData(ctx, set, rightSide);
    dl.name = ctx.started ? ctx.code(leftSide) : ''; dr.name = ctx.started ? ctx.code(rightSide) : '';
    dl.letter = no % 2 ? 'A' : 'B'; dr.letter = no % 2 ? 'B' : 'A';
    var opt = { nr: 4, pcols: 4, prows: 12, pmax: 48, prs: 6 };
    var cols = (labels ? [5, 12, 6, 6] : []).concat([4]).concat(rep(12, SUBW), [PTW], rep(12, SUBW), [PTW]);
    var h = '<table class="g in-set">' + cg(cols);
    IN_H.forEach(function (ht, r) {
      h += '<tr style="height:' + ht + 'mm">';
      if (labels) h += inLabels(r, 4);
      if (r === 0) h += '<td rowspan="' + IN_H.length + '" class="setl">S<br>E<br>T<br><br><b>' + no + '</b></td>';
      h += inHalf(ctx, dl, r, 'L', opt) + inHalf(ctx, dr, r, 'R', opt);
      h += '</tr>';
    });
    return h + '</table>';
  }

  function indoorSet5(ctx) {
    var st = ctx.st, set = st.sets[4];
    var leftSide = set ? set.leftAtStart : ctx.sheetA, rightSide = E.opp(leftSide);
    var hasSw = set && set.switches.length;
    var d1 = halfData(ctx, set, leftSide, hasSw ? 1 : 0), d2 = halfData(ctx, set, rightSide), d3 = halfData(ctx, hasSw ? set : null, leftSide, 2);
    if (set) { d3.lineup = set.lineup[leftSide].slice(); d3.name = ctx.code(leftSide); d3.letter = ctx.sheetLetter(leftSide); }
    d1.name = set ? ctx.code(leftSide) : ''; d2.name = set ? ctx.code(rightSide) : '';
    d1.letter = set ? ctx.sheetLetter(leftSide) : ''; d2.letter = set ? ctx.sheetLetter(rightSide) : '';
    d3.sr = '';
    var o1 = { nr: 3, pcols: 1, prows: 8, pmax: 8, prs: 5 }, o2 = { nr: 3, pcols: 3, prows: 10, pmax: 30, prs: 5 };
    var cols = [5, 12, 6, 6, 4].concat(rep(12, SUBW), [PTW], rep(12, SUBW), [PTW], [4], rep(12, SUBW), [PTW]);
    var h = '<table class="g in-set">' + cg(cols);
    IN_H5.forEach(function (ht, r) {
      h += '<tr style="height:' + ht + 'mm">' + inLabels(r, 3);
      if (r === 0) h += '<td rowspan="' + IN_H5.length + '" class="setl">S<br>E<br>T<br><br><b>5</b></td>';
      h += inHalf(ctx, d1, r, 'L', o1) + inHalf(ctx, d2, r, 'R', o2);
      if (r === 0) h += '<td rowspan="' + IN_H5.length + '" class="setl sm">C<br>H<br>A<br>N<br>G<br>E<br><br>S<br>I<br>D<br>E</td>';
      h += inHalf(ctx, d3, r, 'C', o2) + '</tr>';
    });
    return h + '</table>';
  }

  // ------------------------------------------------------------- bagian bawah
  function sanctionsTable(ctx, rowsN, opts) {
    var st = ctx.st;
    var list = st.sanctions.filter(function (s) { return s.type !== 'IR'; });
    var ir = st.sanctions.filter(function (s) { return s.type === 'IR'; });
    var irMark = { A: '', B: '' };
    ir.forEach(function (s) { irMark[ctx.sheetLetter(s.team) || s.team] = 'X'; });
    var h = '<div class="blk sanc"><div class="ttl">SANCTIONS</div>' +
      '<div class="irq">IMPROPER REQUEST &nbsp; TEAM ' + circ('A') + ' ' + (irMark.A ? '<b>X</b>' : '') + ' : TEAM ' + circ('B') + ' ' + (irMark.B ? '<b>X</b>' : '') + '</div>' +
      '<table class="g">' + cgp([9, 9, 9, 9, 6, 6, 9]) +
      '<tr class="th"><td><small>Warning</small>W</td><td><small>Penalty</small>P</td><td><small>Expulsion</small>E</td><td><small>Disqualif.</small>D</td><td class="sm">A or B</td><td class="sm">SET</td><td class="sm">SCORE</td></tr>';
    for (var i = 0; i < rowsN; i++) {
      var s = list[i];
      if (!s) { h += '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td class="c">:</td></tr>'; continue; }
      var who = (s.type === 'DW' || s.type === 'DP') ? 'D' : (s.who || '');
      var col = { W: 0, DW: 0, P: 1, DP: 1, E: 2, D: 3 }[s.type];
      var cells = ['', '', '', '']; cells[col] = esc(who);
      h += '<tr>' + cells.map(function (c) { return td(c, 'c b'); }).join('') + td(ctx.sheetLetter(s.team) || s.team, 'c') + td(s.set, 'c') + td(sc(s.a, s.b), 'c') + '</tr>';
    }
    if (list.length > rowsN) h += '<tr><td colspan="7" class="sm">+' + (list.length - rowsN) + ' sanksi lain (lihat remarks)</td></tr>';
    h += '</table>' + (opts && opts.note === false ? '' : '<div class="fn">TO RECORD SANCTIONS: put the corresponding abbreviation (No. for player, C = coach, AC = assistant coach, T = trainer, M = medical) or D for delay sanctions in the appropriate column and indicate the team, the set and the score at the moment of the sanction.</div>') + '</div>';
    return h;
  }

  function remarksList(ctx, extraLines) {
    var st = ctx.st, items = [];
    st.remarks.forEach(function (r) { items.push((r.set ? 'Set ' + r.set + ': ' : '') + esc(r.text)); });
    st.sets.forEach(function (s) {
      ['A', 'B'].forEach(function (t) {
        s.subs[t].forEach(function (x) { if (x.exceptional) items.push('Set ' + s.no + ': pergantian luar biasa ' + esc(ctx.code(t)) + ' #' + esc(x['in']) + ' masuk / #' + esc(x.out) + ' keluar (' + sc(x.a, x.b) + ')'); });
      });
    });
    if (st.forfeit) items.push('Forfeit/WO: ' + esc(ctx.names[st.forfeit.team]) + (st.forfeit.reason ? ' – ' + esc(st.forfeit.reason) : ''));
    (extraLines || []).forEach(function (l) { items.push(l); });
    return items.map(function (x) { return '<div>' + x + '</div>'; }).join('');
  }

  function resultsTable(ctx, nSets, opts) {
    var st = ctx.st, sm = E.summary(st);
    var A = ctx.sheetA, B = ctx.sheetB;
    var tot = { tA: 0, sA: 0, wA: 0, pA: 0, tB: 0, sB: 0, wB: 0, pB: 0 };
    var h = '<div class="blk res"><div class="ttl">RESULTS</div><table class="g">' + cgp([7, 6, 6, 9, 20, 9, 6, 6, 7]) +
      '<tr><td colspan="4" class="c"><span class="tl">TEAM</span> <b>' + esc(ctx.started ? ctx.code(A) : '') + '</b></td><td class="c">' + circ('A') + ' ' + circ('B') + '</td><td colspan="4" class="c"><b>' + esc(ctx.started ? ctx.code(B) : '') + '</b> <span class="tl">TEAM</span></td></tr>' +
      '<tr class="th"><td>"T"</td><td>S</td><td>W</td><td>Points</td><td>SET (Duration)</td><td>Points</td><td>W</td><td>S</td><td>"T"</td></tr>';
    for (var i = 0; i < nSets; i++) {
      var s = st.sets[i];
      if (!s) { h += '<tr>' + rep(4, '<td></td>').join('') + '<td class="c">' + (i + 1) + ' ( &nbsp; &nbsp; )</td>' + rep(4, '<td></td>').join('') + '</tr>'; continue; }
      var v = { tA: s.timeouts[A].length, sA: s.subs[A].length, wA: s.winner === A ? 1 : 0, pA: s.score[A], tB: s.timeouts[B].length, sB: s.subs[B].length, wB: s.winner === B ? 1 : 0, pB: s.score[B] };
      Object.keys(tot).forEach(function (k) { tot[k] += v[k]; });
      var done = !!s.end;
      h += '<tr>' + td(v.tA, 'c') + td(v.sA, 'c') + td(done ? v.wA : '', 'c') + td(v.pA, 'c b') + td((i + 1) + ' ( ' + (done ? E.minutesBetween(s.start, s.end) : ' ') + ' )', 'c') + td(v.pB, 'c b') + td(done ? v.wB : '', 'c') + td(v.sB, 'c') + td(v.tB, 'c') + '</tr>';
    }
    var any = st.sets.length > 0;
    h += '<tr class="tot">' + (any ? td(tot.tA, 'c') + td(tot.sA, 'c') + td(tot.wA, 'c') + td(tot.pA, 'c') : rep(4, '<td></td>').join('')) +
      td('Total Set Duration<br><b>' + (any ? sm.duration + ' mn' : ' &nbsp; mn') + '</b>', 'c sm') +
      (any ? td(tot.pB, 'c') + td(tot.wB, 'c') + td(tot.sB, 'c') + td(tot.tB, 'c') : rep(4, '<td></td>').join('')) + '</tr>';
    h += '<tr><td colspan="3" class="c sm">Match Starting time<br><b>' + tm(st.startTime) + '</b></td><td colspan="3" class="c sm">Match Ending time<br><b>' + (st.finished ? tm(st.endTime) : tm(null)) + '</b></td><td colspan="3" class="c sm">Total Match Duration<br><b>' + (st.finished ? sm.matchMinutes + ' mn' : '&nbsp;') + '</b></td></tr>';
    h += '<tr class="win"><td colspan="2" class="b">WINNER</td><td colspan="4" class="b">' + (st.finished ? esc(ctx.names[st.winner]) : '') + '</td><td colspan="3" class="c big">' + (st.finished ? st.setsWon[st.winner] + ' : ' + st.setsWon[E.opp(st.winner)] : (opts && opts.winsTo ? opts.winsTo : '3') + ' : ') + '</td></tr>';
    return h + '</table></div>';
  }

  function ref(ctx, key) { var id = (ctx.m.officials || {})[key]; return (id && S.get('referees', id)) || {}; }

  function approvalTable(ctx, rows) {
    rows = rows || [['1<sup>st</sup>', 'r1'], ['2<sup>nd</sup>', 'r2'], ['Reserve', 'reserve'], ['SCORE', 'scorer'], ['ASS. SCORE', 'ascorer']];
    var h = '<div class="blk appr"><div class="ttl">APPROVAL</div><table class="g">' + cgp([18, 44, 14, 24]) +
      '<tr class="th"><td>REFEREES</td><td>NAME</td><td>COUNTRY</td><td>SIGNATURE</td></tr>';
    rows.forEach(function (r) {
      var x = ref(ctx, r[1]);
      h += '<tr><td class="c b sm">' + r[0] + '</td><td class="b">' + esc(x.name || '') + '</td><td class="c">' + esc(x.code || x.origin || '') + '</td><td></td></tr>';
    });
    h += '</table><table class="g lj">' + cgp([18, 41, 41]) +
      '<tr><td rowspan="2" class="c b sm">LINE<br>JUDGES</td><td><i>1</i> ' + esc(ref(ctx, 'lj1').name || '') + '</td><td><i>2</i> ' + esc(ref(ctx, 'lj2').name || '') + '</td></tr>' +
      '<tr><td><i>3</i> ' + esc(ref(ctx, 'lj3').name || '') + '</td><td><i>4</i> ' + esc(ref(ctx, 'lj4').name || '') + '</td></tr></table>' +
      '<table class="g caps">' + cgp([12, 38, 12, 38]) + '<tr><td class="c">' + circ('A') + '</td><td class="c sm">TEAM CAPTAIN</td><td class="c">' + circ('B') + '</td><td class="c sm">TEAM CAPTAIN</td></tr><tr class="sigrow"><td colspan="2"></td><td colspan="2"></td></tr></table></div>';
    return h;
  }

  /** Panel daftar pemain dua tim (indoor) */
  function rosterPanel(ctx, opts) {
    var A = ctx.sheetA, B = ctx.sheetB;
    var tA = ctx.team[A] || {}, tB = ctx.team[B] || {};
    function regs(t) { return (t.players || []).filter(function (p) { return !p.libero; }); }
    function libs(t) { return (t.players || []).filter(function (p) { return p.libero; }); }
    function pl(p) { return p ? [esc(p.no), esc(p.name) + (p.captain ? ' ©' : '')] : ['', '']; }
    var nReg = opts.regRows, nLib = opts.libRows;
    var h = '<div class="blk roster"><table class="g">' + cgp([6, 25.5, 6, 25.5]) +
      '<tr class="hd"><td class="c">' + circ(ctx.sheetLetter(A)) + '</td><td class="c b big">' + esc(ctx.code(A)) + '</td><td colspan="2" class="c"><b class="big">' + esc(ctx.code(B)) + '</b> ' + circ(ctx.sheetLetter(B)) + '</td></tr>' +
      '<tr class="th"><td>No.</td><td>Name of player</td><td>No.</td><td>Name of player</td></tr>';
    var ra = regs(tA), rb = regs(tB);
    for (var i = 0; i < Math.max(nReg, ra.length, rb.length); i++) {
      var a = pl(ra[i]), b = pl(rb[i]);
      h += '<tr><td class="c b">' + a[0] + '</td><td>' + a[1] + '</td><td class="c b">' + b[0] + '</td><td>' + b[1] + '</td></tr>';
    }
    if (nLib) {
      h += '<tr class="th"><td colspan="4">LIBERO PLAYERS "L"</td></tr>';
      var la = libs(tA), lb = libs(tB);
      for (i = 0; i < Math.max(nLib, la.length, lb.length); i++) {
        var x = pl(la[i]), y = pl(lb[i]);
        h += '<tr><td class="c b">' + x[0] + '</td><td>' + x[1] + '</td><td class="c b">' + y[0] + '</td><td>' + y[1] + '</td></tr>';
      }
    }
    h += '</table><table class="g">' + cgp([27, 9.5, 26.5]) + '<tr class="th"><td colspan="3">OFFICIALS</td></tr>';
    var oa = tA.officials || {}, ob = tB.officials || {};
    opts.officials.forEach(function (k) {
      h += '<tr><td class="r">' + esc(oa[k] || '') + '</td><td class="c b">' + k + '</td><td>' + esc(ob[k] || '') + '</td></tr>';
    });
    h += '</table><table class="g">' + cgp([31.5, 31.5]) + '<tr class="th"><td colspan="2">SIGNATURES</td></tr>' +
      '<tr class="sigrow"><td class="sm">Team Captain</td><td class="sm">Team Captain</td></tr><tr class="sigrow"><td class="sm">Coach</td><td class="sm">Coach</td></tr></table></div>';
    return h;
  }

  function indoorHeader(ctx) {
    var m = ctx.m, c = ctx.comp;
    var cA = ctx.started ? ctx.code(ctx.sheetA) : ctx.code('A'), cB = ctx.started ? ctx.code(ctx.sheetB) : ctx.code('B');
    var lA = ctx.started ? 'A' : '', lB = ctx.started ? 'B' : '';
    return '<div class="dist">Distribution of copies : <b>1st page</b>: to Ref. Sub-Comm. Member, <b>2nd &amp; 3rd page</b>: one to each team; <b>4th page</b>: to Organising Committee.</div>' +
      '<div class="hrow"><table class="g hdr">' + cg([20, 30, 18, 22, 16, 14, 10, 18, 12, 18, 10, 11]) +
      '<tr><td colspan="2" class="b">Name of the competition :</td><td colspan="10" class="b big">' + esc(c.name || '') + '</td></tr>' +
      '<tr><td>City :</td><td colspan="3" class="b">' + esc(c.city || '') + '</td><td colspan="2">Country code :</td><td colspan="2" class="b c">' + esc(c.countryCode || '') + '</td><td>DATE</td><td colspan="3" class="b c">' + esc(dmy(m.date)) + ' &nbsp; <span class="tl">TIME</span> ' + esc(m.time || '') + '</td></tr>' +
      '<tr><td>Hall :</td><td colspan="2" class="b">' + esc(c.venue || '') + '</td><td class="c">Pool/Phase</td><td class="b c">' + esc(m.pool || '') + '</td><td class="c">Match No.</td><td class="b c big">' + esc(m.no || '') + '</td>' +
      '<td class="c">' + circ(lA) + ' <b class="big">' + esc(cA) + '</b></td><td class="c b">TEAMS<br>VS</td><td colspan="2" class="c"><b class="big">' + esc(cB) + '</b> ' + circ(lB) + '</td><td class="c sm">Court<br><b>' + esc(m.court || '') + '</b></td></tr>' +
      '<tr><td>Division :</td><td>Men ' + chk(m.category === 'PA') + '</td><td>Women ' + chk(m.category === 'PI') + '</td><td>Category :</td><td>Senior ' + chk(m.age === 'Senior' || !m.age) + '</td><td>Junior ' + chk(m.age === 'Junior') + '</td><td colspan="2">Youth ' + chk(m.age === 'Youth') + '</td><td colspan="4" class="sm">' + esc(m.note || '') + '</td></tr></table>' +
      '<div class="title"><img class="lg" src="' + U.PBVSI_LOGO + '" alt="PBVSI"><div class="tt"><div class="t0">' + esc(c.organizer || '') + '</div><div class="t1">INTERNATIONAL<br>SCORESHEET</div><div class="t2">INDOOR VOLLEYBALL</div></div>' +
      (U.compLogo(c) ? '<img class="lg" src="' + esc(U.compLogo(c)) + '" alt="">' : '') + '</div></div>';
  }

  function renderIndoor(ctx) {
    var h = '<div class="sheet1 in">' + indoorHeader(ctx);
    h += '<div class="srow">' + indoorSetTable(ctx, 1, true) + indoorSetTable(ctx, 2, false) + '</div>';
    h += '<div class="srow">' + indoorSetTable(ctx, 3, true) + indoorSetTable(ctx, 4, false) + '</div>';
    h += '<div class="srow bottomrow"><div class="leftcol">' + indoorSet5(ctx) +
      '<div class="brow">' + sanctionsTable(ctx, 11) +
      '<div class="midcol"><div class="blk rem"><div class="ttl">REMARKS</div><div class="remtxt">' + remarksList(ctx) + '</div></div>' + approvalTable(ctx) + '</div>' +
      resultsTable(ctx, 5) + '</div></div>' +
      rosterPanel(ctx, { regRows: 12, libRows: 2, officials: ['C', 'AC1', 'AC2', 'T', 'M'] }) + '</div>';
    return h + '</div>';
  }

  // ---------------------------------------------------------------- PANTAI 4x4
  var B4_H = [5, 3.8, 4.8, 3.6, 3.4, 3.4, 3.8, 3.8, 3.8];

  function beachHeader(ctx, title) {
    var m = ctx.m, c = ctx.comp, stg = (m.stage || '').toLowerCase();
    function ph(lbl, key) { return lbl + ' ' + chk(stg.indexOf(key) >= 0); }
    var cA = ctx.code(ctx.sheetA), cB = ctx.code(ctx.sheetB);
    var lg = U.compLogo(c);
    function names2(side) {
      var t = ctx.team[side];
      var ps = (t && t.players || []).slice(0, 2).map(function (p) { return esc(p.name); }).join(' / ');
      return ps ? ps + ' <span class="sm">(' + esc(ctx.code(side)) + ')</span>' : esc(ctx.code(side));
    }
    var players2 = ctx.R.format === 'beach2' ?
      '<tr><td class="sm">Team ' + circ(ctx.sheetLetter(ctx.sheetA)) + '</td><td colspan="3" class="b">' + names2(ctx.sheetA) + '</td><td class="c b">TEAM VS.</td><td class="sm">Team ' + circ(ctx.sheetLetter(ctx.sheetB)) + '</td><td colspan="2" class="b">' + names2(ctx.sheetB) + '</td></tr>' : '';
    return '<div class="btitle"><img class="lg" src="' + U.PBVSI_LOGO + '" alt="PBVSI"><span class="tx">' + title + '</span><span class="ed">' + esc(c.organizer || '') + '</span>' + (lg ? '<img class="lg" src="' + esc(lg) + '" alt="">' : '') + '</div>' +
      '<table class="g hdr">' + cg([24, 50, 16, 44, 28, 26, 22, 75]) +
      '<tr><td class="sm">Name of Competition:</td><td colspan="7" class="b big">' + esc(c.name || '') + '</td></tr>' +
      '<tr><td class="sm">Site:</td><td class="b">' + esc(c.city || '') + '</td><td class="sm">Beach:</td><td class="b">' + esc(c.venue || '') + '</td>' +
      '<td>Men ' + chk(m.category === 'PA') + ' Women ' + chk(m.category === 'PI') + '</td>' +
      '<td colspan="3" class="sm">' + ph('Main Draw', 'main') + ' ' + ph('Qual.', 'qual') + ' ' + ph('P.P.', 'pool') + ' ' + ph('W.B.', 'winner') + ' ' + ph('Class.', 'class') + ' ' + ph('S-F', 'semi') + ' ' + ph('Finals', 'final') + '</td></tr>' +
      '<tr><td class="sm">Match No.:</td><td class="b big">' + esc(m.no || '') + '</td><td class="sm">Court:</td><td class="b big">' + esc(m.court || '') + '</td>' +
      '<td class="sm">Date: <b>' + esc(dmy(m.date)) + '</b></td><td class="sm">Time: <b>' + esc(m.time || '') + '</b></td>' +
      '<td class="c">' + circ(ctx.sheetLetter(ctx.sheetA)) + '</td><td class="c"><b class="big">' + esc(cA) + '</b> &nbsp; <b>TEAM VS</b> &nbsp; <b class="big">' + esc(cB) + '</b> ' + circ(ctx.sheetLetter(ctx.sheetB)) + '</td></tr>' + players2 + '</table>';
  }

  function b4Labels(r) {
    if (r === 0) return '';
    if (r === 1) return '<td rowspan="5" class="rot"><div>Team line-up</div></td><td colspan="3" class="lb r">Service order</td>';
    if (r === 2) return '<td colspan="3" class="lb r">N° of Starting players</td>';
    if (r === 3) return '<td rowspan="3" class="lb">Substitutes</td><td colspan="2" class="lb c">N° of</td>';
    if (r === 4) return '<td colspan="2" rowspan="2" class="lb c">Score at change</td>';
    if (r === 5) return '';
    var k = r - 6;
    return (k === 0 ? '<td colspan="2" rowspan="3" class="lb">Service rounds</td>' : '') + '<td class="lb c">' + ['1st', '2nd', '3rd'][k] + '</td><td class="lb c">' + ['4th', '5th', '6th'][k] + '</td>';
  }

  function b4Half(ctx, d, r, kind) {
    var n = 4, h = '', i;
    if (r === 0) {
      if (kind === 'L') return td('<span class="tl">START<br>time</span> ' + tm(d.start), 'hd', 'colspan="2"') + td('<span class="tl">TEAM</span> <b>' + esc(d.name || '') + '</b>', 'hd', 'colspan="4"') + td(srMark(d.sr), 'hd c', 'colspan="2"') + td('POINTS', 'hd c b');
      if (kind === 'R') return td(srMark(d.sr), 'hd c', 'colspan="2"') + td('<span class="tl">TEAM</span> <b>' + esc(d.name || '') + '</b>', 'hd', 'colspan="4"') + td('<span class="tl">END<br>Time</span> ' + tm(d.end), 'hd', 'colspan="2"') + td('POINTS', 'hd c b');
      return td('<span class="tl">TEAM</span> <b>' + esc(d.name || '') + '</b>', 'hd', 'colspan="5"') + td('<span class="tl">POINTS<br>at switch</span> <b>' + (d.atSwitch || ':') + '</b>', 'hd', 'colspan="3"') + td('POINTS', 'hd c b');
    }
    if (r === 1) {
      for (i = 0; i < n; i++) h += td(E.ROMAN[i], 'so', 'colspan="2"');
      return h + td(pointsGrid(d, 3, 12, 36), 'pts', 'rowspan="6"');
    }
    if (r === 2) for (i = 0; i < n; i++) h += td(esc(d.lineup[i]), 'big', 'colspan="2"');
    if (r === 3) for (i = 0; i < n; i++) { var s1 = d.subs[i][0]; h += td(s1 ? esc(s1['in']) : '', 'c', 'colspan="2"'); }
    if (r === 4 || r === 5) for (i = 0; i < n; i++) { var s2 = d.subs[i][r - 4]; h += td(s2 ? sc(s2.a, s2.b) : ':', 'c sm', 'colspan="2"'); }
    if (r >= 6) {
      var k = r - 6;
      for (i = 0; i < n; i++) {
        var rl = d.rounds[i];
        var over = k === 2 && rl.length > 6 ? '<span class="ov">' + rl.slice(6).map(roundCell).join(' ') + '</span>' : '';
        h += td('<i>' + (k + 1) + '</i>' + roundCell(rl[k]), 'rd') + td('<i>' + (k + 4) + '</i>' + roundCell(rl[k + 3]) + over, 'rd');
      }
      h += k === 0 ? '' : k === 1 ? td('"T"', 'c b') : td(d.to[0] || ':', 'c');
    }
    return h;
  }

  function beach4Set(ctx, no) {
    var set = ctx.st.sets[no - 1];
    var L = set ? set.leftAtStart : ctx.sheetA, Rt = E.opp(L);
    var d1 = halfData(ctx, set, L), d2 = halfData(ctx, set, Rt), d3 = halfData(ctx, null, L);
    d1.name = set ? ctx.code(L) : ''; d2.name = set ? ctx.code(Rt) : '';
    if (set) {
      d3.name = ctx.code(L);
      var sw = set.switches[0];
      if (sw) d3.atSwitch = L === 'A' ? sc(sw.a, sw.b) : sc(sw.b, sw.a);
    }
    var W = 8.8, P = 12;
    var cols = [5, 12, 6, 6].concat(rep(8, W), [P], rep(8, W), [P], [5], rep(8, W), [P]);
    var h = '<table class="g b4-set">' + cg(cols);
    B4_H.forEach(function (ht, r) {
      h += '<tr style="height:' + ht + 'mm">';
      if (r === 0) h += '<td colspan="4" class="setn">SET ' + no + '</td>';
      else h += b4Labels(r);
      h += b4Half(ctx, d1, r, 'L') + b4Half(ctx, d2, r, 'R');
      if (r === 0) h += '<td rowspan="' + B4_H.length + '" class="setl sw"><div>COURT SWITCH</div></td>';
      h += b4Half(ctx, d3, r, 'C') + '</tr>';
    });
    return h + '</table>';
  }

  function switchLines(ctx) {
    var out = [];
    ctx.st.sets.forEach(function (s) {
      if (!s.switches.length && !s.tto) return;
      var l = 'Set ' + s.no + ' – court switch (' + esc(ctx.code('A')) + ':' + esc(ctx.code('B')) + '): ' + s.switches.map(function (x) { return sc(x.a, x.b); }).join(', ');
      if (s.tto) l += ' • TTO ' + sc(s.tto.a, s.tto.b);
      out.push(l);
    });
    return out;
  }

  function beachTeams(ctx, nPlayers) {
    var A = ctx.sheetA, B = ctx.sheetB;
    function col(side) {
      var t = ctx.team[side] || {}, ps = t.players || [];
      var h = '<table class="g">' + cgp([7, 33]) + '<tr class="hd"><td class="c">' + circ(ctx.sheetLetter(side)) + '</td><td class="b">' + esc(ctx.code(side)) + ' <span class="sm">' + esc(t.code && t.name !== t.code ? t.name : '') + '</span></td></tr><tr class="th"><td>No.</td><td>Player\'s name</td></tr>';
      for (var i = 0; i < Math.max(nPlayers, ps.length); i++) { var p = ps[i]; h += '<tr><td class="c b">' + (p ? esc(p.no) : '') + '</td><td>' + (p ? esc(p.name) + (p.captain ? ' ©' : '') : '') + '</td></tr>'; }
      h += '<tr><td class="c b">C</td><td>' + esc((t.officials || {}).C || '') + '</td></tr></table>';
      return h;
    }
    return '<div class="blk teams"><div class="ttl">TEAMS</div><div class="two">' + col(A) + col(B) + '</div>' +
      '<table class="g caps">' + cgp([40, 40]) + '<tr class="sigrow"><td class="sm">Captain\'s signature</td><td class="sm">Captain\'s signature</td></tr><tr class="sigrow"><td class="sm">Coach\'s signature</td><td class="sm">Coach\'s signature</td></tr></table></div>';
  }

  function renderBeach4(ctx) {
    var h = '<div class="sheet1 b4">' + beachHeader(ctx, 'BVB 4 vs 4 – BEACH VOLLEYBALL INTERNATIONAL SCORESHEET <small>RPS-2 out of 3 sets</small>');
    for (var i = 1; i <= 3; i++) h += beach4Set(ctx, i);
    h += '<div class="brow b4b">' + beachTeams(ctx, 6) + sanctionsTable(ctx, 6, { note: false }) + resultsTable(ctx, 3, { winsTo: '2' }) +
      '<div class="midcol">' + approvalTable(ctx, [['1<sup>st</sup> Referee', 'r1'], ['2<sup>nd</sup> Referee', 'r2'], ['Scorer', 'scorer'], ['Ass. Scorer', 'ascorer']]) +
      '<div class="blk rem"><div class="ttl">REMARKS</div><div class="remtxt">' + remarksList(ctx, switchLines(ctx)) + '</div></div></div></div>';
    return h + '</div>';
  }

  // ---------------------------------------------------------------- PANTAI 2x2
  function b2SanctionCells(ctx, set, side, who) {
    // Formal Warn | Pen | Pen | Exp | Disq  -> skor saat sanksi
    var cells = [':', ':', ':', ':', ':'];
    if (!set) return cells;
    var pens = 0;
    ctx.st.sanctions.forEach(function (s) {
      if (s.set !== set.no || s.team !== side || String(s.who) !== String(who)) return;
      var v = sc(s.a, s.b);
      if (s.type === 'W') cells[0] = v;
      else if (s.type === 'P') { cells[1 + Math.min(pens, 1)] = v; pens++; }
      else if (s.type === 'E') cells[3] = v;
      else if (s.type === 'D') cells[4] = v;
    });
    return cells;
  }
  function b2Delay(ctx, set, side) {
    var cells = [':', ':', ':', ':'], p = 0;
    if (!set) return cells;
    ctx.st.sanctions.forEach(function (s) {
      if (s.set !== set.no || s.team !== side) return;
      if (s.type === 'DW') cells[0] = sc(s.a, s.b);
      if (s.type === 'DP') { cells[1 + Math.min(p, 2)] = sc(s.a, s.b); p++; }
    });
    return cells;
  }

  function beach2Set(ctx, no) {
    var set = ctx.st.sets[no - 1], R = ctx.R;
    var first = set ? set.firstServe : ctx.sheetA, second = E.opp(first);
    var NB = 21; // kotak putaran servis per pemain
    var cols = [7, 8, 7, 7, 7, 7, 7, 5.5, 5.5].concat(rep(NB, 9.8), [17]); // ≈ 284 mm
    var swCells = [];
    if (set) {
      set.switches.forEach(function (x) {
        var oldLeft = E.opp(x.left);
        var l = oldLeft === 'A' ? x.a : x.b, r = oldLeft === 'A' ? x.b : x.a;
        var isTto = set.tto && set.tto.a === x.a && set.tto.b === x.b;
        swCells.push(l + ' : ' + r + (isTto ? ' <b>TTO</b>' : ''));
      });
    }
    function swc(i) { if (i === 7 && swCells.length > 8) return swCells.slice(7).join(' • '); return swCells[i] || ':'; }
    function serverRow(side, idx, rowNo) {
      var d = set ? set.rounds[side][idx] : [];
      var no = set ? set.lineup[side][idx] : '';
      var lbl = set ? E.orderLabel(R, set, side, idx) : (side === first ? ['I', 'III'][idx] : ['II', 'IV'][idx]);
      var sanc = b2SanctionCells(ctx, set, side, no);
      var h = '<tr class="sv">' + td(lbl, 'c b') + td(esc(no), 'c big') + sanc.map(function (c) { return td(c, 'c sm'); }).join('') + td('', '') + td('', '');
      for (var i = 0; i < NB; i++) {
        var x = d[i];
        var over = i === NB - 1 && d.length > NB ? '+' : '';
        h += td('<i>' + (i + 1) + '</i>' + roundCell(x) + over, 'rd');
      }
      return h + td(swc(rowNo), 'c sm sw') + '</tr>';
    }
    function coachRow(side, rowNo) {
      var s = b2SanctionCells(ctx, set, side, 'C');
      return '<tr class="sv">' + td('C', 'c b', 'colspan="2"') + s.map(function (c) { return td(c, 'c sm'); }).join('') + '<td colspan="' + (2 + NB) + '" class="nob"></td>' + td(swc(rowNo), 'c sm sw') + '</tr>';
    }
    function pointsRow(side, rowNo) {
      var dd = halfData(ctx, set, side);
      var dl = b2Delay(ctx, set, side);
      var lr = set ? (set.leftAtStart === side ? 'L' : 'R') : '';
      var max = Math.max(44, dd.pts);
      var pts = '';
      for (var v = 1; v <= max; v++) {
        var cls = v <= dd.pts ? 'x' : '';
        if (v === dd.pts && dd.final) cls += ' fin';
        if (dd.pens[v]) cls += ' pen';
        pts += '<span class="' + cls + '">' + v + '</span>';
      }
      return '<tr class="pr">' + td('<span class="tl">Time Out</span><br>' + (dd.to[0] || ':'), 'c', 'colspan="2"') +
        td('<span class="tl">Warn.</span><br>' + dl[0], 'c sm') + td('<span class="tl">Pen.</span><br>' + dl[1], 'c sm') + td('<span class="tl">Pen.</span><br>' + dl[2], 'c sm') + td('<span class="tl">Pen.</span><br>' + dl[3], 'c sm') +
        td('<span class="tl">L/R</span> ' + circ(lr) + ' <b>' + esc(set ? ctx.code(side) : '') + '</b>', 'sm', 'colspan="3"') +
        '<td colspan="' + NB + '" class="strip">' + pts + '</td>' + td(swc(rowNo), 'c sm sw') + '</tr>';
    }
    var head = '<tr class="th">' + td('service<br>order') + td('player<br>no.') + td('Formal<br>Warn.') + td('Pen.') + td('Pen.') + td('Exp.') + td('Disq.') + td('BMP/VCS<br>Unsuc.', '', 'colspan="2"') +
      '<td colspan="' + NB + '" class="setttl"><b class="big">' + ['1st', '2nd', '3rd'][no - 1] + ' SET</b> &nbsp; <span class="tl">Start time</span> <b>' + (set ? tm(set.start) : tm(null)) + '</b> &nbsp; <span class="tl">End time</span> <b>' + (set && set.end ? tm(set.end) : tm(null)) + '</b>' +
      (set && set.end ? ' &nbsp; <b>' + esc(ctx.code(first)) + ' ' + set.score[first] + ' : ' + set.score[second] + ' ' + esc(ctx.code(second)) + '</b>' : '') + '</td>' + td('Court switch<br>L : R', 'sm b') + '</tr>';
    var h = '<table class="g b2-set">' + cg(cols) + head;
    h += serverRow(first, 0, 0) + serverRow(first, 1, 1) + coachRow(first, 2) + pointsRow(first, 3) + pointsRow(second, 4) + coachRow(second, 5) + serverRow(second, 0, 6) + serverRow(second, 1, 7);
    return h + '</table>';
  }

  function renderBeach2(ctx) {
    var h = '<div class="sheet1 b2">' + beachHeader(ctx, 'BVB/11 – BEACH VOLLEYBALL INTERNATIONAL SCORESHEET <small>RPS-2 out of 3 sets</small>');
    for (var i = 1; i <= 3; i++) h += beach2Set(ctx, i);
    var coin = '';
    h += '<div class="brow b2b">' + beachTeams(ctx, 2) + resultsTable(ctx, 3, { winsTo: '2' }) +
      approvalTable(ctx, [['1<sup>st</sup> Referee', 'r1'], ['2<sup>nd</sup> Referee', 'r2'], ['Scorer', 'scorer'], ['Ass. Scorer', 'ascorer']]) +
      '<div class="blk rem"><div class="ttl">REMARKS</div><div class="remtxt">' + remarksList(ctx, sanctionLinesIR(ctx)) + '</div>' +
      '<div class="coin">Winner of Coin Toss: L or R &nbsp; Set 1 ' + circ('') + ' &nbsp; Set 3 ' + circ('') + coin + ' &nbsp;&nbsp; Improper request: L or R ' + circ('') + circ('') + '</div></div></div>';
    return h + '</div>';
  }
  function sanctionLinesIR(ctx) {
    return ctx.st.sanctions.filter(function (s) { return s.type === 'IR'; }).map(function (s) {
      return 'Improper request ' + esc(ctx.code(s.team)) + ' (set ' + s.set + ', ' + sc(s.a, s.b) + ')';
    });
  }

  // -------------------------------------------------------------- publik
  function supported(m) {
    var R = m.rules || E.defaultRules(m.format);
    if (R.format === 'indoor6') return R.players === 6 && R.setsToWin <= 3;
    if (R.format === 'beach4') return R.players === 4 && R.setsToWin <= 2;
    if (R.format === 'beach2') return R.players === 2 && R.setsToWin <= 2;
    return false;
  }

  function render(m) {
    var ctx = buildCtx(m);
    if (ctx.R.format === 'indoor6') return renderIndoor(ctx);
    if (ctx.R.format === 'beach4') return renderBeach4(ctx);
    return renderBeach2(ctx);
  }

  VB.sheets = { render: render, supported: supported, buildCtx: buildCtx, halfData: halfData };
})();
