/* Menu Jadwal & Hasil pertandingan */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;
  var filt = { format: '', category: '', pool: '', q: '' };

  var cache = {};
  /** Keadaan pertandingan (dengan cache berdasarkan updatedAt) */
  function state(m) {
    var key = m.id + '|' + m.updatedAt + '|' + (m.events || []).length;
    if (cache[m.id] && cache[m.id].key === key) return cache[m.id].st;
    var st;
    try { st = E.compute(m, names(m)); } catch (e) { console.error(e); st = null; }
    cache[m.id] = { key: key, st: st };
    return st;
  }
  function names(m) {
    return { A: teamLabel(m, 'A'), B: teamLabel(m, 'B') };
  }
  function teamLabel(m, side) {
    var id = side === 'A' ? m.teamA : m.teamB;
    var t = id && S.get('teams', id);
    if (t) return t.name;
    return (side === 'A' ? m.labelA : m.labelB) || ('Tim ' + side);
  }
  function status(m) {
    var st = state(m);
    if (!st || !(m.events || []).length) return 'scheduled';
    return st.finished ? 'finished' : 'live';
  }
  var STATUS_LABEL = { scheduled: 'Belum main', live: 'Berlangsung', finished: 'Selesai' };

  function resultCells(m, maxSets) {
    var st = state(m);
    var cells = [];
    var sum = st ? E.summary(st) : null;
    var played = st && (m.events || []).length;
    cells.push(played ? sum.setsWon.A + ' - ' + sum.setsWon.B : '-');
    for (var i = 0; i < maxSets; i++) {
      var s = played && sum.sets[i];
      cells.push(s ? s.A + ' - ' + s.B : '-');
    }
    cells.push(played ? sum.total.A + ' - ' + sum.total.B : '-');
    return cells;
  }

  function nextNo(compId) {
    var max = 0;
    S.list('matches', function (m) { return m.competitionId === compId; }).forEach(function (m) { var n = parseInt(m.no, 10); if (n > max) max = n; });
    return String(max + 1);
  }

  function teamOptions(compId, format, cat, sel) {
    var o = '<option value="">— pilih tim —</option>';
    S.list('teams', function (t) { return t.competitionId === compId && t.format === format && t.category === cat; })
      .sort(function (a, b) { return ((a.pool || '') + a.name).localeCompare((b.pool || '') + b.name); })
      .forEach(function (t) { o += '<option value="' + t.id + '"' + (t.id === sel ? ' selected' : '') + '>' + esc((t.pool ? '[' + t.pool + '] ' : '') + t.name) + '</option>'; });
    return o;
  }
  function refOptions(sel) {
    var o = '<option value="">—</option>';
    S.list('referees').sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (r) {
      o += '<option value="' + r.id + '"' + (r.id === sel ? ' selected' : '') + '>' + esc(r.name + (r.code ? ' (' + r.code + ')' : '')) + '</option>';
    });
    return o;
  }

  var RULE_FIELDS = [
    ['setsToWin', 'Set untuk menang'], ['setPoints', 'Poin per set'], ['decidingSetPoints', 'Poin set penentuan'],
    ['timeoutsPerSet', 'Time-out per set'], ['subsPerSet', 'Pergantian per set'],
    ['courtSwitchEvery', 'Pindah lapangan tiap (poin, 0 = tidak)'], ['decidingCourtSwitchEvery', 'Pindah lapangan set penentuan tiap'],
    ['decidingSideChangeAt', 'Indoor: pindah di set penentuan saat poin'], ['ttoAtSum', 'Technical time-out saat jumlah poin (0 = tidak)']
  ];

  function form(m, locked) {
    var R = m.rules || E.defaultRules(m.format);
    var o = m.officials || {};
    var ROLES = VB.views.wasit.ROLES;
    return '<form id="mform"><div class="grid-form">' +
      '<label>No. pertandingan<input name="no" value="' + esc(m.no) + '"></label>' +
      '<label>Tanggal<input type="date" name="date" value="' + esc(m.date) + '"></label>' +
      '<label>Jam<input name="time" value="' + esc(m.time) + '" placeholder="08.00-08.45"></label>' +
      '<label>Lapangan (Court)<input name="court" value="' + esc(m.court) + '" placeholder="I"></label>' +
      '<label>Format<select name="format"' + (locked ? ' disabled' : '') + '>' + U.formatOptions(m.format) + '</select></label>' +
      '<label>Kategori<select name="category"' + (locked ? ' disabled' : '') + '>' + U.catOptions(m.category) + '</select></label>' +
      '<label>Pool / Babak<input name="pool" value="' + esc(m.pool) + '" placeholder="A / Semifinal"></label>' +
      '<label>Tahap (beach)<input name="stage" list="stages" value="' + esc(m.stage) + '" placeholder="Pool Play"></label>' +
      '<datalist id="stages"><option value="Main Draw"><option value="Qualification"><option value="Pool Play"><option value="Winner Bracket"><option value="Classification"><option value="Semi-Final"><option value="Finals"></datalist>' +
      '<label>Kelompok umur<select name="age">' + ['Senior', 'Junior', 'Youth'].map(function (a) { return '<option' + (m.age === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></label>' +
      '<label>Kostum / keterangan<input name="note" value="' + esc(m.note) + '"></label>' +
      '</div><h4 class="mt">Tim</h4><div class="grid-form">' +
      '<label>Tim A<select name="teamA"' + (locked ? ' disabled' : '') + '>' + teamOptions(m.competitionId, m.format, m.category, m.teamA) + '</select></label>' +
      '<label>Tim B<select name="teamB"' + (locked ? ' disabled' : '') + '>' + teamOptions(m.competitionId, m.format, m.category, m.teamB) + '</select></label>' +
      '<label>Label tim A bila belum ditentukan<input name="labelA" value="' + esc(m.labelA) + '" placeholder="JUARA POOL A"></label>' +
      '<label>Label tim B bila belum ditentukan<input name="labelB" value="' + esc(m.labelB) + '" placeholder="RUNNER UP B"></label>' +
      '</div><h4 class="mt">Penugasan wasit</h4><div class="grid-form">' +
      ROLES.map(function (r) { return '<label>' + r[1] + '<select name="off_' + r[0] + '">' + refOptions(o[r[0]]) + '</select></label>'; }).join('') +
      '</div><details class="mt"><summary>Aturan pertandingan (otomatis sesuai format, ubah bila perlu)</summary><div class="grid-form mt-s" id="rules">' +
      RULE_FIELDS.map(function (f) { return '<label>' + f[1] + '<input type="number" min="0" name="rule_' + f[0] + '" value="' + esc(R[f[0]]) + '"' + (locked ? ' disabled' : '') + '></label>'; }).join('') +
      '</div></details></form>';
  }

  function edit(m) {
    var comp = S.activeCompetition();
    if (!comp) { U.toast('Buat kejuaraan terlebih dahulu', 'error'); location.hash = '#/kejuaraan'; return Promise.resolve(); }
    var isNew = !m;
    m = m || { competitionId: comp.id, no: nextNo(comp.id), date: U.today(), format: filt.format || 'indoor6', category: filt.category || 'PA', pool: filt.pool || '', age: 'Senior', events: [], officials: {} };
    var locked = (m.events || []).length > 0;
    return U.modal({
      title: isNew ? 'Pertandingan Baru' : 'Ubah Pertandingan #' + m.no, body: form(m, locked), wide: true,
      onOpen: function (root) {
        if (locked) U.qs('.modal-body', root).insertAdjacentHTML('afterbegin', '<div class="alert">Pertandingan sudah berjalan: format, kategori, tim dan aturan dikunci.</div>');
        var fsel = U.qs('[name=format]', root), csel = U.qs('[name=category]', root);
        function refresh() {
          U.qs('[name=teamA]', root).innerHTML = teamOptions(m.competitionId, fsel.value, csel.value, U.qs('[name=teamA]', root).value);
          U.qs('[name=teamB]', root).innerHTML = teamOptions(m.competitionId, fsel.value, csel.value, U.qs('[name=teamB]', root).value);
        }
        fsel.onchange = function () {
          var R = E.defaultRules(fsel.value);
          RULE_FIELDS.forEach(function (f) { U.qs('[name=rule_' + f[0] + ']', root).value = R[f[0]]; });
          refresh();
        };
        csel.onchange = refresh;
      },
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan', cls: 'primary', onClick: function (root) {
          var d = U.formData(U.qs('#mform', root));
          var rec = Object.assign({}, m);
          ['no', 'date', 'time', 'court', 'pool', 'stage', 'age', 'note', 'labelA', 'labelB'].forEach(function (k) { rec[k] = d[k]; });
          var off = {};
          VB.views.wasit.ROLES.forEach(function (r) { if (d['off_' + r[0]]) off[r[0]] = d['off_' + r[0]]; });
          rec.officials = off;
          if (!locked) {
            rec.format = d.format; rec.category = d.category; rec.teamA = d.teamA; rec.teamB = d.teamB;
            if (rec.teamA && rec.teamA === rec.teamB) { U.toast('Tim A dan Tim B tidak boleh sama', 'error'); return false; }
            var R = E.defaultRules(rec.format);
            RULE_FIELDS.forEach(function (f) { var v = parseInt(d['rule_' + f[0]], 10); if (!isNaN(v)) R[f[0]] = v; });
            if (R.setsToWin < 1 || R.setPoints < 1 || R.decidingSetPoints < 1) { U.toast('Aturan tidak valid', 'error'); return false; }
            rec.rules = R;
          }
          rec.events = rec.events || [];
          S.upsert('matches', rec);
          U.toast('Pertandingan tersimpan');
        }
      }]
    });
  }

  function filtered(comp) {
    var q = filt.q.toLowerCase();
    return S.list('matches', function (m) {
      if (m.competitionId !== comp.id) return false;
      if (filt.format && m.format !== filt.format) return false;
      if (filt.category && m.category !== filt.category) return false;
      if (filt.pool && (m.pool || '') !== filt.pool) return false;
      if (q) {
        var s = (teamLabel(m, 'A') + ' ' + teamLabel(m, 'B') + ' ' + (m.no || '')).toLowerCase();
        if (s.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      return ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')) || (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0);
    });
  }

  function render(el) {
    var comp = S.activeCompetition();
    var html = '<div class="page-head no-print"><h1>Jadwal &amp; Hasil</h1><div class="row gap"><button class="btn" id="print">Cetak jadwal</button><button class="btn primary" id="add">+ Pertandingan</button></div></div>';
    if (!comp) {
      el.innerHTML = html + U.emptyState('Belum ada kejuaraan', 'Buat kejuaraan terlebih dahulu.', '<a class="btn primary" href="#/kejuaraan">Buat kejuaraan</a>');
      U.qs('#add', el).onclick = function () { edit(null); };
      return;
    }
    var pools = {};
    S.list('matches', function (m) { return m.competitionId === comp.id; }).forEach(function (m) { if (m.pool) pools[m.pool] = 1; });
    html += '<div class="filters no-print"><select id="ff">' + U.formatOptions(filt.format, true) + '</select>' +
      '<select id="fc">' + U.catOptions(filt.category, true) + '</select>' +
      '<select id="fp"><option value="">Semua pool</option>' + Object.keys(pools).sort().map(function (p) { return '<option' + (p === filt.pool ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select>' +
      '<input id="fq" type="search" placeholder="Cari tim / no." value="' + esc(filt.q) + '"></div>';

    var list = filtered(comp);
    var maxSets = 0;
    list.forEach(function (m) { maxSets = Math.max(maxSets, (m.rules ? m.rules.setsToWin * 2 - 1 : 3)); });
    maxSets = maxSets || 3;

    html += '<div class="print-only print-title"><h2>JADWAL &amp; HASIL PERTANDINGAN ' + esc((filt.format ? U.formatLabel(filt.format) + ' ' : '') + (filt.category ? U.catLabel(filt.category) : '')).toUpperCase() + '</h2><div>' + esc(comp.name) + '</div><div>' + esc([comp.organizer, comp.city].filter(Boolean).join(' • ')) + '</div></div>';

    if (!list.length) html += U.emptyState('Belum ada pertandingan', 'Tambahkan jadwal pertandingan, lalu buka scoresheet saat pertandingan dimulai.');
    else {
      html += '<div class="table-wrap"><table class="tbl schedule"><thead><tr><th>Hari/Tgl</th><th>No.</th><th>Jam</th><th>Lap</th><th>PA/PI</th><th>Tim</th><th></th><th>Tim</th><th class="c">Hasil</th>';
      for (var i = 1; i <= maxSets; i++) html += '<th class="c print-only-cell">Set ' + i + '</th>';
      html += '<th class="screen-only-cell">Skor per set</th><th class="c">Total</th><th class="no-print">Status</th><th class="no-print"></th></tr></thead><tbody>';
      var lastDate = null;
      list.forEach(function (m) {
        var st = status(m), cells = resultCells(m, maxSets), s = state(m);
        var winA = s && s.finished && s.winner === 'A', winB = s && s.finished && s.winner === 'B';
        var newDay = m.date !== lastDate; lastDate = m.date;
        var setCells = cells.slice(1, cells.length - 1);
        var played = setCells.filter(function (c) { return c !== '-'; });
        html += '<tr class="' + (newDay ? 'day-start' : '') + '"><td class="nowrap">' + (newDay ? esc(U.fmtDate(m.date, true)) : '') + '</td><td>' + esc(m.no) + '</td><td class="nowrap">' + esc(m.time) + '</td><td>' + esc(m.court) + '</td><td class="nowrap">' + esc(m.category) + '<div class="muted small no-print">' + esc(U.formatLabel(m.format)) + (m.pool ? ' • ' + esc(m.pool) : '') + '</div></td>' +
          '<td class="' + (winA ? 'win' : '') + '">' + esc(teamLabel(m, 'A')) + '</td><td class="muted c">vs</td><td class="' + (winB ? 'win' : '') + '">' + esc(teamLabel(m, 'B')) + '</td>' +
          '<td class="c nowrap b">' + cells[0] + '</td>' +
          setCells.map(function (c) { return '<td class="c nowrap print-only-cell">' + c + '</td>'; }).join('') +
          '<td class="screen-only-cell small">' + (played.length ? played.join(', ') : '-') + '</td>' +
          '<td class="c nowrap">' + cells[cells.length - 1] + '</td>' +
          '<td class="no-print"><span class="badge ' + st + '">' + STATUS_LABEL[st] + '</span></td>' +
          '<td class="no-print nowrap"><a class="btn small primary" href="#/scoresheet/' + m.id + '" title="Buka scoresheet">Scoresheet</a>' +
          '<a class="btn small" href="#/cetak/' + m.id + '" title="Cetak scoresheet">🖨️</a>' +
          '<button class="btn small ghost" data-act="edit" data-id="' + m.id + '" title="Ubah">✏️</button>' +
          '<button class="btn small danger ghost" data-act="del" data-id="' + m.id + '" title="Hapus">✕</button></td></tr>';
      });
      html += '</tbody></table></div>';
      if (comp.signer) html += '<div class="print-only signer"><div>' + esc(comp.city || '') + ', ' + esc(U.fmtDate(U.today())) + '</div><div>Bidang Pertandingan,</div><div class="sig-space"></div><div><b>' + esc(comp.signer) + '</b></div></div>';
    }
    el.innerHTML = html;
    U.qs('#add', el).onclick = function () { edit(null).then(function () { render(el); }); };
    U.qs('#print', el).onclick = function () { window.print(); };
    U.qs('#ff', el).onchange = function () { filt.format = this.value; render(el); };
    U.qs('#fc', el).onchange = function () { filt.category = this.value; render(el); };
    U.qs('#fp', el).onchange = function () { filt.pool = this.value; render(el); };
    var fq = U.qs('#fq', el);
    fq.oninput = function () { filt.q = this.value; clearTimeout(fq._t); fq._t = setTimeout(function () { render(el); var f = U.qs('#fq', el); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }, 250); };
    U.qsa('[data-act]', el).forEach(function (b) {
      b.onclick = function () {
        var m = S.get('matches', b.dataset.id);
        if (b.dataset.act === 'edit') edit(m).then(function () { render(el); });
        if (b.dataset.act === 'del') U.confirm('Hapus pertandingan #' + m.no + ' (' + teamLabel(m, 'A') + ' vs ' + teamLabel(m, 'B') + ')? Seluruh catatan scoresheet ikut terhapus.', 'Hapus', true)
          .then(function (ok) { if (ok) { S.remove('matches', m.id); render(el); } });
      };
    });
  }

  VB.views.jadwal = { render: render, edit: edit, state: state, names: names, teamLabel: teamLabel, status: status, STATUS_LABEL: STATUS_LABEL };
})();
