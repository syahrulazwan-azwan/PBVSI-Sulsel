/*
 * Cetak di atas FORMULIR ASLI.
 * Latar = gambar halaman formulir resmi (FIVB indoor 2013, BVB/11 2x2 2026, BVB 4x4),
 * data ditulis di atas kotak-kotaknya dengan "tinta biru" memakai SVG.
 * Koordinat (satuan pt halaman formulir asli) ada di form-layouts.js.
 */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine;
  var INK = '#0b3a9e';

  function xe(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------------------------------------------------------- penggambar SVG
  function Pen() { this.out = []; }
  Pen.prototype.t = function (x, y, str, o) {
    if (str === '' || str == null || !x) return;
    o = o || {};
    var size = o.size || 10, anchor = o.align === 'l' ? 'start' : o.align === 'r' ? 'end' : 'middle';
    var s = String(str), extra = '';
    if (o.max) {
      var est = s.length * size * (o.bold ? 0.6 : 0.55);
      if (est > o.max) extra = ' textLength="' + o.max + '" lengthAdjust="spacingAndGlyphs"';
    }
    this.out.push('<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="' + anchor + '" dominant-baseline="central"' +
      (o.bold === false ? '' : ' font-weight="700"') + extra + '>' + xe(s) + '</text>');
  };
  Pen.prototype.ring = function (x, y, r, w) { if (x) this.out.push('<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + INK + '" stroke-width="' + (w || 1.2) + '"/>'); };
  Pen.prototype.line = function (x1, y1, x2, y2, w) { this.out.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + INK + '" stroke-width="' + (w || 1.1) + '" stroke-linecap="round"/>'); };
  Pen.prototype.slash = function (x, y, hw, hh) { this.line(x - hw, y + hh, x + hw, y - hh, 1.1); };
  Pen.prototype.cross = function (x, y, r) { this.line(x - r, y - r, x + r, y + r, 1.4); this.line(x - r, y + r, x + r, y - r, 1.4); };
  /** skor "a:b" mengapit tanda titik dua yang sudah tercetak */
  Pen.prototype.colon = function (x, y, a, b, size, gap) { gap = gap || 6; this.t(x - gap, y, a, { size: size, align: 'r' }); this.t(x + gap, y, b, { size: size, align: 'l' }); };

  function page(L, pen, cls) {
    return '<div class="tpage ' + (cls || '') + '"><img class="tbg" src="' + L.bg + '" alt="">' +
      '<svg class="tov" viewBox="0 0 ' + L.w + ' ' + L.h + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="' + INK + '" font-family="Arial, Helvetica, sans-serif">' +
      pen.out.join('') + '</svg></div>';
  }

  function hm(iso) { var t = E.fmtTime(iso); return t ? t.split(':') : ['', '']; }
  function schedHM(m) { var mm = String(m.time || '').match(/(\d{1,2})[.:](\d{2})/); return mm ? [('0' + mm[1]).slice(-2), mm[2]] : ['', '']; }
  function ref(ctx, k) { var id = (ctx.m.officials || {})[k]; return (id && S.get('referees', id)) || {}; }
  function plain(ctx) {
    var st = ctx.st, out = [];
    st.remarks.forEach(function (r) { out.push((r.set ? 'Set ' + r.set + ': ' : '') + r.text); });
    st.sets.forEach(function (s) {
      ['A', 'B'].forEach(function (t) {
        s.subs[t].forEach(function (x) { if (x.exceptional) out.push('Set ' + s.no + ': pergantian luar biasa ' + ctx.code(t) + ' #' + x['in'] + ' masuk / #' + x.out + ' keluar (' + x.a + ':' + x.b + ')'); });
      });
    });
    if (st.forfeit) out.push('Forfeit/WO: ' + ctx.names[st.forfeit.team] + (st.forfeit.reason ? ' – ' + st.forfeit.reason : ''));
    return out;
  }
  function sanctionsList(ctx) { return ctx.st.sanctions.filter(function (s) { return s.type !== 'IR'; }); }

  // ------------------------------------------------------------ INDOOR (A3 FIVB)
  function inHalf(pen, ctx, H, d, opts) {
    var n = 6, c = H.cols, rows = H.rows, nr = H.nr;
    var cx = function (i) { return (c[i] + c[i + 1]) / 2; };
    var mid = function (r) { return (rows[r] + rows[r + 1]) / 2; };
    // kepala
    if (H.time && opts.time) { var t = hm(opts.time); pen.t(H.time[0], H.time[2], t[0], { size: 10 }); pen.t(H.time[1], H.time[2], t[1], { size: 10 }); }
    if (H.team && d.name) pen.t(H.team[0], H.team[1], d.name, { size: 11, max: 44 });
    if (H.letter && d.letter) pen.t(H.letter[0], H.letter[1], d.letter, { size: 12 });
    if (H.S && d.sr) { var p = d.sr === 'S' ? H.S : H.R; pen.ring(p[0], p[1], 5.6); }
    if (H.atChange && d.atSwitchPts !== undefined) pen.t(H.atChange[0], H.atChange[1], d.atSwitchPts, { size: 11 });
    for (var i = 0; i < n; i++) {
      pen.t(cx(i), mid(1), d.lineup[i], { size: 13 });
      var s1 = d.subs[i][0], s2 = d.subs[i][1];
      if (s1) { pen.t(cx(i), mid(2), s1['in'] + (s1.exceptional ? '*' : ''), { size: 10 }); pen.colon(cx(i), mid(3), s1.a, s1.b, 8, 5); }
      if (s2) pen.colon(cx(i), mid(4), s2.a, s2.b, 8, 5);
      var w = c[i + 1] - c[i];
      for (var k = 0; k < nr; k++) {
        var y = mid(5 + k) + 1.5;
        [[d.rounds[i][k], c[i] + w * 0.27], [d.rounds[i][k + nr], c[i] + w * 0.77]].forEach(function (e) {
          if (!e[0]) return;
          pen.t(e[1], y, e[0].score, { size: 9 });
          if (e[0].final) pen.ring(e[1], y, 5.5, 1);
        });
      }
    }
    // poin
    H.points.forEach(function (pt, idx) {
      var v = idx + 1;
      if (v > d.ptsFrom && v <= d.pts) pen.slash(pt[0], pt[1], 3.6, 3.2);
      if (v === d.pts && d.final) pen.ring(pt[0], pt[1], 4.6, 1);
    });
    // time-out
    d.to.forEach(function (t, j) { if (H.T[1][j]) { var ab = t.split(':'); pen.colon(H.T[0], H.T[1][j], ab[0], ab[1], 9, 5); } });
  }

  function renderIndoor(ctx) {
    var L = VB.FORM_LAYOUTS.indoor, pen = new Pen(), m = ctx.m, c = ctx.comp, st = ctx.st, h = L.hdr;
    // --- kepala formulir
    pen.t(h.comp[0], h.comp[1], c.name || '', { size: 12, align: 'l', max: 500 });
    pen.t(h.city[0], h.city[1], c.city || '', { size: 10, align: 'l', max: 215 });
    pen.t(h.ccode[0], h.ccode[1], c.countryCode || '', { size: 10 });
    if (m.date) { var dp = m.date.split('-'); pen.t(h.date[0][0], h.date[0][1], dp[2], { size: 10 }); pen.t(h.date[1][0], h.date[1][1], dp[1], { size: 10 }); pen.t(h.date[2][0], h.date[2][1], dp[0].slice(2), { size: 10 }); }
    var sh = schedHM(m); pen.t(h.time[0][0], h.time[0][1], sh[0], { size: 10 }); pen.t(h.time[1][0], h.time[1][1], sh[1], { size: 10 });
    pen.t(h.hall[0], h.hall[1], c.venue || '', { size: 10, align: 'l', max: 150 });
    pen.t(h.pool[0], h.pool[1], m.pool || '', { size: 10, max: 44 });
    pen.t(h.matchNo[0], h.matchNo[1], m.no || '', { size: 11 });
    var A = ctx.sheetA, B = ctx.sheetB;
    pen.t(h.codeL[0], h.codeL[1], ctx.code(A), { size: 12, max: 44 });
    pen.t(h.codeR[0], h.codeR[1], ctx.code(B), { size: 12, max: 44 });
    if (ctx.started) { pen.t(h.circL[0], h.circL[1], 'A', { size: 13 }); pen.t(h.circR[0], h.circR[1], 'B', { size: 13 }); }
    if (m.category === 'PA') pen.cross(h.men[0], h.men[1], 4.5);
    if (m.category === 'PI') pen.cross(h.women[0], h.women[1], 4.5);
    var age = m.age || 'Senior';
    pen.cross(h[age.toLowerCase()][0], h[age.toLowerCase()][1], 4.5);

    // --- set 1–4
    for (var k = 1; k <= 4; k++) {
      var set = st.sets[k - 1];
      if (!set) continue;
      var lft = k % 2 ? A : B, rgt = E.opp(lft);
      var dl = VB.sheets.halfData(ctx, set, lft), dr = VB.sheets.halfData(ctx, set, rgt);
      dl.name = ctx.code(lft); dr.name = ctx.code(rgt);
      inHalf(pen, ctx, L.sets[k - 1][0], dl, { time: set.start });
      inHalf(pen, ctx, L.sets[k - 1][1], dr, { time: set.end });
    }
    // --- set 5 (dengan kolom pindah lapangan)
    var s5 = st.sets[4];
    if (s5) {
      var l5 = s5.leftAtStart, r5 = E.opp(l5), sw = s5.switches.length > 0;
      var d1 = VB.sheets.halfData(ctx, s5, l5, sw ? 1 : 0), d2 = VB.sheets.halfData(ctx, s5, r5);
      d1.name = ctx.code(l5); d2.name = ctx.code(r5); d1.letter = ctx.sheetLetter(l5); d2.letter = ctx.sheetLetter(r5);
      inHalf(pen, ctx, L.set5[0], d1, { time: s5.start });
      inHalf(pen, ctx, L.set5[1], d2, { time: s5.end });
      if (sw) {
        var d3 = VB.sheets.halfData(ctx, s5, l5, 2);
        d3.lineup = s5.lineup[l5].slice(); d3.letter = ctx.sheetLetter(l5); d3.sr = '';
        d3.atSwitchPts = l5 === 'A' ? s5.switches[0].a : s5.switches[0].b;
        inHalf(pen, ctx, L.set5[2], d3, {});
      }
    }

    // --- sanksi
    var sc = L.sanc, list = sanctionsList(ctx);
    list.slice(0, sc.rows.length - 1).forEach(function (s, i) {
      var y = (sc.rows[i] + sc.rows[i + 1]) / 2;
      var who = (s.type === 'DW' || s.type === 'DP') ? 'D' : (s.who || 'T');
      var col = { W: 0, DW: 0, P: 1, DP: 1, E: 2, D: 3 }[s.type];
      pen.t(sc.cols[col], y, who, { size: 9 });
      pen.t(sc.cols[4], y, ctx.sheetLetter(s.team) || s.team, { size: 9 });
      pen.t(sc.cols[5], y, s.set, { size: 9 });
      pen.colon(sc.cols[6], y, s.a, s.b, 9, 6);
    });
    st.sanctions.filter(function (s) { return s.type === 'IR'; }).forEach(function (s) {
      var p = ctx.sheetLetter(s.team) === 'B' ? sc.irB : sc.irA; pen.cross(p[0], p[1], 4);
    });
    // --- remarks
    var rm = L.rem, lines = plain(ctx);
    if (list.length > sc.rows.length - 1) lines.push('Sanksi lain: ' + list.slice(sc.rows.length - 1).map(function (s) { return s.type + ' ' + (s.who || '') + ' tim ' + ctx.sheetLetter(s.team) + ' set ' + s.set + ' (' + s.a + ':' + s.b + ')'; }).join('; '));
    var ref0 = ref(ctx, 'reserve'); if (ref0.name) lines.push('Wasit cadangan: ' + ref0.name + (ref0.code ? ' (' + ref0.code + ')' : ''));
    lines.slice(0, rm.rows.length + 1).forEach(function (ln, i) {
      if (i === 0) pen.t(rm.first[0], rm.first[1], ln, { size: 8.5, align: 'l', bold: false, max: rm.x1 - rm.first[0] });
      else pen.t(rm.x0, rm.rows[i - 1], ln, { size: 8.5, align: 'l', bold: false, max: rm.x1 - rm.x0 });
    });
    // --- approval
    var ap = L.appr;
    ['r1', 'r2', 'scorer', 'ascorer'].forEach(function (k, i) {
      var r = ref(ctx, k); pen.t(ap.nameX, ap.rows[i], r.name || '', { size: 10, align: 'l', max: 205 }); pen.t(ap.countryX, ap.rows[i], r.code || r.origin || '', { size: 9, max: 48 });
    });
    ['lj1', 'lj2', 'lj3', 'lj4'].forEach(function (k, i) { var r = ref(ctx, k), p = ap.lj[i]; pen.t(p[0], p[1], r.name || '', { size: 9, align: p[2], max: 185 }); });
    // --- hasil
    var rs = L.res, sm = E.summary(st), any = st.sets.length > 0;
    if (any) {
      pen.t(rs.teamL[0], rs.teamL[1], ctx.code(A), { size: 11, max: 42 });
      pen.t(rs.teamR[0], rs.teamR[1], ctx.code(B), { size: 11, max: 42 });
      var tot = [0, 0, 0, 0, 0, 0, 0, 0];
      st.sets.forEach(function (s, i) {
        if (i >= rs.rows.length) return;
        var done = !!s.end, y = rs.rows[i];
        var v = [s.timeouts[A].length, s.subs[A].length, done ? (s.winner === A ? 1 : 0) : '', s.score[A], s.score[B], done ? (s.winner === B ? 1 : 0) : '', s.subs[B].length, s.timeouts[B].length];
        [0, 1, 2, 3].forEach(function (j) { pen.t(rs.cols[j], y, v[j], { size: 10 }); });
        [4, 5, 6, 7].forEach(function (j) { pen.t(rs.cols[j + 1], y, v[j], { size: 10 }); });
        if (done) pen.t(rs.cols[4], y, E.minutesBetween(s.start, s.end), { size: 10 });
        v.forEach(function (x, j) { tot[j] += +x || 0; });
      });
      [0, 1, 2, 3].forEach(function (j) { pen.t(rs.cols[j], rs.tot, tot[j], { size: 10 }); });
      [4, 5, 6, 7].forEach(function (j) { pen.t(rs.cols[j + 1], rs.tot, tot[j], { size: 10 }); });
      pen.t(rs.totDur[0], rs.totDur[1], sm.duration, { size: 10 });
      var s0 = hm(st.startTime); pen.t(rs.start[0][0], rs.start[0][1], s0[0], { size: 9 }); pen.t(rs.start[1][0], rs.start[1][1], s0[1], { size: 9 });
      if (st.finished) {
        var e0 = hm(st.endTime); pen.t(rs.end[0][0], rs.end[0][1], e0[0], { size: 9 }); pen.t(rs.end[1][0], rs.end[1][1], e0[1], { size: 9 });
        pen.t(rs.dur[0][0], rs.dur[0][1], Math.floor(sm.matchMinutes / 60), { size: 9 }); pen.t(rs.dur[1][0], rs.dur[1][1], sm.matchMinutes % 60, { size: 9 });
        pen.t(rs.winner[0], rs.winner[1], ctx.code(st.winner), { size: 11, max: 44 });
        pen.t(rs.loserSets[0], rs.loserSets[1], st.setsWon[E.opp(st.winner)], { size: 12 });
        if (st.setsWon[st.winner] !== 3) pen.t(rs.winSets[0], rs.winSets[1] - 9, st.setsWon[st.winner], { size: 9 });
      }
    }
    // --- daftar pemain
    var ro = L.roster;
    pen.t(ro.codeL[0], ro.codeL[1], ctx.code(A), { size: 11, max: 44 });
    pen.t(ro.codeR[0], ro.codeR[1], ctx.code(B), { size: 11, max: 44 });
    if (ctx.started) { pen.t(ro.circL[0], ro.circL[1], 'A', { size: 12 }); pen.t(ro.circR[0], ro.circR[1], 'B', { size: 12 }); }
    [[A, ro.noL, ro.nameL, ro.offL, 'r'], [B, ro.noR, ro.nameR, ro.offR, 'l']].forEach(function (cfg) {
      var t = ctx.team[cfg[0]] || {}, ps = t.players || [];
      var reg = ps.filter(function (p) { return !p.libero; }), lib = ps.filter(function (p) { return p.libero; });
      reg.slice(0, ro.rows.length - 1).forEach(function (p, i) {
        var y = (ro.rows[i] + ro.rows[i + 1]) / 2;
        pen.t(cfg[1], y, p.no, { size: 9.5 });
        pen.t(cfg[2], y, p.name + (p.captain ? ' ©' : ''), { size: 8.5, align: 'l', max: 95 });
      });
      lib.slice(0, 2).forEach(function (p, i) {
        var y = (ro.lib[i] + ro.lib[i + 1]) / 2;
        pen.t(cfg[1], y, p.no, { size: 9.5 });
        pen.t(cfg[2], y, p.name + (p.captain ? ' ©' : ''), { size: 8.5, align: 'l', max: 95 });
      });
      var off = t.officials || {};
      ['C', 'AC1', 'AC2', 'T', 'M'].forEach(function (k, i) {
        var y = (ro.off[i] + ro.off[i + 1]) / 2;
        pen.t(cfg[3], y, off[k] || '', { size: 8, align: cfg[4], bold: false, max: 100 });
      });
    });
    return page(L, pen, 'a3');
  }

  // -------------------------------------------------------------- publik
  function supported(m) {
    var R = m.rules || E.defaultRules(m.format);
    if (!VB.FORM_LAYOUTS) return false;
    if (R.format === 'indoor6') return !!VB.FORM_LAYOUTS.indoor && R.players === 6 && R.setsToWin <= 3;
    if (R.format === 'beach2') return !!VB.FORM_LAYOUTS.beach2 && R.players === 2 && R.setsToWin <= 2;
    if (R.format === 'beach4') return !!VB.FORM_LAYOUTS.beach4 && R.players === 4 && R.setsToWin <= 2;
    return false;
  }
  function render(m) {
    var ctx = VB.sheets.buildCtx(m);
    if (ctx.R.format === 'indoor6') return renderIndoor(ctx);
    if (ctx.R.format === 'beach2') return VB.formsBeach.render2(ctx, Pen, page);
    return VB.formsBeach.render4(ctx, Pen, page);
  }

  VB.forms = { render: render, supported: supported, Pen: Pen, page: page, hm: hm, schedHM: schedHM, ref: ref, plain: plain, sanctionsList: sanctionsList };
})();
