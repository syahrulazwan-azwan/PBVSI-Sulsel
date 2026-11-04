/* Scoresheet live (layar pencatat) */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;

  var ctx = null; // {el, id, keyHandler, wakeLock}

  function now() { return new Date().toISOString(); }
  function J() { return VB.views.jadwal; }

  function teamOf(m, side) { var id = side === 'A' ? m.teamA : m.teamB; return id ? S.get('teams', id) : null; }
  function roster(m, side) { var t = teamOf(m, side); return (t && t.players) || []; }
  function playerName(m, side, no) {
    var p = roster(m, side).filter(function (x) { return String(x.no) === String(no); })[0];
    return p ? p.name : '';
  }
  function shortName(name) {
    if (!name) return '';
    var p = name.split(' ');
    return p[0].length > 10 ? p[0].slice(0, 9) + '.' : p[0];
  }

  // ---------------- aksi ----------------
  function commit(ev, opts) {
    var m = S.get('matches', ctx.id);
    ev.time = ev.time || now();
    var res = E.tryEvent(m, ev, J().names(m));
    if (!res.ok) { U.toast(res.error, 'error'); return null; }
    m.events = (m.events || []).concat([ev]);
    S.upsert('matches', m);
    if (navigator.vibrate) try { navigator.vibrate(ev.t === 'point' ? 25 : 40); } catch (e) { /* abaikan */ }
    draw();
    if (res.state.notices.length && !(opts && opts.silent)) showNotices(res.state.notices);
    return res.state;
  }

  function describe(ev, names) {
    switch (ev.t) {
      case 'setStart': return 'Mulai set (line-up)';
      case 'point': return 'Poin untuk ' + names[ev.team];
      case 'timeout': return 'Time-out ' + names[ev.team];
      case 'sub': return 'Pergantian ' + names[ev.team] + ' (#' + ev['in'] + ' masuk, #' + ev.out + ' keluar)';
      case 'sanction': return 'Sanksi ' + ev.type + ' untuk ' + names[ev.team];
      case 'remark': return 'Catatan "' + ev.text + '"';
      case 'forfeit': return 'Forfeit / WO ' + names[ev.team];
      default: return ev.t;
    }
  }

  function undo() {
    var m = S.get('matches', ctx.id);
    if (!m.events || !m.events.length) { U.toast('Tidak ada yang bisa dibatalkan'); return; }
    var last = m.events[m.events.length - 1];
    var doIt = function () {
      m.events = m.events.slice(0, -1);
      S.upsert('matches', m);
      U.toast('Dibatalkan: ' + describe(last, J().names(m)));
      draw();
    };
    if (last.t === 'point') doIt();
    else U.confirm('Batalkan aksi terakhir: ' + describe(last, J().names(m)) + '?', 'Batalkan').then(function (ok) { if (ok) doIt(); });
  }

  function showNotices(notices) {
    var box = U.qs('#ss-notice');
    if (!box) return;
    var important = notices.filter(function (n) { return n.type !== 'setEnd' || true; });
    box.innerHTML = important.map(function (n) {
      return '<div class="notice ' + n.type + '"><span>' + esc(n.text) + '</span><button class="icon-btn" data-dismiss>✕</button></div>';
    }).join('');
    U.qsa('[data-dismiss]', box).forEach(function (b) { b.onclick = function () { b.parentNode.remove(); }; });
    var ttl = notices.some(function (n) { return n.type === 'switch' || n.type === 'tto'; }) ? 12000 : 8000;
    clearTimeout(box._t);
    box._t = setTimeout(function () { box.innerHTML = ''; }, ttl);
  }

  // --------------- dialog ----------------
  function subDialog(side) {
    var m = S.get('matches', ctx.id), st = E.compute(m, J().names(m)), cur = st.current, R = m.rules;
    var onCourt = cur.order[side];
    var bench = roster(m, side).filter(function (p) { return onCourt.indexOf(String(p.no)) < 0 && !(R.hasLibero && p.libero); });
    var outOpts = onCourt.map(function (no) { return '<option value="' + esc(no) + '">#' + esc(no) + ' ' + esc(playerName(m, side, no)) + '</option>'; }).join('');
    var inField = bench.length
      ? '<select name="in"><option value="">— pilih —</option>' + bench.map(function (p) { return '<option value="' + esc(p.no) + '">#' + esc(p.no) + ' ' + esc(p.name) + '</option>'; }).join('') + '</select>'
      : '<input name="in" inputmode="numeric" placeholder="No. punggung">';
    var used = cur.subs[side].filter(function (s) { return !s.exceptional; }).length;
    U.modal({
      title: 'Pergantian pemain — ' + J().names(m)[side],
      body: '<p class="muted">Terpakai ' + used + ' dari ' + R.subsPerSet + ' pergantian di set ini. Skor saat ganti: ' + cur.score[side] + ':' + cur.score[E.opp(side)] + '</p>' +
        '<form class="grid-form"><label>Pemain KELUAR<select name="out">' + outOpts + '</select></label><label>Pemain MASUK' + inField + '</label>' +
        '<label class="span2 check"><input type="checkbox" name="exceptional"> Pergantian luar biasa (cedera / pemain dikeluarkan) – tidak dihitung kuota</label></form>',
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan pergantian', cls: 'primary', onClick: function (root) {
          var d = U.formData(U.qs('form', root));
          if (!d['in']) { U.toast('Pilih pemain yang masuk', 'error'); return false; }
          return commit({ t: 'sub', team: side, out: d.out, 'in': d['in'], exceptional: !!d.exceptional }) ? true : false;
        }
      }]
    });
  }

  function sanctionDialog(side) {
    var m = S.get('matches', ctx.id), st = E.compute(m, J().names(m));
    var hasDW = st.sanctions.some(function (s) { return s.team === side && s.type === 'DW'; });
    var t = teamOf(m, side), off = (t && t.officials) || {};
    var whoOpts = '<option value="">Tim</option>' + roster(m, side).map(function (p) { return '<option value="' + esc(p.no) + '">#' + esc(p.no) + ' ' + esc(p.name) + '</option>'; }).join('') +
      ['C', 'AC1', 'AC2', 'T', 'M'].map(function (k) { return '<option value="' + k + '">' + k + (off[k] ? ' – ' + esc(off[k]) : '') + '</option>'; }).join('');
    var types = ['W', 'P', 'E', 'D', 'DW', 'DP', 'IR'];
    U.modal({
      title: 'Sanksi — ' + J().names(m)[side],
      body: '<form class="grid-form"><label>Jenis sanksi<select name="type">' + types.map(function (k) {
        var sel = (hasDW && k === 'DP') ? ' selected' : '';
        return '<option value="' + k + '"' + sel + '>' + E.SANCTION_LABEL[k] + '</option>';
      }).join('') + '</select></label><label>Pelaku<select name="who">' + whoOpts + '</select></label></form>' +
        '<p class="muted small">Penalti (P) dan penalti penundaan (DP) otomatis memberi 1 poin + servis kepada lawan. ' + (hasDW ? '<b>Tim ini sudah pernah mendapat peringatan penundaan, penundaan berikutnya = DP.</b>' : '') + '</p>',
      actions: [{ label: 'Batal', value: null }, {
        label: 'Catat sanksi', cls: 'danger', onClick: function (root) {
          var d = U.formData(U.qs('form', root));
          return commit({ t: 'sanction', team: side, type: d.type, who: d.who }) ? true : false;
        }
      }]
    });
  }

  function remarkDialog() {
    U.modal({
      title: 'Catatan (Remarks)', body: '<textarea name="text" rows="4" placeholder="Misal: protes tim A pada set 2 skor 15:13 ..."></textarea>',
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan', cls: 'primary', onClick: function (root) {
          var v = U.qs('textarea', root).value.trim();
          if (!v) return false;
          return commit({ t: 'remark', text: v }) ? true : false;
        }
      }]
    });
  }

  function forfeitDialog() {
    var m = S.get('matches', ctx.id), nm = J().names(m);
    U.modal({
      title: 'Forfeit / WO / tim tidak lengkap',
      body: '<p>Tim yang dinyatakan <b>kalah</b>. Sisa poin dan set otomatis diberikan kepada lawan.</p><form class="grid-form"><label>Tim kalah<select name="team"><option value="A">' + esc(nm.A) + '</option><option value="B">' + esc(nm.B) + '</option></select></label>' +
        '<label>Alasan<input name="reason" placeholder="Tidak hadir / cedera / tidak lengkap"></label></form>',
      actions: [{ label: 'Batal', value: null }, {
        label: 'Nyatakan kalah', cls: 'danger', onClick: function (root) {
          var d = U.formData(U.qs('form', root));
          return commit({ t: 'forfeit', team: d.team, reason: d.reason }) ? true : false;
        }
      }]
    });
  }

  function menu() {
    var m = S.get('matches', ctx.id);
    U.modal({
      title: 'Menu pertandingan',
      body: '<div class="menu-list">' +
        '<a class="btn block" href="#/cetak/' + m.id + '" data-close-modal>🖨️ Cetak / simpan PDF scoresheet</a>' +
        '<button class="btn block" data-m="remark">📝 Tambah catatan (remarks)</button>' +
        '<button class="btn block" data-m="export">📤 Kirim data pertandingan ini (.json)</button>' +
        '<button class="btn block" data-m="edit">✏️ Ubah info pertandingan & wasit</button>' +
        '<button class="btn block danger ghost" data-m="forfeit">⚠️ Forfeit / WO</button>' +
        '<button class="btn block danger ghost" data-m="reset">🗑️ Hapus seluruh catatan scoresheet</button></div>',
      onOpen: function (root) {
        U.qsa('[data-m],[data-close-modal]', root).forEach(function (b) {
          b.addEventListener('click', function () {
            U.qs('[data-close]', root).click();
            var a = b.dataset.m;
            if (a === 'remark') remarkDialog();
            if (a === 'forfeit') forfeitDialog();
            if (a === 'export') U.download('pertandingan-' + (m.no || m.id) + '-' + VB.views.pengaturan.stamp() + '.json', S.exportMatch(m.id));
            if (a === 'edit') J().edit(S.get('matches', ctx.id)).then(draw);
            if (a === 'reset') U.confirm('Hapus SEMUA catatan poin pertandingan ini dan mulai dari awal?', 'Hapus', true).then(function (ok) {
              if (!ok) return;
              var mm = S.get('matches', ctx.id); mm.events = []; S.upsert('matches', mm); draw();
            });
          });
        });
      }
    });
  }

  // --------------- tampilan ----------------
  function setupPanel(m, st) {
    var R = m.rules, n = R.players, no = st.nextSetNo;
    var prev = st.sets[st.sets.length - 1];
    var deciding = no === R.setsToWin * 2 - 1;
    var nm = J().names(m);
    var defServe = prev ? E.opp(prev.firstServe) : 'A';
    var defLeft = prev ? E.opp(prev.leftAtStart) : 'A';
    if (deciding && no > 1) { defServe = ''; defLeft = ''; }

    function lineupInputs(side) {
      var ros = roster(m, side).filter(function (p) { return !(R.hasLibero && p.libero); });
      var defaults = prev && !prev.forfeit ? prev.lineup[side] : ros.slice(0, n).map(function (p) { return String(p.no); });
      var html = '';
      for (var i = 0; i < n; i++) {
        var lab = n === 2 ? 'Urutan servis ' + (i + 1) : 'Posisi ' + E.ROMAN[i];
        var val = defaults[i] || '';
        var field;
        if (ros.length >= n) {
          field = '<select name="lu_' + side + '_' + i + '"><option value="">—</option>' + ros.map(function (p) {
            return '<option value="' + esc(p.no) + '"' + (String(p.no) === String(val) ? ' selected' : '') + '>#' + esc(p.no) + ' ' + esc(p.name) + '</option>';
          }).join('') + '</select>';
        } else {
          field = '<input name="lu_' + side + '_' + i + '" inputmode="numeric" value="' + esc(val) + '" placeholder="No.">';
        }
        html += '<label>' + lab + field + '</label>';
      }
      return html;
    }

    var courtHint = n === 6 ? '<div class="court-hint">Depan: IV – III – II &nbsp;|&nbsp; Belakang: V – VI – I (I = server)</div>'
      : n === 4 ? '<div class="court-hint">Depan: III – II &nbsp;|&nbsp; Belakang: IV – I (I = server)</div>'
        : '<div class="court-hint">Tim yang servis pertama memakai urutan I &amp; III, tim penerima II &amp; IV.</div>';

    var html = '<div class="setup"><h2>Persiapan Set ' + no + (deciding ? ' <span class="badge live">Set penentuan</span>' : '') + '</h2>' +
      (no === 1 ? '<p class="muted">Isi line-up sesuai lembar line-up (R-5) dari pelatih, lalu tentukan hasil undian: tim yang servis pertama dan sisi lapangan.</p>' : '<p class="muted">Line-up awal otomatis disalin dari set sebelumnya, ubah sesuai lembar line-up baru.</p>') +
      '<form id="setupform"><div class="setup-grid">' +
      ['A', 'B'].map(function (side) {
        return '<div class="setup-team"><h3>' + esc(nm[side]) + '</h3><div class="grid-form">' + lineupInputs(side) + '</div></div>';
      }).join('') + '</div>' + courtHint +
      '<div class="setup-opts"><fieldset><legend>Servis pertama</legend>' +
      ['A', 'B'].map(function (s) { return '<label class="radio"><input type="radio" name="firstServe" value="' + s + '"' + (defServe === s ? ' checked' : '') + '> ' + esc(nm[s]) + '</label>'; }).join('') +
      '</fieldset><fieldset><legend>Di sisi KIRI meja pencatat</legend>' +
      ['A', 'B'].map(function (s) { return '<label class="radio"><input type="radio" name="left" value="' + s + '"' + (defLeft === s ? ' checked' : '') + '> ' + esc(nm[s]) + '</label>'; }).join('') +
      '</fieldset></div>' +
      '<div class="row gap mt"><button type="submit" class="btn primary big">▶ Mulai Set ' + no + '</button>' +
      (st.sets.length ? '<button type="button" class="btn" id="undo2">↶ Batalkan poin terakhir</button>' : '') + '</div></form></div>';
    return html;
  }

  function courtView(m, cur, side, mirrored) {
    var R = m.rules, n = R.players;
    var serving = cur.server === side;
    if (n === 2) {
      var items = cur.order[side].map(function (no, i) {
        var isSrv = serving && cur.idx[side] === i;
        var next = !serving && E.serverInfo(cur, side, R).idx === i;
        return '<div class="pl ' + (isSrv ? 'srv' : '') + (next ? ' next' : '') + '"><span class="ord">' + E.orderLabel(R, cur, side, i) + '</span><b>#' + esc(no) + '</b><small>' + esc(shortName(playerName(m, side, no))) + '</small></div>';
      }).join('');
      return '<div class="half beach2">' + items + '</div>';
    }
    var pos = E.courtPositions(cur, side, R); // pos[0] = posisi I
    var layout;
    if (n === 6) layout = mirrored ? [[1, 0], [2, 5], [3, 4]] : [[4, 3], [5, 2], [0, 1]];
    else layout = mirrored ? [[1, 0], [2, 3]] : [[3, 2], [0, 1]];
    var html = '<div class="half grid' + n + '">';
    layout.forEach(function (row) {
      row.forEach(function (p) {
        var no = pos[p], isSrv = serving && p === 0;
        html += '<div class="pl ' + (isSrv ? 'srv' : '') + '"><span class="ord">' + E.ROMAN[p] + '</span><b>#' + esc(no) + '</b><small>' + esc(shortName(playerName(m, side, no))) + '</small></div>';
      });
    });
    return html + '</div>';
  }

  function teamPanel(m, st, side) {
    var R = m.rules, cur = st.current, nm = J().names(m);
    var si = E.serverInfo(cur, side, R);
    var subsUsed = cur.subs[side].filter(function (s) { return !s.exceptional; }).length;
    var tos = cur.timeouts[side];
    var dots = '';
    for (var i = 0; i < R.timeoutsPerSet; i++) dots += '<i class="' + (i < tos.length ? 'used' : '') + '"></i>';
    return '<div class="tp ' + (si.serving ? 'serving' : '') + '" data-side="' + side + '">' +
      '<div class="tp-head"><span class="tp-name">' + esc(nm[side]) + '</span><span class="tp-sets" title="Set dimenangkan">' + st.setsWon[side] + '</span></div>' +
      '<div class="tp-score">' + cur.score[side] + '</div>' +
      '<div class="tp-serve">' + (si.serving ? '<span class="ball">🏐</span> Servis: <b>#' + esc(si.no) + '</b> (' + si.label + ')' : 'Menerima • berikutnya <b>#' + esc(si.no) + '</b> (' + si.label + ')') + '</div>' +
      '<button class="pt-btn" data-act="point" data-side="' + side + '">+1 POIN</button>' +
      '<div class="tp-btns">' +
      '<button class="btn" data-act="timeout" data-side="' + side + '">Time-out <span class="dots">' + dots + '</span></button>' +
      (R.subsPerSet ? '<button class="btn" data-act="sub" data-side="' + side + '">Ganti ' + subsUsed + '/' + R.subsPerSet + '</button>' : '') +
      '<button class="btn" data-act="sanction" data-side="' + side + '">Sanksi</button></div></div>';
  }

  function livePanel(m, st) {
    var cur = st.current, R = m.rules;
    var L = cur.left, Rt = E.opp(L);
    var every = cur.deciding ? R.decidingCourtSwitchEvery : R.courtSwitchEvery;
    var info = [];
    info.push('Target ' + cur.target + ' poin');
    if (every) { var sum = cur.score.A + cur.score.B; info.push('Pindah lapangan lagi dalam ' + (every - (sum % every)) + ' poin'); }
    if (R.ttoAtSum && !cur.deciding && !cur.tto) info.push('TTO di jumlah ' + R.ttoAtSum);
    if (R.decidingSideChangeAt && cur.deciding && !cur.sideChanged) info.push('Pindah lapangan di poin ' + R.decidingSideChangeAt);
    return '<div class="live">' +
      '<div class="board">' + teamPanel(m, st, L) +
      '<div class="mid"><div class="set-no">SET ' + cur.no + '</div><div class="sets-won">' + st.setsWon[L] + ' : ' + st.setsWon[Rt] + '</div><div class="muted small">' + info.join('<br>') + '</div></div>' +
      teamPanel(m, st, Rt) + '</div>' +
      '<div class="court">' + courtView(m, cur, L, false) + '<div class="net"></div>' + courtView(m, cur, Rt, true) + '</div>' +
      '<p class="muted small c hide-mobile">Pintasan keyboard: ← poin tim kiri • → poin tim kanan • Ctrl+Z batalkan</p></div>';
  }

  function finishedPanel(m, st) {
    var sm = E.summary(st), nm = J().names(m);
    var rows = sm.sets.map(function (s) {
      return '<tr><td>Set ' + s.no + '</td><td class="c ' + (s.winner === 'A' ? 'b' : '') + '">' + s.A + '</td><td class="c ' + (s.winner === 'B' ? 'b' : '') + '">' + s.B + '</td><td class="c">' + E.fmtTime(s.start) + '–' + E.fmtTime(s.end) + '</td><td class="c">' + s.minutes + ' mnt</td></tr>';
    }).join('');
    return '<div class="finished"><div class="trophy">🏆</div><h2>' + esc(nm[st.winner]) + ' menang ' + st.setsWon[st.winner] + '–' + st.setsWon[E.opp(st.winner)] + '</h2>' +
      (st.forfeit ? '<p class="muted">Forfeit/WO: ' + esc(nm[st.forfeit.team]) + (st.forfeit.reason ? ' (' + esc(st.forfeit.reason) + ')' : '') + '</p>' : '') +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th></th><th class="c">' + esc(nm.A) + '</th><th class="c">' + esc(nm.B) + '</th><th class="c">Waktu</th><th class="c">Durasi</th></tr></thead><tbody>' + rows +
      '<tr class="b"><td>Total</td><td class="c">' + sm.total.A + '</td><td class="c">' + sm.total.B + '</td><td class="c">' + E.fmtTime(st.startTime) + '–' + E.fmtTime(st.endTime) + '</td><td class="c">' + sm.duration + ' mnt</td></tr></tbody></table></div>' +
      '<div class="row gap mt center"><a class="btn primary big" href="#/cetak/' + m.id + '">🖨️ Cetak scoresheet</a><button class="btn" data-act="export">📤 Kirim data (.json)</button><button class="btn" data-act="undo">↶ Batalkan aksi terakhir</button><a class="btn" href="#/jadwal">Ke jadwal</a></div></div>';
  }

  function logPanel(st) {
    var items = st.log.slice(-60).reverse().map(function (l) {
      return '<li class="lg-' + l.kind + '"><span class="t">' + E.fmtTime(l.time) + '</span><span class="s">' + (l.set ? 'S' + l.set + ' ' : '') + esc(l.score) + '</span><span class="x">' + esc(l.text) + '</span></li>';
    }).join('');
    return '<details class="log" open><summary>Riwayat kejadian (' + st.log.length + ')</summary><ul>' + (items || '<li class="muted">Belum ada.</li>') + '</ul></details>';
  }

  function draw() {
    if (!ctx) return;
    var m = S.get('matches', ctx.id), el = ctx.el;
    if (!m) { el.innerHTML = U.emptyState('Pertandingan tidak ditemukan', 'Mungkin sudah dihapus.', '<a class="btn" href="#/jadwal">Ke jadwal</a>'); return; }
    var nm = J().names(m), st;
    try { st = E.compute(m, nm); } catch (e) {
      el.innerHTML = '<div class="alert">Data pertandingan rusak: ' + esc(e.message) + '</div><button class="btn" id="undoErr">Batalkan aksi terakhir</button>';
      U.qs('#undoErr', el).onclick = undo; return;
    }
    var noticeHtml = U.qs('#ss-notice', el) ? U.qs('#ss-notice', el).innerHTML : '';
    var html = '<div class="ss">' +
      '<div class="ss-top"><a class="btn ghost" href="#/jadwal" title="Kembali">←</a>' +
      '<div class="ss-title"><b>' + esc(nm.A) + '</b> vs <b>' + esc(nm.B) + '</b><div class="muted small">#' + esc(m.no) + ' • ' + esc(U.formatLabel(m.format)) + ' ' + esc(U.catLabel(m.category)) + (m.pool ? ' • ' + esc(m.pool) : '') + (m.court ? ' • Lap ' + esc(m.court) : '') + '</div></div>' +
      '<div class="ss-actions"><button class="btn" data-act="undo" title="Batalkan aksi terakhir (Ctrl+Z)">↶ Undo</button><button class="btn" data-act="menu">☰ Menu</button></div></div>' +
      '<div id="ss-notice">' + noticeHtml + '</div>';
    if (st.finished) html += finishedPanel(m, st);
    else if (st.needsSetup) html += setupPanel(m, st);
    else html += livePanel(m, st);
    html += logPanel(st) + '</div>';
    el.innerHTML = html;
    U.qsa('#ss-notice [data-dismiss]', el).forEach(function (b) { b.onclick = function () { b.parentNode.remove(); }; });

    U.qsa('[data-act]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.dataset.act, side = b.dataset.side;
        if (a === 'point') commit({ t: 'point', team: side });
        if (a === 'timeout') {
          var mm = S.get('matches', ctx.id), sst = E.compute(mm, nm);
          var left = mm.rules.timeoutsPerSet - sst.current.timeouts[side].length;
          if (left <= 0) { U.toast('Jatah time-out habis', 'error'); return; }
          U.confirm('Catat time-out untuk ' + nm[side] + '? (sisa ' + left + ')', 'Catat time-out').then(function (ok) { if (ok) commit({ t: 'timeout', team: side }); });
        }
        if (a === 'sub') subDialog(side);
        if (a === 'sanction') sanctionDialog(side);
        if (a === 'undo') undo();
        if (a === 'menu') menu();
        if (a === 'export') U.download('pertandingan-' + (m.no || m.id) + '.json', S.exportMatch(m.id));
      });
    });
    var sf = U.qs('#setupform', el);
    if (sf) {
      var u2 = U.qs('#undo2', el); if (u2) u2.onclick = undo;
      sf.onsubmit = function (e) {
        e.preventDefault();
        var d = U.formData(sf), n = m.rules.players, lu = { A: [], B: [] };
        for (var i = 0; i < n; i++) { lu.A.push(d['lu_A_' + i]); lu.B.push(d['lu_B_' + i]); }
        if (!d.firstServe) { U.toast('Pilih tim yang servis pertama', 'error'); return; }
        if (!d.left) { U.toast('Pilih tim di sisi kiri', 'error'); return; }
        commit({ t: 'setStart', lineup: lu, firstServe: d.firstServe, left: d.left });
      };
    }
  }

  function onKey(e) {
    if (!ctx || document.querySelector('.modal-backdrop')) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    var m = S.get('matches', ctx.id); if (!m) return;
    var st = E.compute(m, J().names(m));
    if (st.finished || st.needsSetup) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); commit({ t: 'point', team: st.current.left }); }
    if (e.key === 'ArrowRight') { e.preventDefault(); commit({ t: 'point', team: E.opp(st.current.left) }); }
  }

  function render(el, id) {
    destroy();
    ctx = { el: el, id: id };
    document.addEventListener('keydown', onKey);
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(function (l) { if (ctx) ctx.wakeLock = l; else l.release(); }).catch(function () { /* tidak didukung */ });
    }
    draw();
  }

  function destroy() {
    document.removeEventListener('keydown', onKey);
    if (ctx && ctx.wakeLock) try { ctx.wakeLock.release(); } catch (e) { /* abaikan */ }
    ctx = null;
  }

  VB.views.scoresheet = { render: render, destroy: destroy };
})();
