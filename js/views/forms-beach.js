/* Cetak di atas formulir asli – Pantai 2x2 (BVB/11 2026) & Pantai 4x4 (BVB 4 vs 4). */
(function () {
  'use strict';
  var S = window.VBStore, E = window.VBEngine;

  function F() { return VB.forms; }
  function sc(a, b) { return a + ':' + b; }
  function stageMarks(pen, h, m) {
    var s = (m.stage || '').toLowerCase();
    [['main', 'main'], ['qual', 'qual'], ['pool', 'pp'], ['winner', 'wb'], ['class', 'cls'], ['semi', 'sf'], ['final', 'fin']].forEach(function (k) {
      if (s.indexOf(k[0]) >= 0 && h[k[1]]) pen.cross(h[k[1]][0], h[k[1]][1], 4.2);
    });
    if (m.category === 'PA') pen.cross(h.men[0], h.men[1], 4.2);
    if (m.category === 'PI') pen.cross(h.women[0], h.women[1], 4.2);
  }
  function dateParts(m) { if (!m.date) return ['', '', '']; var p = m.date.split('-'); return [p[2], p[1], p[0].slice(2)]; }
  function players(ctx, side) { var t = ctx.team[side] || {}; return t.players || []; }
  function sanctionsOf(ctx, set, side, who) {
    return ctx.st.sanctions.filter(function (s) { return s.set === set.no && s.team === side && String(s.who) === String(who); });
  }
  function remarkLines(ctx, extra) {
    var out = F().plain(ctx);
    ctx.st.sanctions.filter(function (s) { return s.type === 'IR'; }).forEach(function (s) {
      out.push('Improper request ' + ctx.code(s.team) + ' (set ' + s.set + ', ' + sc(s.a, s.b) + ')');
    });
    var r0 = F().ref(ctx, 'reserve'); if (r0.name) out.push('Wasit cadangan: ' + r0.name + (r0.code ? ' (' + r0.code + ')' : ''));
    return out.concat(extra || []);
  }
  function writeLines(pen, R, lines) {
    lines.slice(0, R.n).forEach(function (ln, i) { pen.t(R.x, R.y0 + i * R.step, ln, { size: 8, align: 'l', bold: false, max: R.max }); });
  }
  function pointsMarks(pen, pts, n, from, final) {
    pts.forEach(function (p, i) {
      var v = i + 1;
      if (v > (from || 0) && v <= n) pen.slash(p[0], p[1], 3.3, 3.3);
      if (v === n && final) pen.ring(p[0], p[1], 4.6, 1);
    });
  }

  // ================================================================ 2x2
  function render2(ctx, Pen, page) {
    var L = VB.FORM_LAYOUTS.beach2, m = ctx.m, c = ctx.comp, st = ctx.st, h = L.hdr;
    var p1 = new Pen(), p2 = new Pen();
    // --- kepala
    p1.t(h.comp[0], h.comp[1], c.name || '', { size: 10, align: 'l', max: 640 });
    p1.t(h.matchNo[0], h.matchNo[1], m.no || '', { size: 11 });
    p1.t(h.site[0], h.site[1], c.city || '', { size: 9, align: 'l', max: 80 });
    p1.t(h.beach[0], h.beach[1], c.venue || '', { size: 9, align: 'l', max: 86 });
    p1.t(h.court[0], h.court[1], m.court || '', { size: 10 });
    var dp = dateParts(m); h.date.forEach(function (p, i) { p1.t(p[0], p[1], dp[i], { size: 9 }); });
    stageMarks(p1, h, m);
    var A = ctx.sheetA, B = ctx.sheetB;
    [[A, 'L'], [B, 'R']].forEach(function (cfg) {
      var side = cfg[0], k = cfg[1], ps = players(ctx, side);
      if (ctx.started) p1.t(h['lr' + k][0], h['lr' + k][1], k, { size: 10 });
      p1.t(h['n1' + k][0], h['n1' + k][1], ps[0] ? ps[0].name : '', { size: 9, max: 120 });
      p1.t(h['n2' + k][0], h['n2' + k][1], ps[1] ? ps[1].name : '', { size: 9, max: 120 });
      p1.t(h['code' + k][0], h['code' + k][1], ctx.code(side), { size: 10, max: 66 });
    });

    // --- set 1..3
    L.sets.forEach(function (Sx, i) {
      var set = st.sets[i];
      if (!set) return;
      var pen = Sx.page === 0 ? p1 : p2;
      var top = set.firstServe, bot = E.opp(top);
      pen.t(Sx.start[0], Sx.start[2], F().hm(set.start)[0], { size: 9 }); pen.t(Sx.start[1], Sx.start[2], F().hm(set.start)[1], { size: 9 });
      if (set.end) { pen.t(Sx.end[0], Sx.end[2], F().hm(set.end)[0], { size: 9 }); pen.t(Sx.end[1], Sx.end[2], F().hm(set.end)[1], { size: 9 }); }
      [[top, [Sx.rowI, Sx.rowIII], Sx.rowC1, Sx.pts1, Sx.lr1, Sx.to1], [bot, [Sx.rowII, Sx.rowIV], Sx.rowC2, Sx.pts2, Sx.lr2, Sx.to2]].forEach(function (cfg) {
        var side = cfg[0];
        cfg[1].forEach(function (y, k) {
          var no = set.lineup[side][k];
          pen.t(Sx.noX, y, no, { size: 10 });
          // sanksi pemain: Formal warn | Pen | Pen | Exp | Disq
          var pens = 0;
          sanctionsOf(ctx, set, side, no).forEach(function (s) {
            var col = s.type === 'W' ? 0 : s.type === 'P' ? 1 + Math.min(pens++, 1) : s.type === 'E' ? 3 : s.type === 'D' ? 4 : -1;
            if (col >= 0) pen.colon(Sx.sancX[col], y, s.a, s.b, 7, 4.5);
          });
          // putaran servis
          var rl = set.rounds[side][k];
          rl.slice(0, 21).forEach(function (x, j) {
            pen.t(Sx.boxes[j], y + 0.5, x.score, { size: 8.5 });
            if (x.final) pen.ring(Sx.boxes[j], y + 0.5, 5, 1);
          });
          if (rl.length > 21) pen.t(Sx.boxes[20] + 9, y - 3, '+' + (rl.length - 21), { size: 5 });
        });
        // pelatih
        var pc = 0;
        sanctionsOf(ctx, set, side, 'C').forEach(function (s) {
          var col = s.type === 'W' ? 0 : s.type === 'P' ? 1 + Math.min(pc++, 1) : s.type === 'E' ? 3 : s.type === 'D' ? 4 : -1;
          if (col >= 0) pen.colon(Sx.sancX[col], cfg[2], s.a, s.b, 7, 4.5);
        });
        // time-out & sanksi penundaan
        var to = cfg[5], t0 = set.timeouts[side][0];
        if (t0) pen.colon(to[0][0], to[0][1], t0.a, t0.b, 7.5, 4.5);
        var dp2 = 0;
        ctx.st.sanctions.filter(function (s) { return s.set === set.no && s.team === side && (s.type === 'DW' || s.type === 'DP'); }).forEach(function (s) {
          var col = s.type === 'DW' ? 1 : 2 + Math.min(dp2++, 2);
          pen.colon(to[col][0], to[col][1], s.a, s.b, 7.5, 4.5);
        });
        // L/R & poin
        pen.t(cfg[4][0], cfg[4][1], set.leftAtStart === side ? 'L' : 'R', { size: 9 });
        pointsMarks(pen, cfg[3], set.score[side], 0, !!set.end);
      });
      // pindah lapangan (skor kiri : kanan)
      set.switches.slice(0, Sx.sw.length).forEach(function (x, j) {
        var oldLeft = E.opp(x.left), l = oldLeft === 'A' ? x.a : x.b, r = oldLeft === 'A' ? x.b : x.a;
        if (j === 2) pen.colon(Sx.swX - 1, Sx.sw[j], l, r, 6.5, 4.5); // baris bertanda TTO
        else pen.colon(Sx.swX, Sx.sw[j], l, r, 8, 5);
      });
    });

    // --- halaman 2: tim, hasil, approval, remarks
    var T = L.teams;
    [[A, 'L'], [B, 'R']].forEach(function (cfg) {
      var side = cfg[0], k = cfg[1], ps = players(ctx, side), t = ctx.team[side] || {};
      p2.t(T['code' + k][0], T['code' + k][1], ctx.code(side), { size: 10, max: 60 });
      if (ctx.started) p2.t(T['lr' + k][0], T['lr' + k][1], k, { size: 9 });
      ps.slice(0, 2).forEach(function (p, i) {
        p2.t(T['no' + k], T.rows[i], p.no, { size: 10 });
        p2.t(T['name' + k], T.rows[i], p.name + (p.captain ? ' ©' : ''), { size: 9, align: 'l', max: 145 });
      });
      p2.t(T['name' + k], T.coach, (t.officials || {}).C || '', { size: 9, align: 'l', bold: false, max: 145 });
    });
    var R = L.res, sm = E.summary(st);
    if (st.sets.length) {
      var tot = [0, 0, 0, 0, 0, 0];
      st.sets.slice(0, 3).forEach(function (s, i) {
        var done = !!s.end, y = R.rows[i];
        var v = [s.timeouts[A].length, done ? (s.winner === A ? 1 : 0) : '', s.score[A], s.score[B], done ? (s.winner === B ? 1 : 0) : '', s.timeouts[B].length];
        [0, 1, 2].forEach(function (j) { p2.t(R.cols[j], y, v[j], { size: 9 }); });
        [3, 4, 5].forEach(function (j) { p2.t(R.cols[j + 1], y, v[j], { size: 9 }); });
        if (done) p2.t(R.cols[3], y, E.minutesBetween(s.start, s.end), { size: 9 });
        v.forEach(function (x, j) { tot[j] += +x || 0; });
      });
      [0, 1, 2].forEach(function (j) { p2.t(R.cols[j], R.tot, tot[j], { size: 9 }); });
      [3, 4, 5].forEach(function (j) { p2.t(R.cols[j + 1], R.tot, tot[j], { size: 9 }); });
      p2.t(R.cols[3], R.tot, sm.duration, { size: 9 });
      var s0 = F().hm(st.startTime); p2.t(R.start[0][0], R.start[0][1], s0[0], { size: 8.5 }); p2.t(R.start[1][0], R.start[1][1], s0[1], { size: 8.5 });
      if (st.finished) {
        var e0 = F().hm(st.endTime); p2.t(R.end[0][0], R.end[0][1], e0[0], { size: 8.5 }); p2.t(R.end[1][0], R.end[1][1], e0[1], { size: 8.5 });
        p2.t(R.dur[0][0], R.dur[0][1], Math.floor(sm.matchMinutes / 60), { size: 8.5 }); p2.t(R.dur[1][0], R.dur[1][1], sm.matchMinutes % 60, { size: 8.5 });
        var wp = players(ctx, st.winner);
        p2.t(R.win1[0], R.win1[1], wp[0] ? wp[0].name : ctx.names[st.winner], { size: 8.5, max: 80 });
        p2.t(R.win2[0], R.win2[1], wp[1] ? wp[1].name : '', { size: 8.5, max: 80 });
        p2.t(R.winCode[0], R.winCode[1], ctx.code(st.winner), { size: 10, max: 52 });
        p2.t(R.loser[0], R.loser[1], st.setsWon[E.opp(st.winner)], { size: 12 });
      }
    }
    var ap = L.appr;
    ['r1', 'r2', 'scorer', 'ascorer'].forEach(function (k, i) {
      var r = F().ref(ctx, k); p2.t(ap.nameX, ap.rows[i], r.name || '', { size: 9, align: 'l', max: 122 }); p2.t(ap.countryX, ap.rows[i], r.code || r.origin || '', { size: 8, max: 44 });
    });
    ['lj1', 'lj2', 'lj3', 'lj4'].forEach(function (k, i) { var r = F().ref(ctx, k), p = ap.lj[i]; p2.t(p[0], p[1], r.name || '', { size: 7.5, align: 'l', bold: false, max: 115 }); });
    writeLines(p2, L.rem, remarkLines(ctx));
    return page({ w: L.w, h: L.h, bg: L.bg[0] }, p1, 'a4') + page({ w: L.w, h: L.h, bg: L.bg[1] }, p2, 'a4');
  }

  // ================================================================ 4x4
  function half4(pen, H, d, opts) {
    var c = H.cols, rows = H.rows;
    var cx = function (i) { return (c[i] + c[i + 1]) / 2; };
    var mid = function (r) { return (rows[r] + rows[r + 1]) / 2; };
    if (H.time && opts.time) { var t = F().hm(opts.time); pen.t(H.time[0], H.time[2], t[0], { size: 9 }); pen.t(H.time[1], H.time[2], t[1], { size: 9 }); }
    if (H.team && d.name) pen.t(H.team[0], H.team[1], d.name, { size: 10, max: 34 });
    if (H.sr && d.sr) pen.t(H.sr[0], H.sr[1], d.sr, { size: 10 });
    if (H.letter && d.letter) pen.t(H.letter[0], H.letter[1], d.letter, { size: 10 });
    if (H.code && d.name) pen.t(H.code[0], H.code[1], d.name, { size: 9, align: 'l', max: 30 });
    if (H.atSw && d.atSwitch) { var ab = d.atSwitch.split(':'); pen.colon(H.atSw[0], H.atSw[1], ab[0], ab[1], 9, 5); }
    if (!d.lineup) return;
    for (var i = 0; i < 4; i++) {
      pen.t(cx(i), mid(1), d.lineup[i], { size: 12 });
      var s1 = d.subs[i][0], s2 = d.subs[i][1];
      if (s1) { pen.t(cx(i), mid(2), s1['in'] + (s1.exceptional ? '*' : ''), { size: 10 }); pen.colon(cx(i), mid(3), s1.a, s1.b, 8, 5); }
      if (s2) pen.colon(cx(i), mid(4), s2.a, s2.b, 8, 5);
      var w = c[i + 1] - c[i];
      for (var k = 0; k < 3; k++) {
        var y = mid(5 + k) + 1;
        [[d.rounds[i][k], c[i] + w * 0.28], [d.rounds[i][k + 3], c[i] + w * 0.76]].forEach(function (e) {
          if (!e[0]) return;
          pen.t(e[1], y, e[0].score, { size: 9 });
          if (e[0].final) pen.ring(e[1], y, 5.3, 1);
        });
      }
      if (d.rounds[i].length > 6) pen.t(c[i + 1] - 2, mid(7) + 4, d.rounds[i].slice(6).map(function (x) { return x.score; }).join(','), { size: 5, align: 'r', bold: false });
    }
    pointsMarks(pen, H.points, d.pts, d.ptsFrom, d.final);
    if (d.to[0]) { var tt = d.to[0].split(':'); pen.colon(H.T[0], H.T[1], tt[0], tt[1], 8.5, 5); }
  }

  function render4(ctx, Pen, page) {
    var L = VB.FORM_LAYOUTS.beach4, m = ctx.m, c = ctx.comp, st = ctx.st, h = L.hdr;
    var p1 = new Pen(), p2 = new Pen();
    var A = ctx.sheetA, B = ctx.sheetB;
    p1.t(h.comp[0], h.comp[1], c.name || '', { size: 10, align: 'l', max: 620 });
    p1.t(h.site[0], h.site[1], c.city || '', { size: 10, align: 'l', max: 180 });
    p1.t(h.beach[0], h.beach[1], c.venue || '', { size: 10, align: 'l', max: 180 });
    stageMarks(p1, h, m);
    p1.t(h.matchNo[0], h.matchNo[1], m.no || '', { size: 12 });
    p1.t(h.court[0], h.court[1], m.court || '', { size: 12 });
    var dp = dateParts(m); h.date.forEach(function (p, i) { p1.t(p[0], p[1], dp[i], { size: 10 }); });
    p1.t(h.codeL[0], h.codeL[1], ctx.code(A), { size: 11, max: 100 });
    p1.t(h.codeR[0], h.codeR[1], ctx.code(B), { size: 11, max: 100 });
    if (ctx.started) { p1.t(h.circL[0], h.circL[1], 'A', { size: 10 }); p1.t(h.circR[0], h.circR[1], 'B', { size: 10 }); }

    L.sets.forEach(function (Hs, i) {
      var set = st.sets[i];
      if (!set) return;
      var l = set.leftAtStart, r = E.opp(l);
      var d1 = VB.sheets.halfData(ctx, set, l), d2 = VB.sheets.halfData(ctx, set, r);
      d1.name = ctx.code(l); d2.name = ctx.code(r);
      half4(p1, Hs[0], d1, { time: set.start });
      half4(p1, Hs[1], d2, { time: set.end });
      var sw = set.switches[0];
      half4(p1, Hs[2], { name: ctx.code(l), letter: ctx.sheetLetter(l), atSwitch: sw ? (l === 'A' ? sc(sw.a, sw.b) : sc(sw.b, sw.a)) : '' }, {});
    });

    // --- halaman 2
    var T = L.teams;
    if (ctx.started) { p2.t(T.circL[0], T.circL[1], 'A', { size: 9 }); p2.t(T.circR[0], T.circR[1], 'B', { size: 9 }); }
    [[A, 'L'], [B, 'R']].forEach(function (cfg) {
      var side = cfg[0], k = cfg[1], t = ctx.team[side] || {}, ps = t.players || [];
      p2.t(T['code' + k][0], T['code' + k][1], ctx.code(side), { size: 10, max: 70 });
      ps.slice(0, T.rows.length - 1).forEach(function (p, i) {
        var y = (T.rows[i] + T.rows[i + 1]) / 2;
        p2.t(T['no' + k], y, p.no, { size: 10 });
        p2.t(T['name' + k], y, p.name + (p.captain ? ' ©' : ''), { size: 8.5, align: 'l', max: 110 });
      });
      var off = t.officials || {};
      T.off.forEach(function (o) { p2.t(k === 'L' ? T.offL : T.offR, o[0], off[o[1]] || '', { size: 8, align: k === 'L' ? 'r' : 'l', bold: false, max: 120 }); });
    });
    var sc4 = L.sanc, list = F().sanctionsList(ctx);
    list.slice(0, sc4.rows.length - 1).forEach(function (s, i) {
      var y = (sc4.rows[i] + sc4.rows[i + 1]) / 2;
      var who = (s.type === 'DW' || s.type === 'DP') ? 'D' : (s.who || 'T');
      var col = { W: 0, DW: 0, P: 1, DP: 1, E: 2, D: 3 }[s.type];
      p2.t(sc4.cols[col], y, who, { size: 9 });
      p2.t(sc4.cols[4], y, ctx.sheetLetter(s.team) || s.team, { size: 9 });
      p2.t(sc4.cols[5], y, s.set, { size: 9 });
      p2.colon(sc4.cols[6], y, s.a, s.b, 9, 6);
    });
    st.sanctions.filter(function (s) { return s.type === 'IR'; }).forEach(function (s) {
      var p = ctx.sheetLetter(s.team) === 'B' ? sc4.irB : sc4.irA; p2.cross(p[0], p[1], 3.5);
    });
    var R = L.res, sm = E.summary(st);
    if (st.sets.length) {
      p2.t(R.teamL[0], R.teamL[1], ctx.code(A), { size: 10, max: 50 });
      p2.t(R.teamR[0], R.teamR[1], ctx.code(B), { size: 10, max: 50 });
      p2.t(R.circA[0], R.circA[1], 'A', { size: 11 }); p2.t(R.circB[0], R.circB[1], 'B', { size: 11 });
      var tot = [0, 0, 0, 0, 0, 0, 0, 0];
      st.sets.slice(0, 3).forEach(function (s, i) {
        var done = !!s.end, y = R.rows[i];
        var v = [s.timeouts[A].length, s.subs[A].length, done ? (s.winner === A ? 1 : 0) : '', s.score[A], s.score[B], done ? (s.winner === B ? 1 : 0) : '', s.subs[B].length, s.timeouts[B].length];
        [0, 1, 2, 3].forEach(function (j) { p2.t(R.cols[j], y, v[j], { size: 9 }); });
        [4, 5, 6, 7].forEach(function (j) { p2.t(R.cols[j + 1], y, v[j], { size: 9 }); });
        if (done) p2.t(R.cols[4], y, E.minutesBetween(s.start, s.end), { size: 9 });
        v.forEach(function (x, j) { tot[j] += +x || 0; });
      });
      [0, 1, 2, 3].forEach(function (j) { p2.t(R.cols[j], R.tot, tot[j], { size: 9 }); });
      [4, 5, 6, 7].forEach(function (j) { p2.t(R.cols[j + 1], R.tot, tot[j], { size: 9 }); });
      p2.t(R.totDur[0], R.totDur[1], sm.duration, { size: 9 });
      var s0 = F().hm(st.startTime); p2.t(R.start[0][0], R.start[0][1], s0[0], { size: 8.5 }); p2.t(R.start[1][0], R.start[1][1], s0[1], { size: 8.5 });
      if (st.finished) {
        var e0 = F().hm(st.endTime); p2.t(R.end[0][0], R.end[0][1], e0[0], { size: 8.5 }); p2.t(R.end[1][0], R.end[1][1], e0[1], { size: 8.5 });
        p2.t(R.dur[0][0], R.dur[0][1], Math.floor(sm.matchMinutes / 60), { size: 8.5 }); p2.t(R.dur[1][0], R.dur[1][1], sm.matchMinutes % 60, { size: 8.5 });
        p2.t(R.winner[0], R.winner[1], ctx.names[st.winner], { size: 10, max: 110 });
        p2.t(R.loser[0], R.loser[1], st.setsWon[E.opp(st.winner)], { size: 12 });
      }
    }
    var ap = L.appr;
    ['r1', 'r2', 'scorer', 'ascorer'].forEach(function (k, i) {
      var r = F().ref(ctx, k); p2.t(ap.nameX, ap.rows[i], r.name || '', { size: 9.5, align: 'l', max: 190 }); p2.t(ap.countryX, ap.rows[i], r.code || r.origin || '', { size: 8.5, max: 42 });
    });
    ['lj1', 'lj2', 'lj3', 'lj4'].forEach(function (k, i) { var r = F().ref(ctx, k), p = ap.lj[i]; p2.t(p[0], p[1], r.name || '', { size: 7.5, align: 'l', bold: false, max: 85 }); });
    // remarks: semua skor pindah lapangan & TTO
    var sw = [];
    st.sets.forEach(function (s) {
      if (!s.switches.length) return;
      sw.push('Set ' + s.no + ' – court switch (' + ctx.code('A') + ':' + ctx.code('B') + '): ' + s.switches.map(function (x) { return sc(x.a, x.b); }).join(', ') + (s.tto ? ' • TTO ' + sc(s.tto.a, s.tto.b) : ''));
    });
    writeLines(p2, L.rem, remarkLines(ctx, sw));
    return page({ w: L.w, h: L.h, bg: L.bg[0] }, p1, 'a4') + page({ w: L.w, h: L.h, bg: L.bg[1] }, p2, 'a4');
  }

  VB.formsBeach = { render2: render2, render4: render4 };
})();
