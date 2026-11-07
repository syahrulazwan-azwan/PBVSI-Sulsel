/* Menu Bagan: pembagian pool (Babak I) dan bagan Babak II, sesuai dokumen
 * "BAGAN PERTANDINGAN VOLI INDOOR PORPROV XVIII-2026".
 * Pool & no. urut diambil dari data tim (menu Tim). */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, esc = U.esc;
  var cat = 'PA';
  var DEF_SUB = 'PADA PORPROV XVIII/2026 CABANG OLAHRAGA BOLAVOLI';

  function pad(n) { return VB.views.tim.pad(n); }
  function teams(c) {
    return S.list('teams', function (t) { return t.format === 'indoor6' && t.category === c && t.pool && t.seed; }).sort(VB.views.tim.sortTeams);
  }
  /** { A: [tim, tim, tim], B: [...] } urut nama pool */
  function pools(c) {
    var p = {};
    teams(c).forEach(function (t) { var k = String(t.pool).trim().toUpperCase(); (p[k] = p[k] || []).push(t); });
    return p;
  }
  function poolNames(p) { return Object.keys(p).sort(function (a, b) { return a.length - b.length || a.localeCompare(b); }); }
  function hasil() { var h = S.settings().baganHasil || {}; h[cat] = h[cat] || {}; return h; }
  function setHasil(pool, rank, id) {
    var h = hasil(); h[cat][pool] = h[cat][pool] || {}; h[cat][pool][rank] = id || ''; S.setSetting('baganHasil', h);
  }
  function slotTeam(code) {   // "A1" / "CC2"
    var m = /^([A-Z]+)([12])$/.exec(code); if (!m) return null;
    var id = ((hasil()[cat] || {})[m[1]] || {})[m[2]];
    return id ? S.get('teams', id) : null;
  }
  function existing(a, b) {
    return S.list('matches', function (m) {
      var J = VB.views.jadwal, x = J.teamId(m, 'A'), y = J.teamId(m, 'B');
      return m.category === cat && ((x === a && y === b) || (x === b && y === a));
    })[0];
  }
  function matchBtn(a, b, pool) {
    if (!a || !b) return '';
    var m = existing(a.id, b.id);
    if (m) return '<a class="btn small ghost" href="#/cetak/' + m.id + '" title="Cetak scoresheet">✓ Scoresheet #' + esc(m.no) + '</a>';
    return '<button class="btn small" data-new="' + a.id + '|' + b.id + '|' + esc(pool) + '">+ Scoresheet</button>';
  }
  function tname(t) { return t ? t.name : ''; }

  /** urutan slot Babak II seperti bagan: A1, C2, B1, D2, C1, A2, D1, B2 */
  function slots(pn) {
    if (pn.length !== 4) return null;
    return [pn[0] + '1', pn[2] + '2', pn[1] + '1', pn[3] + '2', pn[2] + '1', pn[0] + '2', pn[3] + '1', pn[1] + '2'];
  }

  function bracketSvg(sl) {
    var W = 180, H = 104, x0 = 2, xName = 9, xL = 70, xQ = 86, xS = 104, xF = 128, rowH = 12.4, top = 6;
    var s = '<svg class="bracket" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">';
    var ys = sl.map(function (_, i) { return top + i * rowH; });
    sl.forEach(function (code, i) {
      var t = slotTeam(code), y = ys[i];
      s += '<text x="' + x0 + '" y="' + (y - 0.8) + '" font-size="3.6" font-weight="700">' + (i + 1) + '.</text>';
      s += '<text x="' + (x0 + 4.5) + '" y="' + (y - 0.8) + '" font-size="3.6" font-weight="700">' + esc(code) + '</text>';
      if (t) s += '<text x="' + (xName + 8) + '" y="' + (y - 0.9) + '" font-size="3.6">' + esc(t.name) + '</text>';
      s += '<line x1="' + (xName + 6) + '" y1="' + y + '" x2="' + xL + '" y2="' + y + '" stroke="#000" stroke-width=".35"/>';
    });
    function join(xa, ya, yb, xb) {
      var ym = (ya + yb) / 2;
      return '<path d="M' + xa + ' ' + ya + ' H' + xb + ' V' + yb + ' H' + xa + ' M' + xb + ' ' + ym + ' H' + (xb + 16) + '" fill="none" stroke="#000" stroke-width=".35"/>';
    }
    var q = [];
    for (var i = 0; i < 8; i += 2) { s += join(xL, ys[i], ys[i + 1], xQ - 8); q.push((ys[i] + ys[i + 1]) / 2); }
    var sf = [];
    for (var j = 0; j < 4; j += 2) { s += join(xQ + 8, q[j], q[j + 1], xS + 4); sf.push((q[j] + q[j + 1]) / 2); }
    var yf = (sf[0] + sf[1]) / 2;
    s += '<path d="M' + (xS + 20) + ' ' + sf[0] + ' H' + (xF + 12) + ' V' + sf[1] + ' H' + (xS + 20) + ' M' + (xF + 12) + ' ' + yf + ' H' + (W - 2) + '" fill="none" stroke="#000" stroke-width=".35"/>';
    s += '<text x="' + (W - 12) + '" y="' + (yf + 5) + '" font-size="3.6" font-weight="700" text-anchor="middle">I  /  II  /  III</text>';
    return s + '</svg>';
  }

  function render(el) {
    cat = S.settings().uiCat || cat;
    document.body.classList.add('print-bagan');
    var p = pools(cat), pn = poolNames(p), sl = slots(pn);
    var sub = S.settings().baganJudul || DEF_SUB;
    var lbl = cat === 'PA' ? 'PUTERA' : 'PUTERI';
    var html = '<div class="page-head no-print"><h1>Bagan Pertandingan</h1>' +
      '<div class="row gap"><div class="seg">' +
      ['PA', 'PI'].map(function (c) { return '<button class="btn small' + (c === cat ? ' primary' : '') + '" data-cat="' + c + '">' + U.catLabel(c) + '</button>'; }).join('') +
      '</div><button class="btn" id="prt">🖨️ Cetak bagan</button></div></div>';

    if (!pn.length) {
      el.innerHTML = html + U.emptyState('Belum ada pool', 'Isi "Pool / Grup" dan "No. urut (bagan)" pada tim Indoor ' + U.catLabel(cat) + ' di menu Tim, atau impor file data tim PORPROV.');
      wire(el); return;
    }

    html += '<div class="bagan-page">' +
      '<div class="bg-logos"><img src="img/pbvsi.png" alt="PBVSI"><img src="img/porprov-2026.jpg" alt="PORPROV"><img src="img/maskot-porprov-2026.jpg" alt="Maskot"></div>' +
      '<h2 class="bg-title">SISTEM PERTANDINGAN PEMBAGIAN POOL ' + lbl + '</h2>' +
      '<div class="bg-sub"><span class="print-inline" style="display:none">' + esc(sub) + '</span>' +
      '<input class="no-print bg-sub-in" id="sub" value="' + esc(sub) + '" title="Ubah baris judul kedua"></div>' +
      '<h3 class="bg-h">BABAK I :</h3><div class="bg-pools">';
    pn.forEach(function (k) {
      html += '<div class="bg-pool"><b>POOL ' + esc(k) + ' :</b>';
      p[k].forEach(function (t) { html += '<div>' + esc(pad(t.seed)) + '.&nbsp; ' + esc(t.name) + '</div>'; });
      html += '</div>';
    });
    html += '</div>';
    // partai Babak I (setengah kompetisi dalam pool) – hanya di layar
    html += '<div class="bg-hasil no-print"><div class="muted small">Partai Babak I – klik <b>+ Scoresheet</b> untuk membuat scoresheet pertandingan tersebut.</div><div class="bg-rr">';
    pn.forEach(function (k) {
      var ts = p[k], pairs = ts.length === 3 ? [[0, 1], [1, 2], [0, 2]] : [];
      if (ts.length !== 3) for (var i = 0; i < ts.length; i++) for (var j = i + 1; j < ts.length; j++) pairs.push([i, j]);
      html += '<div><b class="small">Pool ' + esc(k) + '</b><div class="bg-games">';
      pairs.forEach(function (pr) {
        var a = ts[pr[0]], b = ts[pr[1]];
        html += '<div class="bg-game"><span>' + esc(a.name) + ' <i>vs</i> ' + esc(b.name) + '</span>' + matchBtn(a, b, k) + '</div>';
      });
      html += '</div></div>';
    });
    html += '</div></div>';

    if (sl) {
      html += '<h3 class="bg-h">BABAK II :</h3><ol class="bg-ko">';
      for (var q = 0; q < 4; q++) {
        html += '<li>JUARA POOL ' + esc(pn[q]) + ' &nbsp; Vs &nbsp; RUNNER UP POOL ' + esc(pn[(q + 2) % 4]) + '</li>';
      }
      html += '</ol>';
      // pilihan juara & runner-up (layar saja)
      html += '<div class="bg-hasil no-print"><div class="muted small">Isi juara &amp; runner-up tiap pool setelah Babak I selesai, nama tim otomatis masuk ke bagan.</div><div class="bg-hasil-grid">';
      var h = hasil()[cat];
      pn.forEach(function (k) {
        [1, 2].forEach(function (r) {
          var cur = (h[k] || {})[r] || '';
          html += '<label>' + (r === 1 ? 'Juara' : 'Runner-up') + ' Pool ' + esc(k) + '<select data-pool="' + esc(k) + '" data-rank="' + r + '"><option value="">—</option>' +
            p[k].map(function (t) { return '<option value="' + t.id + '"' + (t.id === cur ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></label>';
        });
      });
      html += '</div><div class="bg-games">';
      for (var m = 0; m < 4; m++) {
        var A = slotTeam(sl[m * 2]), B = slotTeam(sl[m * 2 + 1]);
        html += '<div class="bg-game"><span><b>' + sl[m * 2] + '</b> ' + esc(tname(A) || '…') + ' <i>vs</i> <b>' + sl[m * 2 + 1] + '</b> ' + esc(tname(B) || '…') + '</span>' + matchBtn(A, B, 'Babak II') + '</div>';
      }
      html += '</div></div>';
      html += bracketSvg(sl);
    } else {
      html += '<p class="muted no-print">Bagan Babak II otomatis muncul bila ada tepat 4 pool (sekarang ' + pn.length + ').</p>';
    }
    html += '</div>';
    el.innerHTML = html;
    wire(el);
  }

  function wire(el) {
    U.qsa('[data-cat]', el).forEach(function (b) { b.onclick = function () { cat = b.dataset.cat; S.setSetting('uiCat', cat); render(el); }; });
    var prt = U.qs('#prt', el); if (prt) prt.onclick = function () { window.print(); };
    var sub = U.qs('#sub', el); if (sub) sub.onchange = function () { S.setSetting('baganJudul', sub.value.trim() || DEF_SUB); render(el); };
    U.qsa('select[data-pool]', el).forEach(function (s) { s.onchange = function () { setHasil(s.dataset.pool, s.dataset.rank, s.value); render(el); }; });
    U.qsa('[data-new]', el).forEach(function (b) {
      b.onclick = function () {
        var v = b.dataset.new.split('|'), before = S.list('matches').length;
        VB.views.jadwal.edit({ format: 'indoor6', category: cat, teamA: v[0], teamB: v[1], pool: v[2] }).then(function () {
          if (S.list('matches').length > before) location.hash = '#/';
          else render(el);
        });
      };
    });
  }

  function destroy() { document.body.classList.remove('print-bagan'); }

  VB.views.bagan = { render: render, destroy: destroy };
})();
