/* Menu Scoresheet: buat & cetak scoresheet (diisi manual setelah dicetak) */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;
  var filt = { format: '', category: '', q: '' };
  var selected = {};

  function names(m) { return { A: teamLabel(m, 'A'), B: teamLabel(m, 'B') }; }
  function teamLabel(m, side) {
    var id = side === 'A' ? m.teamA : m.teamB;
    var t = id && S.get('teams', id);
    if (t) return t.name;
    return (side === 'A' ? m.labelA : m.labelB) || ('Tim ' + side);
  }
  function state(m) { try { return E.compute({ rules: m.rules || E.defaultRules(m.format), events: [] }, names(m)); } catch (e) { return null; } }

  /** Kejuaraan "wadah" internal (tidak tampil) agar data lama tetap terbaca */
  function baseComp() {
    var c = S.activeCompetition();
    if (!c) { c = S.upsert('competitions', { name: 'Scoresheet' }); S.setSetting('activeCompetitionId', c.id); }
    return c;
  }
  function lastComp() {
    var d = S.settings().lastComp;
    if (d) return d;
    var c = S.activeCompetition() || {};
    return { compName: c.name && c.name !== 'Scoresheet' ? c.name : '', city: c.city || '', hall: c.venue || '', ccode: c.countryCode || '' };
  }

  function nextNo() {
    var max = 0;
    S.list('matches').forEach(function (m) { var n = parseInt(m.no, 10); if (n > max) max = n; });
    return String(max + 1);
  }

  function teamOptions(format, cat, sel) {
    var o = '<option value="">— pilih tim —</option>';
    S.list('teams', function (t) { return t.format === format && t.category === cat; })
      .sort(VB.views.tim.sortTeams)
      .forEach(function (t) { o += '<option value="' + t.id + '"' + (t.id === sel ? ' selected' : '') + '>' + esc((t.pool ? '[' + t.pool + '] ' : '') + t.name + (t.code ? ' (' + t.code + ')' : '')) + '</option>'; });
    return o;
  }
  function refOptions(sel) {
    var o = '<option value="">—</option>';
    S.list('referees').sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (r) {
      o += '<option value="' + r.id + '"' + (r.id === sel ? ' selected' : '') + '>' + esc(r.name + (r.code ? ' (' + r.code + ')' : '')) + '</option>';
    });
    return o;
  }
  function compField(m, k) {
    if (m[k] != null) return m[k];
    var c = S.get('competitions', m.competitionId) || {};
    return { compName: c.name, city: c.city, hall: c.venue, ccode: c.countryCode }[k] || '';
  }

  function form(m) {
    var o = m.officials || {};
    var ROLES = VB.views.wasit.ROLES;
    return '<form id="mform">' +
      '<h4>Kompetisi</h4><div class="grid-form">' +
      '<label class="span2">Nama kompetisi<input name="compName" value="' + esc(compField(m, 'compName')) + '" placeholder="BABAK KUALIFIKASI PORPROV BOLA VOLI INDOOR WILAYAH III"></label>' +
      '<label>Kota (City/Site)<input name="city" value="' + esc(compField(m, 'city')) + '" placeholder="GOWA"></label>' +
      '<label>Hall / Beach<input name="hall" value="' + esc(compField(m, 'hall')) + '" placeholder="DIVIF 3 KOSTRAD"></label>' +
      '<label>Kode wilayah (Country code)<input name="ccode" value="' + esc(compField(m, 'ccode')) + '" placeholder="SLS"></label>' +
      '</div><h4 class="mt">Pertandingan</h4><div class="grid-form">' +
      '<label>Format<select name="format">' + U.formatOptions(m.format) + '</select></label>' +
      '<label>Kategori<select name="category">' + U.catOptions(m.category) + '</select></label>' +
      '<label>No. pertandingan<input name="no" value="' + esc(m.no) + '"></label>' +
      '<label>Tanggal<input type="date" name="date" value="' + esc(m.date) + '"></label>' +
      '<label>Jam<input name="time" value="' + esc(m.time) + '" placeholder="08.30-10.00"></label>' +
      '<label>Lapangan (Court)<input name="court" value="' + esc(m.court) + '" placeholder="I"></label>' +
      '<label>Pool / Phase<input name="pool" value="' + esc(m.pool) + '" placeholder="A"></label>' +
      '<label>Kelompok umur<select name="age">' + ['Senior', 'Junior', 'Youth'].map(function (a) { return '<option' + (m.age === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></label>' +
      '<label>Tahap (khusus pantai)<input name="stage" list="stages" value="' + esc(m.stage) + '" placeholder="Pool Play"></label>' +
      '<datalist id="stages"><option value="Main Draw"><option value="Qualification"><option value="Pool Play"><option value="Winner Bracket"><option value="Classification"><option value="Semi-Final"><option value="Finals"></datalist>' +
      '<label>Kostum (warna baju)<input name="note" value="' + esc(m.note) + '" placeholder="Merah – Putih"></label>' +
      '</div><h4 class="mt">Tim</h4><div class="grid-form">' +
      '<label>Tim A<select name="teamA">' + teamOptions(m.format, m.category, m.teamA) + '</select></label>' +
      '<label>Tim B<select name="teamB">' + teamOptions(m.format, m.category, m.teamB) + '</select></label>' +
      '</div><p class="muted small" id="teamhint"></p>' +
      '<h4 class="mt">Wasit &amp; petugas</h4><div class="grid-form">' +
      ROLES.map(function (r) { return '<label>' + r[1] + '<select name="off_' + r[0] + '">' + refOptions(o[r[0]]) + '</select></label>'; }).join('') +
      '</div></form>';
  }

  function edit(m, copy) {
    var isNew = !m || copy || !m.id;
    var base = baseComp();
    if (!m || (!m.id && !copy)) {
      // baru (boleh membawa isian awal, mis. dari menu Bagan: tim A/B & pool)
      var lc = lastComp(), prev = S.list('matches').slice(-1)[0] || {};
      m = Object.assign({ competitionId: base.id, no: nextNo(), date: U.today(), format: prev.format || 'indoor6', category: prev.category || 'PA', age: 'Senior', officials: {} }, lc, m || {});
    } else if (copy) {
      m = Object.assign({}, m, { id: null, no: nextNo(), teamA: '', teamB: '', note: '' });
      m.officials = Object.assign({}, m.officials || {});
    }
    return U.modal({
      title: isNew ? 'Buat Scoresheet' : 'Ubah Scoresheet #' + m.no, body: form(m), wide: true,
      onOpen: function (root) {
        var fsel = U.qs('[name=format]', root), csel = U.qs('[name=category]', root);
        function refresh() {
          var a = U.qs('[name=teamA]', root), b = U.qs('[name=teamB]', root);
          a.innerHTML = teamOptions(fsel.value, csel.value, a.value);
          b.innerHTML = teamOptions(fsel.value, csel.value, b.value);
          var n = a.options.length - 1;
          U.qs('#teamhint', root).innerHTML = n ? '' : 'Belum ada tim ' + esc(U.formatLabel(fsel.value)) + ' ' + esc(U.catLabel(csel.value)) + '. Tambahkan dulu di menu <a href="#/tim">Tim</a>.';
        }
        fsel.onchange = refresh; csel.onchange = refresh; refresh();
      },
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan', cls: 'primary', onClick: function (root) {
          var d = U.formData(U.qs('#mform', root));
          if (d.teamA && d.teamA === d.teamB) { U.toast('Tim A dan Tim B tidak boleh sama', 'error'); return false; }
          var rec = Object.assign({}, m);
          ['compName', 'city', 'hall', 'ccode', 'format', 'category', 'no', 'date', 'time', 'court', 'pool', 'age', 'stage', 'note', 'teamA', 'teamB'].forEach(function (k) { rec[k] = d[k]; });
          var off = {};
          VB.views.wasit.ROLES.forEach(function (r) { if (d['off_' + r[0]]) off[r[0]] = d['off_' + r[0]]; });
          rec.officials = off;
          rec.rules = E.defaultRules(rec.format);
          rec.events = [];
          rec.competitionId = rec.competitionId || base.id;
          if (!rec.id) delete rec.id;
          S.upsert('matches', rec);
          S.setSetting('lastComp', { compName: d.compName, city: d.city, hall: d.hall, ccode: d.ccode });
          U.toast('Scoresheet tersimpan');
        }
      }]
    });
  }

  function blankMenu() {
    U.modal({
      title: 'Cetak blanko kosong',
      body: '<p class="muted">Formulir asli tanpa data apa pun.</p><div class="menu-list">' +
        Object.keys(E.FORMATS).map(function (k) { return '<a class="btn block" href="#/cetak/blanko:' + k + '" data-close-modal>🖨️ ' + esc(E.FORMATS[k].label) + '</a>'; }).join('') + '</div>',
      onOpen: function (root) { U.qsa('[data-close-modal]', root).forEach(function (a) { a.addEventListener('click', function () { U.qs('[data-close]', root).click(); }); }); }
    });
  }

  function filtered() {
    var q = filt.q.toLowerCase();
    return S.list('matches', function (m) {
      if (filt.format && m.format !== filt.format) return false;
      if (filt.category && m.category !== filt.category) return false;
      if (q) {
        var s = (teamLabel(m, 'A') + ' ' + teamLabel(m, 'B') + ' ' + (m.no || '') + ' ' + (m.pool || '')).toLowerCase();
        if (s.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      return ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')) || (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0);
    });
  }

  function banner() {
    var P = U.LOGOS.porprov2026;
    return '<section class="hero event mini"><div class="hero-logos row"><img src="' + U.PBVSI_LOGO + '" alt="PBVSI" class="lg-pbvsi"><img src="' + P.src + '" alt="PORPROV" class="lg-event"></div>' +
      '<div class="hero-text"><div class="kicker">PORPROV SULSEL XVIII/2026 • WAJO – BONE</div><h1>Scoresheet Bola Voli</h1>' +
      '<p>Buat scoresheet, cetak di formulir asli (Indoor, Pantai 2x2, Pantai 4x4), lalu isi manual di lapangan.</p></div>' +
      '<img src="' + P.mascot + '" alt="Maskot" class="hero-mascot"></section>';
  }

  function render(el) {
    var list = filtered();
    var html = banner() +
      '<div class="page-head mt"><h1>Daftar Scoresheet</h1><div class="row gap"><button class="btn" id="blank">Blanko kosong</button><button class="btn primary" id="add">+ Buat scoresheet</button></div></div>' +
      '<div class="filters"><select id="ff">' + U.formatOptions(filt.format, true) + '</select>' +
      '<select id="fc">' + U.catOptions(filt.category, true) + '</select>' +
      '<input id="fq" type="search" placeholder="Cari tim / no. / pool" value="' + esc(filt.q) + '"></div>';
    if (!list.length) {
      html += U.emptyState('Belum ada scoresheet', 'Isi data tim dan wasit terlebih dahulu, lalu klik "+ Buat scoresheet".', '<div class="row gap center"><a class="btn" href="#/tim">Isi data tim</a><a class="btn" href="#/wasit">Isi data wasit</a></div>');
    } else {
      html += '<div class="selbar"><span id="selinfo" class="muted"></span>' +
        '<button class="btn primary" id="printSel" disabled>🖨️ Cetak terpilih</button>' +
        '<button class="btn" id="printAll">🖨️ Cetak semua yang tampil (' + list.length + ')</button></div>';
      html += '<div class="table-wrap"><table class="tbl schedule"><thead><tr><th class="c"><input type="checkbox" id="selall" title="Pilih semua"></th><th>Tanggal</th><th>No.</th><th>Jam</th><th>Lap</th><th>Format</th><th>Tim A</th><th></th><th>Tim B</th><th>Wasit 1 / Wasit 2</th><th></th></tr></thead><tbody>';
      var lastDate = null;
      list.forEach(function (m) {
        var newDay = m.date !== lastDate; lastDate = m.date;
        var o = m.officials || {};
        html += '<tr class="' + (newDay ? 'day-start' : '') + '"><td class="c"><input type="checkbox" class="selm" value="' + m.id + '"' + (selected[m.id] ? ' checked' : '') + '></td>' +
          '<td class="nowrap">' + (newDay ? esc(U.fmtDate(m.date, true)) : '') + '</td><td>' + esc(m.no) + '</td><td class="nowrap">' + esc(m.time) + '</td><td>' + esc(m.court) + '</td>' +
          '<td class="nowrap">' + esc(U.formatLabel(m.format)) + '<div class="muted small">' + esc(U.catLabel(m.category)) + (m.pool ? ' • ' + esc(m.pool) : '') + '</div></td>' +
          '<td><b>' + esc(teamLabel(m, 'A')) + '</b></td><td class="muted c">vs</td><td><b>' + esc(teamLabel(m, 'B')) + '</b></td>' +
          '<td class="small">' + esc(U.refName(o.r1) || '—') + '<br>' + esc(U.refName(o.r2) || '—') + '</td>' +
          '<td class="nowrap"><a class="btn small primary" href="#/cetak/' + m.id + '">🖨️ Cetak</a>' +
          '<button class="btn small ghost" data-act="edit" data-id="' + m.id + '" title="Ubah">✏️</button>' +
          '<button class="btn small ghost" data-act="copy" data-id="' + m.id + '" title="Salin untuk pertandingan berikutnya">⧉</button>' +
          '<button class="btn small danger ghost" data-act="del" data-id="' + m.id + '" title="Hapus">✕</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '<div class="footer-tools"><span class="muted small">Data tersimpan di perangkat ini.</span><button class="btn small ghost" id="exp">Unduh backup</button><button class="btn small ghost" id="imp">Impor backup</button></div>';
    el.innerHTML = html;

    U.qs('#add', el).onclick = function () { edit(null).then(function () { render(el); }); };
    U.qs('#blank', el).onclick = blankMenu;
    U.qs('#ff', el).onchange = function () { filt.format = this.value; render(el); };
    U.qs('#fc', el).onchange = function () { filt.category = this.value; render(el); };
    var fq = U.qs('#fq', el);
    fq.oninput = function () { filt.q = this.value; clearTimeout(fq._t); fq._t = setTimeout(function () { render(el); var f = U.qs('#fq', el); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }, 250); };
    U.qs('#exp', el).onclick = function () { U.download('backup-scoresheet-' + VB.views.pengaturan.stamp() + '.json', S.exportAll()); };
    U.qs('#imp', el).onclick = function () { VB.views.pengaturan.doImport(); };

    function selIds() { return list.filter(function (m) { return selected[m.id]; }).map(function (m) { return m.id; }); }
    function updSel() {
      var n = selIds().length, b = U.qs('#printSel', el), info = U.qs('#selinfo', el);
      if (!b) return;
      b.disabled = !n; b.textContent = '🖨️ Cetak terpilih' + (n ? ' (' + n + ')' : '');
      info.textContent = n ? n + ' scoresheet dipilih' : 'Centang beberapa scoresheet untuk dicetak sekaligus.';
    }
    U.qsa('.selm', el).forEach(function (c) { c.onchange = function () { if (c.checked) selected[c.value] = 1; else delete selected[c.value]; updSel(); }; });
    var sa = U.qs('#selall', el);
    if (sa) sa.onchange = function () { list.forEach(function (m) { if (sa.checked) selected[m.id] = 1; else delete selected[m.id]; }); U.qsa('.selm', el).forEach(function (c) { c.checked = sa.checked; }); updSel(); };
    var ps = U.qs('#printSel', el); if (ps) ps.onclick = function () { location.hash = '#/cetak/multi:' + selIds().join(','); };
    var pa = U.qs('#printAll', el); if (pa) pa.onclick = function () { location.hash = '#/cetak/multi:' + list.map(function (m) { return m.id; }).join(','); };
    updSel();
    U.qsa('[data-act]', el).forEach(function (b) {
      b.onclick = function () {
        var m = S.get('matches', b.dataset.id);
        if (b.dataset.act === 'edit') edit(m).then(function () { render(el); });
        if (b.dataset.act === 'copy') edit(m, true).then(function () { render(el); });
        if (b.dataset.act === 'del') U.confirm('Hapus scoresheet #' + m.no + ' (' + teamLabel(m, 'A') + ' vs ' + teamLabel(m, 'B') + ')?', 'Hapus', true)
          .then(function (ok) { if (ok) { delete selected[m.id]; S.remove('matches', m.id); render(el); } });
      };
    });
  }

  VB.views.jadwal = { render: render, edit: edit, state: state, names: names, teamLabel: teamLabel };
})();
