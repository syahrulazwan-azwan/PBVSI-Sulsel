/*
 * Cetak di atas FORMULIR ASLI.
 * Latar = gambar halaman formulir resmi (FIVB indoor 2013, BVB/11 2x2 2026, BVB 4x4),
 * data ditulis di atas kotak-kotaknya dengan tinta hitam memakai SVG.
 * Koordinat (satuan pt halaman formulir asli) ada di form-layouts.js.
 */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine;
  var INK = '#000';

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

  /** Indoor: formulir SCRST PRAPORPROV (Excel, A4). Hanya data jadwal/tim/wasit; sisanya diisi tangan. */
  function renderIndoor(ctx) {
    var L = VB.FORM_LAYOUTS.indoor, pen = new Pen(), m = ctx.m, c = ctx.comp, h = L.hdr, fs = h.fs || 8;
    var A = ctx.sheetA, B = ctx.sheetB;
    // --- kepala formulir
    pen.t(h.comp[0], h.comp[1], c.name || '', { size: fs + 0.5, align: 'l', max: h.compMax });
    pen.t(h.city[0], h.city[1], c.city || '', { size: fs, align: 'l', max: h.cityMax });
    pen.t(h.ccode[0], h.ccode[1], c.countryCode || '', { size: fs });
    if (m.date) { var dp = m.date.split('-'); pen.t(h.dateText[0], h.dateText[1], dp[2] + '-' + dp[1] + '-' + dp[0].slice(2), { size: fs }); }
    pen.t(h.timeText[0], h.timeText[1], m.time || '', { size: fs, max: 40 });
    pen.t(h.hall[0], h.hall[1], c.venue || '', { size: fs, align: 'l', max: h.hallMax });
    pen.t(h.pool[0], h.pool[1], m.pool || '', { size: fs, max: 56 });
    pen.t(h.matchNo[0], h.matchNo[1], m.no || '', { size: fs + 1 });
    if (!m.blank) {
      pen.t(h.codeL[0], h.codeL[1], ctx.code(A), { size: fs + 1, max: 28 });
      pen.t(h.codeR[0], h.codeR[1], ctx.code(B), { size: fs + 1, max: 28 });
    }
    var cr = h.cross || 3.2;
    if (m.category === 'PA') pen.cross(h.men[0], h.men[1], cr);
    if (m.category === 'PI') pen.cross(h.women[0], h.women[1], cr);
    var age = h[String(m.age || 'Senior').toLowerCase()];
    if (age && !m.blank) pen.cross(age[0], age[1], cr);

    // --- remarks (wasit cadangan bila tidak ada barisnya, catatan)
    var rm = L.rem, lines = plain(ctx);
    var ap = L.appr, keys = ap.keys || ['r1', 'r2', 'scorer', 'ascorer'];
    if (keys.indexOf('reserve') < 0) { var r0 = ref(ctx, 'reserve'); if (r0.name) lines.push('Wasit cadangan: ' + r0.name + (r0.code ? ' (' + r0.code + ')' : '')); }
    lines.slice(0, rm.rows.length + 1).forEach(function (ln, i) {
      if (i === 0) pen.t(rm.first[0], rm.first[1], ln, { size: rm.fs || 7, align: 'l', bold: false, max: rm.x1 - rm.first[0] });
      else pen.t(rm.x0, rm.rows[i - 1], ln, { size: rm.fs || 7, align: 'l', bold: false, max: rm.x1 - rm.x0 });
    });
    // --- approval
    keys.forEach(function (k, i) {
      var r = ref(ctx, k);
      pen.t(ap.nameX, ap.rows[i], r.name || '', { size: ap.fs || 7, align: 'l', max: ap.nameMax || 200 });
      pen.t(ap.countryX, ap.rows[i], r.code || r.origin || '', { size: (ap.fs || 7) - 0.5, max: 36 });
    });
    ['lj1', 'lj2', 'lj3', 'lj4'].forEach(function (k, i) { var r = ref(ctx, k), p = ap.lj[i]; pen.t(p[0], p[1], r.name || '', { size: (ap.fs || 7) - 0.5, align: p[2], bold: false, max: ap.ljMax || 180 }); });

    // --- daftar pemain
    var ro = L.roster, rf = ro.fs || 6.5;
    if (!m.blank) {
      pen.t(ro.codeL[0], ro.codeL[1], ctx.code(A), { size: rf + 2, max: 50 });
      pen.t(ro.codeR[0], ro.codeR[1], ctx.code(B), { size: rf + 2, max: 50 });
    }
    [[A, ro.noL, ro.nameL, ro.offL, 'r'], [B, ro.noR, ro.nameR, ro.offR, 'l']].forEach(function (cfg) {
      var t = ctx.team[cfg[0]] || {}, ps = t.players || [];
      var reg = ps.filter(function (p) { return !p.libero; }), lib = ps.filter(function (p) { return p.libero; });
      reg.slice(0, ro.rows.length - 1).forEach(function (p, i) {
        var y = (ro.rows[i] + ro.rows[i + 1]) / 2;
        pen.t(cfg[1], y, p.no, { size: rf + 0.5 });
        pen.t(cfg[2], y, p.name + (p.captain ? ' ©' : ''), { size: rf, align: 'l', max: ro.nameMax });
      });
      lib.slice(0, ro.lib.length - 1).forEach(function (p, i) {
        var y = (ro.lib[i] + ro.lib[i + 1]) / 2;
        pen.t(cfg[1], y, p.no, { size: rf + 0.5 });
        pen.t(cfg[2], y, p.name + (p.captain ? ' ©' : ''), { size: rf, align: 'l', max: ro.nameMax });
      });
      var off = t.officials || {};
      ['C', 'AC1', 'AC2', 'T', 'M'].forEach(function (k, i) {
        var y = (ro.off[i] + ro.off[i + 1]) / 2;
        pen.t(cfg[3], y, off[k] || '', { size: rf - 0.5, align: cfg[4], bold: false, max: ro.offMax });
      });
    });
    return page(L, pen, 'a4');
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
