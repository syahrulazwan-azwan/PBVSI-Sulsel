/* Menu Tim & Pemain */
(function () {
  'use strict';
  var S = window.VBStore, U = window.VBUI, E = window.VBEngine, esc = U.esc;
  var filt = { format: '', category: '' };

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
    if (!comp) { U.toast('Buat kejuaraan terlebih dahulu', 'error'); location.hash = '#/kejuaraan'; return Promise.resolve(); }
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

  function render(el) {
    var comp = S.activeCompetition();
    var html = '<div class="page-head"><h1>Tim &amp; Pemain</h1><button class="btn primary" id="add">+ Tim</button></div>';
    if (!comp) {
      el.innerHTML = html + U.emptyState('Belum ada kejuaraan', 'Buat kejuaraan terlebih dahulu.', '<a class="btn primary" href="#/kejuaraan">Buat kejuaraan</a>');
      U.qs('#add', el).onclick = function () { edit(null); };
      return;
    }
    html += '<div class="filters"><select id="ff">' + U.formatOptions(filt.format, true) + '</select>' +
      '<select id="fc">' + U.catOptions(filt.category, true) + '</select>' +
      '<span class="muted">' + esc(comp.name) + '</span></div>';
    var teams = S.list('teams', function (t) {
      return t.competitionId === comp.id && (!filt.format || t.format === filt.format) && (!filt.category || t.category === filt.category);
    }).sort(function (a, b) { return (a.format + a.category + (a.pool || '') + a.name).localeCompare(b.format + b.category + (b.pool || '') + b.name); });
    if (!teams.length) html += U.emptyState('Belum ada tim', 'Tambahkan tim beserta daftar pemain dan ofisialnya. Data ini akan tercetak di scoresheet.');
    else {
      html += '<div class="cards">';
      teams.forEach(function (t) {
        var cap = (t.players || []).filter(function (p) { return p.captain; })[0];
        html += '<div class="card"><div class="card-title">' + esc(t.name) + (t.code ? ' <span class="badge">' + esc(t.code) + '</span>' : '') + '</div>' +
          '<div class="muted">' + U.formatLabel(t.format) + ' • ' + U.catLabel(t.category) + (t.pool ? ' • Pool ' + esc(t.pool) : '') + '</div>' +
          '<div class="muted">' + (t.players || []).length + ' pemain' + (cap ? ' • Kapten #' + esc(cap.no) : '') + (t.officials && t.officials.C ? ' • Pelatih: ' + esc(t.officials.C) : '') + '</div>' +
          '<div class="card-actions"><button class="btn small" data-act="edit" data-id="' + t.id + '">Ubah</button>' +
          '<button class="btn small danger ghost" data-act="del" data-id="' + t.id + '">Hapus</button></div></div>';
      });
      html += '</div>';
    }
    el.innerHTML = html;
    U.qs('#add', el).onclick = function () { edit(null).then(function () { render(el); }); };
    U.qs('#ff', el).onchange = function () { filt.format = this.value; render(el); };
    U.qs('#fc', el).onchange = function () { filt.category = this.value; render(el); };
    U.qsa('[data-act]', el).forEach(function (b) {
      b.onclick = function () {
        var t = S.get('teams', b.dataset.id);
        if (b.dataset.act === 'edit') edit(t).then(function () { render(el); });
        else U.confirm('Hapus tim "' + t.name + '"?', 'Hapus', true).then(function (ok) { if (ok) { S.remove('teams', t.id); render(el); } });
      };
    });
  }

  VB.views.tim = { render: render, edit: edit, OFFICIALS: OFFICIALS };
})();
