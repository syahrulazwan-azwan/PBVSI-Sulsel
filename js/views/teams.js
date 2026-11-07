/* Menu Tim & Pemain */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;
  var filt = { format: 'indoor6', category: (S.settings().uiCat || 'PA') };

  var OFFICIALS = [['C', 'Pelatih (C)'], ['AC1', 'Asisten pelatih 1 (AC1)'], ['AC2', 'Asisten pelatih 2 (AC2)'], ['T', 'Terapis (T)'], ['M', 'Dokter/Medis (M)']];

  function playerRow(p, i) {
    p = p || {};
    return '<tr>' +
      '<td><input class="w-no" name="p_no" inputmode="numeric" value="' + esc(p.no) + '"></td>' +
      '<td><input name="p_name" value="' + esc(p.name) + '" placeholder="Nama pemain"></td>' +
      '<td class="c"><input type="radio" name="p_captain" value="' + i + '"' + (p.captain ? ' checked' : '') + ' title="Kapten"></td>' +
      '<td class="c"><input type="checkbox" name="p_libero"' + (p.libero ? ' checked' : '') + ' title="Libero"></td>' +
      '<td><button type="button" class="icon-btn" data-delrow title="Hapus baris">✕</button></td></tr>';
  }

  function form(t) {
    var players = (t.players && t.players.length) ? t.players : [];
    var minRows = t.format === 'beach2' ? 2 : t.format === 'beach4' ? 6 : 12;
    while (players.length < minRows) players = players.concat([{}]);
    var off = t.officials || {};
    var rows = players.map(playerRow).join('');
    return '<form class="grid-form" id="teamform">' +
      '<label class="span2">Nama tim<input name="name" required value="' + esc(t.name) + '" placeholder="MAROS"></label>' +
      '<label>Kode tim (3 huruf)<input name="code" maxlength="5" value="' + esc(t.code) + '" placeholder="MRS"></label>' +
      '<label>Pool / Grup<input name="pool" value="' + esc(t.pool) + '" placeholder="A"></label>' +
      '<label>No. urut (bagan)<input name="seed" inputmode="numeric" value="' + esc(t.seed) + '" placeholder="01"></label>' +
      '<label>Format<select name="format">' + U.formatOptions(t.format) + '</select></label>' +
      '<label>Kategori<select name="category">' + U.catOptions(t.category) + '</select></label>' +
      '</form>' +
      '<h4 class="mt">Pemain <small class="muted">(pilih ◉ untuk kapten, centang L untuk libero)</small></h4>' +
      '<div class="table-wrap"><table class="tbl edit" id="ptable"><thead><tr><th>No.</th><th>Nama pemain</th><th>Kapten</th><th>L</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="row gap mt-s"><button type="button" class="btn small" id="addrow">+ Baris</button>' +
      '<button type="button" class="btn small ghost" id="paste">Tempel daftar dari Excel</button></div>' +
      '<h4 class="mt">Ofisial tim</h4><div class="grid-form" id="offform">' +
      OFFICIALS.map(function (o) { return '<label>' + o[1] + '<input name="off_' + o[0] + '" value="' + esc(off[o[0]]) + '"></label>'; }).join('') +
      '</div>';
  }

  function readForm(root, t) {
    var d = U.formData(U.qs('#teamform', root));
    var players = [];
    U.qsa('#ptable tbody tr', root).forEach(function (tr, i) {
      var no = U.qs('[name=p_no]', tr).value.trim(), name = U.qs('[name=p_name]', tr).value.trim();
      if (!no && !name) return;
      players.push({ no: no, name: name, captain: U.qs('[name=p_captain]', tr).checked, libero: U.qs('[name=p_libero]', tr).checked });
    });
    var officials = {};
    OFFICIALS.forEach(function (o) { officials[o[0]] = U.qs('[name=off_' + o[0] + ']', root).value.trim(); });
    return Object.assign({}, t, d, { players: players, officials: officials });
  }

  function validate(t) {
    if (!t.name) return 'Nama tim wajib diisi.';
    var seen = {};
    for (var i = 0; i < t.players.length; i++) {
      var p = t.players[i];
      if (!p.no) return 'Nomor punggung "' + (p.name || '?') + '" belum diisi.';
      if (seen[p.no]) return 'Nomor punggung ' + p.no + ' dobel.';
      seen[p.no] = 1;
    }
    return null;
  }

  function wireForm(root) {
    var tbody = U.qs('#ptable tbody', root);
    function renumber() { U.qsa('[name=p_captain]', root).forEach(function (r, i) { r.value = i; }); }
    tbody.addEventListener('click', function (e) {
      if (e.target.matches('[data-delrow]')) { e.target.closest('tr').remove(); renumber(); }
    });
    U.qs('#addrow', root).onclick = function () {
      tbody.insertAdjacentHTML('beforeend', playerRow({}, tbody.children.length));
    };
    U.qs('#paste', root).onclick = function () {
      U.modal({
        title: 'Tempel daftar pemain',
        body: '<p class="muted">Salin dua kolom dari Excel (No. dan Nama) lalu tempel di sini. Satu pemain per baris. Tambahkan "©" atau "(C)" untuk kapten dan "(L)" untuk libero.</p>' +
          '<textarea id="pastearea" rows="10" placeholder="1\tARIAL ALFADLAH\n11\tMUH. ILHAM\n12\tWAN ©\n14\tAPRIL PRATAMA (L)"></textarea>',
        actions: [{ label: 'Batal', value: null }, {
          label: 'Masukkan', cls: 'primary', onClick: function (r2) {
            var lines = U.qs('#pastearea', r2).value.split(/\r?\n/).filter(function (l) { return l.trim(); });
            var html = '';
            lines.forEach(function (l, i) {
              var m = l.trim().match(/^(\d+)[\s\t.,;:-]+(.*)$/);
              var no = m ? m[1] : '', name = m ? m[2] : l.trim();
              var cap = /©|\(c\)|\(k\)/i.test(name), lib = /\(l\)|\blibero\b/i.test(name);
              name = name.replace(/©|\((c|k|l)\)/ig, '').replace(/\blibero\b/i, '').replace(/\s+/g, ' ').trim();
              html += playerRow({ no: no, name: name, captain: cap, libero: lib }, i);
            });
            tbody.innerHTML = html;
            renumber();
          }
        }]
      });
    };
  }

  function edit(t) {
    var comp = S.activeCompetition();
    if (!comp) { comp = S.upsert('competitions', { name: 'Scoresheet' }); S.setSetting('activeCompetitionId', comp.id); }
    t = t || { competitionId: comp.id, format: filt.format || 'indoor6', category: filt.category || 'PA', players: [] };
    return U.modal({
      title: t.id ? 'Ubah Tim' : 'Tim Baru', body: form(t), wide: true, onOpen: wireForm,
      actions: [{ label: 'Batal', value: null }, {
        label: 'Simpan', cls: 'primary', onClick: function (root) {
          var rec = readForm(root, t);
          var err = validate(rec);
          if (err) { U.toast(err, 'error'); return false; }
          S.upsert('teams', rec);
          U.toast('Tim tersimpan');
        }
      }]
    });
  }

  function pad(n) { n = String(n || ''); return n.length === 1 ? '0' + n : n; }
  /** urutan: format, kategori, no. urut bagan, lalu nama */
  function sortTeams(a, b) {
    var FO = { indoor6: 0, beach2: 1, beach4: 2 };
    var k = ((FO[a.format] || 0) - (FO[b.format] || 0)) || (a.category || '').localeCompare(b.category || '');
    if (k) return k;
    var sa = parseInt(a.seed, 10) || 999, sb = parseInt(b.seed, 10) || 999;
    if (sa !== sb) return sa - sb;
    return ((a.pool || '') + a.name).localeCompare((b.pool || '') + b.name);
  }

  /** tombol Putra | Putri (dipakai juga di menu Scoresheet) */
  function catTabs(cur, counts, withAll) {
    var keys = (withAll ? [''] : []).concat(['PA', 'PI']);
    return '<div class="cat-tabs" role="tablist">' + keys.map(function (k) {
      var lbl = k ? U.catLabel(k) : 'Semua';
      return '<button type="button" role="tab" class="cat-tab' + (cur === k ? ' on' : '') + '" data-cat="' + k + '">' + lbl +
        (counts && counts[k] != null ? ' <span class="cnt">' + counts[k] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function card(t) {
    var cap = (t.players || []).filter(function (p) { return p.captain; })[0];
    var lib = (t.players || []).filter(function (p) { return p.libero; }).length;
    return '<div class="card"><div class="card-title">' + (t.seed ? '<span class="seed">' + esc(pad(t.seed)) + '</span> ' : '') + esc(t.name) + (t.code ? ' <span class="badge">' + esc(t.code) + '</span>' : '') + '</div>' +
      '<div class="muted">' + U.formatLabel(t.format) + ' • ' + U.catLabel(t.category) + (t.pool ? ' • Pool ' + esc(t.pool) : '') + '</div>' +
      '<div class="muted">' + (t.players || []).length + ' pemain (' + lib + ' libero)' + (cap ? ' • Kapten #' + esc(cap.no) : '') + '</div>' +
      (t.officials && t.officials.C ? '<div class="muted small">Pelatih: ' + esc(t.officials.C) + '</div>' : '') +
      '<div class="card-actions"><button class="btn small" data-act="edit" data-id="' + t.id + '">Ubah</button>' +
      '<button class="btn small danger ghost" data-act="del" data-id="' + t.id + '">Hapus</button></div></div>';
  }

  function render(el) {
    var inFmt = S.list('teams', function (t) { return !filt.format || t.format === filt.format; });
    var counts = { PA: 0, PI: 0 };
    inFmt.forEach(function (t) { if (counts[t.category] != null) counts[t.category]++; });
    var html = '<div class="page-head"><h1>Tim &amp; Pemain</h1><button class="btn primary" id="add">+ Tim</button></div>';
    html += '<div class="filters">' + catTabs(filt.category, counts) + '<select id="ff">' + U.formatOptions(filt.format, true) + '</select></div>';
    var teams = inFmt.filter(function (t) { return t.category === filt.category; }).sort(sortTeams);
    if (!teams.length) html += U.emptyState('Belum ada tim ' + U.catLabel(filt.category), 'Tambahkan tim beserta daftar pemain dan ofisialnya, atau impor file data tim.');
    else {
      // dikelompokkan per pool
      var groups = {}, order = [];
      teams.forEach(function (t) { var k = t.pool ? String(t.pool).toUpperCase() : ''; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(t); });
      order.sort(function (a, b) { return (!a) - (!b) || a.length - b.length || a.localeCompare(b); });
      order.forEach(function (k) {
        html += '<h3 class="pool-h">' + (k ? 'Pool ' + esc(k) : 'Tanpa pool') + ' <span class="muted small">(' + groups[k].length + ' tim)</span></h3><div class="cards">' + groups[k].map(card).join('') + '</div>';
      });
    }
    el.innerHTML = html;
    U.qs('#add', el).onclick = function () { edit(null).then(function () { render(el); }); };
    U.qs('#ff', el).onchange = function () { filt.format = this.value; render(el); };
    U.qsa('.cat-tab', el).forEach(function (b) { b.onclick = function () { filt.category = b.dataset.cat; S.setSetting('uiCat', filt.category); render(el); }; });
    U.qsa('[data-act]', el).forEach(function (b) {
      b.onclick = function () {
        var t = S.get('teams', b.dataset.id);
        if (b.dataset.act === 'edit') edit(t).then(function () { render(el); });
        else U.confirm('Hapus tim "' + t.name + '"?', 'Hapus', true).then(function (ok) { if (ok) { S.remove('teams', t.id); render(el); } });
      };
    });
  }

  VB.views.tim = { render: render, edit: edit, OFFICIALS: OFFICIALS, sortTeams: sortTeams, pad: pad, catTabs: catTabs };
})();
